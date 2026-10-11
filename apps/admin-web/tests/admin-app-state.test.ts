import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = fileURLToPath(new URL(".", import.meta.url));
const appRoot = resolve(testDir, "..");

describe("admin app shared shell states", () => {
  it("uses the unified permission state instead of a demo dashboard for non-admin roles", () => {
    const appSource = readFileSync(resolve(appRoot, "src/App.tsx"), "utf8");

    expect(appSource).toContain("PermissionDeniedState");
    expect(appSource).toContain("当前账号不属于机构管理员角色");
    expect(appSource).not.toContain("AppShellDemoDashboard");
  });

  it("uses shared medical platform components for the administrator workspace", () => {
    const appSource = readFileSync(resolve(appRoot, "src/App.tsx"), "utf8");

    expect(appSource).toContain("MedicalMetricCard");
    expect(appSource).toContain("MedicalChartContainer");
    expect(appSource).toContain("StatusDistributionChart");
    expect(appSource).toContain("SystemHealthIndicator");
    expect(appSource).toContain("DemoModeBadge");
    expect(appSource).toContain("PatientRiskBadge");
  });

  it("keeps every administrator sidebar path backed by an admin route view", () => {
    const appSource = readFileSync(resolve(appRoot, "src/App.tsx"), "utf8");

    [
      "/admin/dashboard",
      "/admin/therapists",
      "/admin/users",
      "/admin/devices",
      "/admin/statistics",
      "/admin/logs",
      "/admin/permissions"
    ].forEach((path) => {
      expect(appSource).toContain(`path: "${path}"`);
    });

    expect(appSource).toContain("resolveAdminRouteView");
    expect(appSource).toContain("buildAdminSystemHealth");
    expect(appSource).toContain("buildAdminStatusDistribution");
  });
});
