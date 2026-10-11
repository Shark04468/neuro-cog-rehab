import { randomUUID } from "node:crypto";

import type { UserRole } from "@neuro-cog-rehab/shared-types";
import type { QueryResultRow } from "pg";

import type { PostgresQueryClient } from "../postgres/postgres-client.js";
import type { JsonObject } from "../training-records/training-record-types.js";
import type { OperationLogRepository } from "./operation-log-repository.js";
import type {
  CreateOperationLogInput,
  OperationLogEventType,
  OperationLogQuery,
  OperationLogRecord,
  OperationLogTarget,
  OperationTargetType
} from "./operation-log-types.js";

const OPERATION_LOG_TABLE = "api_operation_logs";

interface ApiOperationLogRow extends QueryResultRow {
  id: string;
  operation_type: OperationLogEventType;
  actor_user_id: string;
  actor_roles: UserRole[];
  target: OperationLogTarget;
  target_type: OperationTargetType;
  target_id: string | null;
  target_user_profile_id: string | null;
  organization_id: string | null;
  occurred_at: Date | string;
  recorded_at: Date | string;
  ip_address: string | null;
  device_info: string | null;
  details: JsonObject | null;
}

export interface PostgresOperationLogRepositoryOptions {
  client: PostgresQueryClient;
  autoMigrate?: boolean;
}

/**
 * Append-only PostgreSQL repository for operational audit records. The records
 * contain operational metadata only; raw EEG frames and diagnosis terms are out
 * of scope for this log.
 */
export class PostgresOperationLogRepository implements OperationLogRepository {
  private readonly autoMigrate: boolean;
  private readonly client: PostgresQueryClient;
  private migrationPromise: Promise<void> | null = null;

  constructor(options: PostgresOperationLogRepositoryOptions) {
    this.client = options.client;
    this.autoMigrate = options.autoMigrate ?? true;
  }

  async append(input: CreateOperationLogInput): Promise<OperationLogRecord> {
    await this.ensureSchema();

    const result = await this.client.query<ApiOperationLogRow>(
      `
        INSERT INTO ${OPERATION_LOG_TABLE} (
          id,
          operation_type,
          actor_user_id,
          actor_roles,
          target,
          target_type,
          target_id,
          target_user_profile_id,
          organization_id,
          occurred_at,
          ip_address,
          device_info,
          details
        )
        VALUES (
          $1,
          $2,
          $3,
          $4::jsonb,
          $5::jsonb,
          $6,
          $7,
          $8,
          $9,
          $10::timestamptz,
          $11,
          $12,
          $13::jsonb
        )
        RETURNING *
      `,
      [
        randomUUID(),
        input.operationType,
        input.actorUserId,
        JSON.stringify(input.actorRoles),
        JSON.stringify(input.target),
        input.target.targetType,
        input.target.targetId ?? null,
        input.target.targetUserProfileId ?? null,
        input.target.organizationId ?? null,
        input.occurredAt ?? new Date().toISOString(),
        input.ipAddress ?? null,
        input.deviceInfo ?? null,
        input.details === undefined ? null : JSON.stringify(input.details)
      ]
    );

    return rowToOperationLog(requireSingleRow(result.rows));
  }

  async findMany(query: OperationLogQuery): Promise<OperationLogRecord[]> {
    await this.ensureSchema();

    const filters: string[] = [];
    const values: unknown[] = [];
    addTextFilter(filters, values, "actor_user_id", query.actorUserId);
    addTextFilter(filters, values, "operation_type", query.operationType);
    addTextFilter(filters, values, "target_user_profile_id", query.targetUserProfileId);
    addTextFilter(filters, values, "organization_id", query.organizationId);
    addTimestampLowerBound(filters, values, "occurred_at", query.occurredFrom);
    addTimestampUpperBound(filters, values, "occurred_at", query.occurredTo);

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await this.client.query<ApiOperationLogRow>(
      `
        SELECT *
        FROM ${OPERATION_LOG_TABLE}
        ${whereClause}
        ORDER BY occurred_at DESC, recorded_at DESC
      `,
      values
    );

    return result.rows.map(rowToOperationLog);
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
      CREATE TABLE IF NOT EXISTS ${OPERATION_LOG_TABLE} (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL CHECK (
          operation_type IN (
            'auth.login',
            'profile.view_detail',
            'training_prescription.update',
            'training_data.export',
            'report.generate',
            'record.delete',
            'record.archive',
            'permission.update',
            'training.abnormal_pause'
          )
        ),
        actor_user_id TEXT NOT NULL,
        actor_roles JSONB NOT NULL,
        target JSONB NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT,
        target_user_profile_id TEXT,
        organization_id TEXT,
        occurred_at TIMESTAMPTZ NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        ip_address TEXT,
        device_info TEXT,
        details JSONB,
        CHECK (jsonb_typeof(actor_roles) = 'array'),
        CHECK (jsonb_typeof(target) = 'object')
      )
    `);
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_operation_logs_actor_time ON ${OPERATION_LOG_TABLE} (actor_user_id, occurred_at DESC)`
    );
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_operation_logs_org_time ON ${OPERATION_LOG_TABLE} (organization_id, occurred_at DESC)`
    );
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_operation_logs_profile_time ON ${OPERATION_LOG_TABLE} (target_user_profile_id, occurred_at DESC)`
    );
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_operation_logs_type_time ON ${OPERATION_LOG_TABLE} (operation_type, occurred_at DESC)`
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

function requireSingleRow(rows: ApiOperationLogRow[]): ApiOperationLogRow {
  const row = rows[0];
  if (row === undefined) {
    throw new Error("PostgreSQL did not return the operation log.");
  }
  return row;
}

function rowToOperationLog(row: ApiOperationLogRow): OperationLogRecord {
  const log: OperationLogRecord = {
    id: row.id,
    operationType: row.operation_type,
    actorUserId: row.actor_user_id,
    actorRoles: cloneJson(row.actor_roles),
    target: cloneJson(row.target),
    occurredAt: toIsoString(row.occurred_at),
    recordedAt: toIsoString(row.recorded_at)
  };
  if (row.ip_address !== null) {
    log.ipAddress = row.ip_address;
  }
  if (row.device_info !== null) {
    log.deviceInfo = row.device_info;
  }
  if (row.details !== null) {
    log.details = cloneJson(row.details);
  }
  return log;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
