import type { MusicLibrarySelectionState, MusicTrack } from "@neuro-cog-rehab/ui-components";

export interface MusicLibraryApiSession {
  apiBaseUrl: string;
  accessToken: string;
}

export interface MusicSelectionRecord {
  userId: string;
  userProfileId: string;
  organizationId?: string;
  recommendedTrackIds: string[];
  disabledTrackIds: string[];
  updatedByUserId: string;
  updatedAt: string;
}

export interface MusicTrackListResponse {
  tracks: MusicTrack[];
  dataScopeNotice: string;
}

export class MusicLibraryApiError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "MusicLibraryApiError";
  }
}

export async function loadMusicTracks(input: {
  session: MusicLibraryApiSession;
  fetcher?: typeof fetch;
  tag?: string;
}): Promise<MusicTrackListResponse> {
  const query = input.tag === undefined ? "" : `?tag=${encodeURIComponent(input.tag)}`;
  return readApiJson<MusicTrackListResponse>({
    ...(input.fetcher !== undefined ? { fetcher: input.fetcher } : {}),
    session: input.session,
    path: `/music-library/tracks${query}`
  });
}

export async function readMusicSelection(input: {
  session: MusicLibraryApiSession;
  fetcher?: typeof fetch;
  userId: string;
  userProfileId: string;
  organizationId?: string;
}): Promise<MusicSelectionRecord> {
  const params = new URLSearchParams({
    userId: input.userId,
    userProfileId: input.userProfileId
  });
  if (input.organizationId !== undefined) {
    params.set("organizationId", input.organizationId);
  }
  return readApiJson<MusicSelectionRecord>({
    ...(input.fetcher !== undefined ? { fetcher: input.fetcher } : {}),
    session: input.session,
    path: `/music-library/selections?${params.toString()}`
  });
}

export async function saveMusicSelection(input: {
  session: MusicLibraryApiSession;
  fetcher?: typeof fetch;
  userId: string;
  userProfileId: string;
  organizationId?: string;
  state: MusicLibrarySelectionState;
}): Promise<MusicSelectionRecord> {
  const body = {
    userId: input.userId,
    userProfileId: input.userProfileId,
    ...(input.organizationId !== undefined ? { organizationId: input.organizationId } : {}),
    recommendedTrackIds: input.state.recommendedTrackIdsByUserId[input.userId] ?? [],
    disabledTrackIds: input.state.disabledTrackIdsByUserId[input.userId] ?? []
  };
  return readApiJson<MusicSelectionRecord>({
    ...(input.fetcher !== undefined ? { fetcher: input.fetcher } : {}),
    session: input.session,
    path: "/music-library/selections",
    init: {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json"
      },
      method: "PUT"
    }
  });
}

interface ApiErrorBody {
  error?: {
    message?: string;
  };
}

async function readApiJson<TBody>(input: {
  fetcher?: typeof fetch;
  init?: RequestInit;
  path: string;
  session: MusicLibraryApiSession;
}): Promise<TBody> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${input.session.accessToken}`
  };
  const extraHeaders = input.init?.headers;
  if (extraHeaders instanceof Headers) {
    extraHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (Array.isArray(extraHeaders)) {
    for (const [key, value] of extraHeaders) {
      headers[key] = value;
    }
  } else if (extraHeaders !== undefined) {
    Object.assign(headers, extraHeaders);
  }

  const response = await (input.fetcher ?? fetch)(
    `${input.session.apiBaseUrl.replace(/\/+$/, "")}${input.path}`,
    {
      ...input.init,
      headers
    }
  );
  const body = await readJson(response);
  if (!response.ok) {
    throw new MusicLibraryApiError(extractErrorMessage(body));
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
  return (body as ApiErrorBody).error?.message ?? "Music library API is unavailable.";
}
