export type HomeTrainingTaskType =
  | "music_therapy"
  | "attention_game"
  | "go_nogo_game"
  | "rhythm_navigation";

export type HomeDeviceConnectionStatus = "connected" | "connecting" | "disconnected";

export type HomeSignalQuality = "good" | "unstable" | "offline";

export interface TherapistConfiguredTask {
  id: string;
  taskType: HomeTrainingTaskType;
  title: string;
  durationMinutes: number;
  difficultyLabel: "轻量" | "标准" | "进阶";
  focusArea: string;
  therapistNote: string;
  isPrimary?: boolean;
}

export interface HomeRecommendedMusic {
  title: string;
  scene: string;
  durationMinutes: number;
  intensityLabel: "低强度" | "中等强度";
}

export interface HomeDeviceStatus {
  connectionStatus: HomeDeviceConnectionStatus;
  signalQuality: HomeSignalQuality;
  attentionScore: number | null;
  relaxationScore: number | null;
  fatigueTrendLabel: "平稳" | "略高" | "需要休息";
  latencyMs: number | null;
}

export interface HomeLastTrainingSummary {
  moduleName: string;
  completedAtLabel: string;
  summary: string;
  nextSuggestion: string;
}

export interface TherapistHomeConfig {
  traineeDisplayName: string;
  todayTasks: TherapistConfiguredTask[];
  recommendedMusic: HomeRecommendedMusic;
  deviceStatus: HomeDeviceStatus;
  lastTrainingSummary: HomeLastTrainingSummary;
  completedTodayMinutes: number;
  dailyTrainingLimitMinutes: number;
  restAfterMinutes: number;
}

export interface TodayTrainingTaskViewModel extends TherapistConfiguredTask {
  badgeLabel: string;
  isStartable: boolean;
}

export interface UserHomeViewModel {
  greeting: string;
  todayTasks: TodayTrainingTaskViewModel[];
  primaryTask: TodayTrainingTaskViewModel | null;
  totalPlannedMinutes: number;
  remainingTodayMinutes: number;
  trainingTimeReminder: string;
  restReminder: string;
  deviceLabel: string;
  signalLabel: string;
  latencyLabel: string;
  canStartTraining: boolean;
}

export class UserHomeModelError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "UserHomeModelError";
  }
}

const TASK_TYPE_LABELS: Record<HomeTrainingTaskType, string> = {
  music_therapy: "音乐放松",
  attention_game: "注意力练习",
  go_nogo_game: "点击反应练习",
  rhythm_navigation: "节律导航"
};

export function buildUserHomeViewModel(config: TherapistHomeConfig): UserHomeViewModel {
  validateHomeConfig(config);

  const todayTasks = config.todayTasks.map((task) => ({
    ...task,
    badgeLabel: TASK_TYPE_LABELS[task.taskType],
    isStartable: task.taskType === "rhythm_navigation"
  }));
  const primaryTask =
    todayTasks.find((task) => task.isPrimary) ??
    todayTasks.find((task) => task.isStartable) ??
    null;
  const totalPlannedMinutes = todayTasks.reduce((sum, task) => sum + task.durationMinutes, 0);
  const remainingTodayMinutes = Math.max(
    0,
    config.dailyTrainingLimitMinutes - config.completedTodayMinutes
  );

  return {
    greeting: `${config.traineeDisplayName}，今天按自己的节奏来。`,
    todayTasks,
    primaryTask,
    totalPlannedMinutes,
    remainingTodayMinutes,
    trainingTimeReminder: buildTrainingTimeReminder(config, totalPlannedMinutes),
    restReminder: `每连续训练约 ${config.restAfterMinutes} 分钟，建议休息 2-3 分钟，再继续下一个任务。`,
    deviceLabel: buildDeviceLabel(config.deviceStatus.connectionStatus),
    signalLabel: buildSignalLabel(config.deviceStatus.signalQuality),
    latencyLabel: buildLatencyLabel(config.deviceStatus.latencyMs),
    canStartTraining:
      primaryTask !== null && config.deviceStatus.connectionStatus !== "disconnected"
  };
}

function validateHomeConfig(config: TherapistHomeConfig): void {
  if (config.traineeDisplayName.trim().length === 0) {
    throw new UserHomeModelError("traineeDisplayName is required.");
  }

  if (config.dailyTrainingLimitMinutes <= 0) {
    throw new UserHomeModelError("dailyTrainingLimitMinutes must be greater than 0.");
  }

  if (config.restAfterMinutes <= 0) {
    throw new UserHomeModelError("restAfterMinutes must be greater than 0.");
  }

  for (const task of config.todayTasks) {
    if (task.title.trim().length === 0) {
      throw new UserHomeModelError("task title is required.");
    }
    if (task.durationMinutes <= 0) {
      throw new UserHomeModelError("task durationMinutes must be greater than 0.");
    }
  }
}

function buildTrainingTimeReminder(
  config: TherapistHomeConfig,
  totalPlannedMinutes: number
): string {
  const remainingMinutes = Math.max(
    0,
    config.dailyTrainingLimitMinutes - config.completedTodayMinutes
  );

  if (remainingMinutes === 0) {
    return "今天的建议训练时长已经用完，可以保留精力，明天再继续。";
  }

  return `今日建议上限 ${config.dailyTrainingLimitMinutes} 分钟，已完成 ${config.completedTodayMinutes} 分钟，本页计划约 ${totalPlannedMinutes} 分钟。`;
}

function buildDeviceLabel(status: HomeDeviceConnectionStatus): string {
  switch (status) {
    case "connected":
      return "头戴设备已连接";
    case "connecting":
      return "头戴设备连接中";
    case "disconnected":
      return "头戴设备未连接";
  }
}

function buildSignalLabel(signalQuality: HomeSignalQuality): string {
  switch (signalQuality) {
    case "good":
      return "信号稳定";
    case "unstable":
      return "信号有些波动";
    case "offline":
      return "暂未收到数据";
  }
}

function buildLatencyLabel(latencyMs: number | null): string {
  if (latencyMs === null) {
    return "等待实时数据";
  }

  return `数据延迟约 ${(latencyMs / 1000).toFixed(latencyMs < 10_000 ? 1 : 0)} 秒`;
}
