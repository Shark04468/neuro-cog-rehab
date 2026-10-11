import { AuthModuleError, requireCondition } from "../auth/auth-errors.js";
import type { AuthenticatedPrincipal } from "../auth/auth-types.js";
import type { AuthRepository, ProfileAccessRecord } from "../auth/auth-repository.js";
import type { AccessControlService } from "../access-control/access-control-service.js";
import type { UserProfileRepository } from "../profiles/profile-repository.js";
import type { TrainingUserProfileRecord } from "../profiles/profile-types.js";
import type { ReportRepository } from "../reports/report-repository.js";
import type { ReportRecord } from "../reports/report-types.js";
import type { TrainingPrescriptionRepository } from "../training-prescriptions/training-prescription-repository.js";
import type { TrainingPrescriptionRecord } from "../training-prescriptions/training-prescription-types.js";
import type { TrainingRecordRepository } from "../training-records/training-record-repository.js";
import type {
  EegSummaryMetrics,
  TrainingCompletionStatus,
  TrainingRecord,
  TrainingRecordType
} from "../training-records/training-record-types.js";
import type {
  BaselineAssessmentDetail,
  MusicAdaptationDetail,
  TherapistDashboardEEGTrendPoint,
  TherapistDashboardModuleHeatPoint,
  TherapistDashboardMusicTrendPoint,
  TherapistDashboardQualitySummary,
  TherapistDashboardReport,
  TherapistDashboardSupplement,
  TherapistNoteDetail,
  TherapistUserDetailSnapshot,
  TherapistWorkspaceSnapshot,
  TherapistWorkspaceUser,
  TrainingRecordDetail,
  TrendPoint,
  UserDetailSourceRecord,
  WorkspaceComplianceSummary,
  WorkspaceLastSession,
  WorkspaceRiskReminder,
  WorkspaceTrainingStatus
} from "./therapist-workspace-types.js";

export interface TherapistWorkspaceServiceDependencies {
  accessControl: AccessControlService;
  authRepository: AuthRepository;
  profileRepository: UserProfileRepository;
  prescriptionRepository: TrainingPrescriptionRepository;
  reportRepository: ReportRepository;
  trainingRecordRepository: TrainingRecordRepository;
}

interface AuthorizedProfileBundle {
  access?: ProfileAccessRecord;
  activePrescription?: TrainingPrescriptionRecord;
  profile: TrainingUserProfileRecord;
  records: TrainingRecord[];
}

/**
 * Builds therapist workspace read models from persisted profile, prescription,
 * report and training-record summaries. The aggregation is for authorized
 * training review only and does not create clinical conclusions.
 */
export class TherapistWorkspaceService {
  constructor(private readonly dependencies: TherapistWorkspaceServiceDependencies) {}

  async getWorkspace(principal: AuthenticatedPrincipal): Promise<TherapistWorkspaceSnapshot> {
    this.assertTherapistWorkspaceRole(principal);
    const bundles = await this.listAuthorizedProfileBundles(principal);
    const users = bundles.map((bundle) => this.buildWorkspaceUser(bundle));
    const detailRecords = bundles.map((bundle) => this.buildDetailRecord(bundle));
    const recentReports = await this.listVisibleReports(principal);

    return {
      users,
      dashboardSupplement: this.buildDashboardSupplement(bundles, users, recentReports),
      detailRecords,
      generatedAt: new Date().toISOString(),
      dataScopeNotice: "仅展示授权范围内的辅助训练记录、处方安排和趋势摘要，不作为诊断或疗效判断。"
    };
  }

  async getUserDetail(
    principal: AuthenticatedPrincipal,
    userId: string
  ): Promise<TherapistUserDetailSnapshot> {
    this.assertTherapistWorkspaceRole(principal);
    requireCondition(userId.trim().length > 0, "VALIDATION_ERROR", "Training user id is required.");

    const bundles = await this.listAuthorizedProfileBundles(principal, userId);
    const bundle = bundles[0];
    if (bundle === undefined) {
      throw new AuthModuleError("RESOURCE_NOT_FOUND", "Authorized training user was not found.");
    }

    return {
      user: this.buildWorkspaceUser(bundle),
      detailRecord: this.buildDetailRecord(bundle),
      generatedAt: new Date().toISOString(),
      dataScopeNotice: "用户详情仅展示授权训练摘要、趋势和治疗师备注，不包含诊断结论或疗效保证。"
    };
  }

