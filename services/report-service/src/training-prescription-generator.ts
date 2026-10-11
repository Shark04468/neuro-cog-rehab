import type {
  GeneratedTrainingPrescription,
  MusicTherapyPrescriptionSuggestion,
  TherapistTrainingGoalSetting,
  TrainingModuleCombinationItem,
  TrainingPrescriptionGenerationInput,
  TrainingPrescriptionGoalFocus,
  TrainingPrescriptionModuleType,
  TrainingPrescriptionRiskReminder
} from "@neuro-cog-rehab/shared-types";

import type {
  TrainingPrescriptionRuleConfig,
  TrainingPrescriptionRuleConfigOverrides
} from "./types.js";

export type TrainingPrescriptionGeneratorErrorCode = "INVALID_INPUT" | "INVALID_RULE_CONFIG";

export class TrainingPrescriptionGeneratorError extends Error {
  constructor(
    public readonly code: TrainingPrescriptionGeneratorErrorCode,
    message: string
  ) {
    super(message);
    this.name = "TrainingPrescriptionGeneratorError";
  }
}

export const DEFAULT_TRAINING_PRESCRIPTION_RULE_CONFIG: TrainingPrescriptionRuleConfig = {
  initialCompletedSessionThreshold: 3,
  initialFrequencyPerWeek: 3,
  standardFrequencyPerWeek: 4,
  reducedFrequencyPerWeek: 2,
  initialMaxSessionDurationMinutes: 15,
  standardSessionDurationMinutes: 22,
  minimumSessionDurationMinutes: 8,
  maximumSessionDurationMinutes: 30,
  fatigueSelfRatingAtOrAbove: 4,
  eegFatigueConcernAtOrAbove: 65,
  lowValidSampleRateAtOrBelow: 0.72,
  highCommissionRateAtOrAbove: 0.16,
  highOmissionRateAtOrAbove: 0.18,
  highReactionVariabilityMsAtOrAbove: 360,
  lowComplianceRateAtOrBelow: 0.6,
  lowCompletionRateAtOrBelow: 0.7,
  defaultDifficultyStartLevel: 2,
  reducedDifficultyStartLevel: 1,
  elevatedDifficultyStartLevel: 3,
  moduleLimit: 4,
  moduleBaseMinutes: {
    music_relaxation: 5,
    attention_training: 8,
    sustained_attention: 8,
    go_no_go: 8,
    stop_signal: 8,
    rhythm_navigation: 8
  }
};

interface PrescriptionSignals {
  isInitialStage: boolean;
  fatigueConcern: boolean;
  highCommissionRate: boolean;
  highOmissionRate: boolean;
  highReactionVariability: boolean;
  lowCompliance: boolean;
  dataQualityConcern: boolean;
  goodRecentPerformance: boolean;
}

export function buildTrainingPrescriptionRuleConfig(
  overrides: TrainingPrescriptionRuleConfigOverrides = {}
): TrainingPrescriptionRuleConfig {
  const base = DEFAULT_TRAINING_PRESCRIPTION_RULE_CONFIG;
  const config: TrainingPrescriptionRuleConfig = {
    ...base,
    ...overrides,
    moduleBaseMinutes: {
      ...base.moduleBaseMinutes,
      ...overrides.moduleBaseMinutes
    }
  };

  validateRuleConfig(config);
  return config;
}

export function generateTrainingPrescription(
  input: TrainingPrescriptionGenerationInput,
  overrides: TrainingPrescriptionRuleConfigOverrides = {}
): GeneratedTrainingPrescription {
  const config = buildTrainingPrescriptionRuleConfig(overrides);
  validateInput(input);

  const signals = analyzePrescriptionSignals(input, config);
  const sessionDurationMinutes = calculateSessionDurationMinutes(input, config, signals);
  const weeklyTrainingFrequency = calculateWeeklyFrequency(input.therapistGoals, config, signals);
  const gameDifficultyStartLevel = calculateDifficultyStartLevel(input, config, signals);
  const recommendedModuleCombination = buildModuleCombination({
    input,
    config,
    signals,
    sessionDurationMinutes,
    gameDifficultyStartLevel
  });
  const musicTherapySuggestion = buildMusicSuggestion(input, signals);
  const riskReminders = buildRiskReminders(input, config, signals);
  const nextWeekAdjustmentSuggestions = buildNextWeekSuggestions(input, signals);

  return {
    userId: input.userId,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    weeklyTrainingFrequency,
    sessionDurationMinutes,
    recommendedModuleCombination,
    musicTherapySuggestion,
    gameDifficultyStartLevel,
    riskReminders,
    nextWeekAdjustmentSuggestions,
    explanation: buildPrescriptionExplanation({
      input,
      signals,
      weeklyTrainingFrequency: weeklyTrainingFrequency.sessionsPerWeek,
      sessionDurationMinutes,
      gameDifficultyStartLevel
    }),
    scopeNotice:
      "本处方为辅助训练计划建议，仅用于训练安排、记录和趋势追踪，不作为诊断、治疗或疗效保证。"
  };
}

