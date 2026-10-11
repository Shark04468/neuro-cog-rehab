import type {
  RiskAlert,
  RiskAlertCategory,
  RiskAlertSeverity,
  TrainingReport,
  TrainingReportMetricSummary,
  TrainingType
} from "@neuro-cog-rehab/shared-types";

import {
  exportSingleSessionReportPdf,
  generateSingleSessionHtmlReport,
  generateSingleSessionTrainingReport,
  type SingleSessionAbnormalEvent,
  type SingleSessionBehaviorMetrics,
  type SingleSessionCompletionStatus,
  type SingleSessionReportInput,
  type SingleSessionReportTrainingType,
  type SingleSessionTrainingReport
} from "./single-session-report.js";
import {
  exportWeeklyTrainingReportPdf,
  generateWeeklyTrainingHtmlReport,
  generateWeeklyTrainingReport,
  type WeeklyBehaviorMetrics,
  type WeeklyTrainingCompletionStatus,
  type WeeklyTrainingRecordSummary,
  type WeeklyTrainingReport,
  type WeeklyTrainingReportAudience,
  type WeeklyTrainingReportInput,
  type WeeklyTrainingReportTrainingType,
  type WeeklyTrendDirection
} from "./weekly-training-report.js";

export type PublishedReportType = "single_session" | "weekly";
export type PublishedReportAudience = "therapist" | "parent";

export interface ReportApiSession {
  apiBaseUrl: string;
  accessToken: string;
}

export interface ReportPublishOptions {
  session: ReportApiSession;
  /** Optional fetch implementation for tests or non-browser runtimes. */
  fetcher?: typeof fetch;
  /** Required when the generator input does not already contain userProfileId. */
  userProfileId?: string;
  /** Optional organization scope used by api-server access control. */
  organizationId?: string;
  /** Optional therapist id for single-session reports. Weekly inputs can provide it in userInfo. */
  therapistUserId?: string;
  /** API audience. Defaults to therapist; weekly "guardian" exports are mapped to parent. */
  audience?: PublishedReportAudience;
}

export interface PublishedTrainingReport extends TrainingReport {
  userProfileId: string;
  organizationId?: string;
  reportType: PublishedReportType;
  audience: PublishedReportAudience;
  htmlContent?: string;
  pdfFileName?: string;
  generatedByUserId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PublishReportInput extends TrainingReport {
  userProfileId: string;
  organizationId?: string;
  reportType: PublishedReportType;
  audience: PublishedReportAudience;
  htmlContent?: string;
  pdfFileName?: string;
}

interface ApiErrorBody {
  error?: {
    message?: string;
  };
}

export class ReportPublishingError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ReportPublishingError";
  }
}

export async function publishSingleSessionReport(
  input: SingleSessionReportInput,
  options: ReportPublishOptions
): Promise<PublishedTrainingReport> {
  const normalizedInput = normalizeSingleSessionInput(input);
  const report = generateSingleSessionTrainingReport(normalizedInput);
  const htmlExport = generateSingleSessionHtmlReport(normalizedInput);
  const pdfExport = exportSingleSessionReportPdf(normalizedInput);
  const userProfileId = resolveUserProfileId(options.userProfileId, report.userInfo.userProfileId);
  const completedSessionCount = report.sessionInfo.completionStatus === "completed" ? 1 : 0;
  const payload = withOptionalReportFields(
    {
      id: report.id,
      userId: report.userInfo.userId,
      userProfileId,
      reportType: "single_session",
      audience: options.audience ?? "therapist",
      periodStart: report.sessionInfo.startedAt,
      periodEnd: report.sessionInfo.endedAt,
      generatedAt: report.generatedAt,
      sessionCount: 1,
      completedSessionCount,
      averageCompletionRate: completionRateFromSingleSession(report),
      metricSummaries: buildSingleSessionMetricSummaries(report),
      riskAlerts: buildSingleSessionRiskAlerts(report),
      narrativeSummary: report.narrativeSummary,
      nextTrainingFocus: [report.recommendation],
      dataScopeNotice: report.scopeNotice,
      htmlContent: htmlExport.html,
      pdfFileName: pdfExport.fileName
    },
    buildOptionalReportScope(options.organizationId, options.therapistUserId)
  );

  return postReport(payload, options);
}

