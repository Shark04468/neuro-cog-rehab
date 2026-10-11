import type { DataScope, UserRole } from "@neuro-cog-rehab/shared-types";

import {
  getDashboardPathForRole,
  isAuthPortalRole,
  UnifiedAuthError,
  validateLoginForm
} from "./unified-auth-model.js";
import {
  RegisterFlowError,
  validateRegisterFlow,
  type RegisterFlowInput,
  type RegisterFlowSubmitClient,
  type RegisterFlowSubmitResult
} from "./register-flow-model.js";
import type {
  AuthPortalRole,
  AuthValidationIssue,
  UnifiedAuthClient,
  UnifiedAuthResult,
  UnifiedLoginInput
} from "./unified-auth-types.js";

export interface UnifiedAuthApiClientOptions {
  apiBaseUrl: string;
  fetcher?: typeof fetch;
  now?: () => Date;
}

export interface UnifiedAuthApiClients {
  authClient: UnifiedAuthClient;
  registerClient: RegisterFlowSubmitClient;
}

export interface UnifiedAuthApiSessionOperationOptions {
  fetcher?: typeof fetch;
  now?: () => Date;
}

export interface UnifiedAuthApiLogoutSession {
  apiBaseUrl: string;
  accessToken?: string;
  refreshToken?: string;
}

interface ApiAuthTokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

interface ApiAuthenticatedPrincipal {
  userId: string;
  roles: UserRole[];
  organizationId?: string;
  userProfileId?: string;
}

interface ApiRegisterAccount {
  id: string;
  displayName: string;
  roles: UserRole[];
  organizationId?: string;
  userProfileId?: string;
}

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

/**
 * Creates API-backed auth clients for formal mode. Demo mode should continue to
 * use the explicit demo provider so mock data remains clearly separated.
 */
export function createUnifiedAuthApiClients(
  options: UnifiedAuthApiClientOptions
): UnifiedAuthApiClients {
  const normalizedOptions = normalizeOptions(options);
  return {
    authClient: createUnifiedAuthApiClient(normalizedOptions),
    registerClient: createRegisterFlowApiSubmitClient(normalizedOptions)
  };
}

export function createUnifiedAuthApiClient(
  options: UnifiedAuthApiClientOptions
): UnifiedAuthClient {
  const normalizedOptions = normalizeOptions(options);

  return async (input: UnifiedLoginInput): Promise<UnifiedAuthResult> => {
    const issues = validateLoginForm(input);
    if (issues.length > 0 || !input.role) {
      throw new UnifiedAuthError("登录信息需要补充。", issues);
    }

    const tokens = await postJson<ApiAuthTokenPair>(normalizedOptions, "/auth/login", {
      ...identifierToLoginPayload(input.identifier),
      password: input.password
    });
    const principal = await getJson<ApiAuthenticatedPrincipal>(normalizedOptions, "/auth/me", {
      accessToken: tokens.accessToken
    });

    if (!principal.roles.includes(input.role)) {
      throw new UnifiedAuthError("当前账号无权进入所选工作区。", [
        { field: "role", message: "请选择与账号授权范围一致的身份。" }
      ]);
    }

    return {
      role: input.role,
      dashboardPath: getDashboardPathForRole(input.role),
      displayName: createDisplayNameFromIdentifier(input.identifier),
      issuedAt: normalizedOptions.now().toISOString(),
      authProvider: "api",
      principal: toSharedPrincipal(principal, input.role),
      apiSession: {
        provider: "api-server",
        apiBaseUrl: normalizedOptions.apiBaseUrl,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt
      }
    };
  };
}

export function createRegisterFlowApiSubmitClient(
  options: UnifiedAuthApiClientOptions
): RegisterFlowSubmitClient {
  const normalizedOptions = normalizeOptions(options);

  return async (input: RegisterFlowInput): Promise<RegisterFlowSubmitResult> => {
    const issues = validateRegisterFlow(input);
    if (issues.length > 0 || !input.role) {
      throw new RegisterFlowError("注册信息需要补充。", issues);
    }

    let account: ApiRegisterAccount;
    try {
      account = await postJson<ApiRegisterAccount>(
        normalizedOptions,
        "/auth/register",
        toApiRegisterPayload(input)
      );
    } catch (error) {
      if (error instanceof UnifiedAuthError) {
        throw new RegisterFlowError(error.message, authIssuesToRegisterIssues(error.issues));
      }
      throw error;
    }
    const role = firstSupportedPortalRole(account.roles, input.role);

    return {
      role,
      dashboardPath: getDashboardPathForRole(role),
      registrationId: account.id,
      submittedAt: normalizedOptions.now().toISOString(),
      provider: "api",
      nextAction: "return_to_login"
    };
  };
}

export async function logoutUnifiedAuthApiSession(
  session: UnifiedAuthApiLogoutSession,
  options: UnifiedAuthApiSessionOperationOptions = {}
): Promise<void> {
  if (
    (session.accessToken === undefined || session.accessToken.trim().length === 0) &&
    (session.refreshToken === undefined || session.refreshToken.trim().length === 0)
  ) {
    throw new UnifiedAuthError("退出登录需要有效 API 会话。", [
      { field: "apiSession", message: "缺少可撤销的访问令牌或刷新令牌。" }
    ]);
  }

  const normalizedOptionsInput: UnifiedAuthApiClientOptions = {
    apiBaseUrl: session.apiBaseUrl
  };
  if (options.fetcher !== undefined) {
    normalizedOptionsInput.fetcher = options.fetcher;
  }
  if (options.now !== undefined) {
    normalizedOptionsInput.now = options.now;
  }
  const normalizedOptions = normalizeOptions(normalizedOptionsInput);
  const refreshToken =
    session.refreshToken !== undefined && session.refreshToken.trim().length > 0
      ? session.refreshToken
      : undefined;

  await requestJson(normalizedOptions, "/auth/logout", {
    method: "POST",
    ...(refreshToken !== undefined ? { body: { refreshToken } } : {}),
    ...(session.accessToken !== undefined && session.accessToken.trim().length > 0
      ? { accessToken: session.accessToken }
      : {})
  });
}

