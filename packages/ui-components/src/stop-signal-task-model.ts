import type { StopSignalResult, StopSignalTrialResult } from "@neuro-cog-rehab/shared-types";

import type {
  StopSignalDifficulty,
  StopSignalMetrics,
  StopSignalTaskConfig,
  StopSignalTrial,
  StopSignalTrialType
} from "./stop-signal-task-types.js";

export const STOP_SIGNAL_DIFFICULTIES: Record<StopSignalDifficulty, StopSignalTaskConfig> = {
  easy: {
    id: "easy",
    label: "基础",
    difficultyLevel: 1,
    stopSignalDelayMs: 360,
    targetDisplayTimeMs: 1500,
    trialCount: 18,
    stopTrialRatio: 0.25,
    interTrialIntervalMs: 900
  },
  medium: {
    id: "medium",
    label: "进阶",
    difficultyLevel: 2,
    stopSignalDelayMs: 280,
    targetDisplayTimeMs: 1300,
    trialCount: 24,
    stopTrialRatio: 0.3,
    interTrialIntervalMs: 850
  },
  hard: {
    id: "hard",
    label: "挑战",
    difficultyLevel: 3,
    stopSignalDelayMs: 220,
    targetDisplayTimeMs: 1150,
    trialCount: 30,
    stopTrialRatio: 0.35,
    interTrialIntervalMs: 800
  }
};

export function getStopSignalTaskConfig(difficulty: StopSignalDifficulty): StopSignalTaskConfig {
  return { ...STOP_SIGNAL_DIFFICULTIES[difficulty] };
}

export function buildStopSignalTrialSequence(
  config: StopSignalTaskConfig,
  random: () => number = Math.random
): StopSignalTrialType[] {
  const stopTrialCount = Math.min(
    config.trialCount,
    Math.max(0, Math.round(config.trialCount * config.stopTrialRatio))
  );
  const sequence: StopSignalTrialType[] = [
    ...Array<StopSignalTrialType>(stopTrialCount).fill("stop"),
    ...Array<StopSignalTrialType>(config.trialCount - stopTrialCount).fill("go")
  ];

  // Shuffle once per session so stop trials remain unpredictable without rapid visual changes.
  for (let index = sequence.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const currentTrialType = sequence[index] ?? "go";
    const swapTrialType = sequence[swapIndex] ?? "go";
    sequence[index] = swapTrialType;
    sequence[swapIndex] = currentTrialType;
  }

  return sequence;
}

export function buildStopSignalTrial(input: {
  config: StopSignalTaskConfig;
  trialIndex: number;
  trialType: StopSignalTrialType;
  targetPresentedAtMs: number;
  width: number;
  height: number;
  random?: () => number;
}): StopSignalTrial {
  const random = input.random ?? Math.random;
  const size = 76;
  const margin = size * 1.2;

  return {
    id: `stop-signal-${input.trialIndex}-${input.trialType}`,
    trialIndex: input.trialIndex,
    trialType: input.trialType,
    targetPresentedAtMs: input.targetPresentedAtMs,
    targetExpiresAtMs: input.targetPresentedAtMs + input.config.targetDisplayTimeMs,
    stopSignalAtMs:
      input.trialType === "stop"
        ? input.targetPresentedAtMs + input.config.stopSignalDelayMs
        : null,
    x: margin + random() * Math.max(input.width - margin * 2, margin),
    y: margin + random() * Math.max(input.height - margin * 2, margin),
    size
  };
}

export function completeStopSignalTrial(input: {
  trial: StopSignalTrial;
  config: StopSignalTaskConfig;
  completedAtMs: number;
  response: "click" | "timeout";
}): StopSignalTrialResult {
  const { trial } = input;
  const responseAt = input.response === "click" ? input.completedAtMs : undefined;
  const reactionTimeMs =
    responseAt === undefined ? undefined : round(responseAt - trial.targetPresentedAtMs, 2);
  const stopSignalPresentedAt =
    trial.stopSignalAtMs === null ? undefined : new Date(trial.stopSignalAtMs).toISOString();
  const base = {
    trialId: trial.id,
    trialIndex: trial.trialIndex,
    trialType: trial.trialType,
    targetPresentedAt: new Date(trial.targetPresentedAtMs).toISOString(),
    ...(stopSignalPresentedAt ? { stopSignalPresentedAt } : {}),
    ...(trial.stopSignalAtMs === null ? {} : { stopSignalDelayMs: input.config.stopSignalDelayMs }),
    ...(responseAt === undefined ? {} : { responseAt: new Date(responseAt).toISOString() }),
    ...(reactionTimeMs === undefined ? {} : { reactionTimeMs })
  };

  if (trial.trialType === "go") {
    return {
      ...base,
      outcome: input.response === "click" ? "go_success" : "go_missed",
      isCorrect: input.response === "click"
    };
  }

  if (input.response === "timeout") {
    return {
      ...base,
      outcome: "stop_success",
      isCorrect: true
    };
  }

  return {
    ...base,
    outcome:
      trial.stopSignalAtMs !== null && input.completedAtMs < trial.stopSignalAtMs
        ? "responded_before_stop_signal"
        : "stop_failed",
    isCorrect: false
  };
}

