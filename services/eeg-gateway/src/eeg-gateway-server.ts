import { once } from "node:events";
import type { IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";

import {
  EEGQualityDetector,
  buildEEGQualityRules,
  type EEGQualityAssessment,
  type EEGQualityRules,
  type EEGQualityRuleOverrides
} from "@neuro-cog-rehab/eeg-features";
import WebSocket, { WebSocketServer } from "ws";

import { EegSessionSummaryAccumulator } from "./eeg-summary.js";
import { consoleEegGatewayLogger, maskIdentifier, type EegGatewayLogger } from "./logger.js";
import {
  DisabledEegSummaryPublisher,
  HttpEegSummaryPublisher,
  type EegSummaryPublisher
} from "./summary-publisher.js";
import type {
  EEGFeatureFrame,
  EegDataSource,
  EegGatewayConnectionAckEvent,
  EegGatewayFrameEvent,
  EegGatewayInboundMessage,
  EegGatewayOutboundEvent,
  EegGatewayRole,
  EegGatewayServerInfo,
  EegGatewaySessionStatus,
  EegGatewaySessionStatusEvent,
  EegGatewaySessionSummary,
  EegQualitySnapshot
} from "./types.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8787;
const DEFAULT_PATH = "/eeg";
const DEFAULT_STALE_AFTER_MS = 2_000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 15_000;
const DEFAULT_STATUS_CHECK_INTERVAL_MS = 1_000;

export interface EegGatewayServerOptions {
  host?: string;
  port?: number;
  path?: string;
  heartbeatIntervalMs?: number;
  statusCheckIntervalMs?: number;
  staleAfterMs?: number;
  disconnectedAfterMs?: number;
  qualityRules?: EEGQualityRuleOverrides;
  summaryEndpoint?: string;
  summaryBearerToken?: string;
  summaryPublisher?: EegSummaryPublisher;
  logger?: EegGatewayLogger;
}

interface ClientConnectionContext {
  connectionId: string;
  role: EegGatewayRole;
  userId: string;
  sessionId: string;
  source: EegDataSource | null;
  isAlive: boolean;
}

interface SessionState {
  userId: string;
  sessionId: string;
  status: EegGatewaySessionStatus;
  createdAt: string;
  source: EegDataSource | null;
  producer: WebSocket | null;
  viewers: Set<WebSocket>;
  sequence: number;
  lastFrameAt: string | null;
  latestQuality: EegQualitySnapshot | null;
  detector: EEGQualityDetector;
  accumulator: EegSessionSummaryAccumulator;
  disconnectRecorded: boolean;
}

export class EegGatewayWebSocketServer {
  private server: WebSocketServer | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private statusTimer: NodeJS.Timeout | null = null;
  private readonly sessions = new Map<string, SessionState>();
  private readonly connections = new Map<WebSocket, ClientConnectionContext>();
  private readonly logger: EegGatewayLogger;
  private readonly summaryPublisher: EegSummaryPublisher;
  private readonly qualityRules: EEGQualityRules;

  constructor(private readonly options: EegGatewayServerOptions = {}) {
    this.logger = options.logger ?? consoleEegGatewayLogger;
    this.summaryPublisher = createSummaryPublisher(options);
    this.qualityRules = buildEEGQualityRules(
      mergeQualityRules(options.qualityRules, options.disconnectedAfterMs)
    );
  }

  async start(): Promise<EegGatewayServerInfo> {
    if (this.server) {
      throw new Error("EEG gateway server is already running.");
    }

    const host = this.options.host ?? DEFAULT_HOST;
    const port = this.options.port ?? DEFAULT_PORT;
    const path = this.options.path ?? DEFAULT_PATH;
    const server = new WebSocketServer({ host, port, path });
    this.server = server;

    server.on("connection", (socket, request) => {
      this.handleConnection(socket, request);
    });

    await once(server, "listening");
    this.startTimers();

    const address = server.address();
    const actualPort = typeof address === "object" && address !== null ? address.port : port;
    const info = {
      host,
      port: actualPort,
      path,
      url: `ws://${host}:${actualPort}${path}`
    };

    this.logger.info("gateway started", { host, port: actualPort, path });
    return info;
  }

  async stop(): Promise<void> {
    this.stopTimers();

    for (const socket of this.connections.keys()) {
      socket.close();
    }
    this.connections.clear();
    this.sessions.clear();

    if (!this.server) {
      return;
    }

    const server = this.server;
    this.server = null;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    this.logger.info("gateway stopped");
  }

  private handleConnection(socket: WebSocket, request: IncomingMessage): void {
    const parseResult = parseConnectionContext(request);
    if ("error" in parseResult) {
      sendEvent(socket, errorEvent(parseResult.code, parseResult.error, true));
      socket.close(1008, parseResult.error);
      return;
    }

    const context: ClientConnectionContext = {
      ...parseResult.context,
      connectionId: randomUUID(),
      isAlive: true
    };
    this.connections.set(socket, context);

    const session = this.getOrCreateSession(context.userId, context.sessionId);
    if (context.role === "producer") {
      this.attachProducer(session, socket, context);
    } else {
      session.viewers.add(socket);
    }

    sendEvent(socket, this.connectionAck(context, session));
    sendEvent(socket, this.sessionStatusEvent(session));
    this.broadcastStatus(session);

    socket.on("message", (data) => {
      this.handleMessage(socket, data.toString()).catch((error: unknown) => {
        this.logger.error("message handling failed", { error: errorMessage(error) });
        sendEvent(
          socket,
          errorEvent("INTERNAL_ERROR", "Failed to process EEG gateway message.", true)
        );
      });
    });

    socket.on("pong", () => {
      const socketContext = this.connections.get(socket);
      if (socketContext) {
        socketContext.isAlive = true;
      }
    });

    socket.on("close", () => {
      this.handleClose(socket);
    });

    socket.on("error", (error) => {
      this.logger.warn("websocket error", {
        role: context.role,
        user: maskIdentifier(context.userId),
        session: maskIdentifier(context.sessionId),
        error: error.message
      });
      this.handleClose(socket);
    });
  }

  private attachProducer(
    session: SessionState,
    socket: WebSocket,
    context: ClientConnectionContext
  ): void {
    if (session.producer && session.producer !== socket) {
      sendEvent(session.producer, errorEvent("PRODUCER_REPLACED", "EEG source reconnected.", true));
      session.producer.close(1012, "Producer reconnected.");
    }

    session.producer = socket;
    session.source = context.source ?? "device";
    session.status = session.lastFrameAt ? "streaming" : "awaiting_source";
    session.disconnectRecorded = false;

    this.logger.info("producer connected", {
      user: maskIdentifier(context.userId),
      session: maskIdentifier(context.sessionId),
      source: session.source
    });
  }

  private async handleMessage(socket: WebSocket, rawMessage: string): Promise<void> {
    const context = this.connections.get(socket);
    if (!context) {
      return;
    }

    const message = parseInboundMessage(rawMessage);
    if (!message) {
      sendEvent(
        socket,
        errorEvent("INVALID_MESSAGE", "Message must be valid EEG gateway JSON.", true)
      );
      return;
    }

    if (message.type === "ping") {
      sendEvent(socket, { type: "pong", serverTime: nowIso() });
      return;
    }

    if (context.role !== "producer") {
      sendEvent(
        socket,
        errorEvent("FORBIDDEN_ROLE", "Only producer connections can send EEG data.", false)
      );
      return;
    }

    if (!messageMatchesContext(message, context)) {
      sendEvent(
        socket,
        errorEvent(
          "SESSION_MISMATCH",
          "Message userId/sessionId does not match the connection.",
          false
        )
      );
      return;
    }

    const session = this.getOrCreateSession(context.userId, context.sessionId);

    if (message.type === "eeg_frame") {
      this.handleFrame(session, context, message.frame);
      return;
    }

    await this.finalizeSession(session, message.completionStatus ?? "completed");
  }

  private handleFrame(
    session: SessionState,
    context: ClientConnectionContext,
    frame: EEGFeatureFrame
  ): void {
    try {
      const quality = qualitySnapshot(session.detector.update(frame));
      session.sequence += 1;
      session.lastFrameAt = frame.timestamp;
      session.latestQuality = quality;
      session.status = quality.status === "disconnected" ? "disconnected" : "streaming";
      const source = context.source ?? session.source ?? "device";
      session.source = source;
      session.disconnectRecorded = false;
      session.accumulator.addFrame(frame, quality);

      const event: EegGatewayFrameEvent = {
        type: "eeg_frame",
        userId: session.userId,
        sessionId: session.sessionId,
        sequence: session.sequence,
        source,
        frame,
        quality
      };

      this.broadcastToViewers(session, event);
      this.broadcastStatus(session);
    } catch (error: unknown) {
      this.logger.warn("invalid EEG frame rejected", {
        user: maskIdentifier(context.userId),
        session: maskIdentifier(context.sessionId),
        error: errorMessage(error)
      });
      sendEvent(
        contextSocket(this.connections, context),
        errorEvent("INVALID_FRAME", errorMessage(error), true)
      );
    }
  }

  private async finalizeSession(
    session: SessionState,
    completionStatus: EegGatewaySessionSummary["completionStatus"]
  ): Promise<void> {
    session.status = "ended";
    const summary = session.accumulator.toSummary({
      userId: session.userId,
      sessionId: session.sessionId,
      source: session.source,
      createdAt: session.createdAt,
      endedAt: nowIso(),
      completionStatus
    });

    try {
      await this.summaryPublisher.publish(summary);
      this.broadcastToSession(session, {
        type: "eeg_summary_saved",
        userId: session.userId,
        sessionId: session.sessionId,
        summary,
        saved: true,
        serverTime: nowIso()
      });
      this.logger.info("summary published", {
        user: maskIdentifier(session.userId),
        session: maskIdentifier(session.sessionId),
        frameCount: summary.frameCount
      });
    } catch (error: unknown) {
      this.logger.error("summary publish failed", {
        user: maskIdentifier(session.userId),
        session: maskIdentifier(session.sessionId),
        error: errorMessage(error)
      });
      this.broadcastToSession(
        session,
        errorEvent("SUMMARY_PUBLISH_FAILED", "Failed to save EEG summary to backend API.", true)
      );
    }

    this.broadcastStatus(session);
  }

  private handleClose(socket: WebSocket): void {
    const context = this.connections.get(socket);
    if (!context) {
      return;
    }
    this.connections.delete(socket);

    const session = this.sessions.get(sessionKey(context.userId, context.sessionId));
    if (!session) {
      return;
    }

    if (context.role === "producer" && session.producer === socket) {
      session.producer = null;
      if (session.status !== "ended") {
        session.status = "disconnected";
        session.latestQuality = disconnectedQuality("Producer connection closed.");
        this.recordDisconnectOnce(session, session.latestQuality.checkedAt);
      }
      this.logger.warn("producer disconnected", {
        user: maskIdentifier(context.userId),
        session: maskIdentifier(context.sessionId)
      });
    } else {
      session.viewers.delete(socket);
    }

    this.broadcastStatus(session);
  }

  private getOrCreateSession(userId: string, sessionId: string): SessionState {
    const key = sessionKey(userId, sessionId);
    const existing = this.sessions.get(key);
    if (existing) {
      return existing;
    }

    const session: SessionState = {
      userId,
      sessionId,
      status: "awaiting_source",
      createdAt: nowIso(),
      source: null,
      producer: null,
      viewers: new Set<WebSocket>(),
      sequence: 0,
      lastFrameAt: null,
      latestQuality: null,
      detector: new EEGQualityDetector(this.qualityRules),
      accumulator: new EegSessionSummaryAccumulator(),
      disconnectRecorded: false
    };
    this.sessions.set(key, session);
    return session;
  }

  private connectionAck(
    context: ClientConnectionContext,
    session: SessionState
  ): EegGatewayConnectionAckEvent {
    return {
      type: "connection_ack",
      connectionId: context.connectionId,
      role: context.role,
      userId: context.userId,
      sessionId: context.sessionId,
      status: session.status,
      serverTime: nowIso()
    };
  }

  private sessionStatusEvent(session: SessionState): EegGatewaySessionStatusEvent {
    return {
      type: "session_status",
      userId: session.userId,
      sessionId: session.sessionId,
      status: session.status,
      viewerCount: session.viewers.size,
      hasProducer: session.producer !== null,
      lastFrameAt: session.lastFrameAt,
      source: session.source,
      quality: session.latestQuality,
      serverTime: nowIso()
    };
  }

  private broadcastStatus(session: SessionState): void {
    this.broadcastToSession(session, this.sessionStatusEvent(session));
  }

  private broadcastToViewers(session: SessionState, event: EegGatewayOutboundEvent): void {
    for (const viewer of session.viewers) {
      sendEvent(viewer, event);
    }
  }

  private broadcastToSession(session: SessionState, event: EegGatewayOutboundEvent): void {
    if (session.producer) {
      sendEvent(session.producer, event);
    }
    this.broadcastToViewers(session, event);
  }

  private startTimers(): void {
    const heartbeatIntervalMs = this.options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
    if (heartbeatIntervalMs > 0) {
      this.heartbeatTimer = setInterval(() => {
        this.checkHeartbeats();
      }, heartbeatIntervalMs);
    }

    const statusCheckIntervalMs =
      this.options.statusCheckIntervalMs ?? DEFAULT_STATUS_CHECK_INTERVAL_MS;
    if (statusCheckIntervalMs > 0) {
      this.statusTimer = setInterval(() => {
        this.checkSessionFreshness();
      }, statusCheckIntervalMs);
    }
  }

  private stopTimers(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.statusTimer) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }
  }

  private checkHeartbeats(): void {
    for (const [socket, context] of this.connections.entries()) {
      if (!context.isAlive) {
        socket.terminate();
        this.handleClose(socket);
        continue;
      }

      context.isAlive = false;
      socket.ping();
    }
  }

  private checkSessionFreshness(): void {
    const staleAfterMs = this.options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
    const nowMs = Date.now();

    for (const session of this.sessions.values()) {
      if (session.status === "ended" || !session.producer) {
        continue;
      }

      const referenceTimeMs = session.lastFrameAt
        ? Date.parse(session.lastFrameAt)
        : Date.parse(session.createdAt);
      const elapsedMs = nowMs - referenceTimeMs;

      if (elapsedMs >= this.qualityRules.disconnectedAfterMs) {
        const quality = session.lastFrameAt
          ? qualitySnapshot(session.detector.checkTimeout(new Date(nowMs)))
          : disconnectedQuality("No EEG feature frame has been received from the source.");
        if (session.status !== "disconnected") {
          session.status = "disconnected";
          session.latestQuality = quality;
          this.recordDisconnectOnce(session, quality.checkedAt);
          this.broadcastStatus(session);
        }
        continue;
      }

      if (elapsedMs >= staleAfterMs && session.status === "streaming") {
        session.status = "stale";
        this.broadcastStatus(session);
      }
    }
  }

  private recordDisconnectOnce(session: SessionState, occurredAt: string): void {
    if (session.disconnectRecorded) {
      return;
    }

    session.disconnectRecorded = true;
    session.accumulator.recordDisconnect(occurredAt);
  }
}

