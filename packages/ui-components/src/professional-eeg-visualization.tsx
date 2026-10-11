import type { CSSProperties } from "react";
import type { EEGQualityStatus } from "@neuro-cog-rehab/shared-types";

export type EEGPanelTone = "calm" | "attention" | "fatigue" | "quality" | "neutral";

export interface EEGVisualizationFrame {
  id?: string | undefined;
  sessionId?: string | undefined;
  timestamp: string;
  source?: "simulator" | "device" | undefined;
  windowSeconds?: number | undefined;
  samplingRateHz?: number | undefined;
  attentionScore?: number | null | undefined;
  attentionIndex?: number | null | undefined;
  relaxationScore?: number | null | undefined;
  relaxationIndex?: number | null | undefined;
  fatigueScore?: number | null | undefined;
  stabilityScore?: number | null | undefined;
  engagementScore?: number | null | undefined;
  thetaPower?: number | null | undefined;
  alphaPower?: number | null | undefined;
  betaPower?: number | null | undefined;
  signalQuality?: number | null | undefined;
  qualityStatus?: EEGQualityStatus | null | undefined;
  artifactLevel?: number | null | undefined;
  bandPower?:
    | {
        delta: number;
        theta: number;
        alpha: number;
        beta: number;
        gamma: number;
      }
    | undefined;
}

export interface NormalizedEEGFrame {
  timestamp: string;
  attention: number;
  relaxation: number;
  fatigue: number;
  stability: number;
  engagement: number;
  signalQuality: number;
  qualityStatus: EEGQualityStatus;
  thetaPower: number;
  alphaPower: number;
  betaPower: number;
}

export interface EEGSessionTimelineEvent {
  id: string;
  timeLabel: string;
  label: string;
  description?: string | undefined;
  tone?: "neutral" | "good" | "watch" | "pause" | undefined;
}