function analyzePrescriptionSignals(
  input: TrainingPrescriptionGenerationInput,
  config: TrainingPrescriptionRuleConfig
): PrescriptionSignals {
  const recent = input.recentWeekTraining;
  const compliance = input.compliance;
  const eeg = input.eegTrend;
  const isInitialStage = recent.completedSessionCount < config.initialCompletedSessionThreshold;
  const fatigueConcern =
    input.baselineAssessment.fatigueSelfRating >= config.fatigueSelfRatingAtOrAbove ||
    eeg.fatigueTrend === "rising" ||
    (eeg.averageFatigueIndex ?? 0) >= config.eegFatigueConcernAtOrAbove ||
    compliance.userFeedback === "tired" ||
    compliance.userFeedback === "uncomfortable";
  const highCommissionRate = (recent.commissionRate ?? 0) >= config.highCommissionRateAtOrAbove;
  const highOmissionRate = (recent.omissionRate ?? 0) >= config.highOmissionRateAtOrAbove;
  const highReactionVariability =
    (recent.reactionTimeVariabilityMs ?? 0) >= config.highReactionVariabilityMsAtOrAbove;
  const lowCompliance =
    compliance.completionRate <= config.lowComplianceRateAtOrBelow ||
    (recent.averageCompletionRate ?? 1) <= config.lowCompletionRateAtOrBelow ||
    compliance.userFeedback === "resistant";
  const dataQualityConcern =
    eeg.signalQualityStatus === "noisy" ||
    eeg.signalQualityStatus === "disconnected" ||
    (eeg.validSampleRate ?? 1) <= config.lowValidSampleRateAtOrBelow;
  const goodRecentPerformance =
    (recent.averageAccuracyRate ?? 0) >= 0.82 &&
    !highCommissionRate &&
    !highOmissionRate &&
    !highReactionVariability &&
    !fatigueConcern &&
    !lowCompliance;

  return {
    isInitialStage,
    fatigueConcern,
    highCommissionRate,
    highOmissionRate,
    highReactionVariability,
    lowCompliance,
    dataQualityConcern,
    goodRecentPerformance
  };
}

function calculateSessionDurationMinutes(
  input: TrainingPrescriptionGenerationInput,
  config: TrainingPrescriptionRuleConfig,
  signals: PrescriptionSignals
): number {
  let duration = signals.isInitialStage
    ? config.initialMaxSessionDurationMinutes
    : config.standardSessionDurationMinutes;

  if (signals.fatigueConcern) {
    duration -= 5;
  }
  if (signals.lowCompliance) {
    duration -= 3;
  }
  if (signals.highReactionVariability) {
    duration -= 2;
  }

  const therapistCap = input.therapistGoals.maxSessionDurationMinutes;
  if (typeof therapistCap === "number") {
    duration = Math.min(duration, therapistCap);
  }

  return clampRound(
    duration,
    config.minimumSessionDurationMinutes,
    config.maximumSessionDurationMinutes
  );
}

function calculateWeeklyFrequency(
  goals: TherapistTrainingGoalSetting,
  config: TrainingPrescriptionRuleConfig,
  signals: PrescriptionSignals
): GeneratedTrainingPrescription["weeklyTrainingFrequency"] {
  let sessionsPerWeek = signals.isInitialStage
    ? config.initialFrequencyPerWeek
    : config.standardFrequencyPerWeek;
  const reasons: string[] = [];

  if (signals.isInitialStage) {
    reasons.push("初期阶段采用较低频率，先观察训练接受度和完成情况。");
  }
  if (signals.fatigueConcern || signals.lowCompliance) {
    sessionsPerWeek = Math.min(sessionsPerWeek, config.reducedFrequencyPerWeek);
    reasons.push("疲劳趋势或依从性提示需要降低本周训练负荷。");
  }

  if (typeof goals.minWeeklyFrequency === "number") {
    sessionsPerWeek = Math.max(sessionsPerWeek, goals.minWeeklyFrequency);
  }
  if (typeof goals.maxWeeklyFrequency === "number") {
    sessionsPerWeek = Math.min(sessionsPerWeek, goals.maxWeeklyFrequency);
  }

  return {
    sessionsPerWeek: clampRound(sessionsPerWeek, 1, 7),
    explanation: reasons.length > 0 ? reasons.join(" ") : "近期训练记录支持维持常规辅助训练频率。"
  };
}

