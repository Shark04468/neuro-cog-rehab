import type { ReactNode } from "react";

import { getAppShellRoleLabel, isAppShellPathAllowed } from "./app-shell-menu.js";
import type { AppShellRole } from "./app-shell-types.js";
import { PermissionDeniedState } from "./shell-states.js";

export interface RoleAwareRouteGuardProps {
  role: AppShellRole;
  path: string;
  children: ReactNode;
  demoMode?: boolean | undefined;
  onNavigateHome?: (() => void) | undefined;
}

export function RoleAwareRouteGuard({
  role,
  path,
  children,
  demoMode = false,
  onNavigateHome
}: RoleAwareRouteGuardProps): JSX.Element {
  if (isAppShellPathAllowed(role, path)) {
    return <>{children}</>;
  }

  return (
    <PermissionDeniedState
      roleLabel={getAppShellRoleLabel(role)}
      message={
        demoMode
          ? `演示模式仅展示 ${getAppShellRoleLabel(role)} 可访问的页面，其他身份入口不会绕过权限边界。`
          : `请使用已授权的 ${getAppShellRoleLabel(role)} 工作区入口访问数据。`
      }
      actionLabel="返回当前工作区"
      onAction={onNavigateHome}
    />
  );
}
