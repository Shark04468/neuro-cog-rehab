import { describe, expect, it } from "vitest";

import {
  buildTrainingPauseRules,
  evaluateTrainingPause,
  TrainingPauseRuleError,
  type EEGFeatureFrame,
  type TrainingPauseEvaluationInput
} from "../src/index.js";

function frame(overrides: Partial<EEGFeatureFrame> = {}): EEGFeatureFrame {
  return {
    timestamp: "2026-06-15T08:00:00.000Z",
    attentionScore: 62,
    relaxationScore: 45,
    fatigueScore: 30,
    thetaPower: 0.28,
    alphaPower: 0.34,
    betaPower: 0.38,
    signalQuality: 92,
    artifactLevel: 6,
    ...overrides
  };
}

function baseInput(
  overrides: Partial<TrainingPauseEvaluationInput> = {}
): TrainingPauseEvaluationInput {
  return {
    now: "2026-06-15T08:00:10.000Z",
    eegFrames: [
      frame({ timestamp: "2026-06-15T08:00:08.000Z" }),
      frame({ timestamp: "2026-06-15T08:00:09.000Z" })
    ],
    connectionStatus: "connected",
    progress: {
      sessionId: "session-1",
      userId: "user-1",
      trainingType: "rhythm_navigation",
      elapsedSeconds: 120,
      completedStepCount: 3,
      totalStepCount: 8,
      currentDifficultyLevel: 2
    },
    ...overrides
  };
}

