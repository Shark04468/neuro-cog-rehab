import { EegGatewayWebSocketServer } from "./eeg-gateway-server.js";
import { isEegSimulatorState } from "./frame-generator.js";
import { EegSimulatorWebSocketServer } from "./simulator-server.js";
import type { EegSimulatorState } from "./types.js";

const DEFAULT_PORT = 8787;

type ServerMode = "gateway" | "simulator";

async function main(): Promise<void> {
  const cliOptions = parseCliOptions(process.argv.slice(2));
  const mode = cliOptions.mode ?? parseMode(process.env.EEG_GATEWAY_MODE) ?? "gateway";

  if (mode === "simulator") {
    await startSimulator(cliOptions);
    return;
  }

  await startGateway(cliOptions);
}

async function startGateway(cliOptions: CliOptions): Promise<void> {
  const host = cliOptions.host ?? process.env.EEG_GATEWAY_HOST ?? "127.0.0.1";
  const port = cliOptions.port ?? parsePort(process.env.EEG_GATEWAY_PORT) ?? DEFAULT_PORT;
  const path = cliOptions.path ?? process.env.EEG_GATEWAY_PATH ?? "/eeg";
  const summaryEndpoint =
    cliOptions.summaryEndpoint ?? emptyToUndefined(process.env.EEG_SUMMARY_ENDPOINT);
  const summaryBearerToken =
    cliOptions.summaryBearerToken ?? emptyToUndefined(process.env.EEG_SUMMARY_BEARER_TOKEN);

  const server = new EegGatewayWebSocketServer({
    host,
    port,
    path,
    ...(summaryEndpoint ? { summaryEndpoint } : {}),
    ...(summaryBearerToken ? { summaryBearerToken } : {})
  });

  const info = await server.start();
  console.log(`EEG gateway listening at ${info.url}.`);
  installStopHandlers(server);
}

async function startSimulator(cliOptions: CliOptions): Promise<void> {
  const envState = process.env.EEG_SIMULATOR_STATE;
  const state = cliOptions.state ?? parseState(envState) ?? "focused";
  const port = cliOptions.port ?? parsePort(process.env.EEG_SIMULATOR_PORT) ?? DEFAULT_PORT;

  const server = new EegSimulatorWebSocketServer({
    host: cliOptions.host ?? process.env.EEG_SIMULATOR_HOST ?? "127.0.0.1",
    port,
    path: cliOptions.path ?? process.env.EEG_SIMULATOR_PATH ?? "/eeg",
    state
  });

  const info = await server.start();
  console.log(`EEG simulator listening at ${info.url} with initial state "${state}".`);
  installStopHandlers(server);
}

interface StoppableServer {
  stop(): Promise<void>;
}

interface CliOptions {
  mode?: ServerMode;
  host?: string;
  port?: number;
  path?: string;
  state?: EegSimulatorState;
  summaryEndpoint?: string;
  summaryBearerToken?: string;
}

function parseCliOptions(args: readonly string[]): CliOptions {
  const options: CliOptions = {};
  for (const arg of args) {
    const [key, ...rest] = arg.split("=");
    const value = rest.join("=");
    if (!value) {
      continue;
    }
    if (key === "--mode") {
      const mode = parseMode(value);
      if (mode !== undefined) {
        options.mode = mode;
      }
    }
    if (key === "--host") {
      options.host = value;
    }
    if (key === "--path") {
      options.path = value;
    }
    if (key === "--port") {
      const port = parsePort(value);
      if (port !== undefined) {
        options.port = port;
      }
    }
    if (key === "--state") {
      const state = parseState(value);
      if (state !== undefined) {
        options.state = state;
      }
    }
    if (key === "--summary-endpoint") {
      options.summaryEndpoint = value;
    }
    if (key === "--summary-token") {
      options.summaryBearerToken = value;
    }
  }
  return options;
}

function parseMode(value: string | undefined): ServerMode | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value !== "gateway" && value !== "simulator") {
    throw new Error(`Invalid EEG gateway mode: ${value}`);
  }
  return value;
}

function parsePort(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`Invalid EEG gateway port: ${value}`);
  }
  return parsed;
}

function parseState(value: string | undefined): EegSimulatorState | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isEegSimulatorState(value)) {
    throw new Error(`Invalid EEG simulator state: ${value}`);
  }
  return value;
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  return value;
}

function installStopHandlers(server: StoppableServer): void {
  const stop = async () => {
    await server.stop();
    process.exit(0);
  };
  process.on("SIGINT", () => {
    void stop();
  });
  process.on("SIGTERM", () => {
    void stop();
  });
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unexpected EEG gateway startup failure.";
  console.error(message);
  process.exit(1);
});