export function getConfiguredApiBaseUrl(env: Record<string, string | undefined>): string | null {
  const rawValue = env.VITE_API_BASE_URL ?? env.NCR_API_BASE_URL ?? "";
  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed.replace(/\/+$/, "") : null;
}

function normalizeOptions(
  options: UnifiedAuthApiClientOptions
): Required<UnifiedAuthApiClientOptions> {
  const apiBaseUrl = options.apiBaseUrl.trim().replace(/\/+$/, "");
  if (apiBaseUrl.length === 0) {
    throw new UnifiedAuthError("API 地址未配置。", [
      { field: "apiBaseUrl", message: "请先配置 VITE_API_BASE_URL。" }
    ]);
  }

  return {
    apiBaseUrl,
    fetcher: options.fetcher ?? fetch,
    now: options.now ?? (() => new Date())
  };
}

async function getJson<T>(
  options: Required<UnifiedAuthApiClientOptions>,
  path: string,
  init: { accessToken?: string } = {}
): Promise<T> {
  return requestJson<T>(options, path, {
    method: "GET",
    ...(init.accessToken !== undefined ? { accessToken: init.accessToken } : {})
  });
}

async function postJson<T>(
  options: Required<UnifiedAuthApiClientOptions>,
  path: string,
  body: unknown
): Promise<T> {
  return requestJson<T>(options, path, {
    method: "POST",
    body
  });
}

async function requestJson<T>(
  options: Required<UnifiedAuthApiClientOptions>,
  path: string,
  init: {
    method: "GET" | "POST";
    body?: unknown;
    accessToken?: string;
  }
): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) {
    headers["content-type"] = "application/json";
  }
  if (init.accessToken !== undefined) {
    headers.authorization = `Bearer ${init.accessToken}`;
  }

  let response: Response;
  try {
    const requestInit: RequestInit = {
      method: init.method,
      headers
    };
    if (init.body !== undefined) {
      requestInit.body = JSON.stringify(init.body);
    }
    response = await options.fetcher(`${options.apiBaseUrl}${path}`, requestInit);
  } catch {
    throw new UnifiedAuthError("认证服务暂时不可用。", [
      { field: "network", message: "请确认 API 服务已启动后重试。" }
    ]);
  }

  const body = await readResponseBody(response);
  if (!response.ok) {
    const message = extractApiErrorMessage(body);
    throw new UnifiedAuthError(message, [{ field: "api", message }]);
  }

  return body as T;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function extractApiErrorMessage(body: unknown): string {
  const candidate = body as ApiErrorBody;
  return candidate.error?.message ?? "认证服务返回异常，当前操作未完成。";
}

function identifierToLoginPayload(identifier: string): { email?: string; phone?: string } {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) {
    return { email: trimmed };
  }
  return { phone: trimmed };
}

function toApiRegisterPayload(input: RegisterFlowInput): {
  email?: string;
  phone?: string;
  displayName: string;
  password: string;
  role: AuthPortalRole;
  organizationId?: string;
  userProfileId?: string;
} {
  if (!input.role) {
    throw new RegisterFlowError("注册身份缺失。", [
      { field: "role", message: "请先选择注册身份。" }
    ]);
  }

  const payload = {
    ...identifierToLoginPayload(input.account),
    displayName: getRegisterDisplayName(input),
    password: input.password,
    role: input.role
  };

  if (input.role === "trainee") {
    return {
      ...payload,
      userProfileId: createPendingProfileId(input.account)
    };
  }

  if (input.role === "therapist") {
    return {
      ...payload,
      organizationId: createOrganizationScope(input.institutionName)
    };
  }

  if (input.role === "org_admin") {
    return {
      ...payload,
      organizationId: createOrganizationScope(input.organizationName)
    };
  }

  return payload;
}

function getRegisterDisplayName(input: RegisterFlowInput): string {
  if (input.role === "trainee") {
    return input.nickname.trim();
  }
  if (input.role === "parent") {
    return input.parentName.trim();
  }
  if (input.role === "therapist") {
    return input.therapistName.trim();
  }
  return input.adminName.trim();
}

function createPendingProfileId(account: string): string {
  return `pending-profile-${slugify(account) || "trainee"}`;
}

function createOrganizationScope(value: string): string {
  return `org-${slugify(value) || "pending"}`;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function firstSupportedPortalRole(
  roles: readonly UserRole[],
  fallback: AuthPortalRole
): AuthPortalRole {
  const role = roles.find(isAuthPortalRole);
  return role ?? fallback;
}

function toSharedPrincipal(
  principal: ApiAuthenticatedPrincipal,
  selectedRole: AuthPortalRole
): UnifiedAuthResult["principal"] {
  return {
    userId: principal.userId,
    roles: principal.roles,
    dataScope: getDataScopeForRole(selectedRole),
    ...(principal.organizationId !== undefined ? { organizationId: principal.organizationId } : {}),
    ...(principal.userProfileId !== undefined ? { userProfileId: principal.userProfileId } : {})
  };
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

function createDisplayNameFromIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.length <= 8) {
    return trimmed;
  }
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-3)}`;
}

function authIssuesToRegisterIssues(issues: readonly AuthValidationIssue[]): AuthValidationIssue[] {
  return issues.map((issue) => ({
    field: issue.field === "api" ? "submit" : issue.field,
    message: issue.message
  }));
}
