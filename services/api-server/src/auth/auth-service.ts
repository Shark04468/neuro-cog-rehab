import { isUserRole } from "@neuro-cog-rehab/shared-types";

import { AuthModuleError, requireCondition } from "./auth-errors.js";
import type { AuthRepository } from "./auth-repository.js";
import type {
  AuthenticatedPrincipal,
  AuthTokenPair,
  LoginInput,
  LogoutInput,
  RegisterUserInput,
  UserAccount
} from "./auth-types.js";
import type { PasswordService } from "./password-service.js";
import type { TokenService } from "./token-service.js";

export interface AuthServiceDependencies {
  repository: AuthRepository;
  passwordService: PasswordService;
  tokenService: TokenService;
}

/**
 * Authentication use cases for registration, login, logout, and token refresh.
 * It deliberately stores no clinical or diagnostic information.
 */
export class AuthService {
  constructor(private readonly dependencies: AuthServiceDependencies) {}

  async register(input: RegisterUserInput): Promise<UserAccount> {
    this.validateRegistration(input);
    await this.assertUniqueLogin(input);

    const user: Omit<UserAccount, "id" | "createdAt" | "updatedAt"> = {
      displayName: input.displayName.trim(),
      passwordHash: this.dependencies.passwordService.hashPassword(input.password),
      roles: [input.role],
      status: "active"
    };
    if (input.email !== undefined) {
      user.email = input.email.toLowerCase();
    }
    if (input.phone !== undefined) {
      user.phone = input.phone;
    }
    if (input.organizationId !== undefined) {
      user.organizationId = input.organizationId;
    }
    if (input.userProfileId !== undefined) {
      user.userProfileId = input.userProfileId;
    }

    return this.dependencies.repository.createUser(user);
  }

  async login(input: LoginInput): Promise<AuthTokenPair> {
    const user = await this.findLoginUser(input);
    if (
      !user ||
      !this.dependencies.passwordService.verifyPassword(input.password, user.passwordHash)
    ) {
      throw new AuthModuleError("AUTHENTICATION_REQUIRED", "Invalid credentials.");
    }
    requireCondition(user.status === "active", "PERMISSION_DENIED", "User account is not active.");

    return this.issueSession(user);
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenPair> {
    const claims = this.dependencies.tokenService.verifyToken(refreshToken, "refresh");
    const session = await this.dependencies.repository.findSessionByRefreshTokenId(claims.jti);
    requireCondition(
      Boolean(session) && !session?.isRevoked,
      "AUTHENTICATION_REQUIRED",
      "Refresh token is revoked."
    );

    const user = await this.dependencies.repository.findUserById(claims.sub);
    if (!user) {
      throw new AuthModuleError("AUTHENTICATION_REQUIRED", "Token user no longer exists.");
    }
    requireCondition(user.status === "active", "PERMISSION_DENIED", "User account is not active.");

    await this.dependencies.repository.revokeSessionByRefreshTokenId(claims.jti);
    return this.issueSession(user);
  }

  async logout(input: LogoutInput): Promise<void> {
    if (input.refreshToken) {
      const claims = this.dependencies.tokenService.verifyToken(input.refreshToken, "refresh");
      await this.dependencies.repository.revokeSessionByRefreshTokenId(claims.jti);
    }

    if (input.accessToken) {
      const claims = this.dependencies.tokenService.verifyToken(input.accessToken, "access");
      await this.dependencies.repository.revokeSessionByAccessTokenId(claims.jti);
    }
  }

  async authenticateAccessToken(accessToken: string): Promise<AuthenticatedPrincipal> {
    const claims = this.dependencies.tokenService.verifyToken(accessToken, "access");
    const isRevoked = await this.dependencies.repository.isTokenRevoked(claims.jti);
    requireCondition(!isRevoked, "AUTHENTICATION_REQUIRED", "Access token is revoked.");

    const user = await this.dependencies.repository.findUserById(claims.sub);
    if (!user) {
      throw new AuthModuleError("AUTHENTICATION_REQUIRED", "Token user no longer exists.");
    }
    requireCondition(user.status === "active", "PERMISSION_DENIED", "User account is not active.");

    const principal: AuthenticatedPrincipal = {
      userId: claims.sub,
      roles: claims.roles
    };
    if (claims.organizationId !== undefined) {
      principal.organizationId = claims.organizationId;
    }
    if (claims.userProfileId !== undefined) {
      principal.userProfileId = claims.userProfileId;
    }

    return principal;
  }

  private validateRegistration(input: RegisterUserInput): void {
    requireCondition(
      Boolean(input.email || input.phone),
      "VALIDATION_ERROR",
      "Email or phone is required."
    );
    requireCondition(
      input.displayName.trim().length > 0,
      "VALIDATION_ERROR",
      "Display name is required."
    );
    requireCondition(isUserRole(input.role), "VALIDATION_ERROR", "Unsupported role.");

    if (input.role === "trainee") {
      requireCondition(
        Boolean(input.userProfileId),
        "VALIDATION_ERROR",
        "Trainee registration requires a profile id."
      );
    }

    if (input.role === "org_admin") {
      requireCondition(
        Boolean(input.organizationId),
        "VALIDATION_ERROR",
        "Organization admin registration requires an organization id."
      );
    }
  }

  private async assertUniqueLogin(input: RegisterUserInput): Promise<void> {
    if (input.email) {
      const existing = await this.dependencies.repository.findUserByEmail(input.email);
      requireCondition(!existing, "VALIDATION_ERROR", "Email is already registered.");
    }

    if (input.phone) {
      const existing = await this.dependencies.repository.findUserByPhone(input.phone);
      requireCondition(!existing, "VALIDATION_ERROR", "Phone is already registered.");
    }
  }

  private async findLoginUser(input: LoginInput): Promise<UserAccount | undefined> {
    if (input.email) {
      return this.dependencies.repository.findUserByEmail(input.email);
    }
    if (input.phone) {
      return this.dependencies.repository.findUserByPhone(input.phone);
    }
    throw new AuthModuleError("VALIDATION_ERROR", "Email or phone is required.");
  }

  private async issueSession(user: UserAccount): Promise<AuthTokenPair> {
    const accessToken = this.dependencies.tokenService.issueToken(user, "access");
    const refreshToken = this.dependencies.tokenService.issueToken(user, "refresh");

    await this.dependencies.repository.createSession({
      userId: user.id,
      refreshTokenId: refreshToken.claims.jti,
      accessTokenId: accessToken.claims.jti,
      isRevoked: false,
      expiresAt: refreshToken.expiresAt
    });

    return {
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshTokenExpiresAt: refreshToken.expiresAt
    };
  }
}
