export type MedicalChartTone =
  | "medicalBlue"
  | "cyanGreen"
  | "calmBlue"
  | "palePurple"
  | "softGreen"
  | "softAmber"
  | "mutedOrange"
  | "grayBlue";

export interface MedicalMonitoringLineSeries {
  name: string;
  data: number[];
  color?: string | undefined;
  tone?: MedicalChartTone | undefined;
}

export interface MedicalMonitoringLineChartInput {
  title: string;
  categories: string[];
  series: MedicalMonitoringLineSeries[];
  yAxisName?: string | undefined;
  area?: boolean | undefined;
}

export interface MedicalChartSeriesInput {
  name: string;
  values: number[];
  tone?: MedicalChartTone | undefined;
  color?: string | undefined;
}

export interface MedicalTrendLineChartInput {
  title: string;
  categories: string[];
  series: MedicalChartSeriesInput[];
  yAxisName?: string | undefined;
  min?: number | undefined;
  max?: number | undefined;
  area?: boolean | undefined;
}

export interface MetricRingChartOptionInput {
  label: string;
  value: number;
  max?: number;
  tone?: MedicalChartTone;
}

export interface TrainingHeatmapOptionInput {
  title: string;
  xLabels: string[];
  yLabels: string[];
  data: Array<{ x: string; y: string; value: number }>;
}

export interface CognitiveRadarChartOptionInput {
  title: string;
  indicators: Array<{ name: string; max?: number }>;
  values: number[];
  tone?: MedicalChartTone;
}

export interface StatusDistributionItem {
  label: string;
  value: number;
  tone?: MedicalChartTone;
}

export interface StatusDistributionChartOptionInput {
  title: string;
  items: StatusDistributionItem[];
}

export interface MedicalChartOptionConfig {
  animation?: boolean;
  safetyMode?: boolean;
}

export const MEDICAL_MONITORING_CHART_COLORS = {
  medicalBlue: "#145f85",
  cyanGreen: "#22a8a1",
  calmBlue: "#4f8ed8",
  palePurple: "#8a91d6",
  softGreen: "#62b894",
  softAmber: "#d5a64a",
  mutedOrange: "#c17a35",
  grayBlue: "#627889",
  deepNavy: "#0d2533",
  gridLine: "#d9e8ef",
  minorGridLine: "rgba(217, 232, 239, 0.58)",
  axisLabel: "#627889",
  text: "#0d2533",
  panelBorder: "rgba(126, 190, 217, 0.38)",
  tooltipBackground: "rgba(255, 255, 255, 0.88)"
} as const;

const medicalPalette = [
  MEDICAL_MONITORING_CHART_COLORS.medicalBlue,
  MEDICAL_MONITORING_CHART_COLORS.cyanGreen,
  MEDICAL_MONITORING_CHART_COLORS.palePurple,
  MEDICAL_MONITORING_CHART_COLORS.calmBlue,
  MEDICAL_MONITORING_CHART_COLORS.softAmber,
  MEDICAL_MONITORING_CHART_COLORS.softGreen,
  MEDICAL_MONITORING_CHART_COLORS.mutedOrange
] as const;

export const medicalChartTheme = {
  color: medicalPalette,
  backgroundColor: "transparent",
  textStyle: {
    color: MEDICAL_MONITORING_CHART_COLORS.text,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif'
  },
  title: {
    left: 0,
    top: 0,
    textStyle: {
      color: MEDICAL_MONITORING_CHART_COLORS.text,
      fontSize: 15,
      fontWeight: 800
    }
  },
  tooltip: {
    trigger: "axis",
    appendToBody: true,
    confine: true,
    backgroundColor: MEDICAL_MONITORING_CHART_COLORS.tooltipBackground,
    borderColor: MEDICAL_MONITORING_CHART_COLORS.panelBorder,
    borderWidth: 1,
    padding: [10, 12],
    textStyle: {
      color: MEDICAL_MONITORING_CHART_COLORS.text,
      fontSize: 12,
      fontWeight: 700
    },
    extraCssText:
      "backdrop-filter: blur(16px); border-radius: 14px; box-shadow: 0 18px 46px rgba(13, 37, 51, 0.14);"
  },
  legend: {
    top: 0,
    right: 0,
    icon: "roundRect",
    itemWidth: 14,
    itemHeight: 8,
    textStyle: {
      color: MEDICAL_MONITORING_CHART_COLORS.axisLabel,
      fontSize: 12,
      fontWeight: 700
    }
  },
  grid: {
    top: 54,
    right: 22,
    bottom: 36,
    left: 44,
    containLabel: true
  },
  axisLine: {
    lineStyle: {
      color: MEDICAL_MONITORING_CHART_COLORS.gridLine
    }
  },
  axisTick: {
    show: false
  },
  axisLabel: {
    color: MEDICAL_MONITORING_CHART_COLORS.axisLabel,
    fontSize: 12,
    fontWeight: 700
  },
  splitLine: {
    lineStyle: {
      color: MEDICAL_MONITORING_CHART_COLORS.gridLine,
      type: "dashed",
      opacity: 0.82
    }
  },
  animationDuration: 820,
  animationDurationUpdate: 520,
  animationEasing: "cubicOut",
  animationEasingUpdate: "cubicOut"
} as const;

