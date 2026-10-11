import { createAppError, type AppError, type AppErrorCode } from "@neuro-cog-rehab/shared-types";

/**
 * Error wrapper used by the auth module so callers can map failures to HTTP responses.
 */
export class AuthModuleError extends Error {
  readonly appError: AppError;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = "AuthModuleError";
    this.appError = createAppError(code, message);
  }
}

export function requireCondition(condition: boolean, code: AppErrorCode, message: string): void {
  if (!condition) {
    throw new AuthModuleError(code, message);
  }
}
