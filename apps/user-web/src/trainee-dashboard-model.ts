export type TraineeDashboardDeviceConnection = "connected" | "connecting" | "disconnected";

export type TraineeDashboardSignalQuality = "good" | "unstable" | "offline";

export type TraineeDashboardTaskStatus = "ready" | "completed" | "waiting";

export interface TraineeDashboardTask {
  id: string;
  title: string;
  moduleName: string;
  durationMinutes: number;
  difficultyLabel: "轻量" | "标准" | "进阶";
  focusArea: string;
  therapistNote: string;
  status: TraineeDashboardTaskStatus;
}

export interface TraineeDashboardDeviceStatus {
  connectionStatus: TraineeDashboardDeviceConnection;
  signalQuality: TraineeDashboardSignalQuality;
  attentionScore: number | null;
  relaxationScore: number | null;
  fatigueScore: number | null;
  latencyMs: number | null;
}

export interface TraineeDashboardMusicRecommendation {
  title: string;
  tagLabel: string;
  durationMinutes: number;
  bpm: number;
  intensityLabel: string;
  recommendedScene: string;
}

export interface TraineeDashboardWeekDay {
  dayLabel: string;
  completedMinutes: number;
  plannedMinutes: number;
  attentionStabilityScore: number | null;
}

export interface TraineeDashboardWeeklyProgress {
  completedSessions: number;
  plannedSessions: number;
  completedMinutes: number;
  targetMinutes: number;
  streakDays: number;
  days: TraineeDashboardWeekDay[];
}

export interface TraineeDashboardTrendPoint {
  dayLabel: string;
  attentionStabilityScore: number;
  reactionConsistencyScore: number;
}

export interface TraineeDashboardLastFeedback {
  moduleName: string;
  completedAtLabel: string;
  completionLabel: string;
  summary: string;
  nextSuggestion: string;
}

export interface TraineeDashboardTherapistMessage {
  therapistName: string;
  sentAtLabel: string;
  message: string;
}

export interface TraineeDashboardSafetyTip {
  id: string;
  title: string;
  message: string;
}

export interface TraineeDashboardData {
  traineeName: string;
  statusSummary: string;
  todayTasks: TraineeDashboardTask[];
  deviceStatus: TraineeDashboardDeviceStatus;
  recommendedMusic: TraineeDashboardMusicRecommendation;
  weeklyProgress: TraineeDashboardWeeklyProgress;
  attentionTrend: TraineeDashboardTrendPoint[];
  lastFeedback: TraineeDashboardLastFeedback | null;
  therapistMessage: TraineeDashboardTherapistMessage | null;
  safetyTips: TraineeDashboardSafetyTip[];
  restReminder: string;
}

export interface TraineeDashboardStartState {
  canStart: boolean;
  reason: string | null;
}

export interface TraineeDashboardViewModel extends TraineeDashboardData {
  totalPlannedMinutes: number;
  completedTaskCount: number;
  weeklyCompletionRate: number;
  minuteCompletionRate: number;
  startState: TraineeDashboardStartState;
  primaryTask: TraineeDashboardTask | null;
}

export class TraineeDashboardModelError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TraineeDashboardModelError";
  }
}

export function buildTraineeDashboardViewModel(
  data: TraineeDashboardData
): TraineeDashboardViewModel {
  validateTraineeDashboardData(data);

  const primaryTask = data.todayTasks.find((task) => task.status === "ready") ?? null;
  const totalPlannedMinutes = data.todayTasks.reduce((sum, task) => sum + task.durationMinutes, 0);
  const completedTaskCount = data.todayTasks.filter((task) => task.status === "completed").length;
  const weeklyCompletionRate = calculateRate(
    data.weeklyProgress.completedSessions,
    data.weeklyProgress.plannedSessions
  );
  const minuteCompletionRate = calculateRate(
    data.weeklyProgress.completedMinutes,
    data.weeklyProgress.targetMinutes
  );

  return {
    ...data,
    totalPlannedMinutes,
    completedTaskCount,
    weeklyCompletionRate,
    minuteCompletionRate,
    startState: resolveTraineeDashboardStartState(data),
    primaryTask
  };
}

export function resolveTraineeDashboardStartState(
  data: Pick<TraineeDashboardData, "deviceStatus" | "todayTasks">
): TraineeDashboardStartState {
  if (data.todayTasks.length === 0) {
    return {
      canStart: false,
      reason: "治疗师尚未配置今日训练任务。"
    };
  }

  if (!data.todayTasks.some((task) => task.status === "ready")) {
    return {
      canStart: false,
      reason: "今日训练任务已完成或暂未到开始时间。"
    };
  }

  if (data.deviceStatus.connectionStatus === "disconnected") {
    return {
      canStart: false,
      reason: "请先连接 EEG 设备，再开始训练。"
    };
  }

  if (data.deviceStatus.signalQuality === "offline") {
    return {
      canStart: false,
      reason: "暂未收到设备数据，请检查佩戴和连接状态。"
    };
  }

  return {
    canStart: true,
    reason: null
  };
}

export function calculateRate(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total)) {
    throw new TraineeDashboardModelError("Progress values must be finite numbers.");
  }
  if (value < 0 || total < 0) {
    throw new TraineeDashboardModelError("Progress values cannot be negative.");
  }
  if (total === 0) {
    return 0;
  }

  return Math.min(100, Math.round((value / total) * 100));
}

function validateTraineeDashboardData(data: TraineeDashboardData): void {
  if (data.traineeName.trim().length === 0) {
    throw new TraineeDashboardModelError("traineeName is required.");
  }

  for (const task of data.todayTasks) {
    if (task.title.trim().length === 0 || task.moduleName.trim().length === 0) {
      throw new TraineeDashboardModelError("Task title and moduleName are required.");
    }
    if (task.durationMinutes <= 0) {
      throw new TraineeDashboardModelError("Task durationMinutes must be greater than 0.");
    }
  }

  if (data.weeklyProgress.days.length > 7) {
    throw new TraineeDashboardModelError("Weekly progress supports at most recent 7 days.");
  }
}
