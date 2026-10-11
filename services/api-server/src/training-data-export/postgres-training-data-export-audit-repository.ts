import { randomUUID } from "node:crypto";

import type { QueryResultRow } from "pg";

import type { PostgresQueryClient } from "../postgres/postgres-client.js";
import type { TrainingDataExportAuditRepository } from "./training-data-export-audit-repository.js";
import type {
  ExportAuditStatus,
  TrainingDataExportAuditLog,
  TrainingDataExportQuery
} from "./training-data-export-types.js";

const EXPORT_AUDIT_TABLE = "api_training_data_export_audit_logs";

interface ApiTrainingDataExportAuditRow extends QueryResultRow {
  id: string;
  actor_user_id: string;
  actor_roles: string[];
  status: ExportAuditStatus;
  reason: string;
  requested_at: Date | string;
  query: TrainingDataExportQuery;
  exported_row_count: number;
  target_profile_ids: string[];
  denial_code: string | null;
  denial_message: string | null;
}

export interface PostgresTrainingDataExportAuditRepositoryOptions {
  client: PostgresQueryClient;
  autoMigrate?: boolean;
}

/**
 * Append-only PostgreSQL audit repository for deidentified training data export
 * attempts. It records export intent and result, not raw EEG or direct identity fields.
 */
export class PostgresTrainingDataExportAuditRepository implements TrainingDataExportAuditRepository {
  private readonly autoMigrate: boolean;
  private readonly client: PostgresQueryClient;
  private migrationPromise: Promise<void> | null = null;

  constructor(options: PostgresTrainingDataExportAuditRepositoryOptions) {
    this.client = options.client;
    this.autoMigrate = options.autoMigrate ?? true;
  }

  async append(
    input: Omit<TrainingDataExportAuditLog, "id" | "requestedAt">
  ): Promise<TrainingDataExportAuditLog> {
    await this.ensureSchema();

    const result = await this.client.query<ApiTrainingDataExportAuditRow>(
      `
        INSERT INTO ${EXPORT_AUDIT_TABLE} (
          id,
          actor_user_id,
          actor_roles,
          status,
          reason,
          query,
          exported_row_count,
          target_profile_ids,
          denial_code,
          denial_message
        )
        VALUES ($1, $2, $3::jsonb, $4, $5, $6::jsonb, $7, $8::jsonb, $9, $10)
        RETURNING *
      `,
      [
        randomUUID(),
        input.actorUserId,
        JSON.stringify(input.actorRoles),
        input.status,
        input.reason,
        JSON.stringify(input.query),
        input.exportedRowCount,
        JSON.stringify(input.targetProfileIds),
        input.denialCode ?? null,
        input.denialMessage ?? null
      ]
    );

    return rowToExportAuditLog(requireSingleRow(result.rows));
  }

  async findMany(): Promise<TrainingDataExportAuditLog[]> {
    await this.ensureSchema();
    const result = await this.client.query<ApiTrainingDataExportAuditRow>(
      `
        SELECT *
        FROM ${EXPORT_AUDIT_TABLE}
        ORDER BY requested_at DESC
      `
    );
    return result.rows.map(rowToExportAuditLog);
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
      CREATE TABLE IF NOT EXISTS ${EXPORT_AUDIT_TABLE} (
        id TEXT PRIMARY KEY,
        actor_user_id TEXT NOT NULL,
        actor_roles JSONB NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('success', 'denied')),
        reason TEXT NOT NULL,
        requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        query JSONB NOT NULL,
        exported_row_count INTEGER NOT NULL CHECK (exported_row_count >= 0),
        target_profile_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        denial_code TEXT,
        denial_message TEXT,
        CHECK (jsonb_typeof(actor_roles) = 'array'),
        CHECK (jsonb_typeof(query) = 'object'),
        CHECK (jsonb_typeof(target_profile_ids) = 'array')
      )
    `);
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_training_data_export_audit_actor_time ON ${EXPORT_AUDIT_TABLE} (actor_user_id, requested_at DESC)`
    );
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_training_data_export_audit_status_time ON ${EXPORT_AUDIT_TABLE} (status, requested_at DESC)`
    );
  }
}

function requireSingleRow(rows: ApiTrainingDataExportAuditRow[]): ApiTrainingDataExportAuditRow {
  const row = rows[0];
  if (row === undefined) {
    throw new Error("PostgreSQL did not return the export audit log.");
  }
  return row;
}

function rowToExportAuditLog(row: ApiTrainingDataExportAuditRow): TrainingDataExportAuditLog {
  const log: TrainingDataExportAuditLog = {
    id: row.id,
    actorUserId: row.actor_user_id,
    actorRoles: cloneJson(row.actor_roles),
    status: row.status,
    reason: row.reason,
    requestedAt: toIsoString(row.requested_at),
    query: cloneJson(row.query),
    exportedRowCount: Number(row.exported_row_count),
    targetProfileIds: cloneJson(row.target_profile_ids)
  };
  if (row.denial_code !== null) {
    log.denialCode = row.denial_code;
  }
  if (row.denial_message !== null) {
    log.denialMessage = row.denial_message;
  }
  return log;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
