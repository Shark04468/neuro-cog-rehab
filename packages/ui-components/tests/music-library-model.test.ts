import { describe, expect, it } from "vitest";

import {
  buildMusicLibraryViewModel,
  createEmptyMusicSelectionState,
  mockMusicLibraryUsers,
  mockMusicTracks,
  recommendMusicForUser,
  toggleMusicDisabledForUser
} from "../src/index.js";

describe("music library model", () => {
  it("filters music tracks by tag", () => {
    const result = buildMusicLibraryViewModel({
      tracks: mockMusicTracks,
      users: mockMusicLibraryUsers,
      selectedUserId: "trainee-chen-01",
      selectedTag: "nature",
      selectionState: createEmptyMusicSelectionState()
    });

    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0]?.tags).toContain("nature");
  });

  it("recommends a track for the selected user", () => {
    const state = recommendMusicForUser(
      createEmptyMusicSelectionState(),
      "trainee-chen-01",
      "music-focus-soft-pulse"
    );

    const result = buildMusicLibraryViewModel({
      tracks: mockMusicTracks,
      users: mockMusicLibraryUsers,
      selectedUserId: "trainee-chen-01",
      selectedTag: "all",
      selectionState: state
    });

    expect(result.recommendedCount).toBe(1);
    expect(
      result.tracks.find((track) => track.id === "music-focus-soft-pulse")?.isRecommended
    ).toBe(true);
  });

  it("disables unsuitable tracks and removes recommendation for that user", () => {
    const recommended = recommendMusicForUser(
      createEmptyMusicSelectionState(),
      "trainee-chen-01",
      "music-white-noise-calm-band"
    );
    const disabled = toggleMusicDisabledForUser(
      recommended,
      "trainee-chen-01",
      "music-white-noise-calm-band"
    );

    const result = buildMusicLibraryViewModel({
      tracks: mockMusicTracks,
      users: mockMusicLibraryUsers,
      selectedUserId: "trainee-chen-01",
      selectedTag: "all",
      selectionState: disabled
    });
    const track = result.tracks.find((item) => item.id === "music-white-noise-calm-band");

    expect(track?.isDisabled).toBe(true);
    expect(track?.isRecommended).toBe(false);
  });

  it("keeps wording inside auxiliary training boundaries", () => {
    const serialized = JSON.stringify(mockMusicTracks).toLowerCase();

    expect(serialized).not.toContain("diagnosis");
    expect(serialized).not.toContain("cure");
    expect(serialized).not.toContain("guarantee");
  });
});
