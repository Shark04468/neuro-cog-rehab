import { AuthModuleError } from "../auth/auth-errors.js";
import type { OperationLogService } from "./operation-log-service.js";
import type {
  OperationLogApiRequest,
  OperationLogApiResponse,
  OperationLogListResult,
  OperationLogQuery
} from "./operation-log-types.js";

interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

/**
 * HTTP-like controller for GET /operation-logs. It deliberately exposes no
 * update or delete endpoint so ordinary users cannot alter operation logs.
 */
export class OperationLogController {
  constructor(private readonly service: OperationLogService) {}

  async listOperationLogs(
    request: OperationLogApiRequest<undefined, Record<string, string>, OperationLogQuery>
  ): Promise<OperationLogApiResponse<OperationLogListResult | ErrorBody>> {
    return this.capture(async () => ({
      status: 200,
      body: await this.service.listOperationLogs(request.principal, request.query)
    }));
  }

  private async capture<TBody>(
    operation: () => Promise<OperationLogApiResponse<TBody>>
  ): Promise<OperationLogApiResponse<TBody | ErrorBody>> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AuthModuleError) {
        return {
          status: statusFromCode(error.appError.code),
          body: {
            error: {
              code: error.appError.code,
              message: error.appError.message
            }
          }
        };
      }
      return {
        status: 500,
        body: {
          error: {
            code: "INTERNAL_ERROR",
            message: "Unexpected operation log API failure."
          }
        }
      };
    }
  }
}

function statusFromCode(code: string): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 400;
    case "AUTHENTICATION_REQUIRED":
      return 401;
    case "PERMISSION_DENIED":
    case "SENSITIVE_DATA_SCOPE_DENIED":
      return 403;
    case "RESOURCE_NOT_FOUND":
      return 404;
    default:
      return 500;
  }
}