  private async listAuthorizedProfileBundles(
    principal: AuthenticatedPrincipal,
    traineeUserId?: string
  ): Promise<AuthorizedProfileBundle[]> {
    const profiles = await this.dependencies.profileRepository.findMany({
      ...(traineeUserId !== undefined ? { traineeUserId } : {}),
      ...(!principal.roles.includes("system_admin") && principal.organizationId !== undefined
        ? { organizationId: principal.organizationId }
        : {}),
      status: "active"
    });
    const bundles: AuthorizedProfileBundle[] = [];
    const now = new Date();
    const monthStart = offsetDays(now, -30).toISOString();

    for (const profile of profiles) {
      const decision = await this.dependencies.accessControl.canAccessProfile(
        principal,
        accessTargetForProfile(profile)
      );
      if (!decision.allowed) {
        continue;
      }

      const [access, activePrescription, records] = await Promise.all([
        this.dependencies.authRepository.findProfileAccess(profile.id),
        this.dependencies.prescriptionRepository.findActiveByUserProfileId(profile.id),
        this.dependencies.trainingRecordRepository.findMany({
          userProfileId: profile.id,
          startedFrom: monthStart,
          startedTo: now.toISOString()
        })
      ]);

      bundles.push({
        ...(access !== undefined ? { access } : {}),
        ...(activePrescription !== undefined ? { activePrescription } : {}),
        profile,
        records
      });
    }

    return bundles;
  }

  private async listVisibleReports(principal: AuthenticatedPrincipal): Promise<ReportRecord[]> {
    const result = await this.dependencies.reportRepository.findMany({
      audience: "therapist",
      ...(!principal.roles.includes("system_admin") && principal.organizationId !== undefined
        ? { organizationId: principal.organizationId }
        : {})
    });
    const visibleReports: ReportRecord[] = [];
    for (const report of result) {
      const decision = await this.dependencies.accessControl.canAccessProfile(
        principal,
        accessTargetForReport(report)
      );
      if (decision.allowed) {
        visibleReports.push(report);
      }
    }
    return visibleReports;
  }

  private buildWorkspaceUser(bundle: AuthorizedProfileBundle): TherapistWorkspaceUser {
    const records7d = recordsSince(bundle.records, offsetDays(new Date(), -7));
    const latest = bundle.records[0];
    const compliance = buildCompliance(bundle.activePrescription, records7d);
    const riskReminder = buildRiskReminder(bundle.profile, latest, compliance);

    return {
      id: bundle.profile.traineeUserId,
      userProfileId: bundle.profile.id,
      displayName: bundle.profile.basicInfo.nickname,
      ageRange: ageBandLabel(bundle.profile.basicInfo.ageBand),
      organizationId: bundle.profile.organizationId ?? "",
      boundTherapistIds: bundle.access?.therapistUserIds ?? [],
      trainingStatus: buildTrainingStatus(bundle.activePrescription, latest),
      todayPlan: {
        moduleNames: bundle.activePrescription
          ? bundle.activePrescription.moduleCombination.map(moduleLabel)
          : [],
        plannedMinutes: bundle.activePrescription?.sessionDurationMinutes ?? 0,
        prescriptionStatus: bundle.activePrescription ? "ready" : "not_set"
      },
      lastSession: latest ? buildLastSession(latest) : null,
      compliance,
      riskReminder
    };
  }

