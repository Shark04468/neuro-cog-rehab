import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import type { UserRole } from "@neuro-cog-rehab/shared-types";

import { AccessControlService } from "./access-control/access-control-service.js";
import { AuthModuleError } from "./auth/auth-errors.js";
import { InMemoryAuthRepository } from "./auth/auth-repository.js";
import { PostgresAuthRepository } from "./auth/postgres-auth-repository.js";
import { AuthService } from "./auth/auth-service.js";
import type {
  AuthenticatedPrincipal,
  LoginInput,
  LogoutInput,
  RegisterUserInput,
  UserAccount
} from "./auth/auth-types.js";
import { MusicLibraryController } from "./music-library/music-library-controller.js";
import { InMemoryMusicLibraryRepository } from "./music-library/music-library-repository.js";
import { MusicLibraryService } from "./music-library/music-library-service.js";
import type {
  MusicSelectionQuery,
  MusicTrackQuery,
  SaveMusicSelectionInput
} from "./music-library/music-library-types.js";
import { PasswordService } from "./auth/password-service.js";
import { TokenService } from "./auth/token-service.js";
import { OperationLogController } from "./operation-logs/operation-log-controller.js";
import { InMemoryOperationLogRepository } from "./operation-logs/operation-log-repository.js";
import { PostgresOperationLogRepository } from "./operation-logs/postgres-operation-log-repository.js";
import { OperationLogService } from "./operation-logs/operation-log-service.js";
import type { OperationLogQuery } from "./operation-logs/operation-log-types.js";
import { createPostgresConnection } from "./postgres/postgres-client.js";
import { UserProfileController } from "./profiles/profile-controller.js";
import { InMemoryUserProfileRepository } from "./profiles/profile-repository.js";
import { PostgresUserProfileRepository } from "./profiles/postgres-profile-repository.js";
import { UserProfileService } from "./profiles/profile-service.js";
import type { CreateUserProfileInput, UpdateUserProfileInput } from "./profiles/profile-types.js";
import { ReportController } from "./reports/report-controller.js";
import { InMemoryReportRepository } from "./reports/report-repository.js";
import { PostgresReportRepository } from "./reports/postgres-report-repository.js";
import { ReportService } from "./reports/report-service.js";
import type { CreateReportInput, ReportQuery } from "./reports/report-types.js";
import { TherapistWorkspaceController } from "./therapist-workspace/therapist-workspace-controller.js";
import { TherapistWorkspaceService } from "./therapist-workspace/therapist-workspace-service.js";
import { InMemoryTrainingDataExportAuditRepository } from "./training-data-export/training-data-export-audit-repository.js";
import { PostgresTrainingDataExportAuditRepository } from "./training-data-export/postgres-training-data-export-audit-repository.js";
import { TrainingDataExportController } from "./training-data-export/training-data-export-controller.js";
import { TrainingDataExportService } from "./training-data-export/training-data-export-service.js";
import type { TrainingDataExportQuery } from "./training-data-export/training-data-export-types.js";
import { TrainingPrescriptionController } from "./training-prescriptions/training-prescription-controller.js";
import { InMemoryTrainingPrescriptionRepository } from "./training-prescriptions/training-prescription-repository.js";
import { PostgresTrainingPrescriptionRepository } from "./training-prescriptions/postgres-training-prescription-repository.js";
import { TrainingPrescriptionService } from "./training-prescriptions/training-prescription-service.js";
import type {
  TrainingPrescriptionDraftInput,
  TrainingPrescriptionQuery
} from "./training-prescriptions/training-prescription-types.js";
import { TrainingRecordController } from "./training-records/training-record-controller.js";
import { InMemoryTrainingRecordRepository } from "./training-records/training-record-repository.js";
import { PostgresTrainingRecordRepository } from "./training-records/postgres-training-record-repository.js";
import { TrainingRecordService } from "./training-records/training-record-service.js";
import type {
  CreateTrainingRecordInput,
  TrainingRecordQuery
} from "./training-records/training-record-types.js";

const DEFAULT_TOKEN_SECRET = "local-development-token-secret-change-me-32";
const DEFAULT_BODY_LIMIT_BYTES = 1_048_576;
const DEFAULT_ALLOWED_ORIGINS = [
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5176",
  "http://127.0.0.1:5186",
  "http://127.0.0.1:5187",
  "http://localhost:5173",
  "http://localhost:5176",
  "http://localhost:5186",
  "http://localhost:5187"
];

interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

interface RequestContext {
  request: IncomingMessage;
  response: ServerResponse;
  url: URL;
  method: string;
}

type ApiAuditTarget = {
  targetType: "account" | "user_profile";
  targetId?: string;
  targetUserProfileId?: string;
  organizationId?: string;
};

export type ApiStorageMode = "memory" | "postgres";

export interface ApiRuntimeOptions {
  tokenSecret?: string;
  exportSalt?: string;
  storageMode?: ApiStorageMode;
  databaseUrl?: string;
  postgresAutoMigrate?: boolean;
}

export interface ApiHttpServerOptions extends ApiRuntimeOptions {
  allowedOrigins?: string[];
  bodyLimitBytes?: number;
}

export interface ApiRuntime {
  authService: AuthService;
  profileController: UserProfileController;
  trainingRecordController: TrainingRecordController;
  trainingPrescriptionController: TrainingPrescriptionController;
  trainingDataExportController: TrainingDataExportController;
  reportController: ReportController;
  musicLibraryController: MusicLibraryController;
  therapistWorkspaceController: TherapistWorkspaceController;
  operationLogController: OperationLogController;
  operationLogService: OperationLogService;
  storageMode: ApiStorageMode;
  close: () => Promise<void>;
}

class HttpRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "HttpRequestError";
  }
}

/**
 * Wires the current modular services with in-memory repositories. This is a
 * development/runtime adapter, not the future PostgreSQL persistence layer.
 */
export function createApiRuntime(options: ApiRuntimeOptions = {}): ApiRuntime {
  const storageConfig = resolveApiStorageConfig(options);
  const postgresConnection =
    storageConfig.mode === "postgres"
      ? createPostgresConnection({ connectionString: storageConfig.databaseUrl })
      : null;
  const postgresAutoMigrate =
    options.postgresAutoMigrate ?? parseBooleanEnv(process.env.API_POSTGRES_AUTO_MIGRATE, true);
  const authRepository =
    postgresConnection === null
      ? new InMemoryAuthRepository()
      : new PostgresAuthRepository({
          client: postgresConnection,
          autoMigrate: postgresAutoMigrate
        });
  const accessControl = new AccessControlService(authRepository);
  const userProfileRepository =
    postgresConnection === null
      ? new InMemoryUserProfileRepository()
      : new PostgresUserProfileRepository({
          client: postgresConnection,
          autoMigrate: postgresAutoMigrate
        });
  const trainingRecordRepository =
    postgresConnection === null
      ? new InMemoryTrainingRecordRepository()
      : new PostgresTrainingRecordRepository({
          client: postgresConnection,
          autoMigrate: postgresAutoMigrate
        });
  const trainingPrescriptionRepository =
    postgresConnection === null
      ? new InMemoryTrainingPrescriptionRepository()
      : new PostgresTrainingPrescriptionRepository({
          client: postgresConnection,
          autoMigrate: postgresAutoMigrate
        });
  const reportRepository =
    postgresConnection === null
      ? new InMemoryReportRepository()
      : new PostgresReportRepository({
          client: postgresConnection,
          autoMigrate: postgresAutoMigrate
        });
  const musicLibraryRepository = new InMemoryMusicLibraryRepository();
  const exportAuditRepository =
    postgresConnection === null
      ? new InMemoryTrainingDataExportAuditRepository()
      : new PostgresTrainingDataExportAuditRepository({
          client: postgresConnection,
          autoMigrate: postgresAutoMigrate
        });
  const operationLogRepository =
    postgresConnection === null
      ? new InMemoryOperationLogRepository()
      : new PostgresOperationLogRepository({
          client: postgresConnection,
          autoMigrate: postgresAutoMigrate
        });

  const authService = new AuthService({
    repository: authRepository,
    passwordService: new PasswordService(),
    tokenService: new TokenService({
      secret: options.tokenSecret ?? process.env.API_TOKEN_SECRET ?? DEFAULT_TOKEN_SECRET
    })
  });
  const profileService = new UserProfileService({
    repository: userProfileRepository,
    accessControl
  });
  const trainingRecordService = new TrainingRecordService({
    repository: trainingRecordRepository,
    accessControl
  });
  const trainingPrescriptionService = new TrainingPrescriptionService({
    repository: trainingPrescriptionRepository,
    accessControl
  });
  const operationLogService = new OperationLogService({
    repository: operationLogRepository,
    accessControl
  });
  const reportService = new ReportService({
    repository: reportRepository,
    accessControl
  });
  const musicLibraryService = new MusicLibraryService({
    repository: musicLibraryRepository,
    accessControl
  });
  const therapistWorkspaceService = new TherapistWorkspaceService({
    accessControl,
    authRepository,
    profileRepository: userProfileRepository,
    prescriptionRepository: trainingPrescriptionRepository,
    reportRepository,
    trainingRecordRepository
  });
  const trainingDataExportDependencies = {
    trainingRecordRepository,
    userProfileRepository,
    accessControl,
    auditRepository: exportAuditRepository
  };
  const trainingDataExportService = new TrainingDataExportService({
    ...trainingDataExportDependencies,
    ...(options.exportSalt !== undefined ? { anonymizationSalt: options.exportSalt } : {})
  });

  return {
    authService,
    profileController: new UserProfileController(profileService),
    trainingRecordController: new TrainingRecordController(trainingRecordService),
    trainingPrescriptionController: new TrainingPrescriptionController(trainingPrescriptionService),
    trainingDataExportController: new TrainingDataExportController(trainingDataExportService),
    reportController: new ReportController(reportService),
    musicLibraryController: new MusicLibraryController(musicLibraryService),
    therapistWorkspaceController: new TherapistWorkspaceController(therapistWorkspaceService),
    operationLogController: new OperationLogController(operationLogService),
    operationLogService,
    storageMode: storageConfig.mode,
    close: async () => {
      await postgresConnection?.close();
    }
  };
}

