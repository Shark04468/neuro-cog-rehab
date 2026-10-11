export type TherapistWorkspaceRole = "therapist" | "org_admin" | "system_admin";

export type WorkspaceTrainingStatus =
  | "scheduled_today"
  | "in_progress"
  | "completed_today"
  | "paused"
  | "no_plan";

export type WorkspaceRiskLevel = "none" | "watch" | "needs_review";

export type WorkspaceRiskCategory =
  | "none"
  | "device_signal"
  | "fatigue_trend"
  | "comfort_feedback"
  | "adherence";

export type WorkspaceTrainingStatusFilter = WorkspaceTrainingStatus | "all";
export type WorkspaceRiskFilter = WorkspaceRiskLevel | "has_reminder" | "all";

export interface TherapistWorkspacePrincipal {
  userId: string;
  therapistId: string;
  organizationId: string;
  roles: TherapistWorkspaceRole[];
}

export interface WorkspaceTodayPlan {
  moduleNames: string[];
  plannedMinutes: number;
  prescriptionStatus: "ready" | "needs_update" | "not_set";
}

export interface WorkspaceLastSession {
  completedAtLabel: string;
  moduleName: string;
  durationMinutes: number;
  completionStatus: "completed" | "partial" | "paused";
  note: string;
}

export interface WorkspaceComplianceSummary {
  plannedSessions7d: number;
  completedSessions7d: number;
  missedSessions7d: number;
  completionRate: number;
  streakDays: number;
}

export interface WorkspaceRiskReminder {
  level: WorkspaceRiskLevel;
  category: WorkspaceRiskCategory;
  message: string;
  occurredAtLabel: string;
}

export interface TherapistWorkspaceUser {
  id: string;
  userProfileId: string;
  displayName: string;
  ageRange: string;
  organizationId: string;
  boundTherapistIds: string[];
  trainingStatus: WorkspaceTrainingStatus;
  todayPlan: WorkspaceTodayPlan;
  lastSession: WorkspaceLastSession | null;
  compliance: WorkspaceComplianceSummary;
  riskReminder: WorkspaceRiskReminder;
}

export interface TherapistWorkspaceFilters {
  trainingStatus: WorkspaceTrainingStatusFilter;
  risk: WorkspaceRiskFilter;
}

export interface TherapistWorkspaceUserRow extends TherapistWorkspaceUser {
  trainingStatusLabel: string;
  riskLabel: string;
  complianceLabel: string;
  nextActionLabel: string;
}

export interface TherapistWorkspaceAlert {
  userId: string;
  userProfileId: string;
  displayName: string;
  level: WorkspaceRiskLevel;
  category: WorkspaceRiskCategory;
  message: string;
  occurredAtLabel: string;
}

export interface TherapistWorkspaceSummaryCard {
  id: "today_due" | "attention_needed" | "recent_completed" | "adherence";
  label: string;
  value: string;
  helperText: string;
}

export interface TherapistWorkspaceViewModel {
  therapistName: string;
  filters: TherapistWorkspaceFilters;
  accessibleUserCount: number;
  filteredUserCount: number;
  summaryCards: TherapistWorkspaceSummaryCard[];
  todayDueUsers: TherapistWorkspaceUserRow[];
  alerts: TherapistWorkspaceAlert[];
  recentCompletions: TherapistWorkspaceUserRow[];
  userRows: TherapistWorkspaceUserRow[];
}

export type TherapistWorkspaceActionType = "open_user_detail" | "generate_prescription";

export interface TherapistWorkspaceAction {
  type: TherapistWorkspaceActionType;
  userId: string;
  userProfileId: string;
  label: string;
  auditMessage: string;
}

export class TherapistWorkspaceAccessError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TherapistWorkspaceAccessError";
  }
}

export const TRAINING_STATUS_LABELS: Record<WorkspaceTrainingStatusFilter, string> = {
  all: "全部训练状态",
  scheduled_today: "今日待训练",
  in_progress: "训练中",
  completed_today: "今日已完成",
  paused: "暂停待跟进",
  no_plan: "未安排"
};

export const RISK_FILTER_LABELS: Record<WorkspaceRiskFilter, string> = {
  all: "全部提醒",
  has_reminder: "有关注提醒",
  none: "暂无提醒",
  watch: "观察提醒",
  needs_review: "需要复核"
};

export function buildTherapistWorkspaceViewModel(input: {
  principal: TherapistWorkspacePrincipal;
  therapistName: string;
  users: TherapistWorkspaceUser[];
  filters: TherapistWorkspaceFilters;
}): TherapistWorkspaceViewModel {
  assertValidPrincipal(input.principal);

  const accessibleUsers = input.users.filter((user) =>
    canPrincipalAccessWorkspaceUser(input.principal, user)
  );
  const filteredUsers = accessibleUsers.filter((user) => matchesFilters(user, input.filters));
  const accessibleRows = accessibleUsers.map(buildUserRow);
  const userRows = filteredUsers.map(buildUserRow);

  return {
    therapistName: input.therapistName,
    filters: input.filters,
    accessibleUserCount: accessibleRows.length,
    filteredUserCount: userRows.length,
    summaryCards: buildSummaryCards(accessibleRows),
    todayDueUsers: accessibleRows.filter((user) =>
      ["scheduled_today", "in_progress", "paused"].includes(user.trainingStatus)
    ),
    alerts: buildAlerts(accessibleRows),
    recentCompletions: accessibleRows.filter((user) => user.lastSession !== null).slice(0, 4),
    userRows
  };
}

