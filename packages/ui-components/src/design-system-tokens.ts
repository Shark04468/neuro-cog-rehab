export type NeuroThemeMode = "hospital-light" | "neuro-dark";

export type NeuroTone =
  | "primary"
  | "clinical"
  | "monitoring"
  | "calm"
  | "warning"
  | "critical"
  | "neutral";

export type NeuroSurfaceLevel = "base" | "raised" | "floating";

export interface NeuroThemeTokenSet {
  mode: NeuroThemeMode;
  label: string;
  colors: {
    background: string;
    backgroundAlt: string;
    surface: string;
    surfaceStrong: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    clinical: string;
    monitoring: string;
    calm: string;
    warning: string;
    critical: string;
    glow: string;
    medicalBlue: string;
    cyanGreen: string;
    deepNavy: string;
    softGreen: string;
    calmBlue: string;
    softAmber: string;
    mutedOrange: string;
  };
}

export interface MedicalDataPanelMetric {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  helperText?: string;
  trendLabel?: string;
  progress?: number | null;
  tone?: NeuroTone;
}

export const NEURO_THEME_MODES = ["hospital-light", "neuro-dark"] as const;

export const NEURO_TONES = [
  "primary",
  "clinical",
  "monitoring",
  "calm",
  "warning",
  "critical",
  "neutral"
] as const;

export const NEURO_TYPOGRAPHY_TOKENS = {
  fontSans:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif',
  fontMono: '"SFMono-Regular", Consolas, "Liberation Mono", "Microsoft YaHei Mono", monospace',
  scale: {
    caption: "12px",
    body: "14px",
    bodyLarge: "16px",
    panelTitle: "clamp(22px, 3vw, 34px)",
    pageTitle: "clamp(32px, 5vw, 56px)"
  },
  lineHeight: {
    compact: 1.2,
    normal: 1.55,
    relaxed: 1.7
  }
} as const;

export const NEURO_RADIUS_TOKENS = {
  xs: "6px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "22px",
  pill: "999px"
} as const;

export const NEURO_SHADOW_TOKENS = {
  soft: "0 18px 46px rgba(20, 85, 121, 0.12)",
  raised: "0 24px 64px rgba(20, 85, 121, 0.18)",
  innerHighlight: "inset 0 1px 0 rgba(255, 255, 255, 0.62)",
  primaryGlow: "0 0 0 1px rgba(82, 194, 229, 0.18), 0 0 26px rgba(32, 175, 210, 0.24)"
} as const;

export const NEURO_MOTION_TOKENS = {
  durationFast: "160ms",
  durationNormal: "260ms",
  durationSlow: "720ms",
  dataCurrentDuration: "18s",
  eegWaveDuration: "9s",
  easingStandard: "cubic-bezier(0.2, 0, 0, 1)",
  easingEmphasis: "cubic-bezier(0.16, 1, 0.3, 1)"
} as const;

export const NEURO_THEME_TOKENS: Record<NeuroThemeMode, NeuroThemeTokenSet> = {
  "hospital-light": {
    mode: "hospital-light",
    label: "Medical neuroscience light",
    colors: {
      background: "#f8fcff",
      backgroundAlt: "#eaf8fb",
      surface: "rgba(255, 255, 255, 0.76)",
      surfaceStrong: "rgba(255, 255, 255, 0.92)",
      text: "#0d2533",
      textMuted: "#627889",
      border: "rgba(126, 177, 201, 0.32)",
      primary: "#145f85",
      clinical: "#167fa8",
      monitoring: "#22a8a1",
      calm: "#4f8ed8",
      warning: "#c99735",
      critical: "#c17a35",
      glow: "rgba(32, 175, 210, 0.22)",
      medicalBlue: "#145f85",
      cyanGreen: "#22a8a1",
      deepNavy: "#06121f",
      softGreen: "#62b894",
      calmBlue: "#4f8ed8",
      softAmber: "#d5a64a",
      mutedOrange: "#c17a35"
    }
  },
  "neuro-dark": {
    mode: "neuro-dark",
    label: "Neuroscience command dark",
    colors: {
      background: "#06121f",
      backgroundAlt: "#092337",
      surface: "rgba(9, 26, 43, 0.74)",
      surfaceStrong: "rgba(12, 34, 56, 0.92)",
      text: "#edf8ff",
      textMuted: "#a7bdcf",
      border: "rgba(113, 201, 230, 0.28)",
      primary: "#78d9ff",
      clinical: "#4fd0e3",
      monitoring: "#38d4bd",
      calm: "#78b7ff",
      warning: "#f0c66d",
      critical: "#f0a15d",
      glow: "rgba(74, 208, 227, 0.28)",
      medicalBlue: "#78d9ff",
      cyanGreen: "#38d4bd",
      deepNavy: "#06121f",
      softGreen: "#78d8ad",
      calmBlue: "#78b7ff",
      softAmber: "#f0c66d",
      mutedOrange: "#f0a15d"
    }
  }
};

export class NeuroDesignSystemError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "NeuroDesignSystemError";
  }
}

export function resolveNeuroThemeMode(mode: NeuroThemeMode): NeuroThemeMode {
  if (!NEURO_THEME_MODES.includes(mode)) {
    throw new NeuroDesignSystemError(`Unsupported neuro theme mode: ${String(mode)}.`);
  }

  return mode;
}

export function resolveNeuroTone(tone: NeuroTone = "neutral"): NeuroTone {
  if (!NEURO_TONES.includes(tone)) {
    throw new NeuroDesignSystemError(`Unsupported neuro tone: ${String(tone)}.`);
  }

  return tone;
}

export function normalizeMetricProgress(progress: number | null | undefined): number | null {
  if (progress === null || progress === undefined) {
    return null;
  }
  if (!Number.isFinite(progress)) {
    throw new NeuroDesignSystemError("Metric progress must be a finite number.");
  }

  return Math.min(100, Math.max(0, Math.round(progress)));
}

export function joinNeuroClassNames(
  ...classNames: Array<string | false | null | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}