export function createApiHttpServer(options: ApiHttpServerOptions = {}): Server {
  const runtime = createApiRuntime(options);
  const bodyLimitBytes = options.bodyLimitBytes ?? DEFAULT_BODY_LIMIT_BYTES;
  const allowedOrigins = options.allowedOrigins ?? loadAllowedOriginsFromEnv();

  const server = createServer(async (request, response) => {
    const context = createRequestContext(request, response);

    try {
      if (context.method === "OPTIONS") {
        sendNoContent(context, allowedOrigins);
        return;
      }

      const result = await routeRequest(context, runtime, bodyLimitBytes);
      sendJson(context, result.status, result.body, allowedOrigins);
    } catch (error) {
      const mappedError = mapError(error);
      sendJson(context, mappedError.status, mappedError.body, allowedOrigins);
    }
  });
  server.on("close", () => {
    void runtime.close();
  });
  return server;
}

async function routeRequest(
  context: RequestContext,
  runtime: ApiRuntime,
  bodyLimitBytes: number
): Promise<{ status: number; body?: unknown }> {
  const { method, url, request } = context;
  const path = url.pathname;

  if (method === "GET" && path === "/health") {
    return {
      status: 200,
      body: {
        status: "ok",
        service: "api-server",
        storage: runtime.storageMode === "postgres" ? "postgres" : "in_memory",
        purpose: "auxiliary_training_state_tracking"
      }
    };
  }

  if (method === "POST" && path === "/auth/register") {
    const input = await readJsonBody<RegisterUserInput>(request, bodyLimitBytes);
    const account = await runtime.authService.register(input);
    return { status: 201, body: toPublicUserAccount(account) };
  }

  if (method === "POST" && path === "/auth/login") {
    const input = await readJsonBody<LoginInput>(request, bodyLimitBytes);
    const tokens = await runtime.authService.login(input);
    const principal = await runtime.authService.authenticateAccessToken(tokens.accessToken);
    await recordOperation(
      runtime,
      context,
      principal,
      withOptionalOrganizationId(
        {
          targetType: "account",
          targetId: principal.userId
        },
        principal.organizationId
      )
    );
    return { status: 200, body: tokens };
  }

  if (method === "POST" && path === "/auth/refresh") {
    const body = await readJsonBody<{ refreshToken?: unknown }>(request, bodyLimitBytes);
    const refreshToken = requireString(body.refreshToken, "Refresh token is required.");
    return { status: 200, body: await runtime.authService.refreshToken(refreshToken) };
  }

  if (method === "POST" && path === "/auth/logout") {
    const body = await readOptionalJsonBody<{ refreshToken?: unknown }>(request, bodyLimitBytes);
    const logoutInput: LogoutInput = {};
    const accessToken = getOptionalBearerToken(request);
    if (accessToken !== undefined) {
      logoutInput.accessToken = accessToken;
    }
    if (typeof body?.refreshToken === "string" && body.refreshToken.trim().length > 0) {
      logoutInput.refreshToken = body.refreshToken;
    }
    await runtime.authService.logout(logoutInput);
    return { status: 204 };
  }

  if (method === "GET" && path === "/auth/me") {
    return { status: 200, body: await authenticate(runtime, request) };
  }

  if (method === "POST" && path === "/profiles") {
    const principal = await authenticate(runtime, request);
    const body = await readJsonBody<CreateUserProfileInput>(request, bodyLimitBytes);
    return runtime.profileController.createProfile({
      principal,
      body,
      params: {}
    });
  }

  const profileId = matchSingleId(path, "/profiles");
  if (profileId !== undefined && method === "GET") {
    const principal = await authenticate(runtime, request);
    const response = await runtime.profileController.readProfile({
      principal,
      body: undefined,
      params: { profileId }
    });
    if (response.status === 200) {
      await recordOperation(
        runtime,
        context,
        principal,
        withOptionalOrganizationId(
          {
            targetType: "user_profile",
            targetId: profileId,
            targetUserProfileId: profileId
          },
          principal.organizationId
        )
      );
    }
    return response;
  }

  if (profileId !== undefined && method === "PATCH") {
    const principal = await authenticate(runtime, request);
    const body = await readJsonBody<UpdateUserProfileInput>(request, bodyLimitBytes);
    return runtime.profileController.updateProfile({
      principal,
      body,
      params: { profileId }
    });
  }

  const archiveProfileId = matchActionId(path, "/profiles", "archive");
  if (archiveProfileId !== undefined && method === "POST") {
    const principal = await authenticate(runtime, request);
    return runtime.profileController.archiveProfile({
      principal,
      body: undefined,
      params: { profileId: archiveProfileId }
    });
  }

  if (method === "POST" && path === "/training-records") {
    const principal = await authenticate(runtime, request);
    const body = await readJsonBody<CreateTrainingRecordInput>(request, bodyLimitBytes);
    return runtime.trainingRecordController.createTrainingRecord({
      principal,
      body,
      params: {},
      query: {}
    });
  }

  if (method === "GET" && path === "/training-records") {
    const principal = await authenticate(runtime, request);
    return runtime.trainingRecordController.listTrainingRecords({
      principal,
      body: undefined,
      params: {},
      query: parseTrainingRecordQuery(url.searchParams)
    });
  }

  if (method === "POST" && path === "/training-prescriptions") {
    const principal = await authenticate(runtime, request);
    const body = await readJsonBody<TrainingPrescriptionDraftInput>(request, bodyLimitBytes);
    const response = await runtime.trainingPrescriptionController.savePrescription({
      principal,
      body,
      params: {},
      query: {}
    });
    if (response.status === 200 && isTrainingPrescriptionRecord(response.body)) {
      await recordSpecificOperation(runtime, context, principal, "training_prescription.update", {
        targetType: "training_prescription",
        targetId: response.body.id,
        targetUserProfileId: response.body.userProfileId,
        ...(response.body.organizationId !== undefined
          ? { organizationId: response.body.organizationId }
          : {})
      });
    }
    return response;
  }

  if (method === "GET" && path === "/training-prescriptions") {
    const principal = await authenticate(runtime, request);
    return runtime.trainingPrescriptionController.listPrescriptions({
      principal,
      body: undefined,
      params: {},
      query: parseTrainingPrescriptionQuery(url.searchParams)
    });
  }

  if (method === "GET" && path === "/training-prescriptions/active") {
    const principal = await authenticate(runtime, request);
    return runtime.trainingPrescriptionController.readActivePrescription({
      principal,
      body: undefined,
      params: {},
      query: parseTrainingPrescriptionQuery(url.searchParams)
    });
  }

  const prescriptionId = matchSingleId(path, "/training-prescriptions");
  if (prescriptionId !== undefined && method === "GET") {
    const principal = await authenticate(runtime, request);
    return runtime.trainingPrescriptionController.readPrescription({
      principal,
      body: undefined,
      params: { prescriptionId },
      query: {}
    });
  }

  if (method === "GET" && path === "/therapist/dashboard") {
    const principal = await authenticate(runtime, request);
    return runtime.therapistWorkspaceController.readDashboard({ principal });
  }

  if (method === "GET" && path === "/therapist/users") {
    const principal = await authenticate(runtime, request);
    return runtime.therapistWorkspaceController.listUsers({ principal });
  }

  const therapistUserId = matchSingleId(path, "/therapist/users");
  if (therapistUserId !== undefined && method === "GET") {
    const principal = await authenticate(runtime, request);
    return runtime.therapistWorkspaceController.readUserDetail({
      principal,
      params: { userId: therapistUserId }
    });
  }

  if (method === "GET" && path === "/music-library/tracks") {
    const principal = await authenticate(runtime, request);
    return runtime.musicLibraryController.listTracks({
      principal,
      body: undefined,
      params: {},
      query: parseMusicTrackQuery(url.searchParams)
    });
  }

  if (method === "GET" && path === "/music-library/selections") {
    const principal = await authenticate(runtime, request);
    return runtime.musicLibraryController.readSelection({
      principal,
      body: undefined,
      params: {},
      query: parseMusicSelectionQuery(url.searchParams)
    });
  }

  if (method === "PUT" && path === "/music-library/selections") {
    const principal = await authenticate(runtime, request);
    const body = await readJsonBody<SaveMusicSelectionInput>(request, bodyLimitBytes);
    return runtime.musicLibraryController.saveSelection({
      principal,
      body,
      params: {},
      query: {}
    });
  }

  if (method === "POST" && path === "/reports") {
    const principal = await authenticate(runtime, request);
    const body = await readJsonBody<CreateReportInput>(request, bodyLimitBytes);
    const response = await runtime.reportController.createReport({
      principal,
      body,
      params: {},
      query: {}
    });
    if (response.status === 201 && isReportRecord(response.body)) {
      await recordSpecificOperation(runtime, context, principal, "report.generate", {
        targetType: "report",
        targetId: response.body.id,
        targetUserProfileId: response.body.userProfileId,
        ...(response.body.organizationId !== undefined
          ? { organizationId: response.body.organizationId }
          : {})
      });
    }
    return response;
  }

  if (method === "GET" && path === "/reports") {
    const principal = await authenticate(runtime, request);
    return runtime.reportController.listReports({
      principal,
      body: undefined,
      params: {},
      query: parseReportQuery(url.searchParams)
    });
  }

  const reportId = matchSingleId(path, "/reports");
  if (reportId !== undefined && method === "GET") {
    const principal = await authenticate(runtime, request);
    return runtime.reportController.readReport({
      principal,
      body: undefined,
      params: { reportId },
      query: {}
    });
  }

  if (method === "POST" && path === "/training-data-exports/deidentified") {
    const principal = await authenticate(runtime, request);
    const body = await readOptionalJsonBody<Partial<TrainingDataExportQuery>>(
      request,
      bodyLimitBytes
    );
    return runtime.trainingDataExportController.exportDeidentifiedTrainingData({
      principal,
      body: undefined,
      params: {},
      query: parseTrainingDataExportQuery(url.searchParams, body)
    });
  }

  if (method === "GET" && path === "/operation-logs") {
    const principal = await authenticate(runtime, request);
    return runtime.operationLogController.listOperationLogs({
      principal,
      body: undefined,
      params: {},
      query: parseOperationLogQuery(url.searchParams)
    });
  }

  throw new HttpRequestError(404, "RESOURCE_NOT_FOUND", "API route was not found.");
}

