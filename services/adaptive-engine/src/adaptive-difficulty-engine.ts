import type {
  AdaptiveDifficultyDirection,
  AdaptiveDifficultyEvaluationInput,
  AdaptiveDifficultyRecommendation,
  AdaptiveMusicUseSuggestion,
  AdaptiveRuleExplanation
} from "@neuro-cog-rehab/shared-types";

import type { AdaptiveDifficultyRuleConfig, AdaptiveRuleConfigOverrides } from "./types.js";

export type AdaptiveDifficultyEngineErrorCode = "INVALID_INPUT" | "INVALID_RULE_CONFIG";

export class AdaptiveDifficultyEngineError extends Error {
  constructor(
    public readonly code: AdaptiveDifficultyEngineErrorCode,
    message: string
  ) {
    super(message);
    this.name = "AdaptiveDifficultyEngineError";
  }
}

export const DEFAULT_ADAPTIVE_DIFFICULTY_RULE_CONFIG: AdaptiveDifficultyRuleConfig = {
  minDifficultyLevel: 1,
  maxDifficultyLevel: 5,
  stepSize: 1,
  accuracy: {
    increaseAtOrAbove: 0.85,
    decreaseAtOrBelow: 0.62
  },
  omissionRate: {
    maxForIncrease: 0.08,
    decreaseAtOrAbove: 0.18
  },
  commissionRate: {
    maxForIncrease: 0.08,
    decreaseAtOrAbove: 0.16
  },
  reactionTime: {
    targetMs: 750,
    slowAtOrAboveMs: 1050
  },
  reactionVariability: {
    stableAtOrBelowMs: 180,
    highAtOrAboveMs: 360
  },
  eeg: {
    attentionIncreaseAtOrAbove: 65,
    attentionDecreaseAtOrBelow: 42,
    fatigueDecreaseAtOrAbove: 65,
    fatiguePauseAtOrAbove: 78,
    qualityStatusesForPause: ["noisy", "disconnected"],
    qualityStatusesBlockingIncrease: ["unstable", "noisy", "disconnected"]
  },
  subjectiveFeedback: {
    pauseValues: ["tired", "uncomfortable"],
    decreaseValues: ["too_hard"],
    increaseValues: ["too_easy"]
  },
  output: {
    targetPresentationTimeMs: {
      min: 700,
      max: 1800,
      base: 1400,
      step: 220
    },
    distractorCount: {
      min: 1,
      max: 10,
      base: 3,
      step: 2
    },
    stimulusIntervalMs: {
      min: 550,
      max: 1800,
      base: 1300,
      step: 230
    },
    durationSeconds: {
      min: 120,
      max: 480,
      base: 180,
      step: 60
    }
  }
};

export function buildAdaptiveDifficultyRuleConfig(
  overrides: AdaptiveRuleConfigOverrides = {}
): AdaptiveDifficultyRuleConfig {
  const base = DEFAULT_ADAPTIVE_DIFFICULTY_RULE_CONFIG;
  const rules: AdaptiveDifficultyRuleConfig = {
    minDifficultyLevel: overrides.minDifficultyLevel ?? base.minDifficultyLevel,
    maxDifficultyLevel: overrides.maxDifficultyLevel ?? base.maxDifficultyLevel,
    stepSize: overrides.stepSize ?? base.stepSize,
    accuracy: {
      ...base.accuracy,
      ...overrides.accuracy
    },
    omissionRate: {
      ...base.omissionRate,
      ...overrides.omissionRate
    },
    commissionRate: {
      ...base.commissionRate,
      ...overrides.commissionRate
    },
    reactionTime: {
      ...base.reactionTime,
      ...overrides.reactionTime
    },
    reactionVariability: {
      ...base.reactionVariability,
      ...overrides.reactionVariability
    },
    eeg: {
      ...base.eeg,
      ...overrides.eeg,
      qualityStatusesForPause: overrides.eeg?.qualityStatusesForPause ?? [
        ...base.eeg.qualityStatusesForPause
      ],
      qualityStatusesBlockingIncrease: overrides.eeg?.qualityStatusesBlockingIncrease ?? [
        ...base.eeg.qualityStatusesBlockingIncrease
      ]
    },
    subjectiveFeedback: {
      ...base.subjectiveFeedback,
      ...overrides.subjectiveFeedback,
      pauseValues: overrides.subjectiveFeedback?.pauseValues ?? [
        ...base.subjectiveFeedback.pauseValues
      ],
      decreaseValues: overrides.subjectiveFeedback?.decreaseValues ?? [
        ...base.subjectiveFeedback.decreaseValues
      ],
      increaseValues: overrides.subjectiveFeedback?.increaseValues ?? [
        ...base.subjectiveFeedback.increaseValues
      ]
    },
    output: {
      targetPresentationTimeMs: {
        ...base.output.targetPresentationTimeMs,
        ...overrides.output?.targetPresentationTimeMs
      },
      distractorCount: {
        ...base.output.distractorCount,
        ...overrides.output?.distractorCount
      },
      stimulusIntervalMs: {
        ...base.output.stimulusIntervalMs,
        ...overrides.output?.stimulusIntervalMs
      },
      durationSeconds: {
        ...base.output.durationSeconds,
        ...overrides.output?.durationSeconds
      }
    }
  };

  validateRuleConfig(rules);
  return rules;
}

