import { describe, expect, it } from "vitest";

import { mockUserDetailRecords } from "../src/therapist-user-detail-mock.js";
import {
  buildTherapistUserDetailViewModel,
  buildWeeklyReportDraft,
  TherapistUserDetailError
} from "../src/therapist-user-detail-model.js";
import {
  mockTherapistPrincipal,
  mockTherapistWorkspaceUsers
} from "../src/therapist-workspace-mock.js";

describe("therapist-user-detail-model", () => {
  it("builds user detail charts for week range", () => {
    const viewModel = buildTherapistUserDetailViewModel({
      principal: mockTherapistPrincipal,
      users: mockTherapistWorkspaceUsers,
      detailRecords: mockUserDetailRecords,
      userId: "trainee-lin-001",
      range: "week"
    });

    expect(viewModel.basicInfo.displayName).toBe("小林");
    expect(viewModel.attentionTrendChart.labels).toHaveLength(7);
    expect(viewModel.responseErrorTrendChart.series).toHaveLength(2);
    expect(viewModel.eegTrendChart.series.map((series) => series.name)).toEqual([
      "注意指数",
      "放松指数",
      "疲劳指数"
    ]);
  });

  it("switches chart data for month range", () => {
    const viewModel = buildTherapistUserDetailViewModel({
      principal: mockTherapistPrincipal,
      users: mockTherapistWorkspaceUsers,
      detailRecords: mockUserDetailRecords,
      userId: "trainee-lin-001",
      range: "month"
    });

    expect(viewModel.attentionTrendChart.labels).toEqual(["第1周", "第2周", "第3周", "第4周"]);
  });

  it("selects one training record detail by id", () => {
    const viewModel = buildTherapistUserDetailViewModel({
      principal: mockTherapistPrincipal,
      users: mockTherapistWorkspaceUsers,
      detailRecords: mockUserDetailRecords,
      userId: "trainee-lin-001",
      range: "week",
      selectedTrainingRecordId: "record-lin-20260615"
    });

    expect(viewModel.selectedTrainingRecord.trainingTypeLabel).toBe("Go/No-Go");
    expect(viewModel.selectedTrainingRecord.falseAlarmRate).toBeGreaterThan(0);
  });

  it("rejects unauthorized user detail access", () => {
    expect(() =>
      buildTherapistUserDetailViewModel({
        principal: mockTherapistPrincipal,
        users: mockTherapistWorkspaceUsers,
        detailRecords: mockUserDetailRecords,
        userId: "trainee-other-999",
        range: "week"
      })
    ).toThrow(TherapistUserDetailError);
  });

  it("builds a sensitive weekly report draft", () => {
    const report = buildWeeklyReportDraft({
      principal: mockTherapistPrincipal,
      users: mockTherapistWorkspaceUsers,
      detailRecords: mockUserDetailRecords,
      userId: "trainee-lin-001",
      now: new Date("2026-06-16T03:00:00.000Z")
    });

    expect(report.dataSensitivity).toBe("sensitive");
    expect(report.periodLabel).toBe("最近7天");
    expect(report.keyObservations.length).toBeGreaterThan(0);
    expect(report.nextWeekSuggestions.length).toBeGreaterThan(0);
  });

  it("keeps detail wording inside auxiliary training boundaries", () => {
    const viewModel = buildTherapistUserDetailViewModel({
      principal: mockTherapistPrincipal,
      users: mockTherapistWorkspaceUsers,
      detailRecords: mockUserDetailRecords,
      userId: "trainee-lin-001",
      range: "week"
    });
    const text = JSON.stringify(viewModel);

    for (const bannedTerm of ["确诊", "治愈", "疗效保证", "治疗效果", "临床诊断", "诊断"]) {
      expect(text).not.toContain(bannedTerm);
    }
  });
});
