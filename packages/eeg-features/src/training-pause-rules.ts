import type { EEGFeatureFrame } from "./types.js";

export type TrainingPauseReasonCode =
  | "eeg_disconnected"
  | "artifact_level_high"
  | "fatigue_rising"
  | "consecutive_false_presses"
  | "user_discomfort"
  | "daily_limit_exceeded";

export type TrainingPauseSeverity = "info" | "warning";

export type TrainingPauseSuggestedAction =
  | "check_eeg_connection"
  | "rest"
  | "switch_to_relax_music"
  | "slow_down"
  | "finish_today";

export type TrainingPauseEventType =
  | "pause"
  | "device_disconnect"
  | "low_signal_quality"
  | "user_discomfort"
  | "other";

export interface TrainingPauseRuleConfig {
  /** Milliseconds without EEG data before a session-level pause is suggested. */
  eegDisconnectedAfterMs: number;
  /** artifactLevel threshold used to detect sustained motion or signal interference. */
  artifactLevelPauseThreshold: number;
  /** Number of recent EEG frames that must all exceed the artifact threshold. */
  sustainedArtifactFrameCount: number;
  /** Number of recent EEG frames used to check a continuous fatigue trend. */
  fatigueRiseFrameCount: number;
  /** Minimum fatigueScore increase across the fatigue trend window. */
  fatigueRiseDeltaThreshold: number;
  /** Fatigue score that makes a rising trend meaningful enough to pause. */
  fatigueScorePauseThreshold: number;
  /** Small temporary dips allowed while still treating fatigue as rising. */
  fatigueRiseAllowedDip: number;
  /** Consecutive false presses before suggesting a calm pause. */
  consecutiveFalsePressThreshold: number;
  /** Default daily active training limit when the caller does not provide one. */
  defaultDailyLimitSeconds: number;
  /** Whether the generated decision should include a therapist dashboard notice. */
  therapistNotificationEnabled: boolean;
}

export interface TrainingPauseBehaviorSnapshot {
  /** Consecutive false presses or impulsive clicks in the current segment. */
  consecutiveFalsePressCount: number;
}

export interface TrainingPauseUserFeedback {
  /** True when the user actively reports discomfort during training. */
  discomfort: boolean;
  /** Optional user-facing feedback label, stored only as a training safety note. */
  discomfortNote?: string;
}

export interface TrainingPauseDailyUsage {
  /** Active training time already completed today, excluding the current active segment. */
  completedTodaySeconds: number;
  /** Active training time in the current session. */
  currentSessionElapsedSeconds: number;
  /** Optional per-user daily limit. The default rule limit is used when omitted. */
  dailyLimitSeconds?: number;
}

export interface TrainingPauseProgressInput {
  sessionId: string;
  userId: string;
  trainingType: string;
  elapsedSeconds: number;
  completedStepCount?: number;
  totalStepCount?: number;
  currentDifficultyLevel?: number;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface TrainingPauseProgressSnapshot extends TrainingPauseProgressInput {
  /** ISO timestamp used by the caller to persist the pause checkpoint. */
  savedAt: string;
  /** Pause checkpoints are sensitivity-marked because they include user and training state. */
  dataSensitivity: "sensitive";
}

export interface TrainingPauseEvaluationInput {
  /** Current time used for deterministic tests and timeout checks. */
  now?: Date | string;
  /** Recent EEG feature frames ordered from old to new. */
  eegFrames?: EEGFeatureFrame[];
  /** Optional latest frame timestamp when frames are kept outside this module. */
  lastFrameAt?: string | null;
  /** Optional device connection state from the gateway or frontend. */
  connectionStatus?: "connecting" | "connected" | "reconnecting" | "disconnected";
  /** ISO timestamp when the current connection status started. */
  connectionStatusSince?: string | null;
  behavior?: Partial<TrainingPauseBehaviorSnapshot>;
  userFeedback?: TrainingPauseUserFeedback;
  dailyUsage?: TrainingPauseDailyUsage;
  /** Current progress to be saved if a pause is triggered. */
  progress: TrainingPauseProgressInput;
}

export interface TrainingPauseReason {
  code: TrainingPauseReasonCode;
  severity: TrainingPauseSeverity;
  explanation: string;
  evidence: Record<string, string | number | boolean | null>;
}

export interface TrainingPauseFrontendPrompt {
  title: string;
  message: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  suggestedAction: TrainingPauseSuggestedAction;
  restSuggestion: string;
  musicSuggestion: string | null;
  tone: "calm";
}

export interface TrainingPauseAbnormalEvent {
  eventType: TrainingPauseEventType;
  severity: TrainingPauseSeverity;
  occurredAt: string;
  message: string;
  details: Record<string, string | number | boolean | null>;
}

export interface TrainingPauseTherapistNotification {
  shouldNotify: boolean;
  channel: "therapist_dashboard";
  userId: string;
  sessionId: string;
  occurredAt: string;
  title: string;
  message: string;
  payload: Record<string, string | number | boolean | null>;
}

export interface TrainingPauseDecision {
  shouldPause: boolean;
  primaryReason: TrainingPauseReason | null;
  triggeredReasons: TrainingPauseReason[];
  prompt: TrainingPauseFrontendPrompt | null;
  progressSnapshot: TrainingPauseProgressSnapshot | null;
  abnormalEvent: TrainingPauseAbnormalEvent | null;
  therapistNotification: TrainingPauseTherapistNotification | null;
}

export class TrainingPauseRuleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TrainingPauseRuleError";
  }
}

