import { randomUUID } from "node:crypto";

import type { TrainingDataExportAuditLog } from "./training-data-export-types.js";

export interface TrainingDataExportAuditRepository {
  append(
    input: Omit<TrainingDataExportAuditLog, "id" | "requestedAt">
  ): Promise<TrainingDataExportAuditLog>;
  findMany(): Promise<TrainingDataExportAuditLog[]>;
}

/**
 * In-memory audit repository used by interface tests and early API wiring.
 * A database adapter should store these records in an append-only operation log.
 */
export class InMemoryTrainingDataExportAuditRepository implements TrainingDataExportAuditRepository {
  private readonly logs: TrainingDataExportAuditLog[] = [];

  async append(
    input: Omit<TrainingDataExportAuditLog, "id" | "requestedAt">
  ): Promise<TrainingDataExportAuditLog> {
    const record: TrainingDataExportAuditLog = {
      ...input,
      id: randomUUID(),
      requestedAt: new Date().toISOString(),
      query: clone(input.query),
      targetProfileIds: [...input.targetProfileIds]
    };
    this.logs.push(record);
    return clone(record);
  }

  async findMany(): Promise<TrainingDataExportAuditLog[]> {
    return this.logs.map(clone);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
