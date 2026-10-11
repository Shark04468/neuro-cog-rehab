import type { MusicTrack } from "@neuro-cog-rehab/shared-types";

import type { MusicLibrarySelectionRecord, MusicTrackQuery } from "./music-library-types.js";

export interface MusicLibraryRepository {
  findTracks(query: MusicTrackQuery): Promise<MusicTrack[]>;
  findSelection(userId: string): Promise<MusicLibrarySelectionRecord | undefined>;
  saveSelection(
    input: Omit<MusicLibrarySelectionRecord, "updatedAt">
  ): Promise<MusicLibrarySelectionRecord>;
}

export class InMemoryMusicLibraryRepository implements MusicLibraryRepository {
  private readonly tracks: MusicTrack[];
  private readonly selections = new Map<string, MusicLibrarySelectionRecord>();

  public constructor(tracks: MusicTrack[] = DEFAULT_MUSIC_TRACKS) {
    this.tracks = tracks.map((track) => ({ ...track, tags: [...track.tags] }));
  }

  async findTracks(query: MusicTrackQuery): Promise<MusicTrack[]> {
    const tag = query.tag;
    const tracks =
      tag === undefined || tag === "all"
        ? this.tracks
        : this.tracks.filter((track) => track.tags.includes(tag));
    return tracks.map((track) => ({ ...track, tags: [...track.tags] }));
  }

  async findSelection(userId: string): Promise<MusicLibrarySelectionRecord | undefined> {
    const selection = this.selections.get(userId);
    return selection === undefined ? undefined : cloneSelection(selection);
  }

  async saveSelection(
    input: Omit<MusicLibrarySelectionRecord, "updatedAt">
  ): Promise<MusicLibrarySelectionRecord> {
    const record: MusicLibrarySelectionRecord = {
      ...input,
      recommendedTrackIds: [...new Set(input.recommendedTrackIds)],
      disabledTrackIds: [...new Set(input.disabledTrackIds)],
      updatedAt: new Date().toISOString()
    };
    this.selections.set(record.userId, cloneSelection(record));
    return cloneSelection(record);
  }
}

function cloneSelection(record: MusicLibrarySelectionRecord): MusicLibrarySelectionRecord {
  const clone: MusicLibrarySelectionRecord = {
    userId: record.userId,
    userProfileId: record.userProfileId,
    recommendedTrackIds: [...record.recommendedTrackIds],
    disabledTrackIds: [...record.disabledTrackIds],
    updatedByUserId: record.updatedByUserId,
    updatedAt: record.updatedAt
  };
  if (record.organizationId !== undefined) {
    clone.organizationId = record.organizationId;
  }
  return clone;
}

const DEFAULT_MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "track-soft-focus-pulse",
    title: "柔和注意准备",
    duration: 320,
    bpm: 72,
    tags: ["focus", "rhythm"],
    intensityLevel: 2,
    recommendedScene: "训练前 3-5 分钟注意准备",
    contraindicationNote: "如对持续节拍感到不适，请选择更轻柔素材。",
    fileUrl: "https://assets.example.test/music/soft-focus-pulse.mp3"
  },
  {
    id: "track-evening-breath",
    title: "呼吸放松引导",
    duration: 480,
    bpm: null,
    tags: ["relax", "nature"],
    intensityLevel: 1,
    recommendedScene: "训练后放松恢复",
    contraindicationNote: "如用户表示困倦明显，可缩短使用时长。",
    fileUrl: "https://assets.example.test/music/evening-breath.mp3"
  },
  {
    id: "track-step-guide-rhythm",
    title: "慢速节律导航",
    duration: 420,
    bpm: 88,
    tags: ["rhythm", "focus"],
    intensityLevel: 3,
    recommendedScene: "节律导航基础训练",
    contraindicationNote: "如节拍压力较大，请降低音量或改用低强度素材。",
    fileUrl: "https://assets.example.test/music/step-guide-rhythm.mp3"
  },
  {
    id: "track-rain-room",
    title: "雨声安静空间",
    duration: 600,
    bpm: null,
    tags: ["nature", "relax"],
    intensityLevel: 1,
    recommendedScene: "安静任务间歇或冷静过渡",
    contraindicationNote: "如用户不喜欢雨声，可替换为其他自然声。",
    fileUrl: "https://assets.example.test/music/rain-room.mp3"
  },
  {
    id: "track-calm-noise-band",
    title: "低强度白噪声",
    duration: 540,
    bpm: null,
    tags: ["white_noise"],
    intensityLevel: 2,
    recommendedScene: "低干扰背景遮蔽",
    contraindicationNote: "如用户对持续噪声敏感，请不要使用。",
    fileUrl: "https://assets.example.test/music/calm-noise-band.mp3"
  },
  {
    id: "track-familiar-route",
    title: "个体化熟悉旋律",
    duration: 360,
    bpm: 80,
    tags: ["custom", "relax"],
    intensityLevel: 2,
    recommendedScene: "个体化偏好素材试用",
    contraindicationNote: "使用前请确认用户和监护人接受该素材。",
    fileUrl: "https://assets.example.test/music/familiar-route.mp3"
  }
];
