import { describe, expect, it } from "vitest";

import {
  AccessControlService,
  AuthModuleError,
  InMemoryAuthRepository,
  type AuthenticatedPrincipal
} from "../src/index.js";

describe("AccessControlService", () => {
  it("allows trainees to access only their own training profile", async () => {
    const repository = new InMemoryAuthRepository();
    const accessControl = new AccessControlService(repository);
    const trainee: AuthenticatedPrincipal = {
      userId: "trainee-1",
      roles: ["trainee"],
      organizationId: "org-1",
      userProfileId: "profile-1"
    };

    await expect(
      accessControl.assertCanAccessProfile(trainee, {
        userProfileId: "profile-1"
      })
    ).resolves.toBeUndefined();

    await expect(
      accessControl.assertCanAccessProfile(trainee, {
        userProfileId: "profile-2"
      })
    ).rejects.toMatchObject<AuthModuleError>({
      appError: { code: "SENSITIVE_DATA_SCOPE_DENIED" }
    });
  });

  it("allows parents and therapists to access only authorized trainee data", async () => {
    const repository = new InMemoryAuthRepository();
    const accessControl = new AccessControlService(repository);
    await accessControl.registerProfileOwner("profile-1", "trainee-1", "org-1");
    await accessControl.bindParentToProfile("profile-1", "parent-1");
    await accessControl.bindTherapistToProfile("profile-1", "therapist-1");

    const parent: AuthenticatedPrincipal = { userId: "parent-1", roles: ["parent"] };
    const therapist: AuthenticatedPrincipal = {
      userId: "therapist-1",
      roles: ["therapist"],
      organizationId: "org-1"
    };
    const unrelatedTherapist: AuthenticatedPrincipal = {
      userId: "therapist-2",
      roles: ["therapist"],
      organizationId: "org-1"
    };

    await expect(
      accessControl.assertCanAccessProfile(parent, { userProfileId: "profile-1" })
    ).resolves.toBeUndefined();
    await expect(
      accessControl.assertCanAccessProfile(therapist, { userProfileId: "profile-1" })
    ).resolves.toBeUndefined();
    await expect(
      accessControl.assertCanAccessProfile(unrelatedTherapist, { userProfileId: "profile-1" })
    ).rejects.toMatchObject<AuthModuleError>({
      appError: { code: "SENSITIVE_DATA_SCOPE_DENIED" }
    });
  });

  it("limits organization administrators to their organization scope", async () => {
    const accessControl = new AccessControlService(new InMemoryAuthRepository());
    const orgAdmin: AuthenticatedPrincipal = {
      userId: "org-admin-1",
      roles: ["org_admin"],
      organizationId: "org-1"
    };

    await expect(
      accessControl.assertCanAccessProfile(orgAdmin, { organizationId: "org-1" })
    ).resolves.toBeUndefined();

    await expect(
      accessControl.assertCanAccessProfile(orgAdmin, { organizationId: "org-2" })
    ).rejects.toMatchObject<AuthModuleError>({
      appError: { code: "SENSITIVE_DATA_SCOPE_DENIED" }
    });
  });

  it("allows system administrators across data scopes but still enforces RBAC permissions", () => {
    const accessControl = new AccessControlService(new InMemoryAuthRepository());
    const systemAdmin: AuthenticatedPrincipal = {
      userId: "system-admin-1",
      roles: ["system_admin"]
    };
    const parent: AuthenticatedPrincipal = {
      userId: "parent-1",
      roles: ["parent"]
    };

    expect(() => accessControl.assertPermission(systemAdmin, "audit:read:system")).not.toThrow();
    expect(() => accessControl.assertPermission(parent, "audit:read:system")).toThrow(
      AuthModuleError
    );
  });
});
