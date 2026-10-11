import { describe, expect, it } from "vitest";

import {
  AccessControlService,
  InMemoryAuthRepository,
  InMemoryTrainingDataExportAuditRepository,
  InMemoryTrainingRecordRepository,
  InMemoryUserProfileRepository,
  TrainingDataExportController,
  TrainingDataExportService,
  type AuthenticatedPrincipal,
  type CreateUserProfileInput,
  type TrainingDataExportApiResponse,
  type TrainingDataExportAuditLog,
  type TrainingDataExportResult
} from "../src/index.js";

interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

function createExportFixture() {
  const authRepository = new InMemoryAuthRepository();
  const accessControl = new AccessControlService(authRepository);
  const trainingRecordRepository = new InMemoryTrainingRecordRepository();
  const userProfileRepository = new InMemoryUserProfileRepository();
  const auditRepository = new InMemoryTrainingDataExportAuditRepository();
  const service = new TrainingDataExportService({
    trainingRecordRepository,
    userProfileRepository,
    accessControl,
    auditRepository,
    anonymizationSalt: "test-export-salt"
  });
  const controller = new TrainingDataExportController(service);

  return {
    accessControl,
    auditRepository,
    controller,
    trainingRecordRepository,
    userProfileRepository
  };
}

function profileInput(overrides: Partial<CreateUserProfileInput> = {}): CreateUserProfileInput {
  return {
    traineeUserId: "trainee-1",
    organizationId: "org-1",
    basicInfo: {
      nickname: "小林",
      ageBand: "11_13",
      gender: "prefer_not_to_say",
      trainingGoals: ["提升任务坚持"]
    },
    trainingInfo: {
      attentionDifficultyManifestations: ["容易分心"],
      impulseControlManifestations: ["偶尔抢先点击"],
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
      eegDeviceModel: "demo-headband",
      eegConnectionType: "simulator"
    },
    therapistNotes: "仅用于治疗师内部训练安排。",
    ...overrides
  };
}

function expectExport(
  response: TrainingDataExportApiResponse<TrainingDataExportResult | ErrorBody>
): TrainingDataExportResult {
  expect(response.status).toBe(200);
  if ("error" in response.body) {
    throw new Error(`Expected export response, received ${response.body.error.code}`);
  }
  return response.body;
}

function expectError(
  response: TrainingDataExportApiResponse<TrainingDataExportResult | ErrorBody>,
  expectedStatus: number,
  expectedCode: string
): void {
  expect(response.status).toBe(expectedStatus);
  if (!("error" in response.body)) {
    throw new Error("Expected error response.");
  }
  expect(response.body.error.code).toBe(expectedCode);
}

async function expectAuditLogs(
  auditRepository: InMemoryTrainingDataExportAuditRepository
): Promise<TrainingDataExportAuditLog[]> {
  const logs = await auditRepository.findMany();
  expect(logs.length).toBeGreaterThan(0);
  return logs;
}

