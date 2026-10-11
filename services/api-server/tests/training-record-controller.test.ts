import { describe, expect, it } from "vitest";

import {
  AccessControlService,
  InMemoryAuthRepository,
  InMemoryTrainingRecordRepository,
  TrainingRecordController,
  TrainingRecordService,
  type AuthenticatedPrincipal,
  type CreateTrainingRecordInput,
  type TrainingRecord,
  type TrainingRecordApiResponse,
  type TrainingRecordListResult
} from "../src/index.js";

interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

function createTrainingRecordFixture() {
  const authRepository = new InMemoryAuthRepository();
  const accessControl = new AccessControlService(authRepository);
  const trainingRecordRepository = new InMemoryTrainingRecordRepository();
  const service = new TrainingRecordService({
    repository: trainingRecordRepository,
    accessControl
  });
  const controller = new TrainingRecordController(service);

  return { accessControl, controller };
}

function baseTrainingRecordInput(
  overrides: Partial<CreateTrainingRecordInput> = {}
): CreateTrainingRecordInput {
  return {
    userId: "trainee-1",
    userProfileId: "profile-1",
    organizationId: "org-1",
    trainingType: "attention_game",
    startedAt: "2026-06-15T08:00:00.000Z",
    endedAt: "2026-06-15T08:10:00.000Z",
    durationSeconds: 600,
    behaviorMetrics: {
      totalTrials: 40,
      correctCount: 32,
      accuracyRate: 0.8,
      averageReactionTimeMs: 520,
      omissionCount: 3,
      customMetrics: {
        focusStabilityScore: 74
      }
    },
    eegSummaryMetrics: {
      averageAttentionIndex: 58,
      averageRelaxationIndex: 62,
      validSampleRate: 0.96,
      artifactCount: 2,
      frameCount: 120,
      qualityStatus: "good"
    },
    difficultyConfig: {
      initialLevel: 2,
      finalLevel: 3,
      adaptiveEnabled: true,
      parameters: {
        distractorDensity: 0.35
      }
    },
    abnormalEvents: [
      {
        eventType: "pause",
        occurredAt: "2026-06-15T08:05:00.000Z",
        severity: "info",
        message: "User paused once during the task block."
      }
    ],
    completionStatus: "completed",
    ...overrides
  };
}

function expectRecord(
  response: TrainingRecordApiResponse<TrainingRecord | ErrorBody>,
  expectedStatus: number
): TrainingRecord {
  expect(response.status).toBe(expectedStatus);
  if ("error" in response.body) {
    throw new Error(`Expected training record response, received ${response.body.error.code}`);
  }
  return response.body;
}

function expectRecordList(
  response: TrainingRecordApiResponse<TrainingRecordListResult | ErrorBody>,
  expectedStatus: number
): TrainingRecordListResult {
  expect(response.status).toBe(expectedStatus);
  if ("error" in response.body) {
    throw new Error(`Expected training record list response, received ${response.body.error.code}`);
  }
  return response.body;
}

function expectError(
  response: TrainingRecordApiResponse<TrainingRecord | TrainingRecordListResult | ErrorBody>,
  expectedStatus: number,
  expectedCode: string
): void {
  expect(response.status).toBe(expectedStatus);
  if (!("error" in response.body)) {
    throw new Error("Expected error response.");
  }
  expect(response.body.error.code).toBe(expectedCode);
}

