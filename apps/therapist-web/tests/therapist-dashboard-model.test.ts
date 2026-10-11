import { describe, expect, it } from "vitest";

import { mockTherapistDashboardSupplement } from "../src/therapist-dashboard-mock.js";
import {
  assertTherapistDashboardUserAccess,
  buildTherapistDashboardViewModel,
  createDefaultTherapistDashboardFilters,
  TherapistDashboardModelError
} from "../src/therapist-dashboard-model.js";
import {
  mockTherapistPrincipal,
  mockTherapistWorkspaceUsers
} from "../src/therapist-workspace-mock.js";

describe("therapist dashboard model", () => {
  it("builds command center metrics for authorized therapist users only", () => {
    const viewModel = buildTherapistDashboardViewModel({
      principal: mockTherapistPrincipal,
      therapistName: "陈老师",
      users: mockTherapistWorkspaceUsers,
      filters: createDefaultTherapistDashboardFilters(),
      supplement: mockTherapistDashboardSupplement
    });

    expect(viewModel.managedUserCount).toBe(5);
    expect(viewModel.todayDueCount).toBe(3);
    expect(viewModel.completedTodayCount).toBe(1);
    expect(viewModel.riskAlertCount).toBe(3);
    expect(viewModel.pendingReportCount).toBe(4);
    expect(viewModel.statMetrics).toHaveLength(6);
    expect(viewModel.moduleHeat.length).toBeGreaterThan(0);
    expect(viewModel.eegQuality.map((item) => item.label)).toContain("稳定信号");
    expect(viewModel.filteredUsers.map((user) => user.id)).not.toContain("trainee-other-999");
  });

  it("filters users by search term, training status and risk level", () => {
    const viewModel = buildTherapistDashboardViewModel({
      principal: mockTherapistPrincipal,
      therapistName: "陈老师",
      users: mockTherapistWorkspaceUsers,
      filters: {
        trainingStatus: "paused",
        risk: "watch",
        searchTerm: "琪琪"
      },
      supplement: mockTherapistDashboardSupplement
    });

    expect(viewModel.filteredUsers).toHaveLength(1);
    expect(viewModel.filteredUsers[0]?.displayName).toBe("琪琪");
    expect(viewModel.filteredUsers[0]?.currentPrescriptionLabel).toBe("需调整处方");
  });

  it("rejects unauthorized user access", () => {
    expect(() =>
      assertTherapistDashboardUserAccess({
        principal: mockTherapistPrincipal,
        users: mockTherapistWorkspaceUsers,
        userId: "trainee-other-999"
      })
    ).toThrow(TherapistDashboardModelError);
  });

  it("allows access to a bound training user", () => {
    const user = assertTherapistDashboardUserAccess({
      principal: mockTherapistPrincipal,
      users: mockTherapistWorkspaceUsers,
      userId: "trainee-lin-001"
    });

    expect(user.id).toBe("trainee-lin-001");
  });
});
