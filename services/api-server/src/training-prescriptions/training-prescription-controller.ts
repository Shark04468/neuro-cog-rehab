import { AuthModuleError } from "../auth/auth-errors.js";
import type { TrainingPrescriptionService } from "./training-prescription-service.js";
import type {
  TrainingPrescriptionApiRequest,
  TrainingPrescriptionApiResponse,
  TrainingPrescriptionDraftInput,
  TrainingPrescriptionListResult,
  TrainingPrescriptionQuery,
  TrainingPrescriptionRecord
} from "./training-prescription-types.js";

interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

type PrescriptionIdParams = { prescriptionId: string };

export class TrainingPrescriptionController {
  constructor(private readonly service: TrainingPrescriptionService) {}

  async savePrescription(
    request: TrainingPrescriptionApiRequest<TrainingPrescriptionDraftInput>
  ): Promise<TrainingPrescriptionApiResponse<TrainingPrescriptionRecord | ErrorBody>> {
    return this.capture(async () => ({
      status: 200,
      body: await this.service.savePrescription(request.principal, request.body)
    }));
  }

  async readPrescription(
    request: TrainingPrescriptionApiRequest<undefined, PrescriptionIdParams>
  ): Promise<TrainingPrescriptionApiResponse<TrainingPrescriptionRecord | ErrorBody>> {
    return this.capture(async () => ({
      status: 200,
      body: await this.service.readPrescription(request.principal, request.params.prescriptionId)
    }));
  }

  async readActivePrescription(
    request: TrainingPrescriptionApiRequest<undefined, Record<string, string>>
  ): Promise<TrainingPrescriptionApiResponse<TrainingPrescriptionRecord | ErrorBody>> {
    return this.capture(async () => ({
      status: 200,
      body: await this.service.readActivePrescription(
        request.principal,
        request.query.userProfileId ?? ""
      )
    }));
  }

  async listPrescriptions(
    request: TrainingPrescriptionApiRequest<
      undefined,
      Record<string, string>,
      TrainingPrescriptionQuery
    >
  ): Promise<TrainingPrescriptionApiResponse<TrainingPrescriptionListResult | ErrorBody>> {
    return this.capture(async () => ({
      status: 200,
      body: await this.service.listPrescriptions(request.principal, request.query)
    }));
  }

  private async capture<TBody>(
    operation: () => Promise<TrainingPrescriptionApiResponse<TBody>>
  ): Promise<TrainingPrescriptionApiResponse<TBody | ErrorBody>> {
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
            message: "Unexpected training prescription API failure."
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
