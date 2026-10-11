export const USER_ROLES = ["trainee", "parent", "therapist", "org_admin", "system_admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type DataScope = "self" | "parent_linked" | "therapist_linked" | "organization" | "system";

export interface AuthenticatedPrincipal {
  userId: string;
  roles: UserRole[];
  dataScope: DataScope;
  organizationId?: string;
  /** Training profile scope for trainee-owned training records and authorized data views. */
  userProfileId?: string;
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}
