import type { AppShellEEGStatus } from "@neuro-cog-rehab/ui-components";

export type EegGatewaySignalQuality = "good" | "unstable" | "noisy" | "disconnected";

export interface EegGatewayFeatureFrame {
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

export interface EegGatewayQualitySnapshot {
  status: EegGatewaySignalQuality;
  reasonCode: string;
  reason: string;
  checkedAt: string;
}

export interface EegGatewayFrameEvent {
  type: "eeg_frame";
  userId: string;
  sessionId: string;
  sequence: number;
  source: "simulator" | "device";
  frame: EegGatewayFeatureFrame;
  quality: EegGatewayQualitySnapshot;
}

export interface EegGatewayConnectionAckEvent {
  type: "connection_ack";
  connectionId: string;
  role: "producer" | "viewer";
  userId: string;
  sessionId: string;
  status: "awaiting_source" | "streaming" | "stale" | "disconnected" | "ended";
  serverTime: string;
}

export interface EegGatewaySessionStatusEvent {
  type: "session_status";
  userId: string;
  sessionId: string;
  status: "awaiting_source" | "streaming" | "stale" | "disconnected" | "ended";
  viewerCount: number;
  hasProducer: boolean;
  lastFrameAt: string | null;
  source: "simulator" | "device" | null;
  quality: EegGatewayQualitySnapshot | null;
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

export type EegGatewayOutboundEvent =
  | EegGatewayConnectionAckEvent
  | EegGatewaySessionStatusEvent
  | EegGatewayFrameEvent
  | EegGatewayErrorEvent
  | EegGatewayPongEvent;

export interface EegGatewayViewerUrlInput {
  baseUrl: string | null | undefined;
  userId: string;
  sessionId: string;
}

export function getConfiguredEegGatewayBaseUrl(
  env: Record<string, unknown>
): string | null {
  const rawValue = env.VITE_EEG_GATEWAY_URL ?? env.VITE_EEG_GATEWAY_WS_URL;
  return typeof rawValue === "string" && rawValue.trim().length > 0 ? rawValue.trim() : null;
}

export function buildEegGatewayViewerUrl(input: EegGatewayViewerUrlInput): string | null {
  if (input.baseUrl === null || input.baseUrl === undefined || input.baseUrl.trim().length === 0) {
    return null;
  }

  if (input.userId.trim().length === 0 || input.sessionId.trim().length === 0) {
    throw new EegGatewayClientError("EEG gateway viewer requires userId and sessionId.");
  }

  const normalizedBaseUrl = normalizeGatewayBaseUrl(input.baseUrl);
  const url = new URL(normalizedBaseUrl);

  if (url.protocol === "http:") {
    url.protocol = "ws:";
  }
  if (url.protocol === "https:") {
    url.protocol = "wss:";
  }
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new EegGatewayClientError("EEG gateway URL must use ws, wss, http, or https.");
  }

  if (url.pathname === "/" || url.pathname.trim().length === 0) {
    url.pathname = "/eeg";
  }

  url.searchParams.set("role", "viewer");
  url.searchParams.set("userId", input.userId);
  url.searchParams.set("sessionId", input.sessionId);

  return url.toString();
}

export function parseEegGatewayOutboundEvent(rawPayload: string): EegGatewayOutboundEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPayload);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || typeof parsed.type !== "string") {
    return null;
  }

  switch (parsed.type) {
    case "connection_ack":
    case "session_status":
    case "eeg_frame":
    case "eeg_error":
    case "pong":
      return parsed as EegGatewayOutboundEvent;
    default:
      return null;
  }
}

