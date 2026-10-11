import { describe, expect, it } from "vitest";

import { generateTrainingPrescription, TrainingPrescriptionGeneratorError } from "../src/index.js";
import type { TrainingPrescriptionGenerationInput } from "../src/index.js";

const baseInput: TrainingPrescriptionGenerationInput = {
  userId: "trainee-001",
  baselineAssessment: {
    id: "baseline-001",
    userId: "trainee-001",
    createdAt: "2026-06-15T00:00:00.000Z",
    focusSelfRating: 3,
    fatigueSelfRating: 2,
    moodSelfRating: 4,
    environmentNoiseRating: 2,
    readinessConfirmed: true
  },
  recentWeekTraining: {
    plannedSessionCount: 4,
    completedSessionCount: 4,
    averageAccuracyRate: 0.82,
    omissionRate: 0.08,
    commissionRate: 0.07,
    averageReactionTimeMs: 680,
    reactionTimeVariabilityMs: 180,
    averageCompletionRate: 0.9,
    averageDurationMinutes: 18
  },
  eegTrend: {
    attentionTrend: "stable",
    fatigueTrend: "stable",
    averageAttentionIndex: 62,
    averageFatigueIndex: 42,
    signalQualityStatus: "good",
    validSampleRate: 0.9
  },
  therapistGoals: {
    focusAreas: ["attention_stability"],
    maxWeeklyFrequency: 5,
    maxSessionDurationMinutes: 25
  },
  compliance: {
    plannedSessionCount: 4,
    completedSessionCount: 4,
    completionRate: 1,
    averageCompletionRate: 0.9,
    userFeedback: "comfortable"
  },
  generatedAt: "2026-06-15T00:00:00.000Z"
};

