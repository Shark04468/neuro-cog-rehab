import type { TrainingReportMetricSummary, RiskAlert } from "@neuro-cog-rehab/shared-types";
import type { QueryResultRow } from "pg";

import type { PostgresQueryClient } from "../postgres/postgres-client.js";
import type { ReportRepository } from "./report-repository.js";
import type {
  CreateReportInput,
  ReportAudience,
  ReportQuery,
  ReportRecord,
  ReportType
} from "./report-types.js";

const REPORT_TABLE = "api_training_reports";

interface ApiTrainingReportRow extends QueryResultRow {
  id: string;
  user_id: string;
  user_profile_id: string;
  therapist_user_id: string | null;
  organization_id: string | null;
  report_type: ReportType;
  audience: ReportAudience;
  period_start: Date | string;
  period_end: Date | string;
  generated_at: Date | string;
  generated_by_user_id: string;
  session_count: number;
  completed_session_count: number;
  average_completion_rate: number;
  metric_summaries: TrainingReportMetricSummary[];
  risk_alerts: RiskAlert[];
  narrative_summary: string;
  next_training_focus: string[];
  data_scope_notice: string;
  html_content: string | null;
  pdf_file_name: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface PostgresReportRepositoryOptions {
  client: PostgresQueryClient;
  autoMigrate?: boolean;
}

/**
 * PostgreSQL adapter for generated training reports. Reports remain trend and
 * training-record summaries; they do not store clinical conclusions.
 */
export class PostgresReportRepository implements ReportRepository {
  private readonly autoMigrate: boolean;
  private readonly client: PostgresQueryClient;
  private migrationPromise: Promise<void> | null = null;

  constructor(options: PostgresReportRepositoryOptions) {
    this.client = options.client;
    this.autoMigrate = options.autoMigrate ?? true;
  }

  async create(input: CreateReportInput & { generatedByUserId: string }): Promise<ReportRecord> {
    await this.ensureSchema();
    const result = await this.client.query<ApiTrainingReportRow>(
      `
        INSERT INTO ${REPORT_TABLE} (
          id,
          user_id,
          user_profile_id,
          therapist_user_id,
          organization_id,
          report_type,
          audience,
          period_start,
          period_end,
          generated_at,
          generated_by_user_id,
          session_count,
          completed_session_count,
          average_completion_rate,
          metric_summaries,
          risk_alerts,
          narrative_summary,
          next_training_focus,
          data_scope_notice,
          html_content,
          pdf_file_name
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, $10::timestamptz,
          $11, $12, $13, $14, $15::jsonb, $16::jsonb, $17, $18::jsonb, $19, $20, $21
        )
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          user_profile_id = EXCLUDED.user_profile_id,
          therapist_user_id = EXCLUDED.therapist_user_id,
          organization_id = EXCLUDED.organization_id,
          report_type = EXCLUDED.report_type,
          audience = EXCLUDED.audience,
          period_start = EXCLUDED.period_start,
          period_end = EXCLUDED.period_end,
          generated_at = EXCLUDED.generated_at,
          generated_by_user_id = EXCLUDED.generated_by_user_id,
          session_count = EXCLUDED.session_count,
          completed_session_count = EXCLUDED.completed_session_count,
          average_completion_rate = EXCLUDED.average_completion_rate,
          metric_summaries = EXCLUDED.metric_summaries,
          risk_alerts = EXCLUDED.risk_alerts,
          narrative_summary = EXCLUDED.narrative_summary,
          next_training_focus = EXCLUDED.next_training_focus,
          data_scope_notice = EXCLUDED.data_scope_notice,
          html_content = EXCLUDED.html_content,
          pdf_file_name = EXCLUDED.pdf_file_name,
          updated_at = now()
        RETURNING *
      `,
      [
        input.id,
        input.userId,
        input.userProfileId,
        input.therapistUserId ?? null,
        input.organizationId ?? null,
        input.reportType,
        input.audience,
        input.periodStart,
        input.periodEnd,
        input.generatedAt,
        input.generatedByUserId,
        input.sessionCount,
        input.completedSessionCount,
        input.averageCompletionRate,
        JSON.stringify(input.metricSummaries),
        JSON.stringify(input.riskAlerts),
        input.narrativeSummary,
        JSON.stringify(input.nextTrainingFocus),
        input.dataScopeNotice,
        input.htmlContent ?? null,
        input.pdfFileName ?? null
      ]
    );
    return rowToReportRecord(requireSingleRow(result.rows));
  }

