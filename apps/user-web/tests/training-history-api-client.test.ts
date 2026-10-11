import { describe, expect, it } from "vitest";

import { mockTraineeDashboardData } from "../src/trainee-dashboard-mock.js";
import {
  fetchDashboardDataWithTrainingHistory,
  fetchTrainingHistoryRecords,
  TrainingHistoryApiClientError
} from "../src/training-history-api-client.js";
import type { TrainingRecordApiSession } from "../src/training-record-api-client.js";

describe("training-history-api-client", () => {
  it("reads authorized training history and maps summaries into dashboard data", async () => {
    const requests: CapturedRequest[] = [];
    const now = new Date("2026-06-17T12:00:00.000Z");
    const dashboard = await fetchDashboardDataWithTrainingHistory(
      mockTraineeDashboardData,
      baseSession(),
      {
        now,
        fetcher: createFetchMock(requests, {
          records: [
            apiRecord({
              id: "record-attention",
              trainingType: "attention_game",
              startedAt: "2026-06-16T09:00:00.000Z",
              endedAt: "2026-06-16T09:10:00.000Z",
              durationSeconds: 600,
              averageAttentionIndex: 72,
              accuracyRate: 0.82
            }),
            apiRecord({
              id: "record-music",
              trainingType: "music_therapy",
              startedAt: "2026-06-17T10:00:00.000Z",
              endedAt: "2026-06-17T10:08:00.000Z",
              durationSeconds: 480,
              averageAttentionIndex: 76,
              accuracyRate: 0.9
            })
          ],
          pagination: {
            page: 1,
            pageSize: 100,
            totalItems: 2,
            totalPages: 1
          }
        })
      }
    );

    expect(requests[0]).toMatchObject({
      path: "/training-records",
      authorization: "Bearer access-token"
    });
    expect(requests[0]?.query.get("userProfileId")).toBe("profile-1");
    expect(requests[0]?.query.get("pageSize")).toBe("100");
    expect(dashboard.statusSummary).toContain("已读取授权训练历史");
    expect(dashboard.weeklyProgress.completedSessions).toBe(2);
    expect(dashboard.weeklyProgress.completedMinutes).toBe(18);
    expect(dashboard.lastFeedback?.moduleName).toBe("音乐疗愈");
    expect(dashboard.lastFeedback?.summary).toContain("正确率约 90%");
    expect(dashboard.attentionTrend.at(-1)?.attentionStabilityScore).toBe(76);
  });

  it("keeps the current dashboard data when the API has no saved training records", async () => {
    const dashboard = await fetchDashboardDataWithTrainingHistory(
      mockTraineeDashboardData,
      baseSession(),
      {
        now: new Date("2026-06-17T12:00:00.000Z"),
        fetcher: createFetchMock([], {
          records: [],
          pagination: {
            page: 1,
            pageSize: 100,
            totalItems: 0,
            totalPages: 0
          }
        })
      }
    );

    expect(dashboard).toBe(mockTraineeDashboardData);
  });

  it("returns a clear error when the API denies the history request", async () => {
    await expect(
      fetchTrainingHistoryRecords(baseSession(), {
        fetcher: createFetchMock(
          [],
          {
            error: {
              code: "SENSITIVE_DATA_SCOPE_DENIED",
              message: "No authorized relationship to target profile."
            }
          },
          403
        )
      })
    ).rejects.toThrow("No authorized relationship to target profile.");
  });

  it("validates profile scope before requesting sensitive training summaries", async () => {
    await expect(
      fetchTrainingHistoryRecords({
        ...baseSession(),
        userProfileId: ""
      })
    ).rejects.toBeInstanceOf(TrainingHistoryApiClientError);
  });
});

interface CapturedRequest {
  path: string;
  query: URLSearchParams;
  authorization?: string;
}

function createFetchMock(requests: CapturedRequest[], body: unknown, status = 200): typeof fetch {
  return async (input, init) => {
    const url = new URL(String(input));
    requests.push({
      path: url.pathname,
      query: url.searchParams,
      ...(typeof init?.headers === "object" &&
      init.headers !== null &&
      "authorization" in init.headers &&
      typeof init.headers.authorization === "string"
        ? { authorization: init.headers.authorization }
        : {})
    });

    return new Response(JSON.stringify(body), { status });
  };
}

function baseSession(): TrainingRecordApiSession {
  return {
    apiBaseUrl: "http://127.0.0.1:3001/",
    accessToken: "access-token",
    userId: "trainee-1",
    userProfileId: "profile-1",
    organizationId: "org-1"
  };
}

function apiRecord(input: {
  id: string;
  trainingType:
    | "baseline_assessment"
    | "music_therapy"
    | "attention_game"
    | "go_nogo_game"
    | "rhythm_navigation"
    | "mixed_session";
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  averageAttentionIndex: number;
  accuracyRate: number;
}) {
  return {
    id: input.id,
    userId: "trainee-1",
    userProfileId: "profile-1",
    organizationId: "org-1",
    trainingType: input.trainingType,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationSeconds: input.durationSeconds,
    behaviorMetrics: {
      accuracyRate: input.accuracyRate
    },
    eegSummaryMetrics: {
      averageAttentionIndex: input.averageAttentionIndex,
      qualityStatus: "good"
    },
    completionStatus: "completed",
    createdAt: input.endedAt
  };
}
