import { describe, expect, it } from "vitest";

import { NEURO_DYNAMIC_EFFECTS_CSS } from "../src/dynamic-effects.css.js";
import {
  DynamicEffectError,
  RealtimeSignalRing,
  buildDynamicEffectDataAttributes,
  normalizeSignalProgress,
  resolveDynamicEffectIntensity
} from "../src/dynamic-effects.js";

describe("dynamic visual effect safety helpers", () => {
  it("keeps normal display intensity when no training task is active", () => {
    expect(resolveDynamicEffectIntensity("high", false)).toBe("high");
    expect(resolveDynamicEffectIntensity("medium", false)).toBe("medium");
  });

  it("reduces animation intensity while training is active", () => {
    expect(resolveDynamicEffectIntensity("high", true)).toBe("low");
    expect(resolveDynamicEffectIntensity("medium", true)).toBe("low");
    expect(resolveDynamicEffectIntensity("low", true)).toBe("minimal");
  });

  it("rejects unsupported intensity values", () => {
    expect(() => resolveDynamicEffectIntensity("flash" as never, false)).toThrow(
      DynamicEffectError
    );
  });

  it("normalizes signal progress into a stable 0 to 100 display range", () => {
    expect(normalizeSignalProgress(72.4)).toBe(72);
    expect(normalizeSignalProgress(-8)).toBe(0);
    expect(normalizeSignalProgress(140)).toBe(100);
  });

  it("rejects non-finite signal progress values", () => {
    expect(() => normalizeSignalProgress(Number.NaN)).toThrow(DynamicEffectError);
    expect(() => normalizeSignalProgress(Number.POSITIVE_INFINITY)).toThrow(DynamicEffectError);
  });
});

describe("dynamic visual effect attributes", () => {
  it("builds tone, intensity, and training data attributes for CSS-only components", () => {
    expect(
      buildDynamicEffectDataAttributes({
        intensity: "medium",
        tone: "monitoring",
        trainingMode: true
      })
    ).toEqual({
      "data-intensity": "low",
      "data-tone": "monitoring",
      "data-training-mode": "true"
    });
  });

  it("renders a signal ring with a bounded accessible label", () => {
    const ring = RealtimeSignalRing({
      label: "信号质量",
      value: 186,
      trainingMode: true
    });

    expect(ring.props["aria-label"]).toBe("信号质量 100%");
    expect(ring.props["data-intensity"]).toBe("low");
  });
});

describe("dynamic effects stylesheet", () => {
  it("includes all requested effect component classes", () => {
    expect(NEURO_DYNAMIC_EFFECTS_CSS).toContain(".ncr-animated-eeg-wave");
    expect(NEURO_DYNAMIC_EFFECTS_CSS).toContain(".ncr-neural-particles");
    expect(NEURO_DYNAMIC_EFFECTS_CSS).toContain(".ncr-data-flow-grid");
    expect(NEURO_DYNAMIC_EFFECTS_CSS).toContain(".ncr-glow-pulse-card");
    expect(NEURO_DYNAMIC_EFFECTS_CSS).toContain(".ncr-floating-metric");
    expect(NEURO_DYNAMIC_EFFECTS_CSS).toContain(".ncr-page-transition");
    expect(NEURO_DYNAMIC_EFFECTS_CSS).toContain(".ncr-loading-brain-scan");
    expect(NEURO_DYNAMIC_EFFECTS_CSS).toContain(".ncr-realtime-signal-ring");
    expect(NEURO_DYNAMIC_EFFECTS_CSS).toContain(".ncr-soft-gradient-orb");
    expect(NEURO_DYNAMIC_EFFECTS_CSS).toContain(".ncr-scan-line-highlight");
  });

  it("contains reduced-motion and training-mode safeguards", () => {
    expect(NEURO_DYNAMIC_EFFECTS_CSS).toContain("@media (prefers-reduced-motion: reduce)");
    expect(NEURO_DYNAMIC_EFFECTS_CSS).toContain('[data-training-mode="true"]');
    expect(NEURO_DYNAMIC_EFFECTS_CSS).not.toContain("flash");
  });
});
