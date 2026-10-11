import type { AuthenticatedPrincipal, UserRole } from "@neuro-cog-rehab/shared-types";

export type AuthPortalRole = Extract<UserRole, "trainee" | "parent" | "therapist" | "org_admin">;

export type AuthPortalMode = "login" | "register";

export type AuthRoleIconKind = "training" | "guardian" | "therapist" | "organization";

export interface AuthRoleOption {
  role: AuthPortalRole;
  label: string;
  shortLabel: string;
  description: string;
  iconKind: AuthRoleIconKind;
  dashboardPath: string;
}

export interface UnifiedLoginInput {
  role: AuthPortalRole | null;
  identifier: string;
  password: string;
  rememberRole: boolean;
}

export interface UnifiedRegisterInput {
  role: AuthPortalRole | null;
  displayName: string;
  identifier: string;
  password: string;
  confirmPassword: string;
  acceptedPrivacy: boolean;
  traineeAgeRange?: string;
  traineeGoal?: string;
  linkedTraineeAlias?: string;
  institutionName?: string;
  organizationName?: string;
}

export interface AuthValidationIssue {
  field: string;
  message: string;
}

export interface UnifiedAuthResult {
  role: AuthPortalRole;
  dashboardPath: string;
  displayName: string;
  issuedAt: string;
  authProvider: "mock" | "api" | "demo";
  principal: AuthenticatedPrincipal;
  apiSession?:
    | {
        provider: "api-server";
        apiBaseUrl: string;
        accessToken: string;
        refreshToken: string;
        accessTokenExpiresAt: string;
        refreshTokenExpiresAt: string;
      }
    | undefined;
  demoMode?:
    | {
        enabled: true;
        scenarioId: string;
        dataLabel: string;
        accountId: string;
      }
    | undefined;
}

export type UnifiedAuthClient = (input: UnifiedLoginInput) => Promise<UnifiedAuthResult>;
