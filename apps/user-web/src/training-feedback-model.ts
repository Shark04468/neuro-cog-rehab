import type {
  SessionFlowStageId,
  SessionStageResult,
  SessionSummary
} from "./session-flow-model.js";

export type TrainingFeedbackTone = "steady" | "practice" | "rest";

export interface TrainingFeedbackSection {
  id:
    | "completion"
    | "attention_stability"
    | "click_reaction"
    | "impulse_control"
    | "rhythm_navigation"
    | "music_adaptation"
    | "next_suggestion"
    | "encouragement";
  title: string;
  headline: string;
  body: string;
  tone: TrainingFeedbackTone;
}

export interface TherapistFeedbackDetailEntry {
  label: string;
  value: string;
}

export interface TherapistFeedbackDetailGroup {
  title: string;
  entries: TherapistFeedbackDetailEntry[];
}

export interface TrainingRecordSaveDraft {
  id: string;
  sessionId: string;
  userId: string;
  trainingType: "mixed_session";
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  completionStatus: "completed" | "partial";
  dataSensitivity: "sensitive";
  savedAt: string;
  behaviorMetrics: {
    completedStageCount: number;
    skippedStageCount: number;
    savedStageResultCount: number;
    attentionStabilityScore: number | null;
    averageReactionTimeMs: number | null;
    inhibitionSuccessRate: number | null;
    rhythmRouteAccuracy: number | null;
    musicSuitabilityScore: number | null;
  };
  stageResults: SessionStageResult[];
  feedbackSummary: Record<TrainingFeedbackSection["id"], string>;
}

export interface TrainingEndFeedbackViewModel {
  traineeDisplayName: string;
  title: string;
  subtitle: string;
  sections: TrainingFeedbackSection[];
  therapistDetails: TherapistFeedbackDetailGroup[];
  trainingRecordDraft: TrainingRecordSaveDraft;
}

export class TrainingFeedbackModelError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TrainingFeedbackModelError";
  }
}

const PERCENT_BASE = 100;

export function buildTrainingEndFeedback(
  summary: SessionSummary,
  now: Date = new Date()
): TrainingEndFeedbackViewModel {
  validateSummary(summary);

  const metrics = deriveFeedbackMetrics(summary);
  const sections = buildFeedbackSections(summary, metrics);
  const trainingRecordDraft = buildTrainingRecordSaveDraft(summary, sections, metrics, now);

  return {
    traineeDisplayName: summary.traineeDisplayName,
    title: `${summary.traineeDisplayName}，本次训练完成了`,
    subtitle: "下面是本次练习的简单回顾。详细数据只给授权治疗师查看。",
    sections,
    therapistDetails: buildTherapistDetails(summary, metrics),
    trainingRecordDraft
  };
}

function validateSummary(summary: SessionSummary): void {
  if (summary.sessionId.trim().length === 0 || summary.userId.trim().length === 0) {
    throw new TrainingFeedbackModelError("Session id and user id are required.");
  }
  if (summary.startedAt.trim().length === 0 || Number.isNaN(Date.parse(summary.startedAt))) {
    throw new TrainingFeedbackModelError("A valid session start time is required.");
  }
  if (summary.endedAt !== null && Number.isNaN(Date.parse(summary.endedAt))) {
    throw new TrainingFeedbackModelError("Session end time is invalid.");
  }
}

interface DerivedFeedbackMetrics {
  completionRate: number;
  attentionStabilityScore: number | null;
  averageReactionTimeMs: number | null;
  inhibitionSuccessRate: number | null;
  rhythmRouteAccuracy: number | null;
  musicSuitabilityScore: number | null;
}

function deriveFeedbackMetrics(summary: SessionSummary): DerivedFeedbackMetrics {
  const attentionResult = findStageResult(summary, "attention_training");
  const goNoGoResult = findStageResult(summary, "go_nogo_training");
  const rhythmResult = findStageResult(summary, "rhythm_navigation");
  const musicResult = findStageResult(summary, "music_therapy");

  return {
    completionRate:
      summary.totalStageCount === 0 ? 0 : summary.completedStageCount / summary.totalStageCount,
    attentionStabilityScore:
      readScore(attentionResult, ["attentionStabilityScore", "focusStabilityScore", "accuracy"]) ??
      null,
    averageReactionTimeMs:
      readScore(attentionResult, ["averageReactionTimeMs", "averageReactionTime"]) ??
      readScore(goNoGoResult, ["averageReactionTimeMs", "averageGoReactionTimeMs"]) ??
      null,
    inhibitionSuccessRate:
      readRate(goNoGoResult, ["inhibitionSuccessRate", "noGoInhibitionRate", "ruleAccuracy"]) ??
      null,
    rhythmRouteAccuracy: readRate(rhythmResult, ["routeAccuracy", "routeCompletionRate"]) ?? null,
    musicSuitabilityScore:
      readScore(musicResult, ["suitabilityScore", "comfortScore", "userComfortRating"]) ?? null
  };
}

