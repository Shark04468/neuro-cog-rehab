import type { CoreGameSessionResult, GameSessionSnapshot } from "@neuro-cog-rehab/game-core";
import type { GameSessionResult } from "@neuro-cog-rehab/shared-types";

import type {
  SustainedAttentionDurationSeconds,
  SustainedAttentionFrequency,
  SustainedAttentionFrequencyConfig,
  SustainedAttentionMetrics,
  SustainedAttentionStimulus,
  SustainedAttentionStimulusRole,
  SustainedAttentionTaskConfig
} from "./sustained-attention-task-types.js";

export const SUSTAINED_ATTENTION_DURATIONS: SustainedAttentionDurationSeconds[] = [180, 300, 480];

export const SUSTAINED_ATTENTION_FREQUENCIES: Record<
  SustainedAttentionFrequency,
  SustainedAttentionFrequencyConfig
> = {
  low: {
    id: "low",
    label: "低频",
    minIntervalMs: 8000,
    maxIntervalMs: 12000,
    responseWindowMs: 1800,
    difficultyLevel: 1
  },
  medium: {
    id: "medium",
    label: "中频",
    minIntervalMs: 5500,
    maxIntervalMs: 8500,
    responseWindowMs: 1600,
    difficultyLevel: 2
  },
  high: {
    id: "high",
    label: "高频",
    minIntervalMs: 3500,
    maxIntervalMs: 6000,
    responseWindowMs: 1400,
    difficultyLevel: 3
  }
};

export function createSustainedAttentionTaskConfig(input: {
  durationSeconds: SustainedAttentionDurationSeconds;
  frequency: SustainedAttentionFrequency;
  distractorsEnabled: boolean;
}): SustainedAttentionTaskConfig {
  const frequencyConfig = SUSTAINED_ATTENTION_FREQUENCIES[input.frequency];
  const distractorChance = input.distractorsEnabled ? 0.28 : 0;

  return {
    difficultyLevel: input.distractorsEnabled
      ? Math.min(frequencyConfig.difficultyLevel + 1, 4)
      : frequencyConfig.difficultyLevel,
    responseWindowMs: frequencyConfig.responseWindowMs,
    responseAllowedAfterMs: 80,
    stimulusDurationMs: frequencyConfig.responseWindowMs,
    interStimulusIntervalMs: frequencyConfig.minIntervalMs,
    durationSeconds: input.durationSeconds,
    frequency: input.frequency,
    targetIntervalMinMs: frequencyConfig.minIntervalMs,
    targetIntervalMaxMs: frequencyConfig.maxIntervalMs,
    targetDisplayMs: frequencyConfig.responseWindowMs,
    distractorsEnabled: input.distractorsEnabled,
    distractorChance,
    customParameters: {
      durationSeconds: input.durationSeconds,
      frequency: input.frequency,
      distractorsEnabled: input.distractorsEnabled,
      targetIntervalMinMs: frequencyConfig.minIntervalMs,
      targetIntervalMaxMs: frequencyConfig.maxIntervalMs
    }
  };
}

export function getNextSustainedAttentionDelayMs(
  config: SustainedAttentionTaskConfig,
  random: () => number = Math.random
): number {
  const range = config.targetIntervalMaxMs - config.targetIntervalMinMs;
  return Math.round(config.targetIntervalMinMs + random() * range);
}

export function buildSustainedAttentionStimulus(input: {
  config: SustainedAttentionTaskConfig;
  stimulusIndex: number;
  appearedAtMs: number;
  width: number;
  height: number;
  random?: () => number;
  forceRole?: SustainedAttentionStimulusRole;
}): SustainedAttentionStimulus {
  const random = input.random ?? Math.random;
  const role =
    input.forceRole ??
    (input.config.distractorsEnabled && random() < input.config.distractorChance
      ? "distractor"
      : "target");
  const size = role === "target" ? 56 : 46;
  const margin = size * 1.2;

  return {
    id: `sustained-${input.stimulusIndex}-${role}`,
    role,
    appearedAtMs: input.appearedAtMs,
    expiresAtMs: input.appearedAtMs + input.config.targetDisplayMs,
    x: margin + random() * Math.max(input.width - margin * 2, margin),
    y: margin + random() * Math.max(input.height - margin * 2, margin),
    size,
    color: role === "target" ? "#2f6f8f" : "#9a8f6a",
    label: role === "target" ? "目标" : "干扰"
  };
}

