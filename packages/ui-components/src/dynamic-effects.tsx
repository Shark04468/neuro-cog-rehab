import type { CSSProperties, ReactNode } from "react";

import { NEURO_DYNAMIC_EFFECTS_CSS } from "./dynamic-effects.css.js";
import { joinNeuroClassNames, resolveNeuroTone, type NeuroTone } from "./design-system-tokens.js";

export type DynamicEffectIntensity = "minimal" | "low" | "medium" | "high";

export interface DynamicEffectBaseProps {
  className?: string | undefined;
  intensity?: DynamicEffectIntensity | undefined;
  tone?: NeuroTone | undefined;
  trainingMode?: boolean | undefined;
}

export interface AnimatedEEGWaveProps extends DynamicEffectBaseProps {
  ariaLabel?: string;
}

export interface NeuralParticleBackgroundProps extends DynamicEffectBaseProps {
  density?: "sparse" | "balanced";
}

export type DataFlowGridProps = DynamicEffectBaseProps;

export interface GlowPulseCardProps extends DynamicEffectBaseProps {
  children: ReactNode;
}

export interface FloatingMetricProps extends DynamicEffectBaseProps {
  label: string;
  value: string | number;
  unit?: string;
  helperText?: string;
}

export interface PageTransitionProps extends DynamicEffectBaseProps {
  children: ReactNode;
}

export interface LoadingBrainScanProps extends DynamicEffectBaseProps {
  label?: string;
  size?: number;
}

export interface RealtimeSignalRingProps extends DynamicEffectBaseProps {
  label: string;
  value: number;
  unit?: string;
  size?: number;
}

export interface SoftGradientOrbProps extends DynamicEffectBaseProps {
  size?: number;
  x?: string;
  y?: string;
}

export interface ScanLineHighlightProps extends DynamicEffectBaseProps {
  children: ReactNode;
}

export class DynamicEffectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DynamicEffectError";
  }
}

const DYNAMIC_INTENSITIES: readonly DynamicEffectIntensity[] = [
  "minimal",
  "low",
  "medium",
  "high"
] as const;

export function DynamicEffectsStyles(): JSX.Element {
  return <style>{NEURO_DYNAMIC_EFFECTS_CSS}</style>;
}

export function resolveDynamicEffectIntensity(
  intensity: DynamicEffectIntensity = "medium",
  trainingMode = false
): DynamicEffectIntensity {
  if (!DYNAMIC_INTENSITIES.includes(intensity)) {
    throw new DynamicEffectError(`Unsupported dynamic effect intensity: ${String(intensity)}.`);
  }

  if (!trainingMode) {
    return intensity;
  }

  if (intensity === "high" || intensity === "medium") {
    return "low";
  }

  return "minimal";
}

