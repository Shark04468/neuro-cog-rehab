import { describe, expect, it } from "vitest";

import {
  AUTH_ROLE_OPTIONS,
  getDashboardPathForRole,
  mockUnifiedLogin,
  UnifiedAuthError,
  validateLoginForm,
  validateRegisterForm
} from "../src/unified-auth-model.js";

describe("unified auth role configuration", () => {
  it("defines the four portal roles with dashboard paths", () => {
    expect(AUTH_ROLE_OPTIONS.map((option) => option.role)).toEqual([
      "trainee",
      "parent",
      "therapist",
      "org_admin"
    ]);
    expect(getDashboardPathForRole("trainee")).toBe("/trainee/dashboard");
    expect(getDashboardPathForRole("parent")).toBe("/parent/dashboard");
    expect(getDashboardPathForRole("therapist")).toBe("/therapist/dashboard");
    expect(getDashboardPathForRole("org_admin")).toBe("/admin/dashboard");
  });

  it("uses clear Chinese labels for role entrances", () => {
    expect(AUTH_ROLE_OPTIONS.map((option) => option.label)).toEqual([
      "训练用户",
      "家长/监护人",
      "治疗师",
      "机构管理员"
    ]);
  });
});

describe("login validation", () => {
  it("requires role, identifier, and password", () => {
    const issues = validateLoginForm({
      role: null,
      identifier: "",
      password: "",
      rememberRole: false
    });

    expect(issues.map((issue) => issue.field)).toEqual(["role", "identifier", "password"]);
  });

  it("accepts account, phone, or email style identifiers without hardcoded credentials", () => {
    const issues = validateLoginForm({
      role: "therapist",
      identifier: "therapist@example.test",
      password: "secure1",
      rememberRole: true
    });

    expect(issues).toEqual([]);
  });

  it("throws a structured auth error when mock login input is incomplete", async () => {
    await expect(
      mockUnifiedLogin({
        role: null,
        identifier: "ab",
        password: "123",
        rememberRole: false
      })
    ).rejects.toBeInstanceOf(UnifiedAuthError);
  });
});

describe("mock unified login", () => {
  it("returns a role-scoped principal and redirect path", async () => {
    const result = await mockUnifiedLogin({
      role: "org_admin",
      identifier: "admin@example.test",
      password: "secure1",
      rememberRole: true
    });

    expect(result.authProvider).toBe("mock");
    expect(result.dashboardPath).toBe("/admin/dashboard");
    expect(result.principal.roles).toEqual(["org_admin"]);
    expect(result.principal.dataScope).toBe("organization");
    expect(result.principal.organizationId).toBe("org-demo");
  });
});

describe("registration validation", () => {
  it("requires consent and common account fields", () => {
    const issues = validateRegisterForm({
      role: null,
      displayName: "",
      identifier: "",
      password: "",
      confirmPassword: "different",
      acceptedPrivacy: false
    });

    expect(issues.map((issue) => issue.field)).toContain("acceptedPrivacy");
    expect(issues.map((issue) => issue.field)).toContain("confirmPassword");
  });

  it("requires trainee age range for trainee registration", () => {
    const issues = validateRegisterForm({
      role: "trainee",
      displayName: "训练用户 A",
      identifier: "trainee@example.test",
      password: "secure1",
      confirmPassword: "secure1",
      acceptedPrivacy: true
    });

    expect(issues).toEqual([{ field: "traineeAgeRange", message: "请选择训练用户年龄段。" }]);
  });

  it("requires organization name for organization admin registration", () => {
    const issues = validateRegisterForm({
      role: "org_admin",
      displayName: "机构管理员",
      identifier: "org@example.test",
      password: "secure1",
      confirmPassword: "secure1",
      acceptedPrivacy: true,
      organizationName: ""
    });

    expect(issues).toEqual([{ field: "organizationName", message: "请输入机构名称。" }]);
  });
});
