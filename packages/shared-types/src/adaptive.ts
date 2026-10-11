import type { TrainingType } from "./training.js";
import type { EEGQualityStatus } from "./eeg.js";

/**
 * Configuration for bounded adaptive difficulty. It suggests training intensity
 * changes but does not make clinical claims.
 */
export interface AdaptiveDifficultyConfig {
  /** Stable adaptive configuration identifier. */
  id: string;
  /** Training type this configuration applies to. */
  trainingType: Exclude<TrainingType, "music_relaxation">;
  /** Minimum allowed difficulty level. */
  minDifficultyLevel: number;
  /** Maximum allowed difficulty level. */
  maxDifficultyLevel: number;
  /** Maximum level change after one evaluation window. */
  stepSize: number;
  /** Number of recent sessions or blocks used for evaluation. */
  evaluationWindowSize: number;
  /** Accuracy threshold above which difficulty may increase. */
  accuracyUpperThreshold: number;
  /** Accuracy threshold below which difficulty may decrease. */
  accuracyLowerThreshold: number;
  /** Optional reaction time target used by reaction-based games. */
  reactionTimeTargetMs?: number;
  /** Pause count that should prevent difficulty increases. */
  safetyPauseThreshold: number;
  /** Whether this configuration is currently active. */
  isEnabled: boolean;
  /** User id that last updated the configuration. */
  updatedBy: string;
  /** ISO timestamp when the configuration was last updated. */
  updatedAt: string;
}

export type AdaptiveSubjectiveFeedback =
  | "too_easy"
  | "just_right"
  | "too_hard"
  | "tired"
  | "uncomfortable";

export type AdaptiveDifficultyDirection = "increase" | "maintain" | "decrease" | "pause";

export type AdaptiveMusicUseSuggestion =
  | "none"
  | "optional_focus_support"
  | "calming_recovery"
  | "reduce_stimulation";

/**
 * Input window for one adaptive difficulty evaluation. These values are used
 * only to tune the next auxiliary training block and trend review.
 */
export interface AdaptiveDifficultyEvaluationInput {
  /** Current bounded difficulty level before adaptation. */
  currentDifficultyLevel: number;
  /** Recent correct response rate, normalized from 0 to 1. */
  recentAccuracyRate: number;
  /** Recent missed response rate, normalized from 0 to 1. */
  omissionRate: number;
  /** Recent incorrect response rate, normalized from 0 to 1. */
  commissionRate: number;
  /** Average response time for valid responses in milliseconds. */
  averageReactionTimeMs: number;
  /** Reaction time variability in milliseconds. */
  reactionTimeVariabilityMs: number;
  /** EEG attention reference index, normalized from 0 to 100. */
  eegAttentionIndex: number;
  /** EEG fatigue reference index, normalized from 0 to 100. */
  eegFatigueIndex: number;
  /** EEG signal quality status. This is data quality only, not a diagnosis. */
  eegQualityStatus: EEGQualityStatus;
  /** User or guardian subjective feedback after the recent block. */
  subjectiveFeedback: AdaptiveSubjectiveFeedback;
}

export interface AdaptiveRuleExplanation {
  /** Stable rule identifier for audit and debugging. */
  ruleId: string;
  /** Whether this rule affected the recommendation. */
  triggered: boolean;
  /** Human-readable explanation for the recommendation. */
  message: string;
  /** Direction contributed by this rule. */
  direction: AdaptiveDifficultyDirection;
}

/**
 * Transparent recommendation for the next training block. It is an auxiliary
 * configuration suggestion and must not be interpreted as a clinical result.
 */
export interface AdaptiveDifficultyRecommendation {
  nextDifficultyLevel: number;
  targetPresentationTimeMs: number;
  distractorCount: number;
  stimulusIntervalMs: number;
  recommendedDurationSeconds: number;
  musicUseSuggestion: AdaptiveMusicUseSuggestion;
  shouldPause: boolean;
  direction: AdaptiveDifficultyDirection;
  explanation: string;
  ruleExplanations: AdaptiveRuleExplanation[];
  inputSummary: AdaptiveDifficultyEvaluationInput;
}