function calculateDifficultyStartLevel(
  input: TrainingPrescriptionGenerationInput,
  config: TrainingPrescriptionRuleConfig,
  signals: PrescriptionSignals
): number {
  if (signals.isInitialStage || signals.fatigueConcern || signals.highReactionVariability) {
    return config.reducedDifficultyStartLevel;
  }

  if (signals.goodRecentPerformance && input.compliance.userFeedback !== "uncomfortable") {
    return config.elevatedDifficultyStartLevel;
  }

  return config.defaultDifficultyStartLevel;
}

function buildModuleCombination(input: {
  input: TrainingPrescriptionGenerationInput;
  config: TrainingPrescriptionRuleConfig;
  signals: PrescriptionSignals;
  sessionDurationMinutes: number;
  gameDifficultyStartLevel: number;
}): TrainingModuleCombinationItem[] {
  const candidates = new Map<TrainingPrescriptionModuleType, TrainingModuleCombinationItem>();
  const addModule = (
    moduleType: TrainingPrescriptionModuleType,
    priority: number,
    targetFocus: TrainingPrescriptionGoalFocus[],
    explanation: string
  ) => {
    const previous = candidates.get(moduleType);
    const item: TrainingModuleCombinationItem = {
      moduleType,
      displayName: moduleDisplayName(moduleType),
      priority: previous ? Math.min(previous.priority, priority) : priority,
      recommendedMinutes: input.config.moduleBaseMinutes[moduleType],
      difficultyStartLevel: moduleType === "music_relaxation" ? 1 : input.gameDifficultyStartLevel,
      targetFocus,
      explanation: previous ? `${previous.explanation} ${explanation}` : explanation
    };
    candidates.set(moduleType, item);
  };

  if (input.signals.highCommissionRate) {
    addModule(
      "go_no_go",
      1,
      ["inhibition_control"],
      "误按率较高，本周建议增加抑制控制类点击训练。"
    );
    addModule(
      "stop_signal",
      2,
      ["inhibition_control"],
      "可用停止信号任务辅助练习规则变化下的点击抑制。"
    );
  }

  if (input.signals.highOmissionRate) {
    addModule(
      "sustained_attention",
      1,
      ["attention_stability"],
      "漏按率较高，本周建议加强持续观察和目标响应训练。"
    );
  }

  if (input.signals.highReactionVariability) {
    addModule(
      "attention_training",
      2,
      ["attention_stability"],
      "反应时波动较大，建议降低任务复杂度并使用较稳定的目标探测训练。"
    );
  }

  for (const focus of input.input.therapistGoals.focusAreas) {
    for (const moduleType of modulesForFocus(focus)) {
      addModule(moduleType, 3, [focus], `治疗师目标包含 ${focus}，纳入对应辅助训练模块。`);
    }
  }

  for (const moduleType of input.input.therapistGoals.preferredModules ?? []) {
    addModule(moduleType, 2, [], "治疗师将该模块设为偏好训练模块。");
  }

  if (candidates.size === 0) {
    addModule(
      "attention_training",
      2,
      ["attention_stability"],
      "暂无明显偏向指标，采用基础注意训练作为本周主模块。"
    );
  }

  if (input.signals.fatigueConcern) {
    addModule(
      "music_relaxation",
      1,
      ["fatigue_management"],
      "疲劳趋势明显，建议加入低强度音乐恢复环节。"
    );
  }

  const maxModulesForDuration = Math.max(1, Math.floor(input.sessionDurationMinutes / 3));
  return normalizeModuleMinutes(
    [...candidates.values()]
      .sort((left, right) => left.priority - right.priority)
      .slice(0, Math.min(input.config.moduleLimit, maxModulesForDuration)),
    input.sessionDurationMinutes
  );
}

