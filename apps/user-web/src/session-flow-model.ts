import {
  evaluateTrainingPause,
  type EEGFeatureFrame,
  type TrainingPauseDecision,
  type TrainingPauseEvaluationInput
} from "@neuro-cog-rehab/eeg-features";

export type SessionFlowStageId =
  | "identity_confirmation"
  | "eeg_device_check"
  | "resting_baseline"
  | "music_therapy"
  | "attention_training"
  | "go_nogo_training"
  | "rhythm_navigation"
  | "training_summary"
  | "save_training_record";

export type SessionFlowStageStatus = "pending" | "active" | "paused" | "completed" | "skipped";

export type SessionFlowStatus = "in_progress" | "paused" | "ready_to_save" | "saved";

export interface SessionFlowStageDefinition {
  id: SessionFlowStageId;
  title: string;
  shortLabel: string;
  description: string;
  defaultDurationSeconds: number;
  canBeSkippedByTherapist: boolean;
  requiresEeg: boolean;
}

export interface TherapistSessionFlowConfig {
  sessionId: string;
  userId: string;
  traineeDisplayName: string;
  therapistName: string;
  /** Stages intentionally removed from this single-session plan by a therapist. */
  skippedStageIds: SessionFlowStageId[];
  dailyTrainingLimitMinutes: number;
  recommendedMusicTitle: string;
}

export interface SessionFlowStageState extends SessionFlowStageDefinition {
  order: number;
  status: SessionFlowStageStatus;
  progressPercent: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface SessionStageResult {
  sessionId: string;
  userId: string;
  stageId: SessionFlowStageId;
  savedAt: string;
  durationSeconds: number;
  status: "completed" | "skipped";
  summary: string;
  dataSensitivity: "sensitive";
  payload: Record<string, string | number | boolean | null>;
}

export interface SessionTrainingFlowState {
  sessionId: string;
  userId: string;
  traineeDisplayName: string;
  therapistName: string;
  startedAt: string;
  endedAt: string | null;
  status: SessionFlowStatus;
  stages: SessionFlowStageState[];
  savedStageResults: SessionStageResult[];
  pauseDecision: TrainingPauseDecision | null;
}

export interface SessionSummary {
  sessionId: string;
  userId: string;
  traineeDisplayName: string;
  startedAt: string;
  endedAt: string | null;
  status: SessionFlowStatus;
  totalStageCount: number;
  completedStageCount: number;
  skippedStageCount: number;
  savedStageResultCount: number;
  totalDurationSeconds: number;
  recommendedNextStep: string;
  stageResults: SessionStageResult[];
}

export class SessionFlowModelError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SessionFlowModelError";
  }
}

