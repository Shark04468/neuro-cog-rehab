import { createApiHttpServer } from "./http-server.js";

const port = parsePort(process.env.API_PORT ?? process.env.PORT, 3001);
const host = process.env.API_HOST ?? "127.0.0.1";

const server = createApiHttpServer();

server.listen(port, host, () => {
  console.log(`api-server listening on http://${host}:${port}`);
  console.log(`storage mode: ${describeStorageMode()}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      process.exit(0);
    });
  });
}

function parsePort(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function describeStorageMode(): string {
  if (process.env.API_STORAGE_MODE === "postgres") {
    return "postgres";
  }
  if (!process.env.API_STORAGE_MODE && process.env.API_DATABASE_URL) {
    return "postgres";
  }
  return "in_memory";
}
