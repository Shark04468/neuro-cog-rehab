import { randomUUID } from "node:crypto";

import type { AuthSession, UserAccount } from "./auth-types.js";

export interface ProfileAccessRecord {
  userProfileId: string;
  organizationId?: string;
  traineeUserId?: string;
  parentUserIds: string[];
  therapistUserIds: string[];
}

export interface AuthRepository {
  createUser(user: Omit<UserAccount, "id" | "createdAt" | "updatedAt">): Promise<UserAccount>;
  findUserByEmail(email: string): Promise<UserAccount | undefined>;
  findUserByPhone(phone: string): Promise<UserAccount | undefined>;
  findUserById(id: string): Promise<UserAccount | undefined>;
  createSession(session: Omit<AuthSession, "id" | "createdAt">): Promise<AuthSession>;
  findSessionByRefreshTokenId(refreshTokenId: string): Promise<AuthSession | undefined>;
  revokeSessionByRefreshTokenId(refreshTokenId: string): Promise<void>;
  revokeSessionByAccessTokenId(accessTokenId: string): Promise<void>;
  isTokenRevoked(tokenId: string): Promise<boolean>;
  upsertProfileAccess(record: ProfileAccessRecord): Promise<void>;
  findProfileAccess(userProfileId: string): Promise<ProfileAccessRecord | undefined>;
}

/**
 * In-memory repository used for unit tests and early module wiring. A database-backed
 * adapter can implement the same interface without changing auth/RBAC services.
 */
export class InMemoryAuthRepository implements AuthRepository {
  private readonly users = new Map<string, UserAccount>();
  private readonly sessions = new Map<string, AuthSession>();
  private readonly revokedTokenIds = new Set<string>();
  private readonly profileAccess = new Map<string, ProfileAccessRecord>();

  async createUser(
    user: Omit<UserAccount, "id" | "createdAt" | "updatedAt">
  ): Promise<UserAccount> {
    const now = new Date().toISOString();
    const record: UserAccount = {
      ...user,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    this.users.set(record.id, record);
    return record;
  }

  async findUserByEmail(email: string): Promise<UserAccount | undefined> {
    const normalized = email.toLowerCase();
    return [...this.users.values()].find((user) => user.email?.toLowerCase() === normalized);
  }

  async findUserByPhone(phone: string): Promise<UserAccount | undefined> {
    return [...this.users.values()].find((user) => user.phone === phone);
  }

  async findUserById(id: string): Promise<UserAccount | undefined> {
    return this.users.get(id);
  }

  async createSession(session: Omit<AuthSession, "id" | "createdAt">): Promise<AuthSession> {
    const record: AuthSession = {
      ...session,
      id: randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.sessions.set(record.refreshTokenId, record);
    return record;
  }

  async findSessionByRefreshTokenId(refreshTokenId: string): Promise<AuthSession | undefined> {
    return this.sessions.get(refreshTokenId);
  }

  async revokeSessionByRefreshTokenId(refreshTokenId: string): Promise<void> {
    const session = this.sessions.get(refreshTokenId);
    if (session) {
      session.isRevoked = true;
      this.revokedTokenIds.add(session.refreshTokenId);
      this.revokedTokenIds.add(session.accessTokenId);
    }
  }

  async revokeSessionByAccessTokenId(accessTokenId: string): Promise<void> {
    this.revokedTokenIds.add(accessTokenId);
    for (const session of this.sessions.values()) {
      if (session.accessTokenId === accessTokenId) {
        session.isRevoked = true;
        this.revokedTokenIds.add(session.refreshTokenId);
      }
    }
  }

  async isTokenRevoked(tokenId: string): Promise<boolean> {
    return this.revokedTokenIds.has(tokenId);
  }

  async upsertProfileAccess(record: ProfileAccessRecord): Promise<void> {
    this.profileAccess.set(record.userProfileId, {
      ...record,
      parentUserIds: [...record.parentUserIds],
      therapistUserIds: [...record.therapistUserIds]
    });
  }

  async findProfileAccess(userProfileId: string): Promise<ProfileAccessRecord | undefined> {
    const record = this.profileAccess.get(userProfileId);
    if (!record) {
      return undefined;
    }

    return {
      ...record,
      parentUserIds: [...record.parentUserIds],
      therapistUserIds: [...record.therapistUserIds]
    };
  }
}
