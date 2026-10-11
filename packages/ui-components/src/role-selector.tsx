import { RoleEntranceCard } from "./advanced-front-end-components.js";
import { AUTH_ROLE_OPTIONS } from "./unified-auth-model.js";
import type { AuthPortalRole } from "./unified-auth-types.js";

export interface RoleSelectorProps {
  selectedRole: AuthPortalRole | null;
  onRoleChange: (role: AuthPortalRole) => void;
}

export function RoleSelector({ selectedRole, onRoleChange }: RoleSelectorProps): JSX.Element {
  return (
    <div className="ncr-role-selector" role="listbox" aria-label="选择登录身份">
      {AUTH_ROLE_OPTIONS.map((option) => (
        <RoleEntranceCard
          key={option.role}
          onSelect={onRoleChange}
          option={option}
          selected={selectedRole === option.role}
        />
      ))}
    </div>
  );
}
