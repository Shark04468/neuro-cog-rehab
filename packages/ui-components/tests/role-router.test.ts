import { describe, expect, it } from "vitest";

import {
  createLocalWorkspaceBaseUrls,
  DEFAULT_LOCAL_WORKSPACE_BASE_URLS,
  normalizeWorkspacePath,
  resolveRoleForWorkspacePath,
  resolveWorkspaceNavigationTarget
} from "../src/role-router.js";

describe("role-router", () => {
  it("maps workspace paths to roles", () => {
    expect(resolveRoleForWorkspacePath("/trainee/dashboard")).toBe("trainee");
    expect(resolveRoleForWorkspacePath("/parent/weekly-brief")).toBe("parent");
    expect(resolveRoleForWorkspacePath("/therapist/dashboard")).toBe("therapist");
    expect(resolveRoleForWorkspacePath("/admin/dashboard")).toBe("org_admin");
  });

  it("normalizes relative and absolute paths", () => {
    expect(normalizeWorkspacePath("trainee/dashboard")).toBe("/trainee/dashboard");
    expect(normalizeWorkspacePath("https://example.test/admin/dashboard?tab=logs")).toBe(
      "/admin/dashboard?tab=logs"
    );
  });

  it("resolves external workspace URLs without changing authorization semantics", () => {
    const target = resolveWorkspaceNavigationTarget("/admin/dashboard", {
      currentOrigin: "http://127.0.0.1:5173",
      baseUrls: {
        org_admin: "http://127.0.0.1:5176"
      }
    });

    expect(target).toEqual({
      path: "/admin/dashboard",
      role: "org_admin",
      href: "http://127.0.0.1:5176/admin/dashboard",
      isExternalWorkspace: true
    });
  });

  it("routes therapist menus from admin shell to the therapist workspace", () => {
    const target = resolveWorkspaceNavigationTarget("/therapist/users", {
      currentOrigin: "http://127.0.0.1:5176",
      baseUrls: DEFAULT_LOCAL_WORKSPACE_BASE_URLS
    });

    expect(target).toEqual({
      path: "/therapist/users",
      role: "therapist",
      href: "http://127.0.0.1:5186/therapist/users",
      isExternalWorkspace: true
    });
  });

  it("keeps therapist navigation on the therapist workspace even if another app hosts the shell", () => {
    const target = resolveWorkspaceNavigationTarget("/therapist/prescriptions", {
      currentOrigin: "http://127.0.0.1:5174",
      baseUrls: createLocalWorkspaceBaseUrls()
    });

    expect(target.href).toBe("http://127.0.0.1:5186/therapist/prescriptions");
    expect(target.isExternalWorkspace).toBe(true);
  });
});