describe("TrainingDataExportController", () => {
  it("exports deidentified training summaries for a bound therapist", async () => {
    const {
      accessControl,
      auditRepository,
      controller,
      trainingRecordRepository,
      userProfileRepository
    } = createExportFixture();
    const profile = await userProfileRepository.create({
      ...profileInput(),
      traineeUserId: "trainee-1",
      createdByUserId: "therapist-1"
    });
    await accessControl.registerProfileOwner(profile.id, "trainee-1", "org-1");
    await accessControl.bindTherapistToProfile(profile.id, "therapist-1");

    await trainingRecordRepository.create({
      userId: "trainee-1",
      userProfileId: profile.id,
      organizationId: "org-1",
      trainingType: "music_therapy",
      startedAt: "2026-06-16T08:00:00.000Z",
      endedAt: "2026-06-16T08:10:00.000Z",
      durationSeconds: 600,
      behaviorMetrics: {
        totalTrials: 20,
        correctCount: 17,
        accuracyRate: 0.85,
        averageReactionTimeMs: 540,
        customMetrics: {
          musicTags: ["focus", "nature"],
          rawEegData: [1, 2, 3],
          contactEmail: "private@example.com"
        }
      },
      eegSummaryMetrics: {
        averageAttentionIndex: 61,
        averageRelaxationIndex: 58,
        validSampleRate: 0.97,
        artifactCount: 1,
        frameCount: 120,
        qualityStatus: "good"
      },
      difficultyConfig: {
        initialLevel: 2,
        finalLevel: 2,
        adaptiveEnabled: false,
        parameters: {
          stimulusIntervalMs: 900,
          userProfileId: profile.id
        }
      },
      abnormalEvents: [],
      completionStatus: "completed",
      createdByUserId: "system-admin-1"
    });

    const therapist: AuthenticatedPrincipal = {
      userId: "therapist-1",
      roles: ["therapist"],
      organizationId: "org-1"
    };
    const result = expectExport(
      await controller.exportDeidentifiedTrainingData({
        principal: therapist,
        params: {},
        body: undefined,
        query: {
          userProfileId: profile.id,
          startedFrom: "2026-06-16T00:00:00.000Z",
          startedTo: "2026-06-17T00:00:00.000Z",
          reason: "weekly trend review"
        }
      })
    );

    expect(result.rowCount).toBe(1);
    expect(result.rows[0]).toMatchObject({
      ageBand: "11_13",
      trainingCount: 1,
      musicTags: ["focus", "nature"],
      timestamp: "2026-06-16T08:00:00.000Z"
    });
    expect(result.rows[0]?.anonymousUserId).toMatch(/^anon_[a-f0-9]{24}$/);
    expect(result.rows[0]?.behaviorMetrics.customMetrics).toEqual({
      musicTags: ["focus", "nature"]
    });
    expect(result.rows[0]?.gameDifficulty.parameters).toEqual({
      stimulusIntervalMs: 900
    });

    const exportedText = JSON.stringify(result);
    expect(exportedText).not.toContain("trainee-1");
    expect(exportedText).not.toContain(profile.id);
    expect(exportedText).not.toContain("小林");
    expect(exportedText).not.toContain("private@example.com");
    expect(exportedText).not.toContain("rawEegData");

    const logs = await expectAuditLogs(auditRepository);
    expect(logs[0]).toMatchObject({
      actorUserId: "therapist-1",
      status: "success",
      exportedRowCount: 1,
      reason: "weekly trend review",
      targetProfileIds: [profile.id]
    });
  });

  it("rejects parent export attempts and records a denied audit log", async () => {
    const { auditRepository, controller } = createExportFixture();
    const parent: AuthenticatedPrincipal = {
      userId: "parent-1",
      roles: ["parent"]
    };

    expectError(
      await controller.exportDeidentifiedTrainingData({
        principal: parent,
        params: {},
        body: undefined,
        query: {
          userProfileId: "profile-1",
          reason: "not allowed"
        }
      }),
      403,
      "PERMISSION_DENIED"
    );

    const logs = await expectAuditLogs(auditRepository);
    expect(logs[0]).toMatchObject({
      actorUserId: "parent-1",
      status: "denied",
      exportedRowCount: 0,
      targetProfileIds: ["profile-1"],
      denialCode: "PERMISSION_DENIED"
    });
  });

  it("limits organization administrator exports to visible organization records", async () => {
    const { accessControl, controller, trainingRecordRepository, userProfileRepository } =
      createExportFixture();
    const ownOrgProfile = await userProfileRepository.create({
      ...profileInput(),
      traineeUserId: "trainee-1",
      organizationId: "org-1",
      createdByUserId: "org-admin-1"
    });
    const otherOrgProfile = await userProfileRepository.create({
      ...profileInput({
        traineeUserId: "trainee-2",
        organizationId: "org-2",
        basicInfo: {
          nickname: "小周",
          ageBand: "14_16",
          trainingGoals: ["保持训练节奏"]
        }
      }),
      traineeUserId: "trainee-2",
      createdByUserId: "org-admin-2"
    });
    await accessControl.registerProfileOwner(ownOrgProfile.id, "trainee-1", "org-1");
    await accessControl.registerProfileOwner(otherOrgProfile.id, "trainee-2", "org-2");

    for (const [profileId, userId, organizationId] of [
      [ownOrgProfile.id, "trainee-1", "org-1"],
      [otherOrgProfile.id, "trainee-2", "org-2"]
    ] as const) {
      await trainingRecordRepository.create({
        userId,
        userProfileId: profileId,
        organizationId,
        trainingType: "attention_game",
        startedAt: "2026-06-16T09:00:00.000Z",
        endedAt: "2026-06-16T09:08:00.000Z",
        durationSeconds: 480,
        behaviorMetrics: { accuracyRate: 0.8 },
        eegSummaryMetrics: { averageAttentionIndex: 60 },
        difficultyConfig: {
          initialLevel: 1,
          finalLevel: 2,
          adaptiveEnabled: true
        },
        abnormalEvents: [],
        completionStatus: "completed",
        createdByUserId: "system-admin-1"
      });
    }

    const orgAdmin: AuthenticatedPrincipal = {
      userId: "org-admin-1",
      roles: ["org_admin"],
      organizationId: "org-1"
    };
    const result = expectExport(
      await controller.exportDeidentifiedTrainingData({
        principal: orgAdmin,
        params: {},
        body: undefined,
        query: {
          startedFrom: "2026-06-16T00:00:00.000Z",
          startedTo: "2026-06-17T00:00:00.000Z"
        }
      })
    );

    expect(result.rowCount).toBe(1);
    expect(result.rows[0]?.ageBand).toBe("11_13");
    expect(JSON.stringify(result)).not.toContain("trainee-2");
    expect(JSON.stringify(result)).not.toContain(otherOrgProfile.id);
  });
});