export function evaluateAdaptiveDifficulty(
  input: AdaptiveDifficultyEvaluationInput,
  overrides: AdaptiveRuleConfigOverrides = {}
): AdaptiveDifficultyRecommendation {
  const rules = buildAdaptiveDifficultyRuleConfig(overrides);
  validateInput(input, rules);

  const pauseReasons = buildPauseReasons(input, rules);
  const decreaseReasons = buildDecreaseReasons(input, rules);
  const increaseReasons = buildIncreaseReasons(input, rules);
  const direction = selectDirection({
    pauseReasons,
    decreaseReasons,
    increaseReasons
  });
  const nextDifficultyLevel = calculateNextDifficultyLevel({
    currentDifficultyLevel: input.currentDifficultyLevel,
    direction,
    rules
  });
  const shouldPause = direction === "pause";
  const output = buildOutputSuggestion({
    nextDifficultyLevel,
    direction,
    input,
    rules
  });
  const musicUseSuggestion = selectMusicUseSuggestion(input, direction, rules);
  const ruleExplanations = buildRuleExplanations({
    input,
    rules,
    pauseReasons,
    decreaseReasons,
    increaseReasons,
    direction
  });

  return {
    nextDifficultyLevel,
    targetPresentationTimeMs: output.targetPresentationTimeMs,
    distractorCount: output.distractorCount,
    stimulusIntervalMs: output.stimulusIntervalMs,
    recommendedDurationSeconds: output.recommendedDurationSeconds,
    musicUseSuggestion,
    shouldPause,
    direction,
    explanation: buildSummaryExplanation({
      direction,
      shouldPause,
      nextDifficultyLevel,
      output,
      musicUseSuggestion,
      ruleExplanations
    }),
    ruleExplanations,
    inputSummary: { ...input }
  };
}

function selectDirection(input: {
  pauseReasons: string[];
  decreaseReasons: string[];
  increaseReasons: string[];
}): AdaptiveDifficultyDirection {
  if (input.pauseReasons.length > 0) {
    return "pause";
  }
  if (input.decreaseReasons.length > 0) {
    return "decrease";
  }
  if (input.increaseReasons.length > 0) {
    return "increase";
  }
  return "maintain";
}

function buildPauseReasons(
  input: AdaptiveDifficultyEvaluationInput,
  rules: AdaptiveDifficultyRuleConfig
): string[] {
  const reasons: string[] = [];

  if (rules.eeg.qualityStatusesForPause.includes(input.eegQualityStatus)) {
    reasons.push(`EEG信号质量为 ${input.eegQualityStatus}，先暂停或调整设备更稳妥。`);
  }
  if (input.eegFatigueIndex >= rules.eeg.fatiguePauseAtOrAbove) {
    reasons.push(
      `EEG疲劳指数 ${input.eegFatigueIndex} 达到暂停阈值 ${rules.eeg.fatiguePauseAtOrAbove}。`
    );
  }
  if (rules.subjectiveFeedback.pauseValues.includes(input.subjectiveFeedback)) {
    reasons.push(`用户主观反馈为 ${input.subjectiveFeedback}，建议先降低训练负荷。`);
  }

  return reasons;
}

