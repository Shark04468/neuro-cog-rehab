import { AuthModuleError } from "../auth/auth-errors.js";
import type { ReportService } from "./report-service.js";
import type {
  CreateReportInput,
  ReportApiRequest,
  ReportApiResponse,
  ReportListResult,
  ReportQuery,
  ReportRecord
} from "./report-types.js";

interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

type ReportIdParams = { reportId: string };

export class ReportController {
  constructor(private readonly service: ReportService) {}

  async createReport(
    request: ReportApiRequest<CreateReportInput>
  ): Promise<ReportApiResponse<ReportRecord | ErrorBody>> {
    return this.capture(async () => ({
      status: 201,
      body: await this.service.createReport(request.principal, request.body)
    }));
  }

  async readReport(
    request: ReportApiRequest<undefined, ReportIdParams>
  ): Promise<ReportApiResponse<ReportRecord | ErrorBody>> {
    return this.capture(async () => ({
      status: 200,
      body: await this.service.readReport(request.principal, request.params.reportId)
    }));
  }

  async listReports(
    request: ReportApiRequest<undefined, Record<string, string>, ReportQuery>
  ): Promise<ReportApiResponse<ReportListResult | ErrorBody>> {
    return this.capture(async () => ({
      status: 200,
      body: await this.service.listReports(request.principal, request.query)
    }));
  }

  private async capture<TBody>(
    operation: () => Promise<ReportApiResponse<TBody>>
  ): Promise<ReportApiResponse<TBody | ErrorBody>> {
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
            message: "Unexpected report API failure."
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