const DEFAULT_TRAINING_PAUSE_RULES: TrainingPauseRuleConfig = {
  eegDisconnectedAfterMs: 6000,
  artifactLevelPauseThreshold: 70,
  sustainedArtifactFrameCount: 3,
  fatigueRiseFrameCount: 4,
  fatigueRiseDeltaThreshold: 15,
  fatigueScorePauseThreshold: 70,
  fatigueRiseAllowedDip: 2,
  consecutiveFalsePressThreshold: 4,
  defaultDailyLimitSeconds: 30 * 60,
  therapistNotificationEnabled: true
};

export function buildTrainingPauseRules(
  overrides: Partial<TrainingPauseRuleConfig> = {}
): TrainingPauseRuleConfig {
  const rules = {
    ...DEFAULT_TRAINING_PAUSE_RULES,
    ...overrides
  };

  validateRules(rules);
  return rules;
}

export function evaluateTrainingPause(
  input: TrainingPauseEvaluationInput,
  ruleOverrides: Partial<TrainingPauseRuleConfig> = {}
): TrainingPauseDecision {
  const rules = buildTrainingPauseRules(ruleOverrides);
  const now = normalizeNow(input.now);
  const occurredAt = now.toISOString();
  const frames = input.eegFrames ?? [];
  const triggeredReasons = [
    evaluateUserDiscomfort(input.userFeedback),
    evaluateEegDisconnect(input, frames, rules, now),
    evaluateArtifactLevel(frames, rules),
    evaluateFatigueTrend(frames, rules),
    evaluateFalsePresses(input.behavior, rules),
    evaluateDailyLimit(input.dailyUsage, rules)
  ].filter((reason): reason is TrainingPauseReason => reason !== null);

  const primaryReason = triggeredReasons[0] ?? null;
  if (!primaryReason) {
    return {
      shouldPause: false,
      primaryReason: null,
      triggeredReasons,
      prompt: null,
      progressSnapshot: null,
      abnormalEvent: null,
      therapistNotification: null
    };
  }

  const progressSnapshot = buildProgressSnapshot(input.progress, occurredAt);
  const prompt = buildTrainingPausePrompt(primaryReason.code);
  const abnormalEvent = buildAbnormalEvent(primaryReason, triggeredReasons, prompt, occurredAt);
  const therapistNotification = buildTherapistNotification(
    rules,
    input.progress,
    primaryReason,
    prompt,
    occurredAt
  );

  return {
    shouldPause: true,
    primaryReason,
    triggeredReasons,
    prompt,
    progressSnapshot,
    abnormalEvent,
    therapistNotification
  };
}

