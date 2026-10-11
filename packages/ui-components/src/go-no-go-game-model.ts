import type { CoreGameSessionResult, GameSessionSnapshot } from "@neuro-cog-rehab/game-core";
import type { GoNoGoGameResult } from "@neuro-cog-rehab/shared-types";

import type {
  GoNoGoDifficulty,
  GoNoGoDifficultyConfig,
  GoNoGoMetrics,
  GoNoGoStimulus,
  GoNoGoStimulusRole
} from "./go-no-go-game-types.js";

export const GO_NO_GO_DIFFICULTIES: Record<GoNoGoDifficulty, GoNoGoDifficultyConfig> = {
  easy: {
    id: "easy",
    label: "基础",
    difficultyLevel: 1,
    responseWindowMs: 1100,
    responseAllowedAfterMs: 80,
    stimulusDurationMs: 1100,
    interStimulusIntervalMs: 1600,
    stimulusIntervalMs: 1600,
    targetRatio: 0.75,
    durationSeconds: 60,
    stimulusDisplayMs: 1100,
    customParameters: {
      stimulusIntervalMs: 1600,
      targetRatio: 0.75,
      durationSeconds: 60
    }
  },
  medium: {
    id: "medium",
    label: "进阶",
    difficultyLevel: 2,
    responseWindowMs: 900,
    responseAllowedAfterMs: 80,
    stimulusDurationMs: 900,
    interStimulusIntervalMs: 1300,
    stimulusIntervalMs: 1300,
    targetRatio: 0.65,
    durationSeconds: 90,
    stimulusDisplayMs: 900,
    customParameters: {
      stimulusIntervalMs: 1300,
      targetRatio: 0.65,
      durationSeconds: 90
    }
  },
  hard: {
    id: "hard",
    label: "挑战",
    difficultyLevel: 3,
    responseWindowMs: 750,
    responseAllowedAfterMs: 90,
    stimulusDurationMs: 750,
    interStimulusIntervalMs: 1050,
    stimulusIntervalMs: 1050,
    targetRatio: 0.55,
    durationSeconds: 120,
    stimulusDisplayMs: 750,
    customParameters: {
      stimulusIntervalMs: 1050,
      targetRatio: 0.55,
      durationSeconds: 120
    }
  }
};

export function getGoNoGoDifficultyConfig(difficulty: GoNoGoDifficulty): GoNoGoDifficultyConfig {
  return { ...GO_NO_GO_DIFFICULTIES[difficulty] };
}

export function buildGoNoGoStimulus(input: {
  config: GoNoGoDifficultyConfig;
  stimulusIndex: number;
  appearedAtMs: number;
  width: number;
  height: number;
  random?: () => number;
  forceRole?: GoNoGoStimulusRole;
}): GoNoGoStimulus {
  const random = input.random ?? Math.random;
  const role = input.forceRole ?? (random() < input.config.targetRatio ? "go" : "no_go");
  const size = role === "go" ? 72 : 70;
  const margin = size * 1.2;

  return {
    id: `go-no-go-${input.stimulusIndex}-${role}`,
    role,
    appearedAtMs: input.appearedAtMs,
    expiresAtMs: input.appearedAtMs + input.config.stimulusDisplayMs,
    x: margin + random() * Math.max(input.width - margin * 2, margin),
    y: margin + random() * Math.max(input.height - margin * 2, margin),
    size,
    color: role === "go" ? "#2f8f63" : "#c75050",
    label: role === "go" ? "点击" : "等待"
  };
}

export function calculateGoNoGoMetrics(snapshot: GameSessionSnapshot): GoNoGoMetrics {
  const goOutcomes = snapshot.outcomes.filter((outcome) => outcome.expectedResponse);
  const noGoOutcomes = snapshot.outcomes.filter((outcome) => !outcome.expectedResponse);
  const hits = goOutcomes.filter((outcome) => outcome.outcomeType === "correct_response");
  const omissions = goOutcomes.filter(
    (outcome) =>
      outcome.outcomeType === "missed_response" || outcome.outcomeType === "late_response"
  );
  const falseAlarms = noGoOutcomes.filter((outcome) => outcome.outcomeType === "false_press");
  const correctInhibitions = noGoOutcomes.filter(
    (outcome) => outcome.outcomeType === "correct_inhibition"
  );
  const earlyResponses = snapshot.outcomes.filter(
    (outcome) => outcome.outcomeType === "early_response"
  );
  const reactionTimes = hits.flatMap((outcome) =>
    outcome.reactionTimeMs === null ? [] : [outcome.reactionTimeMs]
  );
  const totalTrials = goOutcomes.length + noGoOutcomes.length;
  const correctTrials = hits.length + correctInhibitions.length;

  return {
    goTrialCount: goOutcomes.length,
    noGoTrialCount: noGoOutcomes.length,
    hitCount: hits.length,
    omissionCount: omissions.length,
    falseAlarmCount: falseAlarms.length,
    correctInhibitionCount: correctInhibitions.length,
    earlyResponseCount: earlyResponses.length,
    averageReactionTimeMs: average(reactionTimes),
    reactionTimeVariabilityMs: standardDeviation(reactionTimes),
    accuracyRate: totalTrials === 0 ? 0 : round(correctTrials / totalTrials, 4),
    omissionRate: goOutcomes.length === 0 ? 0 : round(omissions.length / goOutcomes.length, 4),
    falsePressRate:
      noGoOutcomes.length === 0 ? 0 : round(falseAlarms.length / noGoOutcomes.length, 4),
    inhibitionSuccessRate:
      noGoOutcomes.length === 0 ? 0 : round(correctInhibitions.length / noGoOutcomes.length, 4)
  };
}

export function createGoNoGoGameResult(input: {
  coreResult: CoreGameSessionResult;
  metrics: GoNoGoMetrics;
}): GoNoGoGameResult {
  const { coreResult, metrics } = input;

  return {
    sessionId: coreResult.sessionId,
    userId: coreResult.userId,
    trainingType: "go_no_go",
    startedAt: coreResult.startedAt,
    endedAt: coreResult.endedAt,
    durationSeconds: coreResult.durationSeconds,
    difficultyLevel: coreResult.difficultyLevel,
    completionRate: coreResult.completionRate,
    accuracyRate: metrics.accuracyRate,
    totalTrials: metrics.goTrialCount + metrics.noGoTrialCount,
    correctTrials: metrics.hitCount + metrics.correctInhibitionCount,
    errorCount: metrics.omissionCount + metrics.falseAlarmCount + metrics.earlyResponseCount,
    pauseCount: coreResult.pauseCount,
    goAccuracyRate:
      metrics.goTrialCount === 0 ? 0 : round(metrics.hitCount / metrics.goTrialCount, 4),
    noGoInhibitionRate: metrics.inhibitionSuccessRate,
    falseAlarmCount: metrics.falseAlarmCount,
    omissionCount: metrics.omissionCount,
    earlyResponseCount: metrics.earlyResponseCount,
    averageGoReactionTimeMs: metrics.averageReactionTimeMs
  };
}

export function createSeededGoNoGoRandom(seed: number): () => number {
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

function standardDeviation(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }

  const mean = average(values);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return round(Math.sqrt(variance), 2);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