export interface ProfessionalEEGWavePanelProps {
  frames?: EEGVisualizationFrame[] | undefined;
  title?: string | undefined;
  channels?: Array<"theta" | "alpha" | "beta" | "attention" | "relaxation" | "fatigue">;
  signalQualityStatus?: EEGQualityStatus | undefined;
  paused?: boolean | undefined;
  safetyMode?: boolean | undefined;
  compact?: boolean | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface CognitiveStateRadarProps {
  frame?: EEGVisualizationFrame | NormalizedEEGFrame | undefined;
  values?: {
    attention: number;
    relaxation: number;
    fatigue: number;
    stability: number;
    engagement: number;
  };
  title?: string | undefined;
  compact?: boolean | undefined;
  safetyMode?: boolean | undefined;
}

export interface SignalQualityMeterProps {
  status: EEGQualityStatus;
  signalQuality?: number | null | undefined;
  title?: string | undefined;
  compact?: boolean | undefined;
}

export interface NeuroMetricRingProps {
  label: string;
  value: number | null | undefined;
  tone?: EEGPanelTone | undefined;
  helperText?: string | undefined;
  paused?: boolean | undefined;
  safetyMode?: boolean | undefined;
}

export interface EEGSessionTimelineProps {
  events: EEGSessionTimelineEvent[];
  title?: string | undefined;
  compact?: boolean | undefined;
}

const DEFAULT_FRAME_COUNT = 36;

export function ProfessionalEEGWavePanel({
  frames,
  title = "实时 EEG 波形",
  channels = ["theta", "alpha", "beta"],
  signalQualityStatus,
  paused = false,
  safetyMode = false,
  compact = false,
  className,
  style
}: ProfessionalEEGWavePanelProps): JSX.Element {
  const normalizedFrames = normalizeFrameSeries(frames);
  const qualityStatus = signalQualityStatus ?? normalizedFrames.at(-1)?.qualityStatus ?? "good";
  const classes = ["ncr-eeg-pro-panel", className].filter(Boolean).join(" ");

  return (
    <section
      className={classes}
      data-compact={compact}
      data-paused={paused}
      data-safety-mode={safetyMode}
      style={style}
      aria-label={title}
    >
      <ProfessionalEEGVisualizationStyles />
      <header className="ncr-eeg-pro-panel__header">
        <div>
          <span>Neuro Monitor</span>
          <strong>{title}</strong>
        </div>
        <QualityBadge status={qualityStatus} />
      </header>

      <svg
        className="ncr-eeg-pro-panel__wave"
        viewBox="0 0 640 230"
        role="img"
        aria-label="平滑多通道脑电特征波形"
      >
        <defs>
          <linearGradient id="ncr-eeg-wave-glow" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#1b74a6" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#23aaa2" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7f9fe8" stopOpacity="0.28" />
          </linearGradient>
        </defs>
        <GridLines />
        {channels.slice(0, compact ? 3 : 4).map((channel, index) => (
          <path
            className="ncr-eeg-pro-panel__channel"
            data-channel={channel}
            d={buildChannelPath(normalizedFrames, channel, index, channels.length)}
            key={channel}
          />
        ))}
        <TimeTicks frames={normalizedFrames} />
      </svg>

      <div className="ncr-eeg-pro-panel__legend">
        {channels.slice(0, compact ? 3 : 4).map((channel) => (
          <span data-channel={channel} key={channel}>
            {channelLabel(channel)}
          </span>
        ))}
      </div>
    </section>
  );
}

export function CognitiveStateRadar({
  frame,
  values,
  title = "认知状态维度",
  compact = false,
  safetyMode = false
}: CognitiveStateRadarProps): JSX.Element {
  const state = values ?? buildCognitiveStateFromFrame(frame);
  const axes = [
    { key: "attention", label: "注意", value: state.attention },
    { key: "relaxation", label: "放松", value: state.relaxation },
    { key: "fatigue", label: "疲劳", value: state.fatigue },
    { key: "stability", label: "稳定", value: state.stability },
    { key: "engagement", label: "参与", value: state.engagement }
  ];
  const points = axes.map((axis, index) => radarPoint(axis.value, index, axes.length)).join(" ");

  return (
    <section className="ncr-cognitive-radar" data-compact={compact} data-safety-mode={safetyMode}>
      <ProfessionalEEGVisualizationStyles />
      <header>
        <span>State Map</span>
        <strong>{title}</strong>
      </header>
      <svg viewBox="0 0 220 210" role="img" aria-label="注意放松疲劳稳定性任务参与度状态图">
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon className="ncr-cognitive-radar__grid" key={scale} points={radarGrid(scale)} />
        ))}
        {axes.map((axis, index) => {
          const end = radarPoint(100, index, axes.length);
          const [x, y] = end.split(",");
          return (
            <g key={axis.key}>
              <line className="ncr-cognitive-radar__axis" x1="110" x2={x} y1="102" y2={y} />
              <text className="ncr-cognitive-radar__label" x={x} y={y}>
                {axis.label}
              </text>
            </g>
          );
        })}
        <polygon className="ncr-cognitive-radar__shape" points={points} />
      </svg>
    </section>
  );
}

export function SignalQualityMeter({
  status,
  signalQuality,
  title = "信号质量",
  compact = false
}: SignalQualityMeterProps): JSX.Element {
  const viewModel = resolveSignalQualityViewModel(status);
  const normalizedQuality = normalizeScore(signalQuality ?? viewModel.fallbackScore);

  return (
    <section className="ncr-signal-quality" data-compact={compact} data-status={status}>
      <ProfessionalEEGVisualizationStyles />
      <header>
        <span>{title}</span>
        <strong>{viewModel.label}</strong>
      </header>
      <div className="ncr-signal-quality__bar" aria-hidden="true">
        <span style={{ width: `${normalizedQuality}%` }} />
      </div>
      <p>{viewModel.suggestion}</p>
    </section>
  );
}

