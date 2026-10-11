import { describe, expect, it } from "vitest";

import {
  PostgresAuthRepository,
  PostgresOperationLogRepository,
  PostgresTrainingDataExportAuditRepository,
  PostgresUserProfileRepository,
  type PostgresQueryClient,
  type PostgresQueryResult
} from "../src/index.js";

interface RecordedQuery {
  text: string;
  values: readonly unknown[];
}

class FakePostgresClient implements PostgresQueryClient {
  readonly queries: RecordedQuery[] = [];
  userRows: Array<Record<string, unknown>> = [];
  sessionRows: Array<Record<string, unknown>> = [];
  revokedTokenRows: Array<Record<string, unknown>> = [];
  profileAccessRows: Array<Record<string, unknown>> = [];
  profileRows: Array<Record<string, unknown>> = [];
  operationLogRows: Array<Record<string, unknown>> = [];
  exportAuditRows: Array<Record<string, unknown>> = [];

  async query(text: string, values: readonly unknown[] = []): Promise<PostgresQueryResult> {
    this.queries.push({ text, values });

    if (/INSERT INTO api_auth_users/.test(text)) {
      return { rows: [authUserRowFromValues(values)] };
    }
    if (/SELECT \*\s+FROM api_auth_users/.test(text)) {
      return { rows: this.userRows };
    }
    if (/INSERT INTO api_auth_sessions/.test(text)) {
      return { rows: [authSessionRowFromValues(values)] };
    }
    if (/SELECT \*\s+FROM api_auth_sessions/.test(text)) {
      return { rows: this.sessionRows };
    }
    if (/UPDATE api_auth_sessions/.test(text)) {
      return { rows: this.sessionRows };
    }
    if (/SELECT token_id\s+FROM api_auth_revoked_tokens/.test(text)) {
      return { rows: this.revokedTokenRows };
    }
    if (/SELECT \*\s+FROM api_profile_access/.test(text)) {
      return { rows: this.profileAccessRows };
    }
    if (/INSERT INTO api_user_profiles/.test(text)) {
      return { rows: [profileRowFromCreateValues(values)] };
    }
    if (/SELECT \*\s+FROM api_user_profiles/.test(text)) {
      return { rows: this.profileRows };
    }
    if (/UPDATE api_user_profiles/.test(text) && /status = 'archived'/.test(text)) {
      return { rows: [archivedProfileRowFromValues(values)] };
    }
    if (/UPDATE api_user_profiles/.test(text)) {
      return { rows: [updatedProfileRowFromValues(values)] };
    }
    if (/INSERT INTO api_operation_logs/.test(text)) {
      return { rows: [operationLogRowFromValues(values)] };
    }
    if (/SELECT \*\s+FROM api_operation_logs/.test(text)) {
      return { rows: this.operationLogRows };
    }
    if (/INSERT INTO api_training_data_export_audit_logs/.test(text)) {
      return { rows: [exportAuditRowFromValues(values)] };
    }
    if (/SELECT \*\s+FROM api_training_data_export_audit_logs/.test(text)) {
      return { rows: this.exportAuditRows };
    }

    return { rows: [] };
  }
}

describe("PostgresAuthRepository", () => {
  it("persists account sessions and profile access without changing auth contracts", async () => {
    const client = new FakePostgresClient();
    const repository = new PostgresAuthRepository({ client });

    const user = await repository.createUser({
      email: "therapist@example.test",
      displayName: "Therapist",
      passwordHash: "hash",
      roles: ["therapist"],
      status: "active",
      organizationId: "org-1"
    });

    expect(user.id).toMatch(uuidPattern);
    expect(user.email).toBe("therapist@example.test");
    expect(user.roles).toEqual(["therapist"]);
    expect(user.organizationId).toBe("org-1");

    client.userRows = [authUserRowFromValues(["user-1", "therapist@example.test"])];
    await expect(repository.findUserByEmail("therapist@example.test")).resolves.toMatchObject({
      id: "user-1",
      email: "therapist@example.test"
    });

    client.sessionRows = [
      authSessionRowFromValues([
        "session-1",
        "user-1",
        "refresh-1",
        "access-1",
        false,
        "2026-06-30T10:00:00.000Z"
      ])
    ];
    await repository.revokeSessionByRefreshTokenId("refresh-1");
    expect(
      client.queries.filter((query) => /INSERT INTO api_auth_revoked_tokens/.test(query.text))
    ).toHaveLength(2);

    await repository.upsertProfileAccess({
      userProfileId: "profile-1",
      organizationId: "org-1",
      traineeUserId: "trainee-1",
      parentUserIds: ["parent-1"],
      therapistUserIds: ["therapist-1"]
    });
    client.profileAccessRows = [
      {
        user_profile_id: "profile-1",
        organization_id: "org-1",
        trainee_user_id: "trainee-1",
        parent_user_ids: ["parent-1"],
        therapist_user_ids: ["therapist-1"]
      }
    ];

    await expect(repository.findProfileAccess("profile-1")).resolves.toEqual({
      userProfileId: "profile-1",
      organizationId: "org-1",
      traineeUserId: "trainee-1",
      parentUserIds: ["parent-1"],
      therapistUserIds: ["therapist-1"]
    });
  });
});

