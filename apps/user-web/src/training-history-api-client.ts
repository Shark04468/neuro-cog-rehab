import type {
  TraineeDashboardData,
  TraineeDashboardLastFeedback,
  TraineeDashboardTrendPoint,
  TraineeDashboardWeekDay
} from "./trainee-dashboard-model.js";
import type { TrainingRecordApiSession } from "./training-record-api-client.js";

export interface TrainingHistoryApiOptions {
  now?: Date;
  fetcher?: typeof fetch;
}

interface TrainingRecordListResponse {
  records: ApiTrainingRecord[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

interface ApiTrainingRecord {
  id: string;
  userId: string;
  userProfileId: string;
  organizationId?: string;
  trainingType:
    | "baseline_assessment"
    | "music_therapy"
    | "attention_game"
    | "go_nogo_game"
    | "rhythm_navigation"
    | "mixed_session";
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  behaviorMetrics: {
    totalTrials?: number;
    correctCount?: number;
    accuracyRate?: number;
    averageReactionTimeMs?: number;
    omissionCount?: number;
    falseAlarmCount?: number;
    customMetrics?: Record<string, unknown>;
  };
  eegSummaryMetrics: {
    averageAttentionIndex?: number;
    averageRelaxationIndex?: number;
    validSampleRate?: number;
    artifactCount?: number;
    frameCount?: number;
    qualityStatus?: "good" | "unstable" | "noisy" | "disconnected";
  };
  completionStatus: "completed" | "partial" | "abandoned" | "interrupted";
  createdAt: string;
}

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export class TrainingHistoryApiClientError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TrainingHistoryApiClientError";
  }
}

/**
 * Reads authorized training records and adapts them into the existing user
 * cockpit data model. It uses saved summaries only and never expects raw EEG.
 */
export async function fetchDashboardDataWithTrainingHistory(
  baseData: TraineeDashboardData,
  session: TrainingRecordApiSession,
  options: TrainingHistoryApiOptions = {}
): Promise<TraineeDashboardData> {
  validateHistorySession(session);
  const now = options.now ?? new Date();
  const historyOptions: TrainingHistoryApiOptions = { now };
  if (options.fetcher !== undefined) {
    historyOptions.fetcher = options.fetcher;
  }
  const records = await fetchTrainingHistoryRecords(session, historyOptions);
  return applyTrainingHistoryToDashboardData(baseData, records, now);
}

export async function fetchTrainingHistoryRecords(
  session: TrainingRecordApiSession,
  options: TrainingHistoryApiOptions = {}
): Promise<ApiTrainingRecord[]> {
  validateHistorySession(session);
  const now = options.now ?? new Date();
  const fetcher = options.fetcher ?? fetch;
  const apiBaseUrl = session.apiBaseUrl.replace(/\/+$/, "");
  const url = new URL(`${apiBaseUrl}/training-records`);
  url.searchParams.set("userProfileId", session.userProfileId);
  url.searchParams.set("startedFrom", startOfRecentSevenDays(now).toISOString());
  url.searchParams.set("startedTo", now.toISOString());
  url.searchParams.set("page", "1");
  url.searchParams.set("pageSize", "100");

  let response: Response;
  try {
    response = await fetcher(url.toString(), {
      method: "GET",
      headers: {
        authorization: `Bearer ${session.accessToken}`
      }
    });
  } catch {
    throw new TrainingHistoryApiClientError("训练历史接口暂时不可用，请稍后重试。");
  }

  const body = await readJsonResponse(response);
  if (!response.ok) {
    throw new TrainingHistoryApiClientError(extractApiErrorMessage(body));
  }

  return (body as TrainingRecordListResponse).records ?? [];
}

export function applyTrainingHistoryToDashboardData(
  baseData: TraineeDashboardData,
  records: ApiTrainingRecord[],
  now: Date = new Date()
): TraineeDashboardData {
  if (records.length === 0) {
    return baseData;
  }

  const recentDays = buildRecentDayBuckets(now, baseData.weeklyProgress.days);
  const completedRecords = records.filter((record) => record.completionStatus === "completed");
  for (const record of completedRecords) {
    const dayKey = toDateKey(record.startedAt);
    const bucket = recentDays.find((day) => day.dateKey === dayKey);
    if (!bucket) {
      continue;
    }
    bucket.completedMinutes += Math.round(record.durationSeconds / 60);
    const attentionScore = readAttentionScore(record);
    if (attentionScore !== null) {
      bucket.attentionValues.push(attentionScore);
    }
  }

  const days: TraineeDashboardWeekDay[] = recentDays.map((day) => ({
    dayLabel: day.dayLabel,
    completedMinutes: day.completedMinutes,
    plannedMinutes: day.plannedMinutes,
    attentionStabilityScore: averageNullable(day.attentionValues)
  }));
  const completedMinutes = days.reduce((sum, day) => sum + day.completedMinutes, 0);
  const completedSessions = completedRecords.length;
  const lastRecord = [...records].sort(
    (left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt)
  )[0];

  return {
    ...baseData,
    statusSummary: `已读取授权训练历史，本周已保存 ${completedSessions} 条训练记录。`,
    weeklyProgress: {
      ...baseData.weeklyProgress,
      completedSessions,
      plannedSessions: Math.max(baseData.weeklyProgress.plannedSessions, completedSessions),
      completedMinutes,
      days,
      streakDays: calculateStreakDays(days)
    },
    attentionTrend: buildAttentionTrend(days, baseData.attentionTrend),
    lastFeedback: lastRecord ? toLastFeedback(lastRecord) : baseData.lastFeedback
  };
}