export function calculateStopSignalMetrics(input: {
  trialResults: StopSignalTrialResult[];
  plannedTrialCount: number;
}): StopSignalMetrics {
  const goTrials = input.trialResults.filter((trial) => trial.trialType === "go");
  const stopTrials = input.trialResults.filter((trial) => trial.trialType === "stop");
  const goSuccesses = goTrials.filter((trial) => trial.outcome === "go_success");
  const goMisses = goTrials.filter((trial) => trial.outcome === "go_missed");
  const stopSuccesses = stopTrials.filter((trial) => trial.outcome === "stop_success");
  const stopFailures = stopTrials.filter((trial) => trial.outcome === "stop_failed");
  const beforeStopResponses = stopTrials.filter(
    (trial) => trial.outcome === "responded_before_stop_signal"
  );
  const goReactionTimes = goSuccesses.flatMap((trial) =>
    typeof trial.reactionTimeMs === "number" ? [trial.reactionTimeMs] : []
  );
  const correctTrials = input.trialResults.filter((trial) => trial.isCorrect).length;

  return {
    goTrialCount: goTrials.length,
    stopTrialCount: stopTrials.length,
    goSuccessCount: goSuccesses.length,
    goMissedCount: goMisses.length,
    stopSuccessCount: stopSuccesses.length,
    stopFailureCount: stopFailures.length,
    respondedBeforeStopSignalCount: beforeStopResponses.length,
    impulsiveResponseCount: stopFailures.length + beforeStopResponses.length,
    averageGoReactionTimeMs: average(goReactionTimes),
    stopSuccessRate:
      stopTrials.length === 0 ? 0 : round(stopSuccesses.length / stopTrials.length, 4),
    accuracyRate:
      input.trialResults.length === 0 ? 0 : round(correctTrials / input.trialResults.length, 4),
    completionRate:
      input.plannedTrialCount === 0
        ? 0
        : round(input.trialResults.length / input.plannedTrialCount, 4)
  };
}

export function createStopSignalResult(input: {
  sessionId: string;
  userId: string;
  startedAtMs: number;
  endedAtMs: number;
  activeDurationSeconds: number;
  pauseCount: number;
  config: StopSignalTaskConfig;
  trialResults: StopSignalTrialResult[];
}): StopSignalResult {
  const metrics = calculateStopSignalMetrics({
    trialResults: input.trialResults,
    plannedTrialCount: input.config.trialCount
  });
  const correctTrials = input.trialResults.filter((trial) => trial.isCorrect).length;

  return {
    sessionId: input.sessionId,
    userId: input.userId,
    trainingType: "stop_signal",
    startedAt: new Date(input.startedAtMs).toISOString(),
    endedAt: new Date(input.endedAtMs).toISOString(),
    durationSeconds: round(input.activeDurationSeconds, 3),
    difficultyLevel: input.config.difficultyLevel,
    completionRate: metrics.completionRate,
    accuracyRate: metrics.accuracyRate,
    totalTrials: input.trialResults.length,
    correctTrials,
    errorCount: input.trialResults.length - correctTrials,
    pauseCount: input.pauseCount,
    stopSignalDelayMs: input.config.stopSignalDelayMs,
    targetDisplayTimeMs: input.config.targetDisplayTimeMs,
    stopTrialRatio: input.config.stopTrialRatio,
    goTrialCount: metrics.goTrialCount,
    stopTrialCount: metrics.stopTrialCount,
    stopSuccessRate: metrics.stopSuccessRate,
    stopFailureCount: metrics.stopFailureCount,
    respondedBeforeStopSignalCount: metrics.respondedBeforeStopSignalCount,
    impulsiveResponseCount: metrics.impulsiveResponseCount,
    averageGoReactionTimeMs: metrics.averageGoReactionTimeMs,
    trialResults: input.trialResults
  };
}

export function createSeededStopSignalRandom(seed: number): () => number {
  let state = Math.max(1, Math.floor(seed)) % 2147483647;

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 2);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
