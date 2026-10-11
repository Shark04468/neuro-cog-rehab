export interface EegGatewayLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export const consoleEegGatewayLogger: EegGatewayLogger = {
  info(message, context) {
    console.info(formatLog("info", message, context));
  },
  warn(message, context) {
    console.warn(formatLog("warn", message, context));
  },
  error(message, context) {
    console.error(formatLog("error", message, context));
  }
};

export function maskIdentifier(value: string): string {
  if (value.length <= 4) {
    return "****";
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function formatLog(
  level: "info" | "warn" | "error",
  message: string,
  context?: Record<string, unknown>
): string {
  const base = `[eeg-gateway] ${level}: ${message}`;
  return context ? `${base} ${JSON.stringify(context)}` : base;
}
