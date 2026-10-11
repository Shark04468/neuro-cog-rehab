import { describe, expect, it } from "vitest";

import { NEURO_DESIGN_SYSTEM_CSS } from "../src/design-system.css.js";
import { buildMedicalMonitoringLineChartOption } from "../src/medical-monitoring-chart-theme.js";
import {
  NEURO_MOTION_TOKENS,
  NEURO_RADIUS_TOKENS,
  NEURO_SHADOW_TOKENS,
  NEURO_THEME_TOKENS,
  NEURO_TYPOGRAPHY_TOKENS,
  NeuroDesignSystemError,
  normalizeMetricProgress,
  resolveNeuroThemeMode,
  resolveNeuroTone
} from "../src/design-system-tokens.js";

describe("design system tokens", () => {
  it("resolves supported theme modes and exposes both visual themes", () => {
    expect(resolveNeuroThemeMode("hospital-light")).toBe("hospital-light");
    expect(resolveNeuroThemeMode("neuro-dark")).toBe("neuro-dark");
    expect(NEURO_THEME_TOKENS["hospital-light"].colors.background).toBe("#f8fcff");
    expect(NEURO_THEME_TOKENS["hospital-light"].colors.medicalBlue).toBe("#145f85");
    expect(NEURO_THEME_TOKENS["hospital-light"].colors.mutedOrange).toBe("#c17a35");
    expect(NEURO_THEME_TOKENS["neuro-dark"].colors.background).toBe("#06121f");
  });

  it("rejects unsupported theme modes", () => {
    expect(() => resolveNeuroThemeMode("unknown" as never)).toThrow(NeuroDesignSystemError);
  });

  it("resolves supported tone names and rejects unsupported tones", () => {
    expect(resolveNeuroTone("monitoring")).toBe("monitoring");
    expect(resolveNeuroTone()).toBe("neutral");
    expect(() => resolveNeuroTone("green-alert" as never)).toThrow(NeuroDesignSystemError);
  });

  it("exposes shared typography, radius, shadow, and motion tokens", () => {
    expect(NEURO_TYPOGRAPHY_TOKENS.scale.pageTitle).toContain("clamp");
    expect(NEURO_RADIUS_TOKENS.lg).toBe("16px");
    expect(NEURO_SHADOW_TOKENS.primaryGlow).toContain("rgba");
    expect(NEURO_MOTION_TOKENS.easingEmphasis).toContain("cubic-bezier");
  });
});

describe("metric progress normalization", () => {
  it("keeps normal progress values rounded for stable rendering", () => {
    expect(normalizeMetricProgress(66.6)).toBe(67);
  });

  it("clamps boundary values into the 0 to 100 display range", () => {
    expect(normalizeMetricProgress(-12)).toBe(0);
    expect(normalizeMetricProgress(140)).toBe(100);
    expect(normalizeMetricProgress(null)).toBeNull();
    expect(normalizeMetricProgress(undefined)).toBeNull();
  });

  it("rejects non-finite progress values", () => {
    expect(() => normalizeMetricProgress(Number.NaN)).toThrow(NeuroDesignSystemError);
    expect(() => normalizeMetricProgress(Number.POSITIVE_INFINITY)).toThrow(NeuroDesignSystemError);
  });
});

describe("design system stylesheet", () => {
  it("contains reusable component classes and both theme scopes", () => {
    expect(NEURO_DESIGN_SYSTEM_CSS).toContain('[data-ncr-theme="hospital-light"]');
    expect(NEURO_DESIGN_SYSTEM_CSS).toContain('[data-ncr-theme="neuro-dark"]');
    expect(NEURO_DESIGN_SYSTEM_CSS).toContain(".ncr-glass-card");
    expect(NEURO_DESIGN_SYSTEM_CSS).toContain(".ncr-data-panel");
    expect(NEURO_DESIGN_SYSTEM_CSS).toContain(".ncr-medical-grade-bg__eeg");
    expect(NEURO_DESIGN_SYSTEM_CSS).toContain(".ncr-medical-metric-card");
    expect(NEURO_DESIGN_SYSTEM_CSS).toContain(".ncr-eeg-shell");
  });

  it("includes reduced motion safeguards for all built-in animations", () => {
    expect(NEURO_DESIGN_SYSTEM_CSS).toContain("@media (prefers-reduced-motion: reduce)");
    expect(NEURO_DESIGN_SYSTEM_CSS).toContain("animation-duration: 1ms");
    expect(NEURO_DESIGN_SYSTEM_CSS).toContain("transition-duration: 1ms");
  });
});

describe("medical monitoring chart theme", () => {
  it("builds chart options using medical monitoring colors and dashed grid lines", () => {
    const option = buildMedicalMonitoringLineChartOption({
      title: "注意趋势",
      categories: ["一", "二"],
      yAxisName: "分",
      series: [{ name: "注意", data: [60, 68] }]
    });

    expect(option.backgroundColor).toBe("transparent");
    expect(JSON.stringify(option)).toContain("#145f85");
    expect(JSON.stringify(option)).toContain("dashed");
  });
});
