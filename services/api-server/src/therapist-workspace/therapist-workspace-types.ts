import type { TrainingRecordType } from "../training-records/training-record-types.js";

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
  moduleHeat: TherapistDashboardModuleHeatPoint[];
  musicTrend: TherapistDashboardMusicTrendPoint[];
  eegQuality: TherapistDashboardQualitySummary[];
  pendingReportCount: number;
  parentFeedbackCount: number;
}

export type UserDetailRange = "week" | "month";
export type UserDetailTrainingType = TrainingRecordType;

export interface UserDetailBasicInfo {
  userId: string;
  userProfileId: string;
  displayName: string;
  ageRange: string;
  genderLabel: string;
  guardianConsentStatus: "confirmed" | "pending";
  boundTherapistName: string;
}

export interface UserTrainingGoalDetail {
  primaryGoal: string;
  focusAreas: string[];
  weeklyPlanLabel: string;
  safetyNote: string;
}

export interface BaselineAssessmentDetail {
  assessedAtLabel: string;
  attentionReferenceScore: number;
  averageReactionTimeMs: number;
  impulseControlReferenceScore: number;
  rhythmSyncReferenceScore: number;
  eegSignalQualityLabel: string;
  summary: string;
}

export interface TrainingRecordDetail {
  id: string;
  completedAtLabel: string;
  trainingType: UserDetailTrainingType;
  trainingTypeLabel: string;
  durationMinutes: number;
  completionStatusLabel: string;
  accuracyRate: number;
  averageReactionTimeMs: number;
  falseAlarmRate: number;
  omissionRate: number;
  eegAttentionIndex: number;
  eegRelaxationIndex: number;
  eegFatigueIndex: number;
  difficultyLabel: string;
  note: string;
}

export interface TrendPoint {
  label: string;
  attentionStabilityScore: number;
  averageReactionTimeMs: number;
  falseAlarmRate: number;
  omissionRate: number;
  eegAttentionIndex: number;
  eegRelaxationIndex: number;
  eegFatigueIndex: number;
}

export interface MusicAdaptationDetail {
  id: string;
  trackTitle: string;
  usedAtLabel: string;
  suitabilityScore: number;
  recommendationLabel: string;
  userFeedbackLabel: string;
  nextSuggestion: string;
}

export interface TherapistNoteDetail {
  id: string;
  createdAtLabel: string;
  authorName: string;
  content: string;
  visibilityLabel: "治疗师可见";
}

export interface UserDetailSourceRecord {
  userId: string;
  basicInfo: Omit<UserDetailBasicInfo, "userId" | "userProfileId" | "displayName" | "ageRange">;
  trainingGoal: UserTrainingGoalDetail;
  baselineAssessment: BaselineAssessmentDetail;
  recentTrainingRecords: TrainingRecordDetail[];
  weeklyTrendPoints: TrendPoint[];
  monthlyTrendPoints: TrendPoint[];
  musicAdaptations: MusicAdaptationDetail[];
  therapistNotes: TherapistNoteDetail[];
}

export interface TherapistWorkspaceSnapshot {
  users: TherapistWorkspaceUser[];
  dashboardSupplement: TherapistDashboardSupplement;
  detailRecords: UserDetailSourceRecord[];
  generatedAt: string;
  dataScopeNotice: string;
}

export interface TherapistUserDetailSnapshot {
  user: TherapistWorkspaceUser;
  detailRecord: UserDetailSourceRecord;
  generatedAt: string;
  dataScopeNotice: string;
}

export interface TherapistWorkspaceApiResponse<TBody = unknown> {
  status: number;
  body: TBody;
}