function buildDecreaseReasons(
  input: AdaptiveDifficultyEvaluationInput,
  rules: AdaptiveDifficultyRuleConfig
): string[] {
  const reasons: string[] = [];

  if (input.recentAccuracyRate <= rules.accuracy.decreaseAtOrBelow) {
    reasons.push(
      `最近正确率 ${formatRate(input.recentAccuracyRate)} 低于降级阈值 ${formatRate(
        rules.accuracy.decreaseAtOrBelow
      )}。`
    );
  }
  if (input.omissionRate >= rules.omissionRate.decreaseAtOrAbove) {
    reasons.push(
      `漏按率 ${formatRate(input.omissionRate)} 达到关注阈值 ${formatRate(
        rules.omissionRate.decreaseAtOrAbove
      )}。`
    );
  }
  if (input.commissionRate >= rules.commissionRate.decreaseAtOrAbove) {
    reasons.push(
      `误按率 ${formatRate(input.commissionRate)} 达到关注阈值 ${formatRate(
        rules.commissionRate.decreaseAtOrAbove
      )}。`
    );
  }
  if (input.averageReactionTimeMs >= rules.reactionTime.slowAtOrAboveMs) {
    reasons.push(
      `平均反应时 ${Math.round(input.averageReactionTimeMs)}ms 高于放慢阈值 ${
        rules.reactionTime.slowAtOrAboveMs
      }ms。`
    );
  }
  if (input.reactionTimeVariabilityMs >= rules.reactionVariability.highAtOrAboveMs) {
    reasons.push(
      `反应时波动 ${Math.round(input.reactionTimeVariabilityMs)}ms 高于波动阈值 ${
        rules.reactionVariability.highAtOrAboveMs
      }ms。`
    );
  }
  if (input.eegAttentionIndex <= rules.eeg.attentionDecreaseAtOrBelow) {
    reasons.push(
      `EEG注意指数 ${input.eegAttentionIndex} 低于下调参考阈值 ${rules.eeg.attentionDecreaseAtOrBelow}。`
    );
  }
  if (input.eegFatigueIndex >= rules.eeg.fatigueDecreaseAtOrAbove) {
    reasons.push(
      `EEG疲劳指数 ${input.eegFatigueIndex} 高于下调参考阈值 ${rules.eeg.fatigueDecreaseAtOrAbove}。`
    );
  }
  if (rules.subjectiveFeedback.decreaseValues.includes(input.subjectiveFeedback)) {
    reasons.push(`用户主观反馈为 ${input.subjectiveFeedback}，优先降低下一轮负荷。`);
  }

  return reasons;
}

function buildIncreaseReasons(
  input: AdaptiveDifficultyEvaluationInput,
  rules: AdaptiveDifficultyRuleConfig
): string[] {
  const reasons: string[] = [];
  const qualityAllowsIncrease = !rules.eeg.qualityStatusesBlockingIncrease.includes(
    input.eegQualityStatus
  );
  const performanceStable =
    input.recentAccuracyRate >= rules.accuracy.increaseAtOrAbove &&
    input.omissionRate <= rules.omissionRate.maxForIncrease &&
    input.commissionRate <= rules.commissionRate.maxForIncrease &&
    input.averageReactionTimeMs <= rules.reactionTime.targetMs &&
    input.reactionTimeVariabilityMs <= rules.reactionVariability.stableAtOrBelowMs &&
    input.eegAttentionIndex >= rules.eeg.attentionIncreaseAtOrAbove &&
    input.eegFatigueIndex < rules.eeg.fatigueDecreaseAtOrAbove &&
    qualityAllowsIncrease;

  if (performanceStable) {
    reasons.push(`正确率、漏按率、误按率、反应时、EEG注意指数和疲劳指数均处于可上调范围。`);
  }
  if (
    performanceStable &&
    rules.subjectiveFeedback.increaseValues.includes(input.subjectiveFeedback)
  ) {
    reasons.push(`用户主观反馈为 ${input.subjectiveFeedback}，可在边界内小步上调。`);
  }

  return reasons;
}

