import type { CoreGameSessionResult, GameDifficultyParameters } from "@neuro-cog-rehab/game-core";
import type { GoNoGoGameResult } from "@neuro-cog-rehab/shared-types";

import type { EEGStatusPanelInput } from "./eeg-status-panel-model.js";

export type GoNoGoDifficulty = "easy" | "medium" | "hard";

export type GoNoGoStimulusRole = "go" | "no_go";

export interface GoNoGoDifficultyConfig extends GameDifficultyParameters {
  id: GoNoGoDifficulty;
  label: string;
  /** Fixed interval between stimulus presentations. */
  stimulusIntervalMs: number;
  /** Probability that the next stimulus is a green Go target. */
  targetRatio: number;
  /** Planned active training duration. */
  durationSeconds: number;
  /** Visible time for each stimulus and response window. */
  stimulusDisplayMs: number;
}

export interface GoNoGoStimulus {
  id: string;
  role: GoNoGoStimulusRole;
  appearedAtMs: number;
  expiresAtMs: number;
  x: number;
  y: number;
  size: number;
  color: string;
  label: string;
}

export interface GoNoGoMetrics {
  goTrialCount: number;
  noGoTrialCount: number;
  hitCount: number;
  omissionCount: number;
  falseAlarmCount: number;
  correctInhibitionCount: number;
  earlyResponseCount: number;
  averageReactionTimeMs: number;
  reactionTimeVariabilityMs: number;
  accuracyRate: number;
  omissionRate: number;
  falsePressRate: number;
  inhibitionSuccessRate: number;
}

export interface GoNoGoResultBundle {
  /** Task-specific result for training-record persistence and trend review. */
  gameSessionResult: GoNoGoGameResult;
  /** UI metrics derived from the trial snapshot. */
  metrics: GoNoGoMetrics;
  /** Full core result retained for authorized local inspection. */
  coreResult: CoreGameSessionResult;
}

export interface GoNoGoGameProps {
  userId: string;
  sessionId: string;
  initialDifficulty?: GoNoGoDifficulty;
  width?: number;
  height?: number;
  /** External EEG state can pause the task when the signal is unavailable. */
  eegStatus?: EEGStatusPanelInput;
  /** Demo control is hidden when an external EEG state is supplied. */
  showEegSimulationControls?: boolean;
  onComplete?: (result: GoNoGoGameResult, metrics: GoNoGoMetrics) => void;
}
