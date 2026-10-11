import {
  canPrincipalAccessWorkspaceUser,
  type TherapistWorkspacePrincipal,
  type TherapistWorkspaceUser,
  type WorkspaceRiskCategory,
  type WorkspaceRiskFilter,
  type WorkspaceRiskLevel,
  type WorkspaceTrainingStatus,
  type WorkspaceTrainingStatusFilter
} from "./therapist-workspace-model.js";

export type TherapistDashboardActionType =
  | "open_user_detail"
  | "open_training_record"
  | "create_prescription"
  | "open_weekly_report"
  | "open_live_monitoring";

export type TherapistDashboardTimeRange = "7d" | "30d";

export interface TherapistDashboardFilters {
  trainingStatus: WorkspaceTrainingStatusFilter;
  risk: WorkspaceRiskFilter;
  searchTerm: string;
}

export interface TherapistDashboardTrendPoint {
  dayLabel: string;
  completedSessions: number;
  plannedSessions: number;
  averageCompletionRate: number;
}

export interface TherapistDashboardEEGTrendPoint {
  dayLabel: string;
  attentionScore: number;
  relaxationScore: number;
  fatigueScore: number;
}

export interface TherapistDashboardModuleHeatPoint {
  moduleName: string;
  completedCount: number;
  plannedCount: number;
}

export interface TherapistDashboardMusicTrendPoint {
  dayLabel: string;
  suitabilityScore: number;
}

export interface TherapistDashboardQualitySummary {
  label: string;
  value: number;
  tone: "good" | "watch" | "unstable";
}

export interface TherapistDashboardReport {
  id: string;
  userId: string;
  userDisplayName: string;
  title: string;
  generatedAtLabel: string;
  reportType: "session" | "weekly";
}

export interface TherapistDashboardSupplement {
  displayNameByUserId: Record<string, string>;
  trainingTrend: TherapistDashboardTrendPoint[];
  eegTrend: TherapistDashboardEEGTrendPoint[];
  recentReports: TherapistDashboardReport[];
  moduleHeat?: TherapistDashboardModuleHeatPoint[];
  musicTrend?: TherapistDashboardMusicTrendPoint[];
  eegQuality?: TherapistDashboardQualitySummary[];
  pendingReportCount?: number;
  parentFeedbackCount?: number;
}

export interface TherapistDashboardUserRow {
  id: string;
  userProfileId: string;
  displayName: string;
  ageRange: string;
  trainingStatus: WorkspaceTrainingStatus;
  trainingStatusLabel: string;
  riskLevel: WorkspaceRiskLevel;
  riskLabel: string;
  todayModulesLabel: string;
  plannedMinutes: number;
  completionRate: number;
  complianceLabel: string;
  lastSessionLabel: string;
  riskMessage: string;
  weeklySessionCount: number;
  attentionTrendLabel: string;
  attentionTrendScore: number;
  fatigueTrendLabel: string;
  fatigueTrendScore: number;
  currentPrescriptionLabel: string;
}

export interface TherapistDashboardRiskAlert {
  id: string;
  userId: string;
  userDisplayName: string;
  level: WorkspaceRiskLevel;
  levelLabel: string;
  category: WorkspaceRiskCategory;
  message: string;
  occurredAtLabel: string;
}

export interface TherapistDashboardTodo {
  id: string;
  title: string;
  description: string;
  actionType: TherapistDashboardActionType;
  userId?: string;
  category: "risk" | "report" | "prescription" | "device" | "feedback" | "monitoring";
}

export interface TherapistDashboardStatMetric {
  id:
    | "managed_users"
    | "today_due"
    | "completed_today"
    | "risk_alerts"
    | "average_completion"
    | "pending_reports";
  label: string;
  value: string;
  helperText: string;
  tone: "blue" | "teal" | "violet" | "orange";
}

