import { describe, expect, it } from "vitest";

import {
  APP_SHELL_MENU_CONFIG,
  buildAppShellBreadcrumbs,
  findAppShellMenuItem,
  getAppShellMenuItems,
  getDefaultAppShellPath,
  isAppShellPathAllowed,
  resolveAppShellActivePath
} from "../src/app-shell-menu.js";

describe("app shell role menu config", () => {
  it("returns only role-authorized menu items for each workspace", () => {
    expect(getAppShellMenuItems("trainee").map((item) => item.label)).toEqual([
      "今日训练",
      "音乐疗愈",
      "注意力训练",
      "点击反应",
      "节律导航",
      "我的报告",
      "设备状态",
      "设置"
    ]);
    expect(getAppShellMenuItems("parent").map((item) => item.label)).toEqual([
      "训练概览",
      "每周简报",
      "训练记录",
      "治疗师建议",
      "风险提醒",
      "账号设置"
    ]);
    expect(
      getAppShellMenuItems("therapist").every((item) => item.roles.includes("therapist"))
    ).toBe(true);
    expect(
      getAppShellMenuItems("org_admin").every((item) => item.roles.includes("org_admin"))
    ).toBe(true);
  });

  it("keeps unauthorized paths out of another role workspace", () => {
    expect(isAppShellPathAllowed("trainee", "/therapist/dashboard")).toBe(false);
    expect(isAppShellPathAllowed("therapist", "/admin/logs")).toBe(false);
    expect(isAppShellPathAllowed("org_admin", "/admin/logs")).toBe(true);
  });

  it("falls back to the role default path when active route is not allowed", () => {
    expect(resolveAppShellActivePath("parent", "/therapist/users")).toBe("/parent/dashboard");
    expect(resolveAppShellActivePath("therapist", "/therapist/users/demo-001")).toBe(
      "/therapist/users/demo-001"
    );
  });

  it("builds breadcrumbs from the active menu item", () => {
    expect(buildAppShellBreadcrumbs("therapist", "/therapist/reports")).toEqual([
      { label: "治疗师", path: "/therapist/dashboard" },
      { label: "报告中心", path: "/therapist/reports" }
    ]);
  });

  it("provides one default route and an icon for every configured role", () => {
    for (const role of Object.keys(APP_SHELL_MENU_CONFIG) as Array<
      keyof typeof APP_SHELL_MENU_CONFIG
    >) {
      expect(findAppShellMenuItem(role, getDefaultAppShellPath(role))).not.toBeNull();
      expect(getAppShellMenuItems(role).every((item) => typeof item.icon === "string")).toBe(true);
    }
  });
});
