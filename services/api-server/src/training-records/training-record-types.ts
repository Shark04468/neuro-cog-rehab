import type { AuthenticatedPrincipal } from "../auth/auth-types.js";

export const TRAINING_RECORD_TYPES = [
  "baseline_assessment",
  "music_therapy",
  "attention_game",
  "go_nogo_game",
  "rhythm_navigation",
  "mixed_session"
] as const;

export type TrainingRecordType = (typeof TRAINING_RECORD_TYPES)[number];

export type TrainingCompletionStatus = "completed" | "partial" | "abandoned" | "interrupted";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export interface BehaviorMetrics {
  /** Total prompted items or trials when the training type is trial-based. */
  totalTrials?: number;
  /** Correct responses or completed actions. */
  correctCount?: number;
  /** Accuracy normalized from 0 to 1 when applicable. */
  accuracyRate?: number;
  /** Average response time in milliseconds when applicable. */
  averageReactionTimeMs?: number;
  /** Missed prompts or omitted responses. */
  omissionCount?: number;
  /** Incorrect responses to stop/no-go prompts. */
  falseAlarmCount?: number;
  /** Additional module-specific behavior metrics. */
  customMetrics?: JsonObject;
}

export interface EegSummaryMetrics {
  /** Average attention reference index, normalized by the EEG gateway. */
  averageAttentionIndex?: number;
  /** Average relaxation reference index, normalized by the EEG gateway. */
  averageRelaxationIndex?: number;
  /** Valid EEG frame rate normalized from 0 to 1. */
  validSampleRate?: number;
  /** Number of EEG frames marked as artifacts. */
  artifactCount?: number;
  /** Total EEG feature frames summarized for this record. */
  frameCount?: number;
  /** Optional data quality label for state-reference review. */
  qualityStatus?: "good" | "unstable" | "noisy" | "disconnected";
}

export interface DifficultyConfigSnapshot {
  /** Difficulty level at training start. */
  initialLevel: number;
  /** Difficulty level at training end. */
  finalLevel: number;
  /** Whether bounded adaptive difficulty was enabled. */
  adaptiveEnabled: boolean;
  /** Optional module-specific difficulty parameters. */
  parameters?: JsonObject;
}

export interface TrainingAbnormalEvent {
  /** Non-diagnostic event code used for training review and safety prompts. */
  eventType:
    | "pause"
    | "early_stop"
    | "device_disconnect"
    | "low_signal_quality"
    | "user_discomfort"
    | "other";
  /** ISO timestamp when the event occurred. */
  occurredAt: string;
  /** Severity for operational review, not clinical classification. */
  severity: "info" | "warning" | "critical";
  /** Human-readable event note. */
  message: string;
  /** Optional structured event details. */
  details?: JsonObject;
}

export interface TrainingRecord {
  id: string;
  /** Trainee account id required by the training record API. */
  userId: string;
  /** Training profile id used for sensitive data-scope authorization. */
  userProfileId: string;
  organizationId?: string;
  trainingType: TrainingRecordType;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  behaviorMetrics: BehaviorMetrics;
  eegSummaryMetrics: EegSummaryMetrics;
  difficultyConfig: DifficultyConfigSnapshot;
  abnormalEvents: TrainingAbnormalEvent[];
  completionStatus: TrainingCompletionStatus;
  createdByUserId: string;
  createdAt: string;
}

export interface CreateTrainingRecordInput {
  userId: string;
  userProfileId: string;
  organizationId?: string;
  trainingType: TrainingRecordType;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  behaviorMetrics: BehaviorMetrics;
  eegSummaryMetrics: EegSummaryMetrics;
  difficultyConfig: DifficultyConfigSnapshot;
  abnormalEvents: TrainingAbnormalEvent[];
  completionStatus: TrainingCompletionStatus;
}

export interface TrainingRecordQuery {
  /** Optional trainee account id filter. */
  userId?: string;
  /** Optional training profile id filter. */
  userProfileId?: string;
  /** Inclusive ISO timestamp lower bound for training start time. */
  startedFrom?: string;
  /** Inclusive ISO timestamp upper bound for training start time. */
  startedTo?: string;
  /** One-based page number. */
  page?: number;
  /** Page size capped by the service. */
  pageSize?: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface TrainingRecordListResult {
  records: TrainingRecord[];
  pagination: PaginationMeta;
}

export interface TrainingRecordApiRequest<
  TBody = unknown,
  TParams = Record<string, string>,
  TQuery = TrainingRecordQuery
> {
  principal: AuthenticatedPrincipal;
  body: TBody;
  params: TParams;
  query: TQuery;
}

export interface TrainingRecordApiResponse<TBody = unknown> {
  status: number;
  body: TBody;
}
