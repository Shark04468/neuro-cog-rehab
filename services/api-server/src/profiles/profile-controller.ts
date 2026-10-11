import { AuthModuleError } from "../auth/auth-errors.js";
import type { UserProfileService } from "./profile-service.js";
import type {
  CreateUserProfileInput,
  ProfileApiRequest,
  ProfileApiResponse,
  TrainingUserProfileRecord,
  UpdateUserProfileInput
} from "./profile-types.js";

interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

type ProfileIdParams = { profileId: string };

/**
 * HTTP-like controller used by route adapters and interface tests. It keeps API
 * behavior testable before a concrete web framework is introduced.
 */
export class UserProfileController {
  constructor(private readonly service: UserProfileService) {}

  async createProfile(
    request: ProfileApiRequest<CreateUserProfileInput>
  ): Promise<ProfileApiResponse<TrainingUserProfileRecord | ErrorBody>> {
    return this.capture(async () => ({
      status: 201,
      body: await this.service.createProfile(request.principal, request.body)
    }));
  }

  async readProfile(
    request: ProfileApiRequest<undefined, ProfileIdParams>
  ): Promise<ProfileApiResponse<TrainingUserProfileRecord | ErrorBody>> {
    return this.capture(async () => ({
      status: 200,
      body: await this.service.readProfile(request.principal, request.params.profileId)
    }));
  }

  async updateProfile(
    request: ProfileApiRequest<UpdateUserProfileInput, ProfileIdParams>
  ): Promise<ProfileApiResponse<TrainingUserProfileRecord | ErrorBody>> {
    return this.capture(async () => ({
      status: 200,
      body: await this.service.updateProfile(
        request.principal,
        request.params.profileId,
        request.body
      )
    }));
  }

  async archiveProfile(
    request: ProfileApiRequest<undefined, ProfileIdParams>
  ): Promise<ProfileApiResponse<TrainingUserProfileRecord | ErrorBody>> {
    return this.capture(async () => ({
      status: 200,
      body: await this.service.archiveProfile(request.principal, request.params.profileId)
    }));
  }

  private async capture<TBody>(
    operation: () => Promise<ProfileApiResponse<TBody>>
  ): Promise<ProfileApiResponse<TBody | ErrorBody>> {
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
            message: "Unexpected profile API failure."
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
