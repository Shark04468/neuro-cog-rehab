import { randomUUID } from "node:crypto";

import type { UserRole } from "@neuro-cog-rehab/shared-types";
import type { QueryResultRow } from "pg";

import type { PostgresQueryClient } from "../postgres/postgres-client.js";
import type { AuthRepository, ProfileAccessRecord } from "./auth-repository.js";
import type { AuthSession, UserAccount, UserAccountStatus } from "./auth-types.js";

const USERS_TABLE = "api_auth_users";
const SESSIONS_TABLE = "api_auth_sessions";
const REVOKED_TOKENS_TABLE = "api_auth_revoked_tokens";
const PROFILE_ACCESS_TABLE = "api_profile_access";

interface ApiAuthUserRow extends QueryResultRow {
  id: string;
  email: string | null;
  phone: string | null;
  display_name: string;
  password_hash: string;
  roles: UserRole[];
  status: UserAccountStatus;
  organization_id: string | null;
  user_profile_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ApiAuthSessionRow extends QueryResultRow {
  id: string;
  user_id: string;
  refresh_token_id: string;
  access_token_id: string;
  is_revoked: boolean;
  created_at: Date | string;
  expires_at: Date | string;
}

interface ApiProfileAccessRow extends QueryResultRow {
  user_profile_id: string;
  organization_id: string | null;
  trainee_user_id: string | null;
  parent_user_ids: string[];
  therapist_user_ids: string[];
}

export interface PostgresAuthRepositoryOptions {
  client: PostgresQueryClient;
  autoMigrate?: boolean;
}

/**
 * PostgreSQL adapter for account, session, token revocation, and profile-access
 * scope data. It stores authorization relationships, not clinical information.
 */
export class PostgresAuthRepository implements AuthRepository {
  private readonly autoMigrate: boolean;
  private readonly client: PostgresQueryClient;
  private migrationPromise: Promise<void> | null = null;

  constructor(options: PostgresAuthRepositoryOptions) {
    this.client = options.client;
    this.autoMigrate = options.autoMigrate ?? true;
  }

  async createUser(
    user: Omit<UserAccount, "id" | "createdAt" | "updatedAt">
  ): Promise<UserAccount> {
    await this.ensureSchema();

    const result = await this.client.query<ApiAuthUserRow>(
      `
        INSERT INTO ${USERS_TABLE} (
          id,
          email,
          phone,
          display_name,
          password_hash,
          roles,
          status,
          organization_id,
          user_profile_id
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
        RETURNING *
      `,
      [
        randomUUID(),
        user.email ?? null,
        user.phone ?? null,
        user.displayName,
        user.passwordHash,
        JSON.stringify(user.roles),
        user.status,
        user.organizationId ?? null,
        user.userProfileId ?? null
      ]
    );

    return rowToUserAccount(requireSingleUser(result.rows));
  }

  async findUserByEmail(email: string): Promise<UserAccount | undefined> {
    await this.ensureSchema();
    const result = await this.client.query<ApiAuthUserRow>(
      `
        SELECT *
        FROM ${USERS_TABLE}
        WHERE lower(email) = lower($1)
        LIMIT 1
      `,
      [email]
    );
    return optionalUser(result.rows);
  }

  async findUserByPhone(phone: string): Promise<UserAccount | undefined> {
    await this.ensureSchema();
    const result = await this.client.query<ApiAuthUserRow>(
      `
        SELECT *
        FROM ${USERS_TABLE}
        WHERE phone = $1
        LIMIT 1
      `,
      [phone]
    );
    return optionalUser(result.rows);
  }

