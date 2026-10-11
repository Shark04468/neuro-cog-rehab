import { AuthModuleError } from "../auth/auth-errors.js";
import type { MusicLibraryService } from "./music-library-service.js";
import type {
  MusicLibraryApiRequest,
  MusicLibraryApiResponse,
  MusicLibrarySelectionRecord,
  MusicSelectionQuery,
  MusicTrackListResult,
  MusicTrackQuery,
  SaveMusicSelectionInput
} from "./music-library-types.js";

interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export class MusicLibraryController {
  public constructor(private readonly service: MusicLibraryService) {}

  async listTracks(
    request: MusicLibraryApiRequest<undefined, Record<string, string>, MusicTrackQuery>
  ): Promise<MusicLibraryApiResponse<MusicTrackListResult | ErrorBody>> {
    return this.capture(async () => ({
      status: 200,
      body: await this.service.listTracks(request.principal, request.query)
    }));
  }

  async readSelection(
    request: MusicLibraryApiRequest<undefined, Record<string, string>, MusicSelectionQuery>
  ): Promise<MusicLibraryApiResponse<MusicLibrarySelectionRecord | ErrorBody>> {
    return this.capture(async () => ({
      status: 200,
      body: await this.service.readSelection(request.principal, request.query)
    }));
  }

  async saveSelection(
    request: MusicLibraryApiRequest<SaveMusicSelectionInput>
  ): Promise<MusicLibraryApiResponse<MusicLibrarySelectionRecord | ErrorBody>> {
    return this.capture(async () => ({
      status: 200,
      body: await this.service.saveSelection(request.principal, request.body)
    }));
  }

  private async capture<TBody>(
    operation: () => Promise<MusicLibraryApiResponse<TBody>>
  ): Promise<MusicLibraryApiResponse<TBody | ErrorBody>> {
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
            message: "Unexpected music library API failure."
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
