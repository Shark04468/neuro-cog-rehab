import { getAppShellRoleLabel } from "./app-shell-menu.js";
import type {
  AppShellEEGStatus,
  AppShellNotification,
  AppShellRole,
  AppShellSystemStatus
} from "./app-shell-types.js";
import type { NeuroThemeMode } from "./design-system-tokens.js";
import { NotificationCenter } from "./notification-center.js";
import { SystemStatusCluster } from "./system-status-cluster.js";
import { ThemeToggle } from "./theme-toggle.js";
import { UserRoleBadge } from "./user-role-badge.js";

export interface TopStatusBarProps {
  role: AppShellRole;
  displayName: string;
  organizationName?: string | undefined;
  eegStatus: AppShellEEGStatus;
  systemStatus: AppShellSystemStatus;
  notifications: readonly AppShellNotification[];
  theme: NeuroThemeMode;
  onThemeChange: (theme: NeuroThemeMode) => void;
  onMenuOpen: () => void;
}

export function TopStatusBar({
  role,
  displayName,
  organizationName = "默认机构",
  eegStatus,
  systemStatus,
  notifications,
  theme,
  onThemeChange,
  onMenuOpen
}: TopStatusBarProps): JSX.Element {
  const roleLabel = getAppShellRoleLabel(role);

  return (
    <header className="ncr-shell-topbar">
      <div className="ncr-shell-topbar__left">
        <button
          aria-label="打开侧边栏菜单"
          className="ncr-shell-mobile-toggle"
          onClick={onMenuOpen}
          type="button"
        >
          ☰
        </button>
        <div className="ncr-shell-topbar__system">
          <span className="ncr-shell-topbar__system-mark" aria-hidden="true">
            NC
          </span>
          <div>
            <strong>NeuroTune-Cog</strong>
            <span>认知康复一体化系统</span>
          </div>
        </div>
        <UserRoleBadge role={role} />
        <div className="ncr-shell-topbar__identity">
          <strong>{displayName}</strong>
          <span>
            {roleLabel} · {organizationName}
          </span>
        </div>
      </div>

      <div className="ncr-shell-topbar__center">
        <SystemStatusCluster eegStatus={eegStatus} status={systemStatus} />
      </div>

      <div className="ncr-shell-topbar__right">
        <NotificationCenter notifications={notifications} />
        <ThemeToggle onThemeChange={onThemeChange} theme={theme} />
        <div className="ncr-shell-avatar" aria-label={`当前用户：${displayName}`}>
          {buildAvatarText(displayName)}
        </div>
      </div>
    </header>
  );
}

function buildAvatarText(displayName: string): string {
  const normalized = displayName.trim();
  if (normalized.length === 0) {
    return "U";
  }

  return normalized.slice(0, 2).toUpperCase();
}