  private buildDetailRecord(bundle: AuthorizedProfileBundle): UserDetailSourceRecord {
    const recentRecords = bundle.records.slice(0, 10).map(recordToDetail);
    return {
      userId: bundle.profile.traineeUserId,
      basicInfo: {
        genderLabel: genderLabel(bundle.profile.basicInfo.gender),
        guardianConsentStatus:
          bundle.profile.riskScreening.guardianConsentStatus === "granted"
            ? "confirmed"
            : "pending",
        boundTherapistName: "授权治疗师"
      },
      trainingGoal: {
        primaryGoal: bundle.profile.basicInfo.trainingGoals[0] ?? "保持稳定训练节奏",
        focusAreas: [
          ...bundle.profile.trainingInfo.attentionDifficultyManifestations,
          ...bundle.profile.trainingInfo.impulseControlManifestations
        ].slice(0, 4),
        weeklyPlanLabel: bundle.activePrescription
          ? `每周 ${bundle.activePrescription.weeklySessionCount} 次，每次 ${bundle.activePrescription.sessionDurationMinutes} 分钟`
          : "等待治疗师配置训练安排",
        safetyNote: buildSafetyNote(bundle.profile)
      },
      baselineAssessment: buildBaseline(bundle.records),
      recentTrainingRecords: recentRecords.length > 0 ? recentRecords : [buildEmptyRecordDetail()],
      weeklyTrendPoints: buildTrendPoints(recordsSince(bundle.records, offsetDays(new Date(), -7))),
      monthlyTrendPoints: buildTrendPoints(bundle.records),
      musicAdaptations: buildMusicAdaptations(bundle.records),
      therapistNotes: buildTherapistNotes(bundle.profile)
    };
  }

  private buildDashboardSupplement(
    bundles: AuthorizedProfileBundle[],
    users: TherapistWorkspaceUser[],
    reports: ReportRecord[]
  ): TherapistDashboardSupplement {
    const records = bundles.flatMap((bundle) => bundle.records);
    const displayNameByUserId = Object.fromEntries(
      bundles.map((bundle) => [bundle.profile.traineeUserId, bundle.profile.basicInfo.nickname])
    );

    return {
      displayNameByUserId,
      trainingTrend: buildTrainingTrend(records),
      eegTrend: buildEegTrend(records),
      recentReports: reports.slice(0, 6).map((report) => reportToDashboardReport(report, users)),
      moduleHeat: buildModuleHeat(bundles),
      musicTrend: buildMusicTrend(records),
      eegQuality: buildEegQuality(records),
      pendingReportCount: Math.max(
        0,
        users.filter((user) => user.lastSession !== null).length - reports.length
      ),
      parentFeedbackCount: users.filter((user) => user.riskReminder.category === "comfort_feedback")
        .length
    };
  }

  private assertTherapistWorkspaceRole(principal: AuthenticatedPrincipal): void {
    const allowed = principal.roles.some(
      (role) => role === "therapist" || role === "org_admin" || role === "system_admin"
    );
    requireCondition(allowed, "PERMISSION_DENIED", "Role cannot access therapist workspace.");
  }
}

function buildTrainingStatus(
  prescription: TrainingPrescriptionRecord | undefined,
  latest: TrainingRecord | undefined
): WorkspaceTrainingStatus {
  if (prescription === undefined) {
    return "no_plan";
  }
  if (latest && isToday(latest.startedAt) && latest.completionStatus === "completed") {
    return "completed_today";
  }
  if (latest && ["partial", "interrupted", "abandoned"].includes(latest.completionStatus)) {
    return "paused";
  }
  return "scheduled_today";
}

function accessTargetForProfile(profile: TrainingUserProfileRecord) {
  return {
    userProfileId: profile.id,
    ...(profile.organizationId !== undefined ? { organizationId: profile.organizationId } : {})
  };
}

function accessTargetForReport(report: ReportRecord) {
  return {
    userProfileId: report.userProfileId,
    ...(report.organizationId !== undefined ? { organizationId: report.organizationId } : {})
  };
}

function buildLastSession(record: TrainingRecord): WorkspaceLastSession {
  return {
    completedAtLabel: formatDateLabel(record.endedAt),
    moduleName: trainingTypeLabel(record.trainingType),
    durationMinutes: Math.round(record.durationSeconds / 60),
    completionStatus: completionStatusForWorkspace(record.completionStatus),
    note: buildRecordNote(record)
  };
}

function buildCompliance(
  prescription: TrainingPrescriptionRecord | undefined,
  records7d: TrainingRecord[]
): WorkspaceComplianceSummary {
  const plannedSessions7d = prescription?.weeklySessionCount ?? 0;
  const completedSessions7d = records7d.filter(
    (record) => record.completionStatus === "completed"
  ).length;
  const missedSessions7d = Math.max(0, plannedSessions7d - completedSessions7d);
  return {
    plannedSessions7d,
    completedSessions7d,
    missedSessions7d,
    completionRate: plannedSessions7d === 0 ? 0 : completedSessions7d / plannedSessions7d,
    streakDays: calculateStreakDays(records7d)
  };
}