function calculateNextDifficultyLevel(input: {
  currentDifficultyLevel: number;
  direction: AdaptiveDifficultyDirection;
  rules: AdaptiveDifficultyRuleConfig;
}): number {
  const normalizedCurrent = clamp(
    Math.round(input.currentDifficultyLevel),
    input.rules.minDifficultyLevel,
    input.rules.maxDifficultyLevel
  );

  if (input.direction === "increase") {
    return clamp(
      normalizedCurrent + input.rules.stepSize,
      input.rules.minDifficultyLevel,
      input.rules.maxDifficultyLevel
    );
  }
  if (input.direction === "decrease" || input.direction === "pause") {
    return clamp(
      normalizedCurrent - input.rules.stepSize,
      input.rules.minDifficultyLevel,
      input.rules.maxDifficultyLevel
    );
  }

  return normalizedCurrent;
}

function buildOutputSuggestion(input: {
  nextDifficultyLevel: number;
  direction: AdaptiveDifficultyDirection;
  input: AdaptiveDifficultyEvaluationInput;
  rules: AdaptiveDifficultyRuleConfig;
}): {
  targetPresentationTimeMs: number;
  distractorCount: number;
  stimulusIntervalMs: number;
  recommendedDurationSeconds: number;
} {
  const levelOffset = input.nextDifficultyLevel - input.rules.minDifficultyLevel;
  const presentation = input.rules.output.targetPresentationTimeMs;
  const distractors = input.rules.output.distractorCount;
  const interval = input.rules.output.stimulusIntervalMs;
  const duration = input.rules.output.durationSeconds;
  const fatigueAdjustment =
    input.input.eegFatigueIndex >= input.rules.eeg.fatigueDecreaseAtOrAbove ? duration.step : 0;

  return {
    targetPresentationTimeMs: clampRound(
      presentation.max - levelOffset * presentation.step,
      presentation.min,
      presentation.max
    ),
    distractorCount: clampRound(
      distractors.min + levelOffset * distractors.step,
      distractors.min,
      distractors.max
    ),
    stimulusIntervalMs: clampRound(
      interval.max - levelOffset * interval.step,
      interval.min,
      interval.max
    ),
    recommendedDurationSeconds:
      input.direction === "pause"
        ? duration.min
        : clampRound(
            duration.base + levelOffset * duration.step - fatigueAdjustment,
            duration.min,
            duration.max
          )
  };
}

function selectMusicUseSuggestion(
  input: AdaptiveDifficultyEvaluationInput,
  direction: AdaptiveDifficultyDirection,
  rules: AdaptiveDifficultyRuleConfig
): AdaptiveMusicUseSuggestion {
  if (direction === "pause" || input.subjectiveFeedback === "uncomfortable") {
    return "reduce_stimulation";
  }
  if (
    direction === "decrease" ||
    input.eegFatigueIndex >= rules.eeg.fatigueDecreaseAtOrAbove ||
    input.subjectiveFeedback === "tired"
  ) {
    return "calming_recovery";
  }
  if (direction === "increase" && input.eegAttentionIndex >= rules.eeg.attentionIncreaseAtOrAbove) {
    return "optional_focus_support";
  }

  return "none";
}

function buildRuleExplanations(input: {
  input: AdaptiveDifficultyEvaluationInput;
  rules: AdaptiveDifficultyRuleConfig;
  pauseReasons: string[];
  decreaseReasons: string[];
  increaseReasons: string[];
  direction: AdaptiveDifficultyDirection;
}): AdaptiveRuleExplanation[] {
  const qualityPause = input.rules.eeg.qualityStatusesForPause.includes(
    input.input.eegQualityStatus
  );
  const fatiguePause = input.input.eegFatigueIndex >= input.rules.eeg.fatiguePauseAtOrAbove;
  const subjectivePause = input.rules.subjectiveFeedback.pauseValues.includes(
    input.input.subjectiveFeedback
  );

  return [
    {
      ruleId: "safety.pause_boundary",
      triggered: qualityPause || fatiguePause || subjectivePause,
      direction: "pause",
      message:
        input.pauseReasons[0] ?? "EEG信号、疲劳指数和主观反馈未触发暂停边界，训练可继续评估。"
    },
    {
      ruleId: "performance.decrease_boundary",
      triggered: input.direction === "decrease",
      direction: "decrease",
      message: input.decreaseReasons[0] ?? "正确率、漏按率、误按率和反应时未触发降级边界。"
    },
    {
      ruleId: "performance.increase_boundary",
      triggered: input.direction === "increase",
      direction: "increase",
      message: input.increaseReasons[0] ?? "表现尚未同时满足小步上调条件，因此不会自动提高难度。"
    },
    {
      ruleId: "output.parameter_mapping",
      triggered: true,
      direction: input.direction,
      message: "输出参数由下一轮难度等级映射，并受最小/最大边界限制。"
    }
  ];
}