function normalizeModuleMinutes(
  modules: TrainingModuleCombinationItem[],
  sessionDurationMinutes: number
): TrainingModuleCombinationItem[] {
  const total = modules.reduce((sum, module) => sum + module.recommendedMinutes, 0);
  if (total <= sessionDurationMinutes || total === 0) {
    return modules;
  }

  return modules.map((module) => ({
    ...module,
    recommendedMinutes: Math.max(
      3,
      Math.round((module.recommendedMinutes / total) * sessionDurationMinutes)
    )
  }));
}

function buildMusicSuggestion(
  input: TrainingPrescriptionGenerationInput,
  signals: PrescriptionSignals
): MusicTherapyPrescriptionSuggestion {
  if (signals.fatigueConcern || input.compliance.userFeedback === "tired") {
    return {
      recommended: true,
      preferredTags: ["relax", "nature"],
      timing: "after_training",
      intensityLevel: 1,
      explanation: "疲劳趋势较明显，建议在训练后安排低强度放松或自然声素材。"
    };
  }

  if (signals.lowCompliance || input.compliance.userFeedback === "resistant") {
    return {
      recommended: true,
      preferredTags: ["custom", "nature"],
      timing: "before_training",
      intensityLevel: 1,
      explanation: "依从性偏低时可优先使用用户接受度较高、刺激较低的音乐作为进入训练的过渡。"
    };
  }

  if (input.therapistGoals.focusAreas.includes("rhythm_sync")) {
    return {
      recommended: true,
      preferredTags: ["rhythm"],
      timing: "between_modules",
      intensityLevel: 2,
      explanation: "训练目标包含节奏同步，可使用温和节律素材作为节律导航前的辅助准备。"
    };
  }

  return {
    recommended: true,
    preferredTags: ["focus", "relax"],
    timing: "before_training",
    intensityLevel: 2,
    explanation: "可使用低到中等强度音乐作为训练准备或结束过渡，并依据用户反馈调整。"
  };
}

function buildRiskReminders(
  input: TrainingPrescriptionGenerationInput,
  config: TrainingPrescriptionRuleConfig,
  signals: PrescriptionSignals
): TrainingPrescriptionRiskReminder[] {
  const reminders: TrainingPrescriptionRiskReminder[] = [];

  if (signals.fatigueConcern) {
    reminders.push({
      category: "training_load",
      severity: "watch",
      message: "疲劳趋势或疲劳自评偏高，本周建议降低训练强度并观察完成情况。",
      suggestedAction:
        "缩短单次时长，训练后记录疲劳反馈；如不适持续，应暂停训练并联系监护人或专业人员。"
    });
  }

  if (signals.dataQualityConcern) {
    reminders.push({
      category: "data_quality",
      severity: input.eegTrend.signalQualityStatus === "disconnected" ? "action_required" : "watch",
      message: "EEG数据质量不足，相关趋势只能作为有限参考。",
      suggestedAction: "训练前检查佩戴和连接，必要时使用无EEG模式并标记数据质量。"
    });
  }

  if (signals.highCommissionRate || signals.highOmissionRate) {
    reminders.push({
      category: "engagement",
      severity: "info",
      message: "近期漏按或误按较多，建议按目标分模块练习，不一次叠加过多规则。",
      suggestedAction: `误按阈值 ${formatRate(config.highCommissionRateAtOrAbove)}，漏按阈值 ${formatRate(
        config.highOmissionRateAtOrAbove
      )}，本周按对应模块分段训练。`
    });
  }

  if (signals.lowCompliance) {
    reminders.push({
      category: "comfort",
      severity: "watch",
      message: "近期依从性偏低，训练安排应更短、更稳定，并优先使用用户接受度较高的模块。",
      suggestedAction: "降低单次时长，记录拒绝或中断原因，避免强迫连续训练。"
    });
  }

  return reminders;
}

function buildNextWeekSuggestions(
  input: TrainingPrescriptionGenerationInput,
  signals: PrescriptionSignals
): string[] {
  const suggestions: string[] = [
    "下周继续依据完成率、正确率、漏按率、误按率、反应时波动和疲劳趋势做小步调整。"
  ];

  if (signals.fatigueConcern) {
    suggestions.push("如果疲劳趋势下降且完成率稳定，可每次增加 2-3 分钟；否则继续保持低强度。");
  }
  if (signals.highCommissionRate) {
    suggestions.push("若误按率下降，可逐步增加Go/No-Go或Stop-Signal的规则变化比例。");
  }
  if (signals.highOmissionRate) {
    suggestions.push("若漏按率下降，可逐步延长持续注意任务时长或降低目标出现频率。");
  }
  if (signals.highReactionVariability) {
    suggestions.push("若反应时波动仍较大，下周继续降低任务复杂度，避免同时增加多个难度参数。");
  }
  if (input.eegTrend.signalQualityStatus !== "good") {
    suggestions.push("下周优先改善EEG佩戴和连接质量，再比较EEG趋势变化。");
  }

  return suggestions;
}