async function authenticate(
  runtime: Pick<ApiRuntime, "authService">,
  request: IncomingMessage
): Promise<AuthenticatedPrincipal> {
  return runtime.authService.authenticateAccessToken(requireBearerToken(request));
}

async function recordOperation(
  runtime: Pick<ApiRuntime, "operationLogService">,
  context: RequestContext,
  principal: AuthenticatedPrincipal,
  target: ApiAuditTarget
): Promise<void> {
  const logInput = {
    operationType: target.targetType === "account" ? "auth.login" : "profile.view_detail",
    actorUserId: principal.userId,
    actorRoles: principal.roles as UserRole[],
    target,
    details: {
      adapter: "node_http"
    }
  } as const;
  const ipAddress = readClientIp(context.request);
  const deviceInfo = context.request.headers["user-agent"];
  await runtime.operationLogService.recordOperation({
    ...logInput,
    ...(ipAddress !== undefined ? { ipAddress } : {}),
    ...(typeof deviceInfo === "string" && deviceInfo.trim().length > 0 ? { deviceInfo } : {})
  });
}

async function recordSpecificOperation(
  runtime: Pick<ApiRuntime, "operationLogService">,
  context: RequestContext,
  principal: AuthenticatedPrincipal,
  operationType: "training_prescription.update" | "report.generate",
  target: {
    targetType: "training_prescription" | "report";
    targetId: string;
    targetUserProfileId: string;
    organizationId?: string;
  }
): Promise<void> {
  const ipAddress = readClientIp(context.request);
  const deviceInfo = context.request.headers["user-agent"];
  await runtime.operationLogService.recordOperation({
    operationType,
    actorUserId: principal.userId,
    actorRoles: principal.roles as UserRole[],
    target,
    details: {
      adapter: "node_http"
    },
    ...(ipAddress !== undefined ? { ipAddress } : {}),
    ...(typeof deviceInfo === "string" && deviceInfo.trim().length > 0 ? { deviceInfo } : {})
  });
}

