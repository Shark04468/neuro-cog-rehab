import {
  canPrincipalAccessWorkspaceUser,
  type TherapistWorkspacePrincipal,
  type TherapistWorkspaceUser
} from "./therapist-workspace-model.js";

export type UserDetailRange = "week" | "month";

export type UserDetailTrainingType =
  | "baseline_assessment"
  | "music_therapy"
  | "attention_game"
  | "go_nogo_game"
  | "rhythm_navigation"
  | "mixed_session";

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

export interface LineChartSeries {
  name: string;
  values: number[];
}

export interface UserTrendChart {
  title: string;
  yAxisLabel: string;
  labels: string[];
  series: LineChartSeries[];
}

export interface TherapistUserDetailViewModel {
  range: UserDetailRange;
  basicInfo: UserDetailBasicInfo;
  trainingGoal: UserTrainingGoalDetail;
  baselineAssessment: BaselineAssessmentDetail;
  recentTrainingRecords: TrainingRecordDetail[];
  selectedTrainingRecord: TrainingRecordDetail;
  attentionTrendChart: UserTrendChart;
  reactionTimeTrendChart: UserTrendChart;
  responseErrorTrendChart: UserTrendChart;
  eegTrendChart: UserTrendChart;
  musicAdaptations: MusicAdaptationDetail[];
  therapistNotes: TherapistNoteDetail[];
}

export interface WeeklyReportDraft {
  id: string;
  userId: string;
  userProfileId: string;
  generatedAt: string;
  periodLabel: string;
  dataSensitivity: "sensitive";
  summary: string;
  keyObservations: string[];
  nextWeekSuggestions: string[];
}

export class TherapistUserDetailError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TherapistUserDetailError";
  }
}

export function buildTherapistUserDetailViewModel(input: {
  principal: TherapistWorkspacePrincipal;
  users: TherapistWorkspaceUser[];
  detailRecords: UserDetailSourceRecord[];
  userId: string;
  range: UserDetailRange;
  selectedTrainingRecordId?: string;
}): TherapistUserDetailViewModel {
  const user = findAuthorizedUser(input.principal, input.users, input.userId);
  const detail = findDetailRecord(input.detailRecords, input.userId);
  const selectedTrainingRecord =
    detail.recentTrainingRecords.find((record) => record.id === input.selectedTrainingRecordId) ??
    detail.recentTrainingRecords[0];

  if (!selectedTrainingRecord) {
    throw new TherapistUserDetailError("At least one training record is required.");
  }

  const trendPoints = input.range === "week" ? detail.weeklyTrendPoints : detail.monthlyTrendPoints;

  return {
    range: input.range,
    basicInfo: {
      userId: user.id,
      userProfileId: user.userProfileId,
      displayName: user.displayName,
      ageRange: user.ageRange,
      ...detail.basicInfo
    },
    trainingGoal: detail.trainingGoal,
    baselineAssessment: detail.baselineAssessment,
    recentTrainingRecords: [...detail.recentTrainingRecords],
    selectedTrainingRecord,
    attentionTrendChart: buildAttentionTrendChart(trendPoints),
    reactionTimeTrendChart: buildReactionTimeTrendChart(trendPoints),
    responseErrorTrendChart: buildResponseErrorTrendChart(trendPoints),
    eegTrendChart: buildEegTrendChart(trendPoints),
    musicAdaptations: [...detail.musicAdaptations],
    therapistNotes: [...detail.therapistNotes]
  };
}

export function buildWeeklyReportDraft(input: {
  principal: TherapistWorkspacePrincipal;
  users: TherapistWorkspaceUser[];
  detailRecords: UserDetailSourceRecord[];
  userId: string;
  now?: Date;
}): WeeklyReportDraft {
  const detailView = buildTherapistUserDetailViewModel({
    principal: input.principal,
    users: input.users,
    detailRecords: input.detailRecords,
    userId: input.userId,
    range: "week"
  });
  const now = input.now ?? new Date();
  const latestRecord = detailView.recentTrainingRecords[0];

  return {
    id: `weekly-report-${detailView.basicInfo.userId}-${now.getTime()}`,
    userId: detailView.basicInfo.userId,
    userProfileId: detailView.basicInfo.userProfileId,
    generatedAt: now.toISOString(),
    periodLabel: "最近7天",
    dataSensitivity: "sensitive",
    summary: `${detailView.basicInfo.displayName} 最近7天完成记录已汇总，内容用于训练回顾和下周安排。`,
    keyObservations: [
      `训练目标：${detailView.trainingGoal.primaryGoal}`,
      `最近记录：${latestRecord?.trainingTypeLabel ?? "暂无训练模块"}，${
        latestRecord?.completionStatusLabel ?? "暂无状态"
      }`,
      `基线参考：注意 ${detailView.baselineAssessment.attentionReferenceScore}/100，平均反应时 ${detailView.baselineAssessment.averageReactionTimeMs}ms`
    ],
    nextWeekSuggestions: [
      "保持短时、稳定、可休息的训练节奏。",
      "优先关注漏按、误按和反应时波动的趋势变化。",
      "如训练中出现不适反馈，先暂停并调整为低强度任务或放松音乐。"
    ]
  };
}

function findAuthorizedUser(
  principal: TherapistWorkspacePrincipal,
  users: TherapistWorkspaceUser[],
  userId: string
): TherapistWorkspaceUser {
  const user = users.find((candidate) => candidate.id === userId);
  if (!user || !canPrincipalAccessWorkspaceUser(principal, user)) {
    throw new TherapistUserDetailError("Current principal cannot access this training user.");
  }

  return user;
}

function findDetailRecord(
  detailRecords: UserDetailSourceRecord[],
  userId: string
): UserDetailSourceRecord {
  const detail = detailRecords.find((candidate) => candidate.userId === userId);
  if (!detail) {
    throw new TherapistUserDetailError("User detail record was not found.");
  }

  return detail;
}

function buildAttentionTrendChart(points: TrendPoint[]): UserTrendChart {
  return {
    title: "注意力趋势",
    yAxisLabel: "参考分",
    labels: points.map((point) => point.label),
    series: [
      {
        name: "注意稳定性",
        values: points.map((point) => point.attentionStabilityScore)
      }
    ]
  };
}

function buildReactionTimeTrendChart(points: TrendPoint[]): UserTrendChart {
  return {
    title: "反应时趋势",
    yAxisLabel: "毫秒",
    labels: points.map((point) => point.label),
    series: [
      {
        name: "平均反应时",
        values: points.map((point) => point.averageReactionTimeMs)
      }
    ]
  };
}

function buildResponseErrorTrendChart(points: TrendPoint[]): UserTrendChart {
  return {
    title: "误按率和漏按率趋势",
    yAxisLabel: "比例",
    labels: points.map((point) => point.label),
    series: [
      {
        name: "误按率",
        values: points.map((point) => roundRate(point.falseAlarmRate))
      },
      {
        name: "漏按率",
        values: points.map((point) => roundRate(point.omissionRate))
      }
    ]
  };
}

function buildEegTrendChart(points: TrendPoint[]): UserTrendChart {
  return {
    title: "EEG状态趋势",
    yAxisLabel: "参考指数",
    labels: points.map((point) => point.label),
    series: [
      {
        name: "注意指数",
        values: points.map((point) => point.eegAttentionIndex)
      },
      {
        name: "放松指数",
        values: points.map((point) => point.eegRelaxationIndex)
      },
      {
        name: "疲劳指数",
        values: points.map((point) => point.eegFatigueIndex)
      }
    ]
  };
}

function roundRate(rate: number): number {
  return Math.round(rate * 100);
}
