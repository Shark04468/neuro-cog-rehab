import type { DataScope } from "@neuro-cog-rehab/shared-types";

import type {
  AuthPortalRole,
  AuthRoleOption,
  AuthValidationIssue,
  UnifiedAuthResult,
  UnifiedLoginInput,
  UnifiedRegisterInput
} from "./unified-auth-types.js";

export const AUTH_PORTAL_ROLES = ["trainee", "parent", "therapist", "org_admin"] as const;

export const AUTH_DASHBOARD_PATHS: Record<AuthPortalRole, string> = {
  trainee: "/trainee/dashboard",
  parent: "/parent/dashboard",
  therapist: "/therapist/dashboard",
  org_admin: "/admin/dashboard"
};

export const AUTH_ROLE_OPTIONS: AuthRoleOption[] = [
  {
    role: "trainee",
    label: "训练用户",
    shortLabel: "用户",
    description: "进入个人训练任务、EEG 连接检查与训练记录空间。",
    iconKind: "training",
    dashboardPath: AUTH_DASHBOARD_PATHS.trainee
  },
  {
    role: "parent",
    label: "家长/监护人",
    shortLabel: "家长",
    description: "查看阶段反馈、训练坚持情况与下次训练建议。",
    iconKind: "guardian",
    dashboardPath: AUTH_DASHBOARD_PATHS.parent
  },
  {
    role: "therapist",
    label: "治疗师",
    shortLabel: "治疗师",
    description: "进入用户列表、训练处方、报告与状态趋势工作台。",
    iconKind: "therapist",
    dashboardPath: AUTH_DASHBOARD_PATHS.therapist
  },
  {
    role: "org_admin",
    label: "机构管理员",
    shortLabel: "机构",
    description: "管理机构空间、成员权限、数据导出与操作日志。",
    iconKind: "organization",
    dashboardPath: AUTH_DASHBOARD_PATHS.org_admin
  }
];

const MIN_IDENTIFIER_LENGTH = 3;
const MIN_PASSWORD_LENGTH = 6;

export class UnifiedAuthError extends Error {
  public readonly issues: AuthValidationIssue[];

  public constructor(message: string, issues: AuthValidationIssue[]) {
    super(message);
    this.name = "UnifiedAuthError";
    this.issues = issues;
  }
}

export function isAuthPortalRole(value: unknown): value is AuthPortalRole {
  return typeof value === "string" && AUTH_PORTAL_ROLES.includes(value as AuthPortalRole);
}

export function getDashboardPathForRole(role: AuthPortalRole): string {
  return AUTH_DASHBOARD_PATHS[role];
}

export function getRoleOption(role: AuthPortalRole): AuthRoleOption {
  const option = AUTH_ROLE_OPTIONS.find((item) => item.role === role);
  if (!option) {
    throw new UnifiedAuthError("Unsupported portal role.", [
      { field: "role", message: "当前身份暂不支持统一入口。" }
    ]);
  }

  return option;
}

export function validateLoginForm(input: UnifiedLoginInput): AuthValidationIssue[] {
  const issues: AuthValidationIssue[] = [];

  if (!input.role) {
    issues.push({ field: "role", message: "请先选择登录身份。" });
  }

  if (input.identifier.trim().length < MIN_IDENTIFIER_LENGTH) {
    issues.push({ field: "identifier", message: "请输入账号、手机号或邮箱。" });
  }

  if (input.password.length < MIN_PASSWORD_LENGTH) {
    issues.push({ field: "password", message: "请输入至少 6 位密码。" });
  }

  return issues;
}

export function validateRegisterForm(input: UnifiedRegisterInput): AuthValidationIssue[] {
  const issues: AuthValidationIssue[] = [];

  if (!input.role) {
    issues.push({ field: "role", message: "请先选择注册身份。" });
  }

  if (input.displayName.trim().length < 2) {
    issues.push({ field: "displayName", message: "请输入至少 2 个字符的显示名称。" });
  }

  if (input.identifier.trim().length < MIN_IDENTIFIER_LENGTH) {
    issues.push({ field: "identifier", message: "请输入账号、手机号或邮箱。" });
  }

  if (input.password.length < MIN_PASSWORD_LENGTH) {
    issues.push({ field: "password", message: "请设置至少 6 位密码。" });
  }

  if (input.password !== input.confirmPassword) {
    issues.push({ field: "confirmPassword", message: "两次输入的密码不一致。" });
  }

  if (!input.acceptedPrivacy) {
    issues.push({ field: "acceptedPrivacy", message: "请先阅读并同意隐私协议和知情同意说明。" });
  }

  if (input.role === "trainee" && !input.traineeAgeRange) {
    issues.push({ field: "traineeAgeRange", message: "请选择训练用户年龄段。" });
  }

  if (input.role === "parent" && !input.linkedTraineeAlias?.trim()) {
    issues.push({ field: "linkedTraineeAlias", message: "请输入可识别的训练用户昵称或编号。" });
  }

  if (input.role === "therapist" && !input.institutionName?.trim()) {
    issues.push({ field: "institutionName", message: "请输入所属机构名称。" });
  }

  if (input.role === "org_admin" && !input.organizationName?.trim()) {
    issues.push({ field: "organizationName", message: "请输入机构名称。" });
  }

  return issues;
}

export async function mockUnifiedLogin(input: UnifiedLoginInput): Promise<UnifiedAuthResult> {
  const issues = validateLoginForm(input);
  if (issues.length > 0 || !input.role) {
    throw new UnifiedAuthError("登录信息需要补充。", issues);
  }

  const principal = {
    userId: createMockUserId(input.role, input.identifier),
    roles: [input.role],
    dataScope: getDataScopeForRole(input.role)
  };

  // Replace this mock with a real auth API client without changing the UI contract.
  return {
    role: input.role,
    dashboardPath: getDashboardPathForRole(input.role),
    displayName: createDisplayNameFromIdentifier(input.identifier),
    issuedAt: new Date().toISOString(),
    authProvider: "mock",
    principal:
      input.role === "org_admin" || input.role === "therapist"
        ? { ...principal, organizationId: "org-demo" }
        : principal
  };
}

function createDisplayNameFromIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.length <= 8) {
    return trimmed;
  }

  return `${trimmed.slice(0, 4)}...${trimmed.slice(-3)}`;
}

function createMockUserId(role: AuthPortalRole, identifier: string): string {
  const normalized = identifier
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);

  return `${role}-${normalized || "mock"}`;
}

function getDataScopeForRole(role: AuthPortalRole): DataScope {
  if (role === "trainee") {
    return "self";
  }
  if (role === "parent") {
    return "parent_linked";
  }
  if (role === "therapist") {
    return "therapist_linked";
  }

  return "organization";
}
