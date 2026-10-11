import { describe, expect, it } from "vitest";
import { GameCoreError, createGameSessionCore, type GameSessionCoreConfig } from "../src/index.js";

const baseConfig: GameSessionCoreConfig = {
  sessionId: "session-game-1",
  userId: "user-1",
  trainingType: "attention_training",
  plannedDurationSeconds: 60,
  plannedTrialCount: 4,
  difficulty: {
    difficultyLevel: 2,
    responseWindowMs: 1000,
    responseAllowedAfterMs: 100,
    stimulusDurationMs: 600,
    interStimulusIntervalMs: 300,
    customParameters: {
      targetCount: 3
    }
  }
};

describe("GameSessionCore", () => {
  it("tracks countdown while excluding paused time", () => {
    const core = createGameSessionCore(baseConfig);

    expect(core.start(0)).toMatchObject({
      status: "running",
      elapsedSeconds: 0,
      remainingSeconds: 60
    });

    expect(core.getCountdown(10_000).elapsedSeconds).toBe(10);
    core.pause(10_000);
    expect(core.getCountdown(30_000).elapsedSeconds).toBe(10);

    core.resume(35_000);
    expect(core.getCountdown(45_000)).toMatchObject({
      status: "running",
      elapsedSeconds: 20,
      remainingSeconds: 40
    });
  });

  it("records stimulus clicks and calculates reaction time and accuracy", () => {
    const core = createGameSessionCore(baseConfig);
    core.start(1_000);
    core.presentStimulus({
      id: "target-1",
      kind: "target",
      expectedResponse: true,
      presentedAtMs: 1_200
    });

    const click = core.recordClick({
      clickedAtMs: 1_650,
      stimulusId: "target-1"
    });
    const result = core.complete(2_500);

    expect(click.classification).toBe("correct_response");
    expect(click.reactionTimeMs).toBe(450);
    expect(result).toMatchObject({
      sessionId: "session-game-1",
      userId: "user-1",
      trainingType: "attention_training",
      totalTrials: 1,
      correctTrials: 1,
      accuracyRate: 1,
      averageReactionTimeMs: 450,
      omissionRate: 0,
      falsePressRate: 0
    });
  });

  it("calculates omission and false press rates from completed trials", () => {
    const core = createGameSessionCore({
      ...baseConfig,
      trainingType: "go_no_go"
    });
    core.start(0);
    core.presentStimulus({
      id: "go-1",
      kind: "go",
      expectedResponse: true,
      presentedAtMs: 0
    });
    core.advance(1_100);
    core.presentStimulus({
      id: "no-go-1",
      kind: "no_go",
      expectedResponse: false,
      presentedAtMs: 1_200
    });
    core.recordClick({
      clickedAtMs: 1_450,
      stimulusId: "no-go-1"
    });

    const result = core.complete(3_000);

    expect(result.trainingType).toBe("go_no_go");
    expect(result.totalTrials).toBe(2);
    expect(result.correctTrials).toBe(0);
    expect(result.errorCount).toBe(2);
    expect(result.omissionCount).toBe(1);
    expect(result.omissionRate).toBe(1);
    expect(result.falsePressCount).toBe(1);
    expect(result.falsePressRate).toBe(1);
  });

  it("exposes difficulty parameters and exports a unified GameSessionResult shape", () => {
    const core = createGameSessionCore(baseConfig);
    core.start(1_000);
    core.pause(2_000);
    core.resume(3_000);
    core.presentStimulus({
      id: "target-1",
      kind: "target",
      expectedResponse: true,
      presentedAtMs: 3_200
    });

    const difficulty = core.getDifficultyConfig();
    const result = core.complete(4_500);

    expect(difficulty).toEqual(baseConfig.difficulty);
    expect(result.difficultyLevel).toBe(2);
    expect(result.difficulty.responseWindowMs).toBe(1000);
    expect(result.pauseCount).toBe(1);
    expect(result.completionRate).toBe(0.25);
    expect(result.startedAt).toBe("1970-01-01T00:00:01.000Z");
    expect(result.endedAt).toBe("1970-01-01T00:00:04.500Z");
  });

  it("rejects invalid lifecycle and timing operations", () => {
    const core = createGameSessionCore(baseConfig);

    expect(() =>
      core.presentStimulus({
        id: "target-1",
        kind: "target",
        expectedResponse: true,
        presentedAtMs: 0
      })
    ).toThrow(GameCoreError);

    core.start(1_000);
    expect(() => core.recordClick({ clickedAtMs: 900 })).toThrow(GameCoreError);
    expect(() => core.start(2_000)).toThrow(GameCoreError);
  });
});
