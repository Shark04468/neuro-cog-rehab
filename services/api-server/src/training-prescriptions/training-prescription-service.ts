import { AuthModuleError, requireCondition } from "../auth/auth-errors.js";
import type { AuthenticatedPrincipal } from "../auth/auth-types.js";
import type {
  AccessControlService,
  AccessTarget
} from "../access-control/access-control-service.js";
import type { TrainingPrescriptionRepository } from "./training-prescription-repository.js";
import {
  TRAINING_PRESCRIPTION_DIFFICULTIES,
  TRAINING_PRESCRIPTION_MODULES,
  TRAINING_PRESCRIPTION_MUSIC_TYPES,
  TRAINING_PRESCRIPTION_RISK_KEYS,
  type TrainingPrescriptionDraftInput,
  type TrainingPrescriptionListResult,
  type TrainingPrescriptionQuery,
  type TrainingPrescriptionRecord
} from "./training-prescription-types.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface TrainingPrescriptionServiceDependencies {
  repository: TrainingPrescriptionRepository;
  accessControl: AccessControlService;
}

/**
 * Training prescription use cases. A prescription here means an auxiliary
 * training arrangement configured by an authorized role.
 */
export class TrainingPrescriptionService {
  constructor(private readonly dependencies: TrainingPrescriptionServiceDependencies) {}

  async savePrescription(
    principal: AuthenticatedPrincipal,
    input: TrainingPrescriptionDraftInput
  ): Promise<TrainingPrescriptionRecord> {
    this.validateDraft(input);
    await this.dependencies.accessControl.assertCanAccessProfile(principal, accessTargetFor(input));
    this.assertCanWrite(principal);

    return this.dependencies.repository.upsertActive({
      ...input,
      therapistUserId: principal.userId
    });
  }

  async readPrescription(
    principal: AuthenticatedPrincipal,
    prescriptionId: string
  ): Promise<TrainingPrescriptionRecord> {
    const prescription = await this.dependencies.repository.findById(prescriptionId);
    if (prescription === undefined) {
      throw new AuthModuleError("RESOURCE_NOT_FOUND", "Training prescription was not found.");
    }
    await this.dependencies.accessControl.assertCanAccessProfile(
      principal,
      accessTargetFor(prescription)
    );
    return prescription;
  }

  async readActivePrescription(
    principal: AuthenticatedPrincipal,
    userProfileId: string
  ): Promise<TrainingPrescriptionRecord> {
    requireCondition(
      userProfileId.trim().length > 0,
      "VALIDATION_ERROR",
      "User profile id is required."
    );
    const prescription =
      await this.dependencies.repository.findActiveByUserProfileId(userProfileId);
    if (prescription === undefined) {
      throw new AuthModuleError(
        "RESOURCE_NOT_FOUND",
        "Active training prescription was not found."
      );
    }
    await this.dependencies.accessControl.assertCanAccessProfile(
      principal,
      accessTargetFor(prescription)
    );
    return prescription;
  }

  async listPrescriptions(
    principal: AuthenticatedPrincipal,
    query: TrainingPrescriptionQuery
  ): Promise<TrainingPrescriptionListResult> {
    this.validateQuery(query);
    const records = await this.dependencies.repository.findMany(query);
    const visibleRecords: TrainingPrescriptionRecord[] = [];

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

    return {
      prescriptions: visibleRecords.slice(startIndex, startIndex + pageSize),
      pagination: {
        page,
        pageSize,
        totalItems: visibleRecords.length,
        totalPages: Math.max(1, Math.ceil(visibleRecords.length / pageSize))
      }
    };
  }

  private validateDraft(input: TrainingPrescriptionDraftInput): void {
    requireCondition(input.userId.trim().length > 0, "VALIDATION_ERROR", "User id is required.");
    requireCondition(
      input.userProfileId.trim().length > 0,
      "VALIDATION_ERROR",
      "User profile id is required."
    );
    requireCondition(
      Number.isInteger(input.weeklySessionCount) &&
        input.weeklySessionCount >= 1 &&
        input.weeklySessionCount <= 5,
      "VALIDATION_ERROR",
      "Weekly training frequency must be between 1 and 5."
    );
    requireCondition(
      Number.isInteger(input.sessionDurationMinutes) &&
        input.sessionDurationMinutes >= 5 &&
        input.sessionDurationMinutes <= 30,
      "VALIDATION_ERROR",
      "Session duration must be between 5 and 30 minutes."
    );
    requireCondition(
      input.moduleCombination.length > 0 &&
        input.moduleCombination.every((module) => TRAINING_PRESCRIPTION_MODULES.includes(module)),
      "VALIDATION_ERROR",
      "Training module combination is invalid."
    );
    requireCondition(
      TRAINING_PRESCRIPTION_MUSIC_TYPES.includes(input.musicType),
      "VALIDATION_ERROR",
      "Music type is invalid."
    );
    requireCondition(
      TRAINING_PRESCRIPTION_DIFFICULTIES.includes(input.initialDifficulty),
      "VALIDATION_ERROR",
      "Initial difficulty is invalid."
    );
    requireCondition(
      Number.isInteger(input.dailyMaxTrainingMinutes) &&
        input.dailyMaxTrainingMinutes >= 10 &&
        input.dailyMaxTrainingMinutes <= 45,
      "VALIDATION_ERROR",
      "Daily training limit must be between 10 and 45 minutes."
    );
    requireCondition(
      input.dailyMaxTrainingMinutes >= input.sessionDurationMinutes,
      "VALIDATION_ERROR",
      "Daily training limit cannot be lower than session duration."
    );
    requireCondition(
      input.riskReminderKeys.length > 0 &&
        input.riskReminderKeys.every((key) => TRAINING_PRESCRIPTION_RISK_KEYS.includes(key)),
      "VALIDATION_ERROR",
      "Risk reminder keys are invalid."
    );
    requireCondition(
      input.therapistNote.length <= 240,
      "VALIDATION_ERROR",
      "Therapist note must be 240 characters or fewer."
    );
  }

  private validateQuery(query: TrainingPrescriptionQuery): void {
    if (query.status !== undefined) {
      requireCondition(
        query.status === "active" || query.status === "archived",
        "VALIDATION_ERROR",
        "Training prescription status is invalid."
      );
    }
  }

  private assertCanWrite(principal: AuthenticatedPrincipal): void {
    requireCondition(
      principal.roles.some(
        (role) => role === "therapist" || role === "org_admin" || role === "system_admin"
      ),
      "PERMISSION_DENIED",
      "Role cannot save training prescriptions."
    );
  }
}

function accessTargetFor(
  record: Pick<TrainingPrescriptionDraftInput, "userProfileId" | "organizationId">
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
