import { describe, expect, it } from "vitest";

import {
  buildRhythmNavigationRound,
  calculateRhythmNavigationMetrics,
  createRhythmNavigationClickRecord,
  createRhythmNavigationResult,
  createSeededRhythmNavigationRandom,
  getRhythmNavigationDifficultyConfig,
  RHYTHM_NAVIGATION_DIFFICULTIES
} from "../src/rhythm-navigation-game-model.js";
import type { RhythmNavigationClickRecord } from "../src/rhythm-navigation-game-types.js";

describe("rhythm navigation game model", () => {
  it("provides configurable difficulty levels with explicit task-switching rules", () => {
    expect(RHYTHM_NAVIGATION_DIFFICULTIES.easy.nodeCount).toBe(3);
    expect(RHYTHM_NAVIGATION_DIFFICULTIES.medium.nodeCount).toBe(4);
    expect(RHYTHM_NAVIGATION_DIFFICULTIES.hard.nodeCount).toBe(5);
    expect(RHYTHM_NAVIGATION_DIFFICULTIES.easy.previewDurationMs).toBeGreaterThan(
      RHYTHM_NAVIGATION_DIFFICULTIES.hard.previewDurationMs
    );
    expect(RHYTHM_NAVIGATION_DIFFICULTIES.medium.beatEnabled).toBe(true);
    expect(RHYTHM_NAVIGATION_DIFFICULTIES.medium.availableRules).toEqual([
      "blue_forward",
      "yellow_reverse",
      "low_tone_left",
      "high_tone_right"
    ]);
  });

  it("builds a bounded navigation round with blue, yellow, low-tone, and high-tone steps", () => {
    const config = getRhythmNavigationDifficultyConfig("hard");
    const round = buildRhythmNavigationRound({
      config,
      roundIndex: 0,
      previewStartedAtMs: 1000,
      width: 720,
      height: 420,
      random: createSeededRhythmNavigationRandom(19)
    });

    expect(round.nodes).toHaveLength(5);
    expect(round.route).toHaveLength(5);
    expect(round.previewUntilMs).toBe(1000 + config.previewDurationMs);
    expect(round.route.map((step) => step.ruleType)).toEqual([
      "blue_forward",
      "yellow_reverse",
      "low_tone_left",
      "high_tone_right",
      "blue_forward"
    ]);
    expect(round.route.slice(1).every((step) => step.isTaskSwitch)).toBe(true);

    const leftNode = round.nodes.reduce((selected, node) =>
      node.x < selected.x ? node : selected
    );
    const rightNode = round.nodes.reduce((selected, node) =>
      node.x > selected.x ? node : selected
    );
    expect(round.route[2]?.nodeId).toBe(leftNode.id);
    expect(round.route[3]?.nodeId).toBe(rightNode.id);
  });

  it("creates click records with route correctness, beat timing, and rule metadata", () => {
    const config = getRhythmNavigationDifficultyConfig("medium");
    const round = buildRhythmNavigationRound({
      config,
      roundIndex: 0,
      previewStartedAtMs: 0,
      width: 720,
      height: 420,
      random: createSeededRhythmNavigationRandom(29)
    });
    const expectedStep = round.route[0];
    if (!expectedStep) {
      throw new Error("Expected at least one route step.");
    }

    const record = createRhythmNavigationClickRecord({
      stepIndex: 0,
      clickedNodeId: expectedStep.nodeId,
      expectedStep,
      clickedAtMs: 2100,
      stepStartedAtMs: 1000,
      inputStartedAtMs: 1000,
      config
    });

    expect(record.isCorrect).toBe(true);
    expect(record.expectedRuleType).toBe("blue_forward");
    expect(record.previousRuleType).toBeNull();
    expect(record.isOldRuleInterferenceError).toBe(false);
    expect(record.beatOffsetMs).toBe(50);
    expect(record.isTimingCorrect).toBe(true);
    expect(record.reactionTimeMs).toBe(1100);
  });

  it("marks old-rule interference when a switched step is answered with the previous rule", () => {
    const config = getRhythmNavigationDifficultyConfig("medium");
    const round = buildRhythmNavigationRound({
      config,
      roundIndex: 0,
      previewStartedAtMs: 0,
      width: 720,
      height: 420,
      random: createSeededRhythmNavigationRandom(31)
    });
    const switchedStep = round.route[1];
    if (!switchedStep || switchedStep.previousRuleExpectedNodeId === null) {
      throw new Error("Expected a switched route step.");
    }

    const record = createRhythmNavigationClickRecord({
      stepIndex: 1,
      clickedNodeId: switchedStep.previousRuleExpectedNodeId,
      expectedStep: switchedStep,
      clickedAtMs: 2200,
      stepStartedAtMs: 1700,
      inputStartedAtMs: 1000,
      config
    });

    expect(record.isTaskSwitch).toBe(true);
    expect(record.isCorrect).toBe(false);
    expect(record.isOldRuleInterferenceError).toBe(true);
    expect(record.expectedRuleType).toBe("yellow_reverse");
    expect(record.previousRuleType).toBe("blue_forward");
  });

  it("calculates required route, timing, switching, and old-rule interference metrics", () => {
    const clickRecords: RhythmNavigationClickRecord[] = [
      {
        stepIndex: 0,
        clickedNodeId: "node-a",
        expectedNodeId: "node-a",
        clickedAtMs: 1050,
        reactionTimeMs: 500,
        beatOffsetMs: 50,
        isCorrect: true,
        isTimingCorrect: true,
        expectedRuleType: "blue_forward",
        previousRuleType: null,
        isTaskSwitch: false,
        isOldRuleInterferenceError: false
      },
      {
        stepIndex: 1,
        clickedNodeId: "node-a",
        expectedNodeId: "node-b",
        clickedAtMs: 2700,
        reactionTimeMs: 700,
        beatOffsetMs: 600,
        isCorrect: false,
        isTimingCorrect: false,
        expectedRuleType: "yellow_reverse",
        previousRuleType: "blue_forward",
        isTaskSwitch: true,
        isOldRuleInterferenceError: true
      },
      {
        stepIndex: 2,
        clickedNodeId: "node-c",
        expectedNodeId: "node-c",
        clickedAtMs: 3050,
        reactionTimeMs: 650,
        beatOffsetMs: -100,
        isCorrect: true,
        isTimingCorrect: true,
        expectedRuleType: "low_tone_left",
        previousRuleType: "yellow_reverse",
        isTaskSwitch: true,
        isOldRuleInterferenceError: false
      }
    ];

    const metrics = calculateRhythmNavigationMetrics({
      clickRecords,
      routeLength: 4,
      beatEnabled: true
    });

    expect(metrics.routeAccuracy).toBe(0.5);
    expect(metrics.sequenceErrorCount).toBe(1);
    expect(metrics.timingError).toBe(250);
    expect(metrics.averageReactionTime).toBe(616.67);
    expect(metrics.workingMemoryScore).toBe(50);
    expect(metrics.taskSwitchingScore).toBe(50);
    expect(metrics.rhythmSyncRate).toBe(0.6667);
    expect(metrics.routeCompletionRate).toBe(0.75);
    expect(metrics.taskSwitchErrorCount).toBe(1);
    expect(metrics.oldRuleInterferenceErrorCount).toBe(1);
    expect(metrics.taskRuleChangeCount).toBe(2);
    expect(metrics.ruleAccuracy).toBe(0.5);
  });

  it("returns neutral boundary metrics when the rhythm route is empty", () => {
    const metrics = calculateRhythmNavigationMetrics({
      clickRecords: [],
      routeLength: 0,
      beatEnabled: true
    });

    expect(metrics).toEqual({
      routeAccuracy: 0,
      sequenceErrorCount: 0,
      timingError: 0,
      averageReactionTime: 0,
      workingMemoryScore: 0,
      taskSwitchingScore: 100,
      rhythmSyncRate: 1,
      routeCompletionRate: 0,
      taskSwitchErrorCount: 0,
      oldRuleInterferenceErrorCount: 0,
      taskRuleChangeCount: 0,
      ruleAccuracy: 0,
      workingMemoryStepAccuracy: 0,
      averageBeatOffsetMs: 0
    });
  });

  it("rejects rhythm navigation rounds when no navigation nodes are available", () => {
    const invalidConfig = {
      ...getRhythmNavigationDifficultyConfig("easy"),
      nodeCount: 0,
      routeLength: 1
    };

    expect(() =>
      buildRhythmNavigationRound({
        config: invalidConfig,
        roundIndex: 0,
        previewStartedAtMs: 0,
        width: 720,
        height: 420,
        random: createSeededRhythmNavigationRandom(5)
      })
    ).toThrow("At least one navigation node is required.");
  });

  it("exports RhythmNavigationResult with rule-switch metrics and no clinical conclusion fields", () => {
    const config = getRhythmNavigationDifficultyConfig("easy");
    const metrics = calculateRhythmNavigationMetrics({
      clickRecords: [
        {
          stepIndex: 0,
          clickedNodeId: "node-a",
          expectedNodeId: "node-a",
          clickedAtMs: 1300,
          reactionTimeMs: 300,
          beatOffsetMs: null,
          isCorrect: true,
          isTimingCorrect: null,
          expectedRuleType: "blue_forward",
          previousRuleType: null,
          isTaskSwitch: false,
          isOldRuleInterferenceError: false
        }
      ],
      routeLength: config.routeLength,
      beatEnabled: config.beatEnabled
    });

    const result = createRhythmNavigationResult({
      sessionId: "rhythm-session-1",
      userId: "user-1",
      startedAtMs: 1000,
      endedAtMs: 2500,
      activeDurationSeconds: 1.5,
      pauseCount: 0,
      config,
      metrics
    });

    expect(result).toMatchObject({
      sessionId: "rhythm-session-1",
      userId: "user-1",
      trainingType: "rhythm_navigation",
      durationSeconds: 1.5,
      routeAccuracy: 0.3333,
      sequenceErrorCount: 0,
      timingError: 0,
      averageReactionTime: 300,
      workingMemoryScore: 33,
      taskSwitchingScore: 100,
      oldRuleInterferenceErrorCount: 0,
      taskRuleChangeCount: 0,
      ruleAccuracy: 0.3333
    });
    expect(result).not.toHaveProperty("diagnosis");
    expect(result).not.toHaveProperty("treatmentEffect");
  });
});
