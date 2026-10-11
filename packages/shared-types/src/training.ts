export const TRAINING_TYPES = [
  "music_relaxation",
  "attention_training",
  "go_no_go",
  "stop_signal",
  "rhythm_navigation"
] as const;

export type TrainingType = (typeof TRAINING_TYPES)[number];

export type TrainingSessionStatus =
  | "created"
  | "in_progress"
  | "paused"
  | "completed"
  | "abandoned";

/**
 * Training flow category used for filtering reports and session lists.
 */
export type TrainingFlowStage = "baseline" | "training" | "cool_down";

/**
 * Sensitivity level marker for records that include user, EEG, or training data.
 */
export type DataSensitivityLevel = "standard" | "sensitive";

/**
 * Baseline state record captured before a training session. This is for trend
 * comparison only and must not be used as a diagnostic result.
 */
export interface BaselineAssessment {
  /** Stable baseline assessment identifier. */
  id: string;
  /** Training user id linked to this baseline record. */
  userId: string;
  /** Optional training session id when the baseline belongs to a session. */
  sessionId?: string;
  /** ISO timestamp when the baseline record was created. */
  createdAt: string;
  /** Self-rating for current focus state, usually normalized from 1 to 5. */
  focusSelfRating: number;
  /** Self-rating for current fatigue state, usually normalized from 1 to 5. */
  fatigueSelfRating: number;
  /** Self-rating for current mood comfort, usually normalized from 1 to 5. */
  moodSelfRating: number;
  /** Simple environment noise rating used to interpret training context. */
  environmentNoiseRating: number;
  /** Whether the user completed a short readiness check before training. */
  readinessConfirmed: boolean;
  /** Optional free-form note entered by guardian, therapist, or user. */
  notes?: string;
}

/**
 * Lifecycle record for one auxiliary training session.
 */
export interface TrainingSession {
  /** Stable training session identifier. */
  id: string;
  /** Training user id. */
  userId: string;
  /** Optional baseline record linked to this session. */
  baselineAssessmentId?: string;
  /** Optional therapist user id that planned or reviewed this session. */
  plannedByTherapistId?: string;
  /** Training module used by this session. */
  trainingType: TrainingType;
  /** Current session lifecycle status. */
  status: TrainingSessionStatus;
  /** Current flow stage inside the session. */
  flowStage: TrainingFlowStage;
  /** ISO timestamp when the session started. */
  startedAt: string;
  /** ISO timestamp when the session ended. */
  endedAt?: string;
  /** Difficulty level selected for the session. */
  difficultyLevel: number;
  /** Whether EEG was enabled or simulated for this session. */
  eegEnabled: boolean;
  /** Sensitive data marker for access control and audit behavior. */
  dataSensitivity: DataSensitivityLevel;
}

export type TrainingErrorType =
  | "missed_response"
  | "incorrect_response"
  | "early_response"
  | "timeout";

export interface TrialEvent {
  sessionId: string;
  trialIndex: number;
  trainingType: Exclude<TrainingType, "music_relaxation">;
  isCorrect: boolean;
  reactionTimeMs?: number;
  errorType?: TrainingErrorType;
  difficultyLevel: number;
  clientTimestamp: string;
}

export interface TrainingMetric {
  sessionId: string;
  completionRate: number;
  accuracyRate: number;
  averageReactionTimeMs?: number;
  errorCount: number;
  durationSeconds: number;
}
