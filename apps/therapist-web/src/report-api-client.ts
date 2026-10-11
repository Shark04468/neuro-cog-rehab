export interface ReportApiSession {
  apiBaseUrl: string;
  accessToken: string;
}

export interface TrainingReportMetricSummary {
  trainingType: string;
  completedSessionCount: number;
  averageCompletionRate: number;
  averageAccuracyRate?: number;
  averageReactionTimeMs?: number;
  trendLabel: "not_enough_data" | "stable" | "improving" | "needs_attention";
}

export interface RiskAlert {
  id: string;
  userId: string;
  sessionId?: string;
  category: string;
  severity: string;
  message: string;
  recommendedAction: string;
  createdAt: string;
  acknowledgedAt?: string;
}

export interface TherapistReportSummary {
  id: string;
  userId: string;
  userProfileId: string;
  reportType: "single_session" | "weekly";
  audience: "therapist" | "parent";
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  sessionCount: number;
  completedSessionCount: number;
  averageCompletionRate: number;
  metricSummaries: TrainingReportMetricSummary[];
  riskAlerts: RiskAlert[];
  narrativeSummary: string;
  nextTrainingFocus: string[];
  dataScopeNotice: string;
}

export interface ReportListResponse {
  reports: TherapistReportSummary[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

interface ApiErrorBody {
  error?: {
    message?: string;
  };
}

export class ReportApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportApiError";
  }
}

export async function listTherapistReports(input: {
  session: ReportApiSession;
  fetcher?: typeof fetch;
}): Promise<ReportListResponse> {
  const response = await (input.fetcher ?? fetch)(
    `${input.session.apiBaseUrl.replace(/\/+$/, "")}/reports?audience=therapist&page=1&pageSize=20`,
    {
      headers: {
        authorization: `Bearer ${input.session.accessToken}`
      }
    }
  );
  const body = await readJson(response);
  if (!response.ok) {
    throw new ReportApiError(extractErrorMessage(body));
  }
  return body as ReportListResponse;
}

export async function readTherapistReport(input: {
  reportId: string;
  session: ReportApiSession;
  fetcher?: typeof fetch;
}): Promise<TherapistReportSummary> {
  const response = await (input.fetcher ?? fetch)(
    `${input.session.apiBaseUrl.replace(/\/+$/, "")}/reports/${encodeURIComponent(input.reportId)}`,
    {
      headers: {
        authorization: `Bearer ${input.session.accessToken}`
      }
    }
  );
  const body = await readJson(response);
  if (!response.ok) {
    throw new ReportApiError(extractErrorMessage(body));
  }
  return body as TherapistReportSummary;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function extractErrorMessage(body: unknown): string {
  return (body as ApiErrorBody).error?.message ?? "Report API did not return report data.";
}
