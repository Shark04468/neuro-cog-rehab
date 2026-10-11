import type { GameSessionResult, GameTrainingType } from "@neuro-cog-rehab/shared-types";

export type GameSessionStatus = "idle" | "running" | "paused" | "completed";

export type StimulusKind =
  | "target"
  | "distractor"
  | "go"
  | "no_go"
  | "rhythm"
  | "navigation"
  | "custom";

export type TrialOutcomeType =
  | "correct_response"
  | "correct_inhibition"
  | "missed_response"
  | "false_press"
  | "early_response"
  | "late_response";

export type ClickClassification =
  | TrialOutcomeType
  | "duplicate_response"
  | "click_without_stimulus";

export interface GameDifficultyParameters {
  /** Difficulty level applied to the session and exported result. */
  difficultyLevel: number;
  /** Response window used when a presented stimulus does not override it. */
  responseWindowMs: number;
  /** Optional delay before clicks are accepted after stimulus presentation. */
  responseAllowedAfterMs: number;
  /** Optional default stimulus display duration for UI renderers. */
  stimulusDurationMs?: number;
  /** Optional default gap between stimuli for scheduler implementations. */
  interStimulusIntervalMs?: number;
  /** Extra game-specific parameters kept outside UI code. */
  customParameters?: Record<string, number | string | boolean>;
}

export interface GameSessionCoreConfig {
  sessionId: string;
  userId: string;
  trainingType: GameTrainingType;
  /** Planned active training duration; pauses are excluded from countdown. */
  plannedDurationSeconds: number;
  /** Optional number of trials expected by the game scheduler. */
  plannedTrialCount?: number;
  /** Difficulty parameters read by the core and reusable by UI schedulers. */
  difficulty: GameDifficultyParameters;
}

export interface PresentedStimulusInput {
  id: string;
  kind: StimulusKind;
  /** Whether the user is expected to click for this stimulus. */
  expectedResponse: boolean;
  presentedAtMs: number;
  responseWindowMs?: number;
  responseAllowedAfterMs?: number;
  metadata?: Record<string, number | string | boolean>;
}

export interface PresentedStimulus {
  id: string;
  trialIndex: number;
  kind: StimulusKind;
  expectedResponse: boolean;
  presentedAtMs: number;
  responseWindowMs: number;
  responseAllowedAfterMs: number;
  difficultyLevel: number;
  metadata?: Record<string, number | string | boolean>;
}

export interface UserClickInput {
  clickedAtMs: number;
  /** Optional explicit target; when absent the latest pending stimulus is used. */
  stimulusId?: string;
  metadata?: Record<string, number | string | boolean>;
}

export interface UserClickRecord {
  id: string;
  clickedAtMs: number;
  stimulusId: string | null;
  reactionTimeMs: number | null;
  classification: ClickClassification;
  metadata?: Record<string, number | string | boolean>;
}

export interface TrialOutcome {
  stimulusId: string;
  trialIndex: number;
  kind: StimulusKind;
  expectedResponse: boolean;
  isCorrect: boolean;
  outcomeType: TrialOutcomeType;
  reactionTimeMs: number | null;
  completedAtMs: number;
}

export interface CountdownState {
  status: GameSessionStatus;
  plannedDurationSeconds: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  progressRate: number;
}

export interface GameSessionSnapshot {
  status: GameSessionStatus;
  countdown: CountdownState;
  stimuli: readonly PresentedStimulus[];
  clicks: readonly UserClickRecord[];
  outcomes: readonly TrialOutcome[];
  pauseCount: number;
  difficulty: GameDifficultyParameters;
}

export interface CoreGameSessionMetrics {
  completedTrials: number;
  plannedTrialCount: number | null;
  validReactionCount: number;
  averageReactionTimeMs: number;
  omissionCount: number;
  omissionRate: number;
  falsePressCount: number;
  falsePressRate: number;
  earlyResponseCount: number;
  lateResponseCount: number;
}

/**
 * UI-independent game result. It extends the shared GameSessionResult so the
 * same object can be persisted by training-record APIs while retaining richer
 * trial metrics for trend review.
 */
export interface CoreGameSessionResult extends GameSessionResult {
  completedTrials: number;
  plannedTrialCount: number | null;
  averageReactionTimeMs: number;
  omissionCount: number;
  omissionRate: number;
  falsePressCount: number;
  falsePressRate: number;
  earlyResponseCount: number;
  lateResponseCount: number;
  activeDurationSeconds: number;
  difficulty: GameDifficultyParameters;
}
