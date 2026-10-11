import { MUSIC_TAGS } from "@neuro-cog-rehab/shared-types";
import type { MusicTag } from "@neuro-cog-rehab/shared-types";

import type { AccessControlService } from "../access-control/access-control-service.js";
import { AuthModuleError, requireCondition } from "../auth/auth-errors.js";
import type { AuthenticatedPrincipal } from "../auth/auth-types.js";
import type { MusicLibraryRepository } from "./music-library-repository.js";
import type {
  MusicLibrarySelectionRecord,
  MusicSelectionQuery,
  MusicTrackListResult,
  MusicTrackQuery,
  SaveMusicSelectionInput
} from "./music-library-types.js";

export interface MusicLibraryServiceDependencies {
  repository: MusicLibraryRepository;
  accessControl: AccessControlService;
}

/**
 * Music library use cases for auxiliary training arrangement. This module only
 * manages music metadata and therapist selection state; it does not infer any
 * clinical effect from music use.
 */
export class MusicLibraryService {
  public constructor(private readonly dependencies: MusicLibraryServiceDependencies) {}

  async listTracks(
    principal: AuthenticatedPrincipal,
    query: MusicTrackQuery
  ): Promise<MusicTrackListResult> {
    this.assertCanUseMusicLibrary(principal);
    this.validateTagQuery(query);
    return {
      tracks: await this.dependencies.repository.findTracks(query),
      dataScopeNotice: "音乐素材仅用于辅助训练安排、训练记录和状态趋势回顾。"
    };
  }

  async readSelection(
    principal: AuthenticatedPrincipal,
    query: MusicSelectionQuery
  ): Promise<MusicLibrarySelectionRecord> {
    this.validateSelectionQuery(query);
    await this.dependencies.accessControl.assertCanAccessProfile(principal, {
      userProfileId: query.userProfileId,
      ...(query.organizationId !== undefined ? { organizationId: query.organizationId } : {})
    });
    const existing = await this.dependencies.repository.findSelection(query.userId);
    if (existing !== undefined) {
      return existing;
    }
    return {
      userId: query.userId,
      userProfileId: query.userProfileId,
      ...(query.organizationId !== undefined ? { organizationId: query.organizationId } : {}),
      recommendedTrackIds: [],
      disabledTrackIds: [],
      updatedByUserId: principal.userId,
      updatedAt: new Date(0).toISOString()
    };
  }

  async saveSelection(
    principal: AuthenticatedPrincipal,
    input: SaveMusicSelectionInput
  ): Promise<MusicLibrarySelectionRecord> {
    this.assertCanUseMusicLibrary(principal);
    await this.validateSaveInput(input);
    await this.dependencies.accessControl.assertCanAccessProfile(principal, {
      userProfileId: input.userProfileId,
      ...(input.organizationId !== undefined ? { organizationId: input.organizationId } : {})
    });
    const record = {
      userId: input.userId,
      userProfileId: input.userProfileId,
      ...(input.organizationId !== undefined ? { organizationId: input.organizationId } : {}),
      recommendedTrackIds: unique(input.recommendedTrackIds),
      disabledTrackIds: unique(input.disabledTrackIds),
      updatedByUserId: principal.userId
    };
    return this.dependencies.repository.saveSelection(record);
  }

  private assertCanUseMusicLibrary(principal: AuthenticatedPrincipal): void {
    requireCondition(
      principal.roles.some(
        (role) => role === "therapist" || role === "org_admin" || role === "system_admin"
      ),
      "PERMISSION_DENIED",
      "Role cannot manage music library selections."
    );
  }

  private validateTagQuery(query: MusicTrackQuery): void {
    if (query.tag === undefined || query.tag === "all") {
      return;
    }
    requireCondition(isMusicTag(query.tag), "VALIDATION_ERROR", "Music tag is invalid.");
  }

  private validateSelectionQuery(query: MusicSelectionQuery): void {
    requireCondition(query.userId.trim().length > 0, "VALIDATION_ERROR", "User id is required.");
    requireCondition(
      query.userProfileId.trim().length > 0,
      "VALIDATION_ERROR",
      "User profile id is required."
    );
  }

  private async validateSaveInput(input: SaveMusicSelectionInput): Promise<void> {
    this.validateSelectionQuery(input);
    const recommendedTrackIds = unique(input.recommendedTrackIds);
    const disabledTrackIds = unique(input.disabledTrackIds);
    const disabled = new Set(disabledTrackIds);
    requireCondition(
      recommendedTrackIds.every((trackId) => !disabled.has(trackId)),
      "VALIDATION_ERROR",
      "Recommended music cannot also be disabled for the same user."
    );
    const availableTrackIds = new Set((await this.dependencies.repository.findTracks({})).map((track) => track.id));
    requireCondition(
      [...recommendedTrackIds, ...disabledTrackIds].every((trackId) => availableTrackIds.has(trackId)),
      "VALIDATION_ERROR",
      "Music selection references an unknown track."
    );
  }
}

function isMusicTag(value: string): value is MusicTag {
  return MUSIC_TAGS.includes(value as MusicTag);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}