describe("training prescription generator", () => {
  it("generates a standard weekly plan when recent training is stable", () => {
    const prescription = generateTrainingPrescription(baseInput);
    const moduleTypes = prescription.recommendedModuleCombination.map(
      (module) => module.moduleType
    );

    expect(prescription.weeklyTrainingFrequency.sessionsPerWeek).toBe(4);
    expect(prescription.sessionDurationMinutes).toBe(22);
    expect(prescription.gameDifficultyStartLevel).toBe(3);
    expect(moduleTypes).toEqual(["attention_training", "sustained_attention"]);
    expect(prescription.musicTherapySuggestion.preferredTags).toEqual(["focus", "relax"]);
    expect(prescription.riskReminders).toEqual([]);
  });

  it("keeps initial training short and uses auxiliary recommendation wording", () => {
    const prescription = generateTrainingPrescription({
      ...baseInput,
      recentWeekTraining: {
        ...baseInput.recentWeekTraining,
        completedSessionCount: 1
      }
    });

    expect(prescription.weeklyTrainingFrequency.sessionsPerWeek).toBe(3);
    expect(prescription.sessionDurationMinutes).toBeLessThanOrEqual(15);
    expect(prescription.gameDifficultyStartLevel).toBe(1);
    expect(prescription.explanation).toContain("初期训练阶段");
    expect(JSON.stringify(prescription).toLowerCase()).not.toContain("diagnosis");
    expect(JSON.stringify(prescription)).not.toContain("治愈");
  });

  it("reduces training intensity and suggests calming music when fatigue trend is evident", () => {
    const prescription = generateTrainingPrescription({
      ...baseInput,
      baselineAssessment: {
        ...baseInput.baselineAssessment,
        fatigueSelfRating: 4
      },
      eegTrend: {
        ...baseInput.eegTrend,
        fatigueTrend: "rising",
        averageFatigueIndex: 72
      },
      compliance: {
        ...baseInput.compliance,
        userFeedback: "tired"
      }
    });

    expect(prescription.weeklyTrainingFrequency.sessionsPerWeek).toBe(2);
    expect(prescription.sessionDurationMinutes).toBeLessThan(22);
    expect(prescription.musicTherapySuggestion.preferredTags).toContain("relax");
    expect(prescription.riskReminders).toContainEqual(
      expect.objectContaining({
        category: "training_load",
        severity: "watch"
      })
    );
  });

  it("respects therapist caps and minimum session duration boundaries", () => {
    const prescription = generateTrainingPrescription({
      ...baseInput,
      baselineAssessment: {
        ...baseInput.baselineAssessment,
        fatigueSelfRating: 5
      },
      eegTrend: {
        ...baseInput.eegTrend,
        fatigueTrend: "rising",
        averageFatigueIndex: 70
      },
      therapistGoals: {
        focusAreas: ["attention_stability"],
        maxWeeklyFrequency: 1,
        maxSessionDurationMinutes: 6
      },
      compliance: {
        ...baseInput.compliance,
        userFeedback: "tired"
      }
    });

    expect(prescription.weeklyTrainingFrequency.sessionsPerWeek).toBe(1);
    expect(prescription.sessionDurationMinutes).toBe(8);
    expect(prescription.gameDifficultyStartLevel).toBe(1);
    expect(prescription.musicTherapySuggestion.preferredTags).toEqual(["relax", "nature"]);
    expect(prescription.riskReminders).toContainEqual(
      expect.objectContaining({
        category: "training_load",
        severity: "watch"
      })
    );
  });

  it("prioritizes inhibition-control modules when commission rate is high", () => {
    const prescription = generateTrainingPrescription({
      ...baseInput,
      recentWeekTraining: {
        ...baseInput.recentWeekTraining,
        commissionRate: 0.22
      },
      therapistGoals: {
        focusAreas: ["inhibition_control"]
      }
    });

    const moduleTypes = prescription.recommendedModuleCombination.map(
      (module) => module.moduleType
    );
    expect(moduleTypes).toContain("go_no_go");
    expect(moduleTypes).toContain("stop_signal");
    expect(prescription.explanation).toContain("误按率较高");
  });

  it("prioritizes sustained attention when omission rate is high", () => {
    const prescription = generateTrainingPrescription({
      ...baseInput,
      recentWeekTraining: {
        ...baseInput.recentWeekTraining,
        omissionRate: 0.24
      },
      therapistGoals: {
        focusAreas: ["attention_stability"]
      }
    });

    expect(prescription.recommendedModuleCombination[0]?.moduleType).toBe("sustained_attention");
    expect(prescription.explanation).toContain("漏按率较高");
  });

  it("lowers task complexity when reaction time variability is high", () => {
    const prescription = generateTrainingPrescription({
      ...baseInput,
      recentWeekTraining: {
        ...baseInput.recentWeekTraining,
        reactionTimeVariabilityMs: 430
      },
      therapistGoals: {
        focusAreas: ["working_memory", "rhythm_sync"]
      }
    });

    expect(prescription.gameDifficultyStartLevel).toBe(1);
    expect(
      prescription.recommendedModuleCombination.some(
        (module) =>
          module.moduleType === "attention_training" &&
          module.explanation.includes("降低任务复杂度")
      )
    ).toBe(true);
    expect(prescription.nextWeekAdjustmentSuggestions.join(" ")).toContain(
      "避免同时增加多个难度参数"
    );
  });

  it("adds a data quality reminder at the valid sample rate boundary", () => {
    const prescription = generateTrainingPrescription({
      ...baseInput,
      eegTrend: {
        ...baseInput.eegTrend,
        signalQualityStatus: "unstable",
        validSampleRate: 0.72
      }
    });

    expect(prescription.riskReminders).toContainEqual(
      expect.objectContaining({
        category: "data_quality",
        severity: "watch"
      })
    );
  });

  it("rejects invalid rate input", () => {
    expect(() =>
      generateTrainingPrescription({
        ...baseInput,
        compliance: {
          ...baseInput.compliance,
          completionRate: 1.4
        }
      })
    ).toThrow(TrainingPrescriptionGeneratorError);
  });

  it("rejects invalid prescription rule configuration", () => {
    expect(() =>
      generateTrainingPrescription(baseInput, {
        minimumSessionDurationMinutes: 20,
        maximumSessionDurationMinutes: 10
      })
    ).toThrow(TrainingPrescriptionGeneratorError);
  });
});
