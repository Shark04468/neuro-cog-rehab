import type { CSSProperties } from "react";

import {
  buildEEGStatusPanelViewModel,
  type EEGDeviceConnectionStatus,
  type EEGMetricViewModel
} from "./eeg-status-panel-model.js";
import type { EEGQualityStatus } from "@neuro-cog-rehab/shared-types";

export interface EEGStatusPanelProps {
  connectionStatus: EEGDeviceConnectionStatus;
  qualityStatus: EEGQualityStatus;
  attentionScore: number | null;
  relaxationScore: number | null;
  fatigueScore: number | null;
  lastFrameAt?: string | null;
  latencyMs?: number | null;
  latencyWarningMs?: number;
  title?: string;
  onReconnect?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function EEGStatusPanel(props: EEGStatusPanelProps) {
  const viewModel = buildEEGStatusPanelViewModel(props);
  const className = ["ncr-eeg-panel", `ncr-eeg-panel--${viewModel.tone}`, props.className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={className} style={props.style} aria-live="polite">
      <EEGStatusPanelStyles />
      <header className="ncr-eeg-panel__header">
        <div>
          <p className="ncr-eeg-panel__eyebrow">{props.title ?? "EEG 连接状态"}</p>
          <h2 className="ncr-eeg-panel__headline">{viewModel.headline}</h2>
          <p className="ncr-eeg-panel__helper">{viewModel.helperText}</p>
        </div>
        <div className="ncr-eeg-panel__badge" data-tone={viewModel.tone}>
          <span className="ncr-eeg-panel__dot" aria-hidden="true" />
          {viewModel.connectionLabel}
        </div>
      </header>

      <div className="ncr-eeg-panel__summary">
        <StatusItem label="设备连接" value={viewModel.connectionLabel} />
        <StatusItem label="信号质量" value={viewModel.qualityLabel} />
        <StatusItem
          label="训练控制"
          value={viewModel.shouldPauseTraining ? "暂停训练" : "继续训练"}
        />
      </div>

      <div className="ncr-eeg-panel__metrics">
        <MetricBar metric={viewModel.metrics.attention} />
        <MetricBar metric={viewModel.metrics.relaxation} />
        <MetricBar metric={viewModel.metrics.fatigue} />
      </div>

      <div className="ncr-eeg-panel__prompts">
        <Prompt
          label="佩戴提示"
          text={viewModel.wearingPrompt ?? "佩戴状态正常，保持舒适坐姿。"}
          tone={viewModel.wearingPrompt ? "watch" : "ready"}
        />
        <Prompt
          label="数据延迟"
          text={viewModel.latencyPrompt ?? "正在等待实时数据。"}
          tone={viewModel.shouldPauseTraining ? "pause" : "ready"}
        />
      </div>

      {viewModel.shouldPauseTraining && props.onReconnect ? (
        <button className="ncr-eeg-panel__button" type="button" onClick={props.onReconnect}>
          重新连接
        </button>
      ) : null}
    </section>
  );
}

function StatusItem(props: { label: string; value: string }) {
  return (
    <div className="ncr-eeg-panel__status-item">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function MetricBar(props: { metric: EEGMetricViewModel }) {
  const width = props.metric.value ?? 0;
  return (
    <div className="ncr-eeg-panel__metric">
      <div className="ncr-eeg-panel__metric-label">
        <span>{props.metric.label}</span>
        <strong>{props.metric.valueLabel}</strong>
      </div>
      <div className="ncr-eeg-panel__bar" aria-hidden="true">
        <span style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function Prompt(props: { label: string; text: string; tone: "ready" | "watch" | "pause" }) {
  return (
    <div className="ncr-eeg-panel__prompt" data-tone={props.tone}>
      <span>{props.label}</span>
      <p>{props.text}</p>
    </div>
  );
}

function EEGStatusPanelStyles() {
  return <style>{panelCss}</style>;
}

const panelCss = `
.ncr-eeg-panel {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid #d8e2dc;
  border-radius: 8px;
  background: #fbfdfc;
  color: #18332d;
  padding: 20px;
  box-shadow: 0 10px 24px rgba(22, 57, 49, 0.08);
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ncr-eeg-panel--watch {
  border-color: #e8c56a;
  background: #fffdf5;
}

.ncr-eeg-panel--pause {
  border-color: #d8998b;
  background: #fff8f6;
}

.ncr-eeg-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.ncr-eeg-panel__eyebrow {
  margin: 0 0 4px;
  color: #58746b;
  font-size: 13px;
  font-weight: 700;
}

.ncr-eeg-panel__headline {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: 0;
}

.ncr-eeg-panel__helper {
  margin: 8px 0 0;
  color: #446159;
  font-size: 14px;
  line-height: 1.5;
}

.ncr-eeg-panel__badge {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: #e5f2ec;
  color: #174c3a;
  font-size: 14px;
  font-weight: 700;
}

.ncr-eeg-panel__badge[data-tone="watch"] {
  background: #fff1c7;
  color: #725015;
}

.ncr-eeg-panel__badge[data-tone="pause"] {
  background: #fde3dc;
  color: #7a3021;
}

.ncr-eeg-panel__dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: currentColor;
}

.ncr-eeg-panel__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.ncr-eeg-panel__status-item {
  min-width: 0;
  border: 1px solid #e3ebe6;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.7);
  padding: 12px;
}

.ncr-eeg-panel__status-item span,
.ncr-eeg-panel__prompt span {
  display: block;
  color: #607970;
  font-size: 12px;
  font-weight: 700;
}

.ncr-eeg-panel__status-item strong {
  display: block;
  margin-top: 5px;
  color: #1d3b34;
  font-size: 15px;
  line-height: 1.35;
}

.ncr-eeg-panel__metrics {
  display: grid;
  gap: 14px;
  margin-top: 20px;
}

.ncr-eeg-panel__metric-label {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: #2b4942;
  font-size: 14px;
  font-weight: 700;
}

.ncr-eeg-panel__bar {
  height: 10px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e7eee9;
}

.ncr-eeg-panel__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #5f9f87;
  transition: width 180ms ease;
}

.ncr-eeg-panel--watch .ncr-eeg-panel__bar span {
  background: #c89b35;
}

.ncr-eeg-panel--pause .ncr-eeg-panel__bar span {
  background: #c76d5e;
}

.ncr-eeg-panel__prompts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.ncr-eeg-panel__prompt {
  border-left: 4px solid #76a995;
  border-radius: 8px;
  background: #eef7f2;
  padding: 12px 14px;
}

.ncr-eeg-panel__prompt[data-tone="watch"] {
  border-left-color: #c89b35;
  background: #fff6d8;
}

.ncr-eeg-panel__prompt[data-tone="pause"] {
  border-left-color: #c76d5e;
  background: #fde9e4;
}

.ncr-eeg-panel__prompt p {
  margin: 5px 0 0;
  color: #294840;
  font-size: 14px;
  line-height: 1.45;
}

.ncr-eeg-panel__button {
  margin-top: 18px;
  border: 0;
  border-radius: 8px;
  background: #24564b;
  color: #ffffff;
  padding: 10px 16px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.ncr-eeg-panel__button:focus-visible {
  outline: 3px solid #9ccbbb;
  outline-offset: 2px;
}

@media (max-width: 680px) {
  .ncr-eeg-panel {
    padding: 16px;
  }

  .ncr-eeg-panel__header,
  .ncr-eeg-panel__summary,
  .ncr-eeg-panel__prompts {
    grid-template-columns: 1fr;
  }

  .ncr-eeg-panel__header {
    display: grid;
  }

  .ncr-eeg-panel__badge {
    width: fit-content;
  }
}
`;
