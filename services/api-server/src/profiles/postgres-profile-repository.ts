import { randomUUID } from "node:crypto";

import type { QueryResultRow } from "pg";

import type { PostgresQueryClient } from "../postgres/postgres-client.js";
import type {
  BasicProfileInfo,
  CreateUserProfileInput,
  DeviceProfileInfo,
  RiskScreeningInfo,
  TrainingProfileInfo,
  TrainingUserProfileRecord,
  UpdateUserProfileInput,
  UserProfileArchiveStatus,
  UserProfileQuery
} from "./profile-types.js";
import type { UserProfileRepository } from "./profile-repository.js";

const USER_PROFILE_TABLE = "api_user_profiles";

interface ApiUserProfileRow extends QueryResultRow {
  id: string;
  trainee_user_id: string;
  organization_id: string | null;
  basic_info: BasicProfileInfo;
  training_info: TrainingProfileInfo;
  risk_screening: RiskScreeningInfo;
  device_info: DeviceProfileInfo;
  therapist_notes: string | null;
  status: UserProfileArchiveStatus;
  created_by_user_id: string;
  archived_by_user_id: string | null;
  archived_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface PostgresUserProfileRepositoryOptions {
  client: PostgresQueryClient;
  autoMigrate?: boolean;
}

/**
 * PostgreSQL adapter for training user profiles. Risk fields are retained only
 * for training-safety prompts and authorized trend review, not diagnosis.
 */
export class PostgresUserProfileRepository implements UserProfileRepository {
  private readonly autoMigrate: boolean;
  private readonly client: PostgresQueryClient;
  private migrationPromise: Promise<void> | null = null;

  constructor(options: PostgresUserProfileRepositoryOptions) {
    this.client = options.client;
    this.autoMigrate = options.autoMigrate ?? true;
  }

  async create(
    input: CreateUserProfileInput & { traineeUserId: string; createdByUserId: string }
  ): Promise<TrainingUserProfileRecord> {
    await this.ensureSchema();

    const result = await this.client.query<ApiUserProfileRow>(
      `
        INSERT INTO ${USER_PROFILE_TABLE} (
          id,
          trainee_user_id,
          organization_id,
          basic_info,
          training_info,
          risk_screening,
          device_info,
          therapist_notes,
          status,
          created_by_user_id
        )
        VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8, 'active', $9)
        RETURNING *
      `,
      [
        randomUUID(),
        input.traineeUserId,
        input.organizationId ?? null,
        JSON.stringify(input.basicInfo),
        JSON.stringify(input.trainingInfo),
        JSON.stringify(input.riskScreening),
        JSON.stringify(input.deviceInfo),
        input.therapistNotes ?? null,
        input.createdByUserId
      ]
    );

    return rowToTrainingUserProfile(requireSingleRow(result.rows));
  }

  async findById(profileId: string): Promise<TrainingUserProfileRecord | undefined> {
    await this.ensureSchema();
    const result = await this.client.query<ApiUserProfileRow>(
      `
        SELECT *
        FROM ${USER_PROFILE_TABLE}
        WHERE id = $1
        LIMIT 1
      `,
      [profileId]
    );
    const row = result.rows[0];
    return row === undefined ? undefined : rowToTrainingUserProfile(row);
  }

  async findMany(query: UserProfileQuery): Promise<TrainingUserProfileRecord[]> {
    await this.ensureSchema();
    const filters: string[] = [];
    const values: unknown[] = [];
    addTextFilter(filters, values, "trainee_user_id", query.traineeUserId);
    addTextFilter(filters, values, "organization_id", query.organizationId);
    addTextFilter(filters, values, "status", query.status);

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await this.client.query<ApiUserProfileRow>(
      `
        SELECT *
        FROM ${USER_PROFILE_TABLE}
        ${whereClause}
        ORDER BY created_at DESC
      `,
      values
    );

    return result.rows.map(rowToTrainingUserProfile);
  }

