import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes
} from "react";

import { NEURO_DESIGN_SYSTEM_CSS } from "./design-system.css.js";
import {
  joinNeuroClassNames,
  normalizeMetricProgress,
  resolveNeuroThemeMode,
  resolveNeuroTone,
  type MedicalDataPanelMetric,
  type NeuroSurfaceLevel,
  type NeuroThemeMode,
  type NeuroTone
} from "./design-system-tokens.js";

export interface NeuroDesignSystemProviderProps {
  children: ReactNode;
  theme?: NeuroThemeMode;
  className?: string;
  injectStyles?: boolean;
}

export interface NeuroPageBackgroundProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  trainingMode?: boolean;
}

export interface NeuroMedicalBackgroundProps {
  className?: string;
  trainingMode?: boolean;
}

export interface NeuroGlassCardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  level?: NeuroSurfaceLevel;
  padding?: CSSProperties["padding"];
}

export interface NeuroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export interface NeuroInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
}

export interface NeuroSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface NeuroSelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> {
  label: string;
  helperText?: string;
  options: NeuroSelectOption[];
}

export interface NeuroTagProps {
  children: ReactNode;
  tone?: NeuroTone;
  className?: string;
}

export interface NeuroStatusBadgeProps {
  children: ReactNode;
  tone?: NeuroTone;
  className?: string;
}

export interface NeuroAlertProps {
  title: string;
  children: ReactNode;
  tone?: NeuroTone;
  className?: string;
}

export interface MedicalDataPanelProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  metrics: MedicalDataPanelMetric[];
  action?: ReactNode;
  className?: string;
}

export interface MedicalMetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  helperText?: string;
  statusLabel?: string;
  progress?: number | null;
  tone?: NeuroTone;
  variant?: "info" | "core" | "risk" | "training" | "report";
  className?: string;
}

export interface EEGVisualizationShellProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  connectionLabel: string;
  qualityLabel: string;
  attentionScore?: number;
  relaxationScore?: number;
  fatigueScore?: number;
  statusTone?: NeuroTone;
  children?: ReactNode;
  className?: string;
}

export function NeuroDesignSystemStyles(): JSX.Element {
  return <style>{NEURO_DESIGN_SYSTEM_CSS}</style>;
}

export function NeuroDesignSystemProvider({
  children,
  theme = "hospital-light",
  className,
  injectStyles = true
}: NeuroDesignSystemProviderProps): JSX.Element {
  const resolvedTheme = resolveNeuroThemeMode(theme);

  // Keep theme scope and style injection together so apps can adopt the system gradually.
  return (
    <div
      className={joinNeuroClassNames("ncr-design-system", className)}
      data-ncr-theme={resolvedTheme}
    >
      {injectStyles ? <NeuroDesignSystemStyles /> : null}
      {children}
    </div>
  );
}

export function NeuroPageBackground({
  children,
  className,
  contentClassName,
  trainingMode = false
}: NeuroPageBackgroundProps): JSX.Element {
  return (
    <main
      className={joinNeuroClassNames("ncr-page-background", className)}
      data-training-mode={String(trainingMode)}
    >
      <NeuroMedicalBackground trainingMode={trainingMode} />
      <div className={joinNeuroClassNames("ncr-page-background__content", contentClassName)}>
        {children}
      </div>
    </main>
  );
}

export function NeuroMedicalBackground({
  className,
  trainingMode = false
}: NeuroMedicalBackgroundProps): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={joinNeuroClassNames("ncr-medical-grade-bg", className)}
      data-training-mode={String(trainingMode)}
    >
      <div className="ncr-medical-grade-bg__eeg" />
      <div className="ncr-medical-grade-bg__network" />
      <div className="ncr-medical-grade-bg__grid" />
      <div className="ncr-medical-grade-bg__focus" />
    </div>
  );
}

export function NeuroGlassCard({
  children,
  className,
  interactive = false,
  level = "raised",
  padding
}: NeuroGlassCardProps): JSX.Element {
  return (
    <section
      className={joinNeuroClassNames("ncr-glass-card", className)}
      data-interactive={String(interactive)}
      data-level={level}
      style={
        padding === undefined ? undefined : ({ "--ncr-card-padding": padding } as CSSProperties)
      }
    >
      {children}
    </section>
  );
}

export function NeuroButton({
  children,
  className,
  variant = "primary",
  type = "button",
  ...buttonProps
}: NeuroButtonProps): JSX.Element {
  return (
    <button
      {...buttonProps}
      className={joinNeuroClassNames("ncr-button", className)}
      data-variant={variant}
      type={type}
    >
      {children}
    </button>
  );
}

export function NeuroInput({
  label,
  helperText,
  className,
  id,
  ...inputProps
}: NeuroInputProps): JSX.Element {
  const inputId = id ?? inputProps.name ?? label;

  return (
    <label className={joinNeuroClassNames("ncr-field", className)} htmlFor={inputId}>
      <span className="ncr-field__label">{label}</span>
      <input {...inputProps} className="ncr-input" id={inputId} />
      {helperText ? <span className="ncr-field__helper">{helperText}</span> : null}
    </label>
  );
}

