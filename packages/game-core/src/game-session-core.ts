import type {
  ClickClassification,
  CoreGameSessionMetrics,
  CoreGameSessionResult,
  CountdownState,
  GameDifficultyParameters,
  GameSessionCoreConfig,
  GameSessionSnapshot,
  GameSessionStatus,
  PresentedStimulus,
  PresentedStimulusInput,
  TrialOutcome,
  TrialOutcomeType,
  UserClickInput,
  UserClickRecord
} from "./types.js";

const MS_PER_SECOND = 1000;

export class GameCoreError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "GameCoreError";
  }
}

/**
 * Stateless-renderer game engine for cognitive training tasks. Callers provide
 * time in milliseconds so React, Canvas, Phaser, or server-side tests can all
 * drive the same training logic without depending on timers or DOM APIs.
 */
export class GameSessionCore {
  private readonly config: GameSessionCoreConfig;
  private status: GameSessionStatus = "idle";
  private startedAtMs: number | null = null;
  private endedAtMs: number | null = null;
  private accumulatedPausedMs = 0;
  private pauseStartedAtMs: number | null = null;
  private pauseCount = 0;
  private clickSequence = 0;
  private readonly stimuli: PresentedStimulus[] = [];
  private readonly clicks: UserClickRecord[] = [];
  private readonly outcomes: TrialOutcome[] = [];
  private readonly completedStimulusIds = new Set<string>();

  public constructor(config: GameSessionCoreConfig) {
    this.config = validateConfig(config);
  }

  public start(nowMs: number): CountdownState {
    this.assertNonNegativeTime(nowMs, "nowMs");
    if (this.status !== "idle") {
      throw new GameCoreError("Training session has already started.");
    }

    this.status = "running";
    this.startedAtMs = nowMs;
    return this.getCountdown(nowMs);
  }

  public pause(nowMs: number): CountdownState {
    this.assertRunning("pause");
    this.assertNonNegativeTime(nowMs, "nowMs");
    this.assertMonotonicSessionTime(nowMs);

    this.advance(nowMs);
    this.status = "paused";
    this.pauseStartedAtMs = nowMs;
    this.pauseCount += 1;
    return this.getCountdown(nowMs);
  }

  public resume(nowMs: number): CountdownState {
    if (this.status !== "paused" || this.pauseStartedAtMs === null) {
      throw new GameCoreError("Only a paused training session can be resumed.");
    }
    this.assertNonNegativeTime(nowMs, "nowMs");
    if (nowMs < this.pauseStartedAtMs) {
      throw new GameCoreError("Resume time cannot be earlier than pause time.");
    }

    const pausedMs = nowMs - this.pauseStartedAtMs;
    this.accumulatedPausedMs += pausedMs;
    this.shiftPendingStimuli(pausedMs);
    this.pauseStartedAtMs = null;
    this.status = "running";
    return this.getCountdown(nowMs);
  }

  public presentStimulus(input: PresentedStimulusInput): PresentedStimulus {
    this.assertRunning("present a stimulus");
    this.assertMonotonicSessionTime(input.presentedAtMs);
    if (this.stimuli.some((stimulus) => stimulus.id === input.id)) {
      throw new GameCoreError(`Stimulus id already exists: ${input.id}`);
    }

    const stimulus: PresentedStimulus = {
      id: input.id,
      trialIndex: this.stimuli.length,
      kind: input.kind,
      expectedResponse: input.expectedResponse,
      presentedAtMs: input.presentedAtMs,
      responseWindowMs: validatePositiveNumber(
        input.responseWindowMs ?? this.config.difficulty.responseWindowMs,
        "responseWindowMs"
      ),
      responseAllowedAfterMs: validateNonNegativeNumber(
        input.responseAllowedAfterMs ?? this.config.difficulty.responseAllowedAfterMs,
        "responseAllowedAfterMs"
      ),
      difficultyLevel: this.config.difficulty.difficultyLevel
    };

    if (input.metadata !== undefined) {
      stimulus.metadata = input.metadata;
    }

    this.stimuli.push(stimulus);
    return { ...stimulus };
  }

