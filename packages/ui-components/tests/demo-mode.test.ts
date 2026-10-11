import { describe, expect, it, vi } from "vitest";

import {
  buildDemoLoginInput,
  buildDemoSystemStatus,
  createDemoAuthResult,
  createDemoHandoffPath,
  createMockEEGFeatureFrame,
  createMockEEGFrameSeries,
  createMockEEGStream,
  DEMO_ACCOUNTS,
  DEMO_MODE_CONFIG,
  isDemoAuthResult,
  loadDemoAuthFromLocation,
  mockAuth,
  mockEEGStream,
  mockTrainingData
} from "../src/demo-mode.js";

describe("demo mode account and auth helpers", () => {
  it("provides one explicitly labeled demo account for each portal role", () => {
    expect(DEMO_ACCOUNTS.map((account) => account.role)).toEqual([
      "trainee",
      "parent",
      "therapist",
      "org_admin"
    ]);
    expect(DEMO_ACCOUNTS.every((account) => account.identifier.startsWith("demo-"))).toBe(true);
    expect(DEMO_MODE_CONFIG.dataLabel).toContain("演示数据");
  });

  it("returns demo auth results without changing regular mock auth contracts", async () => {
    const input = buildDemoLoginInput("therapist");
    const result = await mockAuth(input);

    expect(result.authProvider).toBe("demo");
    expect(result.demoMode?.enabled).toBe(true);
    expect(result.principal.dataScope).toBe("therapist_linked");
    expect(isDemoAuthResult(result)).toBe(true);
    expect(buildDemoSystemStatus(result)).toMatchObject({
      demoMode: true,
      permissionStatus: "demo",
      permissionLabel: "演示模式"
    });
  });

  it("supports demo handoff between local role workspaces", () => {
    const result = createDemoAuthResult("trainee");
    const handoffPath = createDemoHandoffPath("/trainee/dashboard", result);
    const restored = loadDemoAuthFromLocation(
      "/trainee/dashboard",
      handoffPath.split("?")[1] ?? ""
    );

    expect(handoffPath).toContain("ncrDemo=1");
    expect(handoffPath).toContain("ncrDemoRole=trainee");
    expect(restored?.authProvider).toBe("demo");
    expect(restored?.role).toBe("trainee");
  });
});

describe("demo EEG and training data", () => {
  it("generates bounded EEG feature frames marked as demo data", () => {
    const frames = createMockEEGFrameSeries({ count: 5, state: "focused", sessionId: "demo-test" });

    expect(frames).toHaveLength(5);
    expect(frames.every((frame) => frame.demoData)).toBe(true);
    expect(frames.every((frame) => frame.demoDataLabel.includes("演示数据"))).toBe(true);
    expect(frames.every((frame) => frame.attentionScore >= 0 && frame.attentionScore <= 100)).toBe(
      true
    );
  });

  it("exposes a controllable mock EEG stream for realtime demos", () => {
    vi.useFakeTimers();
    const onFrame = vi.fn();
    const stream = createMockEEGStream({ intervalMs: 1000, onFrame });

    stream.start();
    expect(stream.isRunning()).toBe(true);
    vi.advanceTimersByTime(2200);
    stream.stop();

    expect(onFrame).toHaveBeenCalledTimes(3);
    expect(mockEEGStream).toBe(createMockEEGStream);
    expect(
      createMockEEGFeatureFrame({ state: "fatigued", sequence: 8 }).fatigueScore
    ).toBeGreaterThan(44);
    vi.useRealTimers();
  });

  it("marks all demo training records and reports as non-real demo data", () => {
    const allMarked = [
      ...mockTrainingData.trainingRecords,
      ...mockTrainingData.weeklyReports,
      ...mockTrainingData.riskAlerts,
      ...mockTrainingData.musicRecommendations,
      ...mockTrainingData.prescriptions
    ].every((item) => item.demoData === true && item.demoDataLabel.includes("演示数据"));

    expect(mockTrainingData.demoData).toBe(true);
    expect(allMarked).toBe(true);
    expect(JSON.stringify(mockTrainingData)).not.toMatch(/治愈|确诊|疗效保证/);
  });
});