export async function publishWeeklyTrainingReport(
  input: WeeklyTrainingReportInput,
  options: ReportPublishOptions & {
    audience?: PublishedReportAudience | WeeklyTrainingReportAudience;
  }
): Promise<PublishedTrainingReport> {
  const normalizedInput = normalizeWeeklyTrainingInput(input);
  const report = generateWeeklyTrainingReport(normalizedInput);
  const weeklyAudience =
    options.audience === "parent" ? "guardian" : (options.audience ?? "therapist");
  const apiAudience: PublishedReportAudience =
    weeklyAudience === "guardian" ? "parent" : "therapist";
  const htmlExport = generateWeeklyTrainingHtmlReport(normalizedInput, {
    audience: weeklyAudience
  });
  const pdfExport = exportWeeklyTrainingReportPdf(normalizedInput, { audience: weeklyAudience });
  const userProfileId = resolveUserProfileId(options.userProfileId, report.userInfo.userProfileId);
  const payload = withOptionalReportFields(
    {
      id: report.id,
      userId: report.userInfo.userId,
      userProfileId,
      reportType: "weekly",
      audience: apiAudience,
      periodStart: report.period.periodStart,
      periodEnd: report.period.periodEnd,
      generatedAt: report.generatedAt,
      sessionCount: report.sessionCount,
      completedSessionCount: report.completedSessionCount,
      averageCompletionRate: report.completionRate,
      metricSummaries: buildWeeklyMetricSummaries(report, normalizedInput.sessions),
      riskAlerts: buildWeeklyRiskAlerts(report, normalizedInput.sessions),
      narrativeSummary: report.narrativeSummary,
      nextTrainingFocus: report.nextWeekSuggestions,
      dataScopeNotice: report.scopeNotice,
      htmlContent: htmlExport.html,
      pdfFileName: pdfExport.fileName
    },
    buildOptionalReportScope(
      options.organizationId,
      options.therapistUserId ?? report.userInfo.therapistUserId
    )
  );

  return postReport(payload, options);
}

async function postReport(
  payload: PublishReportInput,
  options: ReportPublishOptions
): Promise<PublishedTrainingReport> {
  const response = await (options.fetcher ?? fetch)(
    `${options.session.apiBaseUrl.replace(/\/+$/, "")}/reports`,
    {
      body: JSON.stringify(payload),
      headers: {
        authorization: `Bearer ${options.session.accessToken}`,
        "content-type": "application/json"
      },
      method: "POST"
    }
  );
  const body = await readJson(response);
  if (!response.ok) {
    throw new ReportPublishingError(extractErrorMessage(body));
  }
  return body as PublishedTrainingReport;
}

function normalizeSingleSessionInput(input: SingleSessionReportInput): SingleSessionReportInput {
  return {
    ...input,
    generatedAt: input.generatedAt ?? new Date().toISOString()
  };
}

function normalizeWeeklyTrainingInput(input: WeeklyTrainingReportInput): WeeklyTrainingReportInput {
  return {
    ...input,
    generatedAt: input.generatedAt ?? new Date().toISOString()
  };
}

function resolveUserProfileId(
  optionValue: string | undefined,
  reportValue: string | undefined
): string {
  const userProfileId = optionValue ?? reportValue;
  if (userProfileId === undefined || userProfileId.trim().length === 0) {
    throw new ReportPublishingError("userProfileId is required before publishing a report.");
  }
  return userProfileId;
}

function withOptionalReportFields(
  payload: PublishReportInput,
  optionalFields: {
    organizationId?: string;
    therapistUserId?: string;
  }
): PublishReportInput {
  const nextPayload: PublishReportInput = { ...payload };
  if (optionalFields.organizationId !== undefined) {
    nextPayload.organizationId = optionalFields.organizationId;
  }
  if (optionalFields.therapistUserId !== undefined) {
    nextPayload.therapistUserId = optionalFields.therapistUserId;
  }
  return nextPayload;
}

function buildOptionalReportScope(
  organizationId: string | undefined,
  therapistUserId: string | undefined
): {
  organizationId?: string;
  therapistUserId?: string;
} {
  const scope: {
    organizationId?: string;
    therapistUserId?: string;
  } = {};
  if (organizationId !== undefined) {
    scope.organizationId = organizationId;
  }
  if (therapistUserId !== undefined) {
    scope.therapistUserId = therapistUserId;
  }
  return scope;
}

