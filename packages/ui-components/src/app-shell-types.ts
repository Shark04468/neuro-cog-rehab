import type { ReactNode } from "react";

import type { NeuroThemeMode, NeuroTone } from "./design-system-tokens.js";
import type { AuthPortalRole } from "./unified-auth-types.js";

export type AppShellRole = AuthPortalRole;

export type AppShellDeviceStatus = "connected" | "unstable" | "disconnected";

export type AppShellSignalQuality = "good" | "unstable" | "noisy" | "disconnected";

export type AppShellNotificationLevel = "info" | "success" | "warning";

export type AppShellSyncStatus = "synced" | "syncing" | "pending" | "offline";

export type AppShellTrainingStatus = "not_started" | "in_progress" | "completed" | "paused";

export type AppShellPermissionStatus = "authorized" | "limited" | "demo";

export interface AppShellMenuItem {
  id: string;
  label: string;
  description: string;
  path: string;
  roles: readonly AppShellRole[];
  icon?: string | undefined;
  tone?: NeuroTone;
  badgeLabel?: string;
}

export interface AppShellBreadcrumbItem {
  label: string;
  path?: string;
}

export interface AppShellNotification {
  id: string;
  title: string;
  message: string;
  level: AppShellNotificationLevel;
  createdAtLabel: string;
  read?: boolean;
}

export interface AppShellEEGStatus {
  connectionStatus: AppShellDeviceStatus;
  signalQuality: AppShellSignalQuality;
  attentionScore: number | null;
  relaxationScore: number | null;
  fatigueScore: number | null;
  latencyMs: number | null;
  statusText: string;
}

export interface AppShellSystemStatus {
  syncStatus: AppShellSyncStatus;
  todayTrainingStatus: AppShellTrainingStatus;
  riskAlertCount: number;
  permissionStatus: AppShellPermissionStatus;
  permissionLabel: string;
  sessionId?: string | undefined;
  demoMode?: boolean | undefined;
}

export interface AppShellRouteAdapter {
  role: AppShellRole;
  activePath: string;
  onNavigate?: (path: string) => void;
}

export interface AppShellContext {
  role: AppShellRole;
  displayName: string;
  organizationName?: string | undefined;
  activePath: string;
  theme: NeuroThemeMode;
}

export interface AppShellBaseProps {
  role: AppShellRole;
  displayName: string;
  organizationName?: string | undefined;
  activePath: string;
  children: ReactNode;
  breadcrumbs?: AppShellBreadcrumbItem[] | undefined;
  notifications?: AppShellNotification[] | undefined;
  eegStatus?: AppShellEEGStatus | undefined;
  systemStatus?: Partial<AppShellSystemStatus> | undefined;
  initialTheme?: NeuroThemeMode | undefined;
  onNavigate?: ((path: string) => void) | undefined;
  onLogout?: (() => void) | undefined;
  /**
   * Lowers ambient motion while a training task is active so visual effects do
   * not compete with attention, reaction, or rhythm tasks.
   */
  isTrainingActive?: boolean | undefined;
}

export class AppShellError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AppShellError";
  }
}
