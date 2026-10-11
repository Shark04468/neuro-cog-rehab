import { describe, expect, it } from "vitest";

import {
  AdminOperationLogApiClientError,
  fetchAdminOperationLogSummary,
  type AdminOperationLogApiSession
} from "../src/operation-log-api-client.js";

describe("operation-log-api-client", () => {
  it("loads administrator operation log summaries from the API", async () => {
    const requests: CapturedRequest[] = [];
    const summary = await fetchAdminOperationLogSummary(baseSession(), {
      now: () => new Date("2026-06-17T12:30:00.000Z"),
      fetcher: createFetchMock(requests, {
        logs: [
          apiLog("log-permission", "permission.update", "2026-06-17T09:20:00.000Z"),
          apiLog("log-export", "training_data.export", "2026-06-17T09:10:00.000Z"),
          apiLog("log-pause", "training.abnormal_pause", "2026-06-17T09:00:00.000Z"),
          apiLog("log-login", "auth.login", "2026-06-17T08:50:00.000Z")
        ],
        pagination: {
          page: 1,
          pageSize: 100,
          totalItems: 4,
          totalPages: 1
        }
      })
    });

    expect(requests[0]).toMatchObject({
      path: "/operation-logs",
      authorization: "Bearer access-token"
    });
    expect(requests[0]?.query.get("organizationId")).toBe("org-1");
    expect(requests[0]?.query.get("pageSize")).toBe("100");
    expect(summary).toMatchObject({
      provider: "api",
      totalLogs: 4,
      permissionUpdateCount: 1,
      dataExportCount: 1,
      abnormalPauseCount: 1,
      fetchedAt: "2026-06-17T12:30:00.000Z"
    });
    expect(summary.latestTasks[0]).toContain("修改权限");
    expect(summary.latestTasks[0]).toContain("admi...0001");
  });

  it("returns a clear error when the API denies the audit request", async () => {
    await expect(
      fetchAdminOperationLogSummary(baseSession(), {
        fetcher: createFetchMock(
          [],
          {
            error: {
              code: "PERMISSION_DENIED",
              message: "Role cannot query operation logs."
            }
          },
          403
        )
      })
    ).rejects.toThrow("Role cannot query operation logs.");
  });

  it("validates API session before querying logs", async () => {
    await expect(
      fetchAdminOperationLogSummary({
        ...baseSession(),
        accessToken: ""
      })
    ).rejects.toBeInstanceOf(AdminOperationLogApiClientError);
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

function baseSession(): AdminOperationLogApiSession {
  return {
    apiBaseUrl: "http://127.0.0.1:3001/",
    accessToken: "access-token",
    organizationId: "org-1"
  };
}

function apiLog(
  id: string,
  operationType:
    | "auth.login"
    | "profile.view_detail"
    | "training_prescription.update"
    | "training_data.export"
    | "report.generate"
    | "record.delete"
    | "record.archive"
    | "permission.update"
    | "training.abnormal_pause",
  occurredAt: string
) {
  return {
    id,
    operationType,
    actorUserId: "admin-user-0001",
    actorRoles: ["org_admin"],
    target: {
      targetType: "system",
      organizationId: "org-1"
    },
    occurredAt,
    recordedAt: occurredAt
  };
}
