import { createHash, randomUUID } from "node:crypto";

import { AuthModuleError, requireCondition } from "../auth/auth-errors.js";
import type { AuthenticatedPrincipal } from "../auth/auth-types.js";
import type {
  AccessControlService,
  AccessTarget
} from "../access-control/access-control-service.js";
import type { UserProfileRepository } from "../profiles/profile-repository.js";
import type { ProfileAgeBand, TrainingUserProfileRecord } from "../profiles/profile-types.js";
import type { TrainingRecordRepository } from "../training-records/training-record-repository.js";
import type {
  BehaviorMetrics,
  DifficultyConfigSnapshot,
  JsonObject,
  JsonValue,
  TrainingRecord
} from "../training-records/training-record-types.js";
import type { TrainingDataExportAuditRepository } from "./training-data-export-audit-repository.js";
import type {
  DeidentifiedTrainingExportRow,
  TrainingDataExportQuery,
  TrainingDataExportResult
} from "./training-data-export-types.js";

const DEFAULT_EXPORT_REASON = "training_data_deidentified_export";
const DEFAULT_EXPORT_SALT = "local-development-export-salt";
const MAX_EXPORT_ROWS = 10_000;
const BLOCKED_EXPORT_FIELD_PATTERNS = [
  /name/i,
  /phone/i,
  /email/i,
  /contact/i,
  /address/i,
  /user.?id/i,
  /profile.?id/i,
  /raw.?eeg/i,
  /eeg.?raw/i,
  /raw.?signal/i
];

export interface TrainingDataExportServiceDependencies {
  trainingRecordRepository: TrainingRecordRepository;
  userProfileRepository: UserProfileRepository;
  accessControl: AccessControlService;
  auditRepository: TrainingDataExportAuditRepository;
  anonymizationSalt?: string;
}

/**
 * Builds deidentified training exports for trend analysis and authorized review.
 * The service never exports names, contact fields, profile ids, user ids, or raw EEG frames.
 */
export class TrainingDataExportService {
  private readonly anonymizationSalt: string;

  constructor(private readonly dependencies: TrainingDataExportServiceDependencies) {
    this.anonymizationSalt = dependencies.anonymizationSalt ?? DEFAULT_EXPORT_SALT;
  }

  async exportDeidentifiedTrainingData(
    principal: AuthenticatedPrincipal,
    query: TrainingDataExportQuery
  ): Promise<TrainingDataExportResult> {
    try {
      this.validateQuery(query);
      this.dependencies.accessControl.assertPermission(principal, "training:data:export");

      const records = await this.dependencies.trainingRecordRepository.findMany(query);
      const visibleRecords = await this.filterVisibleRecords(principal, records);
      const targetProfileIds = unique(visibleRecords.map((record) => record.userProfileId));
      const trainingCounts = countByProfile(visibleRecords);
      const profileCache = new Map<string, TrainingUserProfileRecord | null>();
      const rows: DeidentifiedTrainingExportRow[] = [];
      const warnings = [
        "Export contains deidentified training summaries only; raw EEG frames are not included."
      ];

      for (const record of visibleRecords.slice(0, MAX_EXPORT_ROWS)) {
        const profile = await this.findProfile(record.userProfileId, profileCache);
        rows.push(this.toExportRow(record, profile?.basicInfo.ageBand ?? "other", trainingCounts));
      }

      if (visibleRecords.length > MAX_EXPORT_ROWS) {
        warnings.push(`Export was capped at ${MAX_EXPORT_ROWS} rows.`);
      }

      const result: TrainingDataExportResult = {
        exportId: randomUUID(),
        generatedAt: new Date().toISOString(),
        rowCount: rows.length,
        rows,
        warnings
      };

      await this.dependencies.auditRepository.append({
        actorUserId: principal.userId,
        actorRoles: [...principal.roles],
        status: "success",
        reason: query.reason ?? DEFAULT_EXPORT_REASON,
        query,
        exportedRowCount: result.rowCount,
        targetProfileIds
      });

      return result;
    } catch (error) {
      await this.auditDeniedAttempt(principal, query, error);
      throw error;
    }
  }

  private async filterVisibleRecords(
    principal: AuthenticatedPrincipal,
    records: TrainingRecord[]
  ): Promise<TrainingRecord[]> {
    const visibleRecords: TrainingRecord[] = [];
    for (const record of records) {
      const target: AccessTarget = {
        userProfileId: record.userProfileId
      };
      if (record.organizationId !== undefined) {
        target.organizationId = record.organizationId;
      }

      const decision = await this.dependencies.accessControl.canAccessProfile(principal, target);
      if (decision.allowed) {
        visibleRecords.push(record);
      }
    }
    return visibleRecords;
  }

  private async findProfile(
    profileId: string,
    cache: Map<string, TrainingUserProfileRecord | null>
  ): Promise<TrainingUserProfileRecord | null> {
    if (cache.has(profileId)) {
      return cache.get(profileId) ?? null;
    }

    const profile = (await this.dependencies.userProfileRepository.findById(profileId)) ?? null;
    cache.set(profileId, profile);
    return profile;
  }