export const SESSION_FLOW_STAGES: readonly SessionFlowStageDefinition[] = [
  {
    id: "identity_confirmation",
    title: "登录与身份确认",
    shortLabel: "身份确认",
    description: "确认当前训练用户、监护授权和本次训练计划。",
    defaultDurationSeconds: 60,
    canBeSkippedByTherapist: false,
    requiresEeg: false
  },
  {
    id: "eeg_device_check",
    title: "EEG设备检查",
    shortLabel: "设备检查",
    description: "检查头戴设备连接、信号质量和数据延迟。",
    defaultDurationSeconds: 90,
    canBeSkippedByTherapist: false,
    requiresEeg: true
  },
  {
    id: "resting_baseline",
    title: "静息基线采集",
    shortLabel: "静息基线",
    description: "保持安静坐姿，采集训练前状态，用于本次趋势对比。",
    defaultDurationSeconds: 60,
    canBeSkippedByTherapist: false,
    requiresEeg: true
  },
  {
    id: "music_therapy",
    title: "音乐疗愈",
    shortLabel: "音乐",
    description: "播放低刺激音乐，观察注意、放松和疲劳趋势。",
    defaultDurationSeconds: 360,
    canBeSkippedByTherapist: true,
    requiresEeg: true
  },
  {
    id: "attention_training",
    title: "注意力训练",
    shortLabel: "注意训练",
    description: "进行目标探测或持续观察任务，训练任务保持能力。",
    defaultDurationSeconds: 360,
    canBeSkippedByTherapist: true,
    requiresEeg: true
  },
  {
    id: "go_nogo_training",
    title: "Go/No-Go训练",
    shortLabel: "反应控制",
    description: "根据颜色提示点击或等待，记录漏按和误按趋势。",
    defaultDurationSeconds: 300,
    canBeSkippedByTherapist: true,
    requiresEeg: true
  },
  {
    id: "rhythm_navigation",
    title: "节律导航训练",
    shortLabel: "节律导航",
    description: "按路线、颜色和节拍提示完成节点导航。",
    defaultDurationSeconds: 360,
    canBeSkippedByTherapist: true,
    requiresEeg: true
  },
  {
    id: "training_summary",
    title: "训练总结",
    shortLabel: "总结",
    description: "汇总本次阶段结果，仅用于训练记录和趋势查看。",
    defaultDurationSeconds: 90,
    canBeSkippedByTherapist: false,
    requiresEeg: false
  },
  {
    id: "save_training_record",
    title: "保存训练记录",
    shortLabel: "保存",
    description: "保存本次训练记录，供用户、家长和治疗师查看。",
    defaultDurationSeconds: 30,
    canBeSkippedByTherapist: false,
    requiresEeg: false
  }
] as const;

export function createSessionTrainingFlowState(
  config: TherapistSessionFlowConfig,
  now: Date = new Date()
): SessionTrainingFlowState {
  validateFlowConfig(config);

  const nowIso = now.toISOString();
  const skippedStageIds = new Set(config.skippedStageIds);
  const stages = SESSION_FLOW_STAGES.map((stage, index): SessionFlowStageState => {
    const isSkipped = skippedStageIds.has(stage.id);
    return {
      ...stage,
      order: index + 1,
      status: isSkipped ? "skipped" : "pending",
      progressPercent: isSkipped ? 100 : 0,
      startedAt: null,
      completedAt: isSkipped ? nowIso : null
    };
  });
  const firstActiveIndex = stages.findIndex((stage) => stage.status === "pending");

  if (firstActiveIndex >= 0) {
    const firstActiveStage = stages[firstActiveIndex];
    if (firstActiveStage) {
      stages[firstActiveIndex] = {
        ...firstActiveStage,
        status: "active",
        progressPercent: 18,
        startedAt: nowIso
      };
    }
  }

  return {
    sessionId: config.sessionId,
    userId: config.userId,
    traineeDisplayName: config.traineeDisplayName,
    therapistName: config.therapistName,
    startedAt: nowIso,
    endedAt: null,
    status: "in_progress",
    stages,
    savedStageResults: buildSkippedStageResults(config, nowIso),
    pauseDecision: null
  };
}

export function getCurrentFlowStage(state: SessionTrainingFlowState): SessionFlowStageState | null {
  return (
    state.stages.find((stage) => stage.status === "active" || stage.status === "paused") ?? null
  );
}

export function completeCurrentStage(
  state: SessionTrainingFlowState,
  now: Date = new Date(),
  payload: Record<string, string | number | boolean | null> = {}
): SessionTrainingFlowState {
  if (state.status === "paused") {
    throw new SessionFlowModelError("Cannot complete a stage while the session is paused.");
  }

  const currentStage = getCurrentFlowStage(state);
  if (!currentStage || currentStage.status !== "active") {
    throw new SessionFlowModelError("No active stage is available to complete.");
  }

  const savedAt = now.toISOString();
  const savedResult = buildStageResult(state, currentStage, savedAt, payload);
  const currentStageIndex = state.stages.findIndex((stage) => stage.id === currentStage.id);
  const nextStageIndex = state.stages.findIndex(
    (stage, index) => index > currentStageIndex && stage.status === "pending"
  );
  const isFinalStage = nextStageIndex === -1;
  const nextStatus =
    currentStage.id === "save_training_record" || isFinalStage ? "saved" : "in_progress";

  const nextStages = state.stages.map((stage, index) => {
    if (stage.id === currentStage.id) {
      return {
        ...stage,
        status: "completed" as const,
        progressPercent: 100,
        completedAt: savedAt
      };
    }

    if (index === nextStageIndex) {
      return {
        ...stage,
        status: "active" as const,
        progressPercent: 18,
        startedAt: savedAt
      };
    }

    return stage;
  });

  return {
    ...state,
    status: nextStatus,
    endedAt: nextStatus === "saved" ? savedAt : null,
    stages: nextStages,
    savedStageResults: [...state.savedStageResults, savedResult],
    pauseDecision: null
  };
}

