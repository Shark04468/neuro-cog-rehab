import { describe, expect, it, vi } from "vitest";

import {
  loadMusicTracks,
  MusicLibraryApiError,
  readMusicSelection,
  saveMusicSelection
} from "../src/music-library-api-client.js";

const session = {
  apiBaseUrl: "http://127.0.0.1:4311/",
  accessToken: "music-token"
};

describe("music-library-api-client", () => {
  it("loads music tracks from the api-server", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        tracks: [
          {
            id: "track-soft-focus-pulse",
            title: "柔和注意准备",
            duration: 320,
            bpm: 72,
            tags: ["focus"],
            intensityLevel: 2,
            recommendedScene: "训练前注意准备",
            contraindicationNote: "如不适请更换素材。",
            fileUrl: "https://assets.example.test/music/soft-focus-pulse.mp3"
          }
        ],
        dataScopeNotice: "音乐素材仅用于辅助训练安排。"
      })
    );

    const result = await loadMusicTracks({ session, tag: "focus", fetcher });

    expect(fetcher).toHaveBeenCalledWith("http://127.0.0.1:4311/music-library/tracks?tag=focus", {
      headers: {
        authorization: "Bearer music-token"
      }
    });
    expect(result.tracks[0]?.id).toBe("track-soft-focus-pulse");
  });

  it("reads and saves a user music selection", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          userId: "trainee-001",
          userProfileId: "profile-001",
          organizationId: "org-001",
          recommendedTrackIds: ["track-soft-focus-pulse"],
          disabledTrackIds: [],
          updatedByUserId: "therapist-001",
          updatedAt: "2026-06-30T12:00:00.000Z"
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          userId: "trainee-001",
          userProfileId: "profile-001",
          organizationId: "org-001",
          recommendedTrackIds: ["track-soft-focus-pulse"],
          disabledTrackIds: ["track-calm-noise-band"],
          updatedByUserId: "therapist-001",
          updatedAt: "2026-06-30T12:01:00.000Z"
        })
      );

    const selection = await readMusicSelection({
      session,
      userId: "trainee-001",
      userProfileId: "profile-001",
      organizationId: "org-001",
      fetcher
    });
    const saved = await saveMusicSelection({
      session,
      userId: "trainee-001",
      userProfileId: "profile-001",
      organizationId: "org-001",
      state: {
        recommendedTrackIdsByUserId: {
          "trainee-001": ["track-soft-focus-pulse"]
        },
        disabledTrackIdsByUserId: {
          "trainee-001": ["track-calm-noise-band"]
        }
      },
      fetcher
    });

    expect(selection.recommendedTrackIds).toEqual(["track-soft-focus-pulse"]);
    expect(fetcher.mock.calls[1]?.[0]).toBe("http://127.0.0.1:4311/music-library/selections");
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toMatchObject({
      userId: "trainee-001",
      userProfileId: "profile-001",
      recommendedTrackIds: ["track-soft-focus-pulse"],
      disabledTrackIds: ["track-calm-noise-band"]
    });
    expect(saved.disabledTrackIds).toEqual(["track-calm-noise-band"]);
  });

  it("throws a typed error when the music API rejects the request", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ error: { message: "无权限访问音乐库。" } }, 403));

    await expect(loadMusicTracks({ session, fetcher })).rejects.toThrow(MusicLibraryApiError);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
