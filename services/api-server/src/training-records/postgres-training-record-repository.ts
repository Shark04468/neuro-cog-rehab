import { randomUUID } from "node:crypto";

import type { QueryResultRow } from "pg";

import type { PostgresQueryClient } from "../postgres/postgres-client.js";
import type {
  BehaviorMetrics,
  CreateTrainingRecordInput,
  DifficultyConfigSnapshot,
  EegSummaryMetrics,
  TrainingAbnormalEvent,
  TrainingCompletionStatus,
  TrainingRecord,
  TrainingRecordQuery,
  TrainingRecordType
} from "./training-record-types.js";
import type { TrainingRecordRepository } from "./training-record-repository.js";

const TRAINING_RECORD_TABLE = "api_training_records";

interface ApiTrainingRecordRow extends QueryResultRow {
  id: string;
  user_id: string;
  user_profile_id: string;
  organization_id: string | null;
  training_type: TrainingRecordType;
  started_at: Date | string;
  ended_at: Date | string;
  duration_seconds: number;
  behavior_metrics: BehaviorMetrics;
  eeg_summary_metrics: EegSummaryMetrics;
  difficulty_config: DifficultyConfigSnapshot;
  abnormal_events: TrainingAbnormalEvent[];
  completion_status: TrainingCompletionStatus;
  created_by_user_id: string;
  created_at: Date | string;
}

export interface PostgresTrainingRecordRepositoryOptions {
  client: PostgresQueryClient;
  autoMigrate?: boolean;
}

/**
 * PostgreSQL adapter for the current unified training-record API payload.
 * The table stores summary JSON only; raw EEG frames are intentionally excluded.
 */
export class PostgresTrainingRecordRepository implements TrainingRecordRepository {
  private readonly autoMigrate: boolean;
  private readonly client: PostgresQueryClient;
  private migrationPromise: Promise<void> | null = null;

  constructor(options: PostgresTrainingRecordRepositoryOptions) {
    this.client = options.client;
    this.autoMigrate = options.autoMigrate ?? true;
  }

  async create(
    input: CreateTrainingRecordInput & { createdByUserId: string }
  ): Promise<TrainingRecord> {
    await this.ensureSchema();

    const result = await this.client.query<ApiTrainingRecordRow>(
      `
        INSERT INTO ${TRAINING_RECORD_TABLE} (
          id,
          user_id,
          user_profile_id,
          organization_id,
          training_type,
          started_at,
          ended_at,
          duration_seconds,
          behavior_metrics,
          eeg_summary_metrics,
          difficulty_config,
          abnormal_events,
          completion_status,
          created_by_user_id
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6::timestamptz,
          $7::timestamptz,
          $8,
          $9::jsonb,
          $10::jsonb,
          $11::jsonb,
          $12::jsonb,
          $13,
          $14
        )
        RETURNING *
      `,
      [
        randomUUID(),
        input.userId,
        input.userProfileId,
        input.organizationId ?? null,
        input.trainingType,
        input.startedAt,
        input.endedAt,
        input.durationSeconds,
        JSON.stringify(input.behaviorMetrics),
        JSON.stringify(input.eegSummaryMetrics),
        JSON.stringify(input.difficultyConfig),
        JSON.stringify(input.abnormalEvents),
        input.completionStatus,
        input.createdByUserId
      ]
    );

    return rowToTrainingRecord(requireSingleRow(result.rows));
  }

  async findMany(query: TrainingRecordQuery): Promise<TrainingRecord[]> {
    await this.ensureSchema();

    const filters: string[] = [];
    const values: unknown[] = [];
    addTextFilter(filters, values, "user_id", query.userId);
    addTextFilter(filters, values, "user_profile_id", query.userProfileId);
    addTimestampLowerBound(filters, values, "started_at", query.startedFrom);
    addTimestampUpperBound(filters, values, "started_at", query.startedTo);

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await this.client.query<ApiTrainingRecordRow>(
      `
        SELECT *
        FROM ${TRAINING_RECORD_TABLE}
        ${whereClause}
        ORDER BY started_at DESC, created_at DESC
      `,
      values
    );

    return result.rows.map(rowToTrainingRecord);
  }

  private async ensureSchema(): Promise<void> {
    if (!this.autoMigrate) {
      return;
    }

    this.migrationPromise ??= this.runMigration();
    await this.migrationPromise;
  }

  private async runMigration(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS ${TRAINING_RECORD_TABLE} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_profile_id TEXT NOT NULL,
        organization_id TEXT,
        training_type TEXT NOT NULL CHECK (
          training_type IN (
            'baseline_assessment',
            'music_therapy',
            'attention_game',
            'go_nogo_game',
            'rhythm_navigation',
            'mixed_session'
          )
        ),
        started_at TIMESTAMPTZ NOT NULL,
        ended_at TIMESTAMPTZ NOT NULL,
        duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
        behavior_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
        eeg_summary_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
        difficulty_config JSONB NOT NULL DEFAULT '{}'::jsonb,
        abnormal_events JSONB NOT NULL DEFAULT '[]'::jsonb,
        completion_status TEXT NOT NULL CHECK (
          completion_status IN ('completed', 'partial', 'abandoned', 'interrupted')
        ),
        created_by_user_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_training_records_profile_time ON ${TRAINING_RECORD_TABLE} (user_profile_id, started_at DESC)`
    );
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_training_records_user_time ON ${TRAINING_RECORD_TABLE} (user_id, started_at DESC)`
    );
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_training_records_org_time ON ${TRAINING_RECORD_TABLE} (organization_id, started_at DESC)`
    );
  }
}

function addTextFilter(
  filters: string[],
  values: unknown[],
  columnName: string,
  value: string | undefined
): void {
  if (value === undefined) {
    return;
  }
  values.push(value);
  filters.push(`${columnName} = $${values.length}`);
}

function addTimestampLowerBound(
  filters: string[],
  values: unknown[],
  columnName: string,
  value: string | undefined
): void {
  if (value === undefined) {
    return;
  }
  values.push(value);
  filters.push(`${columnName} >= $${values.length}::timestamptz`);
}

function addTimestampUpperBound(
  filters: string[],
  values: unknown[],
  columnName: string,
  value: string | undefined
): void {
  if (value === undefined) {
    return;
  }
  values.push(value);
  filters.push(`${columnName} <= $${values.length}::timestamptz`);
}

function requireSingleRow(rows: ApiTrainingRecordRow[]): ApiTrainingRecordRow {
  const row = rows[0];
  if (row === undefined) {
    throw new Error("PostgreSQL did not return the created training record.");
  }
  return row;
}

function rowToTrainingRecord(row: ApiTrainingRecordRow): TrainingRecord {
  const record: TrainingRecord = {
    id: row.id,
    userId: row.user_id,
    userProfileId: row.user_profile_id,
    trainingType: row.training_type,
    startedAt: toIsoString(row.started_at),
    endedAt: toIsoString(row.ended_at),
    durationSeconds: Number(row.duration_seconds),
    behaviorMetrics: cloneJson(row.behavior_metrics),
    eegSummaryMetrics: cloneJson(row.eeg_summary_metrics),
    difficultyConfig: cloneJson(row.difficulty_config),
    abnormalEvents: cloneJson(row.abnormal_events),
    completionStatus: row.completion_status,
    createdByUserId: row.created_by_user_id,
    createdAt: toIsoString(row.created_at)
  };

  if (row.organization_id !== null) {
    record.organizationId = row.organization_id;
  }

  return record;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
