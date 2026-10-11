export const APP_ERROR_CODES = [
  "VALIDATION_ERROR",
  "AUTHENTICATION_REQUIRED",
  "PERMISSION_DENIED",
  "SENSITIVE_DATA_SCOPE_DENIED",
  "RESOURCE_NOT_FOUND",
  "TRAINING_SESSION_INVALID",
  "EEG_CONNECTION_FAILED",
  "INTERNAL_ERROR"
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export interface AppError {
  code: AppErrorCode;
  message: string;
  details?: Record<string, string | number | boolean>;
}

export function createAppError(
  code: AppErrorCode,
  message: string,
  details?: AppError["details"]
): AppError {
  return details === undefined ? { code, message } : { code, message, details };
}
