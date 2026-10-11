import { describe, expect, it } from "vitest";

import type { PrescriptionHomeBaseState } from "../src/prescription-home-config.js";
import {
  buildHomeConfigFromPrescription,
  mockActiveTrainingPrescriptionForHome,
  PrescriptionHomeConfigError
} from "../src/prescription-home-config.js";

const baseState: PrescriptionHomeBaseState = {
  completedTodayMinutes: 4,
  restAfterMinutes: 12,
  deviceStatus: {
    connectionStatus: "connected",
    signalQuality: "good",
    attentionScore: 68,
    relaxationScore: 54,
    fatigueTrendLabel: "平稳",
    latencyMs: 420
  },
  lastTrainingSummary: {
    moduleName: "Go/No-Go 点击反应练习",
    completedAtLabel: "昨天",
    summary: "上次练习完成度良好。",
    nextSuggestion: "今天先保持轻量任务。"
  }
};

describe("prescription-home-config", () => {
  it("builds user home tasks from an active prescription", () => {
    const config = buildHomeConfigFromPrescription({
      prescription: mockActiveTrainingPrescriptionForHome,
      baseState
    });

    expect(config.traineeDisplayName).toBe("小林");
    expect(config.dailyTrainingLimitMinutes).toBe(30);
    expect(config.todayTasks).toHaveLength(3);
    expect(config.todayTasks.some((task) => task.isPrimary)).toBe(true);
    expect(config.recommendedMusic.title).toBe("森林慢节奏");
  });

  it("uses the prescription difficulty and therapist note in user tasks", () => {
    const config = buildHomeConfigFromPrescription({
      prescription: {
        ...mockActiveTrainingPrescriptionForHome,
        initialDifficulty: "standard",
        therapistNote: "先看清提示，再慢慢点击。"
      },
      baseState
    });

    expect(config.todayTasks[1]?.difficultyLabel).toBe("标准");
    expect(config.todayTasks.find((task) => task.isPrimary)?.therapistNote).toBe(
      "先看清提示，再慢慢点击。"
    );
  });

  it("rejects prescriptions that cannot fit in the daily limit", () => {
    expect(() =>
      buildHomeConfigFromPrescription({
        prescription: {
          ...mockActiveTrainingPrescriptionForHome,
          sessionDurationMinutes: 20,
          dailyMaxTrainingMinutes: 10
        },
        baseState
      })
    ).toThrow(PrescriptionHomeConfigError);
  });

  it("keeps home prescription wording inside auxiliary training boundaries", () => {
    const config = buildHomeConfigFromPrescription({
      prescription: mockActiveTrainingPrescriptionForHome,
      baseState
    });
    const text = JSON.stringify(config);

    for (const bannedTerm of ["确诊", "治愈", "疗效保证", "治疗效果", "临床诊断", "诊断"]) {
      expect(text).not.toContain(bannedTerm);
    }
  });
});
