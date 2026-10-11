import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildParentTrainingBriefTemplate,
  mockParentTrainingBriefInput,
  ParentTrainingBriefModelError,
  parentBriefFieldStructure
} from "../src/parent-training-brief-model.js";

const PARENT_BRIEF_PAGE_SOURCE = readFileSync(
  new URL("../src/ParentTrainingBriefPage.tsx", import.meta.url),
  "utf8"
);

describe("parent-training-brief-model", () => {
  it("defines the parent brief field structure", () => {
    expect(parentBriefFieldStructure.map((field) => field.id)).toEqual([
      "brief_meta",
      "training_persistence",
      "task_completion",
      "positive_changes",
      "next_suggestions",
      "data_sources"
    ]);
    expect(parentBriefFieldStructure[0]?.dataKeys).toContain("traineeDisplayName");
  });

  it("builds a plain-language parent training brief template", () => {
    const brief = buildParentTrainingBriefTemplate(mockParentTrainingBriefInput);

    expect(brief.templateName).toBe("parent_training_brief");
    expect(brief.audience).toBe("guardian");
    expect(brief.heroMetrics).toHaveLength(3);
    expect(brief.sections.map((section) => section.id)).toEqual([
      "training_persistence",
      "task_completion",
      "positive_changes",
      "next_suggestions",
      "data_sources"
    ]);
    expect(brief.summaryText).toContain("最近 7 天");
    expect(brief.sections.find((section) => section.id === "positive_changes")?.items.length).toBe(
      4
    );
  });

  it("keeps wording simple and non-alarming", () => {
    const brief = buildParentTrainingBriefTemplate({
      ...mockParentTrainingBriefInput,
      trainingContextNote: "不要写成诊断、确诊、治愈或疗效保证，也不要展示脑电功率。"
    });
    const text = JSON.stringify(brief);

    for (const restrictedTerm of [
      "诊断",
      "确诊",
      "治愈",
      "疗效",
      "脑电功率",
      "theta",
      "alpha",
      "beta",
      "artifact"
    ]) {
      expect(text.toLowerCase()).not.toContain(restrictedTerm.toLowerCase());
    }
    expect(text).toContain("训练坚持");
    expect(text).toContain("下次建议");
  });

  it("includes clear data source descriptions", () => {
    const brief = buildParentTrainingBriefTemplate(mockParentTrainingBriefInput);

    expect(brief.dataSources.map((source) => source.label)).toEqual([
      "训练计划",
      "训练记录",
      "用户反馈",
      "设备状态摘要"
    ]);
    expect(brief.sections.find((section) => section.id === "data_sources")?.items).toHaveLength(4);
  });

  it("uses shared medical platform components on the parent brief page", () => {
    expect(PARENT_BRIEF_PAGE_SOURCE).toContain("NeuroGlassCard");
    expect(PARENT_BRIEF_PAGE_SOURCE).toContain("MedicalMetricCard");
    expect(PARENT_BRIEF_PAGE_SOURCE).toContain("DemoModeBadge");
    expect(PARENT_BRIEF_PAGE_SOURCE).toContain("PatientRiskBadge");
    expect(PARENT_BRIEF_PAGE_SOURCE).not.toContain("疗效保证");
    expect(PARENT_BRIEF_PAGE_SOURCE).not.toContain("确诊");
    expect(PARENT_BRIEF_PAGE_SOURCE).not.toContain("治愈");
  });

  it("rejects invalid input", () => {
    expect(() =>
      buildParentTrainingBriefTemplate({
        ...mockParentTrainingBriefInput,
        totalTrainingMinutes: -1
      })
    ).toThrow(ParentTrainingBriefModelError);

    expect(() =>
      buildParentTrainingBriefTemplate({
        ...mockParentTrainingBriefInput,
        dataSources: []
      })
    ).toThrow(ParentTrainingBriefModelError);
  });
});
