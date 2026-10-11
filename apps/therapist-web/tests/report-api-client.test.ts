import { describe, expect, it, vi } from "vitest";

import {
  listTherapistReports,
  readTherapistReport,
  ReportApiError
} from "../src/report-api-client.js";

describe("report-api-client", () => {
  it("loads therapist report summaries from the api-server", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        reports: [
          {
            id: "report-api-001",
            userId: "trainee-lin-001",
            userProfileId: "profile-lin-001",
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
                trendLabel: "stable"
              }
            ],
            riskAlerts: [],
            narrativeSummary: "本周训练完成较稳定，建议继续观察状态趋势。",
            nextTrainingFocus: ["保持短时训练节奏"],
            dataScopeNotice: "仅用于辅助训练记录和趋势追踪。"
          }
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1
        }
      })
    );

    const result = await listTherapistReports({
      session: { apiBaseUrl: "http://127.0.0.1:4311/", accessToken: "access-token" },
      fetcher
    });

    expect(fetcher).toHaveBeenCalledWith(
      "http://127.0.0.1:4311/reports?audience=therapist&page=1&pageSize=20",
      {
        headers: {
          authorization: "Bearer access-token"
        }
      }
    );
    expect(result.reports[0]?.id).toBe("report-api-001");
    expect(result.reports[0]?.dataScopeNotice).toContain("辅助训练记录");
  });

  it("throws a typed error when report loading fails", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ error: { message: "无权限查看报告。" } }, 403));

    await expect(
      listTherapistReports({
        session: { apiBaseUrl: "http://127.0.0.1:4311", accessToken: "access-token" },
        fetcher
      })
    ).rejects.toThrow(ReportApiError);
  });

  it("loads a single report detail by id", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        id: "report-api-001",
        userId: "trainee-lin-001",
        userProfileId: "profile-lin-001",
        reportType: "weekly",
        audience: "therapist",
        periodStart: "2026-06-22T00:00:00.000Z",
        periodEnd: "2026-06-28T23:59:59.999Z",
        generatedAt: "2026-06-30T09:00:00.000Z",
        sessionCount: 4,
        completedSessionCount: 3,
        averageCompletionRate: 0.75,
        metricSummaries: [],
        riskAlerts: [],
        narrativeSummary: "训练完成较稳定，建议继续观察状态趋势。",
        nextTrainingFocus: ["保持短时训练节奏"],
        dataScopeNotice: "仅用于辅助训练记录和趋势追踪。"
      })
    );

    const report = await readTherapistReport({
      reportId: "report-api-001",
      session: { apiBaseUrl: "http://127.0.0.1:4311/", accessToken: "access-token" },
      fetcher
    });

    expect(fetcher).toHaveBeenCalledWith("http://127.0.0.1:4311/reports/report-api-001", {
      headers: {
        authorization: "Bearer access-token"
      }
    });
    expect(report.id).toBe("report-api-001");
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