function withOptionalOrganizationId<T extends Omit<ApiAuditTarget, "organizationId">>(
  target: T,
  organizationId: string | undefined
): T | (T & { organizationId: string }) {
  return organizationId === undefined ? target : { ...target, organizationId };
}

async function readJsonBody<T>(request: IncomingMessage, limitBytes: number): Promise<T> {
  const body = await readOptionalJsonBody<T>(request, limitBytes);
  if (body === undefined) {
    throw new HttpRequestError(400, "VALIDATION_ERROR", "Request JSON body is required.");
  }
  return body;
}

async function readOptionalJsonBody<T>(
  request: IncomingMessage,
  limitBytes: number
): Promise<T | undefined> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > limitBytes) {
      throw new HttpRequestError(413, "VALIDATION_ERROR", "Request body is too large.");
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0 || totalBytes === 0) {
    return undefined;
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
  } catch {
    throw new HttpRequestError(400, "VALIDATION_ERROR", "Request JSON body is invalid.");
  }
}

function requireBearerToken(request: IncomingMessage): string {
  const token = getOptionalBearerToken(request);
  if (token === undefined) {
    throw new AuthModuleError("AUTHENTICATION_REQUIRED", "Bearer access token is required.");
  }
  return token;
}

function getOptionalBearerToken(request: IncomingMessage): string | undefined {
  const authorization = request.headers.authorization;
  if (authorization === undefined) {
    return undefined;
  }
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim();
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpRequestError(400, "VALIDATION_ERROR", message);
  }
  return value;
}