export function buildTherapistWorkspaceAction(input: {
  principal: TherapistWorkspacePrincipal;
  users: TherapistWorkspaceUser[];
  userId: string;
  actionType: TherapistWorkspaceActionType;
}): TherapistWorkspaceAction {
  assertValidPrincipal(input.principal);

  const user = input.users.find((candidate) => candidate.id === input.userId);
  if (!user || !canPrincipalAccessWorkspaceUser(input.principal, user)) {
    throw new TherapistWorkspaceAccessError("Current principal cannot access this training user.");
  }

  if (input.actionType === "open_user_detail") {
    return {
      type: input.actionType,
      userId: user.id,
      userProfileId: user.userProfileId,
      label: `进入 ${user.displayName} 的训练详情`,
      auditMessage: "Authorized therapist opened a training detail entry."
    };
  }

  return {
    type: input.actionType,
    userId: user.id,
    userProfileId: user.userProfileId,
    label: `为 ${user.displayName} 生成训练处方草稿`,
    auditMessage: "Authorized therapist opened a training prescription draft entry."
  };
}

function assertValidPrincipal(principal: TherapistWorkspacePrincipal): void {
  if (!principal.userId || !principal.therapistId || !principal.organizationId) {
    throw new TherapistWorkspaceAccessError("Principal identity scope is incomplete.");
  }
  if (
    !principal.roles.includes("therapist") &&
    !principal.roles.includes("org_admin") &&
    !principal.roles.includes("system_admin")
  ) {
    throw new TherapistWorkspaceAccessError("Principal role cannot access therapist workspace.");
  }
}

export function canPrincipalAccessWorkspaceUser(
  principal: TherapistWorkspacePrincipal,
  user: TherapistWorkspaceUser
): boolean {
  if (principal.roles.includes("system_admin")) {
    return true;
  }

  if (user.organizationId !== principal.organizationId) {
    return false;
  }

  if (principal.roles.includes("org_admin")) {
    return true;
  }

  return user.boundTherapistIds.includes(principal.therapistId);
}

function matchesFilters(user: TherapistWorkspaceUser, filters: TherapistWorkspaceFilters): boolean {
  const matchesTrainingStatus =
    filters.trainingStatus === "all" || user.trainingStatus === filters.trainingStatus;
  const matchesRisk =
    filters.risk === "all" ||
    (filters.risk === "has_reminder" && user.riskReminder.level !== "none") ||
    user.riskReminder.level === filters.risk;

  return matchesTrainingStatus && matchesRisk;
}

function buildUserRow(user: TherapistWorkspaceUser): TherapistWorkspaceUserRow {
  return {
    ...user,
    trainingStatusLabel: TRAINING_STATUS_LABELS[user.trainingStatus],
    riskLabel: buildRiskLabel(user.riskReminder),
    complianceLabel: `${Math.round(user.compliance.completionRate * 100)}% / 连续 ${
      user.compliance.streakDays
    } 天`,
    nextActionLabel: buildNextActionLabel(user)
  };
}

function buildSummaryCards(rows: TherapistWorkspaceUserRow[]): TherapistWorkspaceSummaryCard[] {
  const todayDueCount = rows.filter((row) =>
    ["scheduled_today", "in_progress", "paused"].includes(row.trainingStatus)
  ).length;
  const attentionNeededCount = rows.filter((row) => row.riskReminder.level !== "none").length;
  const recentCompletedCount = rows.filter(
    (row) => row.trainingStatus === "completed_today"
  ).length;
  const averageAdherence =
    rows.length === 0
      ? 0
      : rows.reduce((sum, row) => sum + row.compliance.completionRate, 0) / rows.length;

  return [
    {
      id: "today_due",
      label: "今日待训练用户",
      value: `${todayDueCount}`,
      helperText: "含待开始、训练中和暂停待跟进用户"
    },
    {
      id: "attention_needed",
      label: "需要关注提醒",
      value: `${attentionNeededCount}`,
      helperText: "用于训练安全和流程跟进"
    },
    {
      id: "recent_completed",
      label: "今日已完成",
      value: `${recentCompletedCount}`,
      helperText: "按训练记录状态统计"
    },
    {
      id: "adherence",
      label: "7日依从性概览",
      value: `${Math.round(averageAdherence * 100)}%`,
      helperText: "完成次数 / 计划次数"
    }
  ];
}

function buildAlerts(rows: TherapistWorkspaceUserRow[]): TherapistWorkspaceAlert[] {
  return rows
    .filter((row) => row.riskReminder.level !== "none")
    .map((row) => ({
      userId: row.id,
      userProfileId: row.userProfileId,
      displayName: row.displayName,
      level: row.riskReminder.level,
      category: row.riskReminder.category,
      message: row.riskReminder.message,
      occurredAtLabel: row.riskReminder.occurredAtLabel
    }));
}

function buildRiskLabel(reminder: WorkspaceRiskReminder): string {
  if (reminder.level === "none") {
    return "暂无提醒";
  }

  return reminder.level === "needs_review" ? "需要复核" : "观察提醒";
}

function buildNextActionLabel(user: TherapistWorkspaceUser): string {
  if (user.todayPlan.prescriptionStatus === "needs_update") {
    return "更新训练处方";
  }
  if (user.trainingStatus === "no_plan") {
    return "生成训练处方";
  }
  return "查看训练详情";
}
