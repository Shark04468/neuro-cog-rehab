import type { AddressInfo } from "node:net";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createApiHttpServer,
  type CreateReportInput,
  type CreateTrainingRecordInput,
  type TrainingPrescriptionDraftInput
} from "../src/index.js";

type TestServer = ReturnType<typeof createApiHttpServer>;

interface AuthTokenPairResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

interface TrainingProfileResponse {
  id: string;
  traineeUserId: string;
  organizationId?: string;
}

let server: TestServer | undefined;
let baseUrl = "";

beforeEach(async () => {
  server = createApiHttpServer({
    tokenSecret: "http-test-token-secret-change-me-32",
    allowedOrigins: ["http://127.0.0.1:5173"]
  });
  await new Promise<void>((resolve) => {
    server?.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  if (!server) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    server?.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  server = undefined;
});

describe("api HTTP runtime", () => {
  it("reports health and marks runtime storage as in-memory", async () => {
    const response = await fetchJson("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      service: "api-server",
      storage: "in_memory",
      purpose: "auxiliary_training_state_tracking"
    });
  });

  it("rejects protected endpoints without an access token", async () => {
    const response = await fetchJson("/training-records");

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      error: {
        code: "AUTHENTICATION_REQUIRED"
      }
    });
  });

  it("supports auth, profile creation, prescriptions, training records, reports, and scoped listing", async () => {
    await registerTherapist("therapist-http@example.test");
    const tokens = await login("therapist-http@example.test");
    const profile = await createProfile(tokens.accessToken);
    const prescriptionInput = basePrescriptionInput({
      userProfileId: profile.id,
      organizationId: profile.organizationId
    });

    const savePrescriptionResponse = await fetchJson("/training-prescriptions", {
      method: "POST",
      token: tokens.accessToken,
      body: prescriptionInput
    });
    expect(savePrescriptionResponse.status).toBe(200);
    expect(savePrescriptionResponse.body).toMatchObject({
      userProfileId: profile.id,
      version: 1,
      status: "active"
    });

    const activePrescriptionResponse = await fetchJson(
      `/training-prescriptions/active?userProfileId=${profile.id}`,
      {
        token: tokens.accessToken
      }
    );
    expect(activePrescriptionResponse.status).toBe(200);
    expect(activePrescriptionResponse.body).toMatchObject({
      userProfileId: profile.id,
      weeklySessionCount: 3
    });

    const recordInput = baseTrainingRecordInput({
      userProfileId: profile.id,
      organizationId: profile.organizationId
    });

    const createRecordResponse = await fetchJson("/training-records", {
      method: "POST",
      token: tokens.accessToken,
      body: recordInput
    });
    expect(createRecordResponse.status).toBe(201);
    expect(createRecordResponse.body).toMatchObject({
      userProfileId: profile.id,
      trainingType: "attention_game",
      completionStatus: "completed"
    });

    const listResponse = await fetchJson(
      `/training-records?userProfileId=${profile.id}&page=1&pageSize=5`,
      {
        token: tokens.accessToken
      }
    );
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toMatchObject({
      pagination: {
        page: 1,
        pageSize: 5,
        totalItems: 1
      }
    });
    expect((listResponse.body as { records: unknown[] }).records).toHaveLength(1);

    const reportInput = baseReportInput({
      userProfileId: profile.id,
      organizationId: profile.organizationId
    });
    const createReportResponse = await fetchJson("/reports", {
      method: "POST",
      token: tokens.accessToken,
      body: reportInput
    });
    expect(createReportResponse.status).toBe(201);
    expect(createReportResponse.body).toMatchObject({
      id: reportInput.id,
      userProfileId: profile.id,
      reportType: "weekly",
      audience: "therapist"
    });

    const reportsResponse = await fetchJson(`/reports?userProfileId=${profile.id}`, {
      token: tokens.accessToken
    });
    expect(reportsResponse.status).toBe(200);
    expect(reportsResponse.body).toMatchObject({
      pagination: {
        totalItems: 1
      }
    });

    const reportDetailResponse = await fetchJson(`/reports/${reportInput.id}`, {
      token: tokens.accessToken
    });
    expect(reportDetailResponse.status).toBe(200);
    expect(reportDetailResponse.body).toMatchObject({
      id: reportInput.id,
      userProfileId: profile.id,
      narrativeSummary: expect.stringContaining("training records")
    });

    const therapistDashboardResponse = await fetchJson("/therapist/dashboard", {
      token: tokens.accessToken
    });
    expect(therapistDashboardResponse.status).toBe(200);
    expect(therapistDashboardResponse.body).toMatchObject({
      dataScopeNotice: expect.stringContaining("辅助训练记录"),
      users: [
        expect.objectContaining({
          id: "trainee-http-1",
          userProfileId: profile.id,
          todayPlan: expect.objectContaining({
            prescriptionStatus: "ready"
          })
        })
      ],
      dashboardSupplement: expect.objectContaining({
        recentReports: [
          expect.objectContaining({
            id: reportInput.id,
            reportType: "weekly"
          })
        ]
      })
    });

    const therapistUserDetailResponse = await fetchJson("/therapist/users/trainee-http-1", {
      token: tokens.accessToken
    });
    expect(therapistUserDetailResponse.status).toBe(200);
    expect(therapistUserDetailResponse.body).toMatchObject({
      user: expect.objectContaining({
        id: "trainee-http-1",
        userProfileId: profile.id
      }),
      detailRecord: expect.objectContaining({
        userId: "trainee-http-1",
        recentTrainingRecords: [
          expect.objectContaining({
            trainingType: "attention_game",
            trainingTypeLabel: "注意力训练"
          })
        ]
      })
    });

    const musicTracksResponse = await fetchJson("/music-library/tracks?tag=focus", {
      token: tokens.accessToken
    });
    expect(musicTracksResponse.status).toBe(200);
    expect(musicTracksResponse.body).toMatchObject({
      dataScopeNotice: expect.stringContaining("辅助训练安排"),
      tracks: expect.arrayContaining([expect.objectContaining({ id: "track-soft-focus-pulse" })])
    });

    const saveMusicSelectionResponse = await fetchJson("/music-library/selections", {
      method: "PUT",
      token: tokens.accessToken,
      body: {
        userId: "trainee-http-1",
        userProfileId: profile.id,
        organizationId: profile.organizationId,
        recommendedTrackIds: ["track-soft-focus-pulse"],
        disabledTrackIds: ["track-calm-noise-band"]
      }
    });
    expect(saveMusicSelectionResponse.status).toBe(200);
    expect(saveMusicSelectionResponse.body).toMatchObject({
      userId: "trainee-http-1",
      userProfileId: profile.id,
      recommendedTrackIds: ["track-soft-focus-pulse"],
      disabledTrackIds: ["track-calm-noise-band"]
    });

    const musicSelectionResponse = await fetchJson(
      `/music-library/selections?userId=trainee-http-1&userProfileId=${profile.id}&organizationId=${profile.organizationId}`,
      { token: tokens.accessToken }
    );
    expect(musicSelectionResponse.status).toBe(200);
    expect(musicSelectionResponse.body).toMatchObject({
      recommendedTrackIds: ["track-soft-focus-pulse"],
      disabledTrackIds: ["track-calm-noise-band"]
    });

    const adminEmail = "admin-prescription-report-http@example.test";
    await registerOrgAdmin(adminEmail);
    const adminTokens = await login(adminEmail);
    const operationLogsResponse = await fetchJson("/operation-logs", {
      token: adminTokens.accessToken
    });
    expect(
      (operationLogsResponse.body as { logs: Array<{ operationType: string }> }).logs.map(
        (log) => log.operationType
      )
    ).toEqual(
      expect.arrayContaining(["training_prescription.update", "report.generate", "auth.login"])
    );
  });

  it("hides password hashes and allows organization admins to query audit logs", async () => {
    const registerResponse = await fetchJson("/auth/register", {
      method: "POST",
      body: {
        email: "admin-http@example.test",
        password: "secure123",
        displayName: "Org Admin HTTP",
        role: "org_admin",
        organizationId: "org-http"
      }
    });
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body).not.toHaveProperty("passwordHash");

    const tokens = await login("admin-http@example.test");
    const logsResponse = await fetchJson("/operation-logs?operationType=auth.login", {
      token: tokens.accessToken
    });

    expect(logsResponse.status).toBe(200);
    expect(logsResponse.body).toMatchObject({
      pagination: {
        totalItems: 1
      }
    });
    expect((logsResponse.body as { logs: Array<{ operationType: string }> }).logs[0]).toMatchObject(
      {
        operationType: "auth.login"
      }
    );
  });
});

