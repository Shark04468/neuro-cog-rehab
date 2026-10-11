/**
 * Purpose of a music therapy session inside the auxiliary training flow.
 */
export type MusicTherapyPurpose = "pre_training_relaxation" | "training_support" | "cool_down";

export const MUSIC_TAGS = ["focus", "relax", "rhythm", "nature", "white_noise", "custom"] as const;

export type MusicTag = (typeof MUSIC_TAGS)[number];

/**
 * Music material metadata for auxiliary training selection.
 */
export interface MusicTrack {
  id: string;
  title: string;
  /** Duration in seconds. */
  duration: number;
  /** Beats per minute when the material has a steady rhythm. */
  bpm: number | null;
  tags: MusicTag[];
  /** Relative stimulation intensity from 1 to 5 for training safety review. */
  intensityLevel: 1 | 2 | 3 | 4 | 5;
  /** Non-clinical scene suggestion, such as warm-up or cool-down. */
  recommendedScene: string;
  /** Usage caution shown to therapists and guardians. */
  contraindicationNote: string;
  /** Private or signed media URL; treat as sensitive content metadata. */
  fileUrl: string;
}

/**
 * Record for one music-based auxiliary training session.
 */
export interface MusicTherapySession {
  /** Stable music session identifier. */
  id: string;
  /** Training user id. */
  userId: string;
  /** Linked training session id, when music is part of a full session. */
  trainingSessionId?: string;
  /** Music track identifier selected for this session. */
  trackId: string;
  /** Display title of the selected music track. */
  trackTitle: string;
  /** Non-clinical purpose of the music flow. */
  purpose: MusicTherapyPurpose;
  /** ISO timestamp when playback started. */
  startedAt: string;
  /** ISO timestamp when playback ended. */
  endedAt?: string;
  /** Playback duration in seconds. */
  durationSeconds: number;
  /** Volume level normalized from 0 to 100. */
  volumeLevel: number;
  /** Completion rate normalized from 0 to 1. */
  completionRate: number;
  /** Optional comfort rating, usually normalized from 1 to 5. */
  userComfortRating?: number;
}