  public recordClick(input: UserClickInput): UserClickRecord {
    this.assertRunning("record a click");
    this.assertMonotonicSessionTime(input.clickedAtMs);

    const stimulus = this.resolveClickStimulus(input);
    const classification = this.classifyClick(stimulus, input.clickedAtMs);
    const reactionTimeMs =
      stimulus === null ? null : round(input.clickedAtMs - stimulus.presentedAtMs, 2);

    const click: UserClickRecord = {
      id: `click-${this.clickSequence++}`,
      clickedAtMs: input.clickedAtMs,
      stimulusId: stimulus?.id ?? null,
      reactionTimeMs,
      classification
    };

    if (input.metadata !== undefined) {
      click.metadata = input.metadata;
    }

    this.clicks.push(click);

    if (stimulus !== null && this.isOutcomeClassification(classification)) {
      this.completeStimulusFromClick(stimulus, classification, input.clickedAtMs, reactionTimeMs);
    }
    this.completeExpiredStimuli(input.clickedAtMs);

    return { ...click };
  }

  public advance(nowMs: number): CountdownState {
    this.assertStarted("advance");
    this.assertNonNegativeTime(nowMs, "nowMs");
    this.assertMonotonicSessionTime(nowMs);

    if (this.status === "running") {
      this.completeExpiredStimuli(nowMs);
      if (this.getActiveElapsedMs(nowMs) >= this.getPlannedDurationMs()) {
        this.complete(nowMs);
      }
    }

    return this.getCountdown(nowMs);
  }

  public complete(nowMs: number): CoreGameSessionResult {
    this.assertStarted("complete");
    this.assertNonNegativeTime(nowMs, "nowMs");
    this.assertMonotonicSessionTime(nowMs);

    if (this.status === "running") {
      this.completeExpiredStimuli(nowMs, true);
    } else if (this.status === "paused" && this.pauseStartedAtMs !== null) {
      this.completeExpiredStimuli(this.pauseStartedAtMs, true);
    }

    this.status = "completed";
    this.endedAtMs = nowMs;
    return this.exportResult(nowMs);
  }

  public exportResult(nowMs: number): CoreGameSessionResult {
    this.assertStarted("export a result");
    this.assertNonNegativeTime(nowMs, "nowMs");
    this.assertMonotonicSessionTime(nowMs);

    if (this.status === "running") {
      this.completeExpiredStimuli(nowMs, true);
    }

    const effectiveEndedAtMs = this.endedAtMs ?? nowMs;
    const activeDurationSeconds = round(
      this.getActiveElapsedMs(effectiveEndedAtMs) / MS_PER_SECOND,
      3
    );
    const metrics = this.calculateMetrics();
    const totalTrials = this.stimuli.length;
    const correctTrials = this.outcomes.filter((outcome) => outcome.isCorrect).length;
    const errorCount = this.calculateErrorCount();
    const accuracyRate = totalTrials === 0 ? 0 : round(correctTrials / totalTrials, 4);
    const completionRate =
      metrics.plannedTrialCount === null
        ? totalTrials === 0
          ? 0
          : round(metrics.completedTrials / totalTrials, 4)
        : round(clamp(metrics.completedTrials / metrics.plannedTrialCount, 0, 1), 4);

    return {
      sessionId: this.config.sessionId,
      userId: this.config.userId,
      trainingType: this.config.trainingType,
      startedAt: new Date(this.startedAtMs ?? effectiveEndedAtMs).toISOString(),
      endedAt: new Date(effectiveEndedAtMs).toISOString(),
      durationSeconds: activeDurationSeconds,
      difficultyLevel: this.config.difficulty.difficultyLevel,
      completionRate,
      accuracyRate,
      totalTrials,
      correctTrials,
      errorCount,
      pauseCount: this.pauseCount,
      completedTrials: metrics.completedTrials,
      plannedTrialCount: metrics.plannedTrialCount,
      averageReactionTimeMs: metrics.averageReactionTimeMs,
      omissionCount: metrics.omissionCount,
      omissionRate: metrics.omissionRate,
      falsePressCount: metrics.falsePressCount,
      falsePressRate: metrics.falsePressRate,
      earlyResponseCount: metrics.earlyResponseCount,
      lateResponseCount: metrics.lateResponseCount,
      activeDurationSeconds,
      difficulty: { ...this.config.difficulty }
    };
  }

  public getCountdown(nowMs: number): CountdownState {
    this.assertNonNegativeTime(nowMs, "nowMs");

    const plannedDurationSeconds = this.config.plannedDurationSeconds;
    const elapsedSeconds =
      this.startedAtMs === null
        ? 0
        : round(
            Math.min(this.getActiveElapsedMs(nowMs) / MS_PER_SECOND, plannedDurationSeconds),
            3
          );
    const remainingSeconds = round(Math.max(plannedDurationSeconds - elapsedSeconds, 0), 3);
    const progressRate =
      plannedDurationSeconds === 0
        ? 1
        : round(clamp(elapsedSeconds / plannedDurationSeconds, 0, 1), 4);

    return {
      status: this.status,
      plannedDurationSeconds,
      elapsedSeconds,
      remainingSeconds,
      progressRate
    };
  }

