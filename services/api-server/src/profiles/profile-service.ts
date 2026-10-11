import { AuthModuleError, requireCondition } from "../auth/auth-errors.js";
import type { AuthenticatedPrincipal } from "../auth/auth-types.js";
import type {
  AccessControlService,
  AccessTarget
} from "../access-control/access-control-service.js";
import type {
  CreateUserProfileInput,
  TrainingUserProfileRecord,
  UpdateUserProfileInput
} from "./profile-types.js";
import type { UserProfileRepository } from "./profile-repository.js";

export interface UserProfileServiceDependencies {
  repository: UserProfileRepository;
  accessControl: AccessControlService;
}

/**
 * User profile use cases. Risk fields are stored only for training safety prompts
 * and content adjustment; this service does not generate diagnostic judgments.
 */
export class UserProfileService {
  constructor(private readonly dependencies: UserProfileServiceDependencies) {}

  async createProfile(
    principal: AuthenticatedPrincipal,
    input: CreateUserProfileInput
  ): Promise<TrainingUserProfileRecord> {
    this.validateCreateInput(principal, input);
    this.assertCanCreate(principal, input);
    this.assertSensitiveFieldAccess(principal, input);

    const traineeUserId = input.traineeUserId ?? principal.userId;
    const organizationId = input.organizationId ?? principal.organizationId;
    const createInput: CreateUserProfileInput & {
      traineeUserId: string;
      createdByUserId: string;
    } = {
      ...input,
      traineeUserId,
      createdByUserId: principal.userId
    };
    if (organizationId !== undefined) {
      createInput.organizationId = organizationId;
    }

    const record = await this.dependencies.repository.create(createInput);

    await this.dependencies.accessControl.registerProfileOwner(
      record.id,
      traineeUserId,
      record.organizationId
    );
    if (principal.roles.includes("parent")) {
      await this.dependencies.accessControl.bindParentToProfile(record.id, principal.userId);
    }
    if (principal.roles.includes("therapist")) {
      await this.dependencies.accessControl.bindTherapistToProfile(record.id, principal.userId);
    }

    return record;
  }

  async readProfile(
    principal: AuthenticatedPrincipal,
    profileId: string
  ): Promise<TrainingUserProfileRecord> {
    const profile = await this.findProfileOrThrow(profileId);
    await this.dependencies.accessControl.assertCanAccessProfile(
      principal,
      accessTargetFor(profile)
    );
    return this.redactForRole(principal, profile);
  }

  async updateProfile(
    principal: AuthenticatedPrincipal,
    profileId: string,
    input: UpdateUserProfileInput
  ): Promise<TrainingUserProfileRecord> {
    const profile = await this.findProfileOrThrow(profileId);
    await this.dependencies.accessControl.assertCanAccessProfile(
      principal,
      accessTargetFor(profile)
    );
    this.assertCanUpdate(principal, input);

    const updated = await this.dependencies.repository.update(profileId, input);
    if (!updated) {
      throw new AuthModuleError("RESOURCE_NOT_FOUND", "Profile was not found.");
    }

    return this.redactForRole(principal, updated);
  }

  async archiveProfile(
    principal: AuthenticatedPrincipal,
    profileId: string
  ): Promise<TrainingUserProfileRecord> {
    const profile = await this.findProfileOrThrow(profileId);
    await this.dependencies.accessControl.assertCanAccessProfile(
      principal,
      accessTargetFor(profile)
    );
    requireCondition(
      principal.roles.some(
        (role) =>
          role === "parent" ||
          role === "therapist" ||
          role === "org_admin" ||
          role === "system_admin"
      ),
      "PERMISSION_DENIED",
      "Role cannot archive profiles."
    );

    const archived = await this.dependencies.repository.archive(profileId, principal.userId);
    if (!archived) {
      throw new AuthModuleError("RESOURCE_NOT_FOUND", "Profile was not found.");
    }
    return this.redactForRole(principal, archived);
  }