export function buildTrainingPausePrompt(
  reasonCode: TrainingPauseReasonCode
): TrainingPauseFrontendPrompt {
  const sharedRestText = "建议先休息一会儿，喝水、调整坐姿，准备好后再继续。";

  switch (reasonCode) {
    case "eeg_disconnected":
      return {
        title: "先暂停一下",
        message: "暂时没有收到稳定的脑电数据，训练已暂停。请检查设备连接和佩戴位置。",
        primaryActionLabel: "检查连接",
        secondaryActionLabel: "稍后继续",
        suggestedAction: "check_eeg_connection",
        restSuggestion: sharedRestText,
        musicSuggestion: "如果需要等待连接，可以切换到轻柔的放松音乐。",
        tone: "calm"
      };
    case "artifact_level_high":
      return {
        title: "先稳定一下",
        message: "当前信号受到较多动作干扰，训练已暂停。可以放松身体，轻轻调整佩戴。",
        primaryActionLabel: "调整佩戴",
        secondaryActionLabel: "休息片刻",
        suggestedAction: "slow_down",
        restSuggestion: sharedRestText,
        musicSuggestion: "可以先播放低强度自然声，帮助训练节奏慢下来。",
        tone: "calm"
      };
    case "fatigue_rising":
      return {
        title: "休息一会儿",
        message: "疲劳趋势在上升，训练已暂停。现在更适合短暂休息或降低训练强度。",
        primaryActionLabel: "开始休息",
        secondaryActionLabel: "切换音乐",
        suggestedAction: "switch_to_relax_music",
        restSuggestion: sharedRestText,
        musicSuggestion: "建议切换到放松恢复或自然声音乐，并降低音量和强度。",
        tone: "calm"
      };
    case "consecutive_false_presses":
      return {
        title: "调整节奏",
        message: "连续误点较多，训练已暂停。可以慢一点观察提示，再决定是否点击。",
        primaryActionLabel: "休息片刻",
        secondaryActionLabel: "降低难度",
        suggestedAction: "slow_down",
        restSuggestion: sharedRestText,
        musicSuggestion: "如需过渡，可播放节奏更平稳的放松音乐。",
        tone: "calm"
      };
    case "user_discomfort":
      return {
        title: "先照顾感受",
        message: "你反馈了不舒服，训练已暂停。请先休息，并让家长或治疗师一起确认下一步。",
        primaryActionLabel: "休息",
        secondaryActionLabel: "联系治疗师",
        suggestedAction: "rest",
        restSuggestion: "请先离开训练任务，选择安静舒适的休息方式。",
        musicSuggestion: "如愿意听音乐，建议只选择低强度放松音乐，并随时停止。",
        tone: "calm"
      };
    case "daily_limit_exceeded":
      return {
        title: "今天先到这里",
        message: "今天的训练时间已经达到建议上限，训练已暂停。剩余内容可以留到下次。",
        primaryActionLabel: "结束今日训练",
        secondaryActionLabel: "查看记录",
        suggestedAction: "finish_today",
        restSuggestion: "建议结束主动训练，保留今天的训练记录供后续趋势查看。",
        musicSuggestion: "如果还想放松，可以选择短时、低强度的恢复音乐。",
        tone: "calm"
      };
  }
}

function validateRules(rules: TrainingPauseRuleConfig): void {
  const numericEntries = Object.entries(rules).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number"
  );

  for (const [key, value] of numericEntries) {
    if (!Number.isFinite(value) || value < 0) {
      throw new TrainingPauseRuleError(`${key} must be a non-negative finite number.`);
    }
  }

  if (rules.sustainedArtifactFrameCount < 1) {
    throw new TrainingPauseRuleError("sustainedArtifactFrameCount must be at least 1.");
  }
  if (rules.fatigueRiseFrameCount < 2) {
    throw new TrainingPauseRuleError("fatigueRiseFrameCount must be at least 2.");
  }
  if (rules.artifactLevelPauseThreshold > 100 || rules.fatigueScorePauseThreshold > 100) {
    throw new TrainingPauseRuleError("score thresholds must be no greater than 100.");
  }
}

function evaluateUserDiscomfort(
  feedback: TrainingPauseUserFeedback | undefined
): TrainingPauseReason | null {
  if (!feedback?.discomfort) {
    return null;
  }

  return {
    code: "user_discomfort",
    severity: "warning",
    explanation: "用户主动反馈不适，暂停训练并保留当前进度。",
    evidence: {
      discomfort: true,
      discomfortNote: feedback.discomfortNote ?? null
    }
  };
}

