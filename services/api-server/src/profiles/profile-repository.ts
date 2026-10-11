import { randomUUID } from "node:crypto";

import type {
  CreateUserProfileInput,
  TrainingUserProfileRecord,
  UpdateUserProfileInput,
  UserProfileQuery
} from "./profile-types.js";

export interface UserProfileRepository {
  create(
    input: CreateUserProfileInput & { traineeUserId: string; createdByUserId: string }
  ): Promise<TrainingUserProfileRecord>;
  findMany(query: UserProfileQuery): Promise<TrainingUserProfileRecord[]>;
  findById(profileId: string): Promise<TrainingUserProfileRecord | undefined>;
  update(
    profileId: string,
    input: UpdateUserProfileInput
  ): Promise<TrainingUserProfileRecord | undefined>;
  archive(
    profileId: string,
    archivedByUserId: string
  ): Promise<TrainingUserProfileRecord | undefined>;
}

/**
 * In-memory profile repository used by interface tests and early API wiring.
 * A PostgreSQL adapter can later implement the same repository contract.
 */
export class InMemoryUserProfileRepository implements UserProfileRepository {
  private readonly profiles = new Map<string, TrainingUserProfileRecord>();

  async create(
    input: CreateUserProfileInput & { traineeUserId: string; createdByUserId: string }
  ): Promise<TrainingUserProfileRecord> {
    const now = new Date().toISOString();
    const record: TrainingUserProfileRecord = {
      id: randomUUID(),
      traineeUserId: input.traineeUserId,
      basicInfo: clone(input.basicInfo),
      trainingInfo: clone(input.trainingInfo),
      riskScreening: clone(input.riskScreening),
      deviceInfo: clone(input.deviceInfo),
      status: "active",
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now
    };
    if (input.organizationId !== undefined) {
      record.organizationId = input.organizationId;
    }
    if (input.therapistNotes !== undefined) {
      record.therapistNotes = input.therapistNotes;
    }

    this.profiles.set(record.id, record);
    return clone(record);
  }

  async findMany(query: UserProfileQuery): Promise<TrainingUserProfileRecord[]> {
    return [...this.profiles.values()]
      .filter(
        (record) =>
          (query.traineeUserId === undefined || record.traineeUserId === query.traineeUserId) &&
          (query.organizationId === undefined || record.organizationId === query.organizationId) &&
          (query.status === undefined || record.status === query.status)
      )
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .map(clone);
  }

  async findById(profileId: string): Promise<TrainingUserProfileRecord | undefined> {
    const record = this.profiles.get(profileId);
    return record ? clone(record) : undefined;
  }

  async update(
    profileId: string,
    input: UpdateUserProfileInput
  ): Promise<TrainingUserProfileRecord | undefined> {
    const current = this.profiles.get(profileId);
    if (!current) {
      return undefined;
    }

    const next: TrainingUserProfileRecord = {
      ...current,
      basicInfo: { ...current.basicInfo, ...input.basicInfo },
      trainingInfo: { ...current.trainingInfo, ...input.trainingInfo },
      riskScreening: { ...current.riskScreening, ...input.riskScreening },
      deviceInfo: { ...current.deviceInfo, ...input.deviceInfo },
      updatedAt: new Date().toISOString()
    };
    if (input.therapistNotes !== undefined) {
      next.therapistNotes = input.therapistNotes;
    }

    this.profiles.set(profileId, next);
    return clone(next);
  }

  async archive(
    profileId: string,
    archivedByUserId: string
  ): Promise<TrainingUserProfileRecord | undefined> {
    const current = this.profiles.get(profileId);
    if (!current) {
      return undefined;
    }

    const now = new Date().toISOString();
    const next: TrainingUserProfileRecord = {
      ...current,
      status: "archived",
      archivedByUserId,
      archivedAt: now,
      updatedAt: now
    };
    this.profiles.set(profileId, next);
    return clone(next);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