export function normalizeSignalProgress(value: number): number {
  if (!Number.isFinite(value)) {
    throw new DynamicEffectError("Signal progress must be a finite number.");
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildDynamicEffectDataAttributes({
  intensity = "medium",
  tone = "clinical",
  trainingMode = false
}: DynamicEffectBaseProps): {
  "data-intensity": DynamicEffectIntensity;
  "data-tone": NeuroTone;
  "data-training-mode": string;
} {
  return {
    "data-intensity": resolveDynamicEffectIntensity(intensity, trainingMode),
    "data-tone": resolveNeuroTone(tone),
    "data-training-mode": String(trainingMode)
  };
}

export function AnimatedEEGWave({
  ariaLabel,
  className,
  intensity,
  tone = "monitoring",
  trainingMode = false
}: AnimatedEEGWaveProps): JSX.Element {
  const dataAttributes = buildDynamicEffectDataAttributes({ intensity, tone, trainingMode });
  const accessibilityProps = ariaLabel
    ? { role: "img", "aria-label": ariaLabel }
    : { "aria-hidden": true };

  return (
    <svg
      {...accessibilityProps}
      {...dataAttributes}
      className={joinNeuroClassNames("ncr-dynamic-effect ncr-animated-eeg-wave", className)}
      preserveAspectRatio="none"
      viewBox="0 0 900 140"
    >
      <g className="ncr-animated-eeg-wave__grid">
        {Array.from({ length: 7 }).map((_, index) => (
          <line
            key={`h-${index}`}
            stroke="currentColor"
            strokeWidth="1"
            x1="0"
            x2="900"
            y1={20 + index * 16}
            y2={20 + index * 16}
          />
        ))}
      </g>
      <path
        className="ncr-animated-eeg-wave__trace"
        d="M0 74 C 40 54, 70 98, 112 70 S 184 40, 230 72 S 316 108, 360 68 S 438 42, 490 74 S 572 102, 624 68 S 706 46, 758 72 S 842 96, 900 68"
      />
      <path
        className="ncr-animated-eeg-wave__trace ncr-animated-eeg-wave__trace--secondary"
        d="M0 86 C 46 72, 86 94, 126 80 S 202 62, 248 84 S 334 104, 382 82 S 462 58, 512 86 S 590 108, 646 80 S 730 62, 782 86 S 848 102, 900 82"
      />
    </svg>
  );
}

export function NeuralParticleBackground({
  className,
  density = "balanced",
  intensity,
  tone = "clinical",
  trainingMode = false
}: NeuralParticleBackgroundProps): JSX.Element {
  const dataAttributes = buildDynamicEffectDataAttributes({ intensity, tone, trainingMode });
  const nodes = density === "sparse" ? SPARSE_NEURAL_NODES : BALANCED_NEURAL_NODES;
  const links = density === "sparse" ? SPARSE_NEURAL_LINKS : BALANCED_NEURAL_LINKS;

  return (
    <div
      {...dataAttributes}
      aria-hidden="true"
      className={joinNeuroClassNames("ncr-dynamic-effect ncr-neural-particles", className)}
    >
      <svg preserveAspectRatio="none" viewBox="0 0 100 100">
        {links.map(([from, to]) => (
          <line
            className="ncr-neural-particles__link"
            key={`${from}-${to}`}
            x1={nodes[from]?.[0] ?? 0}
            x2={nodes[to]?.[0] ?? 0}
            y1={nodes[from]?.[1] ?? 0}
            y2={nodes[to]?.[1] ?? 0}
          />
        ))}
        {nodes.map(([x, y], index) => (
          <circle
            className="ncr-neural-particles__node"
            cx={x}
            cy={y}
            key={`${x}-${y}-${index}`}
            r={index % 3 === 0 ? 1.5 : 1.1}
          />
        ))}
      </svg>
    </div>
  );
}

export function DataFlowGrid({
  className,
  intensity,
  tone = "clinical",
  trainingMode = false
}: DataFlowGridProps): JSX.Element {
  return (
    <div
      {...buildDynamicEffectDataAttributes({ intensity, tone, trainingMode })}
      aria-hidden="true"
      className={joinNeuroClassNames("ncr-dynamic-effect ncr-data-flow-grid", className)}
    />
  );
}

export function GlowPulseCard({
  children,
  className,
  intensity,
  tone = "clinical",
  trainingMode = false
}: GlowPulseCardProps): JSX.Element {
  return (
    <section
      {...buildDynamicEffectDataAttributes({ intensity, tone, trainingMode })}
      className={joinNeuroClassNames("ncr-dynamic-effect ncr-glow-pulse-card", className)}
    >
      <div className="ncr-glow-pulse-card__content">{children}</div>
    </section>
  );
}

export function FloatingMetric({
  className,
  helperText,
  intensity,
  label,
  tone = "monitoring",
  trainingMode = false,
  unit,
  value
}: FloatingMetricProps): JSX.Element {
  return (
    <article
      {...buildDynamicEffectDataAttributes({ intensity, tone, trainingMode })}
      className={joinNeuroClassNames("ncr-dynamic-effect ncr-floating-metric", className)}
    >
      <span>{label}</span>
      <strong>
        {value}
        {unit ? <small>{unit}</small> : null}
      </strong>
      {helperText ? <small>{helperText}</small> : null}
    </article>
  );
}

export function PageTransition({
  children,
  className,
  intensity,
  tone = "clinical",
  trainingMode = false
}: PageTransitionProps): JSX.Element {
  return (
    <div
      {...buildDynamicEffectDataAttributes({ intensity, tone, trainingMode })}
      className={joinNeuroClassNames("ncr-dynamic-effect ncr-page-transition", className)}
    >
      {children}
    </div>
  );
}

export function LoadingBrainScan({
  className,
  intensity,
  label = "正在加载训练状态",
  size = 104,
  tone = "monitoring",
  trainingMode = false
}: LoadingBrainScanProps): JSX.Element {
  return (
    <div
      {...buildDynamicEffectDataAttributes({ intensity, tone, trainingMode })}
      className={joinNeuroClassNames("ncr-dynamic-effect ncr-loading-brain-scan", className)}
      role="status"
      style={{ "--ncr-loading-size": `${Math.max(72, size)}px` } as CSSProperties}
    >
      <svg aria-hidden="true" viewBox="0 0 120 120">
        <path
          className="ncr-loading-brain-scan__outline"
          d="M59 19 C42 16, 26 27, 25 45 C14 52, 15 72, 29 78 C31 96, 50 105, 64 94 C80 103, 101 92, 96 72 C109 61, 101 39, 87 38 C82 25, 72 19, 59 19 Z"
        />
        <path
          className="ncr-loading-brain-scan__path"
          d="M39 48 C48 40, 57 44, 60 54 C65 43, 78 43, 83 52 M40 68 C51 62, 58 67, 62 78 C68 67, 80 64, 88 72 M58 26 C52 36, 54 43, 62 49 M76 32 C72 43, 74 53, 86 60"
        />
        <line className="ncr-loading-brain-scan__line" x1="18" x2="102" y1="60" y2="60" />
      </svg>
      <span>{label}</span>
    </div>
  );
}

export function RealtimeSignalRing({
  className,
  intensity,
  label,
  size = 128,
  tone = "monitoring",
  trainingMode = false,
  unit = "%",
  value
}: RealtimeSignalRingProps): JSX.Element {
  const progress = normalizeSignalProgress(value);
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div
      {...buildDynamicEffectDataAttributes({ intensity, tone, trainingMode })}
      aria-label={`${label} ${progress}${unit}`}
      className={joinNeuroClassNames("ncr-dynamic-effect ncr-realtime-signal-ring", className)}
      role="img"
      style={{ "--ncr-ring-size": `${Math.max(96, size)}px` } as CSSProperties}
    >
      <svg aria-hidden="true" viewBox="0 0 120 120">
        <circle className="ncr-realtime-signal-ring__track" cx="60" cy="60" r={radius} />
        <circle
          className="ncr-realtime-signal-ring__progress"
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="ncr-realtime-signal-ring__label">
        <strong>
          {progress}
          {unit}
        </strong>
        <span>{label}</span>
      </span>
    </div>
  );
}

export function SoftGradientOrb({
  className,
  intensity = "low",
  size = 280,
  tone = "calm",
  trainingMode = false,
  x = "16%",
  y = "16%"
}: SoftGradientOrbProps): JSX.Element {
  return (
    <div
      {...buildDynamicEffectDataAttributes({ intensity, tone, trainingMode })}
      aria-hidden="true"
      className={joinNeuroClassNames("ncr-dynamic-effect ncr-soft-gradient-orb", className)}
      style={
        {
          "--ncr-dynamic-size": `${Math.max(120, size)}px`,
          "--ncr-dynamic-x": x,
          "--ncr-dynamic-y": y
        } as CSSProperties
      }
    />
  );
}

export function ScanLineHighlight({
  children,
  className,
  intensity,
  tone = "clinical",
  trainingMode = false
}: ScanLineHighlightProps): JSX.Element {
  return (
    <div
      {...buildDynamicEffectDataAttributes({ intensity, tone, trainingMode })}
      className={joinNeuroClassNames("ncr-dynamic-effect ncr-scan-line-highlight", className)}
    >
      {children}
    </div>
  );
}

const SPARSE_NEURAL_NODES = [
  [8, 26],
  [22, 44],
  [40, 24],
  [57, 54],
  [72, 30],
  [88, 64],
  [34, 78],
  [68, 82]
] as const;

const BALANCED_NEURAL_NODES = [
  [7, 22],
  [16, 62],
  [28, 38],
  [39, 18],
  [44, 74],
  [56, 46],
  [66, 24],
  [72, 70],
  [84, 40],
  [92, 78],
  [18, 86],
  [58, 88]
] as const;

const SPARSE_NEURAL_LINKS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [3, 6],
  [4, 5],
  [5, 7],
  [6, 7]
] as const;

const BALANCED_NEURAL_LINKS = [
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 10],
  [2, 3],
  [2, 5],
  [3, 6],
  [4, 5],
  [4, 10],
  [4, 11],
  [5, 6],
  [5, 7],
  [6, 8],
  [7, 8],
  [7, 9],
  [8, 9],
  [10, 11]
] as const;