export function NeuroMetricRing({
  label,
  value,
  tone = "neutral",
  helperText,
  paused = false,
  safetyMode = false
}: NeuroMetricRingProps): JSX.Element {
  const normalizedValue = normalizeNullableScore(value);
  const ringValue = normalizedValue ?? 0;

  return (
    <article
      className="ncr-neuro-ring"
      data-paused={paused}
      data-safety-mode={safetyMode}
      data-tone={tone}
    >
      <ProfessionalEEGVisualizationStyles />
      <div
        className="ncr-neuro-ring__graphic"
        style={{ "--ring-value": ringValue } as CSSProperties}
      >
        <span>{normalizedValue === null ? "--" : normalizedValue}</span>
      </div>
      <div>
        <strong>{label}</strong>
        {helperText ? <span>{helperText}</span> : null}
      </div>
    </article>
  );
}

export function EEGSessionTimeline({
  events,
  title = "训练状态时间线",
  compact = false
}: EEGSessionTimelineProps): JSX.Element {
  const safeEvents = events.slice(0, compact ? 4 : 8);

  return (
    <section className="ncr-eeg-timeline" data-compact={compact}>
      <ProfessionalEEGVisualizationStyles />
      <header>
        <span>Session Timeline</span>
        <strong>{title}</strong>
      </header>
      <ol>
        {safeEvents.map((event) => (
          <li data-tone={event.tone ?? "neutral"} key={event.id}>
            <time>{event.timeLabel}</time>
            <div>
              <strong>{event.label}</strong>
              {event.description ? <span>{event.description}</span> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function normalizeEEGFrame(frame: EEGVisualizationFrame, index = 0): NormalizedEEGFrame {
  const attention = normalizeScore(frame.attentionScore ?? frame.attentionIndex ?? 58 + index);
  const relaxation = normalizeScore(frame.relaxationScore ?? frame.relaxationIndex ?? 52);
  const fatigue = normalizeScore(frame.fatigueScore ?? 100 - relaxation * 0.72);
  const signalQuality = normalizeScore(frame.signalQuality ?? 88);
  const thetaPower = normalizePower(frame.thetaPower ?? frame.bandPower?.theta ?? 0.38);
  const alphaPower = normalizePower(frame.alphaPower ?? frame.bandPower?.alpha ?? 0.46);
  const betaPower = normalizePower(frame.betaPower ?? frame.bandPower?.beta ?? 0.5);

  return {
    timestamp: frame.timestamp,
    attention,
    relaxation,
    fatigue,
    stability: normalizeScore(
      frame.stabilityScore ?? signalQuality - (frame.artifactLevel ?? 0) * 28
    ),
    engagement: normalizeScore(frame.engagementScore ?? attention * 0.62 + (100 - fatigue) * 0.28),
    signalQuality,
    qualityStatus: frame.qualityStatus ?? qualityFromSignal(signalQuality, frame.artifactLevel),
    thetaPower,
    alphaPower,
    betaPower
  };
}

export function normalizeFrameSeries(
  frames: EEGVisualizationFrame[] | undefined,
  count = DEFAULT_FRAME_COUNT
): NormalizedEEGFrame[] {
  const source = frames && frames.length > 0 ? frames : createMockEEGFeatureFrames({ count });
  return source.slice(-count).map((frame, index) => normalizeEEGFrame(frame, index));
}

export function createMockEEGFeatureFrames(
  input: {
    count?: number;
    latest?: Partial<EEGVisualizationFrame> | undefined;
  } = {}
): EEGVisualizationFrame[] {
  const count = input.count ?? DEFAULT_FRAME_COUNT;
  const baseTime = Date.now() - count * 1000;
  const latestAttention = input.latest?.attentionScore ?? input.latest?.attentionIndex ?? 66;
  const latestRelaxation = input.latest?.relaxationScore ?? input.latest?.relaxationIndex ?? 54;
  const latestFatigue = input.latest?.fatigueScore ?? 31;
  const qualityStatus = input.latest?.qualityStatus ?? "good";

  return Array.from({ length: count }, (_, index) => {
    const progress = index / Math.max(1, count - 1);
    const smooth = Math.sin(progress * Math.PI * 2);
    const slow = Math.sin(progress * Math.PI);

    return {
      id: `mock-eeg-${index}`,
      sessionId: input.latest?.sessionId ?? "mock-session",
      timestamp: new Date(baseTime + index * 1000).toISOString(),
      source: "simulator",
      windowSeconds: 1,
      samplingRateHz: 256,
      attentionScore: clamp(latestAttention - 7 + slow * 7 + smooth * 2),
      relaxationScore: clamp(latestRelaxation - 5 + Math.cos(progress * Math.PI * 1.6) * 5),
      fatigueScore: clamp(latestFatigue + progress * 3 + Math.sin(progress * Math.PI * 1.2) * 2),
      signalQuality: qualityStatus === "good" ? 88 : qualityStatus === "unstable" ? 62 : 38,
      qualityStatus,
      artifactLevel: qualityStatus === "noisy" ? 0.72 : qualityStatus === "unstable" ? 0.32 : 0.08,
      bandPower: {
        delta: 0.22 + slow * 0.03,
        theta: 0.34 + smooth * 0.05,
        alpha: 0.46 + Math.cos(progress * Math.PI * 1.8) * 0.05,
        beta: 0.52 + Math.sin(progress * Math.PI * 1.4) * 0.04,
        gamma: 0.2 + smooth * 0.02
      }
    };
  });
}

export function buildCognitiveStateFromFrame(
  frame: EEGVisualizationFrame | NormalizedEEGFrame | undefined
) {
  if (!frame) {
    return {
      attention: 0,
      relaxation: 0,
      fatigue: 0,
      stability: 0,
      engagement: 0
    };
  }

  if ("attention" in frame) {
    return {
      attention: frame.attention,
      relaxation: frame.relaxation,
      fatigue: frame.fatigue,
      stability: frame.stability,
      engagement: frame.engagement
    };
  }

  const normalized = normalizeEEGFrame(frame);
  return {
    attention: normalized.attention,
    relaxation: normalized.relaxation,
    fatigue: normalized.fatigue,
    stability: normalized.stability,
    engagement: normalized.engagement
  };
}

export function resolveSignalQualityViewModel(status: EEGQualityStatus): {
  label: string;
  suggestion: string;
  fallbackScore: number;
} {
  switch (status) {
    case "good":
      return {
        label: "信号良好",
        suggestion: "保持当前佩戴方式，继续以舒适姿势训练。",
        fallbackScore: 88
      };
    case "unstable":
      return {
        label: "信号不稳定",
        suggestion: "可轻轻调整头戴位置，避免压得过紧。",
        fallbackScore: 62
      };
    case "noisy":
      return {
        label: "干扰较多",
        suggestion: "请减少大幅动作，确认传感器贴合。",
        fallbackScore: 42
      };
    case "disconnected":
      return {
        label: "设备未连接",
        suggestion: "请检查设备电量和连接状态，恢复后再继续。",
        fallbackScore: 0
      };
  }
}

function QualityBadge({ status }: { status: EEGQualityStatus }) {
  return (
    <div className="ncr-eeg-pro-panel__quality" data-status={status}>
      <span aria-hidden="true" />
      {resolveSignalQualityViewModel(status).label}
    </div>
  );
}

function GridLines() {
  return (
    <g className="ncr-eeg-pro-panel__grid" aria-hidden="true">
      {[40, 80, 120, 160].map((y) => (
        <line key={`h-${y}`} x1="24" x2="616" y1={y} y2={y} />
      ))}
      {[24, 172, 320, 468, 616].map((x) => (
        <line key={`v-${x}`} x1={x} x2={x} y1="22" y2="184" />
      ))}
    </g>
  );
}

function TimeTicks({ frames }: { frames: NormalizedEEGFrame[] }) {
  const first = frames[0];
  const middle = frames[Math.floor(frames.length / 2)];
  const last = frames.at(-1);

  return (
    <g className="ncr-eeg-pro-panel__ticks">
      {[
        { x: 34, frame: first },
        { x: 320, frame: middle },
        { x: 584, frame: last }
      ].map((tick) => (
        <text key={tick.x} x={tick.x} y="213">
          {tick.frame ? formatTimeTick(tick.frame.timestamp) : "--:--"}
        </text>
      ))}
    </g>
  );
}

function buildChannelPath(
  frames: NormalizedEEGFrame[],
  channel: NonNullable<ProfessionalEEGWavePanelProps["channels"]>[number],
  channelIndex: number,
  channelCount: number
): string {
  if (frames.length === 0) {
    return "";
  }

  const width = 592;
  const left = 24;
  const bandHeight = 150 / Math.max(1, channelCount);
  const top = 28 + channelIndex * bandHeight;
  const centerY = top + bandHeight / 2;
  const points: Array<[number, number]> = frames.map((frame, index) => {
    const x = left + (index / Math.max(1, frames.length - 1)) * width;
    const value = channelValue(frame, channel);
    const y = centerY - ((value - 50) / 100) * bandHeight * 0.9;
    return [round(x), round(y)];
  });

  return points
    .map(([x, y], index) => {
      if (index === 0) {
        return `M ${x} ${y}`;
      }
      const [previousX, previousY] = points[index - 1] ?? [x, y];
      const controlX = round((previousX + x) / 2);
      return `C ${controlX} ${previousY}, ${controlX} ${y}, ${x} ${y}`;
    })
    .join(" ");
}

function channelValue(
  frame: NormalizedEEGFrame,
  channel: NonNullable<ProfessionalEEGWavePanelProps["channels"]>[number]
): number {
  switch (channel) {
    case "attention":
      return frame.attention;
    case "relaxation":
      return frame.relaxation;
    case "fatigue":
      return frame.fatigue;
    case "theta":
      return frame.thetaPower;
    case "alpha":
      return frame.alphaPower;
    case "beta":
      return frame.betaPower;
  }
}

function channelLabel(channel: string): string {
  const labels: Record<string, string> = {
    theta: "Theta",
    alpha: "Alpha",
    beta: "Beta",
    attention: "注意",
    relaxation: "放松",
    fatigue: "疲劳"
  };

  return labels[channel] ?? channel;
}

function radarPoint(value: number, index: number, total: number): string {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
  const radius = (normalizeScore(value) / 100) * 72;
  return `${round(110 + Math.cos(angle) * radius)},${round(102 + Math.sin(angle) * radius)}`;
}

function radarGrid(scale: number): string {
  return Array.from({ length: 5 }, (_, index) => radarPoint(scale * 100, index, 5)).join(" ");
}

function normalizeScore(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return clamp(value);
}

function normalizeNullableScore(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return clamp(value);
}

function normalizePower(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return clamp(value <= 1 ? value * 100 : value);
}

function qualityFromSignal(
  signalQuality: number,
  artifactLevel: number | null | undefined
): EEGQualityStatus {
  if (signalQuality <= 5) {
    return "disconnected";
  }
  if ((artifactLevel ?? 0) >= 0.65) {
    return "noisy";
  }
  if (signalQuality < 68) {
    return "unstable";
  }
  return "good";
}

function formatTimeTick(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return `${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function ProfessionalEEGVisualizationStyles(): JSX.Element {
  return <style>{professionalEegCss}</style>;
}

const professionalEegCss = `
.ncr-eeg-pro-panel,
.ncr-cognitive-radar,
.ncr-signal-quality,
.ncr-neuro-ring,
.ncr-eeg-timeline {
  box-sizing: border-box;
  color: #102b3a;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ncr-eeg-pro-panel,
.ncr-cognitive-radar,
.ncr-signal-quality,
.ncr-eeg-timeline {
  border: 1px solid rgba(126, 190, 217, 0.24);
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.78), rgba(236, 249, 252, 0.56)),
    radial-gradient(circle at 88% 12%, rgba(35, 170, 162, 0.11), transparent 30%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.74),
    0 14px 34px rgba(20, 85, 121, 0.08);
}

.ncr-eeg-pro-panel {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.ncr-eeg-pro-panel__header,
.ncr-cognitive-radar header,
.ncr-signal-quality header,
.ncr-eeg-timeline header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.ncr-eeg-pro-panel__header span,
.ncr-cognitive-radar header span,
.ncr-signal-quality header span,
.ncr-eeg-timeline header span {
  display: block;
  color: #6a8090;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ncr-eeg-pro-panel__header strong,
.ncr-cognitive-radar header strong,
.ncr-signal-quality header strong,
.ncr-eeg-timeline header strong {
  display: block;
  margin-top: 3px;
  color: #0d2533;
  font-size: 14px;
  line-height: 1.25;
}

.ncr-eeg-pro-panel__quality {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 28px;
  border-radius: 999px;
  padding: 0 10px;
  color: #145f85;
  background: rgba(232, 250, 250, 0.76);
  font-size: 12px;
  font-weight: 850;
  white-space: nowrap;
}

.ncr-eeg-pro-panel__quality span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 10px currentColor;
}

.ncr-eeg-pro-panel__quality[data-status="unstable"],
.ncr-eeg-pro-panel__quality[data-status="noisy"] {
  color: #95631d;
  background: rgba(255, 244, 218, 0.86);
}

.ncr-eeg-pro-panel__quality[data-status="disconnected"] {
  color: #6b7280;
  background: rgba(229, 233, 238, 0.82);
}

.ncr-eeg-pro-panel__wave {
  width: 100%;
  min-height: 160px;
  overflow: visible;
}

.ncr-eeg-pro-panel__grid line {
  stroke: rgba(126, 190, 217, 0.2);
  stroke-width: 1;
}

.ncr-eeg-pro-panel__channel {
  fill: none;
  stroke: url(#ncr-eeg-wave-glow);
  stroke-width: 2.2;
  stroke-linecap: round;
  filter: drop-shadow(0 0 5px rgba(35, 170, 162, 0.2));
  transition: d 900ms ease;
}

.ncr-eeg-pro-panel[data-paused="true"] .ncr-eeg-pro-panel__channel {
  opacity: 0.52;
}

.ncr-eeg-pro-panel[data-safety-mode="true"] .ncr-eeg-pro-panel__channel {
  stroke-width: 1.8;
  filter: none;
}

.ncr-eeg-pro-panel__channel[data-channel="alpha"],
.ncr-eeg-pro-panel__channel[data-channel="relaxation"] {
  stroke: #23aaa2;
}

.ncr-eeg-pro-panel__channel[data-channel="beta"],
.ncr-eeg-pro-panel__channel[data-channel="attention"] {
  stroke: #1b74a6;
}

.ncr-eeg-pro-panel__channel[data-channel="fatigue"] {
  stroke: #d0912a;
}

.ncr-eeg-pro-panel__ticks text,
.ncr-cognitive-radar__label {
  fill: #718696;
  font-size: 11px;
  font-weight: 720;
}

.ncr-eeg-pro-panel__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.ncr-eeg-pro-panel__legend span {
  border: 1px solid rgba(126, 190, 217, 0.24);
  border-radius: 999px;
  padding: 4px 8px;
  color: #5f7280;
  background: rgba(255, 255, 255, 0.62);
  font-size: 11px;
  font-weight: 780;
}

.ncr-cognitive-radar {
  display: grid;
  gap: 8px;
  padding: 12px;
}

.ncr-cognitive-radar svg {
  width: 100%;
  min-height: 164px;
}

.ncr-cognitive-radar__grid {
  fill: none;
  stroke: rgba(126, 190, 217, 0.22);
  stroke-width: 1;
}

.ncr-cognitive-radar__axis {
  stroke: rgba(126, 190, 217, 0.2);
  stroke-width: 1;
}

.ncr-cognitive-radar__shape {
  fill: rgba(35, 170, 162, 0.18);
  stroke: #23aaa2;
  stroke-width: 2;
  filter: drop-shadow(0 0 9px rgba(35, 170, 162, 0.18));
  transition: points 900ms ease;
}

.ncr-signal-quality {
  display: grid;
  gap: 9px;
  padding: 12px;
}

.ncr-signal-quality__bar {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(126, 190, 217, 0.18);
}

.ncr-signal-quality__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #23aaa2, #1b74a6);
  transition: width 1100ms ease;
}

.ncr-signal-quality[data-status="unstable"] .ncr-signal-quality__bar span,
.ncr-signal-quality[data-status="noisy"] .ncr-signal-quality__bar span {
  background: linear-gradient(90deg, #d9aa4f, #d0912a);
}

.ncr-signal-quality[data-status="disconnected"] .ncr-signal-quality__bar span {
  background: #95a3ad;
}

.ncr-signal-quality p {
  margin: 0;
  color: #5f7280;
  font-size: 12px;
  line-height: 1.5;
}

.ncr-neuro-ring {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  border: 1px solid rgba(126, 190, 217, 0.22);
  border-radius: 16px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.64);
}

.ncr-neuro-ring__graphic {
  width: 54px;
  height: 54px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.96) 55%, transparent 56%),
    conic-gradient(#1b74a6 calc(var(--ring-value) * 1%), rgba(126, 190, 217, 0.18) 0);
  transition: background 1200ms ease;
}

.ncr-neuro-ring[data-tone="calm"] .ncr-neuro-ring__graphic {
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.96) 55%, transparent 56%),
    conic-gradient(#23aaa2 calc(var(--ring-value) * 1%), rgba(126, 190, 217, 0.18) 0);
}

.ncr-neuro-ring[data-tone="fatigue"] .ncr-neuro-ring__graphic {
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.96) 55%, transparent 56%),
    conic-gradient(#d0912a calc(var(--ring-value) * 1%), rgba(126, 190, 217, 0.18) 0);
}

.ncr-neuro-ring[data-safety-mode="true"] .ncr-neuro-ring__graphic {
  transition-duration: 1800ms;
}

.ncr-neuro-ring__graphic span {
  color: #0d2533;
  font-size: 14px;
  font-weight: 920;
  font-variant-numeric: tabular-nums;
}

.ncr-neuro-ring strong {
  display: block;
  color: #0d2533;
  font-size: 13px;
}

.ncr-neuro-ring span {
  display: block;
  margin-top: 2px;
  color: #6a8090;
  font-size: 11px;
  line-height: 1.35;
}

.ncr-eeg-timeline {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.ncr-eeg-timeline ol {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ncr-eeg-timeline li {
  position: relative;
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 10px;
  align-items: start;
}

.ncr-eeg-timeline li::before {
  content: "";
  position: absolute;
  left: 51px;
  top: 5px;
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #23aaa2;
  box-shadow: 0 0 10px rgba(35, 170, 162, 0.22);
}

.ncr-eeg-timeline li[data-tone="watch"]::before {
  background: #d0912a;
}

.ncr-eeg-timeline li[data-tone="pause"]::before {
  background: #95a3ad;
}

.ncr-eeg-timeline time {
  color: #718696;
  font-size: 11px;
  font-weight: 820;
}

.ncr-eeg-timeline strong {
  display: block;
  color: #0d2533;
  font-size: 13px;
}

.ncr-eeg-timeline li span {
  display: block;
  margin-top: 2px;
  color: #6a8090;
  font-size: 11px;
  line-height: 1.35;
}

@media (max-width: 760px) {
  .ncr-eeg-pro-panel__wave,
  .ncr-cognitive-radar svg {
    min-height: 138px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ncr-eeg-pro-panel *,
  .ncr-cognitive-radar *,
  .ncr-signal-quality *,
  .ncr-neuro-ring *,
  .ncr-eeg-timeline * {
    animation: none !important;
    transition: none !important;
  }
}
`;
