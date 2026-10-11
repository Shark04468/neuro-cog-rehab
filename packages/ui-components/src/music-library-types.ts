import type { MusicTag, MusicTrack } from "@neuro-cog-rehab/shared-types";

export type { MusicTag, MusicTrack };

export interface MusicLibraryUser {
  id: string;
  displayName: string;
  ageRange: string;
  trainingGoal: string;
  soundSensitivityNote?: string;
}

export interface MusicLibrarySelectionState {
  recommendedTrackIdsByUserId: Record<string, string[]>;
  disabledTrackIdsByUserId: Record<string, string[]>;
}

export interface MusicLibraryViewModel {
  selectedTag: MusicTag | "all";
  activeUser: MusicLibraryUser;
  tracks: Array<
    MusicTrack & {
      isRecommended: boolean;
      isDisabled: boolean;
    }
  >;
  recommendedCount: number;
  disabledCount: number;
}

export interface MusicLibraryPageProps {
  tracks: MusicTrack[];
  users: MusicLibraryUser[];
  initialUserId?: string;
  initialSelectedTag?: MusicTag | "all";
  initialSelectionState?: Partial<MusicLibrarySelectionState>;
  onSelectionChange?: (state: MusicLibrarySelectionState) => void;
}
