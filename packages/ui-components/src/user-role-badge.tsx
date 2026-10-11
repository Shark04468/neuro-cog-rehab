import { getAppShellRoleLabel, getAppShellRoleTone } from "./app-shell-menu.js";
import type { AppShellRole } from "./app-shell-types.js";
import { joinNeuroClassNames } from "./design-system-tokens.js";

export interface UserRoleBadgeProps {
  role: AppShellRole;
  className?: string;
}

export function UserRoleBadge({ role, className }: UserRoleBadgeProps): JSX.Element {
  return (
    <span
      className={joinNeuroClassNames("ncr-role-badge", className)}
      data-role={role}
      data-tone={getAppShellRoleTone(role)}
    >
      {getAppShellRoleLabel(role)}
    </span>
  );
}
