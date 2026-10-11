import type {
  MusicLibrarySelectionState,
  MusicLibraryUser,
  MusicLibraryViewModel,
  MusicTag,
  MusicTrack
} from "./music-library-types.js";

export const MUSIC_TAG_LABELS: Record<MusicTag | "all", string> = {
  all: "全部",
  focus: "注意唤醒",
  relax: "放松恢复",
  rhythm: "节律训练",
  nature: "自然声",
  white_noise: "白噪声",
  custom: "个体化音乐"
};

export function createEmptyMusicSelectionState(): MusicLibrarySelectionState {
  return {
    recommendedTrackIdsByUserId: {},
    disabledTrackIdsByUserId: {}
  };
}

export function normalizeMusicSelectionState(
  state?: Partial<MusicLibrarySelectionState>
): MusicLibrarySelectionState {
  return {
    recommendedTrackIdsByUserId: cloneRecord(state?.recommendedTrackIdsByUserId),
    disabledTrackIdsByUserId: cloneRecord(state?.disabledTrackIdsByUserId)
  };
}

export function buildMusicLibraryViewModel(input: {
  tracks: MusicTrack[];
  users: MusicLibraryUser[];
  selectedUserId: string;
  selectedTag: MusicTag | "all";
  selectionState: MusicLibrarySelectionState;
}): MusicLibraryViewModel {
  const activeUser =
    input.users.find((user) => user.id === input.selectedUserId) ?? input.users[0] ?? fallbackUser;
  const recommended = new Set(
    input.selectionState.recommendedTrackIdsByUserId[activeUser.id] ?? []
  );
  const disabled = new Set(input.selectionState.disabledTrackIdsByUserId[activeUser.id] ?? []);
  const filteredTracks = filterTracksByTag(input.tracks, input.selectedTag);

  return {
    selectedTag: input.selectedTag,
    activeUser,
    tracks: filteredTracks.map((track) => ({
      ...track,
      isRecommended: recommended.has(track.id),
      isDisabled: disabled.has(track.id)
    })),
    recommendedCount: recommended.size,
    disabledCount: disabled.size
  };
}

export function recommendMusicForUser(
  state: MusicLibrarySelectionState,
  userId: string,
  trackId: string
): MusicLibrarySelectionState {
  const disabled = new Set(state.disabledTrackIdsByUserId[userId] ?? []);
  if (disabled.has(trackId)) {
    return normalizeMusicSelectionState(state);
  }

  const recommended = new Set(state.recommendedTrackIdsByUserId[userId] ?? []);
  recommended.add(trackId);

  return {
    recommendedTrackIdsByUserId: {
      ...state.recommendedTrackIdsByUserId,
      [userId]: [...recommended]
    },
    disabledTrackIdsByUserId: cloneRecord(state.disabledTrackIdsByUserId)
  };
}

export function toggleMusicDisabledForUser(
  state: MusicLibrarySelectionState,
  userId: string,
  trackId: string
): MusicLibrarySelectionState {
  const disabled = new Set(state.disabledTrackIdsByUserId[userId] ?? []);
  const recommended = new Set(state.recommendedTrackIdsByUserId[userId] ?? []);

  if (disabled.has(trackId)) {
    disabled.delete(trackId);
  } else {
    disabled.add(trackId);
    recommended.delete(trackId);
  }

  return {
    recommendedTrackIdsByUserId: {
      ...state.recommendedTrackIdsByUserId,
      [userId]: [...recommended]
    },
    disabledTrackIdsByUserId: {
      ...state.disabledTrackIdsByUserId,
      [userId]: [...disabled]
    }
  };
}

export function formatMusicDuration(seconds: number): string {
  const normalized = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(normalized / 60);
  const remainingSeconds = normalized % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function cloneRecord(source: Record<string, string[]> | undefined): Record<string, string[]> {
  if (!source) {
    return {};
  }

  return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, [...value]]));
}

function filterTracksByTag(tracks: MusicTrack[], selectedTag: MusicTag | "all"): MusicTrack[] {
  if (selectedTag === "all") {
    return tracks;
  }

  return tracks.filter((track) => track.tags.includes(selectedTag));
}

const fallbackUser: MusicLibraryUser = {
  id: "unassigned",
  displayName: "未选择用户",
  ageRange: "--",
  trainingGoal: "请选择训练用户后再推荐音乐。"
};
