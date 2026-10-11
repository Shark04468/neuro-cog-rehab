import { randomUUID } from "node:crypto";

import type {
  CreateTrainingRecordInput,
  TrainingRecord,
  TrainingRecordQuery
} from "./training-record-types.js";

export interface TrainingRecordRepository {
  create(input: CreateTrainingRecordInput & { createdByUserId: string }): Promise<TrainingRecord>;
  findMany(query: TrainingRecordQuery): Promise<TrainingRecord[]>;
}

/**
 * In-memory training record repository for API tests and early wiring. A future
 * PostgreSQL adapter should apply the same filters before pagination.
 */
export class InMemoryTrainingRecordRepository implements TrainingRecordRepository {
  private readonly records = new Map<string, TrainingRecord>();

  async create(
    input: CreateTrainingRecordInput & { createdByUserId: string }
  ): Promise<TrainingRecord> {
    const now = new Date().toISOString();
    const record: TrainingRecord = {
      id: randomUUID(),
      userId: input.userId,
      userProfileId: input.userProfileId,
      trainingType: input.trainingType,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationSeconds: input.durationSeconds,
      behaviorMetrics: clone(input.behaviorMetrics),
      eegSummaryMetrics: clone(input.eegSummaryMetrics),
      difficultyConfig: clone(input.difficultyConfig),
      abnormalEvents: clone(input.abnormalEvents),
      completionStatus: input.completionStatus,
      createdByUserId: input.createdByUserId,
      createdAt: now
    };
    if (input.organizationId !== undefined) {
      record.organizationId = input.organizationId;
    }

    this.records.set(record.id, record);
    return clone(record);
  }

  async findMany(query: TrainingRecordQuery): Promise<TrainingRecord[]> {
    const startedFromMs = query.startedFrom ? Date.parse(query.startedFrom) : undefined;
    const startedToMs = query.startedTo ? Date.parse(query.startedTo) : undefined;

    return [...this.records.values()]
      .filter((record) => {
        const startedAtMs = Date.parse(record.startedAt);
        return (
          (query.userId === undefined || record.userId === query.userId) &&
          (query.userProfileId === undefined || record.userProfileId === query.userProfileId) &&
          (startedFromMs === undefined || startedAtMs >= startedFromMs) &&
          (startedToMs === undefined || startedAtMs <= startedToMs)
        );
      })
      .sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt))
      .map(clone);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