  private toExportRow(
    record: TrainingRecord,
    ageBand: ProfileAgeBand,
    trainingCounts: Map<string, number>
  ): DeidentifiedTrainingExportRow {
    return {
      anonymousUserId: this.anonymizeProfileId(record.userProfileId),
      ageBand,
      trainingCount: trainingCounts.get(record.userProfileId) ?? 0,
      behaviorMetrics: sanitizeBehaviorMetrics(record.behaviorMetrics),
      eegSummaryMetrics: clone(record.eegSummaryMetrics),
      musicTags: extractMusicTags(record.behaviorMetrics.customMetrics),
      gameDifficulty: sanitizeDifficultyConfig(record.difficultyConfig),
      timestamp: record.startedAt
    };
  }

  private anonymizeProfileId(profileId: string): string {
    const digest = createHash("sha256")
      .update(`${this.anonymizationSalt}:${profileId}`)
      .digest("hex")
      .slice(0, 24);
    return `anon_${digest}`;
  }

  private validateQuery(query: TrainingDataExportQuery): void {
    if (query.startedFrom !== undefined) {
      requireCondition(
        isValidIsoDate(query.startedFrom),
        "VALIDATION_ERROR",
        "Export date range start is invalid."
      );
    }
    if (query.startedTo !== undefined) {
      requireCondition(
        isValidIsoDate(query.startedTo),
        "VALIDATION_ERROR",
        "Export date range end is invalid."
      );
    }
    if (query.startedFrom !== undefined && query.startedTo !== undefined) {
      requireCondition(
        Date.parse(query.startedTo) >= Date.parse(query.startedFrom),
        "VALIDATION_ERROR",
        "Export date range end cannot be earlier than start."
      );
    }
    if (query.reason !== undefined) {
      requireCondition(
        query.reason.trim().length <= 200,
        "VALIDATION_ERROR",
        "Export reason is too long."
      );
    }
  }

  private async auditDeniedAttempt(
    principal: AuthenticatedPrincipal,
    query: TrainingDataExportQuery,
    error: unknown
  ): Promise<void> {
    if (!(error instanceof AuthModuleError)) {
      return;
    }

    await this.dependencies.auditRepository.append({
      actorUserId: principal.userId,
      actorRoles: [...principal.roles],
      status: "denied",
      reason: query.reason ?? DEFAULT_EXPORT_REASON,
      query,
      exportedRowCount: 0,
      targetProfileIds: query.userProfileId ? [query.userProfileId] : [],
      denialCode: error.appError.code,
      denialMessage: error.appError.message
    });
  }
}

function extractMusicTags(customMetrics: JsonObject | undefined): string[] {
  if (customMetrics === undefined) {
    return [];
  }

  const musicTags = customMetrics.musicTags ?? customMetrics.musicTag;
  if (Array.isArray(musicTags)) {
    return musicTags.filter(isNonEmptyString);
  }
  if (isNonEmptyString(musicTags)) {
    return [musicTags];
  }
  return [];
}

function sanitizeBehaviorMetrics(metrics: BehaviorMetrics): BehaviorMetrics {
  const sanitized: BehaviorMetrics = {};
  if (metrics.totalTrials !== undefined) {
    sanitized.totalTrials = metrics.totalTrials;
  }
  if (metrics.correctCount !== undefined) {
    sanitized.correctCount = metrics.correctCount;
  }
  if (metrics.accuracyRate !== undefined) {
    sanitized.accuracyRate = metrics.accuracyRate;
  }
  if (metrics.averageReactionTimeMs !== undefined) {
    sanitized.averageReactionTimeMs = metrics.averageReactionTimeMs;
  }
  if (metrics.omissionCount !== undefined) {
    sanitized.omissionCount = metrics.omissionCount;
  }
  if (metrics.falseAlarmCount !== undefined) {
    sanitized.falseAlarmCount = metrics.falseAlarmCount;
  }

  const customMetrics = sanitizeJsonObject(metrics.customMetrics);
  if (customMetrics !== undefined) {
    sanitized.customMetrics = customMetrics;
  }
  return sanitized;
}

function sanitizeDifficultyConfig(config: DifficultyConfigSnapshot): DifficultyConfigSnapshot {
  const sanitized: DifficultyConfigSnapshot = {
    initialLevel: config.initialLevel,
    finalLevel: config.finalLevel,
    adaptiveEnabled: config.adaptiveEnabled
  };
  const parameters = sanitizeJsonObject(config.parameters);
  if (parameters !== undefined) {
    sanitized.parameters = parameters;
  }
  return sanitized;
}

function sanitizeJsonObject(value: JsonObject | undefined): JsonObject | undefined {
  if (value === undefined) {
    return undefined;
  }

  const sanitized: JsonObject = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (isBlockedExportField(key)) {
      continue;
    }
    const safeValue = sanitizeJsonValue(nestedValue);
    if (safeValue !== undefined) {
      sanitized[key] = safeValue;
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizeJsonValue(value: JsonValue): JsonValue | undefined {
  if (Array.isArray(value)) {
    const sanitizedArray = value
      .map((item) => sanitizeJsonValue(item))
      .filter((item): item is JsonValue => item !== undefined);
    return sanitizedArray;
  }
  if (typeof value === "object" && value !== null) {
    return sanitizeJsonObject(value);
  }
  return value;
}

function isBlockedExportField(key: string): boolean {
  return BLOCKED_EXPORT_FIELD_PATTERNS.some((pattern) => pattern.test(key));
}

function isNonEmptyString(value: JsonValue | unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function countByProfile(records: TrainingRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const record of records) {
    counts.set(record.userProfileId, (counts.get(record.userProfileId) ?? 0) + 1);
  }
  return counts;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function isValidIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
