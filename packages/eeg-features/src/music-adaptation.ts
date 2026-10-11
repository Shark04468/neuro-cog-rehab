import type { MusicTag } from "@neuro-cog-rehab/shared-types";

import type { EEGFeatureFrame } from "./types.js";

export type MusicSubjectiveFeedback = "liked" | "neutral" | "disliked";

export type MusicAdaptationTrend = "increased" | "stable" | "decreased" | "unknown";

export type MusicRecommendationLabel =
  | "continue_candidate"
  | "post_training_recovery_candidate"
  | "use_with_adjustment"
  | "reduce_recommendation";

export interface MusicAdaptationEegSummary {
  averageAttentionScore: number | null;
  averageRelaxationScore: number | null;
  averageFatigueScore: number | null;
  /** Optional behavior metric used only for trend review when available. */
  averageReactionTimeMs?: number | null;
}

export interface MusicAdaptationAbnormalFeedback {
  irritability?: boolean;
  fatigue?: boolean;
  headache?: boolean;
  dizziness?: boolean;
  otherNotes?: string[];
}

export interface MusicAdaptationAssessmentInput {
  /** EEG baseline before music playback. Arrays allow stability comparison. */
  baseline: EEGFeatureFrame[] | MusicAdaptationEegSummary;
  /** EEG features collected during music playback. Arrays allow stability comparison. */
  during: EEGFeatureFrame[] | MusicAdaptationEegSummary;
  /** Summary collected after music playback. */
  post: MusicAdaptationEegSummary;
  subjectiveFeedback: MusicSubjectiveFeedback;
  abnormalFeedback?: MusicAdaptationAbnormalFeedback;
  rules?: Partial<MusicAdaptationRules>;
}

export interface MusicAdaptationRules {
  attentionStabilityImprovementThreshold: number;
  attentionAverageDropTolerance: number;
  relaxationIncreaseThreshold: number;
  fatigueIncreaseTolerance: number;
  fatigueConcernThreshold: number;
  reactionSlowdownThresholdMs: number;
  likedBonus: number;
  dislikedPenalty: number;
  abnormalPenalty: number;
}

export interface MusicAdaptationChange {
  baselineValue: number | null;
  comparisonValue: number | null;
  delta: number | null;
  trend: MusicAdaptationTrend;
  description: string;
}

export interface NextMusicSuggestion {
  label: string;
  preferredTags: MusicTag[];
  intensityAdjustment: "keep" | "lower" | "lower_or_recovery" | "pause_current";
  description: string;
}

export interface MusicAdaptationAssessmentResult {
  attentionChange: MusicAdaptationChange;
  relaxationChange: MusicAdaptationChange;
  fatigueChange: MusicAdaptationChange;
  suitabilityScore: number;
  recommendationLabel: MusicRecommendationLabel;
  nextMusicSuggestion: NextMusicSuggestion;
  notes: string[];
}

const DEFAULT_RULES: MusicAdaptationRules = {
  attentionStabilityImprovementThreshold: 3,
  attentionAverageDropTolerance: 4,
  relaxationIncreaseThreshold: 6,
  fatigueIncreaseTolerance: 4,
  fatigueConcernThreshold: 8,
  reactionSlowdownThresholdMs: 120,
  likedBonus: 8,
  dislikedPenalty: 18,
  abnormalPenalty: 22
};

interface NormalizedEegStats {
  averageAttentionScore: number | null;
  averageRelaxationScore: number | null;
  averageFatigueScore: number | null;
  attentionStdDev: number | null;
  averageReactionTimeMs: number | null;
}

