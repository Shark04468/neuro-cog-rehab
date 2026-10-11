import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const sourceRoot = join(process.cwd(), "src");

describe("therapist command center frontend contract", () => {
  it("exports the command center page and required reusable components", () => {
    const dashboardSource = readFileSync(join(sourceRoot, "TherapistDashboard.tsx"), "utf8");

    [
      "TherapistCommandCenter",
      "CommandMetricCard",
      "PatientTrainingStatusMap",
      "EEGQualityOverview",
      "RehabilitationTrendChart",
      "PendingActionPanel",
      "AdvancedPatientTable",
      "PrescriptionQuickAction",
      "ReportQuickEntry"
    ].forEach((componentName) => {
      expect(dashboardSource).toContain(`export function ${componentName}`);
    });
  });

  it("uses command center styling hooks and reduced motion support", () => {
    const styles = readFileSync(join(sourceRoot, "styles.css"), "utf8");

    [
      ".therapist-command-center",
      ".command-metric-card",
      ".patient-training-status-map",
      ".eeg-quality-overview",
      ".rehabilitation-trend-chart",
      ".pending-action-panel",
      ".advanced-patient-table",
      ".prescription-quick-action",
      ".report-quick-entry"
    ].forEach((className) => {
      expect(styles).toContain(className);
    });

    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).not.toContain("疗效保证");
    expect(styles).not.toContain("治愈");
    expect(styles).not.toContain("确诊");
  });
});
