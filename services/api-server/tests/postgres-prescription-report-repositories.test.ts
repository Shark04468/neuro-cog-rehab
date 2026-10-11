import { describe, expect, it } from "vitest";

import {
  PostgresReportRepository,
  PostgresTrainingPrescriptionRepository,
  type CreateReportInput,
  type PostgresQueryClient,
  type PostgresQueryResult,
  type TrainingPrescriptionDraftInput
} from "../src/index.js";

interface RecordedQuery {
  text: string;
  values: readonly unknown[];
}

class FakePostgresClient implements PostgresQueryClient {
  readonly queries: RecordedQuery[] = [];
  prescriptionRows: Array<Record<string, unknown>> = [];
  reportRows: Array<Record<string, unknown>> = [];

  async query(text: string, values: readonly unknown[] = []): Promise<PostgresQueryResult> {
    this.queries.push({ text, values });

    if (/INSERT INTO api_training_prescriptions/.test(text)) {
      return { rows: [prescriptionRowFromValues(values)] };
    }
    if (/UPDATE api_training_prescriptions/.test(text)) {
      return { rows: [prescriptionRowFromValues(values, 2)] };
    }
    if (/SELECT \*\s+FROM api_training_prescriptions/.test(text)) {
      return { rows: this.prescriptionRows };
    }
    if (/INSERT INTO api_training_reports/.test(text)) {
      return { rows: [reportRowFromValues(values)] };
    }
    if (/SELECT \*\s+FROM api_training_reports/.test(text)) {
      return { rows: this.reportRows };
    }

    return { rows: [] };
  }
}

describe("PostgresTrainingPrescriptionRepository", () => {
  it("persists therapist training arrangements and maps JSON fields", async () => {
    const client = new FakePostgresClient();
    const repository = new PostgresTrainingPrescriptionRepository({ client });

    const created = await repository.upsertActive({
      ...basePrescriptionInput(),
      therapistUserId: "therapist-1"
    });

    expect(created.id).toMatch(uuidPattern);
    expect(created.userProfileId).toBe("profile-1");
    expect(created.moduleCombination).toEqual(["music_therapy", "attention_game"]);
    expect(created.riskReminderKeys).toEqual(["signal_unstable", "fatigue_rising"]);
    expect(created.version).toBe(1);
    expect(created.status).toBe("active");
  });

  it("builds scoped prescription filters and supports disabling migration", async () => {
    const client = new FakePostgresClient();
    const repository = new PostgresTrainingPrescriptionRepository({
      client,
      autoMigrate: false
    });

    client.prescriptionRows = [
      prescriptionRowFromValues([
        "prescription-1",
        "trainee-1",
        "profile-1",
        "org-1",
        "therapist-1",
        3,
        15,
        JSON.stringify(["music_therapy", "go_nogo_game"]),
        "nature",
        "light",
        true,
        30,
        JSON.stringify(["signal_unstable"]),
        "Keep short sessions."
      ])
    ];

    const records = await repository.findMany({
      userProfileId: "profile-1",
      organizationId: "org-1",
      status: "active"
    });

    expect(records).toHaveLength(1);
    const selectQuery = client.queries.find((query) =>
      /SELECT \*\s+FROM api_training_prescriptions/.test(query.text)
    );
    expect(selectQuery?.text).toContain("user_profile_id = $1");
    expect(selectQuery?.text).toContain("organization_id = $2");
    expect(selectQuery?.text).toContain("status = $3");
    expect(selectQuery?.values).toEqual(["profile-1", "org-1", "active"]);
    expect(client.queries.some((query) => /CREATE TABLE/.test(query.text))).toBe(false);
  });
});

describe("PostgresReportRepository", () => {
  it("stores generated report summaries without clinical conclusion fields", async () => {
    const client = new FakePostgresClient();
    const repository = new PostgresReportRepository({ client });

    const created = await repository.create({
      ...baseReportInput(),
      generatedByUserId: "therapist-1"
    });

    expect(created.id).toBe("report-1");
    expect(created.userProfileId).toBe("profile-1");
    expect(created.metricSummaries[0]?.trainingType).toBe("attention_game");
    expect(created.nextTrainingFocus).toEqual(["Maintain a short, steady training rhythm."]);
    expect(created.htmlContent).toContain("trend summary");
    expect(JSON.stringify(created)).not.toContain("diagnosis");
  });

  it("builds report filters for therapist review scopes", async () => {
    const client = new FakePostgresClient();
    const repository = new PostgresReportRepository({
      client,
      autoMigrate: false
    });

    client.reportRows = [reportRowFromValues(reportInsertValues())];
    const reports = await repository.findMany({
      userProfileId: "profile-1",
      organizationId: "org-1",
      reportType: "weekly",
      audience: "therapist",
      periodFrom: "2026-06-01T00:00:00.000Z",
      periodTo: "2026-06-30T23:59:59.999Z"
    });

    expect(reports).toHaveLength(1);
    const selectQuery = client.queries.find((query) =>
      /SELECT \*\s+FROM api_training_reports/.test(query.text)
    );
    expect(selectQuery?.text).toContain("user_profile_id = $1");
    expect(selectQuery?.text).toContain("organization_id = $2");
    expect(selectQuery?.text).toContain("report_type = $3");
    expect(selectQuery?.text).toContain("audience = $4");
    expect(selectQuery?.text).toContain("period_end >= $5::timestamptz");
    expect(selectQuery?.text).toContain("period_end <= $6::timestamptz");
  });
});

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function basePrescriptionInput(): TrainingPrescriptionDraftInput {
  return {
    userId: "trainee-1",
    userProfileId: "profile-1",
    organizationId: "org-1",
    weeklySessionCount: 3,
    sessionDurationMinutes: 15,
    moduleCombination: ["music_therapy", "attention_game"],
    musicType: "nature",
    initialDifficulty: "light",
    adaptiveAdjustmentEnabled: true,
    dailyMaxTrainingMinutes: 30,
    riskReminderKeys: ["signal_unstable", "fatigue_rising"],
    therapistNote: "Keep short sessions."
  };
}