export function assessMusicAdaptation(
  input: MusicAdaptationAssessmentInput
): MusicAdaptationAssessmentResult {
  const rules = buildMusicAdaptationRules(input.rules);
  const baseline = normalizeEegStats(input.baseline);
  const during = normalizeEegStats(input.during);
  const post = normalizeEegStats(input.post);
  const abnormalCount = countAbnormalFeedback(input.abnormalFeedback);

  const attentionChange = buildAttentionChange(baseline, during, rules);
  const relaxationChange = buildScoreChange({
    label: "放松趋势",
    baselineValue: baseline.averageRelaxationScore,
    comparisonValue: during.averageRelaxationScore ?? post.averageRelaxationScore,
    increaseText: "播放期间放松指数呈上升趋势。",
    stableText: "播放期间放松指数整体保持平稳。",
    decreaseText: "播放期间放松指数呈下降趋势。"
  });
  const fatigueChange = buildScoreChange({
    label: "疲劳趋势",
    baselineValue: baseline.averageFatigueScore,
    comparisonValue: post.averageFatigueScore ?? during.averageFatigueScore,
    increaseText: "播放后疲劳趋势有所上升。",
    stableText: "播放后疲劳趋势整体保持平稳。",
    decreaseText: "播放后疲劳趋势有所下降。"
  });

  const attentionStabilityImproved = hasAttentionStabilityImproved(baseline, during, rules);
  const fatigueNotRising = isFatigueWithinTolerance(fatigueChange.delta, rules);
  const relaxationImproved = (relaxationChange.delta ?? 0) >= rules.relaxationIncreaseThreshold;
  const reactionSlowed = hasReactionSlowed(baseline, during, post, rules);
  const fatigueConcern =
    (fatigueChange.delta ?? 0) >= rules.fatigueConcernThreshold ||
    Boolean(input.abnormalFeedback?.fatigue);
  const abnormalConcern = abnormalCount > 0;

  const suitabilityScore = calculateSuitabilityScore({
    attentionStabilityImproved,
    fatigueNotRising,
    relaxationImproved,
    reactionSlowed,
    fatigueConcern,
    abnormalCount,
    subjectiveFeedback: input.subjectiveFeedback,
    rules
  });

  const recommendationLabel = selectRecommendationLabel({
    attentionStabilityImproved,
    fatigueNotRising,
    relaxationImproved,
    reactionSlowed,
    fatigueConcern,
    abnormalConcern,
    subjectiveFeedback: input.subjectiveFeedback
  });

  return {
    attentionChange,
    relaxationChange,
    fatigueChange,
    suitabilityScore,
    recommendationLabel,
    nextMusicSuggestion: buildNextMusicSuggestion(recommendationLabel, input.abnormalFeedback),
    notes: buildNotes({
      attentionStabilityImproved,
      fatigueNotRising,
      relaxationImproved,
      reactionSlowed,
      fatigueConcern,
      abnormalConcern,
      subjectiveFeedback: input.subjectiveFeedback
    })
  };
}

export function buildMusicAdaptationRules(
  overrides: Partial<MusicAdaptationRules> = {}
): MusicAdaptationRules {
  const rules = {
    ...DEFAULT_RULES,
    ...overrides
  };

  for (const [key, value] of Object.entries(rules)) {
    if (!Number.isFinite(value)) {
      throw new Error(`${key} must be a finite number.`);
    }
  }

  return rules;
}

function normalizeEegStats(
  value: EEGFeatureFrame[] | MusicAdaptationEegSummary
): NormalizedEegStats {
  if (Array.isArray(value)) {
    return {
      averageAttentionScore: average(value.map((frame) => frame.attentionScore)),
      averageRelaxationScore: average(value.map((frame) => frame.relaxationScore)),
      averageFatigueScore: average(value.map((frame) => frame.fatigueScore)),
      attentionStdDev: standardDeviation(value.map((frame) => frame.attentionScore)),
      averageReactionTimeMs: null
    };
  }

  return {
    averageAttentionScore: sanitizeNullableScore(value.averageAttentionScore),
    averageRelaxationScore: sanitizeNullableScore(value.averageRelaxationScore),
    averageFatigueScore: sanitizeNullableScore(value.averageFatigueScore),
    attentionStdDev: null,
    averageReactionTimeMs:
      typeof value.averageReactionTimeMs === "number" &&
      Number.isFinite(value.averageReactionTimeMs)
        ? value.averageReactionTimeMs
        : null
  };
}