describe("evaluateTrainingPause", () => {
  it("does not pause when training state is within configured range", () => {
    const result = evaluateTrainingPause(baseInput());

    expect(result.shouldPause).toBe(false);
    expect(result.prompt).toBeNull();
    expect(result.progressSnapshot).toBeNull();
  });

  it("pauses when EEG connection is continuously disconnected", () => {
    const result = evaluateTrainingPause(
      baseInput({
        eegFrames: [],
        connectionStatus: "disconnected",
        connectionStatusSince: "2026-06-15T08:00:00.000Z"
      }),
      { eegDisconnectedAfterMs: 5000 }
    );

    expect(result.shouldPause).toBe(true);
    expect(result.primaryReason?.code).toBe("eeg_disconnected");
    expect(result.prompt?.primaryActionLabel).toBe("检查连接");
    expect(result.abnormalEvent?.eventType).toBe("device_disconnect");
    expect(result.progressSnapshot?.dataSensitivity).toBe("sensitive");
  });

  it("does not pause just before EEG disconnect threshold but pauses at the threshold", () => {
    const beforeBoundary = evaluateTrainingPause(
      baseInput({
        now: "2026-06-15T08:00:04.999Z",
        eegFrames: [],
        connectionStatus: "disconnected",
        connectionStatusSince: "2026-06-15T08:00:00.000Z"
      }),
      { eegDisconnectedAfterMs: 5000 }
    );
    const atBoundary = evaluateTrainingPause(
      baseInput({
        now: "2026-06-15T08:00:05.000Z",
        eegFrames: [],
        connectionStatus: "disconnected",
        connectionStatusSince: "2026-06-15T08:00:00.000Z"
      }),
      { eegDisconnectedAfterMs: 5000 }
    );

    expect(beforeBoundary.shouldPause).toBe(false);
    expect(atBoundary.shouldPause).toBe(true);
    expect(atBoundary.primaryReason?.code).toBe("eeg_disconnected");
  });

  it("pauses when artifactLevel remains high across recent frames", () => {
    const result = evaluateTrainingPause(
      baseInput({
        eegFrames: [
          frame({ timestamp: "2026-06-15T08:00:07.000Z", artifactLevel: 74 }),
          frame({ timestamp: "2026-06-15T08:00:08.000Z", artifactLevel: 81 }),
          frame({ timestamp: "2026-06-15T08:00:09.000Z", artifactLevel: 76 })
        ]
      })
    );

    expect(result.shouldPause).toBe(true);
    expect(result.primaryReason?.code).toBe("artifact_level_high");
    expect(result.prompt?.message).toContain("动作干扰");
    expect(result.abnormalEvent?.eventType).toBe("low_signal_quality");
  });

  it("pauses when fatigueScore keeps rising and crosses the configured level", () => {
    const result = evaluateTrainingPause(
      baseInput({
        eegFrames: [
          frame({ timestamp: "2026-06-15T08:00:06.000Z", fatigueScore: 52 }),
          frame({ timestamp: "2026-06-15T08:00:07.000Z", fatigueScore: 59 }),
          frame({ timestamp: "2026-06-15T08:00:08.000Z", fatigueScore: 67 }),
          frame({ timestamp: "2026-06-15T08:00:09.000Z", fatigueScore: 73 })
        ]
      })
    );

    expect(result.shouldPause).toBe(true);
    expect(result.primaryReason?.code).toBe("fatigue_rising");
    expect(result.prompt?.suggestedAction).toBe("switch_to_relax_music");
    expect(result.prompt?.musicSuggestion).toContain("放松恢复");
  });

  it("pauses when consecutive false presses reach threshold", () => {
    const result = evaluateTrainingPause(
      baseInput({
        behavior: {
          consecutiveFalsePressCount: 4
        }
      })
    );

    expect(result.shouldPause).toBe(true);
    expect(result.primaryReason?.code).toBe("consecutive_false_presses");
    expect(result.prompt?.secondaryActionLabel).toBe("降低难度");
  });

  it("pauses immediately when user reports discomfort", () => {
    const result = evaluateTrainingPause(
      baseInput({
        userFeedback: {
          discomfort: true,
          discomfortNote: "头有点不舒服"
        }
      })
    );

    expect(result.shouldPause).toBe(true);
    expect(result.primaryReason?.code).toBe("user_discomfort");
    expect(result.prompt?.message).toContain("你反馈了不舒服");
    expect(result.therapistNotification?.shouldNotify).toBe(true);
  });

  it("pauses when the daily active training limit is reached", () => {
    const result = evaluateTrainingPause(
      baseInput({
        dailyUsage: {
          completedTodaySeconds: 1500,
          currentSessionElapsedSeconds: 300,
          dailyLimitSeconds: 1800
        }
      })
    );

    expect(result.shouldPause).toBe(true);
    expect(result.primaryReason?.code).toBe("daily_limit_exceeded");
    expect(result.prompt?.primaryActionLabel).toBe("结束今日训练");
  });

  it("returns all triggered reasons while selecting the first priority reason", () => {
    const result = evaluateTrainingPause(
      baseInput({
        userFeedback: {
          discomfort: true
        },
        behavior: {
          consecutiveFalsePressCount: 5
        },
        dailyUsage: {
          completedTodaySeconds: 1800,
          currentSessionElapsedSeconds: 100,
          dailyLimitSeconds: 1800
        }
      })
    );

    expect(result.primaryReason?.code).toBe("user_discomfort");
    expect(result.triggeredReasons.map((reason) => reason.code)).toEqual([
      "user_discomfort",
      "consecutive_false_presses",
      "daily_limit_exceeded"
    ]);
  });

  it("keeps pause prompts calm and avoids medicalized claims", () => {
    const result = evaluateTrainingPause(
      baseInput({
        behavior: {
          consecutiveFalsePressCount: 4
        }
      })
    );
    const text = JSON.stringify(result).toLowerCase();

    expect(text).not.toContain("确诊");
    expect(text).not.toContain("治愈");
    expect(text).not.toContain("疗效");
    expect(text).not.toContain("guarantee");
    expect(text).not.toContain("danger");
    expect(text).not.toContain("恐吓");
  });

  it("validates rule configuration", () => {
    expect(() => buildTrainingPauseRules({ fatigueRiseFrameCount: 1 })).toThrow(
      TrainingPauseRuleError
    );
    expect(() => buildTrainingPauseRules({ artifactLevelPauseThreshold: 120 })).toThrow(
      TrainingPauseRuleError
    );
    expect(() => evaluateTrainingPause(baseInput({ now: "not-a-valid-time" }))).toThrow(
      TrainingPauseRuleError
    );
    expect(() => buildTrainingPauseRules({ consecutiveFalsePressThreshold: -1 })).toThrow(
      TrainingPauseRuleError
    );
  });
});
