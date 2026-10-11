import type { TherapistDashboardSupplement } from "./therapist-dashboard-model.js";
import type { UserDetailSourceRecord } from "./therapist-user-detail-model.js";
import type { TherapistWorkspaceUser } from "./therapist-workspace-model.js";

export interface TherapistWorkspaceApiSession {
  apiBaseUrl: string;
  accessToken: string;
}

export interface TherapistWorkspaceSnapshot {
  users: TherapistWorkspaceUser[];
  dashboardSupplement: TherapistDashboardSupplement;
  detailRecords: UserDetailSourceRecord[];
  generatedAt: string;
  dataScopeNotice: string;
}

export interface TherapistUserDetailSnapshot {
  user: TherapistWorkspaceUser;
  detailRecord: UserDetailSourceRecord;
  generatedAt: string;
  dataScopeNotice: string;
}

interface ApiErrorBody {
  error?: {
    message?: string;
  };
}

export class TherapistWorkspaceApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TherapistWorkspaceApiError";
  }
}

export async function loadTherapistWorkspaceSnapshot(input: {
  session: TherapistWorkspaceApiSession;
  fetcher?: typeof fetch;
}): Promise<TherapistWorkspaceSnapshot> {
  return readApiJson<TherapistWorkspaceSnapshot>({
    ...(input.fetcher !== undefined ? { fetcher: input.fetcher } : {}),
    session: input.session,
    path: "/therapist/dashboard"
  });
}

export async function loadTherapistUserDetailSnapshot(input: {
  session: TherapistWorkspaceApiSession;
  userId: string;
  fetcher?: typeof fetch;
}): Promise<TherapistUserDetailSnapshot> {
  return readApiJson<TherapistUserDetailSnapshot>({
    ...(input.fetcher !== undefined ? { fetcher: input.fetcher } : {}),
    session: input.session,
    path: `/therapist/users/${encodeURIComponent(input.userId)}`
  });
}

async function readApiJson<TBody>(input: {
  fetcher?: typeof fetch;
  path: string;
  session: TherapistWorkspaceApiSession;
}): Promise<TBody> {
  const response = await (input.fetcher ?? fetch)(
    `${input.session.apiBaseUrl.replace(/\/+$/, "")}${input.path}`,
    {
      headers: {
        authorization: `Bearer ${input.session.accessToken}`
      }
    }
  );
  const body = await readJson(response);
  if (!response.ok) {
    throw new TherapistWorkspaceApiError(extractErrorMessage(body));
  }
  return body as TBody;
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
  return (body as ApiErrorBody).error?.message ?? "Therapist workspace API is unavailable.";
}
