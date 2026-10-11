import { describe, expect, it } from "vitest";

import type { SessionStageResult, SessionSummary } from "../src/session-flow-model.js";
import {
  buildTrainingEndFeedback,
  TrainingFeedbackModelError
} from "../src/training-feedback-model.js";

function stageResult(
  stageId: SessionStageResult["stageId"],
  payload: SessionStageResult["payload"] = {}
): SessionStageResult {
  return {
    sessionId: "session-feedback-001",
    userId: "trainee-feedback-001",
    stageId,
    savedAt: "2026-06-16T02:15:00.000Z",
    durationSeconds: 180,
    status: "completed",
    summary: `${stageId} result saved for training review.`,
    dataSensitivity: "sensitive",
    payload
  };
}

function savedSummary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    sessionId: "session-feedback-001",
    userId: "trainee-feedback-001",
    traineeDisplayName: "小林",
    startedAt: "2026-06-16T02:00:00.000Z",
    endedAt: "2026-06-16T02:29:00.000Z",
    status: "saved",
    totalStageCount: 9,
    completedStageCount: 9,
    skippedStageCount: 0,
    savedStageResultCount: 9,
    totalDurationSeconds: 1740,
    recommendedNextStep: "记录已保存，下次训练前查看趋势变化和治疗师建议。",
    stageResults: [
      stageResult("identity_confirmation"),
      stageResult("eeg_device_check"),
      stageResult("resting_baseline"),
      stageResult("music_therapy", { suitabilityScore: 78 }),
      stageResult("attention_training", {
        attentionStabilityScore: 82,
        averageReactionTimeMs: 720
      }),
      stageResult("go_nogo_training", { noGoInhibitionRate: 0.86 }),
      stageResult("rhythm_navigation", { routeAccuracy: 0.81 }),
      stageResult("training_summary"),
      stageResult("save_training_record")
    ],
    ...overrides
  };
}

describe("training-feedback-model", () => {
  it("builds all user-facing sections required by the training end page", () => {
    const feedback = buildTrainingEndFeedback(savedSummary(), new Date("2026-06-16T02:30:00.000Z"));

    expect(feedback.sections.map((section) => section.id)).toEqual([
      "completion",
      "attention_stability",
      "click_reaction",
      "impulse_control",
      "rhythm_navigation",
      "music_adaptation",
      "next_suggestion",
      "encouragement"
    ]);
    expect(feedback.title).toContain("小林");
    expect(feedback.sections.find((section) => section.id === "completion")?.headline).toContain(
      "9 个阶段"
    );
  });

  it("keeps a therapist detail entry separate from simple user feedback", () => {
    const feedback = buildTrainingEndFeedback(savedSummary());

    expect(feedback.therapistDetails).toHaveLength(2);
    expect(
      feedback.therapistDetails[0]?.entries.some((entry) => entry.label === "Session ID")
    ).toBe(true);
    expect(JSON.stringify(feedback.sections)).not.toContain("Session ID");
  });

  it("creates a sensitive mixed-session training record draft", () => {
    const feedback = buildTrainingEndFeedback(savedSummary(), new Date("2026-06-16T02:30:00.000Z"));

    expect(feedback.trainingRecordDraft.trainingType).toBe("mixed_session");
    expect(feedback.trainingRecordDraft.completionStatus).toBe("completed");
    expect(feedback.trainingRecordDraft.dataSensitivity).toBe("sensitive");
    expect(feedback.trainingRecordDraft.behaviorMetrics.rhythmRouteAccuracy).toBe(0.81);
    expect(feedback.trainingRecordDraft.stageResults).toHaveLength(9);
  });

  it("uses supportive wording without diagnosis or guaranteed outcome language", () => {
    const feedback = buildTrainingEndFeedback(savedSummary());
    const text = JSON.stringify(feedback);

    for (const bannedTerm of [
      "确诊",
      "治愈",
      "疗效保证",
      "治疗效果",
      "临床诊断",
      "diagnosis",
      "cure"
    ]) {
      expect(text.toLowerCase()).not.toContain(bannedTerm.toLowerCase());
    }
  });

  it("rejects summaries without a valid sensitive data scope key", () => {
    expect(() => buildTrainingEndFeedback(savedSummary({ userId: "" }))).toThrow(
      TrainingFeedbackModelError
    );
  });
});
