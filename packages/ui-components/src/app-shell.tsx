import { useMemo, useState } from "react";

import { APP_SHELL_CSS } from "./app-shell.css.js";
import { buildAppShellBreadcrumbs, resolveAppShellActivePath } from "./app-shell-menu.js";
import type {
  AppShellBaseProps,
  AppShellEEGStatus,
  AppShellSystemStatus
} from "./app-shell-types.js";
import { Breadcrumb } from "./breadcrumb.js";
import { NeuroDesignSystemProvider } from "./design-system.js";
import type { NeuroThemeMode } from "./design-system-tokens.js";
import { DynamicMedicalBackground } from "./dynamic-medical-background.js";
import { MainWorkspace } from "./main-workspace.js";
import { ReducedMotionProvider } from "./advanced-front-end-components.js";
import { ResponsiveLayout } from "./responsive-layout.js";
import { RoleAwareRouteGuard } from "./role-aware-route-guard.js";
import { RoleBasedSidebar } from "./role-based-sidebar.js";
import { TopStatusBar } from "./top-status-bar.js";

const DEFAULT_EEG_STATUS: AppShellEEGStatus = {
  connectionStatus: "unstable",
  signalQuality: "unstable",
  attentionScore: null,
  relaxationScore: null,
  fatigueScore: null,
  latencyMs: null,
  statusText: "等待设备状态"
};

const DEFAULT_SYSTEM_STATUS: AppShellSystemStatus = {
  syncStatus: "synced",
  todayTrainingStatus: "not_started",
  riskAlertCount: 0,
  permissionStatus: "authorized",
  permissionLabel: "已授权",
  sessionId: undefined,
  demoMode: false
};

export function AppShell({
  role,
  displayName,
  organizationName,
  activePath,
  children,
  breadcrumbs,
  notifications = [],
  eegStatus = DEFAULT_EEG_STATUS,
  systemStatus,
  initialTheme = "hospital-light",
  onNavigate,
  onLogout,
  isTrainingActive = false
}: AppShellBaseProps): JSX.Element {
  const [theme, setTheme] = useState<NeuroThemeMode>(initialTheme);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const resolvedPath = useMemo(
    () => resolveAppShellActivePath(role, activePath),
    [activePath, role]
  );
  const resolvedBreadcrumbs = useMemo(
    () => breadcrumbs ?? buildAppShellBreadcrumbs(role, resolvedPath),
    [breadcrumbs, resolvedPath, role]
  );
  const resolvedSystemStatus: AppShellSystemStatus = useMemo(
    () => ({
      ...DEFAULT_SYSTEM_STATUS,
      todayTrainingStatus: isTrainingActive
        ? "in_progress"
        : DEFAULT_SYSTEM_STATUS.todayTrainingStatus,
      riskAlertCount: notifications.filter((notification) => notification.level === "warning")
        .length,
      ...systemStatus
    }),
    [isTrainingActive, notifications, systemStatus]
  );

  const handleNavigate = (path: string) => {
    onNavigate?.(path);
    setSidebarOpen(false);
  };

  return (
    <NeuroDesignSystemProvider className="ncr-app-shell-provider" theme={theme}>
      <ReducedMotionProvider>
        <style>{APP_SHELL_CSS}</style>
        <ResponsiveLayout
          background={<DynamicMedicalBackground trainingMode={isTrainingActive} />}
          breadcrumb={<Breadcrumb items={resolvedBreadcrumbs} onNavigate={handleNavigate} />}
          onCloseSidebar={() => setSidebarOpen(false)}
          sidebar={
            <RoleBasedSidebar
              activePath={resolvedPath}
              onLogout={onLogout}
              onNavigate={handleNavigate}
              open={sidebarOpen}
              role={role}
              systemStatus={resolvedSystemStatus}
            />
          }
          sidebarOpen={sidebarOpen}
          topBar={
            <TopStatusBar
              displayName={displayName}
              eegStatus={eegStatus}
              notifications={notifications}
              onMenuOpen={() => setSidebarOpen(true)}
              onThemeChange={setTheme}
              organizationName={organizationName}
              role={role}
              systemStatus={resolvedSystemStatus}
              theme={theme}
            />
          }
        >
          <MainWorkspace>
            <RoleAwareRouteGuard
              demoMode={resolvedSystemStatus.demoMode}
              onNavigateHome={() => handleNavigate(resolvedPath)}
              path={activePath}
              role={role}
            >
              {children}
            </RoleAwareRouteGuard>
          </MainWorkspace>
        </ResponsiveLayout>
      </ReducedMotionProvider>
    </NeuroDesignSystemProvider>
  );
}
