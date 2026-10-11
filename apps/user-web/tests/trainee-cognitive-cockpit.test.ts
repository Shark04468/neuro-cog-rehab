import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { mockTraineeDashboardData } from "../src/trainee-dashboard-mock.js";
import { buildTraineeDashboardViewModel } from "../src/trainee-dashboard-model.js";

const COCKPIT_SOURCE = readFileSync(
  new URL("../src/TraineeDashboard.tsx", import.meta.url),
  "utf8"
);

const USER_STYLES = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("trainee cognitive cockpit", () => {
  it("keeps the original dashboard export while adding cockpit components", () => {
    expect(COCKPIT_SOURCE).toContain("export function TraineeDashboard");
    expect(COCKPIT_SOURCE).toContain("export function TraineeCognitiveCockpit");
    expect(COCKPIT_SOURCE).toContain("export function MainTrainingMissionCard");
    expect(COCKPIT_SOURCE).toContain("export function RealtimeCognitiveStatusPanel");
    expect(COCKPIT_SOURCE).toContain("export function WeeklyTrainingProgress");
    expect(COCKPIT_SOURCE).toContain("export function CognitiveTrendStrip");
  });

  it("keeps the start action driven by the existing dashboard view model", () => {
    const viewModel = buildTraineeDashboardViewModel(mockTraineeDashboardData);

    expect(viewModel.startState.canStart).toBe(true);
    expect(viewModel.primaryTask?.id).toBe("task-music");
    expect(viewModel.totalPlannedMinutes).toBe(28);
  });

  it("contains cockpit visual classes and reduced motion support", () => {
    expect(USER_STYLES).toContain(".trainee-cockpit");
    expect(USER_STYLES).toContain(".cockpit-mission-card");
    expect(USER_STYLES).toContain(".cockpit-status-panel");
    expect(USER_STYLES).toContain(".cockpit-trend-strip");
    expect(USER_STYLES).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("does not include diagnosis or guaranteed-effect wording in cockpit content", () => {
    const content = `${COCKPIT_SOURCE}\n${JSON.stringify(mockTraineeDashboardData)}`;

    expect(content).not.toContain("确诊");
    expect(content).not.toContain("治愈");
    expect(content).not.toContain("疗效保证");
    expect(content).not.toContain("治疗效果显著");
  });
});
