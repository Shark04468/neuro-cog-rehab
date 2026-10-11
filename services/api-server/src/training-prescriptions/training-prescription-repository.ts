import { randomUUID } from "node:crypto";

import type {
  TrainingPrescriptionDraftInput,
  TrainingPrescriptionQuery,
  TrainingPrescriptionRecord
} from "./training-prescription-types.js";

export interface TrainingPrescriptionRepository {
  upsertActive(
    input: TrainingPrescriptionDraftInput & { therapistUserId: string }
  ): Promise<TrainingPrescriptionRecord>;
  findActiveByUserProfileId(userProfileId: string): Promise<TrainingPrescriptionRecord | undefined>;
  findById(id: string): Promise<TrainingPrescriptionRecord | undefined>;
  findMany(query: TrainingPrescriptionQuery): Promise<TrainingPrescriptionRecord[]>;
}

export class InMemoryTrainingPrescriptionRepository implements TrainingPrescriptionRepository {
  private readonly prescriptions = new Map<string, TrainingPrescriptionRecord>();

  async upsertActive(
    input: TrainingPrescriptionDraftInput & { therapistUserId: string }
  ): Promise<TrainingPrescriptionRecord> {
    const current = [...this.prescriptions.values()].find(
      (prescription) =>
        prescription.userProfileId === input.userProfileId && prescription.status === "active"
    );
    const now = new Date().toISOString();
    const record: TrainingPrescriptionRecord = {
      ...input,
      id: current?.id ?? randomUUID(),
      status: "active",
      version: (current?.version ?? 0) + 1,
      createdAt: current?.createdAt ?? now,
      updatedAt: now
    };
    this.prescriptions.set(record.id, clone(record));
    return clone(record);
  }

  async findActiveByUserProfileId(
    userProfileId: string
  ): Promise<TrainingPrescriptionRecord | undefined> {
    const record = [...this.prescriptions.values()].find(
      (prescription) =>
        prescription.userProfileId === userProfileId && prescription.status === "active"
    );
    return record === undefined ? undefined : clone(record);
  }

  async findById(id: string): Promise<TrainingPrescriptionRecord | undefined> {
    const record = this.prescriptions.get(id);
    return record === undefined ? undefined : clone(record);
  }

  async findMany(query: TrainingPrescriptionQuery): Promise<TrainingPrescriptionRecord[]> {
    return [...this.prescriptions.values()]
      .filter(
        (prescription) =>
          (query.userId === undefined || prescription.userId === query.userId) &&
          (query.userProfileId === undefined ||
            prescription.userProfileId === query.userProfileId) &&
          (query.organizationId === undefined ||
            prescription.organizationId === query.organizationId) &&
          (query.status === undefined || prescription.status === query.status)
      )
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
      .map(clone);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