function buildSingleSessionMetricSummaries(
  report: SingleSessionTrainingReport
): TrainingReportMetricSummary[] {
  const summaries: TrainingReportMetricSummary[] = [];
  const seenTrainingTypes = new Set<TrainingType>();

  for (const module of report.completedModules) {
    const trainingType = toSharedTrainingType(module.moduleType);
    if (trainingType === undefined || seenTrainingTypes.has(trainingType)) {
      continue;
    }
    seenTrainingTypes.add(trainingType);
    summaries.push(
      withOptionalMetricFields(
        {
          trainingType,
          completedSessionCount: module.completionStatus === "completed" ? 1 : 0,
          averageCompletionRate: completionRateFromStatus(module.completionStatus),
          trendLabel: "not_enough_data"
        },
        report.behaviorMetrics
      )
    );
  }

  return summaries;
}

function buildWeeklyMetricSummaries(
  report: WeeklyTrainingReport,
  sessions: WeeklyTrainingRecordSummary[]
): TrainingReportMetricSummary[] {
  const groups = new Map<TrainingType, WeeklyTrainingRecordSummary[]>();
  for (const session of reportSessionsBySharedType(sessions)) {
    const group = groups.get(session.trainingType) ?? [];
    group.push(session.record);
    groups.set(session.trainingType, group);
  }

  const summaries: TrainingReportMetricSummary[] = [];
  for (const [trainingType, records] of groups) {
    summaries.push(
      withOptionalMetricFields(
        {
          trainingType,
          completedSessionCount: records.filter((record) => record.completionStatus === "completed")
            .length,
          averageCompletionRate: average(
            records.map((record) => completionRateFromStatus(record.completionStatus))
          ),
          trendLabel: trendLabelForTrainingType(report, trainingType)
        },
        averageWeeklyBehaviorMetrics(records)
      )
    );
  }
  return summaries;
}

function buildSingleSessionRiskAlerts(report: SingleSessionTrainingReport): RiskAlert[] {
  return report.abnormalEvents.map((event, index) => ({
    id: `${report.id}-event-${index + 1}`,
    userId: report.userInfo.userId,
    sessionId: report.sessionInfo.sessionId,
    category: riskCategoryForSingleSessionEvent(event),
    severity: riskSeverityForSingleSessionEvent(event),
    message: event.message,
    recommendedAction: recommendedActionForSingleSessionEvent(event),
    createdAt: event.occurredAt
  }));
}

function buildWeeklyRiskAlerts(
  report: WeeklyTrainingReport,
  sessions: WeeklyTrainingRecordSummary[]
): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  for (const record of sessions) {
    if ((record.abnormalEventCount ?? 0) === 0) {
      continue;
    }
    alerts.push({
      id: `${report.id}-${record.sessionId}-events`,
      userId: report.userInfo.userId,
      sessionId: record.sessionId,
      category: "training_load",
      severity: "watch",
      message: `本周 ${record.trainingType} 训练记录中有 ${record.abnormalEventCount} 条暂停或安全提示事件。`,
      recommendedAction: "建议治疗师查看单次训练记录，并根据完成情况调整下次训练强度。",
      createdAt: record.endedAt ?? record.startedAt
    });
  }
  return alerts;
}

function withOptionalMetricFields(
  base: TrainingReportMetricSummary,
  metrics: Pick<SingleSessionBehaviorMetrics, "accuracyRate" | "averageReactionTimeMs">
): TrainingReportMetricSummary {
  const summary: TrainingReportMetricSummary = { ...base };
  if (metrics.accuracyRate !== undefined) {
    summary.averageAccuracyRate = clamp(metrics.accuracyRate, 0, 1);
  }
  if (metrics.averageReactionTimeMs !== undefined) {
    summary.averageReactionTimeMs = Math.max(0, metrics.averageReactionTimeMs);
  }
  return summary;
}