  async update(
    profileId: string,
    input: UpdateUserProfileInput
  ): Promise<TrainingUserProfileRecord | undefined> {
    await this.ensureSchema();

    const current = await this.findById(profileId);
    if (current === undefined) {
      return undefined;
    }

    const next = {
      basicInfo: { ...current.basicInfo, ...input.basicInfo },
      trainingInfo: { ...current.trainingInfo, ...input.trainingInfo },
      riskScreening: { ...current.riskScreening, ...input.riskScreening },
      deviceInfo: { ...current.deviceInfo, ...input.deviceInfo },
      therapistNotes:
        input.therapistNotes !== undefined ? input.therapistNotes : (current.therapistNotes ?? null)
    };

    const result = await this.client.query<ApiUserProfileRow>(
      `
        UPDATE ${USER_PROFILE_TABLE}
        SET
          basic_info = $2::jsonb,
          training_info = $3::jsonb,
          risk_screening = $4::jsonb,
          device_info = $5::jsonb,
          therapist_notes = $6,
          updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [
        profileId,
        JSON.stringify(next.basicInfo),
        JSON.stringify(next.trainingInfo),
        JSON.stringify(next.riskScreening),
        JSON.stringify(next.deviceInfo),
        next.therapistNotes
      ]
    );

    const row = result.rows[0];
    return row === undefined ? undefined : rowToTrainingUserProfile(row);
  }

  async archive(
    profileId: string,
    archivedByUserId: string
  ): Promise<TrainingUserProfileRecord | undefined> {
    await this.ensureSchema();
    const result = await this.client.query<ApiUserProfileRow>(
      `
        UPDATE ${USER_PROFILE_TABLE}
        SET
          status = 'archived',
          archived_by_user_id = $2,
          archived_at = now(),
          updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [profileId, archivedByUserId]
    );

    const row = result.rows[0];
    return row === undefined ? undefined : rowToTrainingUserProfile(row);
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
      CREATE TABLE IF NOT EXISTS ${USER_PROFILE_TABLE} (
        id TEXT PRIMARY KEY,
        trainee_user_id TEXT NOT NULL,
        organization_id TEXT,
        basic_info JSONB NOT NULL,
        training_info JSONB NOT NULL,
        risk_screening JSONB NOT NULL,
        device_info JSONB NOT NULL,
        therapist_notes TEXT,
        status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
        created_by_user_id TEXT NOT NULL,
        archived_by_user_id TEXT,
        archived_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (jsonb_typeof(basic_info) = 'object'),
        CHECK (jsonb_typeof(training_info) = 'object'),
        CHECK (jsonb_typeof(risk_screening) = 'object'),
        CHECK (jsonb_typeof(device_info) = 'object')
      )
    `);
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_user_profiles_trainee ON ${USER_PROFILE_TABLE} (trainee_user_id)`
    );
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_user_profiles_org_status ON ${USER_PROFILE_TABLE} (organization_id, status)`
    );
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_user_profiles_created_at ON ${USER_PROFILE_TABLE} (created_at DESC)`
    );
  }
}

function requireSingleRow(rows: ApiUserProfileRow[]): ApiUserProfileRow {
  const row = rows[0];
  if (row === undefined) {
    throw new Error("PostgreSQL did not return the user profile.");
  }
  return row;
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

function rowToTrainingUserProfile(row: ApiUserProfileRow): TrainingUserProfileRecord {
  const record: TrainingUserProfileRecord = {
    id: row.id,
    traineeUserId: row.trainee_user_id,
    basicInfo: cloneJson(row.basic_info),
    trainingInfo: cloneJson(row.training_info),
    riskScreening: cloneJson(row.risk_screening),
    deviceInfo: cloneJson(row.device_info),
    status: row.status,
    createdByUserId: row.created_by_user_id,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };

  if (row.organization_id !== null) {
    record.organizationId = row.organization_id;
  }
  if (row.therapist_notes !== null) {
    record.therapistNotes = row.therapist_notes;
  }
  if (row.archived_by_user_id !== null) {
    record.archivedByUserId = row.archived_by_user_id;
  }
  if (row.archived_at !== null) {
    record.archivedAt = toIsoString(row.archived_at);
  }
  return record;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
