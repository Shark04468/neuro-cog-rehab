import type { EEGQualityStatus } from "@neuro-cog-rehab/shared-types";

export type EEGDeviceConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export type EEGStatusTone = "ready" | "watch" | "pause";

export interface EEGStatusPanelInput {
  connectionStatus: EEGDeviceConnectionStatus;
  qualityStatus: EEGQualityStatus;
  attentionScore: number | null;
  relaxationScore: number | null;
  fatigueScore: number | null;
  lastFrameAt?: string | null;
  latencyMs?: number | null;
  latencyWarningMs?: number;
}

export interface EEGMetricViewModel {
  label: string;
  valueLabel: string;
  value: number | null;
}

export interface EEGStatusPanelViewModel {
  tone: EEGStatusTone;
  connectionLabel: string;
  qualityLabel: string;
  headline: string;
  helperText: string;
  wearingPrompt: string | null;
  latencyPrompt: string | null;
  shouldPauseTraining: boolean;
  metrics: {
    attention: EEGMetricViewModel;
    relaxation: EEGMetricViewModel;
    fatigue: EEGMetricViewModel;
  };
}

const DEFAULT_LATENCY_WARNING_MS = 2500;

export function buildEEGStatusPanelViewModel(
  input: EEGStatusPanelInput,
  now: Date = new Date()
): EEGStatusPanelViewModel {
  const latencyMs = resolveLatencyMs(input, now);
  const hasLatencyWarning =
    latencyMs !== null && latencyMs > (input.latencyWarningMs ?? DEFAULT_LATENCY_WARNING_MS);

  if (input.connectionStatus === "disconnected" || input.qualityStatus === "disconnected") {
    return {
      tone: "pause",
      connectionLabel: "设备已断开",
      qualityLabel: "暂无稳定数据",
      headline: "训练已暂停",
      helperText: "请重新连接设备，恢复后再继续训练。",
      wearingPrompt: "请确认头戴设备电量、连接和佩戴位置。",
      latencyPrompt: latencyPrompt(latencyMs),
      shouldPauseTraining: true,
      metrics: buildMetrics(input)
    };
  }

  if (input.connectionStatus === "connecting" || input.connectionStatus === "reconnecting") {
    return {
      tone: "watch",
      connectionLabel: input.connectionStatus === "connecting" ? "正在连接" : "正在重连",
      qualityLabel: "等待数据",
      headline: "正在准备训练状态",
      helperText: "设备连接完成后会自动更新状态。",
      wearingPrompt: null,
      latencyPrompt: latencyPrompt(latencyMs),
      shouldPauseTraining: true,
      metrics: buildMetrics(input)
    };
  }

  if (input.qualityStatus === "noisy") {
    return {
      tone: "watch",
      connectionLabel: "设备已连接",
      qualityLabel: "信号干扰较多",
      headline: "请先稳定姿势",
      helperText: "减少大幅动作后，训练数据会更稳定。",
      wearingPrompt: "请轻轻调整头戴设备位置，确认传感器贴合。",
      latencyPrompt: latencyPrompt(latencyMs),
      shouldPauseTraining: hasLatencyWarning,
      metrics: buildMetrics(input)
    };
  }

  if (input.qualityStatus === "unstable") {
    return {
      tone: "watch",
      connectionLabel: "设备已连接",
      qualityLabel: "信号不稳定",
      headline: "请调整佩戴",
      helperText: "调整后可以继续观察信号是否恢复稳定。",
      wearingPrompt: "请确认头戴设备贴合，不要压得过紧。",
      latencyPrompt: latencyPrompt(latencyMs),
      shouldPauseTraining: hasLatencyWarning,
      metrics: buildMetrics(input)
    };
  }

  return {
    tone: hasLatencyWarning ? "watch" : "ready",
    connectionLabel: "设备已连接",
    qualityLabel: "信号良好",
    headline: hasLatencyWarning ? "数据稍有延迟" : "可以正常训练",
    helperText: hasLatencyWarning ? "请观察连接是否恢复顺畅。" : "当前状态适合继续训练。",
    wearingPrompt: null,
    latencyPrompt: latencyPrompt(latencyMs),
    shouldPauseTraining: hasLatencyWarning,
    metrics: buildMetrics(input)
  };
}

function buildMetrics(input: EEGStatusPanelInput): EEGStatusPanelViewModel["metrics"] {
  return {
    attention: {
      label: "注意指数",
      value: normalizeScore(input.attentionScore),
      valueLabel: scoreLabel(input.attentionScore)
    },
    relaxation: {
      label: "放松指数",
      value: normalizeScore(input.relaxationScore),
      valueLabel: scoreLabel(input.relaxationScore)
    },
    fatigue: {
      label: "疲劳趋势",
      value: normalizeScore(input.fatigueScore),
      valueLabel: fatigueLabel(input.fatigueScore)
    }
  };
}

function resolveLatencyMs(input: EEGStatusPanelInput, now: Date): number | null {
  if (typeof input.latencyMs === "number" && Number.isFinite(input.latencyMs)) {
    return Math.max(0, Math.round(input.latencyMs));
  }

  if (!input.lastFrameAt) {
    return null;
  }

  const lastFrameMs = Date.parse(input.lastFrameAt);
  if (!Number.isFinite(lastFrameMs)) {
    return null;
  }

  return Math.max(0, now.getTime() - lastFrameMs);
}

function latencyPrompt(latencyMs: number | null): string | null {
  if (latencyMs === null) {
    return null;
  }

  if (latencyMs > DEFAULT_LATENCY_WARNING_MS) {
    return `数据延迟约 ${formatSeconds(latencyMs)} 秒，请检查网络或设备连接。`;
  }

  return `数据延迟约 ${formatSeconds(latencyMs)} 秒。`;
}

function scoreLabel(value: number | null): string {
  const normalized = normalizeScore(value);
  return normalized === null ? "--" : `${normalized}`;
}

function fatigueLabel(value: number | null): string {
  const normalized = normalizeScore(value);
  if (normalized === null) {
    return "--";
  }

  if (normalized >= 70) {
    return `${normalized} 偏高`;
  }

  if (normalized >= 45) {
    return `${normalized} 中等`;
  }

  return `${normalized} 平稳`;
}

function normalizeScore(value: number | null): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function formatSeconds(ms: number): string {
  return (ms / 1000).toFixed(ms < 10_000 ? 1 : 0);
}
