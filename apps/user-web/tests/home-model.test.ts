import { describe, expect, it } from "vitest";

import {
  buildUserHomeViewModel,
  UserHomeModelError,
  type TherapistHomeConfig
} from "../src/home-model.js";

function config(overrides: Partial<TherapistHomeConfig> = {}): TherapistHomeConfig {
  return {
    traineeDisplayName: "小林",
    completedTodayMinutes: 6,
    dailyTrainingLimitMinutes: 30,
    restAfterMinutes: 12,
    deviceStatus: {
      connectionStatus: "connected",
      signalQuality: "good",
      attentionScore: 66,
      relaxationScore: 50,
      fatigueTrendLabel: "平稳",
      latencyMs: 360
    },
    recommendedMusic: {
      title: "森林慢节奏",
      scene: "训练前准备",
      durationMinutes: 6,
      intensityLabel: "低强度"
    },
    lastTrainingSummary: {
      moduleName: "节律导航",
      completedAtLabel: "昨天",
      summary: "路线记忆更稳定。",
      nextSuggestion: "今天从标准难度开始。"
    },
    todayTasks: [
      {
        id: "task-1",
        taskType: "rhythm_navigation",
        title: "节律导航基础路线",
        durationMinutes: 10,
        difficultyLabel: "标准",
        focusArea: "记住路线",
        therapistNote: "先看清路线颜色。",
        isPrimary: true
      },
      {
        id: "task-2",
        taskType: "music_therapy",
        title: "低强度音乐放松",
        durationMinutes: 6,
        difficultyLabel: "轻量",
        focusArea: "放松与状态观察",
        therapistNote: "保持舒适音量。"
      }
    ],
    ...overrides
  };
}

describe("buildUserHomeViewModel", () => {
  it("builds clear home sections from therapist configured tasks", () => {
    const viewModel = buildUserHomeViewModel(config());

    expect(viewModel.greeting).toContain("小林");
    expect(viewModel.primaryTask?.title).toBe("节律导航基础路线");
    expect(viewModel.todayTasks[0]?.badgeLabel).toBe("节律导航");
    expect(viewModel.totalPlannedMinutes).toBe(16);
    expect(viewModel.canStartTraining).toBe(true);
  });

  it("shows friendly device and latency labels without complex wording", () => {
    const viewModel = buildUserHomeViewModel(config());

    expect(viewModel.deviceLabel).toBe("头戴设备已连接");
    expect(viewModel.signalLabel).toBe("信号稳定");
    expect(viewModel.latencyLabel).toContain("0.4 秒");
  });

  it("disables start when the device is disconnected", () => {
    const viewModel = buildUserHomeViewModel(
      config({
        deviceStatus: {
          connectionStatus: "disconnected",
          signalQuality: "offline",
          attentionScore: null,
          relaxationScore: null,
          fatigueTrendLabel: "平稳",
          latencyMs: null
        }
      })
    );

    expect(viewModel.canStartTraining).toBe(false);
    expect(viewModel.deviceLabel).toBe("头戴设备未连接");
    expect(viewModel.latencyLabel).toBe("等待实时数据");
  });

  it("keeps reminders bounded by the daily training limit", () => {
    const viewModel = buildUserHomeViewModel(
      config({
        completedTodayMinutes: 30
      })
    );

    expect(viewModel.remainingTodayMinutes).toBe(0);
    expect(viewModel.trainingTimeReminder).toContain("建议训练时长已经用完");
  });

  it("avoids medicalized claims in user-facing copy", () => {
    const viewModel = buildUserHomeViewModel(config());
    const text = JSON.stringify(viewModel);

    expect(text).not.toContain("确诊");
    expect(text).not.toContain("治愈");
    expect(text).not.toContain("疗效");
    expect(text.toLowerCase()).not.toContain("diagnosis");
    expect(text.toLowerCase()).not.toContain("treatment");
  });

  it("validates therapist home configuration", () => {
    expect(() =>
      buildUserHomeViewModel(
        config({
          dailyTrainingLimitMinutes: 0
        })
      )
    ).toThrow(UserHomeModelError);
  });
});
