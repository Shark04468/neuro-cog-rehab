import { describe, expect, it } from "vitest";

import {
  exportSingleSessionReportPdf,
  generateSingleSessionHtmlReport,
  generateSingleSessionTrainingReport,
  SingleSessionReportGeneratorError,
  type SingleSessionReportInput
} from "../src/index.js";

const baseInput: SingleSessionReportInput = {
  reportId: "report-session-001",
  generatedAt: "2026-06-16T10:00:00.000Z",
  userInfo: {
    userId: "trainee-001",
    userProfileId: "profile-001",
    displayName: "小林",
    ageRange: "10-12",
    guardianConsentLabel: "已确认"
  },
  sessionInfo: {
    sessionId: "session-001",
    startedAt: "2026-06-16T09:00:00.000Z",
    endedAt: "2026-06-16T09:24:00.000Z",
    durationSeconds: 1440,
    completionStatus: "completed"
  },
  completedModules: [
    {
      moduleType: "music_therapy",
      durationSeconds: 360,
      completionStatus: "completed"
    },
    {
      moduleType: "attention_game",
      durationSeconds: 480,
      completionStatus: "completed"
    },
    {
      moduleType: "rhythm_navigation",
      durationSeconds: 600,
      completionStatus: "completed"
    }
  ],
  behaviorMetrics: {
    totalTrials: 45,
    correctCount: 37,
    accuracyRate: 0.82,
    omissionCount: 4,
    omissionRate: 0.09,
    falseAlarmCount: 3,
    falseAlarmRate: 0.07,
    averageReactionTimeMs: 730,
    reactionTimeVariabilityMs: 145,
    completionRate: 1,
    routeAccuracy: 0.8,
    timingErrorMs: 180
  },
  eegSummary: {
    averageAttentionIndex: 68,
    averageRelaxationIndex: 61,
    averageFatigueIndex: 33,
    validSampleRate: 0.91,
    artifactCount: 8,
    frameCount: 1200,
    qualityStatus: "good"
  },
  musicAdaptation: {
    trackTitle: "森林慢节奏",
    suitabilityScore: 78,
    recommendationLabel: "可继续观察使用",
    attentionChange: 4,
    relaxationChange: 8,
    fatigueChange: -3,
    userFeedbackLabel: "喜欢",
    nextMusicSuggestion: "可继续用于训练前准备或训练后放松。"
  },
  abnormalEvents: [
    {
      eventType: "low_signal_quality",
      occurredAt: "2026-06-16T09:12:00.000Z",
      severity: "warning",
      message: "第 12 分钟 EEG 信号短暂波动，已提示调整佩戴。"
    }
  ],
  sessionRecommendation: "下次建议继续保持轻量到标准难度，关注漏按率和反应时波动，训练中保留休息。"
};

describe("single-session-report", () => {
  it("generates a structured single-session report with restrained wording", () => {
    const report = generateSingleSessionTrainingReport(baseInput);

    expect(report.dataSensitivity).toBe("sensitive");
    expect(report.sections.map((section) => section.title)).toEqual([
      "用户信息",
      "训练时间",
      "行为表现指标",
      "EEG 状态摘要",
      "音乐适配结果"
    ]);
    expect(report.narrativeSummary).toContain("训练回顾");
    expect(report.narrativeSummary).toContain("趋势追踪");
    expect(report.recommendation).toContain("下次建议");
  });

  it("supports HTML report export", () => {
    const result = generateSingleSessionHtmlReport(baseInput);

    expect(result.fileName).toBe("report-session-001.html");
    expect(result.mimeType).toBe("text/html; charset=utf-8");
    expect(result.html).toContain("<!doctype html>");
    expect(result.html).toContain("单次训练报告");
    expect(result.html).toContain("行为表现指标");
    expect(result.html).toContain("EEG 状态摘要");
    expect(result.html).toContain("音乐适配结果");
    expect(result.html).toContain("异常事件");
  });

  it("supports PDF export as a valid PDF byte stream", () => {
    const result = exportSingleSessionReportPdf(baseInput);
    const pdfHead = new TextDecoder().decode(result.data.slice(0, 8));
    const pdfText = new TextDecoder().decode(result.data);

    expect(result.fileName).toBe("report-session-001.pdf");
    expect(result.mimeType).toBe("application/pdf");
    expect(pdfHead).toBe("%PDF-1.4");
    expect(pdfText).toContain("xref");
    expect(pdfText).toContain("%%EOF");
  });

  it("sanitizes restricted wording from free-text fields", () => {
    const report = generateSingleSessionTrainingReport({
      ...baseInput,
      sessionRecommendation: "不要写成诊断，也不要写成治愈或疗效确定。",
      abnormalEvents: [
        {
          eventType: "other",
          occurredAt: "2026-06-16T09:10:00.000Z",
          severity: "info",
          message: "家长备注包含临床诊断字样，报告中应替换。"
        }
      ]
    });
    const html = generateSingleSessionHtmlReport({
      ...baseInput,
      sessionRecommendation: "不要写成诊断，也不要写成治愈或疗效确定。"
    }).html;
    const text = `${JSON.stringify(report)} ${html}`;

    for (const bannedTerm of ["治愈", "诊断", "疗效确定", "疗效保证", "治疗效果", "临床诊断"]) {
      expect(text).not.toContain(bannedTerm);
    }
  });

  it("rejects invalid report input", () => {
    expect(() =>
      generateSingleSessionTrainingReport({
        ...baseInput,
        behaviorMetrics: {
          ...baseInput.behaviorMetrics,
          accuracyRate: 1.4
        }
      })
    ).toThrow(SingleSessionReportGeneratorError);

    expect(() =>
      generateSingleSessionTrainingReport({
        ...baseInput,
        completedModules: []
      })
    ).toThrow(SingleSessionReportGeneratorError);
  });
});
