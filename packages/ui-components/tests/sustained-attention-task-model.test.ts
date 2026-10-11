import { createGameSessionCore } from "@neuro-cog-rehab/game-core";
import { describe, expect, it } from "vitest";

import {
  buildSustainedAttentionStimulus,
  calculateSustainedAttentionMetrics,
  createSeededSustainedAttentionRandom,
  createStandardGameSessionResult,
  createSustainedAttentionTaskConfig,
  getNextSustainedAttentionDelayMs,
  SUSTAINED_ATTENTION_DURATIONS,
  SUSTAINED_ATTENTION_FREQUENCIES
} from "../src/sustained-attention-task-model.js";

describe("sustained attention task model", () => {
  it("supports the required training durations and frequency bands", () => {
    expect(SUSTAINED_ATTENTION_DURATIONS).toEqual([180, 300, 480]);
    expect(SUSTAINED_ATTENTION_FREQUENCIES.high.maxIntervalMs).toBeLessThan(
      SUSTAINED_ATTENTION_FREQUENCIES.low.minIntervalMs
    );

    const config = createSustainedAttentionTaskConfig({
      durationSeconds: 300,
      frequency: "high",
      distractorsEnabled: true
    });

    expect(config.durationSeconds).toBe(300);
    expect(config.distractorsEnabled).toBe(true);
    expect(config.difficultyLevel).toBe(4);
  });

  it("creates bounded stimulus delays and optional distractors", () => {
    const random = createSeededSustainedAttentionRandom(11);
    const config = createSustainedAttentionTaskConfig({
      durationSeconds: 180,
      frequency: "medium",
      distractorsEnabled: true
    });
    const delayMs = getNextSustainedAttentionDelayMs(config, random);
    const target = buildSustainedAttentionStimulus({
      config,
      stimulusIndex: 1,
      appearedAtMs: 1000,
      width: 720,
      height: 420,
      random,
      forceRole: "target"
    });
    const distractor = buildSustainedAttentionStimulus({
      config,
      stimulusIndex: 2,
      appearedAtMs: 3000,
      width: 720,
      height: 420,
      random,
      forceRole: "distractor"
    });

    expect(delayMs).toBeGreaterThanOrEqual(config.targetIntervalMinMs);
    expect(delayMs).toBeLessThanOrEqual(config.targetIntervalMaxMs);
    expect(target.role).toBe("target");
    expect(target.expiresAtMs).toBe(1000 + config.targetDisplayMs);
    expect(distractor.role).toBe("distractor");
    expect(distractor.size).toBeLessThan(target.size);
  });

  it("calculates missed responses and reaction-time variability", () => {
    const config = createSustainedAttentionTaskConfig({
      durationSeconds: 180,
      frequency: "low",
      distractorsEnabled: true
    });
    const core = createGameSessionCore({
      sessionId: "sustained-session-1",
      userId: "user-1",
      trainingType: "attention_training",
      plannedDurationSeconds: 180,
      difficulty: config
    });

    core.start(0);
    core.presentStimulus({
      id: "target-1",
      kind: "target",
      expectedResponse: true,
      presentedAtMs: 100,
      responseWindowMs: 1000
    });
    core.recordClick({ stimulusId: "target-1", clickedAtMs: 450 });
    core.presentStimulus({
      id: "target-2",
      kind: "target",
      expectedResponse: true,
      presentedAtMs: 2000,
      responseWindowMs: 1000
    });
    core.advance(3101);
    core.presentStimulus({
      id: "target-3",
      kind: "target",
      expectedResponse: true,
      presentedAtMs: 4000,
      responseWindowMs: 1000
    });
    core.recordClick({ stimulusId: "target-3", clickedAtMs: 4700 });
    core.presentStimulus({
      id: "distractor-1",
      kind: "distractor",
      expectedResponse: false,
      presentedAtMs: 6000,
      responseWindowMs: 1000
    });
    core.recordClick({ stimulusId: "distractor-1", clickedAtMs: 6300 });

    const snapshot = core.getSnapshot(8000);
    const metrics = calculateSustainedAttentionMetrics(snapshot);

    expect(metrics.targetCount).toBe(3);
    expect(metrics.hitCount).toBe(2);
    expect(metrics.missedCount).toBe(1);
    expect(metrics.falsePressCount).toBe(1);
    expect(metrics.averageReactionTimeMs).toBe(525);
    expect(metrics.reactionTimeVariabilityMs).toBe(175);
    expect(metrics.accuracy).toBe(0.5);
    expect(metrics.attentionStabilityScore).toBeGreaterThan(0);
  });

  it("exports only the standard GameSessionResult fields", () => {
    const config = createSustainedAttentionTaskConfig({
      durationSeconds: 180,
      frequency: "low",
      distractorsEnabled: false
    });
    const core = createGameSessionCore({
      sessionId: "sustained-session-standard",
      userId: "user-1",
      trainingType: "attention_training",
      plannedDurationSeconds: 180,
      difficulty: config
    });

    core.start(0);
    core.presentStimulus({
      id: "target-1",
      kind: "target",
      expectedResponse: true,
      presentedAtMs: 100,
      responseWindowMs: 1000
    });
    core.recordClick({ stimulusId: "target-1", clickedAtMs: 500 });

    const standardResult = createStandardGameSessionResult(core.complete(1500));

    expect(standardResult).toEqual({
      sessionId: "sustained-session-standard",
      userId: "user-1",
      trainingType: "attention_training",
      startedAt: "1970-01-01T00:00:00.000Z",
      endedAt: "1970-01-01T00:00:01.500Z",
      durationSeconds: 1.5,
      difficultyLevel: 1,
      completionRate: 1,
      accuracyRate: 1,
      totalTrials: 1,
      correctTrials: 1,
      errorCount: 0,
      pauseCount: 0
    });
    expect(standardResult).not.toHaveProperty("reactionTimeVariabilityMs");
    expect(standardResult).not.toHaveProperty("attentionStabilityScore");
  });
});
