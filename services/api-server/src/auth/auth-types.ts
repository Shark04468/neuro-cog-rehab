import type { UserRole } from "@neuro-cog-rehab/shared-types";

export type UserAccountStatus = "active" | "paused" | "archived";

export interface UserAccount {
  id: string;
  email?: string;
  phone?: string;
  displayName: string;
  passwordHash: string;
  roles: UserRole[];
  status: UserAccountStatus;
  organizationId?: string;
  /** Training user profile id when the account belongs to a trainee. */
  userProfileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterUserInput {
  email?: string;
  phone?: string;
  displayName: string;
  password: string;
  role: UserRole;
  organizationId?: string;
  userProfileId?: string;
}

export interface LoginInput {
  email?: string;
  phone?: string;
  password: string;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  refreshTokenId: string;
  accessTokenId: string;
  isRevoked: boolean;
  createdAt: string;
  expiresAt: string;
}

export type TokenUse = "access" | "refresh";

export interface AuthTokenClaims {
  sub: string;
  roles: UserRole[];
  tokenUse: TokenUse;
  jti: string;
  exp: number;
  iat: number;
  organizationId?: string;
  userProfileId?: string;
}

export interface AuthenticatedPrincipal {
  userId: string;
  roles: UserRole[];
  organizationId?: string;
  userProfileId?: string;
}

export interface LogoutInput {
  accessToken?: string;
  refreshToken?: string;
}