export function pauseSessionForEeg(
  state: SessionTrainingFlowState,
  input: {
    now?: Date;
    eegFrames: EEGFeatureFrame[];
    elapsedSeconds: number;
  }
): SessionTrainingFlowState {
  const currentStage = getCurrentFlowStage(state);
  if (!currentStage || state.status === "saved") {
    return state;
  }

  const pauseInput: TrainingPauseEvaluationInput = {
    eegFrames: input.eegFrames,
    progress: {
      sessionId: state.sessionId,
      userId: state.userId,
      trainingType: currentStage.id,
      elapsedSeconds: input.elapsedSeconds,
      completedStepCount: completedStageCount(state),
      totalStepCount: enabledStageCount(state),
      metadata: {
        activeStageId: currentStage.id,
        page: "single_session_flow"
      }
    }
  };

  if (input.now) {
    pauseInput.now = input.now;
  }

  const decision = evaluateTrainingPause(pauseInput, {
    artifactLevelPauseThreshold: 70,
    sustainedArtifactFrameCount: 3,
    eegDisconnectedAfterMs: 5000
  });

  if (!decision.shouldPause) {
    return state;
  }

  return {
    ...state,
    status: "paused",
    pauseDecision: decision,
    stages: state.stages.map((stage) =>
      stage.id === currentStage.id ? { ...stage, status: "paused", progressPercent: 50 } : stage
    )
  };
}

export function resumeSessionFlow(state: SessionTrainingFlowState): SessionTrainingFlowState {
  if (state.status !== "paused") {
    return state;
  }

  return {
    ...state,
    status: "in_progress",
    pauseDecision: null,
    stages: state.stages.map((stage) =>
      stage.status === "paused" ? { ...stage, status: "active" as const } : stage
    )
  };
}

export function generateSessionSummary(
  state: SessionTrainingFlowState,
  now: Date = new Date()
): SessionSummary {
  const stageResults = [...state.savedStageResults];
  const endedAt = state.endedAt ?? (state.status === "saved" ? now.toISOString() : null);

  return {
    sessionId: state.sessionId,
    userId: state.userId,
    traineeDisplayName: state.traineeDisplayName,
    startedAt: state.startedAt,
    endedAt,
    status: state.status,
    totalStageCount: enabledStageCount(state),
    completedStageCount: completedStageCount(state),
    skippedStageCount: state.stages.filter((stage) => stage.status === "skipped").length,
    savedStageResultCount: stageResults.length,
    totalDurationSeconds: stageResults.reduce((sum, result) => sum + result.durationSeconds, 0),
    recommendedNextStep: buildRecommendedNextStep(state),
    stageResults
  };
}

export function buildDemoEegPauseFrames(now: Date = new Date()): EEGFeatureFrame[] {
  return [3, 2, 1].map((offsetSeconds) => ({
    timestamp: new Date(now.getTime() - offsetSeconds * 1000).toISOString(),
    attentionScore: 48,
    relaxationScore: 40,
    fatigueScore: 58,
    thetaPower: 0.34,
    alphaPower: 0.28,
    betaPower: 0.38,
    signalQuality: 52,
    artifactLevel: 78
  }));
}

