import type { AppShellEEGStatus, AppShellSystemStatus } from "./app-shell-types.js";

export interface SystemStatusClusterProps {
  eegStatus: AppShellEEGStatus;
  status: AppShellSystemStatus;
}

const SYNC_LABELS: Record<AppShellSystemStatus["syncStatus"], string> = {
  synced: "数据已同步",
  syncing: "同步中",
  pending: "待同步",
  offline: "离线缓存"
};

const TRAINING_LABELS: Record<AppShellSystemStatus["todayTrainingStatus"], string> = {
  not_started: "今日未开始",
  in_progress: "训练进行中",
  completed: "今日已完成",
  paused: "训练已暂停"
};

export function SystemStatusCluster({ eegStatus, status }: SystemStatusClusterProps): JSX.Element {
  return (
    <div className="ncr-system-status-cluster" aria-label="全局系统状态">
      <StatusPill
        label="EEG"
        state={eegStatus.connectionStatus}
        tone={resolveEegTone(eegStatus.connectionStatus)}
        value={eegStatus.statusText}
      />
      <StatusPill
        label="数据"
        state={status.syncStatus}
        tone={status.syncStatus === "synced" ? "ok" : "notice"}
        value={SYNC_LABELS[status.syncStatus]}
      />
      <StatusPill
        label="今日"
        state={status.todayTrainingStatus}
        tone={status.todayTrainingStatus === "completed" ? "ok" : "notice"}
        value={TRAINING_LABELS[status.todayTrainingStatus]}
      />
      <StatusPill
        label="提醒"
        state={status.riskAlertCount > 0 ? "risk" : "clear"}
        tone={status.riskAlertCount > 0 ? "warning" : "ok"}
        value={`${status.riskAlertCount} 条`}
      />
      <StatusPill
        label="权限"
        state={status.permissionStatus}
        tone={status.permissionStatus === "authorized" ? "ok" : "notice"}
        value={status.permissionLabel}
      />
      {status.demoMode ? (
        <StatusPill label="模式" state="demo" tone="warning" value="演示数据" />
      ) : null}
    </div>
  );
}

function StatusPill({
  label,
  value,
  state,
  tone
}: {
  label: string;
  value: string;
  state: string;
  tone: "ok" | "notice" | "warning";
}): JSX.Element {
  return (
    <span className="ncr-system-status-pill" data-state={state} data-tone={tone}>
      <i aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

function resolveEegTone(
  status: AppShellEEGStatus["connectionStatus"]
): "ok" | "notice" | "warning" {
  if (status === "connected") {
    return "ok";
  }

  return status === "unstable" ? "notice" : "warning";
}
