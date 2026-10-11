import { describe, expect, it } from "vitest";

import {
  buildWeeklyTrainingReportView,
  exportWeeklyTrainingReportPdf,
  generateWeeklyTrainingHtmlReport,
  generateWeeklyTrainingReport,
  mockGuardianWeeklyTrainingReportView,
  mockTherapistWeeklyTrainingReportView,
  mockWeeklyTrainingReportInput,
  WeeklyTrainingReportGeneratorError,
  type WeeklyTrainingReportInput
} from "../src/index.js";

const baseInput: WeeklyTrainingReportInput = mockWeeklyTrainingReportInput;

describe("weekly-training-report", () => {
  it("generates a structured weekly report with trend-only wording", () => {
    const report = generateWeeklyTrainingReport(baseInput);

    expect(report.dataSensitivity).toBe("sensitive");
    expect(report.completedSessionCount).toBe(4);
    expect(report.totalTrainingDurationMinutes).toBe(66);
    expect(report.completionRate).toBe(1);
    expect(report.sections.map((section) => section.title)).toEqual([
      "训练完成情况",
      "行为趋势",
      "音乐疗愈适配趋势",
      "EEG 状态趋势",
      "治疗师备注"
    ]);
    expect(report.trends.reaction.direction).toBe("improving");
    expect(report.trends.eeg.fatigue.direction).toBe("improving");
    expect(report.narrativeSummary).toContain("趋势追踪");
    expect(report.scopeNotice).toContain("辅助训练记录");
  });

  it("builds therapist and guardian views with different detail levels", () => {
    const report = generateWeeklyTrainingReport(baseInput);
    const therapistView = buildWeeklyTrainingReportView(report, "therapist");
    const guardianView = buildWeeklyTrainingReportView(report, "guardian");

    expect(therapistView.canViewDetailedMetrics).toBe(true);
    expect(guardianView.canViewDetailedMetrics).toBe(false);
    expect(therapistView.sections.some((section) => section.title === "治疗师备注")).toBe(true);
    expect(guardianView.sections.map((section) => section.title)).toEqual(["本周看点", "状态参考"]);
    expect(guardianView.nextWeekSuggestions.length).toBeLessThanOrEqual(3);
  });

  it("supports HTML export for both therapist and guardian audiences", () => {
    const therapistHtml = generateWeeklyTrainingHtmlReport(baseInput, { audience: "therapist" });
    const guardianHtml = generateWeeklyTrainingHtmlReport(baseInput, { audience: "guardian" });

    expect(therapistHtml.fileName).toBe("weekly-report-demo-001-therapist.html");
    expect(guardianHtml.fileName).toBe("weekly-report-demo-001-guardian.html");
    expect(therapistHtml.mimeType).toBe("text/html; charset=utf-8");
    expect(therapistHtml.html).toContain("<!doctype html>");
    expect(therapistHtml.html).toContain("治疗师端周报");
    expect(guardianHtml.html).toContain("家长端周报");
    expect(guardianHtml.html).toContain("本周看点");
  });

  it("supports PDF export as a valid byte stream", () => {
    const result = exportWeeklyTrainingReportPdf(baseInput, { audience: "guardian" });
    const pdfHead = new TextDecoder().decode(result.data.slice(0, 8));
    const pdfText = new TextDecoder().decode(result.data);

    expect(result.fileName).toBe("weekly-report-demo-001-guardian.pdf");
    expect(result.mimeType).toBe("application/pdf");
    expect(pdfHead).toBe("%PDF-1.4");
    expect(pdfText).toContain("xref");
    expect(pdfText).toContain("%%EOF");
  });

  it("sanitizes restricted wording from free-text fields", () => {
    const report = generateWeeklyTrainingReport({
      ...baseInput,
      therapistNotes: "这段备注包含确诊、治愈和疗效确定等不应展示的词。"
    });
    const viewText = JSON.stringify(buildWeeklyTrainingReportView(report, "therapist"));

    for (const restrictedTerm of [
      "确诊",
      "治愈",
      "疗效确定",
      "疗效保证",
      "治疗效果",
      "临床诊断",
      "诊断"
    ]) {
      expect(viewText).not.toContain(restrictedTerm);
    }
  });

  it("rejects invalid weekly report input", () => {
    expect(() =>
      generateWeeklyTrainingReport({
        ...baseInput,
        plan: {
          ...baseInput.plan,
          plannedSessionCount: -1
        }
      })
    ).toThrow(WeeklyTrainingReportGeneratorError);

    expect(() =>
      generateWeeklyTrainingReport({
        ...baseInput,
        sessions: [
          {
            ...baseInput.sessions[0],
            behaviorMetrics: {
              ...baseInput.sessions[0]?.behaviorMetrics,
              accuracyRate: 1.2
            }
          }
        ]
      })
    ).toThrow(WeeklyTrainingReportGeneratorError);
  });

  it("exports reusable mock data for demos", () => {
    expect(mockTherapistWeeklyTrainingReportView.audience).toBe("therapist");
    expect(mockGuardianWeeklyTrainingReportView.audience).toBe("guardian");
    expect(mockTherapistWeeklyTrainingReportView.summaryCards).toHaveLength(3);
    expect(mockGuardianWeeklyTrainingReportView.trendCards.length).toBeGreaterThan(0);
  });
});
