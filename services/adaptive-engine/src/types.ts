import type {
  AdaptiveDifficultyDirection,
  AdaptiveDifficultyEvaluationInput,
  AdaptiveDifficultyRecommendation,
  AdaptiveMusicUseSuggestion,
  AdaptiveRuleExplanation,
  AdaptiveSubjectiveFeedback,
  EEGQualityStatus
} from "@neuro-cog-rehab/shared-types";

export type {
  AdaptiveDifficultyDirection,
  AdaptiveDifficultyEvaluationInput,
  AdaptiveDifficultyRecommendation,
  AdaptiveMusicUseSuggestion,
  AdaptiveRuleExplanation,
  AdaptiveSubjectiveFeedback
};

export interface AdaptiveNumericRange {
  min: number;
  max: number;
}

export interface AdaptiveTimedRange extends AdaptiveNumericRange {
  /** Default value used at the middle of the difficulty range. */
  base: number;
  /** Amount adjusted for each difficulty level. */
  step: number;
}

export interface AdaptiveDifficultyRuleConfig {
  minDifficultyLevel: number;
  maxDifficultyLevel: number;
  stepSize: number;
  accuracy: {
    increaseAtOrAbove: number;
    decreaseAtOrBelow: number;
  };
  omissionRate: {
    maxForIncrease: number;
    decreaseAtOrAbove: number;
  };
  commissionRate: {
    maxForIncrease: number;
    decreaseAtOrAbove: number;
  };
  reactionTime: {
    targetMs: number;
    slowAtOrAboveMs: number;
  };
  reactionVariability: {
    stableAtOrBelowMs: number;
    highAtOrAboveMs: number;
  };
  eeg: {
    attentionIncreaseAtOrAbove: number;
    attentionDecreaseAtOrBelow: number;
    fatigueDecreaseAtOrAbove: number;
    fatiguePauseAtOrAbove: number;
    qualityStatusesForPause: EEGQualityStatus[];
    qualityStatusesBlockingIncrease: EEGQualityStatus[];
  };
  subjectiveFeedback: {
    pauseValues: AdaptiveSubjectiveFeedback[];
    decreaseValues: AdaptiveSubjectiveFeedback[];
    increaseValues: AdaptiveSubjectiveFeedback[];
  };
  output: {
    targetPresentationTimeMs: AdaptiveTimedRange;
    distractorCount: AdaptiveTimedRange;
    stimulusIntervalMs: AdaptiveTimedRange;
    durationSeconds: AdaptiveTimedRange;
  };
}

export type AdaptiveRuleConfigOverrides = Partial<{
  minDifficultyLevel: number;
  maxDifficultyLevel: number;
  stepSize: number;
  accuracy: Partial<AdaptiveDifficultyRuleConfig["accuracy"]>;
  omissionRate: Partial<AdaptiveDifficultyRuleConfig["omissionRate"]>;
  commissionRate: Partial<AdaptiveDifficultyRuleConfig["commissionRate"]>;
  reactionTime: Partial<AdaptiveDifficultyRuleConfig["reactionTime"]>;
  reactionVariability: Partial<AdaptiveDifficultyRuleConfig["reactionVariability"]>;
  eeg: Partial<AdaptiveDifficultyRuleConfig["eeg"]>;
  subjectiveFeedback: Partial<AdaptiveDifficultyRuleConfig["subjectiveFeedback"]>;
  output: Partial<{
    targetPresentationTimeMs: Partial<AdaptiveTimedRange>;
    distractorCount: Partial<AdaptiveTimedRange>;
    stimulusIntervalMs: Partial<AdaptiveTimedRange>;
    durationSeconds: Partial<AdaptiveTimedRange>;
  }>;
}>;
