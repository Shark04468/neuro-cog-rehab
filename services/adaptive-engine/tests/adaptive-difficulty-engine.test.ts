import { describe, expect, it } from "vitest";

import {
  AdaptiveDifficultyEngineError,
  buildAdaptiveDifficultyRuleConfig,
  evaluateAdaptiveDifficulty
} from "../src/index.js";
import type { AdaptiveDifficultyEvaluationInput } from "../src/index.js";

const stableInput: AdaptiveDifficultyEvaluationInput = {
  currentDifficultyLevel: 2,
  recentAccuracyRate: 0.9,
  omissionRate: 0.03,
  commissionRate: 0.04,
  averageReactionTimeMs: 620,
  reactionTimeVariabilityMs: 110,
  eegAttentionIndex: 72,
  eegFatigueIndex: 38,
  eegQualityStatus: "good",
  subjectiveFeedback: "just_right"
};

describe("adaptive difficulty engine", () => {
  it("increases difficulty within bounds when performance and EEG trends are stable", () => {
    const recommendation = evaluateAdaptiveDifficulty(stableInput);

    expect(recommendation.direction).toBe("increase");
    expect(recommendation.nextDifficultyLevel).toBe(3);
    expect(recommendation.targetPresentationTimeMs).toBeLessThan(1800);
    expect(recommendation.distractorCount).toBeGreaterThan(1);
    expect(recommendation.shouldPause).toBe(false);
    expect(recommendation.musicUseSuggestion).toBe("optional_focus_support");
    expect(recommendation.ruleExplanations.some((rule) => rule.triggered)).toBe(true);
    expect(recommendation.explanation).toContain("建议方向");
  });

  it("decreases difficulty when omission, commission, and reaction variability are high", () => {
    const recommendation = evaluateAdaptiveDifficulty({
      ...stableInput,
      currentDifficultyLevel: 3,
      recentAccuracyRate: 0.58,
      omissionRate: 0.22,
      commissionRate: 0.2,
      averageReactionTimeMs: 1120,
      reactionTimeVariabilityMs: 420,
      eegAttentionIndex: 46,
      subjectiveFeedback: "too_hard"
    });

    expect(recommendation.direction).toBe("decrease");
    expect(recommendation.nextDifficultyLevel).toBe(2);
    expect(recommendation.shouldPause).toBe(false);
    expect(recommendation.musicUseSuggestion).toBe("calming_recovery");
    expect(recommendation.ruleExplanations).toContainEqual(
      expect.objectContaining({
        ruleId: "performance.decrease_boundary",
        triggered: true,
        direction: "decrease"
      })
    );
  });

  it("suggests pause when EEG quality or fatigue reaches configured safety boundary", () => {
    const recommendation = evaluateAdaptiveDifficulty({
      ...stableInput,
      currentDifficultyLevel: 4,
      eegQualityStatus: "disconnected",
      eegFatigueIndex: 82,
      subjectiveFeedback: "tired"
    });

    expect(recommendation.direction).toBe("pause");
    expect(recommendation.shouldPause).toBe(true);
    expect(recommendation.nextDifficultyLevel).toBe(3);
    expect(recommendation.recommendedDurationSeconds).toBe(120);
    expect(recommendation.musicUseSuggestion).toBe("reduce_stimulation");
    expect(recommendation.explanation).not.toContain("diagnosis");
    expect(recommendation.explanation).not.toContain("cure");
  });

  it("maintains difficulty when metrics stay between increase and decrease boundaries", () => {
    const recommendation = evaluateAdaptiveDifficulty({
      ...stableInput,
      recentAccuracyRate: 0.75,
      omissionRate: 0.1,
      commissionRate: 0.09,
      averageReactionTimeMs: 800,
      reactionTimeVariabilityMs: 220,
      eegAttentionIndex: 55,
      eegFatigueIndex: 50
    });

    expect(recommendation.direction).toBe("maintain");
    expect(recommendation.nextDifficultyLevel).toBe(2);
    expect(recommendation.shouldPause).toBe(false);
    expect(recommendation.musicUseSuggestion).toBe("none");
    expect(recommendation.targetPresentationTimeMs).toBe(1580);
    expect(recommendation.distractorCount).toBe(3);
  });

  it("keeps next difficulty within configured minimum and maximum boundaries", () => {
    const increaseAtMax = evaluateAdaptiveDifficulty({
      ...stableInput,
      currentDifficultyLevel: 5
    });
    const decreaseAtMin = evaluateAdaptiveDifficulty({
      ...stableInput,
      currentDifficultyLevel: 1,
      recentAccuracyRate: 0.5,
      omissionRate: 0.2
    });

    expect(increaseAtMax.direction).toBe("increase");
    expect(increaseAtMax.nextDifficultyLevel).toBe(5);
    expect(decreaseAtMin.direction).toBe("decrease");
    expect(decreaseAtMin.nextDifficultyLevel).toBe(1);
  });

  it("uses configurable thresholds and output ranges without black-box decisions", () => {
    const rules = buildAdaptiveDifficultyRuleConfig({
      maxDifficultyLevel: 3,
      accuracy: {
        increaseAtOrAbove: 0.8
      },
      output: {
        targetPresentationTimeMs: {
          min: 900,
          max: 1500,
          step: 300
        },
        distractorCount: {
          min: 2,
          max: 6,
          step: 1
        }
      }
    });
    const recommendation = evaluateAdaptiveDifficulty(
      {
        ...stableInput,
        currentDifficultyLevel: 3,
        recentAccuracyRate: 0.82
      },
      {
        maxDifficultyLevel: rules.maxDifficultyLevel,
        accuracy: rules.accuracy,
        output: {
          targetPresentationTimeMs: rules.output.targetPresentationTimeMs,
          distractorCount: rules.output.distractorCount
        }
      }
    );

    expect(recommendation.nextDifficultyLevel).toBe(3);
    expect(recommendation.targetPresentationTimeMs).toBe(900);
    expect(recommendation.distractorCount).toBe(4);
    expect(recommendation.ruleExplanations).toContainEqual(
      expect.objectContaining({
        ruleId: "output.parameter_mapping",
        triggered: true
      })
    );
  });

  it("rejects invalid input values", () => {
    expect(() =>
      evaluateAdaptiveDifficulty({
        ...stableInput,
        recentAccuracyRate: 1.2
      })
    ).toThrow(AdaptiveDifficultyEngineError);
  });

  it("rejects invalid adaptive rule boundaries", () => {
    expect(() =>
      buildAdaptiveDifficultyRuleConfig({
        minDifficultyLevel: 5,
        maxDifficultyLevel: 3
      })
    ).toThrow(AdaptiveDifficultyEngineError);

    expect(() =>
      buildAdaptiveDifficultyRuleConfig({
        output: {
          durationSeconds: {
            min: 500,
            max: 100
          }
        }
      })
    ).toThrow(AdaptiveDifficultyEngineError);
  });
});
