import { AuthModuleError, requireCondition } from "../auth/auth-errors.js";
import type { AuthenticatedPrincipal } from "../auth/auth-types.js";
import type { AccessControlService } from "../access-control/access-control-service.js";
import type { OperationLogRepository } from "./operation-log-repository.js";
import {
  OPERATION_LOG_EVENT_TYPES,
  type CreateOperationLogInput,
  type OperationLogListResult,
  type OperationLogQuery,
  type OperationLogRecord
} from "./operation-log-types.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface OperationLogServiceDependencies {
  repository: OperationLogRepository;
  accessControl: AccessControlService;
}

/**
 * System operation log use cases. Logs are append-only and contain operational
 * audit data for sensitive workflows, without raw EEG streams or clinical claims.
 */
export class OperationLogService {
  constructor(private readonly dependencies: OperationLogServiceDependencies) {}

  async recordOperation(input: CreateOperationLogInput): Promise<OperationLogRecord> {
    this.validateCreateInput(input);
    return this.dependencies.repository.append(input);
  }

  async listOperationLogs(
    principal: AuthenticatedPrincipal,
    query: OperationLogQuery
  ): Promise<OperationLogListResult> {
    this.validateQuery(query);
    const scopedQuery = this.scopeQueryForPrincipal(principal, query);
    const logs = await this.dependencies.repository.findMany(scopedQuery);
    const page = normalizePage(query.page);
    const pageSize = normalizePageSize(query.pageSize);
    const startIndex = (page - 1) * pageSize;
    const pagedLogs = logs.slice(startIndex, startIndex + pageSize);

    return {
      logs: pagedLogs,
      pagination: {
        page,
        pageSize,
        totalItems: logs.length,
        totalPages: Math.max(1, Math.ceil(logs.length / pageSize))
      }
    };
  }

  private scopeQueryForPrincipal(
    principal: AuthenticatedPrincipal,
    query: OperationLogQuery
  ): OperationLogQuery {
    if (principal.roles.includes("system_admin")) {
      this.dependencies.accessControl.assertPermission(principal, "audit:read:system");
      return { ...query };
    }

    if (principal.roles.includes("org_admin")) {
      this.dependencies.accessControl.assertPermission(principal, "audit:read:organization");
      const organizationId = principal.organizationId;
      if (organizationId === undefined) {
        throw new AuthModuleError(
          "PERMISSION_DENIED",
          "Organization administrator has no organization scope."
        );
      }
      requireCondition(
        query.organizationId === undefined || query.organizationId === organizationId,
        "SENSITIVE_DATA_SCOPE_DENIED",
        "Organization administrator cannot query operation logs outside the organization."
      );
      return {
        ...query,
        organizationId
      };
    }

    throw new AuthModuleError("PERMISSION_DENIED", "Role cannot query operation logs.");
  }

  private validateCreateInput(input: CreateOperationLogInput): void {
    requireCondition(
      OPERATION_LOG_EVENT_TYPES.includes(input.operationType),
      "VALIDATION_ERROR",
      "Operation type is unsupported."
    );
    requireCondition(
      input.actorUserId.trim().length > 0,
      "VALIDATION_ERROR",
      "Actor user id is required."
    );
    requireCondition(
      input.actorRoles.length > 0,
      "VALIDATION_ERROR",
      "At least one actor role is required."
    );
    requireCondition(
      input.target.targetType.trim().length > 0,
      "VALIDATION_ERROR",
      "Operation target type is required."
    );
    if (input.occurredAt !== undefined) {
      requireCondition(
        isValidIsoDate(input.occurredAt),
        "VALIDATION_ERROR",
        "Operation timestamp is invalid."
      );
    }
    if (input.ipAddress !== undefined) {
      requireCondition(
        input.ipAddress.trim().length > 0,
        "VALIDATION_ERROR",
        "IP address cannot be blank when provided."
      );
    }
    if (input.deviceInfo !== undefined) {
      requireCondition(
        input.deviceInfo.trim().length > 0,
        "VALIDATION_ERROR",
        "Device information cannot be blank when provided."
      );
    }
  }

  private validateQuery(query: OperationLogQuery): void {
    if (query.operationType !== undefined) {
      requireCondition(
        OPERATION_LOG_EVENT_TYPES.includes(query.operationType),
        "VALIDATION_ERROR",
        "Operation type is unsupported."
      );
    }
    if (query.occurredFrom !== undefined) {
      requireCondition(
        isValidIsoDate(query.occurredFrom),
        "VALIDATION_ERROR",
        "Operation log start time is invalid."
      );
    }
    if (query.occurredTo !== undefined) {
      requireCondition(
        isValidIsoDate(query.occurredTo),
        "VALIDATION_ERROR",
        "Operation log end time is invalid."
      );
    }
    if (query.occurredFrom !== undefined && query.occurredTo !== undefined) {
      requireCondition(
        Date.parse(query.occurredTo) >= Date.parse(query.occurredFrom),
        "VALIDATION_ERROR",
        "Operation log end time cannot be earlier than start time."
      );
    }
  }
}

function normalizePage(page: number | undefined): number {
  return page === undefined || page < 1 ? DEFAULT_PAGE : Math.floor(page);
}

function normalizePageSize(pageSize: number | undefined): number {
  if (pageSize === undefined || pageSize < 1) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(Math.floor(pageSize), MAX_PAGE_SIZE);
}

function isValidIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}
