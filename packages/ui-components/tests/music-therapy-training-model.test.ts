import { describe, expect, it } from "vitest";

import {
  createMockMusicTherapyEegSnapshot,
  createMusicTherapySessionResult,
  createMusicTherapyTrainingSummary,
  createTrendPoint,
  mockMusicTracks,
  musicTherapyEegGuidance,
  shouldPauseMusicTrainingForEeg
} from "../src/index.js";

const track = mockMusicTracks[0];

describe("music therapy training model", () => {
  it("creates a MusicTherapySession result object", () => {
    if (!track) {
      throw new Error("Expected mock track.");
    }

    const result = createMusicTherapySessionResult({
      userId: "trainee-1",
      track,
      purpose: "training_support",
      startedAt: "2026-06-15T08:00:00.000Z",
      endedAt: "2026-06-15T08:02:00.000Z",
      durationSeconds: 120,
      plannedDurationSeconds: 240,
      volumeLevel: 45
    });

    expect(result).toMatchObject({
      userId: "trainee-1",
      trackId: track.id,
      trackTitle: track.title,
      purpose: "training_support",
      durationSeconds: 120,
      completionRate: 0.5
    });
  });

  it("pauses training when EEG is disconnected", () => {
    expect(
      shouldPauseMusicTrainingForEeg({
        connectionStatus: "disconnected",
        qualityStatus: "disconnected",
        attentionScore: null,
        relaxationScore: null,
        fatigueScore: null,
        latencyMs: null
      })
    ).toBe(true);
  });

  it("generates gentle EEG guidance without clinical wording", () => {
    const guidance = musicTherapyEegGuidance({
      connectionStatus: "connected",
      qualityStatus: "unstable",
      attentionScore: 42,
      relaxationScore: 50,
      fatigueScore: 30,
      latencyMs: 500
    });

    expect(guidance).toContain("调整");
    expect(guidance.toLowerCase()).not.toContain("diagnosis");
    expect(guidance.toLowerCase()).not.toContain("treatment");
  });

  it("builds a summary with EEG trend averages", () => {
    if (!track) {
      throw new Error("Expected mock track.");
    }

    const snapshot = createMockMusicTherapyEegSnapshot({
      phase: "music",
      elapsedSeconds: 10,
      track
    });
    const point = createTrendPoint(10, snapshot);
    if (!point) {
      throw new Error("Expected trend point.");
    }

    const summary = createMusicTherapyTrainingSummary({
      resultInput: {
        userId: "trainee-1",
        track,
        purpose: "training_support",
        startedAt: "2026-06-15T08:00:00.000Z",
        endedAt: "2026-06-15T08:01:00.000Z",
        durationSeconds: 60,
        plannedDurationSeconds: track.duration,
        volumeLevel: 45
      },
      trendPoints: [point],
      baselineDurationSeconds: 60
    });

    expect(summary.result.trackId).toBe(track.id);
    expect(summary.baselineDurationSeconds).toBe(60);
    expect(summary.averageAttentionScore).toBe(point.attentionScore);
  });
});