function buildFeedbackSections(
  summary: SessionSummary,
  metrics: DerivedFeedbackMetrics
): TrainingFeedbackSection[] {
  return [
    {
      id: "completion",
      title: "本次完成情况",
      headline: `${summary.completedStageCount} 个阶段已完成`,
      body: `本次共保存 ${summary.savedStageResultCount} 条阶段结果，累计约 ${Math.round(
        summary.totalDurationSeconds / 60
      )} 分钟。`,
      tone: metrics.completionRate >= 0.85 ? "steady" : "practice"
    },
    {
      id: "attention_stability",
      title: "注意稳定性趋势",
      headline: attentionHeadline(metrics.attentionStabilityScore),
      body: "先保持看清目标，再慢慢提高速度。这里展示的是练习趋势，不代表任何诊断结论。",
      tone: scoreTone(metrics.attentionStabilityScore)
    },
    {
      id: "click_reaction",
      title: "点击反应表现",
      headline: reactionHeadline(metrics.averageReactionTimeMs),
      body: "点击任务已经记录。比起抢快，更重要的是看清提示后再行动。",
      tone:
        metrics.averageReactionTimeMs !== null && metrics.averageReactionTimeMs > 1200
          ? "practice"
          : "steady"
    },
    {
      id: "impulse_control",
      title: "冲动控制表现",
      headline: inhibitionHeadline(metrics.inhibitionSuccessRate),
      body: "遇到需要等待的提示时，继续练习先停一下、再决定是否点击。",
      tone: rateTone(metrics.inhibitionSuccessRate)
    },
    {
      id: "rhythm_navigation",
      title: "节律导航表现",
      headline: rhythmHeadline(metrics.rhythmRouteAccuracy),
      body: "路线记忆、节拍跟随和规则切换结果已记录，下次可以从相近难度开始。",
      tone: rateTone(metrics.rhythmRouteAccuracy)
    },
    {
      id: "music_adaptation",
      title: "音乐适配结果",
      headline: musicHeadline(metrics.musicSuitabilityScore),
      body: "音乐反馈只用于选择更合适的训练节奏。若感觉不舒服，可以换成更轻的音乐或休息。",
      tone:
        metrics.musicSuitabilityScore !== null && metrics.musicSuitabilityScore < 45
          ? "rest"
          : "steady"
    },
    {
      id: "next_suggestion",
      title: "下次训练建议",
      headline: nextTrainingHeadline(summary, metrics),
      body: summary.recommendedNextStep,
      tone: metrics.completionRate >= 0.85 ? "steady" : "practice"
    },
    {
      id: "encouragement",
      title: "鼓励反馈",
      headline: "今天的练习已经完成",
      body: "愿意认真完成、也愿意在需要时休息，都是很好的训练习惯。",
      tone: "steady"
    }
  ];
}

function buildTrainingRecordSaveDraft(
  summary: SessionSummary,
  sections: TrainingFeedbackSection[],
  metrics: DerivedFeedbackMetrics,
  now: Date
): TrainingRecordSaveDraft {
  const endedAt = summary.endedAt ?? now.toISOString();

  return {
    id: `training-record-${summary.sessionId}-${now.getTime()}`,
    sessionId: summary.sessionId,
    userId: summary.userId,
    trainingType: "mixed_session",
    startedAt: summary.startedAt,
    endedAt,
    durationSeconds: summary.totalDurationSeconds,
    completionStatus: summary.status === "saved" ? "completed" : "partial",
    dataSensitivity: "sensitive",
    savedAt: now.toISOString(),
    behaviorMetrics: {
      completedStageCount: summary.completedStageCount,
      skippedStageCount: summary.skippedStageCount,
      savedStageResultCount: summary.savedStageResultCount,
      attentionStabilityScore: metrics.attentionStabilityScore,
      averageReactionTimeMs: metrics.averageReactionTimeMs,
      inhibitionSuccessRate: metrics.inhibitionSuccessRate,
      rhythmRouteAccuracy: metrics.rhythmRouteAccuracy,
      musicSuitabilityScore: metrics.musicSuitabilityScore
    },
    stageResults: [...summary.stageResults],
    feedbackSummary: sections.reduce(
      (accumulator, section) => ({
        ...accumulator,
        [section.id]: `${section.headline}。${section.body}`
      }),
      {} as Record<TrainingFeedbackSection["id"], string>
    )
  };
}