export function NeuroSelect({
  label,
  helperText,
  className,
  id,
  options,
  ...selectProps
}: NeuroSelectProps): JSX.Element {
  const selectId = id ?? selectProps.name ?? label;

  return (
    <label className={joinNeuroClassNames("ncr-field", className)} htmlFor={selectId}>
      <span className="ncr-field__label">{label}</span>
      <select {...selectProps} className="ncr-select" id={selectId}>
        {options.map((option) => (
          <option disabled={option.disabled} key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? <span className="ncr-field__helper">{helperText}</span> : null}
    </label>
  );
}

export function NeuroTag({ children, tone = "neutral", className }: NeuroTagProps): JSX.Element {
  return (
    <span className={joinNeuroClassNames("ncr-tag", className)} data-tone={resolveNeuroTone(tone)}>
      {children}
    </span>
  );
}

export function NeuroStatusBadge({
  children,
  tone = "monitoring",
  className
}: NeuroStatusBadgeProps): JSX.Element {
  return (
    <span
      className={joinNeuroClassNames("ncr-status-badge", className)}
      data-tone={resolveNeuroTone(tone)}
    >
      {children}
    </span>
  );
}

export function NeuroAlert({
  title,
  children,
  tone = "clinical",
  className
}: NeuroAlertProps): JSX.Element {
  return (
    <aside
      className={joinNeuroClassNames("ncr-alert", className)}
      data-tone={resolveNeuroTone(tone)}
    >
      <strong>{title}</strong>
      <p>{children}</p>
    </aside>
  );
}

export function MedicalDataPanel({
  title,
  eyebrow = "Realtime Overview",
  subtitle,
  metrics,
  action,
  className
}: MedicalDataPanelProps): JSX.Element {
  return (
    <section className={joinNeuroClassNames("ncr-data-panel", className)}>
      <header className="ncr-data-panel__header">
        <div>
          <div className="ncr-data-panel__eyebrow">{eyebrow}</div>
          <h2 className="ncr-data-panel__title">{title}</h2>
          {subtitle ? <p className="ncr-data-panel__subtitle">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      <div className="ncr-data-panel__grid">
        {metrics.map((metric) => {
          const progress = normalizeMetricProgress(metric.progress);
          const tone = resolveNeuroTone(metric.tone);

          return (
            <article className="ncr-data-panel__metric" data-tone={tone} key={metric.id}>
              <div className="ncr-data-panel__metric-top">
                <span className="ncr-data-panel__metric-label">{metric.label}</span>
                {metric.trendLabel ? <NeuroTag tone={tone}>{metric.trendLabel}</NeuroTag> : null}
              </div>
              <div className="ncr-data-panel__metric-value">
                <strong>{metric.value}</strong>
                {metric.unit ? <span>{metric.unit}</span> : null}
              </div>
              {progress === null ? null : (
                <div
                  aria-label={`${metric.label} progress ${progress}%`}
                  className="ncr-data-panel__progress"
                  role="img"
                >
                  <span style={{ width: `${progress}%` }} />
                </div>
              )}
              {metric.helperText ? (
                <p className="ncr-data-panel__metric-helper">{metric.helperText}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function MedicalMetricCard({
  label,
  value,
  unit,
  helperText,
  statusLabel,
  progress,
  tone = "monitoring",
  variant = "info",
  className
}: MedicalMetricCardProps): JSX.Element {
  const normalizedProgress = normalizeMetricProgress(progress);
  const resolvedTone = resolveNeuroTone(tone);

  return (
    <article
      className={joinNeuroClassNames("ncr-medical-metric-card", className)}
      data-tone={resolvedTone}
      data-variant={variant}
    >
      <div className="ncr-medical-metric-card__top">
        <span>{label}</span>
        {statusLabel ? (
          <NeuroStatusBadge tone={resolvedTone}>{statusLabel}</NeuroStatusBadge>
        ) : null}
      </div>
      <div className="ncr-medical-metric-card__value">
        <strong>{value}</strong>
        {unit ? <span>{unit}</span> : null}
      </div>
      {normalizedProgress === null ? null : (
        <div
          aria-label={`${label} ${normalizedProgress}%`}
          className="ncr-medical-metric-card__track"
          role="img"
        >
          <i style={{ width: `${normalizedProgress}%` }} />
        </div>
      )}
      {helperText ? <p>{helperText}</p> : null}
    </article>
  );
}

export function EEGVisualizationShell({
  title,
  eyebrow = "EEG Status",
  subtitle,
  connectionLabel,
  qualityLabel,
  attentionScore,
  relaxationScore,
  fatigueScore,
  statusTone = "monitoring",
  children,
  className
}: EEGVisualizationShellProps): JSX.Element {
  const chips = [
    { label: `连接 ${connectionLabel}`, tone: statusTone },
    { label: `信号 ${qualityLabel}`, tone: statusTone },
    attentionScore === undefined
      ? null
      : { label: `注意 ${Math.round(attentionScore)}`, tone: "clinical" as const },
    relaxationScore === undefined
      ? null
      : { label: `放松 ${Math.round(relaxationScore)}`, tone: "calm" as const },
    fatigueScore === undefined
      ? null
      : { label: `疲劳 ${Math.round(fatigueScore)}`, tone: "warning" as const }
  ].filter((chip): chip is { label: string; tone: NeuroTone } => chip !== null);

  return (
    <section className={joinNeuroClassNames("ncr-eeg-shell", className)}>
      <header className="ncr-eeg-shell__header">
        <div>
          <div className="ncr-eeg-shell__eyebrow">{eyebrow}</div>
          <h2 className="ncr-eeg-shell__title">{title}</h2>
          {subtitle ? <p className="ncr-eeg-shell__subtitle">{subtitle}</p> : null}
        </div>
        <NeuroStatusBadge tone={statusTone}>{connectionLabel}</NeuroStatusBadge>
      </header>
      <div aria-hidden="true" className="ncr-eeg-shell__wave" />
      <div className="ncr-eeg-shell__chips">
        {chips.map((chip) => (
          <NeuroTag key={chip.label} tone={chip.tone}>
            {chip.label}
          </NeuroTag>
        ))}
      </div>
      {children}
    </section>
  );
}
