import type { TrainingType } from "./training.js";

/**
 * Game training types that produce trial-based results.
 */
export type GameTrainingType = Exclude<TrainingType, "music_relaxation">;

/**
 * Shared result fields for one game-based training session.
 */
export interface GameSessionResult {
  /** Linked training session id. */
  sessionId: string;
  /** Training user id. */
  userId: string;
  /** Game module that produced this result. */
  trainingType: GameTrainingType;
  /** ISO timestamp when the game session started. */
  startedAt: string;
  /** ISO timestamp when the game session ended. */
  endedAt: string;
  /** Total session duration in seconds. */
  durationSeconds: number;
  /** Difficulty level used at the end of the session. */
  difficultyLevel: number;
  /** Completion rate normalized from 0 to 1. */
  completionRate: number;
  /** Accuracy rate normalized from 0 to 1. */
  accuracyRate: number;
  /** Total number of trials shown to the user. */
  totalTrials: number;
  /** Number of correct responses. */
  correctTrials: number;
  /** Number of incorrect, missed, or early responses. */
  errorCount: number;
  /** Number of user pauses during the session. */
  pauseCount: number;
}

/**
 * Result metrics for the attention training game.
 */
export interface AttentionGameResult extends GameSessionResult {
  /** Must be the attention training game type. */
  trainingType: "attention_training";
  /** Rate of correctly selected target stimuli, normalized from 0 to 1. */
  targetHitRate: number;
  /** Rate of incorrect responses to distractors, normalized from 0 to 1. */
  distractorErrorRate: number;
  /** Average reaction time for valid responses. */
  averageReactionTimeMs: number;
  /** Longest run of correct responses without an error. */
  longestContinuousCorrectCount: number;
  /** Stability score derived from task performance for trend display only. */
  focusStabilityScore: number;
}

/**
 * Result metrics for the Go/No-Go click reaction game.
 */
export interface GoNoGoGameResult extends GameSessionResult {
  /** Must be the Go/No-Go game type. */
  trainingType: "go_no_go";
  /** Accuracy on Go trials, normalized from 0 to 1. */
  goAccuracyRate: number;
  /** Correct inhibition rate on No-Go trials, normalized from 0 to 1. */
  noGoInhibitionRate: number;
  /** Number of responses made during No-Go trials. */
  falseAlarmCount: number;
  /** Number of missed Go responses. */
  omissionCount: number;
  /** Number of responses made before the allowed response window. */
  earlyResponseCount: number;
  /** Average reaction time for valid Go responses. */
  averageGoReactionTimeMs: number;
}

export type StopSignalTrialType = "go" | "stop";

export type StopSignalTrialOutcome =
  | "go_success"
  | "go_missed"
  | "stop_success"
  | "stop_failed"
  | "responded_before_stop_signal";

/**
 * Detailed result for one Stop-Signal trial. These fields support training
 * review and trend analysis only; they are not diagnostic conclusions.
 */
export interface StopSignalTrialResult {
  /** Stable trial id within the session. */
  trialId: string;
  /** Zero-based trial order. */
  trialIndex: number;
  /** Whether this trial included a delayed stop signal. */
  trialType: StopSignalTrialType;
  /** ISO timestamp when the target appeared. */
  targetPresentedAt: string;
  /** ISO timestamp when the stop signal appeared, only for stop trials. */
  stopSignalPresentedAt?: string;
  /** Delay from target presentation to stop signal in milliseconds. */
  stopSignalDelayMs?: number;
  /** ISO timestamp when the user clicked, when a click occurred. */
  responseAt?: string;
  /** Reaction time from target presentation to click in milliseconds. */
  reactionTimeMs?: number;
  /** Trial-level outcome used for training feedback and reports. */
  outcome: StopSignalTrialOutcome;
  /** Whether the user response matched the trial rule. */
  isCorrect: boolean;
}

/**
 * Result metrics for the Stop-Signal reaction inhibition task.
 */
export interface StopSignalResult extends GameSessionResult {
  /** Must be the Stop-Signal training type. */
  trainingType: "stop_signal";
  /** Stop signal delay used by the session in milliseconds. */
  stopSignalDelayMs: number;
  /** Target display time used by the session in milliseconds. */
  targetDisplayTimeMs: number;
  /** Ratio of trials configured to include a stop signal. */
  stopTrialRatio: number;
  /** Number of Go trials completed or ended. */
  goTrialCount: number;
  /** Number of Stop trials completed or ended. */
  stopTrialCount: number;
  /** Stop trials without a click after the stop signal, normalized from 0 to 1. */
  stopSuccessRate: number;
  /** Count of stop-trial clicks after the stop signal. */
  stopFailureCount: number;
  /** Count of stop-trial clicks before the stop signal appeared. */
  respondedBeforeStopSignalCount: number;
  /** Combined count used to review impulsive response trends. */
  impulsiveResponseCount: number;
  /** Average reaction time for successful Go responses. */
  averageGoReactionTimeMs: number;
  /** Per-trial results for authorized review and export. */
  trialResults: StopSignalTrialResult[];
}

/**
 * Result metrics for the rhythm navigation game.
 */
export interface RhythmNavigationResult extends GameSessionResult {
  /** Must be the rhythm navigation game type. */
  trainingType: "rhythm_navigation";
  /** Correct route clicks divided by expected route length, normalized from 0 to 1. */
  routeAccuracy: number;
  /** Number of clicks that did not match the memorized route sequence. */
  sequenceErrorCount: number;
  /** Average absolute timing error against the beat window in milliseconds. */
  timingError: number;
  /** Average reaction time between expected route steps in milliseconds. */
  averageReactionTime: number;
  /** Working-memory score derived from route recall, displayed as 0 to 100. */
  workingMemoryScore: number;
  /** Task-switching score derived from color/rule transition steps, displayed as 0 to 100. */
  taskSwitchingScore: number;
  /** Beat synchronization rate, normalized from 0 to 1. */
  rhythmSyncRate: number;
  /** Route completion rate, normalized from 0 to 1. */
  routeCompletionRate: number;
  /** Number of task switch mistakes during navigation. */
  taskSwitchErrorCount: number;
  /** Number of mistakes where the clicked node matched the previous rule instead of the new rule. */
  oldRuleInterferenceErrorCount: number;
  /** Number of in-session route rule changes shown to the user. */
  taskRuleChangeCount: number;
  /** Accuracy across explicit task rules, normalized from 0 to 1. */
  ruleAccuracy: number;
  /** Accuracy for short memory steps, normalized from 0 to 1. */
  workingMemoryStepAccuracy: number;
  /** Average absolute offset from target beat in milliseconds. */
  averageBeatOffsetMs: number;
}
