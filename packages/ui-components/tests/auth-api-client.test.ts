import { describe, expect, it } from "vitest";

import {
  createRegisterFlowApiSubmitClient,
  createUnifiedAuthApiClient,
  getConfiguredApiBaseUrl,
  logoutUnifiedAuthApiSession,
  RegisterFlowError,
  UnifiedAuthError,
  type RegisterFlowInput
} from "../src/index.js";

describe("auth API client", () => {
  it("logs in through api-server and maps the selected role to a portal auth result", async () => {
    const requests: CapturedRequest[] = [];
    const authClient = createUnifiedAuthApiClient({
      apiBaseUrl: "http://127.0.0.1:3001/",
      now: () => new Date("2026-06-17T10:00:00.000Z"),
      fetcher: createFetchMock(requests, {
        "/auth/login": {
          accessToken: "access-token",
          refreshToken: "refresh-token",
          accessTokenExpiresAt: "2026-06-17T10:15:00.000Z",
          refreshTokenExpiresAt: "2026-06-24T10:00:00.000Z"
        },
        "/auth/me": {
          userId: "therapist-1",
          roles: ["therapist"],
          organizationId: "org-1"
        }
      })
    });

    const result = await authClient({
      role: "therapist",
      identifier: "therapist@example.test",
      password: "secure123",
      rememberRole: true
    });

    expect(result).toMatchObject({
      role: "therapist",
      authProvider: "api",
      dashboardPath: "/therapist/dashboard",
      issuedAt: "2026-06-17T10:00:00.000Z",
      principal: {
        userId: "therapist-1",
        roles: ["therapist"],
        dataScope: "therapist_linked",
        organizationId: "org-1"
      },
      apiSession: {
        provider: "api-server",
        apiBaseUrl: "http://127.0.0.1:3001",
        accessToken: "access-token",
        refreshToken: "refresh-token"
      }
    });
    expect(requests[0]).toMatchObject({
      path: "/auth/login",
      method: "POST",
      body: {
        email: "therapist@example.test",
        password: "secure123"
      }
    });
    expect(requests[1]).toMatchObject({
      path: "/auth/me",
      method: "GET",
      authorization: "Bearer access-token"
    });
  });

  it("rejects login when the selected portal role is not granted by the API principal", async () => {
    const authClient = createUnifiedAuthApiClient({
      apiBaseUrl: "http://127.0.0.1:3001",
      fetcher: createFetchMock([], {
        "/auth/login": {
          accessToken: "access-token",
          refreshToken: "refresh-token",
          accessTokenExpiresAt: "2026-06-17T10:15:00.000Z",
          refreshTokenExpiresAt: "2026-06-24T10:00:00.000Z"
        },
        "/auth/me": {
          userId: "parent-1",
          roles: ["parent"]
        }
      })
    });

    await expect(
      authClient({
        role: "therapist",
        identifier: "parent@example.test",
        password: "secure123",
        rememberRole: true
      })
    ).rejects.toBeInstanceOf(UnifiedAuthError);
  });

  it("submits role-based registration to the api-server register endpoint", async () => {
    const requests: CapturedRequest[] = [];
    const registerClient = createRegisterFlowApiSubmitClient({
      apiBaseUrl: "http://127.0.0.1:3001",
      now: () => new Date("2026-06-17T11:00:00.000Z"),
      fetcher: createFetchMock(requests, {
        "/auth/register": {
          id: "account-1",
          displayName: "陈老师",
          roles: ["therapist"],
          organizationId: "org-demo-center"
        }
      })
    });

    const result = await registerClient({
      ...baseRegisterInput("therapist"),
      account: "therapist@example.test",
      password: "secure123",
      confirmPassword: "secure123",
      therapistName: "陈老师",
      institutionName: "Demo Center",
      therapistPosition: "康复治疗师",
      staffInviteCode: "staff-001",
      qualificationNote: "资质信息待审核",
      informedConsent: true
    });

    expect(result).toEqual({
      role: "therapist",
      dashboardPath: "/therapist/dashboard",
      registrationId: "account-1",
      submittedAt: "2026-06-17T11:00:00.000Z",
      provider: "api",
      nextAction: "return_to_login"
    });
    expect(requests[0]).toMatchObject({
      path: "/auth/register",
      body: {
        email: "therapist@example.test",
        displayName: "陈老师",
        password: "secure123",
        role: "therapist",
        organizationId: "org-demo-center"
      }
    });
  });

  it("converts API registration errors into register flow errors", async () => {
    const registerClient = createRegisterFlowApiSubmitClient({
      apiBaseUrl: "http://127.0.0.1:3001",
      fetcher: createFetchMock(
        [],
        {},
        {
          "/auth/register": {
            status: 400,
            body: {
              error: {
                code: "VALIDATION_ERROR",
                message: "Password must contain at least 8 characters."
              }
            }
          }
        }
      )
    });

    await expect(
      registerClient({
        ...baseRegisterInput("parent"),
        parentName: "家长",
        parentContact: "parent@example.test",
        relationshipToTrainee: "监护人",
        account: "parent@example.test",
        password: "short1",
        confirmPassword: "short1",
        informedConsent: true
      })
    ).rejects.toBeInstanceOf(RegisterFlowError);
  });

  it("logs out through api-server and sends both access and refresh tokens", async () => {
    const requests: CapturedRequest[] = [];

    await logoutUnifiedAuthApiSession(
      {
        apiBaseUrl: "http://127.0.0.1:3001/",
        accessToken: "access-token",
        refreshToken: "refresh-token"
      },
      {
        fetcher: createFetchMock(requests, {
          "/auth/logout": {}
        })
      }
    );

    expect(requests[0]).toMatchObject({
      path: "/auth/logout",
      method: "POST",
      authorization: "Bearer access-token",
      body: {
        refreshToken: "refresh-token"
      }
    });
  });

  it("requires at least one token before requesting api-server logout", async () => {
    await expect(
      logoutUnifiedAuthApiSession({
        apiBaseUrl: "http://127.0.0.1:3001",
        accessToken: "",
        refreshToken: ""
      })
    ).rejects.toBeInstanceOf(UnifiedAuthError);
  });

  it("resolves API base URL from Vite-style environment values", () => {
    expect(getConfiguredApiBaseUrl({ VITE_API_BASE_URL: " http://127.0.0.1:3001/ " })).toBe(
      "http://127.0.0.1:3001"
    );
    expect(getConfiguredApiBaseUrl({})).toBeNull();
  });
});

interface CapturedRequest {
  path: string;
  method: string;
  authorization?: string;
  body?: unknown;
}

function createFetchMock(
  requests: CapturedRequest[],
  okBodies: Record<string, unknown>,
  errorBodies: Record<string, { status: number; body: unknown }> = {}
): typeof fetch {
  return async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined;
    requests.push({
      path: url.pathname,
      method: init?.method ?? "GET",
      ...(typeof init?.headers === "object" &&
      init.headers !== null &&
      "authorization" in init.headers &&
      typeof init.headers.authorization === "string"
        ? { authorization: init.headers.authorization }
        : {}),
      ...(body !== undefined ? { body } : {})
    });

    const error = errorBodies[url.pathname];
    if (error !== undefined) {
      return new Response(JSON.stringify(error.body), { status: error.status });
    }

    return new Response(JSON.stringify(okBodies[url.pathname] ?? {}), { status: 200 });
  };
}

function baseRegisterInput(role: RegisterFlowInput["role"]): RegisterFlowInput {
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