describe("PostgresUserProfileRepository", () => {
  it("persists profile safety and training fields as scoped JSON summaries", async () => {
    const client = new FakePostgresClient();
    const repository = new PostgresUserProfileRepository({ client });

    const created = await repository.create(baseProfileInput());

    expect(created.id).toMatch(uuidPattern);
    expect(created.basicInfo.nickname).toBe("Trainee A");
    expect(created.riskScreening.guardianConsentStatus).toBe("granted");
    expect(created.therapistNotes).toBe("Use short training blocks.");

    client.profileRows = [profileRowFromCreateValues([created.id])];
    const updated = await repository.update(created.id, {
      basicInfo: { nickname: "Trainee B" },
      therapistNotes: "Review fatigue trend before sessions."
    });

    expect(updated?.basicInfo.nickname).toBe("Trainee B");
    expect(updated?.therapistNotes).toContain("fatigue trend");

    const archived = await repository.archive(created.id, "therapist-1");
    expect(archived?.status).toBe("archived");
    expect(archived?.archivedByUserId).toBe("therapist-1");

    client.profileRows = [profileRowFromCreateValues(["profile-1"])];
    const profiles = await repository.findMany({
      traineeUserId: "trainee-1",
      organizationId: "org-1",
      status: "active"
    });
    expect(profiles).toHaveLength(1);

    const selectQuery = client.queries.find(
      (query) =>
        /SELECT \*\s+FROM api_user_profiles/.test(query.text) &&
        query.text.includes("trainee_user_id = $1")
    );
    expect(selectQuery?.text).toContain("organization_id = $2");
    expect(selectQuery?.text).toContain("status = $3");
    expect(selectQuery?.values).toEqual(["trainee-1", "org-1", "active"]);
  });
});

describe("PostgresOperationLogRepository", () => {
  it("stores append-only operation logs and builds scoped filters", async () => {
    const client = new FakePostgresClient();
    const repository = new PostgresOperationLogRepository({ client });

    const created = await repository.append({
      operationType: "profile.view_detail",
      actorUserId: "therapist-1",
      actorRoles: ["therapist"],
      target: {
        targetType: "user_profile",
        targetId: "profile-1",
        targetUserProfileId: "profile-1",
        organizationId: "org-1"
      },
      occurredAt: "2026-06-30T08:00:00.000Z",
      ipAddress: "127.0.0.1",
      details: { adapter: "node_http" }
    });

    expect(created.operationType).toBe("profile.view_detail");
    expect(created.target.targetUserProfileId).toBe("profile-1");
    expect(created.details).toEqual({ adapter: "node_http" });

    client.operationLogRows = [operationLogRowFromValues(operationLogInsertValues())];
    const logs = await repository.findMany({
      actorUserId: "therapist-1",
      operationType: "profile.view_detail",
      targetUserProfileId: "profile-1",
      organizationId: "org-1",
      occurredFrom: "2026-06-01T00:00:00.000Z",
      occurredTo: "2026-06-30T23:59:59.999Z"
    });

    expect(logs).toHaveLength(1);
    const selectQuery = client.queries.find((query) =>
      /SELECT \*\s+FROM api_operation_logs/.test(query.text)
    );
    expect(selectQuery?.text).toContain("actor_user_id = $1");
    expect(selectQuery?.text).toContain("operation_type = $2");
    expect(selectQuery?.text).toContain("target_user_profile_id = $3");
    expect(selectQuery?.text).toContain("organization_id = $4");
    expect(selectQuery?.text).toContain("occurred_at >= $5::timestamptz");
    expect(selectQuery?.text).toContain("occurred_at <= $6::timestamptz");
  });
});

