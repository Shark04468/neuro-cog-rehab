export interface AdminOperationLogApiSession {
  apiBaseUrl: string;
  accessToken: string;
  organizationId?: string;
}

export interface AdminOperationLogSummary {
  totalLogs: number;
  permissionUpdateCount: number;
  dataExportCount: number;
  abnormalPauseCount: number;
  latestTasks: string[];
  fetchedAt: string;
  provider: "api";
}

export interface AdminOperationLogApiOptions {
  fetcher?: typeof fetch;
  now?: () => Date;
}

interface OperationLogListResponse {
  logs: ApiOperationLogRecord[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

interface ApiOperationLogRecord {
  id: string;
  operationType:
    | "auth.login"
    | "profile.view_detail"
    | "training_prescription.update"
    | "training_data.export"
    | "report.generate"
    | "record.delete"
    | "record.archive"
    | "permission.update"
    | "training.abnormal_pause";
  actorUserId: string;
  actorRoles: string[];
  target: {
    targetType: string;
    targetId?: string;
    targetUserProfileId?: string;
    organizationId?: string;
  };
  occurredAt: string;
  recordedAt: string;
  ipAddress?: string;
  deviceInfo?: string;
}

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export class AdminOperationLogApiClientError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AdminOperationLogApiClientError";
  }
}

/**
 * Loads append-only operation log summaries for the administrator workspace.
 * It reads audit metadata only and does not expose training payloads or raw EEG.
 */
export async function fetchAdminOperationLogSummary(
  session: AdminOperationLogApiSession,
  options: AdminOperationLogApiOptions = {}
): Promise<AdminOperationLogSummary> {
  validateSession(session);
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date());
  const apiBaseUrl = session.apiBaseUrl.replace(/\/+$/, "");
  const url = new URL(`${apiBaseUrl}/operation-logs`);
  url.searchParams.set("page", "1");
  url.searchParams.set("pageSize", "100");
  if (session.organizationId !== undefined && session.organizationId.trim().length > 0) {
    url.searchParams.set("organizationId", session.organizationId);
  }

  let response: Response;
  try {
    response = await fetcher(url.toString(), {
      method: "GET",
      headers: {
        authorization: `Bearer ${session.accessToken}`
      }
    });
  } catch {
    throw new AdminOperationLogApiClientError("操作日志接口暂时不可用，请稍后重试。");
  }

  const body = await readJsonResponse(response);
  if (!response.ok) {
    throw new AdminOperationLogApiClientError(extractApiErrorMessage(body));
  }

  const result = body as OperationLogListResponse;
  const logs = result.logs ?? [];
  return {
    totalLogs: result.pagination?.totalItems ?? logs.length,
    permissionUpdateCount: countByType(logs, "permission.update"),
    dataExportCount: countByType(logs, "training_data.export"),
    abnormalPauseCount: countByType(logs, "training.abnormal_pause"),
    latestTasks: buildLatestTaskLabels(logs),
    fetchedAt: now().toISOString(),
    provider: "api"
  };
}

function buildLatestTaskLabels(logs: readonly ApiOperationLogRecord[]): string[] {
  if (logs.length === 0) {
    return ["暂未读取到机构操作日志，后续登录、导出和权限变更会在此汇总。"];
  }

  return logs.slice(0, 4).map((log) => {
    const occurredAt = formatOccurredAt(log.occurredAt);
    const actor = maskActorId(log.actorUserId);
    return `${occurredAt} ${operationTypeLabel(log.operationType)}，操作者 ${actor}`;
  });
}

function countByType(
  logs: readonly ApiOperationLogRecord[],
  operationType: ApiOperationLogRecord["operationType"]
): number {
  return logs.filter((log) => log.operationType === operationType).length;
}

function operationTypeLabel(type: ApiOperationLogRecord["operationType"]): string {
  switch (type) {
    case "auth.login":
      return "登录记录";
    case "profile.view_detail":
      return "查看用户详情";
    case "training_prescription.update":
      return "修改训练处方";
    case "training_data.export":
      return "导出脱敏数据";
    case "report.generate":
      return "生成训练报告";
    case "record.delete":
      return "删除记录";
    case "record.archive":
      return "归档记录";
    case "permission.update":
      return "修改权限";
    case "training.abnormal_pause":
      return "异常暂停事件";
  }
}

function formatOccurredAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "时间待确认";
  }

  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(
    2,
    "0"
  )}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function maskActorId(actorUserId: string): string {
  const trimmed = actorUserId.trim();
  if (trimmed.length <= 8) {
    return trimmed;
  }
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

async function readJsonResponse(response: Response): Promise<unknown> {
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

function validateSession(session: AdminOperationLogApiSession): void {
  if (session.apiBaseUrl.trim().length === 0 || session.accessToken.trim().length === 0) {
    throw new AdminOperationLogApiClientError("操作日志查询需要有效 API 登录状态。");
  }
}

function extractApiErrorMessage(body: unknown): string {
  const candidate = body as ApiErrorBody;
  return candidate.error?.message ?? "操作日志读取失败，请稍后重试。";
}
