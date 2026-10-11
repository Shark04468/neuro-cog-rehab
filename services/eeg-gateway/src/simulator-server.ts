import { once } from "node:events";

import WebSocket, { WebSocketServer } from "ws";

import { EegFrameGenerator, isEegSimulatorState } from "./frame-generator.js";
import type {
  EegSimulatorServerInfo,
  EegSimulatorServerOptions,
  EegSimulatorState
} from "./types.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8787;
const DEFAULT_PATH = "/eeg";
const DEFAULT_INTERVAL_MS = 1000;

interface ClientContext {
  generator: EegFrameGenerator;
  timer: NodeJS.Timeout;
}

/**
 * WebSocket EEG simulator. Each connected client receives one synthetic
 * EEGFeatureFrame per interval. Clients can select a state via query string or
 * a small JSON control message.
 */
export class EegSimulatorWebSocketServer {
  private server: WebSocketServer | undefined;
  private readonly clients = new Map<WebSocket, ClientContext>();

  constructor(private readonly options: EegSimulatorServerOptions = {}) {}

  async start(): Promise<EegSimulatorServerInfo> {
    if (this.server) {
      throw new Error("EEG simulator server is already running.");
    }

    const host = this.options.host ?? DEFAULT_HOST;
    const port = this.options.port ?? DEFAULT_PORT;
    const path = this.options.path ?? DEFAULT_PATH;
    const server = new WebSocketServer({ host, port, path });
    this.server = server;

    server.on("connection", (socket, request) => {
      this.handleConnection(socket, request.url);
    });

    await once(server, "listening");
    const address = server.address();
    const actualPort = typeof address === "object" && address !== null ? address.port : port;

    return {
      host,
      port: actualPort,
      path,
      url: `ws://${host}:${actualPort}${path}`
    };
  }

  async stop(): Promise<void> {
    for (const [socket, context] of this.clients.entries()) {
      clearInterval(context.timer);
      socket.close();
      this.clients.delete(socket);
    }

    if (!this.server) {
      return;
    }

    const server = this.server;
    this.server = undefined;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private handleConnection(socket: WebSocket, requestUrl: string | undefined): void {
    const initialState = stateFromRequestUrl(requestUrl) ?? this.options.state ?? "focused";
    const generatorOptions = {
      state: initialState,
      ...(this.options.random ? { random: this.options.random } : {})
    };
    const generator = new EegFrameGenerator(generatorOptions);
    const intervalMs = this.options.intervalMs ?? DEFAULT_INTERVAL_MS;

    const emitFrame = () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(generator.nextFrame()));
      }
    };

    if (this.options.emitImmediately ?? true) {
      emitFrame();
    }

    const timer = setInterval(emitFrame, intervalMs);
    this.clients.set(socket, { generator, timer });

    socket.on("message", (data) => {
      this.handleClientMessage(socket, data.toString());
    });

    socket.on("close", () => {
      const context = this.clients.get(socket);
      if (context) {
        clearInterval(context.timer);
      }
      this.clients.delete(socket);
    });

    socket.on("error", () => {
      const context = this.clients.get(socket);
      if (context) {
        clearInterval(context.timer);
      }
      this.clients.delete(socket);
    });
  }

  private handleClientMessage(socket: WebSocket, rawMessage: string): void {
    const context = this.clients.get(socket);
    if (!context) {
      return;
    }

    const message = parseControlMessage(rawMessage);
    if (!message) {
      sendError(socket, "Invalid control message.");
      return;
    }

    context.generator.setState(message.state);
  }
}

function stateFromRequestUrl(requestUrl: string | undefined): EegSimulatorState | undefined {
  if (!requestUrl) {
    return undefined;
  }

  const url = new URL(requestUrl, "ws://localhost");
  const state = url.searchParams.get("state");
  return isEegSimulatorState(state) ? state : undefined;
}

function parseControlMessage(rawMessage: string): { state: EegSimulatorState } | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    return undefined;
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "type" in parsed &&
    "state" in parsed &&
    parsed.type === "set_state" &&
    isEegSimulatorState(parsed.state)
  ) {
    return { state: parsed.state };
  }

  return undefined;
}

function sendError(socket: WebSocket, message: string): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(
      JSON.stringify({
        type: "error",
        message
      })
    );
  }
}