function evaluateEegDisconnect(
  input: TrainingPauseEvaluationInput,
  frames: EEGFeatureFrame[],
  rules: TrainingPauseRuleConfig,
  now: Date
): TrainingPauseReason | null {
  const lastFrameAt = input.lastFrameAt ?? frames.at(-1)?.timestamp ?? null;
  const lastFrameMs = parseOptionalTimestamp(lastFrameAt);
  const statusSinceMs = parseOptionalTimestamp(input.connectionStatusSince ?? null);
  const missingDataMs = lastFrameMs === null ? null : now.getTime() - lastFrameMs;
  const disconnectedMs = statusSinceMs === null ? null : now.getTime() - statusSinceMs;
  const staleByFrame = missingDataMs !== null && missingDataMs >= rules.eegDisconnectedAfterMs;
  const staleByStatus =
    input.connectionStatus === "disconnected" &&
    (disconnectedMs === null || disconnectedMs >= rules.eegDisconnectedAfterMs);

  if (!staleByFrame && !staleByStatus) {
    return null;
  }

  return {
    code: "eeg_disconnected",
    severity: "warning",
    explanation: "EEG数据连接持续中断，暂停训练以保留当前训练进度。",
    evidence: {
      connectionStatus: input.connectionStatus ?? null,
      missingDataMs,
      disconnectedMs,
      thresholdMs: rules.eegDisconnectedAfterMs
    }
  };
}

function evaluateArtifactLevel(
  frames: EEGFeatureFrame[],
  rules: TrainingPauseRuleConfig
): TrainingPauseReason | null {
  const recentFrames = takeLast(frames, rules.sustainedArtifactFrameCount);
  if (recentFrames.length < rules.sustainedArtifactFrameCount) {
    return null;
  }

  const isSustainedHigh = recentFrames.every(
    (frame) => frame.artifactLevel >= rules.artifactLevelPauseThreshold
  );
  if (!isSustainedHigh) {
    return null;
  }

  return {
    code: "artifact_level_high",
    severity: "warning",
    explanation: "artifactLevel连续偏高，暂停训练并提示调整佩戴或减少大幅动作。",
    evidence: {
      artifactLevel: round(recentFrames.at(-1)?.artifactLevel ?? 0, 2),
      frameCount: recentFrames.length,
      threshold: rules.artifactLevelPauseThreshold
    }
  };
}

function evaluateFatigueTrend(
  frames: EEGFeatureFrame[],
  rules: TrainingPauseRuleConfig
): TrainingPauseReason | null {
  const recentFrames = takeLast(frames, rules.fatigueRiseFrameCount);
  if (recentFrames.length < rules.fatigueRiseFrameCount) {
    return null;
  }

  const firstFatigue = recentFrames[0]?.fatigueScore;
  const lastFatigue = recentFrames.at(-1)?.fatigueScore;
  if (typeof firstFatigue !== "number" || typeof lastFatigue !== "number") {
    return null;
  }

  const isRising = recentFrames.every((frame, index) => {
    if (index === 0) {
      return true;
    }

    const previous = recentFrames[index - 1];
    return previous
      ? frame.fatigueScore + rules.fatigueRiseAllowedDip >= previous.fatigueScore
      : true;
  });
  const delta = lastFatigue - firstFatigue;

  if (
    !isRising ||
    delta < rules.fatigueRiseDeltaThreshold ||
    lastFatigue < rules.fatigueScorePauseThreshold
  ) {
    return null;
  }

  return {
    code: "fatigue_rising",
    severity: "warning",
    explanation: "fatigueScore连续上升，建议暂停并降低后续训练强度。",
    evidence: {
      fatigueStart: round(firstFatigue, 2),
      fatigueEnd: round(lastFatigue, 2),
      fatigueDelta: round(delta, 2),
      threshold: rules.fatigueRiseDeltaThreshold
    }
  };
}

function evaluateFalsePresses(
  behavior: Partial<TrainingPauseBehaviorSnapshot> | undefined,
  rules: TrainingPauseRuleConfig
): TrainingPauseReason | null {
  const count = behavior?.consecutiveFalsePressCount ?? 0;
  if (count < rules.consecutiveFalsePressThreshold) {
    return null;
  }

  return {
    code: "consecutive_false_presses",
    severity: "info",
    explanation: "连续误按次数达到配置阈值，暂停训练并建议调整节奏或难度。",
    evidence: {
      consecutiveFalsePressCount: count,
      threshold: rules.consecutiveFalsePressThreshold
    }
  };
}