export const MEDICAL_MONITORING_CHART_THEME = medicalChartTheme;

export function getMedicalChartColor(tone: MedicalChartTone | undefined, index = 0): string {
  if (tone) {
    return MEDICAL_MONITORING_CHART_COLORS[tone];
  }

  return (
    medicalPalette[index % medicalPalette.length] ?? MEDICAL_MONITORING_CHART_COLORS.medicalBlue
  );
}

export function clampMedicalChartValue(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, value));
}

// Pure option helper; it keeps chart defaults consistent without owning data semantics.
export function useMedicalChartOptions<T extends Record<string, unknown>>(
  option: T,
  config: MedicalChartOptionConfig = {}
): T & Record<string, unknown> {
  const animationEnabled = config.animation ?? true;
  const animationDuration = config.safetyMode ? 420 : medicalChartTheme.animationDuration;

  return {
    color: medicalChartTheme.color,
    backgroundColor: medicalChartTheme.backgroundColor,
    textStyle: medicalChartTheme.textStyle,
    ...option,
    tooltip: {
      ...medicalChartTheme.tooltip,
      ...(typeof option.tooltip === "object" && option.tooltip !== null ? option.tooltip : {})
    },
    legend: {
      ...medicalChartTheme.legend,
      ...(typeof option.legend === "object" && option.legend !== null ? option.legend : {})
    },
    animation: animationEnabled,
    animationDuration,
    animationDurationUpdate: config.safetyMode ? 260 : medicalChartTheme.animationDurationUpdate,
    animationEasing: medicalChartTheme.animationEasing,
    animationEasingUpdate: medicalChartTheme.animationEasingUpdate
  };
}

export function buildTrendLineChartOption(
  input: MedicalTrendLineChartInput
): Record<string, unknown> {
  const min = input.min ?? 0;
  const max = input.max ?? 100;

  return useMedicalChartOptions({
    title: {
      ...medicalChartTheme.title,
      text: input.title
    },
    grid: medicalChartTheme.grid,
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: input.categories,
      axisLine: medicalChartTheme.axisLine,
      axisTick: medicalChartTheme.axisTick,
      axisLabel: medicalChartTheme.axisLabel,
      splitLine: {
        show: true,
        lineStyle: {
          color: MEDICAL_MONITORING_CHART_COLORS.minorGridLine,
          type: "dashed"
        }
      }
    },
    yAxis: {
      type: "value",
      name: input.yAxisName,
      min,
      max,
      axisLine: medicalChartTheme.axisLine,
      axisTick: medicalChartTheme.axisTick,
      axisLabel: medicalChartTheme.axisLabel,
      splitLine: medicalChartTheme.splitLine
    },
    series: input.series.map((series, index) => {
      const color = series.color ?? getMedicalChartColor(series.tone, index);

      return {
        name: series.name,
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        data: series.values.map((value) => clampMedicalChartValue(value, min, max)),
        lineStyle: {
          width: 3,
          color,
          shadowBlur: 10,
          shadowColor: `${color}33`
        },
        itemStyle: {
          color,
          borderColor: "rgba(255, 255, 255, 0.92)",
          borderWidth: 1
        },
        areaStyle: input.area
          ? {
              color,
              opacity: 0.1
            }
          : undefined,
        emphasis: {
          focus: "series"
        }
      };
    })
  });
}