function parseTrainingDataExportQuery(
  params: URLSearchParams,
  body: Partial<TrainingDataExportQuery> | undefined
): TrainingDataExportQuery {
  const query: TrainingDataExportQuery = parseTrainingRecordQuery(params);
  applyStringQueryValue(query, "reason", params.get("reason"));
  if (body !== undefined) {
    copyKnownTrainingQueryValues(query, body);
    if (typeof body.reason === "string" && body.reason.trim().length > 0) {
      query.reason = body.reason;
    }
  }
  return query;
}

function parseTrainingRecordQuery(params: URLSearchParams): TrainingRecordQuery {
  const query: TrainingRecordQuery = {};
  applyStringQueryValue(query, "userId", params.get("userId"));
  applyStringQueryValue(query, "userProfileId", params.get("userProfileId"));
  applyStringQueryValue(query, "startedFrom", params.get("startedFrom"));
  applyStringQueryValue(query, "startedTo", params.get("startedTo"));
  applyNumberQueryValue(query, "page", params.get("page"));
  applyNumberQueryValue(query, "pageSize", params.get("pageSize"));
  return query;
}

function parseTrainingPrescriptionQuery(params: URLSearchParams): TrainingPrescriptionQuery {
  const query: TrainingPrescriptionQuery = {};
  applyStringQueryValue(query, "userId", params.get("userId"));
  applyStringQueryValue(query, "userProfileId", params.get("userProfileId"));
  applyStringQueryValue(query, "organizationId", params.get("organizationId"));
  applyStringQueryValue(query, "status", params.get("status"));
  applyNumberQueryValue(query, "page", params.get("page"));
  applyNumberQueryValue(query, "pageSize", params.get("pageSize"));
  return query;
}

