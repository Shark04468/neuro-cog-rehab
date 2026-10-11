import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import {
  CognitiveRadarChart,
  EmptyChartState,
  MEDICAL_CHART_COMPONENTS_CSS,
  MetricRingChart,
  StatusDistributionChart,
  TrainingHeatmap,
  TrendLineChart
} from "../src/medical-chart-components.js";
import {
  buildCognitiveRadarChartOption,
  buildMetricRingChartOption,
  buildStatusDistributionChartOption,
  buildTrainingHeatmapOption,
  buildTrendLineChartOption,
  getMedicalChartColor,
  medicalChartTheme,
  useMedicalChartOptions
} from "../src/medical-monitoring-chart-theme.js";

describe("medical chart theme", () => {
  it("uses a transparent dashboard background and low-saturation medical palette", () => {
    expect(medicalChartTheme.backgroundColor).toBe("transparent");
    expect(medicalChartTheme.color).toContain("#145f85");
    expect(medicalChartTheme.color).toContain("#22a8a1");
    expect(JSON.stringify(medicalChartTheme.color)).not.toMatch(/#ff0000|red|lime/i);
  });

  it("merges common tooltip, legend, and reduced animation defaults", () => {
    const option = useMedicalChartOptions(
      {
        tooltip: { trigger: "item" },
        legend: { show: false }
      },
      { safetyMode: true }
    );

    expect(option.backgroundColor).toBe("transparent");
    expect(JSON.stringify(option.tooltip)).toContain("blur");
    expect(JSON.stringify(option.legend)).toContain("false");
    expect(option.animationDuration).toBe(420);
  });

  it("builds trend line options with dashed blue-gray grids and soft amber abnormal tone", () => {
    const option = buildTrendLineChartOption({
      title: "attention trend",
      categories: ["Mon", "Tue"],
      area: true,
      series: [{ name: "fatigue", values: [40, 58], tone: "softAmber" }]
    });

    expect(JSON.stringify(option)).toContain("dashed");
    expect(JSON.stringify(option)).toContain(getMedicalChartColor("softAmber"));
    expect(JSON.stringify(option)).toContain("rgba(255, 255, 255");
  });

  it("builds ring, heatmap, radar, and distribution options without default red-green contrast", () => {
    const ring = buildMetricRingChartOption({ label: "attention", value: 120 });
    const heatmap = buildTrainingHeatmapOption({
      title: "module heat",
      xLabels: ["Mon"],
      yLabels: ["attention"],
      data: [{ x: "Mon", y: "attention", value: 72 }]
    });
    const radar = buildCognitiveRadarChartOption({
      title: "state",
      indicators: [{ name: "attention" }, { name: "relax" }, { name: "fatigue" }],
      values: [70, 52, 28]
    });
    const status = buildStatusDistributionChartOption({
      title: "status",
      items: [{ label: "completed", value: 4, tone: "cyanGreen" }]
    });
    const joined = JSON.stringify([ring, heatmap, radar, status]);

    expect(joined).toContain("heatmap");
    expect(joined).toContain("radar");
    expect(joined).toContain("pie");
    expect(joined).not.toMatch(/#00ff00|#ff0000|lime|red/i);
  });
});

describe("medical chart components", () => {
  it("exposes reusable classes and reduced motion safeguards", () => {
    expect(MEDICAL_CHART_COMPONENTS_CSS).toContain(".ncr-trend-line-chart");
    expect(MEDICAL_CHART_COMPONENTS_CSS).toContain(".ncr-metric-ring-chart");
    expect(MEDICAL_CHART_COMPONENTS_CSS).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("renders empty state and chart component shells for dashboard reuse", () => {
    expect(isValidElement(EmptyChartState({ title: "empty" }))).toBe(true);
    expect(
      isValidElement(
        TrendLineChart({
          title: "trend",
          categories: ["Mon", "Tue"],
          series: [{ name: "attention", values: [60, 64], tone: "medicalBlue" }]
        })
      )
    ).toBe(true);
    expect(isValidElement(MetricRingChart({ label: "attention", value: 72 }))).toBe(true);
    expect(
      isValidElement(
        TrainingHeatmap({
          title: "heat",
          xLabels: ["Mon"],
          yLabels: ["attention"],
          data: [{ x: "Mon", y: "attention", value: 80 }]
        })
      )
    ).toBe(true);
    expect(
      isValidElement(
        CognitiveRadarChart({
          title: "state",
          dimensions: [
            { label: "attention", value: 70 },
            { label: "relax", value: 52 },
            { label: "fatigue", value: 28 }
          ]
        })
      )
    ).toBe(true);
    expect(
      isValidElement(
        StatusDistributionChart({
          title: "status",
          items: [{ label: "completed", value: 3 }]
        })
      )
    ).toBe(true);
  });
});
