import { randomUUID } from "node:crypto";

import type { QueryResultRow } from "pg";

import type { PostgresQueryClient } from "../postgres/postgres-client.js";
import type { TrainingPrescriptionRepository } from "./training-prescription-repository.js";
import type {
  TrainingPrescriptionDifficulty,
  TrainingPrescriptionDraftInput,
  TrainingPrescriptionModule,
  TrainingPrescriptionMusicType,
  TrainingPrescriptionQuery,
  TrainingPrescriptionRecord,
  TrainingPrescriptionRiskKey,
  TrainingPrescriptionStatus
} from "./training-prescription-types.js";

const PRESCRIPTION_TABLE = "api_training_prescriptions";

interface ApiTrainingPrescriptionRow extends QueryResultRow {
  id: string;
  user_id: string;
  user_profile_id: string;
  organization_id: string | null;
  therapist_user_id: string;
  weekly_session_count: number;
  session_duration_minutes: number;
  module_combination: TrainingPrescriptionModule[];
  music_type: TrainingPrescriptionMusicType;
  initial_difficulty: TrainingPrescriptionDifficulty;
  adaptive_adjustment_enabled: boolean;
  daily_max_training_minutes: number;
  risk_reminder_keys: TrainingPrescriptionRiskKey[];
  therapist_note: string;
  status: TrainingPrescriptionStatus;
  version: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface PostgresTrainingPrescriptionRepositoryOptions {
  client: PostgresQueryClient;
  autoMigrate?: boolean;
}

/**
 * PostgreSQL adapter for therapist-authored auxiliary training arrangements.
 * The records are prescriptions for training workflow configuration, not
 * clinical diagnosis or treatment guarantees.
 */
export class PostgresTrainingPrescriptionRepository implements TrainingPrescriptionRepository {
  private readonly autoMigrate: boolean;
  private readonly client: PostgresQueryClient;
  private migrationPromise: Promise<void> | null = null;

  constructor(options: PostgresTrainingPrescriptionRepositoryOptions) {
    this.client = options.client;
    this.autoMigrate = options.autoMigrate ?? true;
  }

  async upsertActive(
    input: TrainingPrescriptionDraftInput & { therapistUserId: string }
  ): Promise<TrainingPrescriptionRecord> {
    await this.ensureSchema();

    const current = await this.findActiveByUserProfileId(input.userProfileId);
    const result = await this.client.query<ApiTrainingPrescriptionRow>(
      current === undefined
        ? `
          INSERT INTO ${PRESCRIPTION_TABLE} (
            id,
            user_id,
            user_profile_id,
            organization_id,
            therapist_user_id,
            weekly_session_count,
            session_duration_minutes,
            module_combination,
            music_type,
            initial_difficulty,
            adaptive_adjustment_enabled,
            daily_max_training_minutes,
            risk_reminder_keys,
            therapist_note,
            status,
            version
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13::jsonb, $14, 'active', 1
          )
          RETURNING *
        `
        : `
          UPDATE ${PRESCRIPTION_TABLE}
          SET
            user_id = $2,
            organization_id = $4,
            therapist_user_id = $5,
            weekly_session_count = $6,
            session_duration_minutes = $7,
            module_combination = $8::jsonb,
            music_type = $9,
            initial_difficulty = $10,
            adaptive_adjustment_enabled = $11,
            daily_max_training_minutes = $12,
            risk_reminder_keys = $13::jsonb,
            therapist_note = $14,
            status = 'active',
            version = version + 1,
            updated_at = now()
          WHERE id = $1
          RETURNING *
        `,
      [
        current?.id ?? randomUUID(),
        input.userId,
        input.userProfileId,
        input.organizationId ?? null,
        input.therapistUserId,
        input.weeklySessionCount,
        input.sessionDurationMinutes,
        JSON.stringify(input.moduleCombination),
        input.musicType,
        input.initialDifficulty,
        input.adaptiveAdjustmentEnabled,
        input.dailyMaxTrainingMinutes,
        JSON.stringify(input.riskReminderKeys),
        input.therapistNote
      ]
    );

    return rowToTrainingPrescription(requireSingleRow(result.rows));
  }