  async findUserById(id: string): Promise<UserAccount | undefined> {
    await this.ensureSchema();
    const result = await this.client.query<ApiAuthUserRow>(
      `
        SELECT *
        FROM ${USERS_TABLE}
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );
    return optionalUser(result.rows);
  }

  async createSession(session: Omit<AuthSession, "id" | "createdAt">): Promise<AuthSession> {
    await this.ensureSchema();
    const result = await this.client.query<ApiAuthSessionRow>(
      `
        INSERT INTO ${SESSIONS_TABLE} (
          id,
          user_id,
          refresh_token_id,
          access_token_id,
          is_revoked,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
        RETURNING *
      `,
      [
        randomUUID(),
        session.userId,
        session.refreshTokenId,
        session.accessTokenId,
        session.isRevoked,
        session.expiresAt
      ]
    );
    return rowToAuthSession(requireSingleSession(result.rows));
  }

  async findSessionByRefreshTokenId(refreshTokenId: string): Promise<AuthSession | undefined> {
    await this.ensureSchema();
    const result = await this.client.query<ApiAuthSessionRow>(
      `
        SELECT *
        FROM ${SESSIONS_TABLE}
        WHERE refresh_token_id = $1
        LIMIT 1
      `,
      [refreshTokenId]
    );
    const row = result.rows[0];
    return row === undefined ? undefined : rowToAuthSession(row);
  }

  async revokeSessionByRefreshTokenId(refreshTokenId: string): Promise<void> {
    await this.ensureSchema();
    const result = await this.client.query<ApiAuthSessionRow>(
      `
        UPDATE ${SESSIONS_TABLE}
        SET is_revoked = true
        WHERE refresh_token_id = $1
        RETURNING *
      `,
      [refreshTokenId]
    );

    for (const session of result.rows) {
      await this.insertRevokedToken(session.refresh_token_id);
      await this.insertRevokedToken(session.access_token_id);
    }
  }

  async revokeSessionByAccessTokenId(accessTokenId: string): Promise<void> {
    await this.ensureSchema();
    await this.insertRevokedToken(accessTokenId);
    const result = await this.client.query<ApiAuthSessionRow>(
      `
        UPDATE ${SESSIONS_TABLE}
        SET is_revoked = true
        WHERE access_token_id = $1
        RETURNING *
      `,
      [accessTokenId]
    );

    for (const session of result.rows) {
      await this.insertRevokedToken(session.refresh_token_id);
    }
  }

  async isTokenRevoked(tokenId: string): Promise<boolean> {
    await this.ensureSchema();
    const result = await this.client.query<QueryResultRow>(
      `
        SELECT token_id
        FROM ${REVOKED_TOKENS_TABLE}
        WHERE token_id = $1
        LIMIT 1
      `,
      [tokenId]
    );
    return result.rows.length > 0;
  }

  async upsertProfileAccess(record: ProfileAccessRecord): Promise<void> {
    await this.ensureSchema();
    await this.client.query(
      `
        INSERT INTO ${PROFILE_ACCESS_TABLE} (
          user_profile_id,
          organization_id,
          trainee_user_id,
          parent_user_ids,
          therapist_user_ids
        )
        VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
        ON CONFLICT (user_profile_id) DO UPDATE SET
          organization_id = EXCLUDED.organization_id,
          trainee_user_id = EXCLUDED.trainee_user_id,
          parent_user_ids = EXCLUDED.parent_user_ids,
          therapist_user_ids = EXCLUDED.therapist_user_ids,
          updated_at = now()
      `,
      [
        record.userProfileId,
        record.organizationId ?? null,
        record.traineeUserId ?? null,
        JSON.stringify(record.parentUserIds),
        JSON.stringify(record.therapistUserIds)
      ]
    );
  }

  async findProfileAccess(userProfileId: string): Promise<ProfileAccessRecord | undefined> {
    await this.ensureSchema();
    const result = await this.client.query<ApiProfileAccessRow>(
      `
        SELECT *
        FROM ${PROFILE_ACCESS_TABLE}
        WHERE user_profile_id = $1
        LIMIT 1
      `,
      [userProfileId]
    );
    const row = result.rows[0];
    return row === undefined ? undefined : rowToProfileAccess(row);
  }

  private async insertRevokedToken(tokenId: string): Promise<void> {
    await this.client.query(
      `
        INSERT INTO ${REVOKED_TOKENS_TABLE} (token_id)
        VALUES ($1)
        ON CONFLICT (token_id) DO NOTHING
      `,
      [tokenId]
    );
  }

  private async ensureSchema(): Promise<void> {
    if (!this.autoMigrate) {
      return;
    }

    this.migrationPromise ??= this.runMigration();
    await this.migrationPromise;
  }

  private async runMigration(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS ${USERS_TABLE} (
        id TEXT PRIMARY KEY,
        email TEXT,
        phone TEXT,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        roles JSONB NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'archived')),
        organization_id TEXT,
        user_profile_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (jsonb_typeof(roles) = 'array')
      )
    `);
    await this.client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_api_auth_users_email_lower ON ${USERS_TABLE} (lower(email)) WHERE email IS NOT NULL`
    );
    await this.client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_api_auth_users_phone ON ${USERS_TABLE} (phone) WHERE phone IS NOT NULL`
    );
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_auth_users_org ON ${USERS_TABLE} (organization_id)`
    );
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_auth_users_profile ON ${USERS_TABLE} (user_profile_id)`
    );
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS ${SESSIONS_TABLE} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        refresh_token_id TEXT NOT NULL UNIQUE,
        access_token_id TEXT NOT NULL UNIQUE,
        is_revoked BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_auth_sessions_user ON ${SESSIONS_TABLE} (user_id, created_at DESC)`
    );
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS ${REVOKED_TOKENS_TABLE} (
        token_id TEXT PRIMARY KEY,
        revoked_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS ${PROFILE_ACCESS_TABLE} (
        user_profile_id TEXT PRIMARY KEY,
        organization_id TEXT,
        trainee_user_id TEXT,
        parent_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        therapist_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (jsonb_typeof(parent_user_ids) = 'array'),
        CHECK (jsonb_typeof(therapist_user_ids) = 'array')
      )
    `);
    await this.client.query(
      `CREATE INDEX IF NOT EXISTS idx_api_profile_access_org ON ${PROFILE_ACCESS_TABLE} (organization_id)`
    );
  }
}

