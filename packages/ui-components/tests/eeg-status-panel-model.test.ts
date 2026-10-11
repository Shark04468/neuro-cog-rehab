import { describe, expect, it } from "vitest";

import { buildEEGStatusPanelViewModel } from "../src/index.js";

describe("buildEEGStatusPanelViewModel", () => {
  it("shows normal training state when connected and signal is good", () => {
    const result = buildEEGStatusPanelViewModel({
      connectionStatus: "connected",
      qualityStatus: "good",
      attentionScore: 72,
      relaxationScore: 48,
      fatigueScore: 24,
      latencyMs: 300
    });

    expect(result.tone).toBe("ready");
    expect(result.headline).toBe("可以正常训练");
    expect(result.shouldPauseTraining).toBe(false);
    expect(result.wearingPrompt).toBeNull();
  });

  it("prompts wearing adjustment when signal is unstable", () => {
    const result = buildEEGStatusPanelViewModel({
      connectionStatus: "connected",
      qualityStatus: "unstable",
      attentionScore: 50,
      relaxationScore: 52,
      fatigueScore: 40,
      latencyMs: 400
    });

    expect(result.tone).toBe("watch");
    expect(result.headline).toBe("请调整佩戴");
    expect(result.wearingPrompt).toContain("头戴设备");
  });

  it("pauses training when disconnected", () => {
    const result = buildEEGStatusPanelViewModel({
      connectionStatus: "disconnected",
      qualityStatus: "disconnected",
      attentionScore: null,
      relaxationScore: null,
      fatigueScore: null
    });

    expect(result.tone).toBe("pause");
    expect(result.shouldPauseTraining).toBe(true);
    expect(result.connectionLabel).toBe("设备已断开");
  });

  it("warns about stale data without clinical wording", () => {
    const result = buildEEGStatusPanelViewModel(
      {
        connectionStatus: "connected",
        qualityStatus: "good",
        attentionScore: 60,
        relaxationScore: 58,
        fatigueScore: 35,
        lastFrameAt: "2026-06-15T08:00:00.000Z"
      },
      new Date("2026-06-15T08:00:03.500Z")
    );

    expect(result.tone).toBe("watch");
    expect(result.latencyPrompt).toContain("数据延迟");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("diagnosis");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("treatment");
  });
});
