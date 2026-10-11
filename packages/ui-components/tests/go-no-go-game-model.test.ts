import { createGameSessionCore } from "@neuro-cog-rehab/game-core";
import { describe, expect, it } from "vitest";

import {
  buildGoNoGoStimulus,
  calculateGoNoGoMetrics,
  createGoNoGoGameResult,
  createSeededGoNoGoRandom,
  getGoNoGoDifficultyConfig,
  GO_NO_GO_DIFFICULTIES
} from "../src/go-no-go-game-model.js";

describe("go/no-go game model", () => {
  it("provides configurable stimulus interval, target ratio, and duration", () => {
    expect(GO_NO_GO_DIFFICULTIES.easy.stimulusIntervalMs).toBeGreaterThan(
      GO_NO_GO_DIFFICULTIES.hard.stimulusIntervalMs
    );
    expect(GO_NO_GO_DIFFICULTIES.easy.targetRatio).toBeGreaterThan(
      GO_NO_GO_DIFFICULTIES.hard.targetRatio
    );

    const config = getGoNoGoDifficultyConfig("medium");

    expect(config.id).toBe("medium");
    expect(config.durationSeconds).toBe(90);
    expect(config.customParameters).toMatchObject({
      stimulusIntervalMs: 1300,
      targetRatio: 0.65,
      durationSeconds: 90
    });
  });

  it("builds bounded green Go and red No-Go stimuli", () => {
    const config = getGoNoGoDifficultyConfig("easy");
    const random = createSeededGoNoGoRandom(17);
    const goStimulus = buildGoNoGoStimulus({
      config,
      stimulusIndex: 1,
      appearedAtMs: 1000,
      width: 720,
      height: 420,
      random,
      forceRole: "go"
    });
    const noGoStimulus = buildGoNoGoStimulus({
      config,
      stimulusIndex: 2,
      appearedAtMs: 2500,
      width: 720,
      height: 420,
      random,
      forceRole: "no_go"
    });

    expect(goStimulus.role).toBe("go");
    expect(goStimulus.label).toBe("点击");
    expect(goStimulus.expiresAtMs).toBe(1000 + config.stimulusDisplayMs);
    expect(noGoStimulus.role).toBe("no_go");
    expect(noGoStimulus.label).toBe("等待");
    expect(noGoStimulus.x).toBeGreaterThan(0);
    expect(noGoStimulus.y).toBeGreaterThan(0);
  });

  it("calculates reaction, omission, false press, and inhibition metrics", () => {
    const config = getGoNoGoDifficultyConfig("easy");
    const core = createGameSessionCore({
      sessionId: "go-no-go-session-1",
      userId: "user-1",
      trainingType: "go_no_go",
      plannedDurationSeconds: 60,
      difficulty: config
    });

    core.start(0);
    core.presentStimulus({
      id: "go-1",
      kind: "go",
      expectedResponse: true,
      presentedAtMs: 100,
      responseWindowMs: 1000
    });
    core.recordClick({ stimulusId: "go-1", clickedAtMs: 400 });
    core.presentStimulus({
      id: "no-go-1",
      kind: "no_go",
      expectedResponse: false,
      presentedAtMs: 1200,
      responseWindowMs: 1000
    });
    core.advance(2201);
    core.presentStimulus({
      id: "go-2",
      kind: "go",
      expectedResponse: true,
      presentedAtMs: 3000,
      responseWindowMs: 1000
    });
    core.recordClick({ stimulusId: "go-2", clickedAtMs: 3700 });
    core.presentStimulus({
      id: "go-3",
      kind: "go",
      expectedResponse: true,
      presentedAtMs: 4500,
      responseWindowMs: 1000
    });
    core.advance(5501);
    core.presentStimulus({
      id: "no-go-2",
      kind: "no_go",
      expectedResponse: false,
      presentedAtMs: 6000,
      responseWindowMs: 1000
    });
    core.recordClick({ stimulusId: "no-go-2", clickedAtMs: 6400 });

    const metrics = calculateGoNoGoMetrics(core.getSnapshot(7000));

    expect(metrics.goTrialCount).toBe(3);
    expect(metrics.noGoTrialCount).toBe(2);
    expect(metrics.hitCount).toBe(2);
    expect(metrics.omissionCount).toBe(1);
    expect(metrics.falseAlarmCount).toBe(1);
    expect(metrics.correctInhibitionCount).toBe(1);
    expect(metrics.averageReactionTimeMs).toBe(500);
    expect(metrics.reactionTimeVariabilityMs).toBe(200);
    expect(metrics.accuracyRate).toBe(0.6);
    expect(metrics.omissionRate).toBe(0.3333);
    expect(metrics.falsePressRate).toBe(0.5);
    expect(metrics.inhibitionSuccessRate).toBe(0.5);
  });

  it("returns zero rates for an empty Go/No-Go snapshot boundary", () => {
    const config = getGoNoGoDifficultyConfig("easy");
    const core = createGameSessionCore({
      sessionId: "go-no-go-empty-session",
      userId: "user-1",
      trainingType: "go_no_go",
      plannedDurationSeconds: 60,
      difficulty: config
    });

    core.start(0);

    expect(calculateGoNoGoMetrics(core.getSnapshot(0))).toEqual({
      goTrialCount: 0,
      noGoTrialCount: 0,
      hitCount: 0,
      omissionCount: 0,
      falseAlarmCount: 0,
      correctInhibitionCount: 0,
      earlyResponseCount: 0,
      averageReactionTimeMs: 0,
      reactionTimeVariabilityMs: 0,
      accuracyRate: 0,
      omissionRate: 0,
      falsePressRate: 0,
      inhibitionSuccessRate: 0
    });
  });

  it("counts early and late Go responses as abnormal training outcomes", () => {
    const config = {
      ...getGoNoGoDifficultyConfig("easy"),
      responseAllowedAfterMs: 100,
      responseWindowMs: 500
    };
    const core = createGameSessionCore({
      sessionId: "go-no-go-abnormal-session",
      userId: "user-1",
      trainingType: "go_no_go",
      plannedDurationSeconds: 60,
      difficulty: config
    });

    core.start(0);
    core.presentStimulus({
      id: "go-early",
      kind: "go",
      expectedResponse: true,
      presentedAtMs: 100,
      responseWindowMs: 500,
      responseAllowedAfterMs: 100
    });
    core.recordClick({ stimulusId: "go-early", clickedAtMs: 150 });
    core.presentStimulus({
      id: "go-late",
      kind: "go",
      expectedResponse: true,
      presentedAtMs: 1000,
      responseWindowMs: 500,
      responseAllowedAfterMs: 100
    });
    core.recordClick({ stimulusId: "go-late", clickedAtMs: 1700 });

    const metrics = calculateGoNoGoMetrics(core.getSnapshot(1800));

    expect(metrics.goTrialCount).toBe(2);
    expect(metrics.hitCount).toBe(0);
    expect(metrics.omissionCount).toBe(1);
    expect(metrics.earlyResponseCount).toBe(1);
    expect(metrics.accuracyRate).toBe(0);
    expect(metrics.omissionRate).toBe(0.5);
  });

  it("exports a GoNoGoGameResult without clinical conclusion fields", () => {
    const config = getGoNoGoDifficultyConfig("easy");
    const core = createGameSessionCore({
      sessionId: "go-no-go-session-result",
      userId: "user-1",
      trainingType: "go_no_go",
      plannedDurationSeconds: 60,
      difficulty: config
    });

    core.start(0);
    core.presentStimulus({
      id: "go-1",
      kind: "go",
      expectedResponse: true,
      presentedAtMs: 100,
      responseWindowMs: 1000
    });
    core.recordClick({ stimulusId: "go-1", clickedAtMs: 500 });

    const coreResult = core.complete(1500);
    const metrics = calculateGoNoGoMetrics(core.getSnapshot(1500));
    const result = createGoNoGoGameResult({ coreResult, metrics });

    expect(result).toEqual({
      sessionId: "go-no-go-session-result",
      userId: "user-1",
      trainingType: "go_no_go",
      startedAt: "1970-01-01T00:00:00.000Z",
      endedAt: "1970-01-01T00:00:01.500Z",
      durationSeconds: 1.5,
      difficultyLevel: 1,
      completionRate: 1,
      accuracyRate: 1,
      totalTrials: 1,
      correctTrials: 1,
      errorCount: 0,
      pauseCount: 0,
      goAccuracyRate: 1,
      noGoInhibitionRate: 0,
      falseAlarmCount: 0,
      omissionCount: 0,
      earlyResponseCount: 0,
      averageGoReactionTimeMs: 400
    });
    expect(result).not.toHaveProperty("diagnosis");
    expect(result).not.toHaveProperty("treatmentEffect");
  });
});
