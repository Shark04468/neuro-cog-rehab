import { AuthModuleError } from "../auth/auth-errors.js";
import type { TrainingDataExportService } from "./training-data-export-service.js";
import type {
  TrainingDataExportApiRequest,
  TrainingDataExportApiResponse,
  TrainingDataExportQuery,
  TrainingDataExportResult
} from "./training-data-export-types.js";

interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

/**
 * HTTP-like controller for POST /training-data-exports/deidentified.
 * Concrete HTTP adapters should pass authenticated principals from the token layer.
 */
export class TrainingDataExportController {
  constructor(private readonly service: TrainingDataExportService) {}

  async exportDeidentifiedTrainingData(
    request: TrainingDataExportApiRequest<
      undefined,
      Record<string, string>,
      TrainingDataExportQuery
    >
  ): Promise<TrainingDataExportApiResponse<TrainingDataExportResult | ErrorBody>> {
    return this.capture(async () => ({
      status: 200,
      body: await this.service.exportDeidentifiedTrainingData(request.principal, request.query)
    }));
  }

  private async capture<TBody>(
    operation: () => Promise<TrainingDataExportApiResponse<TBody>>
  ): Promise<TrainingDataExportApiResponse<TBody | ErrorBody>> {
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
            message: "Unexpected training data export API failure."
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
