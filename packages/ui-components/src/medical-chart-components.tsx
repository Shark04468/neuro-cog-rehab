import type { CSSProperties } from "react";

import {
  clampMedicalChartValue,
  getMedicalChartColor,
  MEDICAL_MONITORING_CHART_COLORS,
  type MedicalChartSeriesInput,
  type MedicalChartTone,
  type StatusDistributionItem
} from "./medical-monitoring-chart-theme.js";

export interface EmptyChartStateProps {
  title?: string;
  message?: string;
  compact?: boolean;
}

export interface TrendLineChartProps {
  title: string;
  categories: string[];
  series: MedicalChartSeriesInput[];
  yAxisLabel?: string;
  min?: number;
  max?: number;
  area?: boolean;
  height?: number;
  helperText?: string;
}

export interface MetricRingChartProps {
  label: string;
  value: number;
  max?: number;
  tone?: MedicalChartTone;
  helperText?: string;
  size?: number;
}

export interface TrainingHeatmapPoint {
  x: string;
  y: string;
  value: number;
}

export interface TrainingHeatmapProps {
  title: string;
  xLabels: string[];
  yLabels: string[];
  data: TrainingHeatmapPoint[];
  helperText?: string;
}

export interface CognitiveRadarDimension {
  label: string;
  value: number;
  max?: number;
  tone?: MedicalChartTone;
}

export interface CognitiveRadarChartProps {
  title: string;
  dimensions: CognitiveRadarDimension[];
  helperText?: string;
  size?: number;
}

export interface StatusDistributionChartProps {
  title: string;
  items: StatusDistributionItem[];
  helperText?: string;
}

