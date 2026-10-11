import { AuthModuleError, requireCondition } from "../auth/auth-errors.js";
import type { AuthenticatedPrincipal } from "../auth/auth-types.js";
import type {
  AccessControlService,
  AccessTarget
} from "../access-control/access-control-service.js";
import type { TrainingRecordRepository } from "./training-record-repository.js";
import {
  TRAINING_RECORD_TYPES,
  type CreateTrainingRecordInput,
  type TrainingRecord,
  type TrainingRecordListResult,
  type TrainingRecordQuery
} from "./training-record-types.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface TrainingRecordServiceDependencies {
  repository: TrainingRecordRepository;
  accessControl: AccessControlService;
}

/**
 * Training record use cases. Records contain training behavior, EEG summaries,
 * difficulty settings, and operational abnormal events only.
 */
export class TrainingRecordService {
  constructor(private readonly dependencies: TrainingRecordServiceDependencies) {}

  async createRecord(
    principal: AuthenticatedPrincipal,
    input: CreateTrainingRecordInput
  ): Promise<TrainingRecord> {
    this.validateCreateInput(input);
    await this.dependencies.accessControl.assertCanAccessProfile(principal, accessTargetFor(input));
    this.assertCanCreate(principal, input);

    return this.dependencies.repository.create({
      ...input,
      createdByUserId: principal.userId
    });
  }

  async listRecords(
    principal: AuthenticatedPrincipal,
    query: TrainingRecordQuery
  ): Promise<TrainingRecordListResult> {
    this.validateQuery(query);
    const records = await this.dependencies.repository.findMany(query);
    const visibleRecords: TrainingRecord[] = [];

    for (const record of records) {
      const decision = await this.dependencies.accessControl.canAccessProfile(
        principal,
        accessTargetFor(record)
      );
      if (decision.allowed) {
        visibleRecords.push(record);
      }
    }

    const page = normalizePage(query.page);
    const pageSize = normalizePageSize(query.pageSize);
    const startIndex = (page - 1) * pageSize;
    const pagedRecords = visibleRecords.slice(startIndex, startIndex + pageSize);

    return {
      records: pagedRecords,
      pagination: {
        page,
        pageSize,
        totalItems: visibleRecords.length,
        totalPages: Math.max(1, Math.ceil(visibleRecords.length / pageSize))
      }
    };
  }

  private validateCreateInput(input: CreateTrainingRecordInput): void {
    requireCondition(input.userId.trim().length > 0, "VALIDATION_ERROR", "User id is required.");
    requireCondition(
      input.userProfileId.trim().length > 0,
      "VALIDATION_ERROR",
      "User profile id is required."
    );
    requireCondition(
      TRAINING_RECORD_TYPES.includes(input.trainingType),
      "VALIDATION_ERROR",
      "Training type is unsupported."
    );
    requireCondition(isValidIsoDate(input.startedAt), "VALIDATION_ERROR", "Start time is invalid.");
    requireCondition(isValidIsoDate(input.endedAt), "VALIDATION_ERROR", "End time is invalid.");
    requireCondition(
      Date.parse(input.endedAt) >= Date.parse(input.startedAt),
      "VALIDATION_ERROR",
      "End time cannot be earlier than start time."
    );
    requireCondition(
      input.durationSeconds >= 0,
      "VALIDATION_ERROR",
      "Training duration must be zero or greater."
    );
    requireCondition(
      input.difficultyConfig.initialLevel >= 1 && input.difficultyConfig.finalLevel >= 1,
      "VALIDATION_ERROR",
      "Difficulty levels must be one or greater."
    );
    for (const event of input.abnormalEvents) {
      requireCondition(
        isValidIsoDate(event.occurredAt),
        "VALIDATION_ERROR",
        "Abnormal event timestamp is invalid."
      );
    }
  }

  private validateQuery(query: TrainingRecordQuery): void {
    if (query.startedFrom !== undefined) {
      requireCondition(
        isValidIsoDate(query.startedFrom),
        "VALIDATION_ERROR",
        "Date range start is invalid."
      );
    }
    if (query.startedTo !== undefined) {
      requireCondition(
        isValidIsoDate(query.startedTo),
        "VALIDATION_ERROR",
        "Date range end is invalid."
      );
    }
    if (query.startedFrom !== undefined && query.startedTo !== undefined) {
      requireCondition(
        Date.parse(query.startedTo) >= Date.parse(query.startedFrom),
        "VALIDATION_ERROR",
        "Date range end cannot be earlier than start."
      );
    }
  }

  private assertCanCreate(
    principal: AuthenticatedPrincipal,
    input: CreateTrainingRecordInput
  ): void {
    if (principal.roles.includes("system_admin") || principal.roles.includes("org_admin")) {
      return;
    }
    if (principal.roles.includes("therapist")) {
      return;
    }
    if (principal.roles.includes("trainee")) {
      requireCondition(
        principal.userId === input.userId && principal.userProfileId === input.userProfileId,
        "SENSITIVE_DATA_SCOPE_DENIED",
        "Trainee can only create own training records."
      );
      return;
    }

    throw new AuthModuleError("PERMISSION_DENIED", "Role cannot create training records.");
  }
}

function accessTargetFor(
  record: Pick<CreateTrainingRecordInput, "userProfileId" | "organizationId">
): AccessTarget {
  const target: AccessTarget = {
    userProfileId: record.userProfileId
  };
  if (record.organizationId !== undefined) {
    target.organizationId = record.organizationId;
  }
  return target;
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
