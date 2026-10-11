import { describe, expect, it } from "vitest";

import { UNIFIED_AUTH_CSS } from "../src/unified-auth.css.js";

describe("unified auth portal visual system", () => {
  it("contains the advanced hospital-grade entrance layout classes", () => {
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-auth-background");
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-neuro-auth-background");
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-auth-entry-card");
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-login-glass-panel");
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-auth-capability-tags");
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-auth-brand-subtitle");
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-auth-eeg-preview-card");
  });

  it("contains slow dynamic background layers without high-frequency flash wording", () => {
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-auth-wave");
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-auth-network");
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-auth-layer--data-flow");
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-auth-layer--data-grid");
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-auth-orb--cursor");
    expect(UNIFIED_AUTH_CSS).toContain("--ncr-auth-pointer-x");
    expect(UNIFIED_AUTH_CSS).not.toContain("flash");
  });

  it("contains role entrance and verified login transition styles", () => {
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-role-entrance-card");
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-role-card__status");
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-auth-mode-stage");
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-auth-verification-state");
    expect(UNIFIED_AUTH_CSS).toContain("ncr-auth-submit-sheen");
  });

  it("contains a dedicated demo mode launcher with explicit demo data styling", () => {
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-demo-mode-panel");
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-demo-account-grid");
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-demo-account-button");
  });

  it("keeps reduced-motion safeguards for entrance and background effects", () => {
    expect(UNIFIED_AUTH_CSS).toContain("@media (prefers-reduced-motion: reduce)");
    expect(UNIFIED_AUTH_CSS).toContain("animation: none !important");
    expect(UNIFIED_AUTH_CSS).toContain(".ncr-auth-orb--cursor");
  });
});