function optionalUser(rows: ApiAuthUserRow[]): UserAccount | undefined {
  const row = rows[0];
  return row === undefined ? undefined : rowToUserAccount(row);
}

function requireSingleUser(rows: ApiAuthUserRow[]): ApiAuthUserRow {
  const row = rows[0];
  if (row === undefined) {
    throw new Error("PostgreSQL did not return the created user account.");
  }
  return row;
}

function requireSingleSession(rows: ApiAuthSessionRow[]): ApiAuthSessionRow {
  const row = rows[0];
  if (row === undefined) {
    throw new Error("PostgreSQL did not return the created auth session.");
  }
  return row;
}

function rowToUserAccount(row: ApiAuthUserRow): UserAccount {
  const account: UserAccount = {
    id: row.id,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    roles: cloneJson(row.roles),
    status: row.status,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };

  if (row.email !== null) {
    account.email = row.email;
  }
  if (row.phone !== null) {
    account.phone = row.phone;
  }
  if (row.organization_id !== null) {
    account.organizationId = row.organization_id;
  }
  if (row.user_profile_id !== null) {
    account.userProfileId = row.user_profile_id;
  }
  return account;
}

function rowToAuthSession(row: ApiAuthSessionRow): AuthSession {
  return {
    id: row.id,
    userId: row.user_id,
    refreshTokenId: row.refresh_token_id,
    accessTokenId: row.access_token_id,
    isRevoked: row.is_revoked,
    createdAt: toIsoString(row.created_at),
    expiresAt: toIsoString(row.expires_at)
  };
}

function rowToProfileAccess(row: ApiProfileAccessRow): ProfileAccessRecord {
  const record: ProfileAccessRecord = {
    userProfileId: row.user_profile_id,
    parentUserIds: cloneJson(row.parent_user_ids),
    therapistUserIds: cloneJson(row.therapist_user_ids)
  };
  if (row.organization_id !== null) {
    record.organizationId = row.organization_id;
  }
  if (row.trainee_user_id !== null) {
    record.traineeUserId = row.trainee_user_id;
  }
  return record;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
