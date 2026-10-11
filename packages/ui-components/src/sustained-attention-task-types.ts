import type { CoreGameSessionResult, GameDifficultyParameters } from "@neuro-cog-rehab/game-core";
import type { GameSessionResult } from "@neuro-cog-rehab/shared-types";

export type SustainedAttentionDurationSeconds = 180 | 300 | 480;

export type SustainedAttentionFrequency = "low" | "medium" | "high";

export type SustainedAttentionStimulusRole = "target" | "distractor";

export interface SustainedAttentionFrequencyConfig {
  id: SustainedAttentionFrequency;
  label: string;
  minIntervalMs: number;
  maxIntervalMs: number;
  responseWindowMs: number;
  difficultyLevel: number;
}

export interface SustainedAttentionTaskConfig extends GameDifficultyParameters {
  durationSeconds: SustainedAttentionDurationSeconds;
  frequency: SustainedAttentionFrequency;
  targetIntervalMinMs: number;
  targetIntervalMaxMs: number;
  targetDisplayMs: number;
  distractorsEnabled: boolean;
  distractorChance: number;
}

export interface SustainedAttentionStimulus {
  id: string;
  role: SustainedAttentionStimulusRole;
  appearedAtMs: number;
  expiresAtMs: number;
  x: number;
  y: number;
  size: number;
  color: string;
  label: string;
}

export interface SustainedAttentionMetrics {
  targetCount: number;
  hitCount: number;
  missedCount: number;
  falsePressCount: number;
  averageReactionTimeMs: number;
  reactionTimeVariabilityMs: number;
  accuracy: number;
  attentionStabilityScore: number;
  taskPersistenceScore: number;
}

export interface SustainedAttentionTaskResultBundle {
  /** Standard shared result for training-record persistence. */
  gameSessionResult: GameSessionResult;
  /** Task-specific metrics for UI display and authorized trend review. */
  metrics: SustainedAttentionMetrics;
  /** Full core result retained for local inspection when needed. */
  coreResult: CoreGameSessionResult;
}

export interface SustainedAttentionTaskProps {
  userId: string;
  sessionId: string;
  initialDurationSeconds?: SustainedAttentionDurationSeconds;
  initialFrequency?: SustainedAttentionFrequency;
  initialDistractorsEnabled?: boolean;
  width?: number;
  height?: number;
  onComplete?: (result: GameSessionResult, metrics: SustainedAttentionMetrics) => void;
}
