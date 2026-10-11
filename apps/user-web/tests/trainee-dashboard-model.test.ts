import { describe, expect, it } from "vitest";

import { mockTraineeDashboardData } from "../src/trainee-dashboard-mock.js";
import {
  buildTraineeDashboardViewModel,
  calculateRate,
  resolveTraineeDashboardStartState,
  TraineeDashboardModelError
} from "../src/trainee-dashboard-model.js";

describe("trainee dashboard model", () => {
  it("builds a startable dashboard view model for connected device and ready tasks", () => {
    const viewModel = buildTraineeDashboardViewModel(mockTraineeDashboardData);

    expect(viewModel.startState).toEqual({ canStart: true, reason: null });
    expect(viewModel.totalPlannedMinutes).toBe(28);
    expect(viewModel.completedTaskCount).toBe(0);
    expect(viewModel.weeklyCompletionRate).toBe(80);
    expect(viewModel.minuteCompletionRate).toBe(72);
    expect(viewModel.primaryTask?.id).toBe("task-music");
  });

  it("blocks start when therapist has not configured today's tasks", () => {
    const state = resolveTraineeDashboardStartState({
      todayTasks: [],
      deviceStatus: mockTraineeDashboardData.deviceStatus
    });

    expect(state.canStart).toBe(false);
    expect(state.reason).toContain("尚未配置");
  });

  it("blocks start when EEG device is disconnected", () => {
    const state = resolveTraineeDashboardStartState({
      todayTasks: mockTraineeDashboardData.todayTasks,
      deviceStatus: {
        ...mockTraineeDashboardData.deviceStatus,
        connectionStatus: "disconnected"
      }
    });

    expect(state.canStart).toBe(false);
    expect(state.reason).toContain("连接 EEG 设备");
  });

  it("handles zero progress denominator without throwing", () => {
    expect(calculateRate(0, 0)).toBe(0);
  });

  it("rejects invalid progress values", () => {
    expect(() => calculateRate(-1, 10)).toThrow(TraineeDashboardModelError);
    expect(() => calculateRate(Number.NaN, 10)).toThrow(TraineeDashboardModelError);
  });
});
