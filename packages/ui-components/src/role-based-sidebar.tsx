import { useState } from "react";

import {
  getAppShellMenuItems,
  getAppShellRoleLabel,
  isAppShellPathAllowed
} from "./app-shell-menu.js";
import { DemoModeBadge } from "./advanced-front-end-components.js";
import type { AppShellMenuItem, AppShellRole, AppShellSystemStatus } from "./app-shell-types.js";

export interface RoleBasedSidebarProps {
  role: AppShellRole;
  activePath: string;
  open: boolean;
  systemStatus: AppShellSystemStatus;
  onNavigate?: ((path: string) => void) | undefined;
  onLogout?: (() => void) | undefined;
}

const ICON_LABELS: Record<string, string> = {
  pulse: "⌁",
  music: "♪",
  focus: "◎",
  target: "◉",
  route: "⌘",
  report: "▤",
  device: "◌",
  settings: "⚙",
  overview: "◫",
  brief: "☷",
  record: "≡",
  note: "✎",
  shield: "◇",
  dashboard: "▦",
  users: "人",
  prescription: "Rx",
  monitor: "◍",
  export: "⇩",
  building: "院",
  clinician: "医",
  chart: "↗",
  log: "日",
  lock: "权"
};

export function RoleBasedSidebar({
  role,
  activePath,
  open,
  systemStatus,
  onNavigate,
  onLogout
}: RoleBasedSidebarProps): JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const menuItems = getAppShellMenuItems(role);
  const roleLabel = getAppShellRoleLabel(role);

  return (
    <aside
      className="ncr-shell-sidebar"
      data-collapsed={String(collapsed)}
      data-open={String(open)}
    >
      <header className="ncr-shell-sidebar__brand">
        <span aria-hidden="true" className="ncr-shell-sidebar__logo">
          NC
        </span>
        <div>
          <strong>认知康复一体化系统</strong>
          <span>{roleLabel}医疗工作空间</span>
        </div>
        <button
          aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
          className="ncr-shell-sidebar__collapse"
          onClick={() => setCollapsed((current) => !current)}
          type="button"
        >
          {collapsed ? "›" : "‹"}
        </button>
      </header>

      {systemStatus.demoMode ? (
        <div className="ncr-shell-sidebar__demo" role="note">
          <DemoModeBadge label="演示身份切换" />
          <span>当前为演示数据身份，不会绕过真实权限系统。</span>
        </div>
      ) : null}

      <nav aria-label={`${roleLabel}菜单`} className="ncr-shell-sidebar__nav">
        {menuItems.map((item) => (
          <SidebarItem
            activePath={activePath}
            item={item}
            key={item.id}
            onNavigate={onNavigate}
            role={role}
          />
        ))}
      </nav>

      <footer className="ncr-shell-sidebar__footer">
        <div className="ncr-shell-sidebar__system">
          <span>NeuroTune-Cog MVP</span>
          <strong>{systemStatus.permissionLabel}</strong>
          <em>{systemStatus.syncStatus === "offline" ? "离线缓存" : "系统状态稳定"}</em>
        </div>
        {onLogout ? (
          <button className="ncr-shell-sidebar__logout" onClick={onLogout} type="button">
            退出当前身份
          </button>
        ) : null}
      </footer>
    </aside>
  );
}

function SidebarItem(props: {
  role: AppShellRole;
  item: AppShellMenuItem;
  activePath: string;
  onNavigate?: ((path: string) => void) | undefined;
}): JSX.Element | null {
  if (!isAppShellPathAllowed(props.role, props.item.path)) {
    return null;
  }

  const isActive =
    props.activePath === props.item.path || props.activePath.startsWith(`${props.item.path}/`);
  const handleNavigate = () => {
    if (props.onNavigate) {
      props.onNavigate(props.item.path);
      return;
    }

    if (typeof window !== "undefined") {
      window.location.assign(props.item.path);
    }
  };

  return (
    <button
      aria-current={isActive ? "page" : undefined}
      className="ncr-shell-sidebar__link"
      data-active={String(isActive)}
      data-path={props.item.path}
      data-tone={props.item.tone ?? "default"}
      onClick={handleNavigate}
      title={`${props.item.label}：${props.item.description}`}
      type="button"
    >
      <span aria-hidden="true" className="ncr-shell-sidebar__icon">
        {ICON_LABELS[props.item.icon ?? ""] ?? props.item.label.slice(0, 1)}
      </span>
      <span className="ncr-shell-sidebar__text">
        <span className="ncr-shell-sidebar__label">{props.item.label}</span>
        <span className="ncr-shell-sidebar__desc">{props.item.description}</span>
      </span>
      {props.item.badgeLabel ? (
        <span className="ncr-shell-sidebar__badge">{props.item.badgeLabel}</span>
      ) : null}
    </button>
  );
}