function buildAttentionChange(
  baseline: NormalizedEegStats,
  during: NormalizedEegStats,
  rules: MusicAdaptationRules
): MusicAdaptationChange {
  const delta = deltaBetween(baseline.averageAttentionScore, during.averageAttentionScore);
  const stabilityDelta = deltaBetween(during.attentionStdDev, baseline.attentionStdDev);
  const stabilityImproved = hasAttentionStabilityImproved(baseline, during, rules);

  if (stabilityDelta !== null) {
    return {
      baselineValue: roundNullable(baseline.attentionStdDev),
      comparisonValue: roundNullable(during.attentionStdDev),
      delta: roundNullable(stabilityDelta),
      trend: stabilityImproved
        ? "increased"
        : Math.abs(stabilityDelta) <= 1
          ? "stable"
          : "decreased",
      description: stabilityImproved
        ? "注意波动减少，播放期间注意趋势更稳定。"
        : "注意稳定性未见明显提升，建议继续观察不同音乐素材下的趋势。"
    };
  }

  return buildScoreChange(
    {
      label: "注意趋势",
      baselineValue: baseline.averageAttentionScore,
      comparisonValue: during.averageAttentionScore,
      increaseText: "播放期间注意指数呈上升趋势。",
      stableText: "播放期间注意指数整体保持平稳。",
      decreaseText: "播放期间注意指数呈下降趋势。"
    },
    delta
  );
}

function buildScoreChange(
  input: {
    label: string;
    baselineValue: number | null;
    comparisonValue: number | null;
    increaseText: string;
    stableText: string;
    decreaseText: string;
  },
  providedDelta?: number | null
): MusicAdaptationChange {
  const delta = providedDelta ?? deltaBetween(input.comparisonValue, input.baselineValue);
  const trend = trendFromDelta(delta);
  const description =
    trend === "increased"
      ? input.increaseText
      : trend === "decreased"
        ? input.decreaseText
        : trend === "stable"
          ? input.stableText
          : `${input.label}数据不足，暂不判断趋势。`;

  return {
    baselineValue: roundNullable(input.baselineValue),
    comparisonValue: roundNullable(input.comparisonValue),
    delta: roundNullable(delta),
    trend,
    description
  };
}

function hasAttentionStabilityImproved(
  baseline: NormalizedEegStats,
  during: NormalizedEegStats,
  rules: MusicAdaptationRules
): boolean {
  if (baseline.attentionStdDev === null || during.attentionStdDev === null) {
    return false;
  }

  const averageDelta =
    deltaBetween(during.averageAttentionScore, baseline.averageAttentionScore) ?? 0;
  return (
    baseline.attentionStdDev - during.attentionStdDev >=
      rules.attentionStabilityImprovementThreshold &&
    averageDelta >= -rules.attentionAverageDropTolerance
  );
}

function isFatigueWithinTolerance(
  fatigueDelta: number | null,
  rules: MusicAdaptationRules
): boolean {
  return fatigueDelta === null || fatigueDelta <= rules.fatigueIncreaseTolerance;
}

function hasReactionSlowed(
  baseline: NormalizedEegStats,
  during: NormalizedEegStats,
  post: NormalizedEegStats,
  rules: MusicAdaptationRules
): boolean {
  const comparison = post.averageReactionTimeMs ?? during.averageReactionTimeMs;
  if (baseline.averageReactionTimeMs === null || comparison === null) {
    return false;
  }

  return comparison - baseline.averageReactionTimeMs >= rules.reactionSlowdownThresholdMs;
}

function calculateSuitabilityScore(input: {
  attentionStabilityImproved: boolean;
  fatigueNotRising: boolean;
  relaxationImproved: boolean;
  reactionSlowed: boolean;
  fatigueConcern: boolean;
  abnormalCount: number;
  subjectiveFeedback: MusicSubjectiveFeedback;
  rules: MusicAdaptationRules;
}): number {
  let score = 55;

  if (input.attentionStabilityImproved && input.fatigueNotRising) {
    score += 24;
  }
  if (input.relaxationImproved) {
    score += input.reactionSlowed ? 8 : 12;
  }
  if (input.reactionSlowed) {
    score -= 6;
  }
  if (!input.fatigueNotRising || input.fatigueConcern) {
    score -= 18;
  }

  if (input.subjectiveFeedback === "liked") {
    score += input.rules.likedBonus;
  }
  if (input.subjectiveFeedback === "disliked") {
    score -= input.rules.dislikedPenalty;
  }

  score -= input.abnormalCount * input.rules.abnormalPenalty;

  return clamp(Math.round(score), 0, 100);
}