function evaluateDailyLimit(
  usage: TrainingPauseDailyUsage | undefined,
  rules: TrainingPauseRuleConfig
): TrainingPauseReason | null {
  if (!usage) {
    return null;
  }

  const dailyLimitSeconds = usage.dailyLimitSeconds ?? rules.defaultDailyLimitSeconds;
  const totalSeconds = usage.completedTodaySeconds + usage.currentSessionElapsedSeconds;
  if (totalSeconds < dailyLimitSeconds) {
    return null;
  }

  return {
    code: "daily_limit_exceeded",
    severity: "info",
    explanation: "当日训练时长达到建议上限，暂停训练并建议结束今日主动训练。",
    evidence: {
      completedTodaySeconds: usage.completedTodaySeconds,
      currentSessionElapsedSeconds: usage.currentSessionElapsedSeconds,
      totalSeconds,
      dailyLimitSeconds
    }
  };
}

function buildProgressSnapshot(
  progress: TrainingPauseProgressInput,
  savedAt: string
): TrainingPauseProgressSnapshot {
  const snapshot: TrainingPauseProgressSnapshot = {
    sessionId: progress.sessionId,
    userId: progress.userId,
    trainingType: progress.trainingType,
    elapsedSeconds: progress.elapsedSeconds,
    savedAt,
    dataSensitivity: "sensitive"
  };

  if (progress.completedStepCount !== undefined) {
    snapshot.completedStepCount = progress.completedStepCount;
  }
  if (progress.totalStepCount !== undefined) {
    snapshot.totalStepCount = progress.totalStepCount;
  }
  if (progress.currentDifficultyLevel !== undefined) {
    snapshot.currentDifficultyLevel = progress.currentDifficultyLevel;
  }
  if (progress.metadata !== undefined) {
    snapshot.metadata = { ...progress.metadata };
  }

  return snapshot;
}

function buildAbnormalEvent(
  primaryReason: TrainingPauseReason,
  triggeredReasons: TrainingPauseReason[],
  prompt: TrainingPauseFrontendPrompt,
  occurredAt: string
): TrainingPauseAbnormalEvent {
  return {
    eventType: mapReasonToEventType(primaryReason.code),
    severity: primaryReason.severity,
    occurredAt,
    message: prompt.message,
    details: {
      primaryReasonCode: primaryReason.code,
      triggeredReasonCount: triggeredReasons.length,
      shouldSaveProgress: true,
      suggestedAction: prompt.suggestedAction
    }
  };
}

function buildTherapistNotification(
  rules: TrainingPauseRuleConfig,
  progress: TrainingPauseProgressInput,
  primaryReason: TrainingPauseReason,
  prompt: TrainingPauseFrontendPrompt,
  occurredAt: string
): TrainingPauseTherapistNotification {
  return {
    shouldNotify: rules.therapistNotificationEnabled,
    channel: "therapist_dashboard",
    userId: progress.userId,
    sessionId: progress.sessionId,
    occurredAt,
    title: "训练已暂停",
    message: `训练因“${reasonLabel(primaryReason.code)}”自动暂停，请查看进度记录并按需调整后续安排。`,
    payload: {
      reasonCode: primaryReason.code,
      trainingType: progress.trainingType,
      elapsedSeconds: progress.elapsedSeconds,
      suggestedAction: prompt.suggestedAction
    }
  };
}

function mapReasonToEventType(reasonCode: TrainingPauseReasonCode): TrainingPauseEventType {
  switch (reasonCode) {
    case "eeg_disconnected":
      return "device_disconnect";
    case "artifact_level_high":
      return "low_signal_quality";
    case "user_discomfort":
      return "user_discomfort";
    case "daily_limit_exceeded":
      return "other";
    case "fatigue_rising":
    case "consecutive_false_presses":
      return "pause";
  }
}

function reasonLabel(reasonCode: TrainingPauseReasonCode): string {
  switch (reasonCode) {
    case "eeg_disconnected":
      return "EEG连接中断";
    case "artifact_level_high":
      return "信号干扰较多";
    case "fatigue_rising":
      return "疲劳趋势上升";
    case "consecutive_false_presses":
      return "连续误按";
    case "user_discomfort":
      return "用户反馈不适";
    case "daily_limit_exceeded":
      return "达到当日训练上限";
  }
}

function takeLast<T>(values: T[], count: number): T[] {
  return values.slice(Math.max(0, values.length - count));
}

function normalizeNow(value: Date | string | undefined): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new TrainingPauseRuleError("now must be a valid Date.");
    }
    return value;
  }

  if (typeof value === "string") {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) {
      throw new TrainingPauseRuleError("now must be a valid ISO timestamp.");
    }
    return new Date(timestamp);
  }

  return new Date();
}

function parseOptionalTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