export interface TherapistDashboardViewModel {
  therapistName: string;
  filters: TherapistDashboardFilters;
  managedUserCount: number;
  todayDueCount: number;
  completedTodayCount: number;
  riskAlertCount: number;
  averageCompletionRate: number;
  pendingReportCount: number;
  prescriptionAdjustmentCount: number;
  deviceIssueCount: number;
  parentFeedbackCount: number;
  statMetrics: TherapistDashboardStatMetric[];
  filteredUsers: TherapistDashboardUserRow[];
  riskAlerts: TherapistDashboardRiskAlert[];
  todos: TherapistDashboardTodo[];
  trainingTrend: TherapistDashboardTrendPoint[];
  eegTrend: TherapistDashboardEEGTrendPoint[];
  recentReports: TherapistDashboardReport[];
  statusDistribution: Record<WorkspaceTrainingStatus, number>;
  moduleHeat: TherapistDashboardModuleHeatPoint[];
  musicTrend: TherapistDashboardMusicTrendPoint[];
  eegQuality: TherapistDashboardQualitySummary[];
}

export class TherapistDashboardModelError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TherapistDashboardModelError";
  }
}

export const DASHBOARD_TRAINING_STATUS_LABELS: Record<WorkspaceTrainingStatusFilter, string> = {
  all: "全部训练状态",
  scheduled_today: "今日待训练",
  in_progress: "训练中",
  completed_today: "今日已完成",
  paused: "暂停待跟进",
  no_plan: "未配置任务"
};

export const DASHBOARD_RISK_LABELS: Record<WorkspaceRiskFilter, string> = {
  all: "全部提醒",
  has_reminder: "有提醒",
  none: "暂无提醒",
  watch: "观察提醒",
  needs_review: "需要复核"
};

export function buildTherapistDashboardViewModel(input: {
  principal: TherapistWorkspacePrincipal;
  therapistName: string;
  users: TherapistWorkspaceUser[];
  filters: TherapistDashboardFilters;
  supplement: TherapistDashboardSupplement;
}): TherapistDashboardViewModel {
  assertTherapistDashboardPrincipal(input.principal);

  const accessibleUsers = input.users.filter((user) =>
    canPrincipalAccessWorkspaceUser(input.principal, user)
  );
  const accessibleUserIds = new Set(accessibleUsers.map((user) => user.id));
  const rows = accessibleUsers.map((user) =>
    buildDashboardUserRow(user, input.supplement.displayNameByUserId)
  );
  const filteredUsers = rows.filter((row) => matchesDashboardFilters(row, input.filters));
  const riskAlerts = rows
    .filter((row) => row.riskLevel !== "none")
    .map((row) => {
      const sourceUser = accessibleUsers.find((user) => user.id === row.id);

      return {
        id: `risk-${row.id}`,
        userId: row.id,
        userDisplayName: row.displayName,
        level: row.riskLevel,
        levelLabel: row.riskLabel,
        category: sourceUser?.riskReminder.category ?? "none",
        message: row.riskMessage,
        occurredAtLabel: sourceUser?.riskReminder.occurredAtLabel ?? "今天"
      };
    });
  const recentReports = input.supplement.recentReports.filter((report) =>
    accessibleUserIds.has(report.userId)
  );
  const managedUserCount = rows.length;
  const todayDueCount = rows.filter((row) =>
    ["scheduled_today", "in_progress", "paused"].includes(row.trainingStatus)
  ).length;
  const completedTodayCount = rows.filter((row) => row.trainingStatus === "completed_today").length;
  const averageCompletionRate =
    rows.length === 0
      ? 0
      : Math.round(rows.reduce((sum, row) => sum + row.completionRate, 0) / rows.length);
  const pendingReportCount =
    input.supplement.pendingReportCount ?? Math.max(1, completedTodayCount + riskAlerts.length - 1);
  const prescriptionAdjustmentCount = rows.filter(
    (row) => row.trainingStatus === "no_plan" || row.riskLevel === "needs_review"
  ).length;
  const deviceIssueCount = riskAlerts.filter((alert) => alert.category === "device_signal").length;
  const parentFeedbackCount =
    input.supplement.parentFeedbackCount ??
    riskAlerts.filter((alert) => alert.category === "comfort_feedback").length;
  const statusDistribution = buildStatusDistribution(rows);

  return {
    therapistName: input.therapistName,
    filters: input.filters,
    managedUserCount,
    todayDueCount,
    completedTodayCount,
    riskAlertCount: riskAlerts.length,
    averageCompletionRate,
    pendingReportCount,
    prescriptionAdjustmentCount,
    deviceIssueCount,
    parentFeedbackCount,
    statMetrics: buildDashboardStatMetrics({
      managedUserCount,
      todayDueCount,
      completedTodayCount,
      riskAlertCount: riskAlerts.length,
      averageCompletionRate,
      pendingReportCount
    }),
    filteredUsers,
    riskAlerts,
    todos: buildDashboardTodos(rows, riskAlerts, pendingReportCount),
    trainingTrend: input.supplement.trainingTrend,
    eegTrend: input.supplement.eegTrend,
    recentReports,
    statusDistribution,
    moduleHeat: input.supplement.moduleHeat ?? deriveModuleHeat(accessibleUsers),
    musicTrend: input.supplement.musicTrend ?? deriveMusicTrend(input.supplement.trainingTrend),
    eegQuality:
      input.supplement.eegQuality ?? deriveEEGQuality(input.supplement.eegTrend, riskAlerts)
  };
}