export function findSustainedAttentionStimulusAtPoint(
  stimulus: SustainedAttentionStimulus | null,
  point: { x: number; y: number }
): SustainedAttentionStimulus | null {
  if (!stimulus) {
    return null;
  }

  const radius = stimulus.size / 2;
  const dx = point.x - stimulus.x;
  const dy = point.y - stimulus.y;
  return Math.sqrt(dx * dx + dy * dy) <= radius ? stimulus : null;
}

export function calculateSustainedAttentionMetrics(
  snapshot: GameSessionSnapshot
): SustainedAttentionMetrics {
  const targetOutcomes = snapshot.outcomes.filter((outcome) => outcome.expectedResponse);
  const hits = targetOutcomes.filter((outcome) => outcome.outcomeType === "correct_response");
  const missed = targetOutcomes.filter(
    (outcome) =>
      outcome.outcomeType === "missed_response" || outcome.outcomeType === "late_response"
  );
  const falsePressFromOutcomes = snapshot.outcomes.filter(
    (outcome) =>
      outcome.outcomeType === "false_press" ||
      outcome.outcomeType === "early_response" ||
      outcome.outcomeType === "late_response"
  ).length;
  const backgroundClicks = snapshot.clicks.filter(
    (click) => click.classification === "click_without_stimulus"
  ).length;
  const falsePressCount = falsePressFromOutcomes + backgroundClicks;
  const reactionTimes = hits.flatMap((outcome) =>
    outcome.reactionTimeMs === null ? [] : [outcome.reactionTimeMs]
  );
  const denominator = hits.length + missed.length + falsePressCount;
  const accuracy = denominator === 0 ? 0 : round(hits.length / denominator, 4);
  const reactionTimeVariabilityMs = standardDeviation(reactionTimes);

  return {
    targetCount: targetOutcomes.length,
    hitCount: hits.length,
    missedCount: missed.length,
    falsePressCount,
    averageReactionTimeMs: average(reactionTimes),
    reactionTimeVariabilityMs,
    accuracy,
    attentionStabilityScore: calculateAttentionStabilityScore({
      accuracy,
      missedCount: missed.length,
      targetCount: targetOutcomes.length,
      reactionTimeVariabilityMs
    }),
    taskPersistenceScore: calculateTaskPersistenceScore(snapshot)
  };
}

export function createStandardGameSessionResult(
  coreResult: CoreGameSessionResult
): GameSessionResult {
  return {
    sessionId: coreResult.sessionId,
    userId: coreResult.userId,
    trainingType: coreResult.trainingType,
    startedAt: coreResult.startedAt,
    endedAt: coreResult.endedAt,
    durationSeconds: coreResult.durationSeconds,
    difficultyLevel: coreResult.difficultyLevel,
    completionRate: coreResult.completionRate,
    accuracyRate: coreResult.accuracyRate,
    totalTrials: coreResult.totalTrials,
    correctTrials: coreResult.correctTrials,
    errorCount: coreResult.errorCount,
    pauseCount: coreResult.pauseCount
  };
}

export function createSeededSustainedAttentionRandom(seed: number): () => number {
  let state = Math.max(1, Math.floor(seed)) % 2147483647;

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function calculateAttentionStabilityScore(input: {
  accuracy: number;
  missedCount: number;
  targetCount: number;
  reactionTimeVariabilityMs: number;
}): number {
  const missRate = input.targetCount === 0 ? 0 : clamp(input.missedCount / input.targetCount, 0, 1);
  const variabilityPenalty = clamp(input.reactionTimeVariabilityMs / 900, 0, 1);
  const score = input.accuracy * 62 + (1 - missRate) * 24 + (1 - variabilityPenalty) * 14;

  return Math.round(clamp(score, 0, 100));
}

function calculateTaskPersistenceScore(snapshot: GameSessionSnapshot): number {
  const pausePenalty = Math.min(snapshot.pauseCount * 8, 32);
  const progressScore = snapshot.countdown.progressRate * 100;

  return Math.round(clamp(progressScore - pausePenalty, 0, 100));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 2);
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }

  const mean = average(values);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return round(Math.sqrt(variance), 2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
