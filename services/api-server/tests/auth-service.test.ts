import { describe, expect, it } from "vitest";

import {
  AuthService,
  InMemoryAuthRepository,
  PasswordService,
  TokenService
} from "../src/index.js";
import type { AuthModuleError } from "../src/index.js";

function createAuthFixture() {
  const repository = new InMemoryAuthRepository();
  const authService = new AuthService({
    repository,
    passwordService: new PasswordService(),
    tokenService: new TokenService({
      secret: "test-secret-with-at-least-thirty-two-characters",
      accessTokenTtlSeconds: 60,
      refreshTokenTtlSeconds: 600
    })
  });

  return { authService, repository };
}

describe("AuthService", () => {
  it("registers and logs in a trainee account", async () => {
    const { authService } = createAuthFixture();

    const user = await authService.register({
      email: "trainee@example.test",
      displayName: "Trainee A",
      password: "StrongPass123",
      role: "trainee",
      organizationId: "org-1",
      userProfileId: "profile-1"
    });

    const tokens = await authService.login({
      email: "trainee@example.test",
      password: "StrongPass123"
    });
    const principal = await authService.authenticateAccessToken(tokens.accessToken);

    expect(user.roles).toEqual(["trainee"]);
    expect(principal.userId).toBe(user.id);
    expect(principal.userProfileId).toBe("profile-1");
    expect(tokens.refreshToken).not.toBe(tokens.accessToken);
  });

  it("rejects duplicate email registration and weak passwords", async () => {
    const { authService } = createAuthFixture();

    await authService.register({
      email: "parent@example.test",
      displayName: "Parent A",
      password: "StrongPass123",
      role: "parent"
    });

    await expect(
      authService.register({
        email: "parent@example.test",
        displayName: "Parent B",
        password: "StrongPass123",
        role: "parent"
      })
    ).rejects.toMatchObject<AuthModuleError>({
      appError: { code: "VALIDATION_ERROR" }
    });

    await expect(
      authService.register({
        email: "weak@example.test",
        displayName: "Weak Password",
        password: "short",
        role: "parent"
      })
    ).rejects.toMatchObject<AuthModuleError>({
      appError: { code: "VALIDATION_ERROR" }
    });
  });

  it("refreshes tokens by rotating the refresh session", async () => {
    const { authService } = createAuthFixture();

    await authService.register({
      email: "therapist@example.test",
      displayName: "Therapist A",
      password: "StrongPass123",
      role: "therapist",
      organizationId: "org-1"
    });

    const firstTokens = await authService.login({
      email: "therapist@example.test",
      password: "StrongPass123"
    });
    const secondTokens = await authService.refreshToken(firstTokens.refreshToken);

    expect(secondTokens.accessToken).not.toBe(firstTokens.accessToken);
    await expect(
      authService.refreshToken(firstTokens.refreshToken)
    ).rejects.toMatchObject<AuthModuleError>({
      appError: { code: "AUTHENTICATION_REQUIRED" }
    });
  });

  it("revokes access after logout", async () => {
    const { authService } = createAuthFixture();

    await authService.register({
      email: "logout@example.test",
      displayName: "Logout User",
      password: "StrongPass123",
      role: "parent"
    });

    const tokens = await authService.login({
      email: "logout@example.test",
      password: "StrongPass123"
    });

    await authService.logout(tokens);

    await expect(
      authService.authenticateAccessToken(tokens.accessToken)
    ).rejects.toMatchObject<AuthModuleError>({
      appError: { code: "AUTHENTICATION_REQUIRED" }
    });
  });
});
