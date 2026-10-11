import type { TrainingType } from "./training.js";

/**
 * Risk category used for safety, data quality, and training-flow alerts.
 */
export type RiskAlertCategory =
  | "data_quality"
  | "training_load"
  | "comfort"
  | "engagement"
  | "privacy";

/**
 * Severity level for non-diagnostic risk alerts.
 */
export type RiskAlertSeverity = "info" | "watch" | "action_required";

/**
 * Non-diagnostic alert generated from training flow, data quality, or privacy checks.
 */
export interface RiskAlert {
  /** Stable alert identifier. */
  id: string;
  /** Training user id associated with this alert. */
  userId: string;
  /** Optional training session id associated with this alert. */
  sessionId?: string;
  /** Alert category. */
  category: RiskAlertCategory;
  /** Alert severity. */
  severity: RiskAlertSeverity;
  /** Human-readable alert message without medical conclusions. */
  message: string;
  /** Suggested next operational action, such as reviewing data quality. */
  recommendedAction: string;
  /** ISO timestamp when the alert was created. */
  createdAt: string;
  /** ISO timestamp when the alert was acknowledged. */
  acknowledgedAt?: string;
}

/**
 * Summary metrics for one training type inside a report period.
 */
export interface TrainingReportMetricSummary {
  /** Training type represented by this summary. */
  trainingType: TrainingType;
  /** Number of completed sessions for this training type. */
  completedSessionCount: number;
  /** Average completion rate normalized from 0 to 1. */
  averageCompletionRate: number;
  /** Average accuracy rate normalized from 0 to 1, when applicable. */
  averageAccuracyRate?: number;
  /** Average reaction time in milliseconds, when applicable. */
  averageReactionTimeMs?: number;
  /** Short trend label for display, such as stable or improving. */
  trendLabel: "not_enough_data" | "stable" | "improving" | "needs_attention";
}

/**
 * Stage training report for therapist and authorized guardian review.
 */
export interface TrainingReport {
  /** Stable report identifier. */
  id: string;
  /** Training user id covered by the report. */
  userId: string;
  /** Optional therapist user id that generated or reviewed the report. */
  therapistUserId?: string;
  /** ISO date or timestamp for the report period start. */
  periodStart: string;
  /** ISO date or timestamp for the report period end. */
  periodEnd: string;
  /** ISO timestamp when the report was generated. */
  generatedAt: string;
  /** Number of sessions in the report period. */
  sessionCount: number;
  /** Number of completed sessions in the report period. */
  completedSessionCount: number;
  /** Average completion rate normalized from 0 to 1. */
  averageCompletionRate: number;
  /** Per-training-type metric summaries. */
  metricSummaries: TrainingReportMetricSummary[];
  /** Non-diagnostic alerts that need review. */
  riskAlerts: RiskAlert[];
  /** Plain-language summary of training records and trends only. */
  narrativeSummary: string;
  /** Suggested training focus areas, not clinical treatment advice. */
  nextTrainingFocus: string[];
  /** Required privacy and scope notice shown with report data. */
  dataScopeNotice: string;
}