function buildRiskReminder(
  profile: TrainingUserProfileRecord,
  latest: TrainingRecord | undefined,
  compliance: WorkspaceComplianceSummary
): WorkspaceRiskReminder {
  const latestEvent = latest?.abnormalEvents.find((event) => event.severity !== "info");
  if (latestEvent?.eventType === "user_discomfort") {
    return {
      level: "needs_review",
      category: "comfort_feedback",
      message: "最近训练记录中有不适反馈，建议先复核训练强度和休息安排。",
      occurredAtLabel: formatDateLabel(latestEvent.occurredAt)
    };
  }
  if (
    latest?.eegSummaryMetrics.qualityStatus === "noisy" ||
    latest?.eegSummaryMetrics.qualityStatus === "disconnected" ||
    latestEvent?.eventType === "low_signal_quality" ||
    latestEvent?.eventType === "device_disconnect"
  ) {
    return {
      level: "watch",
      category: "device_signal",
      message: "最近训练信号质量有波动，建议训练前确认设备佩戴和连接。",
      occurredAtLabel: latest ? formatDateLabel(latest.startedAt) : "最近"
    };
  }
  if (profile.riskScreening.severeHeadache || profile.riskScreening.significantDizziness) {
    return {
      level: "watch",
      category: "comfort_feedback",
      message: "档案中存在训练安全提示，建议保持短时、低干扰训练安排。",
      occurredAtLabel: "档案提示"
    };
  }
  if (compliance.plannedSessions7d > 0 && compliance.completionRate < 0.5) {
    return {
      level: "watch",
      category: "adherence",
      message: "最近完成率偏低，建议复核训练时长和模块组合是否过重。",
      occurredAtLabel: "最近 7 天"
    };
  }

  return {
    level: "none",
    category: "none",
    message: "暂无需要处理的训练安全提醒。",
    occurredAtLabel: "当前"
  };
}

function buildBaseline(records: TrainingRecord[]): BaselineAssessmentDetail {
  const baseline = records.find((record) => record.trainingType === "baseline_assessment");
  const source = baseline ?? records.at(-1);
  return {
    assessedAtLabel: source ? formatDateLabel(source.startedAt) : "暂无基线记录",
    attentionReferenceScore: round(source?.eegSummaryMetrics.averageAttentionIndex ?? 0),
    averageReactionTimeMs: round(source?.behaviorMetrics.averageReactionTimeMs ?? 0),
    impulseControlReferenceScore: round((source?.behaviorMetrics.accuracyRate ?? 0) * 100),
    rhythmSyncReferenceScore: round(readCustomNumber(source, "rhythmSyncScore") ?? 0),
    eegSignalQualityLabel: qualityLabel(source?.eegSummaryMetrics.qualityStatus),
    summary: source
      ? "基线用于训练起点和后续趋势比较，不作为诊断结论。"
      : "暂无基线评估记录，建议先完成短时状态采集。"
  };
}

function recordToDetail(record: TrainingRecord): TrainingRecordDetail {
  const totalTrials = record.behaviorMetrics.totalTrials ?? 0;
  const falseAlarmRate =
    totalTrials > 0 ? (record.behaviorMetrics.falseAlarmCount ?? 0) / totalTrials : 0;
  const omissionRate =
    totalTrials > 0 ? (record.behaviorMetrics.omissionCount ?? 0) / totalTrials : 0;

  return {
    id: record.id,
    completedAtLabel: formatDateLabel(record.endedAt),
    trainingType: record.trainingType,
    trainingTypeLabel: trainingTypeLabel(record.trainingType),
    durationMinutes: Math.round(record.durationSeconds / 60),
    completionStatusLabel: completionStatusLabel(record.completionStatus),
    accuracyRate: round((record.behaviorMetrics.accuracyRate ?? 0) * 100),
    averageReactionTimeMs: round(record.behaviorMetrics.averageReactionTimeMs ?? 0),
    falseAlarmRate,
    omissionRate,
    eegAttentionIndex: round(record.eegSummaryMetrics.averageAttentionIndex ?? 0),
    eegRelaxationIndex: round(record.eegSummaryMetrics.averageRelaxationIndex ?? 0),
    eegFatigueIndex: round(readEegNumber(record.eegSummaryMetrics, "averageFatigueIndex") ?? 0),
    difficultyLabel: `L${record.difficultyConfig.initialLevel} -> L${record.difficultyConfig.finalLevel}`,
    note: buildRecordNote(record)
  };
}

