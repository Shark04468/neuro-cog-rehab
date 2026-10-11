import { describe, expect, it } from "vitest";

import {
  mockTherapistPrincipal,
  mockTherapistWorkspaceUsers
} from "../src/therapist-workspace-mock.js";
import {
  applySavedPrescriptionToWorkspaceUsers,
  buildTrainingPrescriptionEditorViewModel,
  createDefaultTrainingPrescriptionDraft,
  saveTrainingPrescriptionDraft,
  TrainingPrescriptionEditorValidationError,
  validateTrainingPrescriptionDraft
} from "../src/training-prescription-editor-model.js";
import { TherapistWorkspaceAccessError } from "../src/therapist-workspace-model.js";

describe("training-prescription-editor-model", () => {
  it("builds conservative defaults for users with fatigue reminders", () => {
    const qiqi = mockTherapistWorkspaceUsers.find((user) => user.id === "trainee-qiqi-004");

    expect(qiqi).toBeDefined();
    const draft = createDefaultTrainingPrescriptionDraft(qiqi!);

    expect(draft.weeklySessionCount).toBe(2);
    expect(draft.sessionDurationMinutes).toBe(12);
    expect(draft.initialDifficulty).toBe("light");
    expect(draft.riskReminderKeys).toContain("fatigue_rising");
  });

  it("builds editor options for an authorized therapist", () => {
    const viewModel = buildTrainingPrescriptionEditorViewModel({
      principal: mockTherapistPrincipal,
      users: mockTherapistWorkspaceUsers,
      userId: "trainee-lin-001",
      existingPrescription: null
    });

    expect(viewModel.displayName).toBe("小林");
    expect(viewModel.moduleOptions).toHaveLength(4);
    expect(viewModel.previewTasks.length).toBeGreaterThan(0);
    expect(viewModel.scopeNotice).toContain("辅助训练安排");
  });

  it("validates before saving unsafe prescription drafts", () => {
    const draft = {
      ...createDefaultTrainingPrescriptionDraft(mockTherapistWorkspaceUsers[0]!),
      weeklySessionCount: 6,
      sessionDurationMinutes: 35,
      moduleCombination: [],
      dailyMaxTrainingMinutes: 20,
      riskReminderKeys: []
    };

    const issues = validateTrainingPrescriptionDraft({
      principal: mockTherapistPrincipal,
      users: mockTherapistWorkspaceUsers,
      draft
    });

    expect(issues.map((issue) => issue.field)).toContain("weeklySessionCount");
    expect(issues.map((issue) => issue.field)).toContain("moduleCombination");
    expect(() =>
      saveTrainingPrescriptionDraft({
        principal: mockTherapistPrincipal,
        users: mockTherapistWorkspaceUsers,
        draft,
        previousPrescription: null,
        savedAt: "2026-06-16T00:00:00.000Z"
      })
    ).toThrow(TrainingPrescriptionEditorValidationError);
  });

  it("saves prescription changes with a sensitive operation log", () => {
    const draft = createDefaultTrainingPrescriptionDraft(mockTherapistWorkspaceUsers[0]!);

    const result = saveTrainingPrescriptionDraft({
      principal: mockTherapistPrincipal,
      users: mockTherapistWorkspaceUsers,
      draft,
      previousPrescription: null,
      savedAt: "2026-06-16T00:00:00.000Z"
    });

    expect(result.prescription.status).toBe("active");
    expect(result.prescription.version).toBe(1);
    expect(result.operationLog.dataSensitivity).toBe("sensitive");
    expect(result.operationLog.message).toContain("小林");
    expect(result.operationLog.afterSummary).toContain("每周");
  });

  it("updates workspace tasks after a prescription is saved", () => {
    const draft = {
      ...createDefaultTrainingPrescriptionDraft(mockTherapistWorkspaceUsers[4]!),
      moduleCombination: ["music_therapy", "rhythm_navigation"] as const
    };
    const result = saveTrainingPrescriptionDraft({
      principal: mockTherapistPrincipal,
      users: mockTherapistWorkspaceUsers,
      draft,
      previousPrescription: null,
      savedAt: "2026-06-16T00:00:00.000Z"
    });

    const updatedUsers = applySavedPrescriptionToWorkspaceUsers(
      mockTherapistWorkspaceUsers,
      result.prescription
    );
    const updatedUser = updatedUsers.find((user) => user.id === "trainee-an-005");

    expect(updatedUser?.trainingStatus).toBe("scheduled_today");
    expect(updatedUser?.todayPlan.moduleNames).toEqual(["音乐放松", "节律导航"]);
    expect(updatedUser?.todayPlan.prescriptionStatus).toBe("ready");
  });

  it("rejects unauthorized prescription editing", () => {
    expect(() =>
      buildTrainingPrescriptionEditorViewModel({
        principal: mockTherapistPrincipal,
        users: mockTherapistWorkspaceUsers,
        userId: "trainee-other-999",
        existingPrescription: null
      })
    ).toThrow(TherapistWorkspaceAccessError);
  });

  it("keeps editor wording inside auxiliary training boundaries", () => {
    const viewModel = buildTrainingPrescriptionEditorViewModel({
      principal: mockTherapistPrincipal,
      users: mockTherapistWorkspaceUsers,
      userId: "trainee-lin-001",
      existingPrescription: null
    });
    const text = JSON.stringify(viewModel);

    for (const bannedTerm of ["确诊", "治愈", "疗效保证", "治疗效果", "临床诊断", "诊断"]) {
      expect(text).not.toContain(bannedTerm);
    }
  });
});
