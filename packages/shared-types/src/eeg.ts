export type EegConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

/**
 * Signal quality status for EEG frames. This describes data quality only and is
 * not a clinical interpretation.
 */
export type EEGQualityStatus = "good" | "unstable" | "noisy" | "disconnected";

/**
 * Feature values extracted from one short EEG time window.
 */
export interface EEGFeatureFrame {
  /** Stable feature frame identifier. */
  id: string;
  /** Training session associated with this EEG frame. */
  sessionId: string;
  /** ISO timestamp for the frame end time. */
  timestamp: string;
  /** Source of the EEG data for audit and debugging. */
  source: "simulator" | "device";
  /** Window size used to compute this frame, in seconds. */
  windowSeconds: number;
  /** Sampling rate reported by the simulator or device. */
  samplingRateHz: number;
  /** Attention reference index normalized by the gateway, typically 0 to 100. */
  attentionIndex: number;
  /** Relaxation reference index normalized by the gateway, typically 0 to 100. */
  relaxationIndex: number;
  /** Signal quality score, typically 0 to 100. */
  signalQuality: number;
  /** Discrete quality status derived from the signal quality and artifact flags. */
  qualityStatus: EEGQualityStatus;
  /** Whether the frame contains movement or signal artifacts. */
  artifactFlag: boolean;
  /** Relative band power features used for trend analysis. */
  bandPower: {
    delta: number;
    theta: number;
    alpha: number;
    beta: number;
    gamma: number;
  };
}

/**
 * Lightweight EEG sample kept for compatibility with early simulator flows.
 */
export interface EegSample {
  sessionId: string;
  timestamp: string;
  attentionIndex: number;
  relaxationIndex: number;
  signalQuality: number;
  qualityStatus?: EEGQualityStatus;
  artifactFlag: boolean;
}

/**
 * Aggregated EEG state summary for one training session.
 */
export interface EegSessionSummary {
  sessionId: string;
  averageAttentionIndex: number;
  averageRelaxationIndex: number;
  validSampleRate: number;
  artifactCount: number;
}
