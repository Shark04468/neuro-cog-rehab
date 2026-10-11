import { describe, expect, it } from "vitest";

import {
  mockTherapistPrincipal,
  mockTherapistWorkspaceUsers
} from "../src/therapist-workspace-mock.js";
import {
  buildTherapistWorkspaceAction,
  buildTherapistWorkspaceViewModel,
  TherapistWorkspaceAccessError
} from "../src/therapist-workspace-model.js";

describe("therapist-workspace-model", () => {
  it("shows only users inside the current therapist permission scope", () => {
    const viewModel = buildTherapistWorkspaceViewModel({
      principal: mockTherapistPrincipal,
      therapistName: "陈老师",
      users: mockTherapistWorkspaceUsers,
      filters: {
        trainingStatus: "all",
        risk: "all"
      }
    });

    expect(viewModel.accessibleUserCount).toBe(5);
    expect(viewModel.userRows.map((user) => user.displayName)).not.toContain("其他机构用户");
  });

  it("filters the user list by training status", () => {
    const viewModel = buildTherapistWorkspaceViewModel({
      principal: mockTherapistPrincipal,
      therapistName: "陈老师",
      users: mockTherapistWorkspaceUsers,
      filters: {
        trainingStatus: "scheduled_today",
        risk: "all"
      }
    });

    expect(viewModel.filteredUserCount).toBe(1);
    expect(viewModel.userRows[0]?.displayName).toBe("小林");
  });

  it("filters the user list by risk reminder", () => {
    const viewModel = buildTherapistWorkspaceViewModel({
      principal: mockTherapistPrincipal,
      therapistName: "陈老师",
      users: mockTherapistWorkspaceUsers,
      filters: {
        trainingStatus: "all",
        risk: "has_reminder"
      }
    });

    expect(viewModel.filteredUserCount).toBe(3);
    expect(viewModel.alerts).toHaveLength(3);
  });

  it("checks permission again before opening quick workspace actions", () => {
    const detailAction = buildTherapistWorkspaceAction({
      principal: mockTherapistPrincipal,
      users: mockTherapistWorkspaceUsers,
      userId: "trainee-lin-001",
      actionType: "open_user_detail"
    });

    expect(detailAction.label).toContain("小林");
    expect(() =>
      buildTherapistWorkspaceAction({
        principal: mockTherapistPrincipal,
        users: mockTherapistWorkspaceUsers,
        userId: "trainee-other-999",
        actionType: "generate_prescription"
      })
    ).toThrow(TherapistWorkspaceAccessError);
  });

  it("keeps dashboard wording inside auxiliary training boundaries", () => {
    const viewModel = buildTherapistWorkspaceViewModel({
      principal: mockTherapistPrincipal,
      therapistName: "陈老师",
      users: mockTherapistWorkspaceUsers,
      filters: {
        trainingStatus: "all",
        risk: "all"
      }
    });
    const text = JSON.stringify(viewModel);

    for (const bannedTerm of ["确诊", "治愈", "疗效保证", "治疗效果", "临床诊断", "诊断"]) {
      expect(text).not.toContain(bannedTerm);
    }
  });
});
