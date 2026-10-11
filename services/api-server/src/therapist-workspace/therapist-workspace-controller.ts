import { AuthModuleError } from "../auth/auth-errors.js";
import type { AuthenticatedPrincipal } from "../auth/auth-types.js";
import type { TherapistWorkspaceService } from "./therapist-workspace-service.js";
import type {
  TherapistUserDetailSnapshot,
  TherapistWorkspaceApiResponse,
  TherapistWorkspaceSnapshot
} from "./therapist-workspace-types.js";

interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export class TherapistWorkspaceController {
  constructor(private readonly service: TherapistWorkspaceService) {}

  async readDashboard(request: {
    principal: AuthenticatedPrincipal;
  }): Promise<TherapistWorkspaceApiResponse<TherapistWorkspaceSnapshot | ErrorBody>> {
    return this.capture(async () => ({
      status: 200,
      body: await this.service.getWorkspace(request.principal)
    }));
  }

  async listUsers(request: {
    principal: AuthenticatedPrincipal;
  }): Promise<
    TherapistWorkspaceApiResponse<{ users: TherapistWorkspaceSnapshot["users"] } | ErrorBody>
  > {
    return this.capture(async () => {
      const snapshot = await this.service.getWorkspace(request.principal);
      return {
        status: 200,
        body: { users: snapshot.users }
      };
    });
  }

  async readUserDetail(request: {
    principal: AuthenticatedPrincipal;
    params: { userId: string };
  }): Promise<TherapistWorkspaceApiResponse<TherapistUserDetailSnapshot | ErrorBody>> {
    return this.capture(async () => ({
      status: 200,
      body: await this.service.getUserDetail(request.principal, request.params.userId)
    }));
  }

  private async capture<TBody>(
    operation: () => Promise<TherapistWorkspaceApiResponse<TBody>>
  ): Promise<TherapistWorkspaceApiResponse<TBody | ErrorBody>> {
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
            message: "Unexpected therapist workspace API failure."
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