function parseReportQuery(params: URLSearchParams): ReportQuery {
  const query: ReportQuery = {};
  applyStringQueryValue(query, "userId", params.get("userId"));
  applyStringQueryValue(query, "userProfileId", params.get("userProfileId"));
  applyStringQueryValue(query, "organizationId", params.get("organizationId"));
  applyStringQueryValue(query, "reportType", params.get("reportType"));
  applyStringQueryValue(query, "audience", params.get("audience"));
  applyStringQueryValue(query, "periodFrom", params.get("periodFrom"));
  applyStringQueryValue(query, "periodTo", params.get("periodTo"));
  applyNumberQueryValue(query, "page", params.get("page"));
  applyNumberQueryValue(query, "pageSize", params.get("pageSize"));
  return query;
}

function parseMusicTrackQuery(params: URLSearchParams): MusicTrackQuery {
  const query: MusicTrackQuery = {};
  applyStringQueryValue(query, "tag", params.get("tag"));
  return query;
}

function parseMusicSelectionQuery(params: URLSearchParams): MusicSelectionQuery {
  const query = {
    userId: params.get("userId")?.trim() ?? "",
    userProfileId: params.get("userProfileId")?.trim() ?? ""
  };
  const organizationId = params.get("organizationId")?.trim();
  return organizationId && organizationId.length > 0 ? { ...query, organizationId } : query;
}

function parseOperationLogQuery(params: URLSearchParams): OperationLogQuery {
  const query: OperationLogQuery = {};
  applyStringQueryValue(query, "actorUserId", params.get("actorUserId"));
  applyStringQueryValue(query, "operationType", params.get("operationType"));
  applyStringQueryValue(query, "targetUserProfileId", params.get("targetUserProfileId"));
  applyStringQueryValue(query, "organizationId", params.get("organizationId"));
  applyStringQueryValue(query, "occurredFrom", params.get("occurredFrom"));
  applyStringQueryValue(query, "occurredTo", params.get("occurredTo"));
  applyNumberQueryValue(query, "page", params.get("page"));
  applyNumberQueryValue(query, "pageSize", params.get("pageSize"));
  return query;
}

function copyKnownTrainingQueryValues(
  query: TrainingDataExportQuery,
  body: Partial<TrainingDataExportQuery>
): void {
  if (typeof body.userId === "string" && body.userId.trim().length > 0) {
    query.userId = body.userId;
  }
  if (typeof body.userProfileId === "string" && body.userProfileId.trim().length > 0) {
    query.userProfileId = body.userProfileId;
  }
  if (typeof body.startedFrom === "string" && body.startedFrom.trim().length > 0) {
    query.startedFrom = body.startedFrom;
  }
  if (typeof body.startedTo === "string" && body.startedTo.trim().length > 0) {
    query.startedTo = body.startedTo;
  }
  if (typeof body.page === "number" && Number.isFinite(body.page)) {
    query.page = body.page;
  }
  if (typeof body.pageSize === "number" && Number.isFinite(body.pageSize)) {
    query.pageSize = body.pageSize;
  }
}

function applyStringQueryValue<T extends object, K extends keyof T>(
  query: T,
  key: K,
  value: string | null
): void {
  if (value !== null && value.trim().length > 0) {
    query[key] = value as T[K];
  }
}

function applyNumberQueryValue<T extends object, K extends keyof T>(
  query: T,
  key: K,
  value: string | null
): void {
  if (value === null || value.trim().length === 0) {
    return;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new HttpRequestError(400, "VALIDATION_ERROR", `${String(key)} must be numeric.`);
  }
  query[key] = Math.floor(parsed) as T[K];
}