const chartCss = `
.ncr-medical-chart {
  position: relative;
  min-width: 0;
  border: 1px solid rgba(126, 190, 217, 0.34);
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(237, 250, 252, 0.58)),
    rgba(255, 255, 255, 0.64);
  box-shadow: 0 20px 56px rgba(13, 37, 51, 0.11);
  color: ${MEDICAL_MONITORING_CHART_COLORS.text};
  overflow: hidden;
}

.ncr-medical-chart::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, transparent, rgba(98, 184, 148, 0.08), transparent),
    radial-gradient(circle at 18% 0%, rgba(34, 168, 161, 0.13), transparent 34%);
  opacity: 0.9;
}

.ncr-medical-chart__content {
  position: relative;
  z-index: 1;
  padding: 18px;
}

.ncr-medical-chart__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.ncr-medical-chart__header h3 {
  margin: 0;
  color: ${MEDICAL_MONITORING_CHART_COLORS.text};
  font-size: 16px;
  line-height: 1.25;
  letter-spacing: 0;
}

.ncr-medical-chart__header p,
.ncr-medical-chart__header span,
.ncr-medical-chart__legend span,
.ncr-empty-chart-state p {
  color: ${MEDICAL_MONITORING_CHART_COLORS.axisLabel};
  font-size: 12px;
  line-height: 1.5;
}

.ncr-medical-chart__header p {
  margin: 5px 0 0;
}

.ncr-medical-chart svg {
  display: block;
  width: 100%;
  overflow: visible;
}

.ncr-trend-line-chart {
  min-height: 0;
}

.ncr-medical-chart__grid line,
.ncr-medical-chart__radar-grid polygon,
.ncr-medical-chart__radar-axis {
  stroke: ${MEDICAL_MONITORING_CHART_COLORS.gridLine};
  stroke-dasharray: 5 8;
}

.ncr-medical-chart__line {
  fill: none;
  stroke: var(--ncr-chart-color, ${MEDICAL_MONITORING_CHART_COLORS.medicalBlue});
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 6px 10px var(--ncr-chart-shadow, rgba(20, 95, 133, 0.14)));
  animation: ncr-chart-line-enter 820ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.ncr-medical-chart__area {
  fill: var(--ncr-chart-color, ${MEDICAL_MONITORING_CHART_COLORS.medicalBlue});
  opacity: 0.09;
}

.ncr-medical-chart__point {
  fill: var(--ncr-chart-color, ${MEDICAL_MONITORING_CHART_COLORS.medicalBlue});
  stroke: rgba(255, 255, 255, 0.9);
  stroke-width: 1.5;
}

.ncr-medical-chart__axis-label {
  fill: ${MEDICAL_MONITORING_CHART_COLORS.axisLabel};
  font-size: 10px;
  font-weight: 700;
}

.ncr-medical-chart__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.ncr-medical-chart__legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
}

.ncr-medical-chart__legend i {
  width: 18px;
  height: 8px;
  border-radius: 999px;
  background: var(--ncr-chart-color);
  box-shadow: 0 0 18px var(--ncr-chart-shadow);
}

.ncr-metric-ring-chart {
  display: grid;
  place-items: center;
  text-align: center;
}

.ncr-metric-ring-chart__ring {
  display: grid;
  place-items: center;
  width: var(--ncr-ring-size, 132px);
  height: var(--ncr-ring-size, 132px);
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(255,255,255,0.96) 55%, transparent 57%),
    conic-gradient(var(--ncr-chart-color) calc(var(--ncr-ring-value) * 1%), rgba(217, 232, 239, 0.55) 0);
  box-shadow: 0 0 26px var(--ncr-chart-shadow, rgba(20, 95, 133, 0.16));
  transition: background 520ms ease, box-shadow 520ms ease;
}

.ncr-metric-ring-chart__ring strong {
  color: ${MEDICAL_MONITORING_CHART_COLORS.text};
  font-size: 28px;
  line-height: 1;
}

.ncr-metric-ring-chart__ring span {
  display: block;
  margin-top: 4px;
  color: ${MEDICAL_MONITORING_CHART_COLORS.axisLabel};
  font-size: 11px;
  font-weight: 800;
}

.ncr-metric-ring-chart__label {
  margin: 10px 0 0;
  color: ${MEDICAL_MONITORING_CHART_COLORS.text};
  font-size: 13px;
  font-weight: 900;
}

.ncr-metric-ring-chart__helper {
  margin: 5px 0 0;
  color: ${MEDICAL_MONITORING_CHART_COLORS.axisLabel};
  font-size: 12px;
  line-height: 1.5;
}

.ncr-training-heatmap__grid {
  display: grid;
  grid-template-columns: minmax(72px, 0.7fr) repeat(var(--ncr-heatmap-columns), minmax(36px, 1fr));
  gap: 6px;
  align-items: stretch;
}

.ncr-training-heatmap__cell,
.ncr-training-heatmap__label,
.ncr-training-heatmap__column {
  min-height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 800;
}

.ncr-training-heatmap__label,
.ncr-training-heatmap__column {
  color: ${MEDICAL_MONITORING_CHART_COLORS.axisLabel};
}

.ncr-training-heatmap__cell {
  color: ${MEDICAL_MONITORING_CHART_COLORS.text};
  border: 1px solid rgba(126, 190, 217, 0.22);
  background: rgba(217, 232, 239, 0.32);
  transition: transform 220ms ease, box-shadow 220ms ease;
}

.ncr-training-heatmap__cell:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(13, 37, 51, 0.1);
}

.ncr-medical-chart__radar-area {
  fill: var(--ncr-chart-color, ${MEDICAL_MONITORING_CHART_COLORS.cyanGreen});
  opacity: 0.14;
}

.ncr-medical-chart__radar-line {
  fill: none;
  stroke: var(--ncr-chart-color, ${MEDICAL_MONITORING_CHART_COLORS.cyanGreen});
  stroke-width: 3;
  stroke-linejoin: round;
}

.ncr-status-distribution-chart__row {
  display: grid;
  grid-template-columns: minmax(88px, 0.8fr) minmax(0, 1fr) 44px;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
}

.ncr-status-distribution-chart__row span,
.ncr-status-distribution-chart__row strong {
  color: ${MEDICAL_MONITORING_CHART_COLORS.axisLabel};
  font-size: 12px;
  font-weight: 800;
}

.ncr-status-distribution-chart__track {
  height: 10px;
  border-radius: 999px;
  background: rgba(217, 232, 239, 0.55);
  overflow: hidden;
}

.ncr-status-distribution-chart__fill {
  display: block;
  width: var(--ncr-chart-fill);
  height: 100%;
  border-radius: inherit;
  background: var(--ncr-chart-color);
  box-shadow: 0 0 18px var(--ncr-chart-shadow);
  transition: width 520ms ease;
}

.ncr-empty-chart-state {
  display: grid;
  place-items: center;
  min-height: 180px;
  border: 1px dashed rgba(126, 190, 217, 0.44);
  border-radius: 16px;
  background: rgba(248, 252, 255, 0.62);
  text-align: center;
  padding: 22px;
}

.ncr-empty-chart-state[data-compact="true"] {
  min-height: 118px;
}

.ncr-empty-chart-state strong {
  color: ${MEDICAL_MONITORING_CHART_COLORS.text};
  font-size: 14px;
}

.ncr-empty-chart-state p {
  margin: 6px 0 0;
}

@keyframes ncr-chart-line-enter {
  from {
    opacity: 0;
    stroke-dasharray: 1 18;
  }
  to {
    opacity: 1;
    stroke-dasharray: 0 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ncr-medical-chart *,
  .ncr-medical-chart::before {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
  }
}
`;

