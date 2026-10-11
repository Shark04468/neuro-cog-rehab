import type { MusicTag, MusicTrack } from "@neuro-cog-rehab/shared-types";

import type { AuthenticatedPrincipal } from "../auth/auth-types.js";

export interface MusicTrackQuery {
  tag?: MusicTag | "all";
}

export interface MusicLibrarySelectionRecord {
  userId: string;
  userProfileId: string;
  organizationId?: string;
  recommendedTrackIds: string[];
  disabledTrackIds: string[];
  updatedByUserId: string;
  updatedAt: string;
}

export interface SaveMusicSelectionInput {
  userId: string;
  userProfileId: string;
  organizationId?: string;
  recommendedTrackIds: string[];
  disabledTrackIds: string[];
}

export interface MusicSelectionQuery {
  userId: string;
  userProfileId: string;
  organizationId?: string;
}

export interface MusicTrackListResult {
  tracks: MusicTrack[];
  dataScopeNotice: string;
}

export interface MusicLibraryApiRequest<
  TBody = unknown,
  TParams = Record<string, string>,
  TQuery = MusicTrackQuery
> {
  principal: AuthenticatedPrincipal;
  body: TBody;
  params: TParams;
  query: TQuery;
}

export interface MusicLibraryApiResponse<TBody = unknown> {
  status: number;
  body: TBody;
}
