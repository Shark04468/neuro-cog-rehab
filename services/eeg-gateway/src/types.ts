export const EEG_SIMULATOR_STATES = ["focused", "relaxed", "fatigued"] as const;

export type EegSimulatorState = (typeof EEG_SIMULATOR_STATES)[number];

export interface EEGFeatureFrame {
  /** ISO timestamp for this simulated feature frame. */
  timestamp: string;
  /** Attention reference score, normalized from 0 to 100. */
  attentionScore: number;
  /** Relaxation reference score, normalized from 0 to 100. */
  relaxationScore: number;
  /** Fatigue reference score, normalized from 0 to 100. */
  fatigueScore: number;
  /** Simulated theta-band relative power. */
  thetaPower: number;
  /** Simulated alpha-band relative power. */
  alphaPower: number;
  /** Simulated beta-band relative power. */
  betaPower: number;
  /** Signal quality reference score, normalized from 0 to 100. */
  signalQuality: number;
  /** Artifact level reference score, normalized from 0 to 100. */
  artifactLevel: number;
}

export type RandomSource = () => number;

export interface EegFrameGeneratorOptions {
  state?: EegSimulatorState;
  random?: RandomSource;
}

export interface EegSimulatorServerOptions extends EegFrameGeneratorOptions {
  host?: string;
  port?: number;
  path?: string;
  intervalMs?: number;
  emitImmediately?: boolean;
}

export interface EegSimulatorServerInfo {
  host: string;
  port: number;
  path: string;
  url: string;
}

export const EEG_GATEWAY_ROLES = ["producer", "viewer"] as const;
export const EEG_DATA_SOURCES = ["simulator", "device"] as const;

export type EegGatewayRole = (typeof EEG_GATEWAY_ROLES)[number];
export type EegDataSource = (typeof EEG_DATA_SOURCES)[number];

export type EegGatewaySessionStatus =
  | "awaiting_source"
  | "streaming"
  | "stale"
  | "disconnected"
  | "ended";

export interface EegGatewayServerInfo {
  host: string;
  port: number;
  path: string;
  url: string;
}

export interface EegQualitySnapshot {
  status: "good" | "unstable" | "noisy" | "disconnected";
  reasonCode: string;
  reason: string;
  checkedAt: string;
}

export interface EegGatewayFrameEvent {
  type: "eeg_frame";
  userId: string;
  sessionId: string;
  sequence: number;
  source: EegDataSource;
  frame: EEGFeatureFrame;
  quality: EegQualitySnapshot;
}

export interface EegGatewayConnectionAckEvent {
  type: "connection_ack";
  connectionId: string;
  role: EegGatewayRole;
  userId: string;
  sessionId: string;
  status: EegGatewaySessionStatus;
  serverTime: string;
}

export interface EegGatewaySessionStatusEvent {
  type: "session_status";
  userId: string;
  sessionId: string;
  status: EegGatewaySessionStatus;
  viewerCount: number;
  hasProducer: boolean;
  lastFrameAt: string | null;
  source: EegDataSource | null;
  quality: EegQualitySnapshot | null;
  serverTime: string;
}

export interface EegGatewayErrorEvent {
  type: "eeg_error";
  code: string;
  message: string;
  retryable: boolean;
  serverTime: string;
}

export interface EegGatewayPongEvent {
  type: "pong";
  serverTime: string;
}

export interface EegGatewaySummarySavedEvent {
  type: "eeg_summary_saved";
  userId: string;
  sessionId: string;
  summary: EegGatewaySessionSummary;
  saved: boolean;
  serverTime: string;
}

export type EegGatewayOutboundEvent =
  | EegGatewayConnectionAckEvent
  | EegGatewaySessionStatusEvent
  | EegGatewayFrameEvent
  | EegGatewayErrorEvent
  | EegGatewayPongEvent
  | EegGatewaySummarySavedEvent;

export interface EegGatewayFrameMessage {
  type: "eeg_frame";
  userId?: string;
  sessionId?: string;
  source?: EegDataSource;
  frame: EEGFeatureFrame;
}

export interface EegGatewaySessionEndMessage {
  type: "session_end";
  userId?: string;
  sessionId?: string;
  completionStatus?: "completed" | "partial" | "abandoned" | "interrupted";
  reason?: string;
}

export interface EegGatewayPingMessage {
  type: "ping";
}

export type EegGatewayInboundMessage =
  | EegGatewayFrameMessage
  | EegGatewaySessionEndMessage
  | EegGatewayPingMessage;

export interface EegGatewayQualityCounts {
  good: number;
  unstable: number;
  noisy: number;
  disconnected: number;
}

export interface EegGatewaySessionSummary {
  userId: string;
  sessionId: string;
  source: EegDataSource | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  frameCount: number;
  averageAttentionScore: number | null;
  averageRelaxationScore: number | null;
  averageFatigueScore: number | null;
  averageSignalQuality: number | null;
  averageArtifactLevel: number | null;
  latestQualityStatus: EegQualitySnapshot | null;
  qualityCounts: EegGatewayQualityCounts;
  completionStatus: "completed" | "partial" | "abandoned" | "interrupted";
  abnormalEvents: Array<{
    eventType: "low_signal_quality" | "device_disconnect" | "noisy_signal";
    occurredAt: string;
    message: string;
  }>;
}