function buildTherapistDetails(
  summary: SessionSummary,
  metrics: DerivedFeedbackMetrics
): TherapistFeedbackDetailGroup[] {
  return [
    {
      title: "会话概览",
      entries: [
        { label: "Session ID", value: summary.sessionId },
        { label: "User ID", value: summary.userId },
        { label: "开始时间", value: summary.startedAt },
        { label: "结束时间", value: summary.endedAt ?? "未结束" },
        { label: "完成阶段", value: `${summary.completedStageCount}/${summary.totalStageCount}` },
        { label: "跳过阶段", value: `${summary.skippedStageCount}` },
        { label: "保存结果", value: `${summary.savedStageResultCount}` }
      ]
    },
    {
      title: "趋势指标入口",
      entries: [
        { label: "注意稳定性", value: formatNullableScore(metrics.attentionStabilityScore) },
        { label: "平均反应时", value: formatReactionTime(metrics.averageReactionTimeMs) },
        { label: "抑制成功率", value: formatNullablePercent(metrics.inhibitionSuccessRate) },
        { label: "路线准确率", value: formatNullablePercent(metrics.rhythmRouteAccuracy) },
        { label: "音乐适配分", value: formatNullableScore(metrics.musicSuitabilityScore) }
      ]
    }
  ];
}

function findStageResult(
  summary: SessionSummary,
  stageId: SessionFlowStageId
): SessionStageResult | null {
  return summary.stageResults.find((stageResult) => stageResult.stageId === stageId) ?? null;
}

function readScore(stageResult: SessionStageResult | null, keys: string[]): number | undefined {
  if (!stageResult) {
    return undefined;
  }

  for (const key of keys) {
    const value = stageResult.payload[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return normalizeScore(value);
    }
  }

  return undefined;
}

function readRate(stageResult: SessionStageResult | null, keys: string[]): number | undefined {
  const score = readScore(stageResult, keys);
  if (score === undefined) {
    return undefined;
  }

  return score > 1 ? score / PERCENT_BASE : score;
}

function normalizeScore(value: number): number {
  if (value <= 1) {
    return Math.round(value * PERCENT_BASE);
  }
  return Math.max(0, Math.min(PERCENT_BASE, Math.round(value)));
}

function attentionHeadline(score: number | null): string {
  if (score === null) {
    return "注意练习结果已记录";
  }
  if (score >= 75) {
    return "注意保持比较平稳";
  }
  if (score >= 55) {
    return "注意有起伏，可以继续短时练习";
  }
  return "下次先降低任务难度";
}

function reactionHeadline(averageReactionTimeMs: number | null): string {
  if (averageReactionTimeMs === null) {
    return "点击反应结果已记录";
  }
  if (averageReactionTimeMs <= 850) {
    return "点击反应比较顺畅";
  }
  if (averageReactionTimeMs <= 1200) {
    return "点击反应有一些起伏";
  }
  return "下次可以先放慢节奏";
}

function inhibitionHeadline(rate: number | null): string {
  if (rate === null) {
    return "等待点击的练习已记录";
  }
  if (rate >= 0.8) {
    return "等待提示时比较稳定";
  }
  if (rate >= 0.6) {
    return "需要等待的题目还可以继续练";
  }
  return "下次先减少干扰提示";
}

function rhythmHeadline(routeAccuracy: number | null): string {
  if (routeAccuracy === null) {
    return "节律导航结果已记录";
  }
  if (routeAccuracy >= 0.8) {
    return "路线记忆和节拍跟随比较顺";
  }
  if (routeAccuracy >= 0.6) {
    return "路线顺序有一些起伏";
  }
  return "下次先从更短路线开始";
}

function musicHeadline(score: number | null): string {
  if (score === null) {
    return "音乐感受已记录";
  }
  if (score >= 70) {
    return "这首音乐可以继续观察使用";
  }
  if (score >= 45) {
    return "这首音乐适合再观察一次";
  }
  return "下次可以换更轻的音乐";
}

function nextTrainingHeadline(summary: SessionSummary, metrics: DerivedFeedbackMetrics): string {
  if (metrics.musicSuitabilityScore !== null && metrics.musicSuitabilityScore < 45) {
    return "下次先休息或换轻音乐";
  }
  if (metrics.completionRate < 0.85) {
    return "下次先减少任务数量";
  }
  if (summary.totalDurationSeconds > 30 * 60) {
    return "下次保持适中时长";
  }
  return "下次可以从相近难度继续";
}

function scoreTone(score: number | null): TrainingFeedbackTone {
  if (score === null || score >= 55) {
    return "steady";
  }
  return "practice";
}

function rateTone(rate: number | null): TrainingFeedbackTone {
  if (rate === null || rate >= 0.6) {
    return "steady";
  }
  return "practice";
}

function formatNullableScore(score: number | null): string {
  return score === null ? "暂无结构化分数" : `${score}/100`;
}

function formatNullablePercent(rate: number | null): string {
  return rate === null ? "暂无结构化比例" : `${Math.round(rate * PERCENT_BASE)}%`;
}

function formatReactionTime(averageReactionTimeMs: number | null): string {
  return averageReactionTimeMs === null ? "暂无结构化反应时" : `${averageReactionTimeMs}ms`;
}