function buildSummaryExplanation(input: {
  direction: AdaptiveDifficultyDirection;
  shouldPause: boolean;
  nextDifficultyLevel: number;
  output: {
    targetPresentationTimeMs: number;
    distractorCount: number;
    stimulusIntervalMs: number;
    recommendedDurationSeconds: number;
  };
  musicUseSuggestion: AdaptiveMusicUseSuggestion;
  ruleExplanations: AdaptiveRuleExplanation[];
}): string {
  const triggeredReasons = input.ruleExplanations
    .filter((rule) => rule.triggered && rule.ruleId !== "output.parameter_mapping")
    .map((rule) => rule.message);
  const reasonText =
    triggeredReasons.length > 0 ? triggeredReasons.join(" ") : "未触发升降级或暂停边界。";

  return [
    `建议方向：${input.direction}。`,
    `下一轮难度等级为 ${input.nextDifficultyLevel}。`,
    `目标呈现 ${input.output.targetPresentationTimeMs}ms，干扰物 ${input.output.distractorCount} 个，刺激间隔 ${input.output.stimulusIntervalMs}ms，建议时长 ${input.output.recommendedDurationSeconds}s。`,
    `音乐建议：${input.musicUseSuggestion}。`,
    input.shouldPause ? "建议先暂停当前训练并做状态确认。" : "不建议暂停，可按建议参数进入下一轮。",
    reasonText
  ].join(" ");
}

function validateInput(
  input: AdaptiveDifficultyEvaluationInput,
  rules: AdaptiveDifficultyRuleConfig
): void {
  validateFiniteNumber(input.currentDifficultyLevel, "currentDifficultyLevel", "INVALID_INPUT");
  if (
    input.currentDifficultyLevel < rules.minDifficultyLevel ||
    input.currentDifficultyLevel > rules.maxDifficultyLevel
  ) {
    throw new AdaptiveDifficultyEngineError(
      "INVALID_INPUT",
      "currentDifficultyLevel must be within configured difficulty bounds."
    );
  }
  validateRate(input.recentAccuracyRate, "recentAccuracyRate");
  validateRate(input.omissionRate, "omissionRate");
  validateRate(input.commissionRate, "commissionRate");
  validatePositiveNumber(input.averageReactionTimeMs, "averageReactionTimeMs", "INVALID_INPUT");
  validatePositiveNumber(
    input.reactionTimeVariabilityMs,
    "reactionTimeVariabilityMs",
    "INVALID_INPUT"
  );
  validateScore(input.eegAttentionIndex, "eegAttentionIndex");
  validateScore(input.eegFatigueIndex, "eegFatigueIndex");
}

