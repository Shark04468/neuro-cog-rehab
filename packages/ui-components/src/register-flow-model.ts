import type { AuthValidationIssue } from "./unified-auth-types.js";
import { getDashboardPathForRole } from "./unified-auth-model.js";
import type { AuthPortalRole } from "./unified-auth-types.js";

export type RegisterFlowStepId =
  | "profile"
  | "account"
  | "guardian"
  | "qualification"
  | "consent"
  | "review";

export type PasswordStrengthLevel = "empty" | "weak" | "medium" | "strong";

export interface RegisterFlowStep {
  id: RegisterFlowStepId;
  title: string;
  description: string;
}

export interface RegisterFlowInput {
  role: AuthPortalRole | null;
  nickname: string;
  ageRange: string;
  account: string;
  password: string;
  confirmPassword: string;
  guardianContact: string;
  guardianConsent: boolean;
  informedConsent: boolean;
  parentName: string;
  parentContact: string;
  relationshipToTrainee: string;
  therapistName: string;
  institutionName: string;
  therapistPosition: string;
  staffInviteCode: string;
  qualificationNote: string;
  organizationName: string;
  adminName: string;
  adminContact: string;
  organizationInviteCode: string;
}

export interface PasswordStrengthResult {
  level: PasswordStrengthLevel;
  score: number;
  label: string;
  helperText: string;
}

export interface RegisterFlowSubmitResult {
  role: AuthPortalRole;
  dashboardPath: string;
  registrationId: string;
  submittedAt: string;
  provider: "mock" | "api";
  nextAction: "return_to_login" | "enter_dashboard";
}

export type RegisterFlowSubmitClient = (
  input: RegisterFlowInput
) => Promise<RegisterFlowSubmitResult>;

export const REGISTER_FLOW_API_ENDPOINTS = {
  submit: "/api/auth/register"
} as const;

export function createEmptyRegisterFlowInput(role: AuthPortalRole | null): RegisterFlowInput {
  return {
    role,
    nickname: "",
    ageRange: "",
    account: "",
    password: "",
    confirmPassword: "",
    guardianContact: "",
    guardianConsent: false,
    informedConsent: false,
    parentName: "",
    parentContact: "",
    relationshipToTrainee: "",
    therapistName: "",
    institutionName: "",
    therapistPosition: "",
    staffInviteCode: "",
    qualificationNote: "",
    organizationName: "",
    adminName: "",
    adminContact: "",
    organizationInviteCode: ""
  };
}

export function getRegisterFlowSteps(role: AuthPortalRole | null): RegisterFlowStep[] {
  if (role === "trainee") {
    return [
      { id: "profile", title: "训练用户信息", description: "填写昵称与年龄段。" },
      { id: "account", title: "账号安全", description: "设置登录账号和密码。" },
      { id: "guardian", title: "监护人确认", description: "确认联系方式和同意状态。" },
      { id: "consent", title: "知情同意", description: "确认数据使用和训练边界。" },
      { id: "review", title: "提交确认", description: "检查信息后提交。" }
    ];
  }

  if (role === "parent") {
    return [
      { id: "profile", title: "监护人信息", description: "填写称呼、联系方式和关系。" },
      { id: "account", title: "账号安全", description: "设置登录账号和密码。" },
      { id: "consent", title: "知情同意", description: "确认数据使用和授权边界。" },
      { id: "review", title: "提交确认", description: "检查信息后提交。" }
    ];
  }

  if (role === "therapist") {
    return [
      { id: "profile", title: "治疗师信息", description: "填写姓名、机构和职位。" },
      { id: "account", title: "账号安全", description: "设置登录账号和密码。" },
      { id: "qualification", title: "资质占位", description: "预留后续资质审核信息。" },
      { id: "consent", title: "平台协议", description: "确认数据访问和操作边界。" },
      { id: "review", title: "提交确认", description: "检查信息后提交。" }
    ];
  }

  if (role === "org_admin") {
    return [
      { id: "profile", title: "机构信息", description: "填写机构与管理员信息。" },
      { id: "account", title: "账号安全", description: "设置登录账号和密码。" },
      { id: "consent", title: "平台协议", description: "确认管理权限和数据边界。" },
      { id: "review", title: "提交确认", description: "检查信息后提交。" }
    ];
  }

  return [];
}

export function validateRegisterFlowStep(
  input: RegisterFlowInput,
  stepId: RegisterFlowStepId
): AuthValidationIssue[] {
  const issues: AuthValidationIssue[] = [];

  if (!input.role) {
    return [{ field: "role", message: "请先选择注册身份。" }];
  }

  if (stepId === "profile") {
    validateProfileStep(input, issues);
  }

  if (stepId === "account") {
    validateAccountStep(input, issues);
  }

  if (stepId === "guardian") {
    validateGuardianStep(input, issues);
  }

  if (stepId === "qualification") {
    validateQualificationStep(input, issues);
  }

  if (stepId === "consent") {
    validateConsentStep(input, issues);
  }

  if (stepId === "review") {
    return validateRegisterFlow(input);
  }

  return issues;
}

export function validateRegisterFlow(input: RegisterFlowInput): AuthValidationIssue[] {
  const steps = getRegisterFlowSteps(input.role);
  const issues = steps
    .filter((step) => step.id !== "review")
    .flatMap((step) => validateRegisterFlowStep(input, step.id));

  return dedupeIssues(issues);
}