function buildEmptyRecordDetail(): TrainingRecordDetail {
  return {
    id: "empty-training-record",
    completedAtLabel: "暂无记录",
    trainingType: "mixed_session",
    trainingTypeLabel: "暂无训练记录",
    durationMinutes: 0,
    completionStatusLabel: "等待训练",
    accuracyRate: 0,
    averageReactionTimeMs: 0,
    falseAlarmRate: 0,
    omissionRate: 0,
    eegAttentionIndex: 0,
    eegRelaxationIndex: 0,
    eegFatigueIndex: 0,
    difficultyLabel: "未开始",
    note: "完成训练后会生成记录摘要。"
  };
}

function buildTrendPoints(records: TrainingRecord[]): TrendPoint[] {
  const sorted = [...records].sort(
    (left, right) => Date.parse(left.startedAt) - Date.parse(right.startedAt)
  );
  const source = sorted.length > 0 ? sorted : [];
  return source.map((record) => ({
    label: formatShortDate(record.startedAt),
    attentionStabilityScore: round(record.eegSummaryMetrics.averageAttentionIndex ?? 0),
    averageReactionTimeMs: round(record.behaviorMetrics.averageReactionTimeMs ?? 0),
    falseAlarmRate: rate(
      record.behaviorMetrics.falseAlarmCount,
      record.behaviorMetrics.totalTrials
    ),
    omissionRate: rate(record.behaviorMetrics.omissionCount, record.behaviorMetrics.totalTrials),
    eegAttentionIndex: round(record.eegSummaryMetrics.averageAttentionIndex ?? 0),
    eegRelaxationIndex: round(record.eegSummaryMetrics.averageRelaxationIndex ?? 0),
    eegFatigueIndex: round(readEegNumber(record.eegSummaryMetrics, "averageFatigueIndex") ?? 0)
  }));
}

function buildMusicAdaptations(records: TrainingRecord[]): MusicAdaptationDetail[] {
  return records
    .filter((record) => record.trainingType === "music_therapy")
    .slice(0, 5)
    .map((record) => ({
      id: `music-${record.id}`,
      trackTitle: readCustomString(record, "trackTitle") ?? "训练音乐",
      usedAtLabel: formatDateLabel(record.startedAt),
      suitabilityScore: round(readCustomNumber(record, "suitabilityScore") ?? 0),
      recommendationLabel: readCustomString(record, "recommendationLabel") ?? "继续观察适配趋势",
      userFeedbackLabel: readCustomString(record, "userFeedbackLabel") ?? "暂无主观反馈",
      nextSuggestion:
        readCustomString(record, "nextMusicSuggestion") ?? "下次保持舒适音量和短时训练。"
    }));
}

function buildTherapistNotes(profile: TrainingUserProfileRecord): TherapistNoteDetail[] {
  if (!profile.therapistNotes) {
    return [];
  }
  return [
    {
      id: `note-${profile.id}`,
      createdAtLabel: formatDateLabel(profile.updatedAt),
      authorName: "授权治疗师",
      content: profile.therapistNotes,
      visibilityLabel: "治疗师可见"
    }
  ];
}

function buildTrainingTrend(records: TrainingRecord[]) {
  return lastDays(7).map((date) => {
    const dayRecords = records.filter((record) => sameDay(record.startedAt, date));
    const completed = dayRecords.filter((record) => record.completionStatus === "completed").length;
    return {
      dayLabel: formatShortDate(date.toISOString()),
      completedSessions: completed,
      plannedSessions: dayRecords.length,
      averageCompletionRate:
        dayRecords.length === 0 ? 0 : round((completed / dayRecords.length) * 100)
    };
  });
}