function validateRuleConfig(rules: AdaptiveDifficultyRuleConfig): void {
  validatePositiveNumber(rules.minDifficultyLevel, "minDifficultyLevel", "INVALID_RULE_CONFIG");
  validatePositiveNumber(rules.maxDifficultyLevel, "maxDifficultyLevel", "INVALID_RULE_CONFIG");
  validatePositiveNumber(rules.stepSize, "stepSize", "INVALID_RULE_CONFIG");
  if (rules.minDifficultyLevel > rules.maxDifficultyLevel) {
    throw new AdaptiveDifficultyEngineError(
      "INVALID_RULE_CONFIG",
      "minDifficultyLevel must be less than or equal to maxDifficultyLevel."
    );
  }
  validateRate(rules.accuracy.increaseAtOrAbove, "accuracy.increaseAtOrAbove");
  validateRate(rules.accuracy.decreaseAtOrBelow, "accuracy.decreaseAtOrBelow");
  validateRate(rules.omissionRate.maxForIncrease, "omissionRate.maxForIncrease");
  validateRate(rules.omissionRate.decreaseAtOrAbove, "omissionRate.decreaseAtOrAbove");
  validateRate(rules.commissionRate.maxForIncrease, "commissionRate.maxForIncrease");
  validateRate(rules.commissionRate.decreaseAtOrAbove, "commissionRate.decreaseAtOrAbove");
  validatePositiveNumber(
    rules.reactionTime.targetMs,
    "reactionTime.targetMs",
    "INVALID_RULE_CONFIG"
  );
  validatePositiveNumber(
    rules.reactionTime.slowAtOrAboveMs,
    "reactionTime.slowAtOrAboveMs",
    "INVALID_RULE_CONFIG"
  );
  validatePositiveNumber(
    rules.reactionVariability.stableAtOrBelowMs,
    "reactionVariability.stableAtOrBelowMs",
    "INVALID_RULE_CONFIG"
  );
  validatePositiveNumber(
    rules.reactionVariability.highAtOrAboveMs,
    "reactionVariability.highAtOrAboveMs",
    "INVALID_RULE_CONFIG"
  );
  validateScore(rules.eeg.attentionIncreaseAtOrAbove, "eeg.attentionIncreaseAtOrAbove");
  validateScore(rules.eeg.attentionDecreaseAtOrBelow, "eeg.attentionDecreaseAtOrBelow");
  validateScore(rules.eeg.fatigueDecreaseAtOrAbove, "eeg.fatigueDecreaseAtOrAbove");
  validateScore(rules.eeg.fatiguePauseAtOrAbove, "eeg.fatiguePauseAtOrAbove");
  validateTimedRange(rules.output.targetPresentationTimeMs, "output.targetPresentationTimeMs");
  validateTimedRange(rules.output.distractorCount, "output.distractorCount");
  validateTimedRange(rules.output.stimulusIntervalMs, "output.stimulusIntervalMs");
  validateTimedRange(rules.output.durationSeconds, "output.durationSeconds");
}

function validateTimedRange(
  range: { min: number; max: number; base: number; step: number },
  fieldName: string
): void {
  validatePositiveNumber(range.min, `${fieldName}.min`, "INVALID_RULE_CONFIG");
  validatePositiveNumber(range.max, `${fieldName}.max`, "INVALID_RULE_CONFIG");
  validatePositiveNumber(range.base, `${fieldName}.base`, "INVALID_RULE_CONFIG");
  validatePositiveNumber(range.step, `${fieldName}.step`, "INVALID_RULE_CONFIG");
  if (range.min > range.max) {
    throw new AdaptiveDifficultyEngineError(
      "INVALID_RULE_CONFIG",
      `${fieldName}.min must be less than or equal to ${fieldName}.max.`
    );
  }
}

function validateRate(value: number, fieldName: string): void {
  validateFiniteNumber(value, fieldName, "INVALID_INPUT");
  if (value < 0 || value > 1) {
    throw new AdaptiveDifficultyEngineError(
      "INVALID_INPUT",
      `${fieldName} must be between 0 and 1.`
    );
  }
}

function validateScore(value: number, fieldName: string): void {
  validateFiniteNumber(value, fieldName, "INVALID_INPUT");
  if (value < 0 || value > 100) {
    throw new AdaptiveDifficultyEngineError(
      "INVALID_INPUT",
      `${fieldName} must be between 0 and 100.`
    );
  }
}

function validatePositiveNumber(
  value: number,
  fieldName: string,
  code: AdaptiveDifficultyEngineErrorCode
): void {
  validateFiniteNumber(value, fieldName, code);
  if (value <= 0) {
    throw new AdaptiveDifficultyEngineError(code, `${fieldName} must be greater than 0.`);
  }
}

function validateFiniteNumber(
  value: number,
  fieldName: string,
  code: AdaptiveDifficultyEngineErrorCode
): void {
  if (!Number.isFinite(value)) {
    throw new AdaptiveDifficultyEngineError(code, `${fieldName} must be a finite number.`);
  }
}

function formatRate(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function clampRound(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
