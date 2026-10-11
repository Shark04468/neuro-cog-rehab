import { describe, expect, it } from "vitest";

import {
  buildDemoEegPauseFrames,
  completeCurrentStage,
  createSessionTrainingFlowState,
  generateSessionSummary,
  getCurrentFlowStage,
  pauseSessionForEeg,
  resumeSessionFlow,
  SessionFlowModelError,
  type TherapistSessionFlowConfig
} from "../src/session-flow-model.js";

function config(overrides: Partial<TherapistSessionFlowConfig> = {}): TherapistSessionFlowConfig {
  return {
    sessionId: "session-demo-001",
    userId: "user-demo-001",
    traineeDisplayName: "小林",
    therapistName: "陈老师",
    skippedStageIds: [],
    dailyTrainingLimitMinutes: 35,
    recommendedMusicTitle: "森林慢节奏",
    ...overrides
  };
}

describe("session-flow-model", () => {
  it("creates the full single-session flow in the requested order", () => {
    const state = createSessionTrainingFlowState(config(), new Date("2026-06-16T01:00:00.000Z"));

    expect(state.stages.map((stage) => stage.id)).toEqual([
      "identity_confirmation",
      "eeg_device_check",
      "resting_baseline",
      "music_therapy",
      "attention_training",
      "go_nogo_training",
      "rhythm_navigation",
      "training_summary",
      "save_training_record"
    ]);
    expect(getCurrentFlowStage(state)?.id).toBe("identity_confirmation");
  });

  it("respects therapist skip configuration for optional modules", () => {
    const state = createSessionTrainingFlowState(
      config({
        skippedStageIds: ["music_therapy", "attention_training"]
      })
    );
    const summary = generateSessionSummary(state);

    expect(state.stages.find((stage) => stage.id === "music_therapy")?.status).toBe("skipped");
    expect(state.stages.find((stage) => stage.id === "attention_training")?.status).toBe("skipped");
    expect(summary.skippedStageCount).toBe(2);
    expect(summary.savedStageResultCount).toBe(2);
  });

  it("saves each completed stage result and advances to the next stage", () => {
    const initial = createSessionTrainingFlowState(config());
    const next = completeCurrentStage(initial, new Date("2026-06-16T01:01:00.000Z"));

    expect(next.savedStageResults).toHaveLength(1);
    expect(next.savedStageResults[0]?.stageId).toBe("identity_confirmation");
    expect(next.savedStageResults[0]?.dataSensitivity).toBe("sensitive");
    expect(getCurrentFlowStage(next)?.id).toBe("eeg_device_check");
  });

  it("pauses the active stage when EEG artifact level remains high", () => {
    const state = completeCurrentStage(createSessionTrainingFlowState(config()));
    const paused = pauseSessionForEeg(state, {
      now: new Date("2026-06-16T01:02:00.000Z"),
      eegFrames: buildDemoEegPauseFrames(new Date("2026-06-16T01:02:00.000Z")),
      elapsedSeconds: 60
    });

    expect(paused.status).toBe("paused");
    expect(getCurrentFlowStage(paused)?.status).toBe("paused");
    expect(paused.pauseDecision?.primaryReason?.code).toBe("artifact_level_high");

    const resumed = resumeSessionFlow(paused);
    expect(resumed.status).toBe("in_progress");
    expect(getCurrentFlowStage(resumed)?.status).toBe("active");
  });

  it("generates a SessionSummary after saving the full flow", () => {
    let state = createSessionTrainingFlowState(
      config({
        skippedStageIds: ["music_therapy"]
      })
    );

    while (getCurrentFlowStage(state)) {
      state = completeCurrentStage(state, new Date("2026-06-16T01:10:00.000Z"));
    }

    const summary = generateSessionSummary(state);
    expect(summary.status).toBe("saved");
    expect(summary.completedStageCount).toBe(8);
    expect(summary.skippedStageCount).toBe(1);
    expect(summary.savedStageResultCount).toBe(9);
    expect(summary.recommendedNextStep).toContain("记录已保存");
  });

  it("rejects skipping required safety stages", () => {
    expect(() =>
      createSessionTrainingFlowState(
        config({
          skippedStageIds: ["eeg_device_check"]
        })
      )
    ).toThrow(SessionFlowModelError);
  });

  it("keeps summary wording within auxiliary training boundaries", () => {
    const state = createSessionTrainingFlowState(config());
    const summary = generateSessionSummary(state);
    const text = JSON.stringify(summary);

    expect(text).not.toContain("确诊");
    expect(text).not.toContain("治愈");
    expect(text).not.toContain("疗效保证");
    expect(text.toLowerCase()).not.toContain("diagnosis");
    expect(text.toLowerCase()).not.toContain("cure");
  });
});
