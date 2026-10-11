import type { EEGQualityStatus as SharedEEGQualityStatus } from "@neuro-cog-rehab/shared-types";

export type EEGQualityStatus = SharedEEGQualityStatus;

/**
 * EEG feature frame produced by the simulator or gateway for one short window.
 * Scores are normalized to 0-100 unless noted by the gateway adapter.
 */
export interface EEGFeatureFrame {
  timestamp: string;
  attentionScore: number;
  relaxationScore: number;
  fatigueScore: number;
  thetaPower: number;
  alphaPower: number;
  betaPower: number;
  signalQuality: number;
  artifactLevel: number;
}

export type EEGQualityReasonCode =
  | "quality_within_range"
  | "signal_below_good_threshold"
  | "signal_below_usable_threshold"
  | "artifact_above_good_threshold"
  | "artifact_above_noisy_threshold"
  | "no_frame_received"
  | "data_stream_timeout";

export interface EEGQualityRules {
  /** Minimum signalQuality required for a good data-quality label. */
  minGoodSignalQuality: number;
  /** Values below this threshold trigger a stronger headset-fit prompt. */
  minUsableSignalQuality: number;
  /** Artifact levels above this value are unstable but not yet noisy. */
  maxGoodArtifactLevel: number;
  /** Artifact levels at or above this value are marked noisy. */
  noisyArtifactLevel: number;
  /** Missing-data duration before the stream is treated as disconnected. */
  disconnectedAfterMs: number;
}

export interface EEGQualityMetrics {
  signalQuality: number | null;
  artifactLevel: number | null;
  missingDataMs: number;
}

export interface EEGQualityAssessment {
  status: EEGQualityStatus;
  reasonCode: EEGQualityReasonCode;
  /** Operational explanation for training safety and data-quality review. */
  reason: string;
  checkedAt: string;
  lastFrameAt: string | null;
  metrics: EEGQualityMetrics;
}

export const DEFAULT_EEG_QUALITY_RULES: EEGQualityRules = {
  minGoodSignalQuality: 75,
  minUsableSignalQuality: 50,
  maxGoodArtifactLevel: 20,
  noisyArtifactLevel: 55,
  disconnectedAfterMs: 3000
};

export type EEGQualityRuleOverrides = Partial<EEGQualityRules>;