  public getDifficultyConfig(): GameDifficultyParameters {
    return { ...this.config.difficulty };
  }

  public getSnapshot(nowMs: number): GameSessionSnapshot {
    return {
      status: this.status,
      countdown: this.getCountdown(nowMs),
      stimuli: this.stimuli.map((stimulus) => ({ ...stimulus })),
      clicks: this.clicks.map((click) => ({ ...click })),
      outcomes: this.outcomes.map((outcome) => ({ ...outcome })),
      pauseCount: this.pauseCount,
      difficulty: this.getDifficultyConfig()
    };
  }

  private resolveClickStimulus(input: UserClickInput): PresentedStimulus | null {
    if (input.stimulusId !== undefined) {
      const stimulus = this.stimuli.find((candidate) => candidate.id === input.stimulusId);
      if (stimulus === undefined) {
        throw new GameCoreError(`Unknown stimulus id: ${input.stimulusId}`);
      }
      return stimulus;
    }

    const pending = [...this.stimuli]
      .reverse()
      .find(
        (stimulus) =>
          !this.completedStimulusIds.has(stimulus.id) && input.clickedAtMs >= stimulus.presentedAtMs
      );

    return pending ?? null;
  }

  private classifyClick(
    stimulus: PresentedStimulus | null,
    clickedAtMs: number
  ): ClickClassification {
    if (stimulus === null) {
      return "click_without_stimulus";
    }
    if (this.completedStimulusIds.has(stimulus.id)) {
      return "duplicate_response";
    }

    const reactionTimeMs = clickedAtMs - stimulus.presentedAtMs;
    if (reactionTimeMs < stimulus.responseAllowedAfterMs) {
      return "early_response";
    }
    if (reactionTimeMs > stimulus.responseWindowMs) {
      return stimulus.expectedResponse ? "late_response" : "false_press";
    }
    return stimulus.expectedResponse ? "correct_response" : "false_press";
  }

  private isOutcomeClassification(
    classification: ClickClassification
  ): classification is TrialOutcomeType {
    return classification !== "duplicate_response" && classification !== "click_without_stimulus";
  }

  private completeStimulusFromClick(
    stimulus: PresentedStimulus,
    classification: TrialOutcomeType,
    completedAtMs: number,
    reactionTimeMs: number | null
  ): void {
    const isCorrect =
      classification === "correct_response" || classification === "correct_inhibition";
    const outcome: TrialOutcome = {
      stimulusId: stimulus.id,
      trialIndex: stimulus.trialIndex,
      kind: stimulus.kind,
      expectedResponse: stimulus.expectedResponse,
      isCorrect,
      outcomeType: classification,
      reactionTimeMs,
      completedAtMs
    };

    this.outcomes.push(outcome);
    this.completedStimulusIds.add(stimulus.id);
  }

  private completeExpiredStimuli(nowMs: number, forceComplete = false): void {
    for (const stimulus of this.stimuli) {
      if (this.completedStimulusIds.has(stimulus.id)) {
        continue;
      }

      const responseEndMs = stimulus.presentedAtMs + stimulus.responseWindowMs;
      if (!forceComplete && nowMs <= responseEndMs) {
        continue;
      }

      const outcomeType: TrialOutcomeType = stimulus.expectedResponse
        ? "missed_response"
        : "correct_inhibition";
      this.completeStimulusFromClick(stimulus, outcomeType, Math.min(nowMs, responseEndMs), null);
    }
  }

  private shiftPendingStimuli(pausedMs: number): void {
    for (const stimulus of this.stimuli) {
      if (!this.completedStimulusIds.has(stimulus.id)) {
        stimulus.presentedAtMs += pausedMs;
      }
    }
  }