describe("PostgresTrainingDataExportAuditRepository", () => {
  it("persists deidentified export audit attempts", async () => {
    const client = new FakePostgresClient();
    const repository = new PostgresTrainingDataExportAuditRepository({ client });

    const created = await repository.append({
      actorUserId: "therapist-1",
      actorRoles: ["therapist"],
      status: "success",
      reason: "review trend export",
      query: { userProfileId: "profile-1", reason: "review trend export" },
      exportedRowCount: 2,
      targetProfileIds: ["profile-1"]
    });

    expect(created.id).toMatch(uuidPattern);
    expect(created.targetProfileIds).toEqual(["profile-1"]);
    expect(created.query.userProfileId).toBe("profile-1");

    client.exportAuditRows = [exportAuditRowFromValues(exportAuditInsertValues())];
    await expect(repository.findMany()).resolves.toHaveLength(1);
  });
});

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function authUserRowFromValues(values: readonly unknown[]): Record<string, unknown> {
  const [
    id = "user-1",
    email = "therapist@example.test",
    phone = null,
    displayName = "Therapist",
    passwordHash = "hash",
    roles = JSON.stringify(["therapist"]),
    status = "active",
    organizationId = "org-1",
    userProfileId = null
  ] = values;

  return {
    id,
    email,
    phone,
    display_name: displayName,
    password_hash: passwordHash,
    roles: parseJsonValue(roles),
    status,
    organization_id: organizationId,
    user_profile_id: userProfileId,
    created_at: new Date("2026-06-30T08:00:00.000Z"),
    updated_at: new Date("2026-06-30T08:00:00.000Z")
  };
}

function authSessionRowFromValues(values: readonly unknown[]): Record<string, unknown> {
  const [
    id = "session-1",
    userId = "user-1",
    refreshTokenId = "refresh-1",
    accessTokenId = "access-1",
    isRevoked = false,
    expiresAt = "2026-06-30T10:00:00.000Z"
  ] = values;

  return {
    id,
    user_id: userId,
    refresh_token_id: refreshTokenId,
    access_token_id: accessTokenId,
    is_revoked: isRevoked,
    created_at: new Date("2026-06-30T08:00:00.000Z"),
    expires_at: new Date(String(expiresAt))
  };
}

function baseProfileInput() {
  return {
    traineeUserId: "trainee-1",
    organizationId: "org-1",
    basicInfo: {
      nickname: "Trainee A",
      ageBand: "11_13" as const,
      trainingGoals: ["sustain attention"]
    },
    trainingInfo: {
      attentionDifficultyManifestations: ["needs prompting"],
      impulseControlManifestations: ["responds quickly"],
      taskPersistenceLevel: "variable" as const
    },
    riskScreening: {
      photosensitivityRisk: false,
      seizureHistoryNotice: false,
      severeHeadache: false,
      significantDizziness: false,
      guardianConsentStatus: "granted" as const
    },
    deviceInfo: {
      eegDeviceBound: false,
      eegConnectionType: "none" as const
    },
    therapistNotes: "Use short training blocks.",
    createdByUserId: "therapist-1"
  };
}