function averageWeeklyBehaviorMetrics(
  records: WeeklyTrainingRecordSummary[]
): Pick<WeeklyBehaviorMetrics, "accuracyRate" | "averageReactionTimeMs"> {
  const averageMetrics: Pick<WeeklyBehaviorMetrics, "accuracyRate" | "averageReactionTimeMs"> = {};
  const averageAccuracyRate = averageDefined(
    records.map((record) => record.behaviorMetrics.accuracyRate)
  );
  const averageReactionTimeMs = averageDefined(
    records.map((record) => record.behaviorMetrics.averageReactionTimeMs)
  );
  if (averageAccuracyRate !== undefined) {
    averageMetrics.accuracyRate = averageAccuracyRate;
  }
  if (averageReactionTimeMs !== undefined) {
    averageMetrics.averageReactionTimeMs = averageReactionTimeMs;
  }
  return averageMetrics;
}

function reportSessionsBySharedType(
  sessions: WeeklyTrainingRecordSummary[]
): Array<{ trainingType: TrainingType; record: WeeklyTrainingRecordSummary }> {
  const records: Array<{ trainingType: TrainingType; record: WeeklyTrainingRecordSummary }> = [];
  for (const record of sessions) {
    const trainingType = toSharedTrainingType(record.trainingType);
    if (trainingType !== undefined) {
      records.push({ trainingType, record });
    }
  }
  return records;
}

function toSharedTrainingType(
  trainingType: SingleSessionReportTrainingType | WeeklyTrainingReportTrainingType
): TrainingType | undefined {
  switch (trainingType) {
    case "music_therapy":
      return "music_relaxation";
    case "attention_game":
      return "attention_training";
    case "go_nogo_game":
      return "go_no_go";
    case "rhythm_navigation":
      return "rhythm_navigation";
    case "baseline_assessment":
    case "mixed_session":
      return undefined;
    default:
      return undefined;
  }
}

function completionRateFromSingleSession(report: SingleSessionTrainingReport): number {
  return clamp(
    report.behaviorMetrics.completionRate ??
      completionRateFromStatus(report.sessionInfo.completionStatus),
    0,
    1
  );
}

function completionRateFromStatus(
  status: SingleSessionCompletionStatus | WeeklyTrainingCompletionStatus
): number {
  switch (status) {
    case "completed":
      return 1;
    case "partial":
    case "interrupted":
      return 0.5;
    case "abandoned":
      return 0;
    default:
      return 0;
  }
}

function trendLabelForTrainingType(
  report: WeeklyTrainingReport,
  trainingType: TrainingType
): WeeklyTrendDirection {
  switch (trainingType) {
    case "music_relaxation":
      return report.trends.musicAdaptation.direction;
    case "attention_training":
      return report.trends.attentionTraining.direction;
    case "go_no_go":
    case "stop_signal":
      return report.trends.impulseControl.direction;
    case "rhythm_navigation":
      return report.trends.rhythmNavigation.direction;
    default:
      return "not_enough_data";
  }
}

function riskCategoryForSingleSessionEvent(event: SingleSessionAbnormalEvent): RiskAlertCategory {
  switch (event.eventType) {
    case "device_disconnect":
    case "low_signal_quality":
      return "data_quality";
    case "user_discomfort":
      return "comfort";
    case "pause":
    case "early_stop":
      return "training_load";
    case "other":
      return "engagement";
    default:
      return "engagement";
  }
}

function riskSeverityForSingleSessionEvent(event: SingleSessionAbnormalEvent): RiskAlertSeverity {
  switch (event.severity) {
    case "critical":
      return "action_required";
    case "warning":
      return "watch";
    case "info":
      return "info";
    default:
      return "info";
  }
}

function recommendedActionForSingleSessionEvent(event: SingleSessionAbnormalEvent): string {
  switch (event.eventType) {
    case "device_disconnect":
    case "low_signal_quality":
      return "建议复核设备连接和佩戴状态，再继续记录训练趋势。";
    case "user_discomfort":
      return "建议先暂停训练并记录主观反馈，必要时调整为低强度任务或休息。";
    case "early_stop":
    case "pause":
      return "建议查看暂停前后的训练负荷和疲劳趋势，作为下次安排参考。";
    case "other":
      return "建议治疗师结合训练记录进行复核。";
    default:
      return "建议治疗师结合训练记录进行复核。";
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function extractErrorMessage(body: unknown): string {
  return (body as ApiErrorBody).error?.message ?? "Report API did not accept the generated report.";
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageDefined(values: Array<number | undefined>): number | undefined {
  const definedValues = values.filter((value): value is number => value !== undefined);
  return definedValues.length === 0 ? undefined : average(definedValues);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