export function mapEegGatewayEventToAppShellStatus(
  event: EegGatewayOutboundEvent,
  receivedAtMs: number = Date.now()
): AppShellEEGStatus {
  if (event.type === "eeg_frame") {
    const latencyMs = calculateLatencyMs(event.frame.timestamp, receivedAtMs);
    return {
      connectionStatus: event.quality.status === "good" ? "connected" : "unstable",
      signalQuality: event.quality.status,
      attentionScore: normalizeScore(event.frame.attentionScore),
      relaxationScore: normalizeScore(event.frame.relaxationScore),
      fatigueScore: normalizeScore(event.frame.fatigueScore),
      latencyMs,
      statusText: buildQualityStatusText(event.quality.status, event.quality.reason)
    };
  }

  if (event.type === "session_status") {
    const signalQuality = event.quality?.status ?? mapSessionStatusToSignalQuality(event.status);
    return {
      connectionStatus: mapSessionStatusToConnectionStatus(event.status, event.hasProducer),
      signalQuality,
      attentionScore: null,
      relaxationScore: null,
      fatigueScore: null,
      latencyMs: event.lastFrameAt === null ? null : calculateLatencyMs(event.lastFrameAt, receivedAtMs),
      statusText: buildSessionStatusText(event.status, event.hasProducer, event.quality?.reason)
    };
  }

  if (event.type === "connection_ack") {
    return {
      connectionStatus: event.status === "streaming" ? "connected" : "unstable",
      signalQuality: mapSessionStatusToSignalQuality(event.status),
      attentionScore: null,
      relaxationScore: null,
      fatigueScore: null,
      latencyMs: null,
      statusText: event.status === "streaming" ? "EEG 数据流已连接" : "正在等待 EEG 数据"
    };
  }

  if (event.type === "eeg_error") {
    return disconnectedEegStatus(`EEG 连接提示：${event.message}`);
  }

  return {
    connectionStatus: "connected",
    signalQuality: "good",
    attentionScore: null,
    relaxationScore: null,
    fatigueScore: null,
    latencyMs: null,
    statusText: "EEG 数据连接正常"
  };
}

export function connectingEegStatus(): AppShellEEGStatus {
  return {
    connectionStatus: "unstable",
    signalQuality: "unstable",
    attentionScore: null,
    relaxationScore: null,
    fatigueScore: null,
    latencyMs: null,
    statusText: "正在连接 EEG 数据流"
  };
}

export function disconnectedEegStatus(statusText = "EEG 数据流未连接"): AppShellEEGStatus {
  return {
    connectionStatus: "disconnected",
    signalQuality: "disconnected",
    attentionScore: null,
    relaxationScore: null,
    fatigueScore: null,
    latencyMs: null,
    statusText
  };
}

export class EegGatewayClientError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "EegGatewayClientError";
  }
}

function normalizeGatewayBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `ws://${trimmed}`;
}

function mapSessionStatusToSignalQuality(
  status: EegGatewaySessionStatusEvent["status"] | EegGatewayConnectionAckEvent["status"]
): EegGatewaySignalQuality {
  switch (status) {
    case "streaming":
      return "good";
    case "stale":
    case "awaiting_source":
      return "unstable";
    case "disconnected":
    case "ended":
      return "disconnected";
    default:
      return "unstable";
  }
}

function mapSessionStatusToConnectionStatus(
  status: EegGatewaySessionStatusEvent["status"],
  hasProducer: boolean
): AppShellEEGStatus["connectionStatus"] {
  if (status === "streaming" && hasProducer) {
    return "connected";
  }
  if (status === "disconnected" || status === "ended") {
    return "disconnected";
  }

  return "unstable";
}

function buildQualityStatusText(status: EegGatewaySignalQuality, reason: string): string {
  switch (status) {
    case "good":
      return "EEG 信号稳定，可继续训练";
    case "unstable":
      return reason.length > 0 ? reason : "EEG 信号不稳定，请轻微调整佩戴";
    case "noisy":
      return reason.length > 0 ? reason : "EEG 干扰较多，请保持头戴设备稳定";
    case "disconnected":
      return "EEG 数据流已断开，请重新连接设备";
    default:
      return "EEG 状态正在更新";
  }
}

function buildSessionStatusText(
  status: EegGatewaySessionStatusEvent["status"],
  hasProducer: boolean,
  qualityReason?: string
): string {
  if (status === "streaming" && hasProducer) {
    return qualityReason ?? "EEG 数据流正在更新";
  }
  if (status === "awaiting_source") {
    return "正在等待 EEG 设备或模拟器数据";
  }
  if (status === "stale") {
    return "EEG 数据更新变慢，请确认连接状态";
  }
  if (status === "ended") {
    return "EEG 会话已结束";
  }

  return "EEG 数据流未连接";
}

function calculateLatencyMs(timestamp: string, receivedAtMs: number): number | null {
  const eventTime = Date.parse(timestamp);
  if (!Number.isFinite(eventTime)) {
    return null;
  }

  return Math.max(0, Math.round(receivedAtMs - eventTime));
}

function normalizeScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