function buildRecentDayBuckets(
  now: Date,
  baseDays: readonly TraineeDashboardWeekDay[]
): Array<{
  dateKey: string;
  dayLabel: string;
  completedMinutes: number;
  plannedMinutes: number;
  attentionValues: number[];
}> {
  const start = startOfRecentSevenDays(now);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
    const fallbackDay = baseDays[index];
    return {
      dateKey: toDateKey(date.toISOString()),
      dayLabel: index === 6 ? "今天" : weekdayLabel(date),
      completedMinutes: 0,
      plannedMinutes: fallbackDay?.plannedMinutes ?? 0,
      attentionValues: []
    };
  });
}

function buildAttentionTrend(
  days: readonly TraineeDashboardWeekDay[],
  fallbackTrend: readonly TraineeDashboardTrendPoint[]
): TraineeDashboardTrendPoint[] {
  return days.map((day, index) => {
    const fallback = fallbackTrend[index];
    const attention = day.attentionStabilityScore ?? fallback?.attentionStabilityScore ?? 0;
    return {
      dayLabel: day.dayLabel,
      attentionStabilityScore: attention,
      reactionConsistencyScore: fallback?.reactionConsistencyScore ?? attention
    };
  });
}

function toLastFeedback(record: ApiTrainingRecord): TraineeDashboardLastFeedback {
  return {
    moduleName: trainingTypeLabel(record.trainingType),
    completedAtLabel: formatCompletedAt(record.endedAt),
    completionLabel: completionLabel(record.completionStatus),
    summary: buildRecordSummary(record),
    nextSuggestion: buildNextSuggestion(record)
  };
}

function buildRecordSummary(record: ApiTrainingRecord): string {
  const accuracy = record.behaviorMetrics.accuracyRate;
  const attention = readAttentionScore(record);
  const fragments = [`${trainingTypeLabel(record.trainingType)}记录已保存`];
  if (typeof accuracy === "number" && Number.isFinite(accuracy)) {
    fragments.push(`正确率约 ${Math.round(accuracy * 100)}%`);
  }
  if (attention !== null) {
    fragments.push(`注意状态摘要 ${attention}/100`);
  }
  return `${fragments.join("，")}。`;
}

function buildNextSuggestion(record: ApiTrainingRecord): string {
  if (record.eegSummaryMetrics.qualityStatus === "noisy") {
    return "下次训练前建议先复核设备佩戴和信号状态。";
  }
  if (
    record.behaviorMetrics.falseAlarmCount !== undefined &&
    record.behaviorMetrics.falseAlarmCount > 3
  ) {
    return "下次可先降低干扰强度，保持看清提示再点击。";
  }
  return "下次可从相近难度继续，保持短时稳定训练节奏。";
}

function trainingTypeLabel(type: ApiTrainingRecord["trainingType"]): string {
  switch (type) {
    case "baseline_assessment":
      return "基线评估";
    case "music_therapy":
      return "音乐疗愈";
    case "attention_game":
      return "注意力训练";
    case "go_nogo_game":
      return "Go/No-Go 点击反应";
    case "rhythm_navigation":
      return "节律导航";
    case "mixed_session":
      return "综合训练流程";
  }
}

function completionLabel(status: ApiTrainingRecord["completionStatus"]): string {
  switch (status) {
    case "completed":
      return "已完成";
    case "partial":
      return "部分完成";
    case "abandoned":
      return "已提前结束";
    case "interrupted":
      return "训练中断";
  }
}

function readAttentionScore(record: ApiTrainingRecord): number | null {
  const eegAttention = record.eegSummaryMetrics.averageAttentionIndex;
  if (typeof eegAttention === "number" && Number.isFinite(eegAttention)) {
    return clampScore(eegAttention);
  }
  const customAttention = record.behaviorMetrics.customMetrics?.attentionStabilityScore;
  if (typeof customAttention === "number" && Number.isFinite(customAttention)) {
    return clampScore(customAttention);
  }
  return null;
}

function averageNullable(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return clampScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function calculateStreakDays(days: readonly TraineeDashboardWeekDay[]): number {
  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const day = days[index];
    if (!day || day.completedMinutes <= 0) {
      break;
    }
    streak += 1;
  }
  return streak;
}

function startOfRecentSevenDays(now: Date): Date {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - 6);
  return start;
}

function weekdayLabel(date: Date): string {
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getUTCDay()] ?? "本日";
}

function toDateKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function formatCompletedAt(value: string): string {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(
    2,
    "0"
  )}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function readJsonResponse(response: Response): Promise<unknown> {
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

function validateHistorySession(session: TrainingRecordApiSession): void {
  if (session.apiBaseUrl.trim().length === 0 || session.accessToken.trim().length === 0) {
    throw new TrainingHistoryApiClientError("训练历史查询需要有效 API 登录状态。");
  }
  if (session.userProfileId.trim().length === 0) {
    throw new TrainingHistoryApiClientError("缺少训练档案授权范围，无法查询训练历史。");
  }
}

function extractApiErrorMessage(body: unknown): string {
  const candidate = body as ApiErrorBody;
  return candidate.error?.message ?? "训练历史读取失败，请稍后重试。";
}
