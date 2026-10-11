import type {
  GeneratedTrainingPrescription,
  TrainingPrescriptionGenerationInput,
  TrainingPrescriptionModuleType
} from "@neuro-cog-rehab/shared-types";

export type { GeneratedTrainingPrescription, TrainingPrescriptionGenerationInput };

export interface TrainingPrescriptionRuleConfig {
  initialCompletedSessionThreshold: number;
  initialFrequencyPerWeek: number;
  standardFrequencyPerWeek: number;
  reducedFrequencyPerWeek: number;
  initialMaxSessionDurationMinutes: number;
  standardSessionDurationMinutes: number;
  minimumSessionDurationMinutes: number;
  maximumSessionDurationMinutes: number;
  fatigueSelfRatingAtOrAbove: number;
  eegFatigueConcernAtOrAbove: number;
  lowValidSampleRateAtOrBelow: number;
  highCommissionRateAtOrAbove: number;
  highOmissionRateAtOrAbove: number;
  highReactionVariabilityMsAtOrAbove: number;
  lowComplianceRateAtOrBelow: number;
  lowCompletionRateAtOrBelow: number;
  defaultDifficultyStartLevel: number;
  reducedDifficultyStartLevel: number;
  elevatedDifficultyStartLevel: number;
  moduleLimit: number;
  moduleBaseMinutes: Record<TrainingPrescriptionModuleType, number>;
}

export type TrainingPrescriptionRuleConfigOverrides = Partial<
  Omit<TrainingPrescriptionRuleConfig, "moduleBaseMinutes">
> & {
  moduleBaseMinutes?: Partial<Record<TrainingPrescriptionModuleType, number>>;
};
