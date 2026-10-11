import type { GameSessionSnapshot } from "@neuro-cog-rehab/game-core";

import type {
  TargetDetectionDifficulty,
  TargetDetectionDifficultyConfig,
  TargetDetectionGameResult,
  TargetDetectionMetrics,
  TargetDetectionResultInput,
  TargetDetectionShape,
  TargetDetectionShapeKind,
  TargetDetectionTrial
} from "./target-detection-game-types.js";

export const TARGET_DETECTION_DIFFICULTIES: Record<
  TargetDetectionDifficulty,
  TargetDetectionDifficultyConfig
> = {
  easy: {
    id: "easy",
    label: "基础",
    difficultyLevel: 1,
    targetCount: 1,
    distractorCount: 3,
    presentationTimeMs: 2600,
    responseWindowMs: 2600,
    responseAllowedAfterMs: 80,
    stimulusDurationMs: 2600,
    interStimulusIntervalMs: 600
  },
  medium: {
    id: "medium",
    label: "进阶",
    difficultyLevel: 2,
    targetCount: 2,
    distractorCount: 5,
    presentationTimeMs: 2200,
    responseWindowMs: 2200,
    responseAllowedAfterMs: 80,
    stimulusDurationMs: 2200,
    interStimulusIntervalMs: 500
  },
  hard: {
    id: "hard",
    label: "挑战",
    difficultyLevel: 3,
    targetCount: 3,
    distractorCount: 7,
    presentationTimeMs: 1700,
    responseWindowMs: 1700,
    responseAllowedAfterMs: 80,
    stimulusDurationMs: 1700,
    interStimulusIntervalMs: 450
  }
};

export const TARGET_SHAPE_LABELS: Record<TargetDetectionShapeKind, string> = {
  circle: "圆形",
  square: "方形",
  triangle: "三角形",
  diamond: "菱形"
};

const SHAPE_KINDS: TargetDetectionShapeKind[] = ["circle", "square", "triangle", "diamond"];
const TARGET_COLORS = ["#2f6f8f", "#4f7d4f", "#7a5f9a", "#9a6541"] as const;
const DISTRACTOR_COLORS = ["#b47c6c", "#71849b", "#9b8b55", "#6d8b84", "#8f7896"] as const;

export function createTargetDetectionDifficulty(
  difficulty: TargetDetectionDifficulty
): TargetDetectionDifficultyConfig {
  return { ...TARGET_DETECTION_DIFFICULTIES[difficulty] };
}

export function buildTargetDetectionTrial(input: {
  difficulty: TargetDetectionDifficultyConfig;
  trialIndex: number;
  startedAtMs: number;
  width: number;
  height: number;
  random?: () => number;
}): TargetDetectionTrial {
  const random = input.random ?? Math.random;
  const targetKind = SHAPE_KINDS[input.trialIndex % SHAPE_KINDS.length] ?? "circle";
  const shapeCount = input.difficulty.targetCount + input.difficulty.distractorCount;
  const size = shapeSizeForDifficulty(input.difficulty.id);
  const shapes: TargetDetectionShape[] = [];

  for (let index = 0; index < shapeCount; index += 1) {
    const role = index < input.difficulty.targetCount ? "target" : "distractor";
    const kind = role === "target" ? targetKind : pickDistractorKind(targetKind, index);
    const position = findShapePosition({
      existingShapes: shapes,
      width: input.width,
      height: input.height,
      size,
      random
    });

    shapes.push({
      id: `trial-${input.trialIndex}-shape-${index}`,
      trialIndex: input.trialIndex,
      role,
      kind,
      x: position.x,
      y: position.y,
      size,
      color:
        role === "target"
          ? (TARGET_COLORS[input.trialIndex % TARGET_COLORS.length] ?? TARGET_COLORS[0])
          : (DISTRACTOR_COLORS[index % DISTRACTOR_COLORS.length] ?? DISTRACTOR_COLORS[0])
    });
  }

  return {
    id: `target-detection-trial-${input.trialIndex}`,
    trialIndex: input.trialIndex,
    startedAtMs: input.startedAtMs,
    durationMs: input.difficulty.presentationTimeMs,
    targetKind,
    targetLabel: TARGET_SHAPE_LABELS[targetKind],
    shapes: shuffleShapes(shapes, random)
  };
}

export function findShapeAtPoint(
  shapes: readonly TargetDetectionShape[],
  point: { x: number; y: number }
): TargetDetectionShape | null {
  for (const shape of [...shapes].reverse()) {
    const halfSize = shape.size / 2;
    const dx = point.x - shape.x;
    const dy = point.y - shape.y;

    if (Math.sqrt(dx * dx + dy * dy) <= halfSize) {
      return shape;
    }
  }

  return null;
}

