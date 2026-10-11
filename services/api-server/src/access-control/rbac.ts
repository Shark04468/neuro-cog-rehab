import type { UserRole } from "@neuro-cog-rehab/shared-types";

export const PERMISSIONS = [
  "auth:register",
  "auth:login",
  "auth:refresh",
  "auth:logout",
  "profile:read:self",
  "profile:read:authorized",
  "profile:manage:organization",
  "profile:manage:system",
  "training:record:create:self",
  "training:record:read:authorized",
  "training:data:export",
  "report:read:authorized",
  "audit:read:organization",
  "audit:read:system"
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  trainee: ["profile:read:self", "training:record:create:self"],
  parent: ["profile:read:authorized", "training:record:read:authorized", "report:read:authorized"],
  therapist: [
    "profile:read:authorized",
    "training:record:read:authorized",
    "training:data:export",
    "report:read:authorized"
  ],
  org_admin: [
    "profile:manage:organization",
    "training:record:read:authorized",
    "training:data:export",
    "report:read:authorized",
    "audit:read:organization"
  ],
  system_admin: [
    "profile:manage:system",
    "training:record:read:authorized",
    "training:data:export",
    "report:read:authorized",
    "audit:read:system"
  ]
};

export function hasPermission(roles: readonly UserRole[], permission: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission) ?? false);
}