export function assertTherapistDashboardUserAccess(input: {
  principal: TherapistWorkspacePrincipal;
  users: TherapistWorkspaceUser[];
  userId: string;
}): TherapistWorkspaceUser {
  assertTherapistDashboardPrincipal(input.principal);

  const user = input.users.find((candidate) => candidate.id === input.userId);
  if (!user || !canPrincipalAccessWorkspaceUser(input.principal, user)) {
    throw new TherapistDashboardModelError("Current principal cannot access this training user.");
  }

  return user;
}

export function createDefaultTherapistDashboardFilters(): TherapistDashboardFilters {
  return {
    trainingStatus: "all",
    risk: "all",
    searchTerm: ""
  };
}

function assertTherapistDashboardPrincipal(principal: TherapistWorkspacePrincipal): void {
  if (!principal.userId || !principal.therapistId || !principal.organizationId) {
    throw new TherapistDashboardModelError("Principal identity scope is incomplete.");
  }
  if (
    !principal.roles.includes("therapist") &&
    !principal.roles.includes("org_admin") &&
    !principal.roles.includes("system_admin")
  ) {
    throw new TherapistDashboardModelError("Principal role cannot access therapist dashboard.");
  }
}

function buildDashboardUserRow(
  user: TherapistWorkspaceUser,
  displayNameByUserId: Record<string, string>
): TherapistDashboardUserRow {
  const displayName = displayNameByUserId[user.id] ?? user.displayName;
  const completionRate = Math.round(user.compliance.completionRate * 100);
  const missedPenalty = user.compliance.missedSessions7d * 4;
  const attentionTrendScore = clamp(
    48 + completionRate * 0.42 + (user.trainingStatus === "completed_today" ? 8 : 0) - missedPenalty
  );
  const fatigueTrendScore = clamp(
    user.riskReminder.category === "fatigue_trend"
      ? 68
      : 34 + user.compliance.missedSessions7d * 5 + (user.trainingStatus === "paused" ? 10 : 0)
  );

  return {
    id: user.id,
    userProfileId: user.userProfileId,
    displayName,
    ageRange: user.ageRange,
    trainingStatus: user.trainingStatus,
    trainingStatusLabel: DASHBOARD_TRAINING_STATUS_LABELS[user.trainingStatus],
    riskLevel: user.riskReminder.level,
    riskLabel: DASHBOARD_RISK_LABELS[user.riskReminder.level],
    todayModulesLabel:
      user.todayPlan.moduleNames.length === 0
        ? "等待训练处方"
        : normalizeModuleNames(user.todayPlan.moduleNames).join(" / "),
    plannedMinutes: user.todayPlan.plannedMinutes,
    completionRate,
    complianceLabel: `${completionRate}% / 连续 ${user.compliance.streakDays} 天`,
    lastSessionLabel: user.lastSession
      ? `${normalizeModuleName(user.lastSession.moduleName)} · ${user.lastSession.completedAtLabel}`
      : "暂无训练记录",
    riskMessage: user.riskReminder.message,
    weeklySessionCount: user.compliance.completedSessions7d,
    attentionTrendLabel: buildAttentionTrendLabel(attentionTrendScore),
    attentionTrendScore,
    fatigueTrendLabel: buildFatigueTrendLabel(fatigueTrendScore),
    fatigueTrendScore,
    currentPrescriptionLabel: buildPrescriptionLabel(user)
  };
}