function profileRowFromCreateValues(values: readonly unknown[]): Record<string, unknown> {
  const input = baseProfileInput();
  const [
    id = "profile-1",
    traineeUserId = input.traineeUserId,
    organizationId = input.organizationId,
    basicInfo = JSON.stringify(input.basicInfo),
    trainingInfo = JSON.stringify(input.trainingInfo),
    riskScreening = JSON.stringify(input.riskScreening),
    deviceInfo = JSON.stringify(input.deviceInfo),
    therapistNotes = input.therapistNotes,
    createdByUserId = input.createdByUserId
  ] = values;

  return {
    id,
    trainee_user_id: traineeUserId,
    organization_id: organizationId,
    basic_info: parseJsonValue(basicInfo),
    training_info: parseJsonValue(trainingInfo),
    risk_screening: parseJsonValue(riskScreening),
    device_info: parseJsonValue(deviceInfo),
    therapist_notes: therapistNotes,
    status: "active",
    created_by_user_id: createdByUserId,
    archived_by_user_id: null,
    archived_at: null,
    created_at: new Date("2026-06-30T08:00:00.000Z"),
    updated_at: new Date("2026-06-30T08:00:00.000Z")
  };
}

function updatedProfileRowFromValues(values: readonly unknown[]): Record<string, unknown> {
  const [, basicInfo, trainingInfo, riskScreening, deviceInfo, therapistNotes] = values;
  return {
    ...profileRowFromCreateValues(["profile-1"]),
    basic_info: parseJsonValue(basicInfo),
    training_info: parseJsonValue(trainingInfo),
    risk_screening: parseJsonValue(riskScreening),
    device_info: parseJsonValue(deviceInfo),
    therapist_notes: therapistNotes,
    updated_at: new Date("2026-06-30T08:05:00.000Z")
  };
}

function archivedProfileRowFromValues(values: readonly unknown[]): Record<string, unknown> {
  const [, archivedByUserId] = values;
  return {
    ...profileRowFromCreateValues(["profile-1"]),
    status: "archived",
    archived_by_user_id: archivedByUserId,
    archived_at: new Date("2026-06-30T08:10:00.000Z"),
    updated_at: new Date("2026-06-30T08:10:00.000Z")
  };
}

function operationLogInsertValues(): readonly unknown[] {
  return [
    "log-1",
    "profile.view_detail",
    "therapist-1",
    JSON.stringify(["therapist"]),
    JSON.stringify({
      targetType: "user_profile",
      targetId: "profile-1",
      targetUserProfileId: "profile-1",
      organizationId: "org-1"
    }),
    "user_profile",
    "profile-1",
    "profile-1",
    "org-1",
    "2026-06-30T08:00:00.000Z",
    "127.0.0.1",
    "vitest",
    JSON.stringify({ adapter: "node_http" })
  ];
}

function operationLogRowFromValues(values: readonly unknown[]): Record<string, unknown> {
  const [
    id,
    operationType,
    actorUserId,
    actorRoles,
    target,
    targetType,
    targetId,
    targetUserProfileId,
    organizationId,
    occurredAt,
    ipAddress,
    deviceInfo,
    details
  ] = values;

  return {
    id,
    operation_type: operationType,
    actor_user_id: actorUserId,
    actor_roles: parseJsonValue(actorRoles),
    target: parseJsonValue(target),
    target_type: targetType,
    target_id: targetId,
    target_user_profile_id: targetUserProfileId,
    organization_id: organizationId,
    occurred_at: new Date(String(occurredAt)),
    recorded_at: new Date("2026-06-30T08:00:01.000Z"),
    ip_address: ipAddress,
    device_info: deviceInfo,
    details: parseJsonValue(details)
  };
}

function exportAuditInsertValues(): readonly unknown[] {
  return [
    "export-1",
    "therapist-1",
    JSON.stringify(["therapist"]),
    "success",
    "review trend export",
    JSON.stringify({ userProfileId: "profile-1", reason: "review trend export" }),
    2,
    JSON.stringify(["profile-1"]),
    null,
    null
  ];
}

function exportAuditRowFromValues(values: readonly unknown[]): Record<string, unknown> {
  const [
    id,
    actorUserId,
    actorRoles,
    status,
    reason,
    query,
    exportedRowCount,
    targetProfileIds,
    denialCode,
    denialMessage
  ] = values;

  return {
    id,
    actor_user_id: actorUserId,
    actor_roles: parseJsonValue(actorRoles),
    status,
    reason,
    requested_at: new Date("2026-06-30T08:00:00.000Z"),
    query: parseJsonValue(query),
    exported_row_count: exportedRowCount,
    target_profile_ids: parseJsonValue(targetProfileIds),
    denial_code: denialCode,
    denial_message: denialMessage
  };
}

function parseJsonValue(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}
