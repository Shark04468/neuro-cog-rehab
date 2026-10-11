import { describe, expect, it } from "vitest";

import {
  createEmptyRegisterFlowInput,
  getPasswordStrength,
  getRegisterFlowSteps,
  mockSubmitRegisterFlow,
  RegisterFlowError,
  validateRegisterFlow,
  validateRegisterFlowStep
} from "../src/register-flow-model.js";

describe("register flow steps", () => {
  it("builds role-specific multi-step flows", () => {
    expect(getRegisterFlowSteps("trainee").map((step) => step.id)).toEqual([
      "profile",
      "account",
      "guardian",
      "consent",
      "review"
    ]);
    expect(getRegisterFlowSteps("therapist").map((step) => step.id)).toContain("qualification");
    expect(getRegisterFlowSteps(null)).toEqual([]);
  });
});

describe("register flow validation", () => {
  it("validates trainee guardian consent before submission", () => {
    const input = {
      ...createEmptyRegisterFlowInput("trainee"),
      nickname: "小林",
      ageRange: "11-13",
      guardianContact: "guardian@example.test"
    };

    expect(validateRegisterFlowStep(input, "guardian")).toEqual([
      { field: "guardianConsent", message: "请确认已获得监护人同意。" }
    ]);
  });

  it("validates therapist qualification placeholder", () => {
    const input = {
      ...createEmptyRegisterFlowInput("therapist"),
      therapistName: "陈老师",
      institutionName: "示例机构",
      therapistPosition: "康复治疗师",
      staffInviteCode: "T-100"
    };

    expect(validateRegisterFlowStep(input, "qualification")).toEqual([
      { field: "qualificationNote", message: "请填写资质信息占位字段。" }
    ]);
  });

  it("accepts a complete organization admin registration", () => {
    const input = {
      ...createEmptyRegisterFlowInput("org_admin"),
      organizationName: "示例康复中心",
      adminName: "管理员",
      adminContact: "admin@example.test",
      organizationInviteCode: "ORG-2026",
      account: "admin@example.test",
      password: "secure123",
      confirmPassword: "secure123",
      informedConsent: true
    };

    expect(validateRegisterFlow(input)).toEqual([]);
  });
});

describe("password strength", () => {
  it("marks an empty password as empty", () => {
    expect(getPasswordStrength("").level).toBe("empty");
  });

  it("marks a short password as weak", () => {
    expect(getPasswordStrength("abc123").level).toBe("weak");
  });

  it("marks a longer mixed password as strong", () => {
    expect(getPasswordStrength("Secure123!2026").level).toBe("strong");
  });
});

describe("mock register submit", () => {
  it("throws structured errors when required fields are missing", async () => {
    await expect(
      mockSubmitRegisterFlow(createEmptyRegisterFlowInput("parent"))
    ).rejects.toBeInstanceOf(RegisterFlowError);
  });

  it("returns registration result and dashboard path for complete trainee input", async () => {
    const result = await mockSubmitRegisterFlow({
      ...createEmptyRegisterFlowInput("trainee"),
      nickname: "小林",
      ageRange: "11-13",
      account: "trainee@example.test",
      password: "secure123",
      confirmPassword: "secure123",
      guardianContact: "guardian@example.test",
      guardianConsent: true,
      informedConsent: true
    });

    expect(result.provider).toBe("mock");
    expect(result.dashboardPath).toBe("/trainee/dashboard");
    expect(result.registrationId).toContain("reg-trainee");
  });
});
