import type { EEGQualityStatus } from "./eeg.js";
import type { MusicTag } from "./music.js";
import type { RiskAlertSeverity } from "./reports.js";
import type { BaselineAssessment } from "./training.js";

export type TrainingPrescriptionModuleType =
  | "music_relaxation"
  | "attention_training"
  | "sustained_attention"
  | "go_no_go"
  | "stop_signal"
  | "rhythm_navigation";

export type TrainingPrescriptionGoalFocus =
  | "attention_stability"
  | "inhibition_control"
  | "working_memory"
  | "rhythm_sync"
  | "fatigue_management"
  | "emotional_regulation";

export type TrainingPrescriptionTrend =
  | "improving"
  | "stable"
  | "declining"
  | "rising"
  | "decreasing"
  | "unknown";

export type TrainingPrescriptionUserFeedback =
  | "comfortable"
  | "neutral"
  | "tired"
  | "resistant"
  | "uncomfortable";

export interface TrainingModuleWeeklySummary {
  moduleType: TrainingPrescriptionModuleType;
  completedSessionCount: number;
  averageAccuracyRate?: number;
  omissionRate?: number;
  commissionRate?: number;
}

export interface RecentWeeklyTrainingSummary {
  plannedSessionCount: number;
  completedSessionCount: number;
  averageAccuracyRate?: number;
  omissionRate?: number;
  commissionRate?: number;
  averageReactionTimeMs?: number;
  reactionTimeVariabilityMs?: number;
  averageCompletionRate?: number;
  averageDurationMinutes?: number;
  abnormalEventCount?: number;
  userDiscomfortCount?: number;
  moduleSummaries?: TrainingModuleWeeklySummary[];
}

export interface TrainingPrescriptionEegTrend {
  attentionTrend: Extract<
    TrainingPrescriptionTrend,
    "improving" | "stable" | "declining" | "unknown"
  >;
  fatigueTrend: Extract<TrainingPrescriptionTrend, "rising" | "stable" | "decreasing" | "unknown">;
  averageAttentionIndex?: number;
  averageFatigueIndex?: number;
  signalQualityStatus: EEGQualityStatus;
  validSampleRate?: number;
}

export interface TherapistTrainingGoalSetting {
  focusAreas: TrainingPrescriptionGoalFocus[];
  preferredModules?: TrainingPrescriptionModuleType[];
  minWeeklyFrequency?: number;
  maxWeeklyFrequency?: number;
  maxSessionDurationMinutes?: number;
  notes?: string;
}

export interface UserComplianceSummary {
  plannedSessionCount: number;
  completedSessionCount: number;
  completionRate: number;
  averageCompletionRate?: number;
  missedSessionCount?: number;
  userFeedback?: TrainingPrescriptionUserFeedback;
  notes?: string;
}

export interface TrainingPrescriptionGenerationInput {
  userId: string;
  baselineAssessment: BaselineAssessment;
  recentWeekTraining: RecentWeeklyTrainingSummary;
  eegTrend: TrainingPrescriptionEegTrend;
  therapistGoals: TherapistTrainingGoalSetting;
  compliance: UserComplianceSummary;
  generatedAt?: string;
}

export interface WeeklyTrainingFrequencySuggestion {
  sessionsPerWeek: number;
  explanation: string;
}

export interface TrainingModuleCombinationItem {
  moduleType: TrainingPrescriptionModuleType;
  displayName: string;
  priority: number;
  recommendedMinutes: number;
  difficultyStartLevel: number;
  targetFocus: TrainingPrescriptionGoalFocus[];
  explanation: string;
}

export interface MusicTherapyPrescriptionSuggestion {
  recommended: boolean;
  preferredTags: MusicTag[];
  timing: "before_training" | "between_modules" | "after_training" | "pause_recovery";
  intensityLevel: 1 | 2 | 3;
  explanation: string;
}

export interface TrainingPrescriptionRiskReminder {
  category: "training_load" | "data_quality" | "comfort" | "engagement";
  severity: RiskAlertSeverity;
  message: string;
  suggestedAction: string;
}

export interface GeneratedTrainingPrescription {
  userId: string;
  generatedAt: string;
  weeklyTrainingFrequency: WeeklyTrainingFrequencySuggestion;
  sessionDurationMinutes: number;
  recommendedModuleCombination: TrainingModuleCombinationItem[];
  musicTherapySuggestion: MusicTherapyPrescriptionSuggestion;
  gameDifficultyStartLevel: number;
  riskReminders: TrainingPrescriptionRiskReminder[];
  nextWeekAdjustmentSuggestions: string[];
  explanation: string;
  scopeNotice: string;
}