function matchSingleId(path: string, prefix: string): string | undefined {
  const match = new RegExp(`^${escapeRegExp(prefix)}/([^/]+)$`).exec(path);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

function matchActionId(path: string, prefix: string, action: string): string | undefined {
  const match = new RegExp(`^${escapeRegExp(prefix)}/([^/]+)/${escapeRegExp(action)}$`).exec(path);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createRequestContext(request: IncomingMessage, response: ServerResponse): RequestContext {
  const host = request.headers.host ?? "127.0.0.1";
  const url = new URL(request.url ?? "/", `http://${host}`);
  return {
    request,
    response,
    url,
    method: (request.method ?? "GET").toUpperCase()
  };
}

function sendJson(
  context: RequestContext,
  status: number,
  body: unknown,
  allowedOrigins: readonly string[]
): void {
  const headers = responseHeaders(context.request, allowedOrigins);
  if (status === 204 || body === undefined) {
    context.response.writeHead(status, headers);
    context.response.end();
    return;
  }

  const rawBody = JSON.stringify(body);
  context.response.writeHead(status, {
    ...headers,
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(rawBody)
  });
  context.response.end(rawBody);
}

function sendNoContent(context: RequestContext, allowedOrigins: readonly string[]): void {
  context.response.writeHead(204, responseHeaders(context.request, allowedOrigins));
  context.response.end();
}

function responseHeaders(
  request: IncomingMessage,
  allowedOrigins: readonly string[]
): Record<string, string> {
  const headers: Record<string, string> = {
    "cache-control": "no-store",
    vary: "Origin",
    "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
    "access-control-allow-headers": "authorization,content-type",
    "access-control-max-age": "600"
  };
  const origin = request.headers.origin;
  if (typeof origin === "string" && allowedOrigins.includes(origin)) {
    headers["access-control-allow-origin"] = origin;
  }
  return headers;
}

function mapError(error: unknown): { status: number; body: ErrorBody } {
  if (error instanceof HttpRequestError) {
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.message } }
    };
  }

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

  console.error(error);
  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected API server failure."
      }
    }
  };
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

function toPublicUserAccount(account: UserAccount): Omit<UserAccount, "passwordHash"> {
  const publicAccount: Partial<UserAccount> = { ...account };
  delete publicAccount.passwordHash;
  return publicAccount as Omit<UserAccount, "passwordHash">;
}

function readClientIp(request: IncomingMessage): string | undefined {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0]?.trim() || undefined;
  }
  return request.socket.remoteAddress;
}

function loadAllowedOriginsFromEnv(): string[] {
  const rawOrigins = process.env.API_CORS_ORIGINS;
  if (!rawOrigins) {
    return DEFAULT_ALLOWED_ORIGINS;
  }
  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function resolveApiStorageConfig(
  options: ApiRuntimeOptions
): { mode: "memory" } | { mode: "postgres"; databaseUrl: string } {
  const requestedMode = normalizeStorageMode(options.storageMode ?? process.env.API_STORAGE_MODE);
  const explicitDatabaseUrl = options.databaseUrl ?? process.env.API_DATABASE_URL;
  const databaseUrl =
    explicitDatabaseUrl ?? (requestedMode === "postgres" ? process.env.DATABASE_URL : undefined);

  if (
    requestedMode === "postgres" ||
    (requestedMode === undefined && isNonEmpty(explicitDatabaseUrl))
  ) {
    if (!isNonEmpty(databaseUrl)) {
      throw new Error("PostgreSQL storage requires API_DATABASE_URL or DATABASE_URL.");
    }
    return { mode: "postgres", databaseUrl };
  }

  return { mode: "memory" };
}

function normalizeStorageMode(value: string | undefined): ApiStorageMode | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }
  if (value === "memory" || value === "postgres") {
    return value;
  }
  throw new Error("API_STORAGE_MODE must be either 'memory' or 'postgres'.");
}

function isNonEmpty(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim().length === 0) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  throw new Error("Boolean environment values must be true/false, yes/no, on/off, or 1/0.");
}

function isTrainingPrescriptionRecord(
  value: unknown
): value is { id: string; userProfileId: string; organizationId?: string } {
  const record = value as Record<string, unknown>;
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "userProfileId" in value &&
    typeof record.id === "string" &&
    typeof record.userProfileId === "string" &&
    (!("organizationId" in value) || typeof record.organizationId === "string")
  );
}

function isReportRecord(
  value: unknown
): value is { id: string; userProfileId: string; organizationId?: string } {
  const record = value as Record<string, unknown>;
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "userProfileId" in value &&
    typeof record.id === "string" &&
    typeof record.userProfileId === "string" &&
    (!("organizationId" in value) || typeof record.organizationId === "string")
  );
}
