import { createGameSessionCore } from "@neuro-cog-rehab/game-core";
import { describe, expect, it } from "vitest";

import {
  buildTargetDetectionTrial,
  calculateTargetDetectionMetrics,
  createSeededRandom,
  createTargetDetectionDifficulty,
  createTargetDetectionGameResult,
  findShapeAtPoint
} from "../src/target-detection-game-model.js";

describe("target detection attention game model", () => {
  it("defines three bounded difficulty levels", () => {
    const easy = createTargetDetectionDifficulty("easy");
    const medium = createTargetDetectionDifficulty("medium");
    const hard = createTargetDetectionDifficulty("hard");

    expect(easy.targetCount).toBe(1);
    expect(medium.distractorCount).toBeGreaterThan(easy.distractorCount);
    expect(hard.presentationTimeMs).toBeLessThan(medium.presentationTimeMs);
    expect(hard.difficultyLevel).toBe(3);
  });

  it("builds a deterministic trial with target and distractor shapes", () => {
    const difficulty = createTargetDetectionDifficulty("medium");
    const trial = buildTargetDetectionTrial({
      difficulty,
      trialIndex: 1,
      startedAtMs: 1000,
      width: 720,
      height: 420,
      random: createSeededRandom(7)
    });

    expect(trial.shapes).toHaveLength(difficulty.targetCount + difficulty.distractorCount);
    expect(trial.shapes.filter((shape) => shape.role === "target")).toHaveLength(2);
    expect(trial.shapes.every((shape) => shape.x > 0 && shape.y > 0)).toBe(true);
    expect(trial.targetLabel).toBe("方形");
  });

  it("detects shape hits by canvas coordinates", () => {
    const difficulty = createTargetDetectionDifficulty("easy");
    const trial = buildTargetDetectionTrial({
      difficulty,
      trialIndex: 0,
      startedAtMs: 0,
      width: 720,
      height: 420,
      random: createSeededRandom(3)
    });
    const target = trial.shapes.find((shape) => shape.role === "target");

    expect(target).toBeDefined();
    expect(findShapeAtPoint(trial.shapes, { x: target?.x ?? 0, y: target?.y ?? 0 })?.id).toBe(
      target?.id
    );
    expect(findShapeAtPoint(trial.shapes, { x: -20, y: -20 })).toBeNull();
  });

  it("aggregates target detection result metrics from game-core records", () => {
    const difficulty = createTargetDetectionDifficulty("easy");
    const core = createGameSessionCore({
      sessionId: "target-session-1",
      userId: "user-1",
      trainingType: "attention_training",
      plannedDurationSeconds: 20,
      difficulty
    });

    core.start(0);
    core.presentStimulus({
      id: "target-1",
      kind: "target",
      expectedResponse: true,
      presentedAtMs: 100,
      responseWindowMs: 1000
    });
    core.recordClick({
      stimulusId: "target-1",
      clickedAtMs: 460
    });
    core.presentStimulus({
      id: "target-2",
      kind: "target",
      expectedResponse: true,
      presentedAtMs: 1200,
      responseWindowMs: 1000
    });
    core.advance(2301);
    core.presentStimulus({
      id: "distractor-1",
      kind: "distractor",
      expectedResponse: false,
      presentedAtMs: 2400,
      responseWindowMs: 1000
    });
    core.recordClick({
      stimulusId: "distractor-1",
      clickedAtMs: 2600
    });

    const coreResult = core.complete(4000);
    const snapshot = core.getSnapshot(4000);
    const metrics = calculateTargetDetectionMetrics(snapshot);
    const result = createTargetDetectionGameResult({
      coreResult,
      snapshot,
      difficulty,
      exportedAt: "2026-06-15T00:00:00.000Z"
    });

    expect(metrics).toMatchObject({
      correctCount: 1,
      errorCount: 1,
      missedCount: 1,
      averageReactionTime: 360,
      accuracy: 0.3333
    });
    expect(result.gameId).toBe("target_detection_attention");
    expect(result.trainingType).toBe("attention_training");
    expect(result.attentionStabilityScore).toBeGreaterThan(0);
    expect(JSON.stringify(result).toLowerCase()).not.toContain("diagnosis");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("cure");
  });

  it("returns bounded attention metrics when no target trial has completed", () => {
    const difficulty = createTargetDetectionDifficulty("easy");
    const core = createGameSessionCore({
      sessionId: "target-empty-session",
      userId: "user-1",
      trainingType: "attention_training",
      plannedDurationSeconds: 20,
      difficulty
    });

    core.start(0);

    expect(calculateTargetDetectionMetrics(core.getSnapshot(0))).toEqual({
      correctCount: 0,
      errorCount: 0,
      missedCount: 0,
      averageReactionTime: 0,
      reactionTimeVariability: 0,
      accuracy: 0,
      attentionStabilityScore: 28
    });
  });

  it("counts background, early, and late clicks as target detection errors", () => {
    const difficulty = {
      ...createTargetDetectionDifficulty("easy"),
      responseAllowedAfterMs: 100,
      responseWindowMs: 300
    };
    const core = createGameSessionCore({
      sessionId: "target-abnormal-session",
      userId: "user-1",
      trainingType: "attention_training",
      plannedDurationSeconds: 20,
      difficulty
    });

    core.start(0);
    core.recordClick({ clickedAtMs: 50 });
    core.presentStimulus({
      id: "target-early",
      kind: "target",
      expectedResponse: true,
      presentedAtMs: 100,
      responseWindowMs: 300,
      responseAllowedAfterMs: 100
    });
    core.recordClick({ stimulusId: "target-early", clickedAtMs: 150 });
    core.presentStimulus({
      id: "target-late",
      kind: "target",
      expectedResponse: true,
      presentedAtMs: 1000,
      responseWindowMs: 300,
      responseAllowedAfterMs: 100
    });
    core.recordClick({ stimulusId: "target-late", clickedAtMs: 1400 });

    const metrics = calculateTargetDetectionMetrics(core.getSnapshot(1500));

    expect(metrics.correctCount).toBe(0);
    expect(metrics.errorCount).toBe(3);
    expect(metrics.missedCount).toBe(1);
    expect(metrics.accuracy).toBe(0);
    expect(metrics.attentionStabilityScore).toBe(10);
  });
});