function buildPrescriptionExplanation(input: {
  input: TrainingPrescriptionGenerationInput;
  signals: PrescriptionSignals;
  weeklyTrainingFrequency: number;
  sessionDurationMinutes: number;
  gameDifficultyStartLevel: number;
}): string {
  const reasons: string[] = [];

  if (input.signals.isInitialStage) {
    reasons.push("当前处于初期训练阶段，单次训练时长控制在较短范围。");
  }
  if (input.signals.fatigueConcern) {
    reasons.push("疲劳趋势提示需要降低训练负荷。");
  }
  if (input.signals.highCommissionRate) {
    reasons.push("误按率较高，因此增加抑制控制训练建议。");
  }
  if (input.signals.highOmissionRate) {
    reasons.push("漏按率较高，因此增加持续注意训练建议。");
  }
  if (input.signals.highReactionVariability) {
    reasons.push("反应时波动较大，因此降低任务复杂度和难度起点。");
  }

  const reasonText =
    reasons.length > 0 ? reasons.join(" ") : "近期记录支持维持温和、稳定的训练安排。";

  return `${reasonText} 建议每周 ${input.weeklyTrainingFrequency} 次，每次约 ${input.sessionDurationMinutes} 分钟，游戏难度从 ${input.gameDifficultyStartLevel} 级开始。`;
}

function modulesForFocus(focus: TrainingPrescriptionGoalFocus): TrainingPrescriptionModuleType[] {
  switch (focus) {
    case "attention_stability":
      return ["attention_training", "sustained_attention"];
    case "inhibition_control":
      return ["go_no_go", "stop_signal"];
    case "working_memory":
      return ["rhythm_navigation"];
    case "rhythm_sync":
      return ["rhythm_navigation", "music_relaxation"];
    case "fatigue_management":
    case "emotional_regulation":
      return ["music_relaxation"];
  }
}

function moduleDisplayName(moduleType: TrainingPrescriptionModuleType): string {
  switch (moduleType) {
    case "music_relaxation":
      return "音乐疗愈";
    case "attention_training":
      return "目标探测注意训练";
    case "sustained_attention":
      return "持续注意训练";
    case "go_no_go":
      return "Go/No-Go点击反应训练";
    case "stop_signal":
      return "Stop-Signal反应抑制训练";
    case "rhythm_navigation":
      return "节律导航训练";
  }
}

function validateInput(input: TrainingPrescriptionGenerationInput): void {
  if (input.userId.trim().length === 0) {
    throw new TrainingPrescriptionGeneratorError("INVALID_INPUT", "userId is required.");
  }
  validateScore(
    input.baselineAssessment.focusSelfRating,
    "baselineAssessment.focusSelfRating",
    1,
    5
  );
  validateScore(
    input.baselineAssessment.fatigueSelfRating,
    "baselineAssessment.fatigueSelfRating",
    1,
    5
  );
  validateRate(input.compliance.completionRate, "compliance.completionRate");
  validateNonNegativeInteger(
    input.recentWeekTraining.plannedSessionCount,
    "recentWeekTraining.plannedSessionCount"
  );
  validateNonNegativeInteger(
    input.recentWeekTraining.completedSessionCount,
    "recentWeekTraining.completedSessionCount"
  );
  validateOptionalRate(
    input.recentWeekTraining.averageAccuracyRate,
    "recentWeekTraining.averageAccuracyRate"
  );
  validateOptionalRate(input.recentWeekTraining.omissionRate, "recentWeekTraining.omissionRate");
  validateOptionalRate(
    input.recentWeekTraining.commissionRate,
    "recentWeekTraining.commissionRate"
  );
  validateOptionalRate(
    input.recentWeekTraining.averageCompletionRate,
    "recentWeekTraining.averageCompletionRate"
  );
  validateOptionalPositive(
    input.recentWeekTraining.averageReactionTimeMs,
    "recentWeekTraining.averageReactionTimeMs"
  );
  validateOptionalPositive(
    input.recentWeekTraining.reactionTimeVariabilityMs,
    "recentWeekTraining.reactionTimeVariabilityMs"
  );
  validateOptionalScore(
    input.eegTrend.averageAttentionIndex,
    "eegTrend.averageAttentionIndex",
    0,
    100
  );
  validateOptionalScore(input.eegTrend.averageFatigueIndex, "eegTrend.averageFatigueIndex", 0, 100);
  validateOptionalRate(input.eegTrend.validSampleRate, "eegTrend.validSampleRate");
}