  private calculateMetrics(): CoreGameSessionMetrics {
    const responseRequiredTrials = this.outcomes.filter((outcome) => outcome.expectedResponse);
    const noResponseExpectedTrials = this.outcomes.filter((outcome) => !outcome.expectedResponse);
    const validReactionTimes = this.outcomes
      .filter(
        (outcome) => outcome.outcomeType === "correct_response" && outcome.reactionTimeMs !== null
      )
      .map((outcome) => outcome.reactionTimeMs as number);
    const omissionCount = this.outcomes.filter(
      (outcome) =>
        outcome.outcomeType === "missed_response" || outcome.outcomeType === "late_response"
    ).length;
    const falsePressFromTrials = this.outcomes.filter(
      (outcome) => outcome.outcomeType === "false_press"
    ).length;
    const invalidClickCount = this.clicks.filter(
      (click) => click.classification === "click_without_stimulus"
    ).length;
    const falsePressCount = falsePressFromTrials + invalidClickCount;
    const falsePressDenominator = noResponseExpectedTrials.length + invalidClickCount;
    const earlyResponseCount = this.outcomes.filter(
      (outcome) => outcome.outcomeType === "early_response"
    ).length;
    const lateResponseCount = this.outcomes.filter(
      (outcome) => outcome.outcomeType === "late_response"
    ).length;
    const plannedTrialCount = this.config.plannedTrialCount ?? null;

    return {
      completedTrials: this.outcomes.length,
      plannedTrialCount,
      validReactionCount: validReactionTimes.length,
      averageReactionTimeMs: average(validReactionTimes),
      omissionCount,
      omissionRate:
        responseRequiredTrials.length === 0
          ? 0
          : round(omissionCount / responseRequiredTrials.length, 4),
      falsePressCount,
      falsePressRate:
        falsePressDenominator === 0 ? 0 : round(falsePressCount / falsePressDenominator, 4),
      earlyResponseCount,
      lateResponseCount
    };
  }

  private calculateErrorCount(): number {
    const incorrectTrialCount = this.outcomes.filter((outcome) => !outcome.isCorrect).length;
    const invalidClickCount = this.clicks.filter(
      (click) => click.classification === "click_without_stimulus"
    ).length;
    return incorrectTrialCount + invalidClickCount;
  }

  private getActiveElapsedMs(nowMs: number): number {
    if (this.startedAtMs === null) {
      return 0;
    }

    const referenceMs =
      this.status === "paused" && this.pauseStartedAtMs !== null ? this.pauseStartedAtMs : nowMs;
    return Math.max(referenceMs - this.startedAtMs - this.accumulatedPausedMs, 0);
  }

  private getPlannedDurationMs(): number {
    return this.config.plannedDurationSeconds * MS_PER_SECOND;
  }

  private assertRunning(action: string): void {
    if (this.status !== "running") {
      throw new GameCoreError(`Cannot ${action} unless the training session is running.`);
    }
  }

  private assertStarted(action: string): void {
    if (this.startedAtMs === null) {
      throw new GameCoreError(`Cannot ${action} before the training session starts.`);
    }
  }

  private assertMonotonicSessionTime(nowMs: number): void {
    if (this.startedAtMs !== null && nowMs < this.startedAtMs) {
      throw new GameCoreError("Event time cannot be earlier than session start.");
    }
    if (this.endedAtMs !== null && nowMs < this.endedAtMs) {
      throw new GameCoreError("Event time cannot move backwards after completion.");
    }
  }

  private assertNonNegativeTime(value: number, fieldName: string): void {
    validateNonNegativeNumber(value, fieldName);
  }
}

export function createGameSessionCore(config: GameSessionCoreConfig): GameSessionCore {
  return new GameSessionCore(config);
}

function validateConfig(config: GameSessionCoreConfig): GameSessionCoreConfig {
  if (config.sessionId.trim().length === 0) {
    throw new GameCoreError("sessionId is required.");
  }
  if (config.userId.trim().length === 0) {
    throw new GameCoreError("userId is required.");
  }

  validatePositiveNumber(config.plannedDurationSeconds, "plannedDurationSeconds");
  validatePositiveNumber(config.difficulty.difficultyLevel, "difficulty.difficultyLevel");
  validatePositiveNumber(config.difficulty.responseWindowMs, "difficulty.responseWindowMs");
  validateNonNegativeNumber(
    config.difficulty.responseAllowedAfterMs,
    "difficulty.responseAllowedAfterMs"
  );

  if (config.plannedTrialCount !== undefined) {
    validatePositiveNumber(config.plannedTrialCount, "plannedTrialCount");
  }

  return {
    ...config,
    difficulty: { ...config.difficulty }
  };
}

function validatePositiveNumber(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new GameCoreError(`${fieldName} must be a positive finite number.`);
  }
  return value;
}

function validateNonNegativeNumber(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new GameCoreError(`${fieldName} must be a non-negative finite number.`);
  }
  return value;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