  private validateCreateInput(
    principal: AuthenticatedPrincipal,
    input: CreateUserProfileInput
  ): void {
    requireCondition(
      input.basicInfo.nickname.trim().length > 0,
      "VALIDATION_ERROR",
      "Nickname is required."
    );
    requireCondition(
      input.basicInfo.trainingGoals.length > 0,
      "VALIDATION_ERROR",
      "Training goals are required."
    );
    requireCondition(
      input.riskScreening.guardianConsentStatus === "granted",
      "VALIDATION_ERROR",
      "Guardian consent must be granted before profile creation."
    );
    requireCondition(
      input.deviceInfo.eegDeviceBound || input.deviceInfo.eegConnectionType === "none",
      "VALIDATION_ERROR",
      "Unbound EEG devices must use connection type none."
    );

    if (principal.roles.includes("trainee")) {
      requireCondition(
        input.traineeUserId === undefined || input.traineeUserId === principal.userId,
        "SENSITIVE_DATA_SCOPE_DENIED",
        "Trainee can only create an own profile."
      );
    } else {
      requireCondition(
        Boolean(input.traineeUserId),
        "VALIDATION_ERROR",
        "Trainee user id is required."
      );
    }
  }

  private assertCanCreate(principal: AuthenticatedPrincipal, input: CreateUserProfileInput): void {
    if (principal.roles.includes("system_admin")) {
      return;
    }

    if (principal.roles.includes("org_admin")) {
      requireCondition(
        Boolean(principal.organizationId),
        "PERMISSION_DENIED",
        "Organization administrator has no organization scope."
      );
      requireCondition(
        input.organizationId === undefined || input.organizationId === principal.organizationId,
        "SENSITIVE_DATA_SCOPE_DENIED",
        "Organization administrator cannot create profiles outside the organization."
      );
      return;
    }

    if (principal.roles.includes("therapist")) {
      requireCondition(
        Boolean(principal.organizationId),
        "PERMISSION_DENIED",
        "Therapist has no organization scope."
      );
      requireCondition(
        input.organizationId === undefined || input.organizationId === principal.organizationId,
        "SENSITIVE_DATA_SCOPE_DENIED",
        "Therapist cannot create profiles outside the organization."
      );
      return;
    }

    if (principal.roles.includes("parent") || principal.roles.includes("trainee")) {
      requireCondition(
        input.organizationId === undefined ||
          (principal.organizationId !== undefined &&
            input.organizationId === principal.organizationId),
        "SENSITIVE_DATA_SCOPE_DENIED",
        "Caller cannot create profiles outside the authorized organization scope."
      );
      return;
    }

    throw new AuthModuleError("PERMISSION_DENIED", "Role cannot create profiles.");
  }

  private assertCanUpdate(principal: AuthenticatedPrincipal, input: UpdateUserProfileInput): void {
    if (principal.roles.includes("trainee")) {
      requireCondition(
        input.riskScreening === undefined &&
          input.deviceInfo === undefined &&
          input.therapistNotes === undefined,
        "PERMISSION_DENIED",
        "Trainee cannot update sensitive safety, device, or therapist-note fields."
      );
    }

    this.assertSensitiveFieldAccess(principal, input);
  }

  private assertSensitiveFieldAccess(
    principal: AuthenticatedPrincipal,
    input: CreateUserProfileInput | UpdateUserProfileInput
  ): void {
    const writesTherapistNotes = "therapistNotes" in input && input.therapistNotes !== undefined;
    if (writesTherapistNotes) {
      requireCondition(
        principal.roles.some(
          (role) => role === "therapist" || role === "org_admin" || role === "system_admin"
        ),
        "PERMISSION_DENIED",
        "Only authorized professional or administrator roles can write therapist notes."
      );
    }
  }

  private async findProfileOrThrow(profileId: string): Promise<TrainingUserProfileRecord> {
    const profile = await this.dependencies.repository.findById(profileId);
    if (!profile) {
      throw new AuthModuleError("RESOURCE_NOT_FOUND", "Profile was not found.");
    }
    return profile;
  }

  private redactForRole(
    principal: AuthenticatedPrincipal,
    profile: TrainingUserProfileRecord
  ): TrainingUserProfileRecord {
    if (
      profile.therapistNotes === undefined ||
      principal.roles.some(
        (role) => role === "therapist" || role === "org_admin" || role === "system_admin"
      )
    ) {
      return profile;
    }

    const redacted: TrainingUserProfileRecord = { ...profile };
    delete redacted.therapistNotes;
    return redacted;
  }
}

function accessTargetFor(profile: TrainingUserProfileRecord): AccessTarget {
  const target: AccessTarget = {
    userProfileId: profile.id
  };
  if (profile.organizationId !== undefined) {
    target.organizationId = profile.organizationId;
  }
  return target;
}
