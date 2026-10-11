import type { StopSignalResult, StopSignalTrialResult } from "@neuro-cog-rehab/shared-types";

export type StopSignalDifficulty = "easy" | "medium" | "hard";

export type StopSignalTrialType = "go" | "stop";

export interface StopSignalTaskConfig {
  id: StopSignalDifficulty;
  label: string;
  difficultyLevel: number;
  /** Delay from target appearance to stop signal. */
  stopSignalDelayMs: number;
  /** Maximum target display and response window. */
  targetDisplayTimeMs: number;
  /** Number of trials planned for the session. */
  trialCount: number;
  /** Configured ratio of trials that include a stop signal. */
  stopTrialRatio: number;
  /** Calm gap between trials to avoid rapid stimulation. */
  interTrialIntervalMs: number;
}

export interface StopSignalTrial {
  id: string;
  trialIndex: number;
  trialType: StopSignalTrialType;
  targetPresentedAtMs: number;
  targetExpiresAtMs: number;
  stopSignalAtMs: number | null;
  x: number;
  y: number;
  size: number;
}

export interface StopSignalMetrics {
  goTrialCount: number;
  stopTrialCount: number;
  goSuccessCount: number;
  goMissedCount: number;
  stopSuccessCount: number;
  stopFailureCount: number;
  respondedBeforeStopSignalCount: number;
  impulsiveResponseCount: number;
  averageGoReactionTimeMs: number;
  stopSuccessRate: number;
  accuracyRate: number;
  completionRate: number;
}

export interface StopSignalTaskProps {
  userId: string;
  sessionId: string;
  initialDifficulty?: StopSignalDifficulty;
  width?: number;
  height?: number;
  onComplete?: (result: StopSignalResult, metrics: StopSignalMetrics) => void;
}

export interface StopSignalResultBundle {
  /** Shared result object that can be exported or persisted by authorized flows. */
  stopSignalResult: StopSignalResult;
  /** Derived display metrics for training feedback. */
  metrics: StopSignalMetrics;
  /** Per-trial records retained in the shared result as sensitive training data. */
  trialResults: StopSignalTrialResult[];
}
