import type {
  EEGQualityStatus,
  MusicTherapyPurpose,
  MusicTherapySession,
  MusicTrack
} from "@neuro-cog-rehab/shared-types";

import type { EEGDeviceConnectionStatus } from "./eeg-status-panel-model.js";

export type MusicTherapyTrainingPhase = "intro" | "baseline" | "music" | "completed";

export interface MusicTherapyEegSnapshot {
  connectionStatus: EEGDeviceConnectionStatus;
  qualityStatus: EEGQualityStatus;
  attentionScore: number | null;
  relaxationScore: number | null;
  fatigueScore: number | null;
  latencyMs: number | null;
}

export interface MusicTherapyTrendPoint {
  second: number;
  attentionScore: number;
  relaxationScore: number;
  fatigueScore: number;
}

export interface MusicTherapyTrainingResultInput {
  userId: string;
  trainingSessionId?: string;
  track: MusicTrack;
  purpose: MusicTherapyPurpose;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  plannedDurationSeconds: number;
  volumeLevel: number;
  userComfortRating?: number;
}

export interface MusicTherapyTrainingSummary {
  result: MusicTherapySession;
  averageAttentionScore: number | null;
  averageRelaxationScore: number | null;
  averageFatigueScore: number | null;
  baselineDurationSeconds: number;
  musicDurationSeconds: number;
}

export interface MusicTherapyTrainingPageProps {
  userId: string;
  tracks: MusicTrack[];
  initialTrackId?: string;
  trainingSessionId?: string;
  purpose?: MusicTherapyPurpose;
  baselineDurationSeconds?: number;
  volumeLevel?: number;
  eegSnapshot?: MusicTherapyEegSnapshot;
  onResult?: (summary: MusicTherapyTrainingSummary) => void;
}
