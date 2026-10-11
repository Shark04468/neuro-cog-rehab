import { describe, expect, it, vi } from "vitest";

import {
  mockWeeklyTrainingReportInput,
  publishSingleSessionReport,
  publishWeeklyTrainingReport,
  ReportPublishingError,
  type PublishedTrainingReport,
  type SingleSessionReportInput
} from "../src/index.js";

const apiSession = {
  apiBaseUrl: "http://127.0.0.1:4311/",
  accessToken: "report-service-token"
};

const singleSessionInput: SingleSessionReportInput = {
  reportId: "single-session-report-api-001",
  generatedAt: "2026-06-16T10:00:00.000Z",
  userInfo: {
    userId: "trainee-api-001",
    userProfileId: "profile-api-001",
    displayName: "训练用户 A",
    ageRange: "10-12",
    guardianConsentLabel: "已确认"
  },
  sessionInfo: {
    sessionId: "session-api-001",
    startedAt: "2026-06-16T09:00:00.000Z",
    endedAt: "2026-06-16T09:18:00.000Z",
    durationSeconds: 1080,
    completionStatus: "completed"
  },
  completedModules: [
    {
      moduleType: "music_therapy",
      durationSeconds: 360,
      completionStatus: "completed"
    },
    {
      moduleType: "attention_game",
      durationSeconds: 720,
      completionStatus: "completed"
    }
  ],
  behaviorMetrics: {
    totalTrials: 30,
    correctCount: 25,
    accuracyRate: 0.83,
    averageReactionTimeMs: 720,
    completionRate: 1
  },
  eegSummary: {
    averageAttentionIndex: 66,
    averageRelaxationIndex: 58,
    averageFatigueIndex: 34,
    validSampleRate: 0.9,
    artifactCount: 3,
    frameCount: 900,
    qualityStatus: "good"
  },
  musicAdaptation: {
    trackTitle: "低强度节律音乐",
    suitabilityScore: 76,
    recommendationLabel: "可继续观察使用",
    attentionChange: 3,
    relaxationChange: 5,
    fatigueChange: -1,
    userFeedbackLabel: "喜欢"
  },
  abnormalEvents: [
    {
      eventType: "low_signal_quality",
      occurredAt: "2026-06-16T09:09:00.000Z",
      severity: "warning",
      message: "第 9 分钟信号短暂波动，已提示调整佩戴。"
    }
  ],
  sessionRecommendation: "下次建议保持短时训练节奏，并继续观察漏按率和反应时波动。"
};

describe("report-api-client", () => {
  it("publishes single-session HTML and PDF metadata to the reports API", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      const body = readRequestBody(init);
      return jsonResponse({ ...body, generatedByUserId: "therapist-api-001" }, 201);
    });

    const result = await publishSingleSessionReport(singleSessionInput, {
      session: apiSession,
      organizationId: "org-api-001",
      therapistUserId: "therapist-api-001",
      fetcher
    });
    const payload = readRequestBody(fetcher.mock.calls[0]?.[1]);

    expect(fetcher).toHaveBeenCalledWith("http://127.0.0.1:4311/reports", {
      body: expect.any(String) as string,
      headers: {
        authorization: "Bearer report-service-token",
        "content-type": "application/json"
      },
      method: "POST"
    });
    expect(payload.reportType).toBe("single_session");
    expect(payload.userProfileId).toBe("profile-api-001");
    expect(payload.organizationId).toBe("org-api-001");
    expect(payload.htmlContent).toContain("单次训练报告");
    expect(payload.pdfFileName).toBe("single-session-report-api-001.pdf");
    expect(payload.metricSummaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trainingType: "music_relaxation" }),
        expect.objectContaining({ trainingType: "attention_training" })
      ])
    );
    expect(payload.riskAlerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "data_quality", severity: "watch" })
      ])
    );
    expect(result.generatedByUserId).toBe("therapist-api-001");
  });

  it("publishes weekly guardian exports as parent reports", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      const body = readRequestBody(init);
      return jsonResponse(body, 201);
    });

    await publishWeeklyTrainingReport(mockWeeklyTrainingReportInput, {
      session: apiSession,
      organizationId: "org-demo-001",
      audience: "parent",
      fetcher
    });
    const payload = readRequestBody(fetcher.mock.calls[0]?.[1]);

    expect(payload.reportType).toBe("weekly");
    expect(payload.audience).toBe("parent");
    expect(payload.userProfileId).toBe("profile-demo-001");
    expect(payload.pdfFileName).toBe("weekly-report-demo-001-guardian.pdf");
    expect(payload.metricSummaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trainingType: "music_relaxation" }),
        expect.objectContaining({ trainingType: "go_no_go" }),
        expect.objectContaining({ trainingType: "rhythm_navigation" })
      ])
    );
    expect(payload.riskAlerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionId: "session-demo-001",
          message: expect.stringContaining("安全提示事件") as string
        })
      ])
    );
  });

  it("throws a typed publishing error when the reports API rejects the request", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse({ error: { message: "Role cannot create training reports." } }, 403)
      );

    await expect(
      publishSingleSessionReport(singleSessionInput, {
        session: apiSession,
        fetcher
      })
    ).rejects.toThrow(ReportPublishingError);
  });
});

function readRequestBody(init: RequestInit | undefined): PublishedTrainingReport {
  const body = init?.body;
  if (typeof body !== "string") {
    throw new Error("Expected JSON request body.");
  }
  return JSON.parse(body) as PublishedTrainingReport;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