function matchesDashboardFilters(
  row: TherapistDashboardUserRow,
  filters: TherapistDashboardFilters
): boolean {
  const searchTerm = filters.searchTerm.trim().toLowerCase();
  const matchesSearch =
    searchTerm.length === 0 ||
    row.displayName.toLowerCase().includes(searchTerm) ||
    row.userProfileId.toLowerCase().includes(searchTerm);
  const matchesStatus =
    filters.trainingStatus === "all" || row.trainingStatus === filters.trainingStatus;
  const matchesRisk =
    filters.risk === "all" ||
    (filters.risk === "has_reminder" && row.riskLevel !== "none") ||
    row.riskLevel === filters.risk;

  return matchesSearch && matchesStatus && matchesRisk;
}

function buildDashboardStatMetrics(input: {
  managedUserCount: number;
  todayDueCount: number;
  completedTodayCount: number;
  riskAlertCount: number;
  averageCompletionRate: number;
  pendingReportCount: number;
}): TherapistDashboardStatMetric[] {
  return [
    {
      id: "managed_users",
      label: "管理用户数",
      value: `${input.managedUserCount}`,
      helperText: "当前账号授权范围内的训练用户",
      tone: "blue"
    },
    {
      id: "today_due",
      label: "今日待训练",
      value: `${input.todayDueCount}`,
      helperText: "含待开始、训练中和暂停待跟进",
      tone: "teal"
    },
    {
      id: "completed_today",
      label: "今日已完成",
      value: `${input.completedTodayCount}`,
      helperText: "按今日训练状态统计",
      tone: "violet"
    },
    {
      id: "risk_alerts",
      label: "异常提醒",
      value: `${input.riskAlertCount}`,
      helperText: "用于训练安全和流程复核",
      tone: "orange"
    },
    {
      id: "average_completion",
      label: "平均完成率",
      value: `${input.averageCompletionRate}%`,
      helperText: "最近7日训练完成趋势",
      tone: "teal"
    },
    {
      id: "pending_reports",
      label: "待生成周报",
      value: `${input.pendingReportCount}`,
      helperText: "需要治疗师复核后进入报告中心",
      tone: "blue"
    }
  ];
}

function buildDashboardTodos(
  rows: TherapistDashboardUserRow[],
  riskAlerts: TherapistDashboardRiskAlert[],
  pendingReportCount: number
): TherapistDashboardTodo[] {
  const prescriptionTargets = rows.filter(
    (row) => row.trainingStatus === "no_plan" || row.riskLevel === "needs_review"
  );
  const deviceIssue = riskAlerts.find((alert) => alert.category === "device_signal");
  const comfortFeedback = riskAlerts.find((alert) => alert.category === "comfort_feedback");

  return [
    ...riskAlerts.slice(0, 2).map((alert) => ({
      id: `todo-risk-${alert.userId}`,
      title: `复核 ${alert.userDisplayName} 的训练提醒`,
      description: alert.message,
      actionType: "open_training_record" as const,
      userId: alert.userId,
      category: "risk" as const
    })),
    ...prescriptionTargets.slice(0, 2).map((row) => ({
      id: `todo-prescription-${row.id}`,
      title: `调整 ${row.displayName} 的训练处方`,
      description: "根据最近训练记录调整模块组合、难度起点或训练时长。",
      actionType: "create_prescription" as const,
      userId: row.id,
      category: "prescription" as const
    })),
    {
      id: "todo-weekly-report",
      title: "生成本周训练报告",
      description: `${pendingReportCount} 份周报等待复核和生成。`,
      actionType: "open_weekly_report" as const,
      category: "report" as const
    },
    ...(deviceIssue
      ? [
          {
            id: "todo-device-signal",
            title: "设备连接状态复核",
            description: `${deviceIssue.userDisplayName} 的设备信号曾出现波动，建议训练前确认佩戴。`,
            actionType: "open_training_record" as const,
            userId: deviceIssue.userId,
            category: "device" as const
          }
        ]
      : []),
    ...(comfortFeedback
      ? [
          {
            id: "todo-parent-feedback",
            title: "查看家长反馈提醒",
            description: `${comfortFeedback.userDisplayName} 有主观疲劳反馈，建议保留温和节奏。`,
            actionType: "open_training_record" as const,
            userId: comfortFeedback.userId,
            category: "feedback" as const
          }
        ]
      : []),
    {
      id: "todo-live-monitoring",
      title: "进入实时训练监测",
      description: "查看正在进行的训练会话、设备状态和阶段进度。",
      actionType: "open_live_monitoring" as const,
      category: "monitoring" as const
    }
  ];
}