function parseConnectionContext(request: IncomingMessage):
  | {
      context: Omit<ClientConnectionContext, "connectionId" | "isAlive">;
    }
  | { error: string; code: string } {
  const url = new URL(request.url ?? "", "ws://localhost");
  const userId = url.searchParams.get("userId")?.trim();
  const sessionId = url.searchParams.get("sessionId")?.trim();
  const role = parseRole(url.searchParams.get("role"));
  const source = parseSource(url.searchParams.get("source"));

  if (!userId || !sessionId) {
    return { error: "userId and sessionId query parameters are required.", code: "MISSING_SCOPE" };
  }

  if (!role) {
    return { error: "role must be either producer or viewer.", code: "INVALID_ROLE" };
  }

  if (role === "producer" && !source) {
    return {
      error: "producer connections require source=simulator or source=device.",
      code: "INVALID_SOURCE"
    };
  }

  return {
    context: {
      role,
      userId,
      sessionId,
      source
    }
  };
}

function parseInboundMessage(rawMessage: string): EegGatewayInboundMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || typeof parsed.type !== "string") {
    return null;
  }

  if (parsed.type === "ping") {
    return { type: "ping" };
  }

  if (parsed.type === "session_end") {
    const completionStatus = parseCompletionStatus(parsed.completionStatus);
    return {
      type: "session_end",
      ...(typeof parsed.userId === "string" ? { userId: parsed.userId } : {}),
      ...(typeof parsed.sessionId === "string" ? { sessionId: parsed.sessionId } : {}),
      ...(completionStatus ? { completionStatus } : {}),
      ...(typeof parsed.reason === "string" ? { reason: parsed.reason } : {})
    };
  }

  if (parsed.type === "eeg_frame" && isRecord(parsed.frame)) {
    const source = parseSource(parsed.source);
    const message: EegGatewayInboundMessage = {
      type: "eeg_frame",
      frame: parsed.frame as unknown as EEGFeatureFrame,
      ...(typeof parsed.userId === "string" ? { userId: parsed.userId } : {}),
      ...(typeof parsed.sessionId === "string" ? { sessionId: parsed.sessionId } : {}),
      ...(source ? { source } : {})
    };
    return message;
  }

  return null;
}

