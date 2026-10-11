import { describe, expect, it } from "vitest";

import {
  PostgresTrainingRecordRepository,
  type CreateTrainingRecordInput,
  type PostgresQueryClient,
  type PostgresQueryResult
} from "../src/index.js";

interface RecordedQuery {
  text: string;
  values: readonly unknown[];
}

class FakePostgresClient implements PostgresQueryClient {
  readonly queries: RecordedQuery[] = [];
  selectRows: Array<Record<string, unknown>> = [];

  async query(text: string, values: readonly unknown[] = []): Promise<PostgresQueryResult> {
    this.queries.push({ text, values });

    if (/INSERT INTO api_training_records/.test(text)) {
      return { rows: [rowFromInsertValues(values)] };
    }

    if (/SELECT \*/.test(text)) {
      return { rows: this.selectRows };
    }

    return { rows: [] };
  }
}

describe("PostgresTrainingRecordRepository", () => {
  it("creates a persisted training record and maps JSON summary fields", async () => {
    const client = new FakePostgresClient();
    const repository = new PostgresTrainingRecordRepository({ client });

    const created = await repository.create({
      ...baseTrainingRecordInput(),
      createdByUserId: "therapist-1"
    });

    expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(created.userId).toBe("trainee-1");
    expect(created.userProfileId).toBe("profile-1");
    expect(created.organizationId).toBe("org-1");
    expect(created.behaviorMetrics).toMatchObject({
      accuracyRate: 0.84,
      customMetrics: {
        routeAccuracy: 0.8
      }
    });
    expect(created.eegSummaryMetrics).toMatchObject({
      qualityStatus: "good",
      frameCount: 180
    });
    expect(created.abnormalEvents).toHaveLength(1);
    expect(created.createdByUserId).toBe("therapist-1");
  });

  it("applies profile and date filters in SQL while preserving repository pagination contract", async () => {
    const client = new FakePostgresClient();
    const repository = new PostgresTrainingRecordRepository({ client });

    client.selectRows = [
      rowFromInsertValues([
        "record-1",
        "trainee-1",
        "profile-1",
        "org-1",
        "attention_game",
        "2026-06-16T08:00:00.000Z",
        "2026-06-16T08:08:00.000Z",
        480,
        JSON.stringify({ accuracyRate: 0.8 }),
        JSON.stringify({ qualityStatus: "good" }),
        JSON.stringify({ initialLevel: 1, finalLevel: 2, adaptiveEnabled: true }),
        JSON.stringify([]),
        "completed",
        "therapist-1"
      ])
    ];

    const records = await repository.findMany({
      userId: "trainee-1",
      userProfileId: "profile-1",
      startedFrom: "2026-06-01T00:00:00.000Z",
      startedTo: "2026-06-30T23:59:59.999Z",
      page: 2,
      pageSize: 1
    });

    expect(records).toHaveLength(1);
    const selectQuery = client.queries.find((query) => /SELECT \*/.test(query.text));
    expect(selectQuery?.text).toContain("user_id = $1");
    expect(selectQuery?.text).toContain("user_profile_id = $2");
    expect(selectQuery?.text).toContain("started_at >= $3::timestamptz");
    expect(selectQuery?.text).toContain("started_at <= $4::timestamptz");
    expect(selectQuery?.text).not.toContain("LIMIT");
    expect(selectQuery?.values).toEqual([
      "trainee-1",
      "profile-1",
      "2026-06-01T00:00:00.000Z",
      "2026-06-30T23:59:59.999Z"
    ]);
  });

  it("runs automatic migration only once and supports disabling it", async () => {
    const autoClient = new FakePostgresClient();
    const autoRepository = new PostgresTrainingRecordRepository({ client: autoClient });

    await autoRepository.findMany({});
    await autoRepository.findMany({});

    expect(autoClient.queries.filter((query) => /CREATE TABLE/.test(query.text))).toHaveLength(1);
    expect(autoClient.queries.filter((query) => /CREATE INDEX/.test(query.text))).toHaveLength(3);

    const manualClient = new FakePostgresClient();
    const manualRepository = new PostgresTrainingRecordRepository({
      client: manualClient,
      autoMigrate: false
    });
    await manualRepository.findMany({});

    expect(manualClient.queries.some((query) => /CREATE TABLE/.test(query.text))).toBe(false);
  });
});

function baseTrainingRecordInput(
  overrides: Partial<CreateTrainingRecordInput> = {}
): CreateTrainingRecordInput {
  return {
    userId: "trainee-1",
    userProfileId: "profile-1",
    organizationId: "org-1",
    trainingType: "rhythm_navigation",
    startedAt: "2026-06-15T08:00:00.000Z",
    endedAt: "2026-06-15T08:12:00.000Z",
    durationSeconds: 720,
    behaviorMetrics: {
      totalTrials: 24,
      correctCount: 20,
      accuracyRate: 0.84,
      averageReactionTimeMs: 540,
      customMetrics: {
        routeAccuracy: 0.8
      }
    },
    eegSummaryMetrics: {
      averageAttentionIndex: 66,
      averageRelaxationIndex: 58,
      validSampleRate: 0.95,
      artifactCount: 1,
      frameCount: 180,
      qualityStatus: "good"
    },
    difficultyConfig: {
      initialLevel: 2,
      finalLevel: 3,
      adaptiveEnabled: true,
      parameters: {
        routeLength: 4
      }
    },
    abnormalEvents: [
      {
        eventType: "pause",
        occurredAt: "2026-06-15T08:06:00.000Z",
        severity: "info",
        message: "用户短暂暂停后继续。"
      }
    ],
    completionStatus: "completed",
    ...overrides
  };
}

function rowFromInsertValues(values: readonly unknown[]): Record<string, unknown> {
  const [
    id,
    userId,
    userProfileId,
    organizationId,
    trainingType,
    startedAt,
    endedAt,
    durationSeconds,
    behaviorMetrics,
    eegSummaryMetrics,
    difficultyConfig,
    abnormalEvents,
    completionStatus,
    createdByUserId
  ] = values;

  return {
    id,
    user_id: userId,
    user_profile_id: userProfileId,
    organization_id: organizationId,
    training_type: trainingType,
    started_at: new Date(String(startedAt)),
    ended_at: new Date(String(endedAt)),
    duration_seconds: durationSeconds,
    behavior_metrics: parseJsonValue(behaviorMetrics),
    eeg_summary_metrics: parseJsonValue(eegSummaryMetrics),
    difficulty_config: parseJsonValue(difficultyConfig),
    abnormal_events: parseJsonValue(abnormalEvents),
    completion_status: completionStatus,
    created_by_user_id: createdByUserId,
    created_at: new Date("2026-06-15T08:12:01.000Z")
  };
}

function parseJsonValue(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}