function buildStatusDistribution(
  rows: TherapistDashboardUserRow[]
): Record<WorkspaceTrainingStatus, number> {
  return rows.reduce<Record<WorkspaceTrainingStatus, number>>(
    (summary, row) => ({
      ...summary,
      [row.trainingStatus]: summary[row.trainingStatus] + 1
    }),
    {
      scheduled_today: 0,
      in_progress: 0,
      completed_today: 0,
      paused: 0,
      no_plan: 0
    }
  );
}

function deriveModuleHeat(users: TherapistWorkspaceUser[]): TherapistDashboardModuleHeatPoint[] {
  const moduleMap = new Map<string, TherapistDashboardModuleHeatPoint>();

  users.forEach((user) => {
    normalizeModuleNames(user.todayPlan.moduleNames).forEach((moduleName) => {
      const current = moduleMap.get(moduleName) ?? {
        moduleName,
        completedCount: 0,
        plannedCount: 0
      };
      moduleMap.set(moduleName, {
        moduleName,
        plannedCount: current.plannedCount + 1,
        completedCount: current.completedCount + (user.trainingStatus === "completed_today" ? 1 : 0)
      });
    });
  });

  return Array.from(moduleMap.values()).sort((a, b) => b.plannedCount - a.plannedCount);
}

function deriveMusicTrend(
  trainingTrend: TherapistDashboardTrendPoint[]
): TherapistDashboardMusicTrendPoint[] {
  return trainingTrend.map((point, index) => ({
    dayLabel: point.dayLabel,
    suitabilityScore: clamp(point.averageCompletionRate - 6 + (index % 3) * 4)
  }));
}

function deriveEEGQuality(
  trend: TherapistDashboardEEGTrendPoint[],
  alerts: TherapistDashboardRiskAlert[]
): TherapistDashboardQualitySummary[] {
  const deviceAlerts = alerts.filter((alert) => alert.category === "device_signal").length;
  const fatigueAlerts = alerts.filter((alert) => alert.category === "fatigue_trend").length;
  const latestFatigue = trend.at(-1)?.fatigueScore ?? 35;
  const stableRatio = clamp(86 - deviceAlerts * 16 - Math.max(0, latestFatigue - 50) * 0.4);
  const watchRatio = clamp(100 - stableRatio - fatigueAlerts * 6);

  return [
    { label: "稳定信号", value: Math.round(stableRatio), tone: "good" },
    { label: "需复核佩戴", value: Math.max(0, deviceAlerts * 12), tone: "watch" },
    {
      label: "波动会话",
      value: Math.max(4, 100 - Math.round(stableRatio + watchRatio)),
      tone: "unstable"
    }
  ];
}

function buildPrescriptionLabel(user: TherapistWorkspaceUser): string {
  if (user.todayPlan.prescriptionStatus === "not_set") {
    return "待生成处方";
  }
  if (user.todayPlan.prescriptionStatus === "needs_update") {
    return "需调整处方";
  }
  if (user.todayPlan.moduleNames.length === 0) {
    return "处方待补充";
  }

  return `${normalizeModuleNames(user.todayPlan.moduleNames).length} 个模块 · ${user.todayPlan.plannedMinutes} 分钟`;
}

function buildAttentionTrendLabel(score: number): string {
  if (score >= 72) {
    return "稳定上行";
  }
  if (score >= 58) {
    return "基本稳定";
  }
  return "建议放缓观察";
}

function buildFatigueTrendLabel(score: number): string {
  if (score <= 40) {
    return "负荷平稳";
  }
  if (score <= 60) {
    return "轻度波动";
  }
  return "建议减量";
}

function normalizeModuleNames(moduleNames: string[]): string[] {
  return moduleNames.map(normalizeModuleName);
}

function normalizeModuleName(moduleName: string): string {
  if (moduleName.includes("Go/No-Go")) {
    return "Go/No-Go";
  }
  if (moduleName.includes("音乐")) {
    return "音乐疗愈";
  }
  if (moduleName.includes("注意") || moduleName.includes("目标探测")) {
    return "注意力训练";
  }
  if (moduleName.includes("节律")) {
    return "节律导航";
  }

  return moduleName;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
