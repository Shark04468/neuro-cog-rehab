import type { AuthenticatedPrincipal } from "../auth/auth-types.js";
import type {
  BehaviorMetrics,
  DifficultyConfigSnapshot,
  EegSummaryMetrics,
  TrainingRecordQuery
} from "../training-records/training-record-types.js";
import type { ProfileAgeBand } from "../profiles/profile-types.js";

export interface TrainingDataExportQuery extends TrainingRecordQuery {
  /** Optional export reason stored in the audit log, never included in exported rows. */
  reason?: string;
}

export interface DeidentifiedTrainingExportRow {
  /** Stable anonymous id derived from profile id and export salt. */
  anonymousUserId: string;
  /** Age band only; exact age and birth date are not exported. */
  ageBand: ProfileAgeBand;
  /** Number of training records for this anonymous user in the export window. */
  trainingCount: number;
  /** Whitelisted behavior metrics from the saved training summary. */
  behaviorMetrics: BehaviorMetrics;
  /** EEG summary only. Raw EEG frames are never exported by this API. */
  eegSummaryMetrics: EegSummaryMetrics;
  /** Music tags captured by the training module, when available. */
  musicTags: string[];
  /** Difficulty snapshot for the exported game or mixed training record. */
  gameDifficulty: DifficultyConfigSnapshot;
  /** Training record start timestamp. */
  timestamp: string;
}

export interface TrainingDataExportResult {
  exportId: string;
  generatedAt: string;
  rowCount: number;
  rows: DeidentifiedTrainingExportRow[];
  warnings: string[];
}

export type ExportAuditStatus = "success" | "denied";

export interface TrainingDataExportAuditLog {
  id: string;
  actorUserId: string;
  actorRoles: string[];
  status: ExportAuditStatus;
  reason: string;
  requestedAt: string;
  query: TrainingDataExportQuery;
  exportedRowCount: number;
  targetProfileIds: string[];
  denialCode?: string;
  denialMessage?: string;
}

export interface TrainingDataExportApiRequest<
  TBody = unknown,
  TParams = Record<string, string>,
  TQuery = TrainingDataExportQuery
> {
  principal: AuthenticatedPrincipal;
  body: TBody;
  params: TParams;
  query: TQuery;
}

export interface TrainingDataExportApiResponse<TBody = unknown> {
  status: number;
  body: TBody;
}
