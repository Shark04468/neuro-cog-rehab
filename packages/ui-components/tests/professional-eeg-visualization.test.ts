import { describe, expect, it } from "vitest";

import {
  buildCognitiveStateFromFrame,
  createMockEEGFeatureFrames,
  normalizeEEGFrame,
  ProfessionalEEGWavePanel,
  resolveSignalQualityViewModel
} from "../src/professional-eeg-visualization.js";

describe("professional EEG visualization helpers", () => {
  it("creates smooth bounded mock EEG frames for realtime panels", () => {
    const frames = createMockEEGFeatureFrames({
      count: 12,
      latest: {
        attentionScore: 70,
        relaxationScore: 54,
        fatigueScore: 28,
        qualityStatus: "good"
      }
    });

    expect(frames).toHaveLength(12);
    for (const frame of frames) {
      expect(frame.attentionScore).toBeGreaterThanOrEqual(0);
      expect(frame.attentionScore).toBeLessThanOrEqual(100);
      expect(frame.relaxationScore).toBeGreaterThanOrEqual(0);
      expect(frame.relaxationScore).toBeLessThanOrEqual(100);
      expect(frame.fatigueScore).toBeGreaterThanOrEqual(0);
      expect(frame.fatigueScore).toBeLessThanOrEqual(100);
    }
  });

  it("normalizes simulator and shared EEG frame fields into display metrics", () => {
    const normalized = normalizeEEGFrame({
      timestamp: "2026-06-17T01:00:00.000Z",
      attentionIndex: 105,
      relaxationIndex: -12,
      fatigueScore: 42,
      signalQuality: 61,
      artifactLevel: 0.2,
      thetaPower: 0.42,
      alphaPower: 0.48,
      betaPower: 0.55
    });

    expect(normalized.attention).toBe(100);
    expect(normalized.relaxation).toBe(0);
    expect(normalized.fatigue).toBe(42);
    expect(normalized.qualityStatus).toBe("unstable");
    expect(normalized.thetaPower).toBe(42);
  });

  it("resolves signal quality suggestions without diagnostic wording", () => {
    const noisy = resolveSignalQualityViewModel("noisy");
    const disconnected = resolveSignalQualityViewModel("disconnected");
    const combined = `${noisy.label}${noisy.suggestion}${disconnected.label}${disconnected.suggestion}`;

    expect(noisy.suggestion).toContain("减少大幅动作");
    expect(disconnected.suggestion).toContain("连接状态");
    expect(combined).not.toMatch(/诊断|确诊|治愈|疗效保证/);
  });

  it("builds cognitive state dimensions from normalized frames", () => {
    const state = buildCognitiveStateFromFrame({
      timestamp: "2026-06-17T01:00:00.000Z",
      attentionScore: 63,
      relaxationScore: 57,
      fatigueScore: 34,
      stabilityScore: 82,
      engagementScore: 68,
      signalQuality: 90,
      qualityStatus: "good"
    });

    expect(state).toEqual({
      attention: 63,
      relaxation: 57,
      fatigue: 34,
      stability: 82,
      engagement: 68
    });
  });

  it("renders the professional wave panel with safety mode attributes", () => {
    const panel = ProfessionalEEGWavePanel({
      frames: createMockEEGFeatureFrames({ count: 8 }),
      safetyMode: true,
      paused: false,
      compact: true
    });

    expect(panel.props["data-safety-mode"]).toBe(true);
    expect(panel.props["data-compact"]).toBe(true);
    expect(JSON.stringify(panel)).toContain("EEG");
  });
});
