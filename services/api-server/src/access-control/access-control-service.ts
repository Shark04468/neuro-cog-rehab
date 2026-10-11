import type { UserRole } from "@neuro-cog-rehab/shared-types";

import { AuthModuleError } from "../auth/auth-errors.js";
import type { AuthRepository, ProfileAccessRecord } from "../auth/auth-repository.js";
import type { AuthenticatedPrincipal } from "../auth/auth-types.js";
import { hasPermission, type Permission } from "./rbac.js";

export interface AccessTarget {
  /** Target training user profile id. Most sensitive records should be scoped to this id. */
  userProfileId?: string;
  /** Organization id for organization-scoped administration. */
  organizationId?: string;
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
}

/**
 * RBAC plus data-scope checks. This prevents users from reading training, EEG,
 * and report records outside self or explicitly authorized relationships.
 */
export class AccessControlService {
  constructor(private readonly repository: AuthRepository) {}

  assertPermission(principal: AuthenticatedPrincipal, permission: Permission): void {
    if (!hasPermission(principal.roles, permission)) {
      throw new AuthModuleError(
        "PERMISSION_DENIED",
        "Role does not grant the requested permission."
      );
    }
  }

  async assertCanAccessProfile(
    principal: AuthenticatedPrincipal,
    target: AccessTarget
  ): Promise<void> {
    const decision = await this.canAccessProfile(principal, target);
    if (!decision.allowed) {
      throw new AuthModuleError("SENSITIVE_DATA_SCOPE_DENIED", decision.reason);
    }
  }

  async canAccessProfile(
    principal: AuthenticatedPrincipal,
    target: AccessTarget
  ): Promise<AccessDecision> {
    if (principal.roles.includes("system_admin")) {
      return allow("System administrator access.");
    }

    if (principal.roles.includes("org_admin")) {
      return this.evaluateOrganizationAdmin(principal, target);
    }

    if (!target.userProfileId) {
      return deny("Target profile id is required.");
    }

    if (principal.roles.includes("trainee") && principal.userProfileId === target.userProfileId) {
      return allow("Trainee can access own profile data.");
    }

    const profileAccess = await this.repository.findProfileAccess(target.userProfileId);
    if (!profileAccess) {
      return deny("Target profile is not registered for access control.");
    }

    if (
      principal.roles.includes("parent") &&
      profileAccess.parentUserIds.includes(principal.userId)
    ) {
      return allow("Parent can access authorized profile data.");
    }

    if (
      principal.roles.includes("therapist") &&
      profileAccess.therapistUserIds.includes(principal.userId)
    ) {
      return allow("Therapist can access bound profile data.");
    }

    return deny("No authorized relationship to target profile.");
  }

  async bindParentToProfile(userProfileId: string, parentUserId: string): Promise<void> {
    const record = await this.getOrCreateProfileAccess(userProfileId);
    await this.repository.upsertProfileAccess({
      ...record,
      parentUserIds: unique([...record.parentUserIds, parentUserId])
    });
  }

  async bindTherapistToProfile(userProfileId: string, therapistUserId: string): Promise<void> {
    const record = await this.getOrCreateProfileAccess(userProfileId);
    await this.repository.upsertProfileAccess({
      ...record,
      therapistUserIds: unique([...record.therapistUserIds, therapistUserId])
    });
  }

  async registerProfileOwner(
    userProfileId: string,
    traineeUserId: string,
    organizationId?: string
  ): Promise<void> {
    const record = await this.getOrCreateProfileAccess(userProfileId);
    const nextRecord: ProfileAccessRecord = {
      ...record,
      traineeUserId
    };
    if (organizationId !== undefined) {
      nextRecord.organizationId = organizationId;
    }
    await this.repository.upsertProfileAccess(nextRecord);
  }

  private evaluateOrganizationAdmin(
    principal: AuthenticatedPrincipal,
    target: AccessTarget
  ): AccessDecision {
    if (!principal.organizationId) {
      return deny("Organization administrator has no organization scope.");
    }
    if (!target.organizationId) {
      return deny("Organization-scoped target is required.");
    }
    if (principal.organizationId !== target.organizationId) {
      return deny("Organization administrator cannot access another organization.");
    }
    return allow("Organization administrator can access organization-scoped data.");
  }

  private async getOrCreateProfileAccess(userProfileId: string): Promise<ProfileAccessRecord> {
    return (
      (await this.repository.findProfileAccess(userProfileId)) ?? {
        userProfileId,
        parentUserIds: [],
        therapistUserIds: []
      }
    );
  }
}

function allow(reason: string): AccessDecision {
  return { allowed: true, reason };
}

function deny(reason: string): AccessDecision {
  return { allowed: false, reason };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function primaryRole(principal: AuthenticatedPrincipal): UserRole {
  return principal.roles[0] ?? "trainee";
}
