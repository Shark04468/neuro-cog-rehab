import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AccessControlService,
  InMemoryAuthRepository,
  InMemoryUserProfileRepository,
  UserProfileController,
  UserProfileService,
  type AuthenticatedPrincipal,
  type CreateUserProfileInput,
  type ProfileApiResponse,
  type TrainingUserProfileRecord
} from "../src/index.js";

interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

function createProfileApiFixture() {
  const authRepository = new InMemoryAuthRepository();
  const accessControl = new AccessControlService(authRepository);
  const profileRepository = new InMemoryUserProfileRepository();
  const service = new UserProfileService({
    repository: profileRepository,
    accessControl
  });
  const controller = new UserProfileController(service);

  return { accessControl, controller };
}

function baseProfileInput(overrides: Partial<CreateUserProfileInput> = {}): CreateUserProfileInput {
  return {
    traineeUserId: "trainee-1",
    organizationId: "org-1",
    basicInfo: {
      nickname: "Aster",
      ageBand: "11_13",
      gender: "prefer_not_to_say",
      trainingGoals: ["attention practice", "reaction control practice"]
    },
    trainingInfo: {
      attentionDifficultyManifestations: ["needs reminders during longer tasks"],
      impulseControlManifestations: ["responds before prompt finishes"],
      taskPersistenceLevel: "needs_prompting",
      taskPersistenceNotes: "Benefits from short breaks between task blocks."
    },
    riskScreening: {
      photosensitivityRisk: false,
      seizureHistoryNotice: false,
      severeHeadache: false,
      significantDizziness: false,
      guardianConsentStatus: "granted"
    },
    deviceInfo: {
      eegDeviceBound: true,
      eegDeviceModel: "simulator-v1",
      eegConnectionType: "simulator"
    },
    ...overrides
  };
}

function expectProfile(
  response: ProfileApiResponse<TrainingUserProfileRecord | ErrorBody>,
  expectedStatus: number
): TrainingUserProfileRecord {
  expect(response.status).toBe(expectedStatus);
  if ("error" in response.body) {
    throw new Error(`Expected profile response, received ${response.body.error.code}`);
  }
  return response.body;
}

function expectError(
  response: ProfileApiResponse<TrainingUserProfileRecord | ErrorBody>,
  expectedStatus: number,
  expectedCode: string
): void {
  expect(response.status).toBe(expectedStatus);
  if (!("error" in response.body)) {
    throw new Error("Expected error response.");
  }
  expect(response.body.error.code).toBe(expectedCode);
}

