import { AuthModuleError } from "../auth/auth-errors.js";
import type { TrainingRecordService } from "./training-record-service.js";
import type {
  CreateTrainingRecordInput,
  TrainingRecord,
  TrainingRecordApiRequest,
  TrainingRecordApiResponse,
  TrainingRecordListResult,
  TrainingRecordQuery
} from "./training-record-types.js";

interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

/**
 * HTTP-like controller for training record endpoints. A concrete HTTP adapter can
 * map these methods to POST /training-records and GET /training-records.
 */
export class TrainingRecordController {
  constructor(private readonly service: TrainingRecordService) {}

  async createTrainingRecord(
    request: TrainingRecordApiRequest<CreateTrainingRecordInput>
  ): Promise<TrainingRecordApiResponse<TrainingRecord | ErrorBody>> {
    return this.capture(async () => ({
      status: 201,
      body: await this.service.createRecord(request.principal, request.body)
    }));
  }

  async listTrainingRecords(
    request: TrainingRecordApiRequest<undefined, Record<string, string>, TrainingRecordQuery>
  ): Promise<TrainingRecordApiResponse<TrainingRecordListResult | ErrorBody>> {
    return this.capture(async () => ({
      status: 200,
      body: await this.service.listRecords(request.principal, request.query)
    }));
  }

  private async capture<TBody>(
    operation: () => Promise<TrainingRecordApiResponse<TBody>>
  ): Promise<TrainingRecordApiResponse<TBody | ErrorBody>> {
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
            message: "Unexpected training record API failure."
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
