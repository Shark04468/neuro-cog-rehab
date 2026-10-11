import type { MusicTherapySession, MusicTrack } from "@neuro-cog-rehab/shared-types";

import type {
  MusicTherapyEegSnapshot,
  MusicTherapyTrainingPhase,
  MusicTherapyTrainingResultInput,
  MusicTherapyTrainingSummary,
  MusicTherapyTrendPoint
} from "./music-therapy-training-types.js";

const DEFAULT_BASELINE_SECONDS = 60;

export function createMusicTherapySessionResult(
  input: MusicTherapyTrainingResultInput
): MusicTherapySession {
  const completionRate =
    input.plannedDurationSeconds <= 0
      ? 0
      : clamp(input.durationSeconds / input.plannedDurationSeconds, 0, 1);

  return {
    id: `music-session-${stableSessionSuffix(input.userId, input.startedAt)}`,
    userId: input.userId,
    ...(input.trainingSessionId ? { trainingSessionId: input.trainingSessionId } : {}),
    trackId: input.track.id,
    trackTitle: input.track.title,
    purpose: input.purpose,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationSeconds: Math.max(0, Math.round(input.durationSeconds)),
    volumeLevel: clamp(Math.round(input.volumeLevel), 0, 100),
    completionRate: round(completionRate, 3),
    ...(input.userComfortRating ? { userComfortRating: input.userComfortRating } : {})
  };
}

export function createMusicTherapyTrainingSummary(input: {
  resultInput: MusicTherapyTrainingResultInput;
  trendPoints: MusicTherapyTrendPoint[];
  baselineDurationSeconds: number;
}): MusicTherapyTrainingSummary {
  const result = createMusicTherapySessionResult(input.resultInput);

  return {
    result,
    averageAttentionScore: average(input.trendPoints.map((point) => point.attentionScore)),
    averageRelaxationScore: average(input.trendPoints.map((point) => point.relaxationScore)),
    averageFatigueScore: average(input.trendPoints.map((point) => point.fatigueScore)),
    baselineDurationSeconds: Math.max(0, Math.round(input.baselineDurationSeconds)),
    musicDurationSeconds: result.durationSeconds
  };
}

export function shouldPauseMusicTrainingForEeg(snapshot: MusicTherapyEegSnapshot): boolean {
  return snapshot.connectionStatus === "disconnected" || snapshot.qualityStatus === "disconnected";
}

export function musicTherapyEegGuidance(snapshot: MusicTherapyEegSnapshot): string {
  if (snapshot.connectionStatus === "disconnected" || snapshot.qualityStatus === "disconnected") {
    return "EEG 数据暂时中断，训练已暂停。请重新连接后继续。";
  }

  if (snapshot.qualityStatus === "noisy") {
    return "当前动作或接触干扰较多，请先保持舒适坐姿。";
  }

  if (snapshot.qualityStatus === "unstable") {
    return "信号不太稳定，可以轻轻调整头戴设备。";
  }

  return "EEG 状态适合继续本次辅助训练。";
}

export function phaseInstruction(
  phase: MusicTherapyTrainingPhase,
  baselineDurationSeconds = DEFAULT_BASELINE_SECONDS
): string {
  switch (phase) {
    case "intro":
      return "先确认佩戴舒适，选择音量适中的音乐，再开始训练。";
    case "baseline":
      return `请安静坐好，保持自然呼吸，系统将采集 ${baselineDurationSeconds} 秒静息基线。`;
    case "music":
      return "音乐播放中，请保持舒适坐姿，按自己的节奏完成本次训练。";
    case "completed":
      return "本次训练已结束，可查看结果摘要。";
  }
}

export function createMockMusicTherapyEegSnapshot(input: {
  phase: MusicTherapyTrainingPhase;
  elapsedSeconds: number;
  track?: MusicTrack;
}): MusicTherapyEegSnapshot {
  const musicBoost = input.phase === "music" ? 8 : 0;
  const relaxBoost = input.phase === "music" && input.track?.tags.includes("relax") ? 10 : 0;
  const rhythmBoost = input.phase === "music" && input.track?.tags.includes("rhythm") ? 4 : 0;

  return {
    connectionStatus: "connected",
    qualityStatus: "good",
    attentionScore: score(58 + musicBoost + rhythmBoost + Math.sin(input.elapsedSeconds / 5) * 4),
    relaxationScore: score(50 + relaxBoost + Math.cos(input.elapsedSeconds / 6) * 5),
    fatigueScore: score(24 + Math.min(input.elapsedSeconds * 0.04, 12)),
    latencyMs: 420
  };
}

export function createTrendPoint(
  second: number,
  snapshot: MusicTherapyEegSnapshot
): MusicTherapyTrendPoint | null {
  if (
    snapshot.attentionScore === null ||
    snapshot.relaxationScore === null ||
    snapshot.fatigueScore === null
  ) {
    return null;
  }

  return {
    second,
    attentionScore: snapshot.attentionScore,
    relaxationScore: snapshot.relaxationScore,
    fatigueScore: snapshot.fatigueScore
  };
}

export function formatTrainingClock(seconds: number): string {
  const normalized = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(normalized / 60);
  const remainingSeconds = normalized % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 2);
}

function stableSessionSuffix(userId: string, startedAt: string): string {
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "user";
  const safeTime = startedAt.replace(/[^0-9]/g, "").slice(0, 14) || "time";
  return `${safeUser}-${safeTime}`;
}

function score(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
