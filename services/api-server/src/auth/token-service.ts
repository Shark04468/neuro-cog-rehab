import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import type { UserRole } from "@neuro-cog-rehab/shared-types";

import { AuthModuleError } from "./auth-errors.js";
import type { AuthTokenClaims, TokenUse, UserAccount } from "./auth-types.js";

const JWT_HEADER = { alg: "HS256", typ: "JWT" } as const;

export interface TokenServiceOptions {
  secret: string;
  accessTokenTtlSeconds?: number;
  refreshTokenTtlSeconds?: number;
}

export interface IssuedToken {
  token: string;
  claims: AuthTokenClaims;
  expiresAt: string;
}

/**
 * Minimal HMAC-signed token service for the auth core. It keeps token claims explicit
 * so HTTP adapters can remain framework-agnostic.
 */
export class TokenService {
  private readonly accessTokenTtlSeconds: number;
  private readonly refreshTokenTtlSeconds: number;

  constructor(private readonly options: TokenServiceOptions) {
    if (options.secret.length < 32) {
      throw new AuthModuleError(
        "VALIDATION_ERROR",
        "Token secret must contain at least 32 characters."
      );
    }
    this.accessTokenTtlSeconds = options.accessTokenTtlSeconds ?? 15 * 60;
    this.refreshTokenTtlSeconds = options.refreshTokenTtlSeconds ?? 7 * 24 * 60 * 60;
  }

  issueToken(user: UserAccount, tokenUse: TokenUse, now: Date = new Date()): IssuedToken {
    const ttlSeconds =
      tokenUse === "access" ? this.accessTokenTtlSeconds : this.refreshTokenTtlSeconds;
    const issuedAt = Math.floor(now.getTime() / 1000);
    const expiresAtSeconds = issuedAt + ttlSeconds;
    const claims: AuthTokenClaims = {
      sub: user.id,
      roles: [...user.roles],
      tokenUse,
      jti: randomUUID(),
      iat: issuedAt,
      exp: expiresAtSeconds
    };
    if (user.organizationId !== undefined) {
      claims.organizationId = user.organizationId;
    }
    if (user.userProfileId !== undefined) {
      claims.userProfileId = user.userProfileId;
    }

    return {
      token: this.signClaims(claims),
      claims,
      expiresAt: new Date(expiresAtSeconds * 1000).toISOString()
    };
  }

  verifyToken(token: string, expectedUse: TokenUse, now: Date = new Date()): AuthTokenClaims {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new AuthModuleError("AUTHENTICATION_REQUIRED", "Token format is invalid.");
    }

    const signedPart = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = this.sign(signedPart);
    const receivedSignature = Buffer.from(encodedSignature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);

    if (
      receivedSignature.length !== expectedSignatureBuffer.length ||
      !timingSafeEqual(receivedSignature, expectedSignatureBuffer)
    ) {
      throw new AuthModuleError("AUTHENTICATION_REQUIRED", "Token signature is invalid.");
    }

    const claims = parseClaims(decodeBase64Url(encodedPayload));
    if (claims.tokenUse !== expectedUse) {
      throw new AuthModuleError(
        "AUTHENTICATION_REQUIRED",
        "Token use does not match this operation."
      );
    }

    if (claims.exp <= Math.floor(now.getTime() / 1000)) {
      throw new AuthModuleError("AUTHENTICATION_REQUIRED", "Token has expired.");
    }

    return claims;
  }

  private signClaims(claims: AuthTokenClaims): string {
    const encodedHeader = encodeBase64Url(JSON.stringify(JWT_HEADER));
    const encodedPayload = encodeBase64Url(JSON.stringify(claims));
    const signedPart = `${encodedHeader}.${encodedPayload}`;

    return `${signedPart}.${this.sign(signedPart)}`;
  }

  private sign(value: string): string {
    return createHmac("sha256", this.options.secret).update(value).digest("base64url");
  }
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function parseClaims(rawJson: string): AuthTokenClaims {
  let value: unknown;
  try {
    value = JSON.parse(rawJson);
  } catch {
    throw new AuthModuleError("AUTHENTICATION_REQUIRED", "Token payload is invalid.");
  }
  if (!isClaims(value)) {
    throw new AuthModuleError("AUTHENTICATION_REQUIRED", "Token claims are invalid.");
  }
  return value;
}

function isClaims(value: unknown): value is AuthTokenClaims {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<AuthTokenClaims>;
  return (
    typeof candidate.sub === "string" &&
    Array.isArray(candidate.roles) &&
    candidate.roles.every((role): role is UserRole => typeof role === "string") &&
    (candidate.tokenUse === "access" || candidate.tokenUse === "refresh") &&
    typeof candidate.jti === "string" &&
    typeof candidate.exp === "number" &&
    typeof candidate.iat === "number"
  );
}