  async findById(id: string): Promise<ReportRecord | undefined> {
    await this.ensureSchema();
    const result = await this.client.query<ApiTrainingReportRow>(
      `
        SELECT *
        FROM ${REPORT_TABLE}
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );
    const row = result.rows[0];
    return row === undefined ? undefined : rowToReportRecord(row);
  }

  async findMany(query: ReportQuery): Promise<ReportRecord[]> {
    await this.ensureSchema();
    const filters: string[] = [];
    const values: unknown[] = [];
    addTextFilter(filters, values, "user_id", query.userId);
    addTextFilter(filters, values, "user_profile_id", query.userProfileId);
    addTextFilter(filters, values, "organization_id", query.organizationId);
    addTextFilter(filters, values, "report_type", query.reportType);
    addTextFilter(filters, values, "audience", query.audience);
    addTimestampLowerBound(filters, values, "period_end", query.periodFrom);
    addTimestampUpperBound(filters, values, "period_end", query.periodTo);

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await this.client.query<ApiTrainingReportRow>(
      `
        SELECT *
        FROM ${REPORT_TABLE}
        ${whereClause}
        ORDER BY generated_at DESC, created_at DESC
      `,
      values
    );
    return result.rows.map(rowToReportRecord);
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
      CREATE TABLE IF NOT EXISTS ${REPORT_TABLE} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_profile_id TEXT NOT NULL,
        therapist_user_id TEXT,
        organization_id TEXT,
        report_type TEXT NOT NULL CHECK (report_type IN ('single_session', 'weekly')),
        audience TEXT NOT NULL CHECK (audience IN ('therapist', 'parent')),
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        generated_at TIMESTAMPTZ NOT NULL,
        generated_by_user_id TEXT NOT NULL,
        session_count INTEGER NOT NULL CHECK (session_count >= 0),
        completed_session_count INTEGER NOT NULL CHECK (completed_session_count >= 0),
        average_completion_rate DOUBLE PRECISION NOT NULL CHECK (
          average_completion_rate >= 0 AND average_completion_rate <= 1
        ),
        metric_summaries JSONB NOT NULL DEFAULT '[]'::jsonb,
        risk_alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
        narrative_summary TEXT NOT NULL,
        next_training_focus JSONB NOT NULL DEFAULT '[]'::jsonb,
        data_scope_notice TEXT NOT NULL,
        html_content TEXT,
        pdf_file_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (jsonb_typeof(metric_summaries) = 'array'),
        CHECK (jsonb_typeof(risk_alerts) = 'array'),
        CHECK (jsonb_typeof(next_training_focus) = 'array')
      )
    `);
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_training_reports_profile_generated ON ${REPORT_TABLE} (user_profile_id, generated_at DESC)`
    );
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_training_reports_org_generated ON ${REPORT_TABLE} (organization_id, generated_at DESC)`
    );
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_training_reports_type_audience ON ${REPORT_TABLE} (report_type, audience, generated_at DESC)`
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

function requireSingleRow(rows: ApiTrainingReportRow[]): ApiTrainingReportRow {
  const row = rows[0];
  if (row === undefined) {
    throw new Error("PostgreSQL did not return the training report.");
  }
  return row;
}

function rowToReportRecord(row: ApiTrainingReportRow): ReportRecord {
  const record: ReportRecord = {
    id: row.id,
    userId: row.user_id,
    userProfileId: row.user_profile_id,
    reportType: row.report_type,
    audience: row.audience,
    periodStart: toIsoString(row.period_start),
    periodEnd: toIsoString(row.period_end),
    generatedAt: toIsoString(row.generated_at),
    generatedByUserId: row.generated_by_user_id,
    sessionCount: Number(row.session_count),
    completedSessionCount: Number(row.completed_session_count),
    averageCompletionRate: Number(row.average_completion_rate),
    metricSummaries: cloneJson(row.metric_summaries),
    riskAlerts: cloneJson(row.risk_alerts),
    narrativeSummary: row.narrative_summary,
    nextTrainingFocus: cloneJson(row.next_training_focus),
    dataScopeNotice: row.data_scope_notice,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
  if (row.therapist_user_id !== null) {
    record.therapistUserId = row.therapist_user_id;
  }
  if (row.organization_id !== null) {
    record.organizationId = row.organization_id;
  }
  if (row.html_content !== null) {
    record.htmlContent = row.html_content;
  }
  if (row.pdf_file_name !== null) {
    record.pdfFileName = row.pdf_file_name;
  }
  return record;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