export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      level: "empty",
      score: 0,
      label: "未填写",
      helperText: "建议使用至少 8 位，并包含字母和数字。"
    };
  }

  const checks = [
    password.length >= 8,
    /[a-z]/i.test(password),
    /\d/.test(password),
    /[^a-zA-Z0-9]/.test(password),
    password.length >= 12
  ];
  const passedCount = checks.filter(Boolean).length;

  if (passedCount >= 4) {
    return {
      level: "strong",
      score: 3,
      label: "较强",
      helperText: "密码复杂度较好，请妥善保管。"
    };
  }

  if (passedCount >= 3) {
    return {
      level: "medium",
      score: 2,
      label: "适中",
      helperText: "可继续增加长度或特殊字符。"
    };
  }

  return {
    level: "weak",
    score: 1,
    label: "偏弱",
    helperText: "建议增加长度，并混合字母、数字或符号。"
  };
}

export async function mockSubmitRegisterFlow(
  input: RegisterFlowInput
): Promise<RegisterFlowSubmitResult> {
  const issues = validateRegisterFlow(input);
  if (issues.length > 0 || !input.role) {
    throw new RegisterFlowError("注册信息需要补充。", issues);
  }

  return {
    role: input.role,
    dashboardPath: getDashboardPathForRole(input.role),
    registrationId: createMockRegistrationId(input),
    submittedAt: new Date().toISOString(),
    provider: "mock",
    nextAction: "return_to_login"
  };
}

export class RegisterFlowError extends Error {
  public readonly issues: AuthValidationIssue[];

  public constructor(message: string, issues: AuthValidationIssue[]) {
    super(message);
    this.name = "RegisterFlowError";
    this.issues = issues;
  }
}

function validateProfileStep(input: RegisterFlowInput, issues: AuthValidationIssue[]): void {
  if (input.role === "trainee") {
    requireText(input.nickname, "nickname", "请输入训练用户昵称。", issues, 2);
    requireText(input.ageRange, "ageRange", "请选择年龄段。", issues);
    return;
  }

  if (input.role === "parent") {
    requireText(input.parentName, "parentName", "请输入姓名或称呼。", issues, 2);
    requireText(input.parentContact, "parentContact", "请输入联系方式。", issues, 5);
    requireText(
      input.relationshipToTrainee,
      "relationshipToTrainee",
      "请输入与训练用户的关系。",
      issues
    );
    return;
  }

  if (input.role === "therapist") {
    requireText(input.therapistName, "therapistName", "请输入治疗师姓名。", issues, 2);
    requireText(input.institutionName, "institutionName", "请输入所属机构。", issues, 2);
    requireText(input.therapistPosition, "therapistPosition", "请输入职位。", issues, 2);
    requireText(input.staffInviteCode, "staffInviteCode", "请输入工号或邀请码。", issues, 3);
    return;
  }

  requireText(input.organizationName, "organizationName", "请输入机构名称。", issues, 2);
  requireText(input.adminName, "adminName", "请输入管理员姓名。", issues, 2);
  requireText(input.adminContact, "adminContact", "请输入管理员联系方式。", issues, 5);
  requireText(
    input.organizationInviteCode,
    "organizationInviteCode",
    "请输入机构邀请码。",
    issues,
    3
  );
}

function validateAccountStep(input: RegisterFlowInput, issues: AuthValidationIssue[]): void {
  requireText(input.account, "account", "请输入账号、手机号或邮箱。", issues, 3);

  if (input.password.length < 6) {
    issues.push({ field: "password", message: "请设置至少 6 位密码。" });
  }

  if (input.password !== input.confirmPassword) {
    issues.push({ field: "confirmPassword", message: "两次输入的密码不一致。" });
  }
}

function validateGuardianStep(input: RegisterFlowInput, issues: AuthValidationIssue[]): void {
  if (input.role !== "trainee") {
    return;
  }

  requireText(input.guardianContact, "guardianContact", "请输入监护人联系方式。", issues, 5);
  if (!input.guardianConsent) {
    issues.push({ field: "guardianConsent", message: "请确认已获得监护人同意。" });
  }
}

function validateQualificationStep(input: RegisterFlowInput, issues: AuthValidationIssue[]): void {
  if (input.role === "therapist") {
    requireText(
      input.qualificationNote,
      "qualificationNote",
      "请填写资质信息占位字段。",
      issues,
      2
    );
  }
}

function validateConsentStep(input: RegisterFlowInput, issues: AuthValidationIssue[]): void {
  if (!input.informedConsent) {
    issues.push({ field: "informedConsent", message: "请勾选知情同意和隐私说明。" });
  }
}

function requireText(
  value: string,
  field: string,
  message: string,
  issues: AuthValidationIssue[],
  minLength = 1
): void {
  if (value.trim().length < minLength) {
    issues.push({ field, message });
  }
}

function dedupeIssues(issues: AuthValidationIssue[]): AuthValidationIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.field}:${issue.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function createMockRegistrationId(input: RegisterFlowInput): string {
  const source = `${input.role ?? "unknown"}-${input.account || input.nickname || input.organizationName}`;
  const normalized = source
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 28);

  return `reg-${normalized || "mock"}-${Date.now().toString(36)}`;
}