async function registerTherapist(email: string): Promise<void> {
  const response = await fetchJson("/auth/register", {
    method: "POST",
    body: {
      email,
      password: "secure123",
      displayName: "Therapist HTTP",
      role: "therapist",
      organizationId: "org-http"
    }
  });
  expect(response.status).toBe(201);
}

async function registerOrgAdmin(email: string): Promise<void> {
  const response = await fetchJson("/auth/register", {
    method: "POST",
    body: {
      email,
      password: "secure123",
      displayName: "Org Admin HTTP",
      role: "org_admin",
      organizationId: "org-http"
    }
  });
  expect(response.status).toBe(201);
}

async function login(email: string): Promise<AuthTokenPairResponse> {
  const response = await fetchJson("/auth/login", {
    method: "POST",
    body: {
      email,
      password: "secure123"
    }
  });
  expect(response.status).toBe(200);
  return response.body as AuthTokenPairResponse;
}

async function createProfile(accessToken: string): Promise<TrainingProfileResponse> {
  const response = await fetchJson("/profiles", {
    method: "POST",
    token: accessToken,
    body: {
      traineeUserId: "trainee-http-1",
      organizationId: "org-http",
      basicInfo: {
        nickname: "训练用户A",
        ageBand: "11_13",
        trainingGoals: ["保持训练节奏", "观察注意状态趋势"]
      },
      trainingInfo: {
        attentionDifficultyManifestations: ["容易被环境声音打断"],
        impulseControlManifestations: ["点击任务中偶尔提前反应"],
        taskPersistenceLevel: "variable"
      },
      riskScreening: {
        photosensitivityRisk: false,
        seizureHistoryNotice: false,
        severeHeadache: false,
        significantDizziness: false,
        guardianConsentStatus: "granted"
      },
      deviceInfo: {
        eegDeviceBound: true,
        eegDeviceModel: "模拟EEG",
        eegConnectionType: "simulator"
      },
      therapistNotes: "仅用于训练安全和趋势跟踪。"
    }
  });
  expect(response.status).toBe(201);
  return response.body as TrainingProfileResponse;
}

