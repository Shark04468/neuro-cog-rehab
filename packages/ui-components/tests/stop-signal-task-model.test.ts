import { describe, expect, it } from "vitest";

import {
  buildStopSignalTrial,
  buildStopSignalTrialSequence,
  calculateStopSignalMetrics,
  completeStopSignalTrial,
  createSeededStopSignalRandom,
  createStopSignalResult,
  getStopSignalTaskConfig,
  STOP_SIGNAL_DIFFICULTIES
} from "../src/stop-signal-task-model.js";

describe("stop-signal task model", () => {
  it("provides the required difficulty parameters", () => {
    expect(STOP_SIGNAL_DIFFICULTIES.easy.stopSignalDelayMs).toBeGreaterThan(
      STOP_SIGNAL_DIFFICULTIES.hard.stopSignalDelayMs
    );
    expect(STOP_SIGNAL_DIFFICULTIES.medium).toMatchObject({
      stopSignalDelayMs: 280,
      targetDisplayTimeMs: 1300,
      trialCount: 24,
      stopTrialRatio: 0.3
    });
  });

  it("builds a bounded trial sequence with the configured stop ratio", () => {
    const config = getStopSignalTaskConfig("medium");
    const sequence = buildStopSignalTrialSequence(config, createSeededStopSignalRandom(23));
    const stopCount = sequence.filter((trialType) => trialType === "stop").length;
    const goCount = sequence.filter((trialType) => trialType === "go").length;

    expect(sequence).toHaveLength(config.trialCount);
    expect(stopCount).toBe(Math.round(config.trialCount * config.stopTrialRatio));
    expect(goCount + stopCount).toBe(config.trialCount);
  });

  it("records detailed outcomes for go and stop trials", () => {
    const config = getStopSignalTaskConfig("medium");
    const random = createSeededStopSignalRandom(7);
    const goTrial = buildStopSignalTrial({
      config,
      trialIndex: 0,
      trialType: "go",
      targetPresentedAtMs: 1000,
      width: 720,
      height: 420,
      random
    });
    const stopTrial = buildStopSignalTrial({
      config,
      trialIndex: 1,
      trialType: "stop",
      targetPresentedAtMs: 3000,
      width: 720,
      height: 420,
      random
    });

    const goSuccess = completeStopSignalTrial({
      trial: goTrial,
      config,
      completedAtMs: 1420,
      response: "click"
    });
    const stopSuccess = completeStopSignalTrial({
      trial: stopTrial,
      config,
      completedAtMs: 4301,
      response: "timeout"
    });
    const stopFailed = completeStopSignalTrial({
      trial: stopTrial,
      config,
      completedAtMs: 3400,
      response: "click"
    });
    const beforeStop = completeStopSignalTrial({
      trial: stopTrial,
      config,
      completedAtMs: 3200,
      response: "click"
    });

    expect(goTrial.stopSignalAtMs).toBeNull();
    expect(stopTrial.stopSignalAtMs).toBe(3280);
    expect(goSuccess).toMatchObject({
      outcome: "go_success",
      reactionTimeMs: 420,
      isCorrect: true
    });
    expect(stopSuccess).toMatchObject({
      outcome: "stop_success",
      isCorrect: true,
      stopSignalDelayMs: 280
    });
    expect(stopFailed.outcome).toBe("stop_failed");
    expect(beforeStop.outcome).toBe("responded_before_stop_signal");
  });

  it("calculates stop success and impulsive response metrics", () => {
    const config = getStopSignalTaskConfig("medium");
    const goTrial = buildStopSignalTrial({
      config,
      trialIndex: 0,
      trialType: "go",
      targetPresentedAtMs: 1000,
      width: 720,
      height: 420,
      random: createSeededStopSignalRandom(31)
    });
    const stopTrial = buildStopSignalTrial({
      config,
      trialIndex: 1,
      trialType: "stop",
      targetPresentedAtMs: 3000,
      width: 720,
      height: 420,
      random: createSeededStopSignalRandom(37)
    });
    const records = [
      completeStopSignalTrial({
        trial: goTrial,
        config,
        completedAtMs: 1400,
        response: "click"
      }),
      completeStopSignalTrial({
        trial: { ...goTrial, id: "go-missed", trialIndex: 2 },
        config,
        completedAtMs: 2501,
        response: "timeout"
      }),
      completeStopSignalTrial({
        trial: stopTrial,
        config,
        completedAtMs: 4301,
        response: "timeout"
      }),
      completeStopSignalTrial({
        trial: { ...stopTrial, id: "stop-failed", trialIndex: 3 },
        config,
        completedAtMs: 3400,
        response: "click"
      }),
      completeStopSignalTrial({
        trial: { ...stopTrial, id: "before-stop", trialIndex: 4 },
        config,
        completedAtMs: 3200,
        response: "click"
      })
    ];

    const metrics = calculateStopSignalMetrics({
      trialResults: records,
      plannedTrialCount: 10
    });

    expect(metrics.goTrialCount).toBe(2);
    expect(metrics.stopTrialCount).toBe(3);
    expect(metrics.goSuccessCount).toBe(1);
    expect(metrics.goMissedCount).toBe(1);
    expect(metrics.stopSuccessCount).toBe(1);
    expect(metrics.stopFailureCount).toBe(1);
    expect(metrics.respondedBeforeStopSignalCount).toBe(1);
    expect(metrics.impulsiveResponseCount).toBe(2);
    expect(metrics.averageGoReactionTimeMs).toBe(400);
    expect(metrics.stopSuccessRate).toBe(0.3333);
    expect(metrics.accuracyRate).toBe(0.4);
    expect(metrics.completionRate).toBe(0.5);
  });

  it("exports StopSignalResult with trial details and no clinical conclusion fields", () => {
    const config = getStopSignalTaskConfig("easy");
    const trial = buildStopSignalTrial({
      config,
      trialIndex: 0,
      trialType: "stop",
      targetPresentedAtMs: 1000,
      width: 720,
      height: 420,
      random: createSeededStopSignalRandom(41)
    });
    const trialResults = [
      completeStopSignalTrial({
        trial,
        config,
        completedAtMs: 2501,
        response: "timeout"
      })
    ];

    const result = createStopSignalResult({
      sessionId: "stop-signal-session-1",
      userId: "user-1",
      startedAtMs: 0,
      endedAtMs: 3000,
      activeDurationSeconds: 3,
      pauseCount: 0,
      config,
      trialResults
    });

    expect(result).toMatchObject({
      sessionId: "stop-signal-session-1",
      userId: "user-1",
      trainingType: "stop_signal",
      durationSeconds: 3,
      difficultyLevel: 1,
      totalTrials: 1,
      correctTrials: 1,
      stopSuccessRate: 1,
      impulsiveResponseCount: 0
    });
    expect(result.trialResults).toHaveLength(1);
    expect(result).not.toHaveProperty("diagnosis");
    expect(result).not.toHaveProperty("treatmentEffect");
  });
});