describe("UserProfileController", () => {
  it("creates and reads a profile for an authorized parent", async () => {
    const { controller } = createProfileApiFixture();
    const parent: AuthenticatedPrincipal = {
      userId: "parent-1",
      roles: ["parent"],
      organizationId: "org-1"
    };

    const created = expectProfile(
      await controller.createProfile({
        principal: parent,
        params: {},
        body: baseProfileInput()
      }),
      201
    );

    expect(created.basicInfo.nickname).toBe("Aster");
    expect(created.riskScreening.guardianConsentStatus).toBe("granted");

    const read = expectProfile(
      await controller.readProfile({
        principal: parent,
        params: { profileId: created.id },
        body: undefined
      }),
      200
    );
    expect(read.id).toBe(created.id);

    const unrelatedParent: AuthenticatedPrincipal = { userId: "parent-2", roles: ["parent"] };
    expectError(
      await controller.readProfile({
        principal: unrelatedParent,
        params: { profileId: created.id },
        body: undefined
      }),
      403,
      "SENSITIVE_DATA_SCOPE_DENIED"
    );
  });

  it("allows a bound therapist to update therapist notes and redacts them from parent reads", async () => {
    const { accessControl, controller } = createProfileApiFixture();
    const parent: AuthenticatedPrincipal = {
      userId: "parent-1",
      roles: ["parent"],
      organizationId: "org-1"
    };
    const therapist: AuthenticatedPrincipal = {
      userId: "therapist-1",
      roles: ["therapist"],
      organizationId: "org-1"
    };

    const created = expectProfile(
      await controller.createProfile({
        principal: parent,
        params: {},
        body: baseProfileInput()
      }),
      201
    );
    await accessControl.bindTherapistToProfile(created.id, therapist.userId);

    const updated = expectProfile(
      await controller.updateProfile({
        principal: therapist,
        params: { profileId: created.id },
        body: {
          therapistNotes: "Use shorter task blocks and review fatigue self-rating before sessions."
        }
      }),
      200
    );
    expect(updated.therapistNotes).toContain("shorter task blocks");

    const parentRead = expectProfile(
      await controller.readProfile({
        principal: parent,
        params: { profileId: created.id },
        body: undefined
      }),
      200
    );
    expect(parentRead.therapistNotes).toBeUndefined();
  });

  it("prevents trainees from updating sensitive risk and device fields", async () => {
    const { controller } = createProfileApiFixture();
    const parent: AuthenticatedPrincipal = {
      userId: "parent-1",
      roles: ["parent"],
      organizationId: "org-1"
    };

    const created = expectProfile(
      await controller.createProfile({
        principal: parent,
        params: {},
        body: baseProfileInput()
      }),
      201
    );

    const trainee: AuthenticatedPrincipal = {
      userId: "trainee-1",
      roles: ["trainee"],
      organizationId: "org-1",
      userProfileId: created.id
    };

    const safeUpdate = expectProfile(
      await controller.updateProfile({
        principal: trainee,
        params: { profileId: created.id },
        body: {
          basicInfo: {
            nickname: "Aster Updated"
          }
        }
      }),
      200
    );
    expect(safeUpdate.basicInfo.nickname).toBe("Aster Updated");

    expectError(
      await controller.updateProfile({
        principal: trainee,
        params: { profileId: created.id },
        body: {
          riskScreening: {
            severeHeadache: true
          }
        }
      }),
      403,
      "PERMISSION_DENIED"
    );
  });

  it("archives only within organization scope for organization administrators", async () => {
    const { controller } = createProfileApiFixture();
    const orgAdmin: AuthenticatedPrincipal = {
      userId: "org-admin-1",
      roles: ["org_admin"],
      organizationId: "org-1"
    };
    const systemAdmin: AuthenticatedPrincipal = {
      userId: "system-admin-1",
      roles: ["system_admin"]
    };

    const sameOrg = expectProfile(
      await controller.createProfile({
        principal: orgAdmin,
        params: {},
        body: baseProfileInput()
      }),
      201
    );

    const otherOrg = expectProfile(
      await controller.createProfile({
        principal: systemAdmin,
        params: {},
        body: baseProfileInput({
          traineeUserId: "trainee-2",
          organizationId: "org-2"
        })
      }),
      201
    );

    const archived = expectProfile(
      await controller.archiveProfile({
        principal: orgAdmin,
        params: { profileId: sameOrg.id },
        body: undefined
      }),
      200
    );
    expect(archived.status).toBe("archived");

    expectError(
      await controller.archiveProfile({
        principal: orgAdmin,
        params: { profileId: otherOrg.id },
        body: undefined
      }),
      403,
      "SENSITIVE_DATA_SCOPE_DENIED"
    );
  });

  it("documents profile endpoints and keeps risk fields in training-safety boundaries", () => {
    const openApi = readFileSync(
      join(process.cwd(), "openapi", "user-profile.openapi.yaml"),
      "utf8"
    );

    expect(openApi).toContain("/profiles:");
    expect(openApi).toContain("/profiles/{profileId}:");
    expect(openApi).toContain("/profiles/{profileId}/archive:");
    expect(openApi.toLowerCase()).toContain("training-safety prompt");
    expect(openApi.toLowerCase()).not.toContain("diagnosis");
    expect(openApi.toLowerCase()).not.toContain("cure");
  });
});