function baseReportInput(): CreateReportInput {
  return {
    id: "report-1",
    userId: "trainee-1",
    userProfileId: "profile-1",
    therapistUserId: "therapist-1",
    organizationId: "org-1",
    reportType: "weekly",
    audience: "therapist",
    periodStart: "2026-06-22T00:00:00.000Z",
    periodEnd: "2026-06-28T23:59:59.999Z",
    generatedAt: "2026-06-30T09:00:00.000Z",
    sessionCount: 4,
    completedSessionCount: 3,
    averageCompletionRate: 0.75,
    metricSummaries: [
      {
        trainingType: "attention_game",
        completedSessionCount: 2,
        averageCompletionRate: 0.8,
        averageAccuracyRate: 0.82,
        averageReactionTimeMs: 520,
        trendLabel: "stable"
      }
    ],
    riskAlerts: [],
    narrativeSummary: "Training completion was relatively steady this week.",
    nextTrainingFocus: ["Maintain a short, steady training rhythm."],
    dataScopeNotice: "For auxiliary training records and trend review only.",
    htmlContent: "<section>trend summary</section>",
    pdfFileName: "weekly-report.pdf"
  };
}

function prescriptionRowFromValues(
  values: readonly unknown[],
  version = 1
): Record<string, unknown> {
  const [
    id,
    userId,
    userProfileId,
    organizationId,
    therapistUserId,
    weeklySessionCount,
    sessionDurationMinutes,
    moduleCombination,
    musicType,
    initialDifficulty,
    adaptiveAdjustmentEnabled,
    dailyMaxTrainingMinutes,
    riskReminderKeys,
    therapistNote
  ] = values;

  return {
    id,
    user_id: userId,
    user_profile_id: userProfileId,
    organization_id: organizationId,
    therapist_user_id: therapistUserId,
    weekly_session_count: weeklySessionCount,
    session_duration_minutes: sessionDurationMinutes,
    module_combination: parseJsonValue(moduleCombination),
    music_type: musicType,
    initial_difficulty: initialDifficulty,
    adaptive_adjustment_enabled: adaptiveAdjustmentEnabled,
    daily_max_training_minutes: dailyMaxTrainingMinutes,
    risk_reminder_keys: parseJsonValue(riskReminderKeys),
    therapist_note: therapistNote,
    status: "active",
    version,
    created_at: new Date("2026-06-30T08:00:00.000Z"),
    updated_at: new Date("2026-06-30T08:00:00.000Z")
  };
}

function reportInsertValues(): readonly unknown[] {
  const report = baseReportInput();
  return [
    report.id,
    report.userId,
    report.userProfileId,
    report.therapistUserId,
    report.organizationId,
    report.reportType,
    report.audience,
    report.periodStart,
    report.periodEnd,
    report.generatedAt,
    "therapist-1",
    report.sessionCount,
    report.completedSessionCount,
    report.averageCompletionRate,
    JSON.stringify(report.metricSummaries),
    JSON.stringify(report.riskAlerts),
    report.narrativeSummary,
    JSON.stringify(report.nextTrainingFocus),
    report.dataScopeNotice,
    report.htmlContent,
    report.pdfFileName
  ];
}

function reportRowFromValues(values: readonly unknown[]): Record<string, unknown> {
  const [
    id,
    userId,
    userProfileId,
    therapistUserId,
    organizationId,
    reportType,
    audience,
    periodStart,
    periodEnd,
    generatedAt,
    generatedByUserId,
    sessionCount,
    completedSessionCount,
    averageCompletionRate,
    metricSummaries,
    riskAlerts,
    narrativeSummary,
    nextTrainingFocus,
    dataScopeNotice,
    htmlContent,
    pdfFileName
  ] = values;

  return {
    id,
    user_id: userId,
    user_profile_id: userProfileId,
    therapist_user_id: therapistUserId,
    organization_id: organizationId,
    report_type: reportType,
    audience,
    period_start: new Date(String(periodStart)),
    period_end: new Date(String(periodEnd)),
    generated_at: new Date(String(generatedAt)),
    generated_by_user_id: generatedByUserId,
    session_count: sessionCount,
    completed_session_count: completedSessionCount,
    average_completion_rate: averageCompletionRate,
    metric_summaries: parseJsonValue(metricSummaries),
    risk_alerts: parseJsonValue(riskAlerts),
    narrative_summary: narrativeSummary,
    next_training_focus: parseJsonValue(nextTrainingFocus),
    data_scope_notice: dataScopeNotice,
    html_content: htmlContent,
    pdf_file_name: pdfFileName,
    created_at: new Date("2026-06-30T09:01:00.000Z"),
    updated_at: new Date("2026-06-30T09:01:00.000Z")
  };
}

function parseJsonValue(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}