function buildEegTrend(records: TrainingRecord[]): TherapistDashboardEEGTrendPoint[] {
  return lastDays(7).map((date) => {
    const dayRecords = records.filter((record) => sameDay(record.startedAt, date));
    return {
      dayLabel: formatShortDate(date.toISOString()),
      attentionScore: averageMetric(
        dayRecords,
        (record) => record.eegSummaryMetrics.averageAttentionIndex
      ),
      relaxationScore: averageMetric(
        dayRecords,
        (record) => record.eegSummaryMetrics.averageRelaxationIndex
      ),
      fatigueScore: averageMetric(dayRecords, (record) =>
        readEegNumber(record.eegSummaryMetrics, "averageFatigueIndex")
      )
    };
  });
}

function buildModuleHeat(bundles: AuthorizedProfileBundle[]): TherapistDashboardModuleHeatPoint[] {
  const map = new Map<string, TherapistDashboardModuleHeatPoint>();
  for (const bundle of bundles) {
    for (const moduleName of bundle.activePrescription?.moduleCombination.map(moduleLabel) ?? []) {
      const current = map.get(moduleName) ?? { moduleName, completedCount: 0, plannedCount: 0 };
      current.plannedCount += 1;
      current.completedCount += bundle.records.some(
        (record) => record.trainingType !== "baseline_assessment" && isToday(record.startedAt)
      )
        ? 1
        : 0;
      map.set(moduleName, current);
    }
  }
  return [...map.values()].sort((left, right) => right.plannedCount - left.plannedCount);
}

function buildMusicTrend(records: TrainingRecord[]): TherapistDashboardMusicTrendPoint[] {
  return lastDays(7).map((date) => {
    const dayRecords = records.filter(
      (record) => sameDay(record.startedAt, date) && record.trainingType === "music_therapy"
    );
    return {
      dayLabel: formatShortDate(date.toISOString()),
      suitabilityScore: averageMetric(dayRecords, (record) =>
        readCustomNumber(record, "suitabilityScore")
      )
    };
  });
}

function buildEegQuality(records: TrainingRecord[]): TherapistDashboardQualitySummary[] {
  const total = Math.max(1, records.length);
  const good = records.filter((record) => record.eegSummaryMetrics.qualityStatus === "good").length;
  const unstable = records.filter((record) =>
    ["unstable", "noisy"].includes(record.eegSummaryMetrics.qualityStatus ?? "")
  ).length;
  const disconnected = records.filter(
    (record) => record.eegSummaryMetrics.qualityStatus === "disconnected"
  ).length;
  return [
    { label: "稳定信号", value: round((good / total) * 100), tone: "good" },
    { label: "需复核佩戴", value: round((unstable / total) * 100), tone: "watch" },
    { label: "连接中断", value: round((disconnected / total) * 100), tone: "unstable" }
  ];
}

function reportToDashboardReport(
  report: ReportRecord,
  users: TherapistWorkspaceUser[]
): TherapistDashboardReport {
  const user = users.find((candidate) => candidate.id === report.userId);
  return {
    id: report.id,
    userId: report.userId,
    userDisplayName: user?.displayName ?? report.userId,
    title: report.reportType === "weekly" ? "训练周报" : "单次训练报告",
    generatedAtLabel: formatDateLabel(report.generatedAt),
    reportType: report.reportType === "weekly" ? "weekly" : "session"
  };
}

function buildRecordNote(record: TrainingRecord): string {
  if (record.abnormalEvents.length > 0) {
    return record.abnormalEvents[0]?.message ?? "训练中有事件记录，建议复核。";
  }
  if (record.completionStatus === "completed") {
    return "训练已完成，可用于趋势复盘。";
  }
  return "训练未完整完成，建议结合状态和主观反馈复核。";
}

function completionStatusForWorkspace(
  status: TrainingCompletionStatus
): "completed" | "partial" | "paused" {
  if (status === "completed") {
    return "completed";
  }
  if (status === "partial") {
    return "partial";
  }
  return "paused";
}

function completionStatusLabel(status: TrainingCompletionStatus): string {
  switch (status) {
    case "completed":
      return "已完成";
    case "partial":
      return "部分完成";
    case "abandoned":
      return "提前结束";
    case "interrupted":
      return "暂停中断";
  }
}