function selectRecommendationLabel(input: {
  attentionStabilityImproved: boolean;
  fatigueNotRising: boolean;
  relaxationImproved: boolean;
  reactionSlowed: boolean;
  fatigueConcern: boolean;
  abnormalConcern: boolean;
  subjectiveFeedback: MusicSubjectiveFeedback;
}): MusicRecommendationLabel {
  if (input.fatigueConcern || input.abnormalConcern || input.subjectiveFeedback === "disliked") {
    return "reduce_recommendation";
  }

  if (input.relaxationImproved && input.reactionSlowed) {
    return "post_training_recovery_candidate";
  }

  if (input.attentionStabilityImproved && input.fatigueNotRising) {
    return "continue_candidate";
  }

  return "use_with_adjustment";
}

function buildNextMusicSuggestion(
  label: MusicRecommendationLabel,
  abnormalFeedback: MusicAdaptationAbnormalFeedback | undefined
): NextMusicSuggestion {
  if (label === "continue_candidate") {
    return {
      label: "继续作为本类训练音乐候选",
      preferredTags: ["focus", "rhythm"],
      intensityAdjustment: "keep",
      description: "注意稳定性趋势较好且疲劳未明显上升，可在相近训练场景继续观察。"
    };
  }

  if (label === "post_training_recovery_candidate") {
    return {
      label: "更适合训练后恢复",
      preferredTags: ["relax", "nature"],
      intensityAdjustment: "lower_or_recovery",
      description: "放松趋势上升同时反应速度变慢，建议放在训练后恢复或冷静过渡场景。"
    };
  }

  if (label === "reduce_recommendation") {
    return {
      label: "降低当前推荐等级",
      preferredTags:
        abnormalFeedback?.headache || abnormalFeedback?.irritability ? ["nature"] : ["relax"],
      intensityAdjustment: "pause_current",
      description: "异常反馈或疲劳趋势上升时，建议暂停当前音乐并尝试低强度素材。"
    };
  }

  return {
    label: "调整后再观察",
    preferredTags: ["relax", "nature", "custom"],
    intensityAdjustment: "lower",
    description: "当前趋势不够明确，建议降低强度或更换为用户更容易接受的素材。"
  };
}

function buildNotes(input: {
  attentionStabilityImproved: boolean;
  fatigueNotRising: boolean;
  relaxationImproved: boolean;
  reactionSlowed: boolean;
  fatigueConcern: boolean;
  abnormalConcern: boolean;
  subjectiveFeedback: MusicSubjectiveFeedback;
}): string[] {
  const notes: string[] = [];

  if (input.attentionStabilityImproved && input.fatigueNotRising) {
    notes.push("注意稳定性趋势提升，且疲劳趋势未明显上升。");
  }
  if (input.relaxationImproved && input.reactionSlowed) {
    notes.push("放松趋势提升，同时反应速度趋势变慢。");
  }
  if (input.fatigueConcern || input.abnormalConcern) {
    notes.push("出现疲劳或不适反馈时，应降低当前音乐推荐等级。");
  }
  if (input.subjectiveFeedback === "liked") {
    notes.push("用户主观反馈为喜欢，可作为后续选择参考。");
  }
  if (input.subjectiveFeedback === "disliked") {
    notes.push("用户主观反馈为不喜欢，建议优先更换素材。");
  }

  return notes;
}

function countAbnormalFeedback(feedback: MusicAdaptationAbnormalFeedback | undefined): number {
  if (!feedback) {
    return 0;
  }

  const flags = [feedback.irritability, feedback.fatigue, feedback.headache, feedback.dizziness];
  return flags.filter(Boolean).length + (feedback.otherNotes?.length ?? 0);
}

function trendFromDelta(delta: number | null): MusicAdaptationTrend {
  if (delta === null) {
    return "unknown";
  }
  if (delta >= 3) {
    return "increased";
  }
  if (delta <= -3) {
    return "decreased";
  }

  return "stable";
}

function deltaBetween(comparison: number | null, baseline: number | null): number | null {
  if (comparison === null || baseline === null) {
    return null;
  }

  return comparison - baseline;
}

function average(values: number[]): number | null {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (validValues.length === 0) {
    return null;
  }

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function standardDeviation(values: number[]): number | null {
  const avg = average(values);
  if (avg === null) {
    return null;
  }

  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / Math.max(values.length, 1);
  return Math.sqrt(variance);
}

function sanitizeNullableScore(value: number | null): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return clamp(value, 0, 100);
}

function roundNullable(value: number | null): number | null {
  return value === null ? null : round(value, 2);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
