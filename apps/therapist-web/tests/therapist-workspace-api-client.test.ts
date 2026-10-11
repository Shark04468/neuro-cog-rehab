import { describe, expect, it, vi } from "vitest";

import {
  loadTherapistUserDetailSnapshot,
  loadTherapistWorkspaceSnapshot,
  TherapistWorkspaceApiError
} from "../src/therapist-workspace-api-client.js";

describe("therapist-workspace-api-client", () => {
  it("loads dashboard workspace data from the api-server", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        users: [
          {
            id: "trainee-api-001",
            userProfileId: "profile-api-001",
            displayName: "训练用户A",
            ageRange: "11-13",
            organizationId: "org-api",
            boundTherapistIds: ["therapist-api"],
            trainingStatus: "scheduled_today",
            todayPlan: {
              moduleNames: ["音乐疗愈"],
              plannedMinutes: 15,
              prescriptionStatus: "ready"
            },
            lastSession: null,
            compliance: {
              plannedSessions7d: 3,
              completedSessions7d: 1,
              missedSessions7d: 2,
              completionRate: 0.33,
              streakDays: 1
            },
            riskReminder: {
              level: "none",
              category: "none",
              message: "暂无需要处理的训练安全提醒。",
              occurredAtLabel: "当前"
            }
          }
        ],
        dashboardSupplement: {
          displayNameByUserId: { "trainee-api-001": "训练用户A" },
          trainingTrend: [],
          eegTrend: [],
          recentReports: [],
          moduleHeat: [],
          musicTrend: [],
          eegQuality: [],
          pendingReportCount: 0,
          parentFeedbackCount: 0
        },
        detailRecords: [],
        generatedAt: "2026-06-30T10:00:00.000Z",
        dataScopeNotice: "仅展示授权范围内的辅助训练记录。"
      })
    );

    const result = await loadTherapistWorkspaceSnapshot({
      session: { apiBaseUrl: "http://127.0.0.1:4311/", accessToken: "access-token" },
      fetcher
    });

    expect(fetcher).toHaveBeenCalledWith("http://127.0.0.1:4311/therapist/dashboard", {
      headers: {
        authorization: "Bearer access-token"
      }
    });
    expect(result.users[0]?.userProfileId).toBe("profile-api-001");
  });

  it("loads a single authorized user detail snapshot", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        user: { id: "trainee-api-001", userProfileId: "profile-api-001" },
        detailRecord: { userId: "trainee-api-001", recentTrainingRecords: [] },
        generatedAt: "2026-06-30T10:00:00.000Z",
        dataScopeNotice: "仅展示授权范围内的趋势摘要。"
      })
    );

    await loadTherapistUserDetailSnapshot({
      session: { apiBaseUrl: "http://127.0.0.1:4311", accessToken: "access-token" },
      userId: "trainee-api-001",
      fetcher
    });

    expect(fetcher).toHaveBeenCalledWith("http://127.0.0.1:4311/therapist/users/trainee-api-001", {
      headers: {
        authorization: "Bearer access-token"
      }
    });
  });

  it("throws a typed error when workspace API rejects the request", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ error: { message: "无权限查看治疗师工作区。" } }, 403));

    await expect(
      loadTherapistWorkspaceSnapshot({
        session: { apiBaseUrl: "http://127.0.0.1:4311", accessToken: "access-token" },
        fetcher
      })
    ).rejects.toThrow(TherapistWorkspaceApiError);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
