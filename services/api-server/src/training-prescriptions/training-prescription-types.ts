import type { AuthenticatedPrincipal } from "../auth/auth-types.js";

export const TRAINING_PRESCRIPTION_MODULES = [
  "music_therapy",
  "attention_game",
  "go_nogo_game",
  "rhythm_navigation"
] as const;

export const TRAINING_PRESCRIPTION_MUSIC_TYPES = [
  "focus",
  "relax",
  "rhythm",
  "nature",
  "white_noise",
  "custom"
] as const;

export const TRAINING_PRESCRIPTION_DIFFICULTIES = ["light", "standard", "advanced"] as const;

export const TRAINING_PRESCRIPTION_RISK_KEYS = [
  "signal_unstable",
  "fatigue_rising",
  "user_discomfort",
  "daily_limit",
  "photosensitive_caution"
] as const;

export type TrainingPrescriptionModule = (typeof TRAINING_PRESCRIPTION_MODULES)[number];
export type TrainingPrescriptionMusicType = (typeof TRAINING_PRESCRIPTION_MUSIC_TYPES)[number];
export type TrainingPrescriptionDifficulty = (typeof TRAINING_PRESCRIPTION_DIFFICULTIES)[number];
export type TrainingPrescriptionRiskKey = (typeof TRAINING_PRESCRIPTION_RISK_KEYS)[number];
export type TrainingPrescriptionStatus = "active" | "archived";

export interface TrainingPrescriptionDraftInput {
  userId: string;
  userProfileId: string;
  organizationId?: string;
  weeklySessionCount: number;
  sessionDurationMinutes: number;
  moduleCombination: TrainingPrescriptionModule[];
  musicType: TrainingPrescriptionMusicType;
  initialDifficulty: TrainingPrescriptionDifficulty;
  adaptiveAdjustmentEnabled: boolean;
  dailyMaxTrainingMinutes: number;
  riskReminderKeys: TrainingPrescriptionRiskKey[];
  therapistNote: string;
}

export interface TrainingPrescriptionRecord extends TrainingPrescriptionDraftInput {
  id: string;
  therapistUserId: string;
  status: TrainingPrescriptionStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingPrescriptionQuery {
  userId?: string;
  userProfileId?: string;
  organizationId?: string;
  status?: TrainingPrescriptionStatus;
  page?: number;
  pageSize?: number;
}

export interface TrainingPrescriptionListResult {
  prescriptions: TrainingPrescriptionRecord[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface TrainingPrescriptionApiRequest<
  TBody = unknown,
  TParams = Record<string, string>,
  TQuery = TrainingPrescriptionQuery
> {
  principal: AuthenticatedPrincipal;
  body: TBody;
  params: TParams;
  query: TQuery;
}

export interface TrainingPrescriptionApiResponse<TBody = unknown> {
  status: number;
  body: TBody;
}