export const MEDICAL_CHART_COMPONENTS_CSS = chartCss;

export function MedicalChartStyles(): JSX.Element {
  return <style>{MEDICAL_CHART_COMPONENTS_CSS}</style>;
}

export function EmptyChartState({
  title = "暂无可展示数据",
  message = "当前时间范围内还没有形成足够的训练记录。",
  compact = false
}: EmptyChartStateProps): JSX.Element {
  return (
    <>
      <MedicalChartStyles />
      <div className="ncr-empty-chart-state" data-compact={compact}>
        <div>
          <strong>{title}</strong>
          <p>{message}</p>
        </div>
      </div>
    </>
  );
}

export function TrendLineChart({
  title,
  categories,
  series,
  yAxisLabel,
  min = 0,
  max = 100,
  area = true,
  height = 250,
  helperText
}: TrendLineChartProps): JSX.Element {
  const visibleSeries = series.filter((item) => item.values.length > 0);

  if (categories.length === 0 || visibleSeries.length === 0) {
    return <EmptyChartState title={title} />;
  }

  const width = 640;
  const padding = { top: 18, right: 22, bottom: 34, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  return (
    <>
      <MedicalChartStyles />
      <section className="ncr-medical-chart ncr-trend-line-chart" aria-label={title}>
        <div className="ncr-medical-chart__content">
          <ChartHeader helperText={helperText} meta={yAxisLabel} title={title} />
          <svg role="img" viewBox={`0 0 ${width} ${height}`} aria-label={title}>
            <ChartGrid
              height={plotHeight}
              left={padding.left}
              top={padding.top}
              width={plotWidth}
            />
            {visibleSeries.map((item, index) => {
              const color = item.color ?? getMedicalChartColor(item.tone, index);
              const points = buildLinePoints(item.values, {
                min,
                max,
                left: padding.left,
                top: padding.top,
                width: plotWidth,
                height: plotHeight
              });
              const path = pointsToPath(points);

              return (
                <g key={item.name} style={chartToneStyle(color)}>
                  {area ? (
                    <path
                      className="ncr-medical-chart__area"
                      d={`${path} L ${points.at(-1)?.x ?? padding.left} ${
                        padding.top + plotHeight
                      } L ${points[0]?.x ?? padding.left} ${padding.top + plotHeight} Z`}
                    />
                  ) : null}
                  <path className="ncr-medical-chart__line" d={path} />
                  {points.map((point) => (
                    <circle
                      className="ncr-medical-chart__point"
                      cx={point.x}
                      cy={point.y}
                      key={`${item.name}-${point.x}-${point.y}`}
                      r="3.8"
                    />
                  ))}
                </g>
              );
            })}
            {categories.map((label, index) => {
              const x = padding.left + index * (plotWidth / Math.max(1, categories.length - 1));

              return (
                <text
                  className="ncr-medical-chart__axis-label"
                  key={label}
                  textAnchor="middle"
                  x={x}
                  y={height - 8}
                >
                  {label}
                </text>
              );
            })}
          </svg>
          <ChartLegend items={visibleSeries} />
        </div>
      </section>
    </>
  );
}

export function MetricRingChart({
  label,
  value,
  max = 100,
  tone = "medicalBlue",
  helperText,
  size = 132
}: MetricRingChartProps): JSX.Element {
  const safeValue = clampMedicalChartValue(value, 0, max);
  const percent = Math.round((safeValue / Math.max(1, max)) * 100);
  const color = getMedicalChartColor(tone, 0);

  return (
    <>
      <MedicalChartStyles />
      <div className="ncr-metric-ring-chart" style={chartToneStyle(color)}>
        <div
          className="ncr-metric-ring-chart__ring"
          style={{ "--ncr-ring-size": `${size}px`, "--ncr-ring-value": percent } as CSSProperties}
        >
          <div>
            <strong>{percent}</strong>
            <span>/100</span>
          </div>
        </div>
        <p className="ncr-metric-ring-chart__label">{label}</p>
        {helperText ? <p className="ncr-metric-ring-chart__helper">{helperText}</p> : null}
      </div>
    </>
  );
}

export function TrainingHeatmap({
  title,
  xLabels,
  yLabels,
  data,
  helperText
}: TrainingHeatmapProps): JSX.Element {
  if (xLabels.length === 0 || yLabels.length === 0 || data.length === 0) {
    return <EmptyChartState title={title} />;
  }

  return (
    <>
      <MedicalChartStyles />
      <section className="ncr-medical-chart ncr-training-heatmap" aria-label={title}>
        <div className="ncr-medical-chart__content">
          <ChartHeader helperText={helperText} title={title} />
          <div
            className="ncr-training-heatmap__grid"
            style={{ "--ncr-heatmap-columns": xLabels.length } as CSSProperties}
          >
            <span />
            {xLabels.map((label) => (
              <span className="ncr-training-heatmap__column" key={label}>
                {label}
              </span>
            ))}
            {yLabels.flatMap((row) => [
              <span className="ncr-training-heatmap__label" key={`${row}-label`}>
                {row}
              </span>,
              ...xLabels.map((column) => {
                const value = resolveHeatmapValue(data, column, row);
                const alpha = 0.16 + (clampMedicalChartValue(value) / 100) * 0.64;

                return (
                  <span
                    className="ncr-training-heatmap__cell"
                    key={`${row}-${column}`}
                    style={{
                      background: `rgba(34, 168, 161, ${alpha.toFixed(2)})`
                    }}
                    title={`${row} ${column}: ${Math.round(value)}`}
                  >
                    {Math.round(value)}
                  </span>
                );
              })
            ])}
          </div>
        </div>
      </section>
    </>
  );
}

export function CognitiveRadarChart({
  title,
  dimensions,
  helperText,
  size = 260
}: CognitiveRadarChartProps): JSX.Element {
  if (dimensions.length < 3) {
    return <EmptyChartState title={title} />;
  }

  const center = size / 2;
  const radius = size * 0.31;
  const color = getMedicalChartColor(dimensions[0]?.tone ?? "cyanGreen", 0);
  const polygon = dimensions
    .map((dimension, index) =>
      radarPoint(
        index,
        dimensions.length,
        center,
        radius,
        clampMedicalChartValue(dimension.value, 0, dimension.max ?? 100),
        dimension.max ?? 100
      )
    )
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  return (
    <>
      <MedicalChartStyles />
      <section className="ncr-medical-chart ncr-cognitive-radar-chart" aria-label={title}>
        <div className="ncr-medical-chart__content">
          <ChartHeader helperText={helperText} title={title} />
          <svg
            role="img"
            viewBox={`0 0 ${size} ${size}`}
            aria-label={title}
            style={chartToneStyle(color)}
          >
            <g className="ncr-medical-chart__radar-grid">
              {[0.25, 0.5, 0.75, 1].map((ratio) => (
                <polygon
                  fill="none"
                  key={ratio}
                  points={dimensions
                    .map((_, index) =>
                      radarPoint(index, dimensions.length, center, radius * ratio, 1, 1)
                    )
                    .map((point) => `${point.x},${point.y}`)
                    .join(" ")}
                />
              ))}
            </g>
            {dimensions.map((dimension, index) => {
              const axis = radarPoint(index, dimensions.length, center, radius, 1, 1);
              const label = radarPoint(index, dimensions.length, center, radius + 28, 1, 1);

              return (
                <g key={dimension.label}>
                  <line
                    className="ncr-medical-chart__radar-axis"
                    x1={center}
                    x2={axis.x}
                    y1={center}
                    y2={axis.y}
                  />
                  <text
                    className="ncr-medical-chart__axis-label"
                    textAnchor="middle"
                    x={label.x}
                    y={label.y}
                  >
                    {dimension.label}
                  </text>
                </g>
              );
            })}
            <polygon className="ncr-medical-chart__radar-area" points={polygon} />
            <polygon className="ncr-medical-chart__radar-line" points={polygon} />
          </svg>
        </div>
      </section>
    </>
  );
}

export function StatusDistributionChart({
  title,
  items,
  helperText
}: StatusDistributionChartProps): JSX.Element {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.value), 0);

  if (items.length === 0 || total <= 0) {
    return <EmptyChartState title={title} />;
  }

  return (
    <>
      <MedicalChartStyles />
      <section className="ncr-medical-chart ncr-status-distribution-chart" aria-label={title}>
        <div className="ncr-medical-chart__content">
          <ChartHeader helperText={helperText} title={title} />
          {items.map((item, index) => {
            const color = getMedicalChartColor(item.tone, index);
            const percent = Math.round((Math.max(0, item.value) / total) * 100);

            return (
              <div className="ncr-status-distribution-chart__row" key={item.label}>
                <span>{item.label}</span>
                <i className="ncr-status-distribution-chart__track" style={chartToneStyle(color)}>
                  <i
                    className="ncr-status-distribution-chart__fill"
                    style={{ "--ncr-chart-fill": `${percent}%` } as CSSProperties}
                  />
                </i>
                <strong>{item.value}</strong>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function ChartHeader(props: {
  title: string;
  helperText?: string | undefined;
  meta?: string | undefined;
}): JSX.Element {
  return (
    <header className="ncr-medical-chart__header">
      <div>
        <h3>{props.title}</h3>
        {props.helperText ? <p>{props.helperText}</p> : null}
      </div>
      {props.meta ? <span>{props.meta}</span> : null}
    </header>
  );
}

function ChartGrid(props: {
  height: number;
  left: number;
  top: number;
  width: number;
}): JSX.Element {
  return (
    <g className="ncr-medical-chart__grid">
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = props.top + props.height * ratio;

        return <line key={ratio} x1={props.left} x2={props.left + props.width} y1={y} y2={y} />;
      })}
    </g>
  );
}

function ChartLegend(props: { items: MedicalChartSeriesInput[] }): JSX.Element {
  return (
    <div className="ncr-medical-chart__legend">
      {props.items.map((item, index) => {
        const color = item.color ?? getMedicalChartColor(item.tone, index);

        return (
          <span key={item.name} style={chartToneStyle(color)}>
            <i />
            {item.name}
          </span>
        );
      })}
    </div>
  );
}

function buildLinePoints(
  values: number[],
  frame: {
    min: number;
    max: number;
    left: number;
    top: number;
    width: number;
    height: number;
  }
): Array<{ x: number; y: number }> {
  return values.map((value, index) => {
    const x = frame.left + index * (frame.width / Math.max(1, values.length - 1));
    const normalized =
      (clampMedicalChartValue(value, frame.min, frame.max) - frame.min) /
      Math.max(1, frame.max - frame.min);
    const y = frame.top + frame.height - normalized * frame.height;

    return { x: round(x), y: round(y) };
  });
}

function pointsToPath(points: Array<{ x: number; y: number }>): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function resolveHeatmapValue(data: TrainingHeatmapPoint[], x: string, y: string): number {
  return data.find((point) => point.x === x && point.y === y)?.value ?? 0;
}

function radarPoint(
  index: number,
  total: number,
  center: number,
  radius: number,
  value: number,
  max: number
): { x: number; y: number } {
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
  const scale = max <= 1 ? value : value / max;
  const distance = radius * clampMedicalChartValue(scale, 0, 1);

  return {
    x: round(center + Math.cos(angle) * distance),
    y: round(center + Math.sin(angle) * distance)
  };
}

function chartToneStyle(color: string): CSSProperties {
  return {
    "--ncr-chart-color": color,
    "--ncr-chart-shadow": `${color}33`
  } as CSSProperties;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
