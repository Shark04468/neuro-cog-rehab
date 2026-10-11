import type { UserRole } from "@neuro-cog-rehab/shared-types";

import type { AuthenticatedPrincipal } from "../auth/auth-types.js";
import type { JsonObject } from "../training-records/training-record-types.js";

export const OPERATION_LOG_EVENT_TYPES = [
  "auth.login",
  "profile.view_detail",
  "training_prescription.update",
  "training_data.export",
  "report.generate",
  "record.delete",
  "record.archive",
  "permission.update",
  "training.abnormal_pause"
] as const;

export type OperationLogEventType = (typeof OPERATION_LOG_EVENT_TYPES)[number];

export type OperationTargetType =
  | "account"
  | "user_profile"
  | "training_prescription"
  | "training_record"
  | "training_session"
  | "report"
  | "data_export"
  | "permission"
  | "system";

export interface OperationLogTarget {
  /** Resource type touched by the operation. */
  targetType: OperationTargetType;
  /** Resource id when available. Avoid storing direct personal identifiers here. */
  targetId?: string;
  /** Sensitive training profile scope used for authorization and audit search. */
  targetUserProfileId?: string;
  /** Organization scope for administrator queries. */
  organizationId?: string;
}

export interface CreateOperationLogInput {
  operationType: OperationLogEventType;
  /** Actor account id. For system-triggered events, use the responsible service account id. */
  actorUserId: string;
  actorRoles: UserRole[];
  target: OperationLogTarget;
  /** ISO timestamp when the operation happened. Defaults to current time. */
  occurredAt?: string;
  /** Request IP when available from the API gateway. */
  ipAddress?: string;
  /** Device, browser, client app, or gateway information. */
  deviceInfo?: string;
  /** Minimal structured metadata. Do not include raw EEG frames or direct contact data. */
  details?: JsonObject;
}

export interface OperationLogRecord extends Required<
  Pick<CreateOperationLogInput, "operationType">
> {
  id: string;
  actorUserId: string;
  actorRoles: UserRole[];
  target: OperationLogTarget;
  occurredAt: string;
  recordedAt: string;
  ipAddress?: string;
  deviceInfo?: string;
  details?: JsonObject;
}

export interface OperationLogQuery {
  actorUserId?: string;
  operationType?: OperationLogEventType;
  targetUserProfileId?: string;
  organizationId?: string;
  occurredFrom?: string;
  occurredTo?: string;
  page?: number;
  pageSize?: number;
}

export interface OperationLogListResult {
  logs: OperationLogRecord[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface OperationLogApiRequest<
  TBody = unknown,
  TParams = Record<string, string>,
  TQuery = OperationLogQuery
> {
  principal: AuthenticatedPrincipal;
  body: TBody;
  params: TParams;
  query: TQuery;
}

export interface OperationLogApiResponse<TBody = unknown> {
  status: number;
  body: TBody;
}
