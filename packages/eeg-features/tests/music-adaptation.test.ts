import { describe, expect, it } from "vitest";

import { assessMusicAdaptation, type EEGFeatureFrame } from "../src/index.js";

function frame(overrides: Partial<EEGFeatureFrame> = {}): EEGFeatureFrame {
  return {
    timestamp: "2026-06-15T08:00:00.000Z",
    attentionScore: 60,
    relaxationScore: 45,
    fatigueScore: 25,
    thetaPower: 0.3,
    alphaPower: 0.35,
    betaPower: 0.35,
    signalQuality: 92,
    artifactLevel: 5,
    ...overrides
  };
}

describe("assessMusicAdaptation", () => {
  it("recommends continuing when attention stability improves and fatigue does not rise", () => {
    const result = assessMusicAdaptation({
      baseline: [
        frame({ attentionScore: 48, fatigueScore: 24 }),
        frame({ attentionScore: 72, fatigueScore: 25 }),
        frame({ attentionScore: 54, fatigueScore: 24 }),
        frame({ attentionScore: 68, fatigueScore: 25 })
      ],
      during: [
        frame({ attentionScore: 62, fatigueScore: 24 }),
        frame({ attentionScore: 64, fatigueScore: 25 }),
        frame({ attentionScore: 63, fatigueScore: 24 }),
        frame({ attentionScore: 65, fatigueScore: 25 })
      ],
      post: {
        averageAttentionScore: 64,
        averageRelaxationScore: 48,
        averageFatigueScore: 25
      },
      subjectiveFeedback: "liked"
    });

    expect(result.recommendationLabel).toBe("continue_candidate");
    expect(result.suitabilityScore).toBeGreaterThanOrEqual(80);
    expect(result.attentionChange.description).toContain("注意波动减少");
  });

  it("suggests post-training recovery when relaxation rises and reaction slows", () => {
    const result = assessMusicAdaptation({
      baseline: {
        averageAttentionScore: 58,
        averageRelaxationScore: 40,
        averageFatigueScore: 22,
        averageReactionTimeMs: 430
      },
      during: {
        averageAttentionScore: 55,
        averageRelaxationScore: 55,
        averageFatigueScore: 24,
        averageReactionTimeMs: 570
      },
      post: {
        averageAttentionScore: 54,
        averageRelaxationScore: 58,
        averageFatigueScore: 25,
        averageReactionTimeMs: 590
      },
      subjectiveFeedback: "neutral"
    });

    expect(result.recommendationLabel).toBe("post_training_recovery_candidate");
    expect(result.nextMusicSuggestion.preferredTags).toContain("relax");
    expect(result.notes.join(" ")).toContain("反应速度趋势变慢");
  });

  it("lowers recommendation when fatigue or irritability rises", () => {
    const result = assessMusicAdaptation({
      baseline: {
        averageAttentionScore: 62,
        averageRelaxationScore: 45,
        averageFatigueScore: 24
      },
      during: {
        averageAttentionScore: 60,
        averageRelaxationScore: 44,
        averageFatigueScore: 34
      },
      post: {
        averageAttentionScore: 58,
        averageRelaxationScore: 42,
        averageFatigueScore: 39
      },
      subjectiveFeedback: "disliked",
      abnormalFeedback: {
        irritability: true,
        fatigue: true
      }
    });

    expect(result.recommendationLabel).toBe("reduce_recommendation");
    expect(result.suitabilityScore).toBeLessThan(40);
    expect(result.nextMusicSuggestion.intensityAdjustment).toBe("pause_current");
  });

  it("handles sparse EEG summaries as an unknown boundary without throwing", () => {
    const result = assessMusicAdaptation({
      baseline: {
        averageAttentionScore: null,
        averageRelaxationScore: null,
        averageFatigueScore: null
      },
      during: {
        averageAttentionScore: null,
        averageRelaxationScore: null,
        averageFatigueScore: null
      },
      post: {
        averageAttentionScore: null,
        averageRelaxationScore: null,
        averageFatigueScore: null
      },
      subjectiveFeedback: "neutral"
    });

    expect(result.attentionChange.trend).toBe("unknown");
    expect(result.relaxationChange.trend).toBe("unknown");
    expect(result.fatigueChange.trend).toBe("unknown");
    expect(result.recommendationLabel).toBe("use_with_adjustment");
    expect(result.suitabilityScore).toBe(55);
  });

  it("clamps out-of-range summary scores before calculating trend boundaries", () => {
    const result = assessMusicAdaptation({
      baseline: {
        averageAttentionScore: -20,
        averageRelaxationScore: 110,
        averageFatigueScore: 10
      },
      during: {
        averageAttentionScore: 140,
        averageRelaxationScore: -5,
        averageFatigueScore: 20
      },
      post: {
        averageAttentionScore: 100,
        averageRelaxationScore: 0,
        averageFatigueScore: 20
      },
      subjectiveFeedback: "liked"
    });

    expect(result.attentionChange.baselineValue).toBe(0);
    expect(result.attentionChange.comparisonValue).toBe(100);
    expect(result.relaxationChange.baselineValue).toBe(100);
    expect(result.relaxationChange.comparisonValue).toBe(0);
  });

  it("rejects invalid music adaptation rule configuration", () => {
    expect(() =>
      assessMusicAdaptation({
        baseline: [frame()],
        during: [frame()],
        post: {
          averageAttentionScore: 60,
          averageRelaxationScore: 50,
          averageFatigueScore: 25
        },
        subjectiveFeedback: "neutral",
        rules: {
          abnormalPenalty: Number.NaN
        }
      })
    ).toThrow("abnormalPenalty must be a finite number.");
  });

  it("keeps output wording as trend descriptions rather than effect claims", () => {
    const result = assessMusicAdaptation({
      baseline: [frame({ attentionScore: 50 }), frame({ attentionScore: 70 })],
      during: [frame({ attentionScore: 58 }), frame({ attentionScore: 60 })],
      post: {
        averageAttentionScore: 60,
        averageRelaxationScore: 50,
        averageFatigueScore: 25
      },
      subjectiveFeedback: "neutral"
    });
    const serialized = JSON.stringify(result).toLowerCase();

    expect(serialized).not.toContain("diagnosis");
    expect(serialized).not.toContain("treatment");
    expect(serialized).not.toContain("cure");
    expect(serialized).not.toContain("guarantee");
  });
});
