import { randomUUID } from "node:crypto";

import type {
  CreateOperationLogInput,
  OperationLogQuery,
  OperationLogRecord
} from "./operation-log-types.js";

export interface OperationLogRepository {
  append(input: CreateOperationLogInput): Promise<OperationLogRecord>;
  findMany(query: OperationLogQuery): Promise<OperationLogRecord[]>;
}

/**
 * Append-only in-memory operation log repository. It intentionally has no update
 * or delete methods; persistent adapters should keep the same append-only contract.
 */
export class InMemoryOperationLogRepository implements OperationLogRepository {
  private readonly logs: OperationLogRecord[] = [];

  async append(input: CreateOperationLogInput): Promise<OperationLogRecord> {
    const now = new Date().toISOString();
    const record: OperationLogRecord = {
      id: randomUUID(),
      operationType: input.operationType,
      actorUserId: input.actorUserId,
      actorRoles: [...input.actorRoles],
      target: clone(input.target),
      occurredAt: input.occurredAt ?? now,
      recordedAt: now
    };
    if (input.ipAddress !== undefined) {
      record.ipAddress = input.ipAddress;
    }
    if (input.deviceInfo !== undefined) {
      record.deviceInfo = input.deviceInfo;
    }
    if (input.details !== undefined) {
      record.details = clone(input.details);
    }

    this.logs.push(record);
    return clone(record);
  }

  async findMany(query: OperationLogQuery): Promise<OperationLogRecord[]> {
    const occurredFromMs = query.occurredFrom ? Date.parse(query.occurredFrom) : undefined;
    const occurredToMs = query.occurredTo ? Date.parse(query.occurredTo) : undefined;

    return this.logs
      .filter((log) => {
        const occurredAtMs = Date.parse(log.occurredAt);
        return (
          (query.actorUserId === undefined || log.actorUserId === query.actorUserId) &&
          (query.operationType === undefined || log.operationType === query.operationType) &&
          (query.targetUserProfileId === undefined ||
            log.target.targetUserProfileId === query.targetUserProfileId) &&
          (query.organizationId === undefined ||
            log.target.organizationId === query.organizationId) &&
          (occurredFromMs === undefined || occurredAtMs >= occurredFromMs) &&
          (occurredToMs === undefined || occurredAtMs <= occurredToMs)
        );
      })
      .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))
      .map(clone);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