export function createTargetDetectionGameResult(
  input: TargetDetectionResultInput
): TargetDetectionGameResult {
  const metrics = calculateTargetDetectionMetrics(input.snapshot);

  return {
    ...input.coreResult,
    ...metrics,
    gameId: "target_detection_attention",
    difficultyId: input.difficulty.id,
    targetCountPerTrial: input.difficulty.targetCount,
    distractorCountPerTrial: input.difficulty.distractorCount,
    presentationTimeMs: input.difficulty.presentationTimeMs,
    exportedAt: input.exportedAt ?? new Date().toISOString()
  };
}

export function calculateTargetDetectionMetrics(
  snapshot: GameSessionSnapshot
): TargetDetectionMetrics {
  const correctTargetOutcomes = snapshot.outcomes.filter(
    (outcome) => outcome.expectedResponse && outcome.outcomeType === "correct_response"
  );
  const missedOutcomes = snapshot.outcomes.filter(
    (outcome) =>
      outcome.expectedResponse &&
      (outcome.outcomeType === "missed_response" || outcome.outcomeType === "late_response")
  );
  const errorOutcomeCount = snapshot.outcomes.filter(
    (outcome) =>
      outcome.outcomeType === "false_press" ||
      outcome.outcomeType === "early_response" ||
      outcome.outcomeType === "late_response"
  ).length;
  const backgroundClickCount = snapshot.clicks.filter(
    (click) => click.classification === "click_without_stimulus"
  ).length;
  const reactionTimes = correctTargetOutcomes.flatMap((outcome) =>
    outcome.reactionTimeMs === null ? [] : [outcome.reactionTimeMs]
  );
  const correctCount = correctTargetOutcomes.length;
  const missedCount = missedOutcomes.length;
  const errorCount = errorOutcomeCount + backgroundClickCount;
  const denominator = correctCount + errorCount + missedCount;
  const accuracy = denominator === 0 ? 0 : round(correctCount / denominator, 4);
  const reactionTimeVariability = standardDeviation(reactionTimes);

  return {
    correctCount,
    errorCount,
    missedCount,
    averageReactionTime: average(reactionTimes),
    reactionTimeVariability,
    accuracy,
    attentionStabilityScore: calculateAttentionStabilityScore({
      accuracy,
      missedCount,
      expectedTargetCount: correctCount + missedCount,
      reactionTimeVariability
    })
  };
}

export function createSeededRandom(seed: number): () => number {
  let state = Math.max(1, Math.floor(seed)) % 2147483647;

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function calculateAttentionStabilityScore(input: {
  accuracy: number;
  missedCount: number;
  expectedTargetCount: number;
  reactionTimeVariability: number;
}): number {
  const missRate =
    input.expectedTargetCount === 0
      ? 0
      : clamp(input.missedCount / input.expectedTargetCount, 0, 1);
  const variabilityPenalty = clamp(input.reactionTimeVariability / 700, 0, 1);
  const score = input.accuracy * 72 + (1 - missRate) * 18 + (1 - variabilityPenalty) * 10;

  return Math.round(clamp(score, 0, 100));
}

function shapeSizeForDifficulty(difficulty: TargetDetectionDifficulty): number {
  switch (difficulty) {
    case "easy":
      return 58;
    case "medium":
      return 50;
    case "hard":
      return 44;
  }
}

function pickDistractorKind(
  targetKind: TargetDetectionShapeKind,
  index: number
): TargetDetectionShapeKind {
  const candidates = SHAPE_KINDS.filter((kind) => kind !== targetKind);
  return candidates[index % candidates.length] ?? "square";
}

function findShapePosition(input: {
  existingShapes: TargetDetectionShape[];
  width: number;
  height: number;
  size: number;
  random: () => number;
}): { x: number; y: number } {
  const margin = input.size * 0.85;
  const maxAttempts = 60;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = {
      x: margin + input.random() * Math.max(input.width - margin * 2, margin),
      y: margin + input.random() * Math.max(input.height - margin * 2, margin)
    };

    if (isFarEnough(candidate, input.existingShapes, input.size * 1.18)) {
      return candidate;
    }
  }

  const columnCount = Math.max(1, Math.floor(input.width / (input.size * 1.5)));
  const index = input.existingShapes.length;

  return {
    x: margin + (index % columnCount) * input.size * 1.5,
    y: margin + Math.floor(index / columnCount) * input.size * 1.5
  };
}

function isFarEnough(
  candidate: { x: number; y: number },
  shapes: TargetDetectionShape[],
  minDistance: number
): boolean {
  return shapes.every((shape) => {
    const dx = candidate.x - shape.x;
    const dy = candidate.y - shape.y;
    return Math.sqrt(dx * dx + dy * dy) >= minDistance;
  });
}

function shuffleShapes(
  shapes: TargetDetectionShape[],
  random: () => number
): TargetDetectionShape[] {
  const result = [...shapes];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = result[index];
    const next = result[swapIndex];

    if (current !== undefined && next !== undefined) {
      result[index] = next;
      result[swapIndex] = current;
    }
  }

  return result;
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
