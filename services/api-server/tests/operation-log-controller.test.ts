import { describe, expect, it } from "vitest";

import {
  AccessControlService,
  InMemoryAuthRepository,
  InMemoryOperationLogRepository,
  OperationLogController,
  OperationLogService,
  OPERATION_LOG_EVENT_TYPES,
  type AuthenticatedPrincipal,
  type OperationLogApiResponse,
  type OperationLogEventType,
  type OperationLogListResult
} from "../src/index.js";

interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

function createOperationLogFixture() {
  const authRepository = new InMemoryAuthRepository();
  const accessControl = new AccessControlService(authRepository);
  const repository = new InMemoryOperationLogRepository();
  const service = new OperationLogService({ repository, accessControl });
  const controller = new OperationLogController(service);

  return { controller, repository, service };
}

function expectLogList(
  response: OperationLogApiResponse<OperationLogListResult | ErrorBody>,
  expectedStatus = 200
): OperationLogListResult {
  expect(response.status).toBe(expectedStatus);
  if ("error" in response.body) {
    throw new Error(`Expected operation log list, received ${response.body.error.code}`);
  }
  return response.body;
}

function expectError(
  response: OperationLogApiResponse<OperationLogListResult | ErrorBody>,
  expectedStatus: number,
  expectedCode: string
): void {
  expect(response.status).toBe(expectedStatus);
  if (!("error" in response.body)) {
    throw new Error("Expected error response.");
  }
  expect(response.body.error.code).toBe(expectedCode);
}

describe("OperationLogController", () => {
  it("records all supported operation types with actor, target, time, IP, and device info", async () => {
    const { controller, service } = createOperationLogFixture();
    const systemAdmin: AuthenticatedPrincipal = {
      userId: "system-admin-1",
      roles: ["system_admin"]
    };

    for (const [index, operationType] of OPERATION_LOG_EVENT_TYPES.entries()) {
      await service.recordOperation({
        operationType,
        actorUserId: index === 0 ? "trainee-1" : "therapist-1",
        actorRoles: index === 0 ? ["trainee"] : ["therapist"],
        target: {
          targetType: targetTypeFor(operationType),
          targetId: `target-${index}`,
          targetUserProfileId: "profile-1",
          organizationId: "org-1"
        },
        occurredAt: `2026-06-16T08:${String(index).padStart(2, "0")}:00.000Z`,
        ipAddress: "192.0.2.10",
        deviceInfo: "Chrome on Windows",
        details: {
          source: "unit-test"
        }
      });
    }

    const result = expectLogList(
      await controller.listOperationLogs({
        principal: systemAdmin,
        params: {},
        body: undefined,
        query: {
          occurredFrom: "2026-06-16T08:00:00.000Z",
          occurredTo: "2026-06-16T08:30:00.000Z",
          page: 1,
          pageSize: 20
        }
      })
    );

    expect(result.pagination.totalItems).toBe(OPERATION_LOG_EVENT_TYPES.length);
    expect(new Set(result.logs.map((log) => log.operationType))).toEqual(
      new Set(OPERATION_LOG_EVENT_TYPES)
    );
    expect(result.logs[0]).toMatchObject({
      actorUserId: "therapist-1",
      ipAddress: "192.0.2.10",
      deviceInfo: "Chrome on Windows",
      target: {
        targetUserProfileId: "profile-1",
        organizationId: "org-1"
      }
    });
  });

  it("allows organization administrators to query by time and user within their organization", async () => {
    const { controller, service } = createOperationLogFixture();
    const orgAdmin: AuthenticatedPrincipal = {
      userId: "org-admin-1",
      roles: ["org_admin"],
      organizationId: "org-1"
    };

    await service.recordOperation({
      operationType: "profile.view_detail",
      actorUserId: "therapist-1",
      actorRoles: ["therapist"],
      target: {
        targetType: "user_profile",
        targetId: "profile-1",
        targetUserProfileId: "profile-1",
        organizationId: "org-1"
      },
      occurredAt: "2026-06-16T09:00:00.000Z",
      ipAddress: "198.51.100.8",
      deviceInfo: "Therapist web"
    });
    await service.recordOperation({
      operationType: "report.generate",
      actorUserId: "therapist-2",
      actorRoles: ["therapist"],
      target: {
        targetType: "report",
        targetId: "report-2",
        targetUserProfileId: "profile-2",
        organizationId: "org-2"
      },
      occurredAt: "2026-06-16T09:05:00.000Z",
      ipAddress: "198.51.100.9",
      deviceInfo: "Therapist web"
    });

    const ownOrgResult = expectLogList(
      await controller.listOperationLogs({
        principal: orgAdmin,
        params: {},
        body: undefined,
        query: {
          actorUserId: "therapist-1",
          occurredFrom: "2026-06-16T08:30:00.000Z",
          occurredTo: "2026-06-16T09:30:00.000Z",
          page: 1,
          pageSize: 10
        }
      })
    );
    expect(ownOrgResult.logs).toHaveLength(1);
    expect(ownOrgResult.logs[0]?.operationType).toBe("profile.view_detail");

    expectError(
      await controller.listOperationLogs({
        principal: orgAdmin,
        params: {},
        body: undefined,
        query: {
          organizationId: "org-2"
        }
      }),
      403,
      "SENSITIVE_DATA_SCOPE_DENIED"
    );
  });

  it("prevents ordinary users from querying or modifying operation logs", async () => {
    const { controller, repository, service } = createOperationLogFixture();
    const trainee: AuthenticatedPrincipal = {
      userId: "trainee-1",
      roles: ["trainee"],
      organizationId: "org-1",
      userProfileId: "profile-1"
    };

    await service.recordOperation({
      operationType: "training.abnormal_pause",
      actorUserId: "trainee-1",
      actorRoles: ["trainee"],
      target: {
        targetType: "training_session",
        targetId: "session-1",
        targetUserProfileId: "profile-1",
        organizationId: "org-1"
      },
      occurredAt: "2026-06-16T10:00:00.000Z",
      ipAddress: "203.0.113.10",
      deviceInfo: "User web"
    });

    expectError(
      await controller.listOperationLogs({
        principal: trainee,
        params: {},
        body: undefined,
        query: {}
      }),
      403,
      "PERMISSION_DENIED"
    );

    expect("update" in repository).toBe(false);
    expect("delete" in repository).toBe(false);
    expect("updateOperationLog" in controller).toBe(false);
    expect("deleteOperationLog" in controller).toBe(false);
  });
});

function targetTypeFor(operationType: OperationLogEventType) {
  switch (operationType) {
    case "auth.login":
      return "account";
    case "profile.view_detail":
      return "user_profile";
    case "training_prescription.update":
      return "training_prescription";
    case "training_data.export":
      return "data_export";
    case "report.generate":
      return "report";
    case "record.delete":
    case "record.archive":
      return "training_record";
    case "permission.update":
      return "permission";
    case "training.abnormal_pause":
      return "training_session";
  }
}