  async findActiveByUserProfileId(
    userProfileId: string
  ): Promise<TrainingPrescriptionRecord | undefined> {
    await this.ensureSchema();
    const result = await this.client.query<ApiTrainingPrescriptionRow>(
      `
        SELECT *
        FROM ${PRESCRIPTION_TABLE}
        WHERE user_profile_id = $1 AND status = 'active'
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [userProfileId]
    );
    const row = result.rows[0];
    return row === undefined ? undefined : rowToTrainingPrescription(row);
  }

  async findById(id: string): Promise<TrainingPrescriptionRecord | undefined> {
    await this.ensureSchema();
    const result = await this.client.query<ApiTrainingPrescriptionRow>(
      `
        SELECT *
        FROM ${PRESCRIPTION_TABLE}
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );
    const row = result.rows[0];
    return row === undefined ? undefined : rowToTrainingPrescription(row);
  }

  async findMany(query: TrainingPrescriptionQuery): Promise<TrainingPrescriptionRecord[]> {
    await this.ensureSchema();
    const filters: string[] = [];
    const values: unknown[] = [];
    addTextFilter(filters, values, "user_id", query.userId);
    addTextFilter(filters, values, "user_profile_id", query.userProfileId);
    addTextFilter(filters, values, "organization_id", query.organizationId);
    addTextFilter(filters, values, "status", query.status);

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await this.client.query<ApiTrainingPrescriptionRow>(
      `
        SELECT *
        FROM ${PRESCRIPTION_TABLE}
        ${whereClause}
        ORDER BY updated_at DESC
      `,
      values
    );

    return result.rows.map(rowToTrainingPrescription);
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
      CREATE TABLE IF NOT EXISTS ${PRESCRIPTION_TABLE} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_profile_id TEXT NOT NULL,
        organization_id TEXT,
        therapist_user_id TEXT NOT NULL,
        weekly_session_count INTEGER NOT NULL CHECK (weekly_session_count BETWEEN 1 AND 5),
        session_duration_minutes INTEGER NOT NULL CHECK (session_duration_minutes BETWEEN 5 AND 30),
        module_combination JSONB NOT NULL,
        music_type TEXT NOT NULL CHECK (
          music_type IN ('focus', 'relax', 'rhythm', 'nature', 'white_noise', 'custom')
        ),
        initial_difficulty TEXT NOT NULL CHECK (
          initial_difficulty IN ('light', 'standard', 'advanced')
        ),
        adaptive_adjustment_enabled BOOLEAN NOT NULL,
        daily_max_training_minutes INTEGER NOT NULL CHECK (daily_max_training_minutes BETWEEN 10 AND 45),
        risk_reminder_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
        therapist_note TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
        version INTEGER NOT NULL CHECK (version >= 1),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (jsonb_typeof(module_combination) = 'array'),
        CHECK (jsonb_typeof(risk_reminder_keys) = 'array')
      )
    `);
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_training_prescriptions_profile_status ON ${PRESCRIPTION_TABLE} (user_profile_id, status, updated_at DESC)`
    );
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_training_prescriptions_org_updated ON ${PRESCRIPTION_TABLE} (organization_id, updated_at DESC)`
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

function requireSingleRow(rows: ApiTrainingPrescriptionRow[]): ApiTrainingPrescriptionRow {
  const row = rows[0];
  if (row === undefined) {
    throw new Error("PostgreSQL did not return the training prescription.");
  }
  return row;
}

function rowToTrainingPrescription(row: ApiTrainingPrescriptionRow): TrainingPrescriptionRecord {
  const record: TrainingPrescriptionRecord = {
    id: row.id,
    userId: row.user_id,
    userProfileId: row.user_profile_id,
    weeklySessionCount: Number(row.weekly_session_count),
    sessionDurationMinutes: Number(row.session_duration_minutes),
    moduleCombination: cloneJson(row.module_combination),
    musicType: row.music_type,
    initialDifficulty: row.initial_difficulty,
    adaptiveAdjustmentEnabled: row.adaptive_adjustment_enabled,
    dailyMaxTrainingMinutes: Number(row.daily_max_training_minutes),
    riskReminderKeys: cloneJson(row.risk_reminder_keys),
    therapistNote: row.therapist_note,
    therapistUserId: row.therapist_user_id,
    status: row.status,
    version: Number(row.version),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
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