function messageMatchesContext(
  message: Exclude<EegGatewayInboundMessage, { type: "ping" }>,
  context: ClientConnectionContext
): boolean {
  return (
    (message.userId === undefined || message.userId === context.userId) &&
    (message.sessionId === undefined || message.sessionId === context.sessionId)
  );
}

function parseRole(value: string | null): EegGatewayRole | null {
  return value === "producer" || value === "viewer" ? value : null;
}

function parseSource(value: unknown): EegDataSource | null {
  return value === "simulator" || value === "device" ? value : null;
}

function parseCompletionStatus(
  value: unknown
): EegGatewaySessionSummary["completionStatus"] | undefined {
  return value === "completed" ||
    value === "partial" ||
    value === "abandoned" ||
    value === "interrupted"
    ? value
    : undefined;
}

function mergeQualityRules(
  qualityRules: EEGQualityRuleOverrides | undefined,
  disconnectedAfterMs: number | undefined
): EEGQualityRuleOverrides {
  return {
    ...qualityRules,
    ...(disconnectedAfterMs === undefined ? {} : { disconnectedAfterMs })
  };
}

function createSummaryPublisher(options: EegGatewayServerOptions): EegSummaryPublisher {
  if (options.summaryPublisher) {
    return options.summaryPublisher;
  }

  if (options.summaryEndpoint) {
    return new HttpEegSummaryPublisher({
      endpoint: options.summaryEndpoint,
      ...(options.summaryBearerToken ? { bearerToken: options.summaryBearerToken } : {})
    });
  }

  return new DisabledEegSummaryPublisher();
}

function qualitySnapshot(assessment: EEGQualityAssessment): EegQualitySnapshot {
  return {
    status: assessment.status,
    reasonCode: assessment.reasonCode,
    reason: assessment.reason,
    checkedAt: assessment.checkedAt
  };
}

function disconnectedQuality(reason: string): EegQualitySnapshot {
  return {
    status: "disconnected",
    reasonCode: "data_stream_timeout",
    reason,
    checkedAt: nowIso()
  };
}

function errorEvent(code: string, message: string, retryable: boolean): EegGatewayOutboundEvent {
  return {
    type: "eeg_error",
    code,
    message,
    retryable,
    serverTime: nowIso()
  };
}

function sendEvent(socket: WebSocket | null, event: EegGatewayOutboundEvent): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(event));
}

function contextSocket(
  connections: Map<WebSocket, ClientConnectionContext>,
  context: ClientConnectionContext
): WebSocket | null {
  for (const [socket, socketContext] of connections.entries()) {
    if (socketContext.connectionId === context.connectionId) {
      return socket;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sessionKey(userId: string, sessionId: string): string {
  return `${userId}:${sessionId}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected EEG gateway error.";
}