function validateFlowConfig(config: TherapistSessionFlowConfig): void {
  if (!config.sessionId || !config.userId) {
    throw new SessionFlowModelError("sessionId and userId are required.");
  }
  if (config.traineeDisplayName.trim().length === 0) {
    throw new SessionFlowModelError("traineeDisplayName is required.");
  }
  if (config.dailyTrainingLimitMinutes <= 0) {
    throw new SessionFlowModelError("dailyTrainingLimitMinutes must be greater than 0.");
  }

  const stageDefinitions = new Map(SESSION_FLOW_STAGES.map((stage) => [stage.id, stage]));
  for (const stageId of config.skippedStageIds) {
    const definition = stageDefinitions.get(stageId);
    if (!definition) {
      throw new SessionFlowModelError(`Unknown stage id: ${stageId}`);
    }
    if (!definition.canBeSkippedByTherapist) {
      throw new SessionFlowModelError(`${stageId} cannot be skipped by therapist configuration.`);
    }
  }
}

function buildSkippedStageResults(
  config: TherapistSessionFlowConfig,
  savedAt: string
): SessionStageResult[] {
  const stageDefinitions = new Map(SESSION_FLOW_STAGES.map((stage) => [stage.id, stage]));

  return config.skippedStageIds.map((stageId) => {
    const stage = stageDefinitions.get(stageId);
    if (!stage) {
      throw new SessionFlowModelError(`Unknown stage id: ${stageId}`);
    }

    return {
      sessionId: config.sessionId,
      userId: config.userId,
      stageId,
      savedAt,
      durationSeconds: 0,
      status: "skipped",
      summary: `${stage.title}已按治疗师配置跳过。`,
      dataSensitivity: "sensitive",
      payload: {
        skippedByTherapist: true,
        stageTitle: stage.title
      }
    };
  });
}

function buildStageResult(
  state: SessionTrainingFlowState,
  stage: SessionFlowStageState,
  savedAt: string,
  payload: Record<string, string | number | boolean | null>
): SessionStageResult {
  return {
    sessionId: state.sessionId,
    userId: state.userId,
    stageId: stage.id,
    savedAt,
    durationSeconds: stage.defaultDurationSeconds,
    status: "completed",
    summary: buildStageResultSummary(stage),
    dataSensitivity: "sensitive",
    payload: {
      stageTitle: stage.title,
      stageOrder: stage.order,
      ...payload
    }
  };
}

function buildStageResultSummary(stage: SessionFlowStageState): string {
  switch (stage.id) {
    case "identity_confirmation":
      return "身份与训练计划已确认。";
    case "eeg_device_check":
      return "头戴设备连接与信号状态已完成检查。";
    case "resting_baseline":
      return "静息基线已保存，用于本次训练前后趋势对比。";
    case "music_therapy":
      return "音乐阶段结果已保存，记录注意、放松和疲劳趋势。";
    case "attention_training":
      return "注意力训练阶段结果已保存，记录正确率和反应趋势。";
    case "go_nogo_training":
      return "Go/No-Go阶段结果已保存，记录漏按、误按和反应趋势。";
    case "rhythm_navigation":
      return "节律导航阶段结果已保存，记录路线、节拍和规则切换表现。";
    case "training_summary":
      return "本次训练总结已生成。";
    case "save_training_record":
      return "本次训练记录已保存。";
  }
}

function enabledStageCount(state: SessionTrainingFlowState): number {
  return state.stages.filter((stage) => stage.status !== "skipped").length;
}

function completedStageCount(state: SessionTrainingFlowState): number {
  return state.stages.filter((stage) => stage.status === "completed").length;
}

function buildRecommendedNextStep(state: SessionTrainingFlowState): string {
  if (state.status === "paused") {
    return "当前流程已暂停，建议先调整设备或休息，恢复稳定后再继续。";
  }

  if (state.status === "saved") {
    return "记录已保存，可在下次训练前查看趋势变化和治疗师建议。";
  }

  return "继续完成当前阶段，阶段结束后保存结果。";
}