function baseTrainingRecordInput(
  overrides: Partial<CreateTrainingRecordInput> = {}
): CreateTrainingRecordInput {
  return {
    userId: "trainee-http-1",
    userProfileId: "profile-placeholder",
    organizationId: "org-http",
    trainingType: "attention_game",
    startedAt: "2026-06-17T08:00:00.000Z",
    endedAt: "2026-06-17T08:10:00.000Z",
    durationSeconds: 600,
    behaviorMetrics: {
      totalTrials: 40,
      correctCount: 34,
      accuracyRate: 0.85,
      averageReactionTimeMs: 510,
      omissionCount: 2,
      falseAlarmCount: 1
    },
    eegSummaryMetrics: {
      averageAttentionIndex: 62,
      averageRelaxationIndex: 58,
      validSampleRate: 0.95,
      artifactCount: 2,
      frameCount: 120,
      qualityStatus: "good"
    },
    difficultyConfig: {
      initialLevel: 2,
      finalLevel: 2,
      adaptiveEnabled: true,
      parameters: {
        targetDisplayMs: 1200
      }
    },
    abnormalEvents: [],
    completionStatus: "completed",
    ...overrides
  };
}

function basePrescriptionInput(
  overrides: Partial<TrainingPrescriptionDraftInput> = {}
): TrainingPrescriptionDraftInput {
  return {
    userId: "trainee-http-1",
    userProfileId: "profile-placeholder",
    organizationId: "org-http",
    weeklySessionCount: 3,
    sessionDurationMinutes: 15,
    moduleCombination: ["music_therapy", "attention_game"],
    musicType: "nature",
    initialDifficulty: "light",
    adaptiveAdjustmentEnabled: true,
    dailyMaxTrainingMinutes: 30,
    riskReminderKeys: ["signal_unstable", "user_discomfort", "daily_limit"],
    therapistNote: "Use short, low-distraction training blocks.",
    ...overrides
  };
}

function baseReportInput(overrides: Partial<CreateReportInput> = {}): CreateReportInput {
  return {
    id: "report-http-1",
    userId: "trainee-http-1",
    userProfileId: "profile-placeholder",
    organizationId: "org-http",
    therapistUserId: "therapist-http",
    reportType: "weekly",
    audience: "therapist",
    periodStart: "2026-06-10T00:00:00.000Z",
    periodEnd: "2026-06-17T00:00:00.000Z",
    generatedAt: "2026-06-17T08:20:00.000Z",
    sessionCount: 1,
    completedSessionCount: 1,
    averageCompletionRate: 1,
    metricSummaries: [
      {
        trainingType: "attention_game",
        completedSessionCount: 1,
        averageCompletionRate: 1,
        averageAccuracyRate: 0.85,
        trendLabel: "stable"
      }
    ],
    riskAlerts: [],
    narrativeSummary:
      "This report summarizes saved training records and trend observations for authorized review.",
    nextTrainingFocus: ["Keep a steady training rhythm and review signal quality before sessions."],
    dataScopeNotice: "This report is for auxiliary training record review and trend tracking only.",
    ...overrides
  };
}

async function fetchJson(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {}
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }
  if (options.token !== undefined) {
    headers.authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text.length > 0 ? (JSON.parse(text) as unknown) : undefined
  };
}