function validateRuleConfig(config: TrainingPrescriptionRuleConfig): void {
  validatePositive(config.initialCompletedSessionThreshold, "initialCompletedSessionThreshold");
  validatePositive(config.initialFrequencyPerWeek, "initialFrequencyPerWeek");
  validatePositive(config.standardFrequencyPerWeek, "standardFrequencyPerWeek");
  validatePositive(config.reducedFrequencyPerWeek, "reducedFrequencyPerWeek");
  validatePositive(config.initialMaxSessionDurationMinutes, "initialMaxSessionDurationMinutes");
  validatePositive(config.standardSessionDurationMinutes, "standardSessionDurationMinutes");
  validatePositive(config.minimumSessionDurationMinutes, "minimumSessionDurationMinutes");
  validatePositive(config.maximumSessionDurationMinutes, "maximumSessionDurationMinutes");
  if (config.minimumSessionDurationMinutes > config.maximumSessionDurationMinutes) {
    throw new TrainingPrescriptionGeneratorError(
      "INVALID_RULE_CONFIG",
      "minimumSessionDurationMinutes must be less than or equal to maximumSessionDurationMinutes."
    );
  }
  validateRate(config.highCommissionRateAtOrAbove, "highCommissionRateAtOrAbove");
  validateRate(config.highOmissionRateAtOrAbove, "highOmissionRateAtOrAbove");
  validateRate(config.lowComplianceRateAtOrBelow, "lowComplianceRateAtOrBelow");
  validateRate(config.lowCompletionRateAtOrBelow, "lowCompletionRateAtOrBelow");
}

function validateOptionalRate(value: number | undefined, fieldName: string): void {
  if (value === undefined) {
    return;
  }
  validateRate(value, fieldName);
}

function validateOptionalPositive(value: number | undefined, fieldName: string): void {
  if (value === undefined) {
    return;
  }
  validateFinite(value, fieldName, "INVALID_INPUT");
  if (value <= 0) {
    throw new TrainingPrescriptionGeneratorError("INVALID_INPUT", `${fieldName} must be positive.`);
  }
}

function validateOptionalScore(
  value: number | undefined,
  fieldName: string,
  min: number,
  max: number
): void {
  if (value === undefined) {
    return;
  }
  validateScore(value, fieldName, min, max);
}

function validateRate(value: number, fieldName: string): void {
  validateFinite(value, fieldName, "INVALID_INPUT");
  if (value < 0 || value > 1) {
    throw new TrainingPrescriptionGeneratorError(
      "INVALID_INPUT",
      `${fieldName} must be between 0 and 1.`
    );
  }
}

function validateScore(value: number, fieldName: string, min: number, max: number): void {
  validateFinite(value, fieldName, "INVALID_INPUT");
  if (value < min || value > max) {
    throw new TrainingPrescriptionGeneratorError(
      "INVALID_INPUT",
      `${fieldName} must be between ${min} and ${max}.`
    );
  }
}

function validatePositive(value: number, fieldName: string): void {
  validateFinite(value, fieldName, "INVALID_RULE_CONFIG");
  if (value <= 0) {
    throw new TrainingPrescriptionGeneratorError(
      "INVALID_RULE_CONFIG",
      `${fieldName} must be positive.`
    );
  }
}

function validateNonNegativeInteger(value: number, fieldName: string): void {
  validateFinite(value, fieldName, "INVALID_INPUT");
  if (!Number.isInteger(value) || value < 0) {
    throw new TrainingPrescriptionGeneratorError(
      "INVALID_INPUT",
      `${fieldName} must be a non-negative integer.`
    );
  }
}

function validateFinite(
  value: number,
  fieldName: string,
  code: TrainingPrescriptionGeneratorErrorCode
): void {
  if (!Number.isFinite(value)) {
    throw new TrainingPrescriptionGeneratorError(code, `${fieldName} must be a finite number.`);
  }
}

function formatRate(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function clampRound(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)));
}
