import type { AppShellEEGStatus } from "./app-shell-types.js";

export interface GlobalEEGStatusProps {
  status: AppShellEEGStatus;
}

export function GlobalEEGStatus({ status }: GlobalEEGStatusProps): JSX.Element {
  const detail = [
    formatScore("注意", status.attentionScore),
    formatScore("放松", status.relaxationScore),
    status.latencyMs === null ? null : `延迟 ${Math.round(status.latencyMs)}ms`
  ]
    .filter((item): item is string => item !== null)
    .join(" · ");

  return (
    <div
      aria-label={`EEG 状态：${status.statusText}`}
      className="ncr-shell-eeg"
      data-quality={status.signalQuality}
      data-status={status.connectionStatus}
      role="status"
    >
      <span className="ncr-shell-eeg__dot" />
      <span>
        <strong>{status.statusText}</strong>
        <span>{detail || "等待实时状态"}</span>
      </span>
    </div>
  );
}

function formatScore(label: string, value: number | null): string | null {
  return value === null ? null : `${label} ${Math.round(value)}`;
}
