import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import { ADVANCED_FRONTEND_COMPONENTS_CSS } from "../src/advanced-front-end-components.css.js";
import {
  AdvancedFrontendComponentsExample,
  ConsentNoticePanel,
  SystemHealthIndicator,
  TrainingMissionCard
} from "../src/advanced-front-end-components.js";

describe("advanced front-end component system", () => {
  it("exposes medical-grade component classes and reduced motion safeguards", () => {
    expect(ADVANCED_FRONTEND_COMPONENTS_CSS).toContain(".ncr-training-mission-card");
    expect(ADVANCED_FRONTEND_COMPONENTS_CSS).toContain(".ncr-therapist-command-panel");
    expect(ADVANCED_FRONTEND_COMPONENTS_CSS).toContain(".ncr-eeg-wave-canvas");
    expect(ADVANCED_FRONTEND_COMPONENTS_CSS).toContain("@media (prefers-reduced-motion: reduce)");
    expect(ADVANCED_FRONTEND_COMPONENTS_CSS).not.toMatch(/strobe|blink|#ff0000/i);
  });

  it("builds reusable mission and system status components without clinical claims", () => {
    const mission = TrainingMissionCard({
      actionLabel: "开始训练",
      metrics: [{ id: "duration", label: "预计时长", value: "12 分钟" }],
      onStart: () => undefined,
      progressPercent: 45,
      subtitle: "仅用于今日辅助训练安排。",
      tasks: [
        {
          id: "attention",
          title: "目标探测",
          moduleName: "注意力训练",
          durationLabel: "6 分钟",
          difficultyLabel: "标准"
        }
      ],
      title: "今日训练任务"
    });
    const health = SystemHealthIndicator({
      items: [{ id: "eeg", label: "设备", status: "good", value: "已连接" }]
    });
    const serialized = JSON.stringify([mission, health]);

    expect(isValidElement(mission)).toBe(true);
    expect(isValidElement(health)).toBe(true);
    expect(serialized).not.toMatch(/确诊|治愈|疗效保证|治疗承诺/);
  });

  it("builds consent and showcase components for documentation examples", () => {
    expect(
      isValidElement(
        ConsentNoticePanel({
          scopeNotice: "系统仅用于辅助训练、状态观察和趋势记录。",
          sections: [
            {
              id: "privacy",
              title: "数据使用范围",
              body: "训练数据按敏感数据处理。",
              bullets: ["不导出原始脑电数据"]
            }
          ],
          title: "知情同意说明"
        })
      )
    ).toBe(true);
    expect(isValidElement(AdvancedFrontendComponentsExample())).toBe(true);
  });
});