export function buildMetricRingChartOption(
  input: MetricRingChartOptionInput
): Record<string, unknown> {
  const max = input.max ?? 100;
  const value = clampMedicalChartValue(input.value, 0, max);
  const color = getMedicalChartColor(input.tone, 0);

  return useMedicalChartOptions({
    title: {
      text: input.label,
      left: "center",
      top: "center",
      textStyle: {
        color: MEDICAL_MONITORING_CHART_COLORS.text,
        fontSize: 13,
        fontWeight: 800
      }
    },
    tooltip: {
      trigger: "item"
    },
    series: [
      {
        name: input.label,
        type: "pie",
        radius: ["72%", "86%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        silent: false,
        label: {
          show: false
        },
        data: [
          {
            name: input.label,
            value,
            itemStyle: {
              color
            }
          },
          {
            name: "remaining",
            value: Math.max(0, max - value),
            itemStyle: {
              color: "rgba(217, 232, 239, 0.56)"
            },
            tooltip: {
              show: false
            }
          }
        ]
      }
    ]
  });
}

export function buildTrainingHeatmapOption(
  input: TrainingHeatmapOptionInput
): Record<string, unknown> {
  const data = input.data.map((point) => [
    Math.max(0, input.xLabels.indexOf(point.x)),
    Math.max(0, input.yLabels.indexOf(point.y)),
    clampMedicalChartValue(point.value)
  ]);

  return useMedicalChartOptions({
    title: {
      ...medicalChartTheme.title,
      text: input.title
    },
    grid: {
      ...medicalChartTheme.grid,
      top: 56,
      left: 72
    },
    tooltip: {
      trigger: "item"
    },
    xAxis: {
      type: "category",
      data: input.xLabels,
      axisLine: medicalChartTheme.axisLine,
      axisTick: medicalChartTheme.axisTick,
      axisLabel: medicalChartTheme.axisLabel,
      splitArea: {
        show: true,
        areaStyle: {
          color: ["rgba(255,255,255,0.28)", "rgba(232,246,250,0.24)"]
        }
      }
    },
    yAxis: {
      type: "category",
      data: input.yLabels,
      axisLine: medicalChartTheme.axisLine,
      axisTick: medicalChartTheme.axisTick,
      axisLabel: medicalChartTheme.axisLabel,
      splitArea: {
        show: true
      }
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: false,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      inRange: {
        color: ["rgba(217, 232, 239, 0.55)", "#bfe8ef", "#7fcfd4", "#22a8a1"]
      },
      textStyle: {
        color: MEDICAL_MONITORING_CHART_COLORS.axisLabel
      }
    },
    series: [
      {
        name: input.title,
        type: "heatmap",
        data,
        label: {
          show: true,
          color: MEDICAL_MONITORING_CHART_COLORS.text,
          fontWeight: 800
        },
        emphasis: {
          itemStyle: {
            borderColor: MEDICAL_MONITORING_CHART_COLORS.medicalBlue,
            borderWidth: 1,
            shadowBlur: 12,
            shadowColor: "rgba(20, 95, 133, 0.16)"
          }
        }
      }
    ]
  });
}

export function buildCognitiveRadarChartOption(
  input: CognitiveRadarChartOptionInput
): Record<string, unknown> {
  const color = getMedicalChartColor(input.tone, 0);

  return useMedicalChartOptions({
    title: {
      ...medicalChartTheme.title,
      text: input.title
    },
    tooltip: {
      trigger: "item"
    },
    radar: {
      radius: "62%",
      splitNumber: 4,
      indicator: input.indicators.map((indicator) => ({
        name: indicator.name,
        max: indicator.max ?? 100
      })),
      axisName: {
        color: MEDICAL_MONITORING_CHART_COLORS.axisLabel,
        fontSize: 12,
        fontWeight: 700
      },
      axisLine: {
        lineStyle: {
          color: MEDICAL_MONITORING_CHART_COLORS.gridLine
        }
      },
      splitLine: {
        lineStyle: {
          color: MEDICAL_MONITORING_CHART_COLORS.gridLine
        }
      },
      splitArea: {
        areaStyle: {
          color: ["rgba(255,255,255,0.22)", "rgba(232,246,250,0.2)"]
        }
      }
    },
    series: [
      {
        name: input.title,
        type: "radar",
        symbol: "circle",
        symbolSize: 5,
        data: [
          {
            value: input.values.map((value) => clampMedicalChartValue(value)),
            name: input.title,
            areaStyle: {
              color,
              opacity: 0.14
            },
            lineStyle: {
              color,
              width: 3
            },
            itemStyle: {
              color
            }
          }
        ]
      }
    ]
  });
}

export function buildStatusDistributionChartOption(
  input: StatusDistributionChartOptionInput
): Record<string, unknown> {
  return useMedicalChartOptions({
    title: {
      ...medicalChartTheme.title,
      text: input.title
    },
    tooltip: {
      trigger: "item"
    },
    legend: {
      ...medicalChartTheme.legend,
      bottom: 0,
      top: "auto",
      right: "center"
    },
    series: [
      {
        name: input.title,
        type: "pie",
        radius: ["48%", "72%"],
        center: ["50%", "48%"],
        itemStyle: {
          borderColor: "rgba(255,255,255,0.86)",
          borderWidth: 2
        },
        label: {
          color: MEDICAL_MONITORING_CHART_COLORS.axisLabel,
          fontWeight: 700
        },
        data: input.items.map((item, index) => ({
          name: item.label,
          value: Math.max(0, item.value),
          itemStyle: {
            color: getMedicalChartColor(item.tone, index)
          }
        }))
      }
    ]
  });
}

export function buildMedicalMonitoringLineChartOption(
  input: MedicalMonitoringLineChartInput
): Record<string, unknown> {
  return buildTrendLineChartOption({
    title: input.title,
    categories: input.categories,
    yAxisName: input.yAxisName,
    area: input.area ?? true,
    series: input.series.map((series) => ({
      name: series.name,
      values: series.data,
      color: series.color,
      tone: series.tone
    }))
  });
}
