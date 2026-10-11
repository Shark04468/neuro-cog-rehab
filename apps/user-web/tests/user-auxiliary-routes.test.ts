import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const APP_SOURCE = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const AUXILIARY_SOURCE = readFileSync(
  new URL("../src/UserAuxiliaryPages.tsx", import.meta.url),
  "utf8"
);
const USER_STYLES = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("user auxiliary route pages", () => {
  it("maps trainee and parent sidebar paths to dedicated views instead of falling back", () => {
    [
      "/trainee/device",
      "/trainee/settings",
      "/parent/records",
      "/parent/advice",
      "/parent/risk",
      "/parent/settings"
    ].forEach((path) => {
      expect(APP_SOURCE).toContain(path);
    });

    expect(APP_SOURCE).toContain("resolveAuxiliaryViewFromPath");
    expect(APP_SOURCE).toContain("trainee_device");
    expect(APP_SOURCE).toContain("parent_records");
    expect(APP_SOURCE).toContain("parent_settings");
  });

  it("provides non-empty auxiliary pages with demo-data boundaries", () => {
    [
      "TraineeDevicePage",
      "TraineeSettingsPage",
      "ParentRecordsPage",
      "ParentAdvicePage",
      "ParentRiskPage",
      "ParentSettingsPage"
    ].forEach((componentName) => {
      expect(AUXILIARY_SOURCE).toContain(`function ${componentName}`);
    });

    expect(AUXILIARY_SOURCE).toContain("DemoModeBadge");
    expect(AUXILIARY_SOURCE).toContain("尚未接入真实后端接口");
    expect(AUXILIARY_SOURCE).toContain("不作为诊断判断");
  });

  it("keeps auxiliary pages aligned with the medical glass visual system", () => {
    expect(AUXILIARY_SOURCE).toContain("NeuroGlassCard");
    expect(AUXILIARY_SOURCE).toContain("MedicalMetricCard");
    expect(AUXILIARY_SOURCE).toContain("SystemHealthIndicator");
    expect(USER_STYLES).toContain(".aux-page");
    expect(USER_STYLES).toContain(".aux-week-bars");
    expect(USER_STYLES).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