describe("TrainingRecordController", () => {
  it("creates a complete training record for a trainee's own profile", async () => {
    const { controller } = createTrainingRecordFixture();
    const trainee: AuthenticatedPrincipal = {
      userId: "trainee-1",
      roles: ["trainee"],
      organizationId: "org-1",
      userProfileId: "profile-1"
    };

    const created = expectRecord(
      await controller.createTrainingRecord({
        principal: trainee,
        params: {},
        query: {},
        body: baseTrainingRecordInput()
      }),
      201
    );

    expect(created.userId).toBe("trainee-1");
    expect(created.trainingType).toBe("attention_game");
    expect(created.durationSeconds).toBe(600);
    expect(created.behaviorMetrics.accuracyRate).toBe(0.8);
    expect(created.eegSummaryMetrics.qualityStatus).toBe("good");
    expect(created.difficultyConfig.adaptiveEnabled).toBe(true);
    expect(created.abnormalEvents).toHaveLength(1);
    expect(created.completionStatus).toBe("completed");
  });

  it("queries training history by user, date range, and pagination", async () => {
    const { accessControl, controller } = createTrainingRecordFixture();
    const parent: AuthenticatedPrincipal = { userId: "parent-1", roles: ["parent"] };
    const systemAdmin: AuthenticatedPrincipal = {
      userId: "system-admin-1",
      roles: ["system_admin"]
    };
    await accessControl.registerProfileOwner("profile-1", "trainee-1", "org-1");
    await accessControl.bindParentToProfile("profile-1", "parent-1");

    for (const [index, startedAt] of [
      "2026-06-01T08:00:00.000Z",
      "2026-06-03T08:00:00.000Z",
      "2026-06-05T08:00:00.000Z"
    ].entries()) {
      await controller.createTrainingRecord({
        principal: systemAdmin,
        params: {},
        query: {},
        body: baseTrainingRecordInput({
          startedAt,
          endedAt: startedAt.replace("08:00:00", "08:08:00"),
          durationSeconds: 480,
          completionStatus: index === 0 ? "partial" : "completed"
        })
      });
    }

    const firstPage = expectRecordList(
      await controller.listTrainingRecords({
        principal: parent,
        params: {},
        body: undefined,
        query: {
          userId: "trainee-1",
          startedFrom: "2026-06-02T00:00:00.000Z",
          startedTo: "2026-06-06T00:00:00.000Z",
          page: 1,
          pageSize: 1
        }
      }),
      200
    );
    expect(firstPage.pagination.totalItems).toBe(2);
    expect(firstPage.pagination.totalPages).toBe(2);
    expect(firstPage.records[0]?.startedAt).toBe("2026-06-05T08:00:00.000Z");

    const secondPage = expectRecordList(
      await controller.listTrainingRecords({
        principal: parent,
        params: {},
        body: undefined,
        query: {
          userId: "trainee-1",
          startedFrom: "2026-06-02T00:00:00.000Z",
          startedTo: "2026-06-06T00:00:00.000Z",
          page: 2,
          pageSize: 1
        }
      }),
      200
    );
    expect(secondPage.records[0]?.startedAt).toBe("2026-06-03T08:00:00.000Z");
  });

  it("allows therapists to view only bound trainee records", async () => {
    const { accessControl, controller } = createTrainingRecordFixture();
    const systemAdmin: AuthenticatedPrincipal = {
      userId: "system-admin-1",
      roles: ["system_admin"]
    };
    const boundTherapist: AuthenticatedPrincipal = {
      userId: "therapist-1",
      roles: ["therapist"],
      organizationId: "org-1"
    };
    const unboundTherapist: AuthenticatedPrincipal = {
      userId: "therapist-2",
      roles: ["therapist"],
      organizationId: "org-1"
    };
    await accessControl.registerProfileOwner("profile-1", "trainee-1", "org-1");
    await accessControl.bindTherapistToProfile("profile-1", "therapist-1");

    await controller.createTrainingRecord({
      principal: systemAdmin,
      params: {},
      query: {},
      body: baseTrainingRecordInput({
        trainingType: "go_nogo_game"
      })
    });

    const boundResult = expectRecordList(
      await controller.listTrainingRecords({
        principal: boundTherapist,
        params: {},
        body: undefined,
        query: {
          userProfileId: "profile-1",
          page: 1,
          pageSize: 10
        }
      }),
      200
    );
    expect(boundResult.records).toHaveLength(1);
    expect(boundResult.records[0]?.trainingType).toBe("go_nogo_game");

    const unboundResult = expectRecordList(
      await controller.listTrainingRecords({
        principal: unboundTherapist,
        params: {},
        body: undefined,
        query: {
          userProfileId: "profile-1",
          page: 1,
          pageSize: 10
        }
      }),
      200
    );
    expect(unboundResult.records).toHaveLength(0);
  });

  it("rejects parent-created training records and invalid date ranges", async () => {
    const { controller } = createTrainingRecordFixture();
    const parent: AuthenticatedPrincipal = { userId: "parent-1", roles: ["parent"] };
    const systemAdmin: AuthenticatedPrincipal = {
      userId: "system-admin-1",
      roles: ["system_admin"]
    };

    expectError(
      await controller.createTrainingRecord({
        principal: parent,
        params: {},
        query: {},
        body: baseTrainingRecordInput()
      }),
      403,
      "SENSITIVE_DATA_SCOPE_DENIED"
    );

    expectError(
      await controller.createTrainingRecord({
        principal: systemAdmin,
        params: {},
        query: {},
        body: baseTrainingRecordInput({
          startedAt: "2026-06-15T09:00:00.000Z",
          endedAt: "2026-06-15T08:00:00.000Z"
        })
      }),
      400,
      "VALIDATION_ERROR"
    );
  });
});