function trainingTypeLabel(type: TrainingRecordType): string {
  switch (type) {
    case "baseline_assessment":
      return "基线评估";
    case "music_therapy":
      return "音乐疗愈";
    case "attention_game":
      return "注意力训练";
    case "go_nogo_game":
      return "Go/No-Go 训练";
    case "rhythm_navigation":
      return "节律导航";
    case "mixed_session":
      return "综合训练";
  }
}

function moduleLabel(type: TrainingPrescriptionRecord["moduleCombination"][number]): string {
  switch (type) {
    case "music_therapy":
      return "音乐疗愈";
    case "attention_game":
      return "注意力训练";
    case "go_nogo_game":
      return "Go/No-Go";
    case "rhythm_navigation":
      return "节律导航";
  }
}

function ageBandLabel(ageBand: TrainingUserProfileRecord["basicInfo"]["ageBand"]): string {
  switch (ageBand) {
    case "8_10":
      return "8-10";
    case "11_13":
      return "11-13";
    case "14_16":
      return "14-16";
    case "other":
      return "其他";
  }
}

function genderLabel(gender: TrainingUserProfileRecord["basicInfo"]["gender"]): string {
  switch (gender) {
    case "female":
      return "女";
    case "male":
      return "男";
    case "non_binary":
      return "其他";
    case "prefer_not_to_say":
      return "未说明";
    case "unspecified":
    case undefined:
      return "未填写";
  }
}

function qualityLabel(status: EegSummaryMetrics["qualityStatus"]): string {
  switch (status) {
    case "good":
      return "信号稳定";
    case "unstable":
      return "信号波动";
    case "noisy":
      return "干扰偏高";
    case "disconnected":
      return "连接中断";
    case undefined:
      return "暂无记录";
  }
}

function buildSafetyNote(profile: TrainingUserProfileRecord): string {
  if (profile.riskScreening.photosensitivityRisk) {
    return "训练界面应避免强闪烁和高频刺激。";
  }
  if (profile.riskScreening.guardianConsentStatus !== "granted") {
    return "进入训练前需确认监护人同意状态。";
  }
  return "保持短时、可暂停、低干扰训练安排。";
}

function recordsSince(records: TrainingRecord[], start: Date): TrainingRecord[] {
  return records.filter((record) => Date.parse(record.startedAt) >= start.getTime());
}

function calculateStreakDays(records: TrainingRecord[]): number {
  const completedDays = new Set(
    records
      .filter((record) => record.completionStatus === "completed")
      .map((record) => new Date(record.startedAt).toISOString().slice(0, 10))
  );
  let streak = 0;
  for (const date of lastDays(7).reverse()) {
    if (!completedDays.has(date.toISOString().slice(0, 10))) {
      break;
    }
    streak += 1;
  }
  return streak;
}

function lastDays(count: number): Date[] {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => offsetDays(today, index - count + 1));
}

function offsetDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

function sameDay(value: string, date: Date): boolean {
  return new Date(value).toISOString().slice(0, 10) === date.toISOString().slice(0, 10);
}

function isToday(value: string): boolean {
  return sameDay(value, new Date());
}

function formatDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未知时间";
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function averageMetric(
  records: TrainingRecord[],
  read: (record: TrainingRecord) => number | undefined
): number {
  const values = records
    .map(read)
    .filter((value): value is number => value !== undefined && Number.isFinite(value));
  if (values.length === 0) {
    return 0;
  }
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function rate(count: number | undefined, total: number | undefined): number {
  if (!count || !total) {
    return 0;
  }
  return count / total;
}

function round(value: number): number {
  return Math.round(value);
}

function readCustomNumber(record: TrainingRecord | undefined, key: string): number | undefined {
  const value = record?.behaviorMetrics.customMetrics?.[key];
  return typeof value === "number" ? value : undefined;
}

function readCustomString(record: TrainingRecord | undefined, key: string): string | undefined {
  const value = record?.behaviorMetrics.customMetrics?.[key];
  return typeof value === "string" ? value : undefined;
}

function readEegNumber(metrics: EegSummaryMetrics, key: string): number | undefined {
  const value = (metrics as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}
