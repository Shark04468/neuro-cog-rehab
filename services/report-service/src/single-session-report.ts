export type SingleSessionReportTrainingType =
  | "baseline_assessment"
  | "music_therapy"
  | "attention_game"
  | "go_nogo_game"
  | "rhythm_navigation"
  | "mixed_session";

export type SingleSessionCompletionStatus = "completed" | "partial" | "abandoned" | "interrupted";

export type SingleSessionEegQualityStatus = "good" | "unstable" | "noisy" | "disconnected";

export type SingleSessionAbnormalEventSeverity = "info" | "warning" | "critical";

export interface SingleSessionReportUserInfo {
  userId: string;
  displayName: string;
  ageRange?: string;
  userProfileId?: string;
  guardianConsentLabel?: string;
}

export interface SingleSessionReportSessionInfo {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  completionStatus: SingleSessionCompletionStatus;
}

export interface CompletedTrainingModuleSummary {
  moduleType: SingleSessionReportTrainingType;
  displayName?: string;
  durationSeconds: number;
  completionStatus: SingleSessionCompletionStatus;
}

export interface SingleSessionBehaviorMetrics {
  totalTrials?: number;
  correctCount?: number;
  accuracyRate?: number;
  omissionCount?: number;
  omissionRate?: number;
  falseAlarmCount?: number;
  falseAlarmRate?: number;
  averageReactionTimeMs?: number;
  reactionTimeVariabilityMs?: number;
  completionRate?: number;
  routeAccuracy?: number;
  timingErrorMs?: number;
}

export interface SingleSessionEegSummary {
  averageAttentionIndex?: number;
  averageRelaxationIndex?: number;
  averageFatigueIndex?: number;
  validSampleRate?: number;
  artifactCount?: number;
  frameCount?: number;
  qualityStatus?: SingleSessionEegQualityStatus;
}

export interface SingleSessionMusicAdaptationResult {
  trackTitle: string;
  suitabilityScore?: number;
  recommendationLabel: string;
  attentionChange?: number;
  relaxationChange?: number;
  fatigueChange?: number;
  userFeedbackLabel?: string;
  nextMusicSuggestion?: string;
}

export interface SingleSessionAbnormalEvent {
  eventType:
    | "pause"
    | "early_stop"
    | "device_disconnect"
    | "low_signal_quality"
    | "user_discomfort"
    | "other";
  occurredAt: string;
  severity: SingleSessionAbnormalEventSeverity;
  message: string;
}

export interface SingleSessionReportInput {
  reportId?: string;
  generatedAt?: string;
  userInfo: SingleSessionReportUserInfo;
  sessionInfo: SingleSessionReportSessionInfo;
  completedModules: CompletedTrainingModuleSummary[];
  behaviorMetrics: SingleSessionBehaviorMetrics;
  eegSummary: SingleSessionEegSummary;
  musicAdaptation?: SingleSessionMusicAdaptationResult;
  abnormalEvents: SingleSessionAbnormalEvent[];
  sessionRecommendation?: string;
}

export interface SingleSessionReportSection {
  title: string;
  rows: Array<{ label: string; value: string }>;
}

export interface SingleSessionTrainingReport {
  id: string;
  generatedAt: string;
  dataSensitivity: "sensitive";
  userInfo: SingleSessionReportUserInfo;
  sessionInfo: SingleSessionReportSessionInfo;
  completedModules: CompletedTrainingModuleSummary[];
  behaviorMetrics: SingleSessionBehaviorMetrics;
  eegSummary: SingleSessionEegSummary;
  musicAdaptation: SingleSessionMusicAdaptationResult | null;
  abnormalEvents: SingleSessionAbnormalEvent[];
  recommendation: string;
  narrativeSummary: string;
  sections: SingleSessionReportSection[];
  scopeNotice: string;
}

export interface HtmlReportExport {
  fileName: string;
  mimeType: "text/html; charset=utf-8";
  html: string;
}

export interface PdfReportExport {
  fileName: string;
  mimeType: "application/pdf";
  data: Uint8Array;
}

export type SingleSessionReportErrorCode = "INVALID_INPUT" | "UNSAFE_REPORT_TEXT";

export class SingleSessionReportGeneratorError extends Error {
  public constructor(
    public readonly code: SingleSessionReportErrorCode,
    message: string
  ) {
    super(message);
    this.name = "SingleSessionReportGeneratorError";
  }
}

const MODULE_LABELS: Record<SingleSessionReportTrainingType, string> = {
  baseline_assessment: "基线评估",
  music_therapy: "音乐疗愈",
  attention_game: "注意力训练",
  go_nogo_game: "Go/No-Go 点击练习",
  rhythm_navigation: "节律导航",
  mixed_session: "综合训练"
};

const COMPLETION_STATUS_LABELS: Record<SingleSessionCompletionStatus, string> = {
  completed: "已完成",
  partial: "部分完成",
  abandoned: "未完成",
  interrupted: "已中断"
};

const EEG_QUALITY_LABELS: Record<SingleSessionEegQualityStatus, string> = {
  good: "信号稳定",
  unstable: "信号有波动",
  noisy: "干扰较多",
  disconnected: "连接中断"
};

const EVENT_SEVERITY_LABELS: Record<SingleSessionAbnormalEventSeverity, string> = {
  info: "记录",
  warning: "需要关注",
  critical: "需要暂停复核"
};

const FORBIDDEN_REPLACEMENTS: Array<[string, string]> = [
  ["疗效确定", "训练变化结论"],
  ["疗效保证", "训练结果保证表述"],
  ["临床诊断", "状态记录"],
  ["治疗效果", "训练变化"],
  ["治愈", "训练改善目标"],
  ["诊断", "状态记录"]
];

export function generateSingleSessionTrainingReport(
  input: SingleSessionReportInput
): SingleSessionTrainingReport {
  validateReportInput(input);

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const report: SingleSessionTrainingReport = {
    id: sanitizePlainText(input.reportId ?? `single-session-report-${input.sessionInfo.sessionId}`),
    generatedAt,
    dataSensitivity: "sensitive",
    userInfo: sanitizeUserInfo(input.userInfo),
    sessionInfo: input.sessionInfo,
    completedModules: input.completedModules.map(sanitizeCompletedModule),
    behaviorMetrics: input.behaviorMetrics,
    eegSummary: input.eegSummary,
    musicAdaptation: input.musicAdaptation ? sanitizeMusicAdaptation(input.musicAdaptation) : null,
    abnormalEvents: input.abnormalEvents.map(sanitizeAbnormalEvent),
    recommendation: sanitizePlainText(
      input.sessionRecommendation ??
        "建议下次训练继续保持短时、可暂停的安排，并结合本次行为指标和 EEG 数据质量观察任务强度。"
    ),
    narrativeSummary: "",
    sections: [],
    scopeNotice: "本报告仅用于辅助训练记录、状态回顾和趋势追踪，不作为临床判断或确定性结果说明。"
  };

  report.narrativeSummary = buildNarrativeSummary(report);
  report.sections = buildReportSections(report);
  assertNoForbiddenTerms(JSON.stringify(report));

  return report;
}

export function generateSingleSessionHtmlReport(input: SingleSessionReportInput): HtmlReportExport {
  const report = generateSingleSessionTrainingReport(input);
  const html = renderSingleSessionReportHtml(report);
  assertNoForbiddenTerms(html);

  return {
    fileName: `${report.id}.html`,
    mimeType: "text/html; charset=utf-8",
    html
  };
}

export function exportSingleSessionReportPdf(input: SingleSessionReportInput): PdfReportExport {
  const report = generateSingleSessionTrainingReport(input);
  const data = buildSimplePdf(buildPdfLines(report));

  return {
    fileName: `${report.id}.pdf`,
    mimeType: "application/pdf",
    data
  };
}

export function renderSingleSessionReportHtml(report: SingleSessionTrainingReport): string {
  const moduleCards = report.completedModules
    .map(
      (module) => `
        <article class="module-card">
          <strong>${escapeHtml(module.displayName ?? MODULE_LABELS[module.moduleType])}</strong>
          <span>${formatDuration(module.durationSeconds)} / ${
            COMPLETION_STATUS_LABELS[module.completionStatus]
          }</span>
        </article>`
    )
    .join("");
  const sections = report.sections.map(renderSection).join("");
  const abnormalEvents =
    report.abnormalEvents.length === 0
      ? `<p class="muted">本次未记录异常事件。</p>`
      : report.abnormalEvents
          .map(
            (event) => `
              <li>
                <strong>${EVENT_SEVERITY_LABELS[event.severity]}</strong>
                <span>${formatDateTime(event.occurredAt)}</span>
                <p>${escapeHtml(event.message)}</p>
              </li>`
          )
          .join("");

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(report.userInfo.displayName)} 单次训练报告</title>
    <style>
      body { margin: 0; background: #f5f7fb; color: #1f2937; font-family: Arial, "Microsoft YaHei", sans-serif; }
      main { max-width: 920px; margin: 0 auto; padding: 32px 20px; }
      header, section { border: 1px solid #d8e0ec; border-radius: 8px; background: #fff; padding: 20px; margin-bottom: 16px; }
      h1 { margin: 4px 0 10px; font-size: 28px; }
      h2 { margin: 0 0 12px; font-size: 18px; }
      p { line-height: 1.7; }
      .eyebrow, .muted, dt { color: #667085; }
      .notice { color: #334155; background: #eef6f8; border-radius: 8px; padding: 12px; }
      .module-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .module-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
      .module-card span { display: block; margin-top: 6px; color: #667085; }
      dl { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 8px 12px; margin: 0; }
      dd { margin: 0; }
      ul { padding-left: 20px; }
      li + li { margin-top: 10px; }
    </style>
  </head>
  <body>
    <main>
      <header>
        <p class="eyebrow">单次训练报告</p>
        <h1>${escapeHtml(report.userInfo.displayName)} 的训练回顾</h1>
        <p>${escapeHtml(report.narrativeSummary)}</p>
        <p class="notice">${escapeHtml(report.scopeNotice)}</p>
      </header>
      <section>
        <h2>完成模块</h2>
        <div class="module-grid">${moduleCards}</div>
      </section>
      ${sections}
      <section>
        <h2>异常事件</h2>
        <ul>${abnormalEvents}</ul>
      </section>
      <section>
        <h2>本次训练建议</h2>
        <p>${escapeHtml(report.recommendation)}</p>
      </section>
    </main>
  </body>
</html>`;
}

function renderSection(section: SingleSessionReportSection): string {
  return `
    <section>
      <h2>${escapeHtml(section.title)}</h2>
      <dl>
        ${section.rows
          .map(
            (row) => `
              <dt>${escapeHtml(row.label)}</dt>
              <dd>${escapeHtml(row.value)}</dd>`
          )
          .join("")}
      </dl>
    </section>`;
}

function buildReportSections(report: SingleSessionTrainingReport): SingleSessionReportSection[] {
  return [
    {
      title: "用户信息",
      rows: [
        { label: "用户", value: report.userInfo.displayName },
        { label: "年龄段", value: report.userInfo.ageRange ?? "未填写" },
        { label: "监护人同意", value: report.userInfo.guardianConsentLabel ?? "未填写" }
      ]
    },
    {
      title: "训练时间",
      rows: [
        { label: "开始时间", value: formatDateTime(report.sessionInfo.startedAt) },
        { label: "结束时间", value: formatDateTime(report.sessionInfo.endedAt) },
        { label: "训练时长", value: formatDuration(report.sessionInfo.durationSeconds) },
        { label: "完成状态", value: COMPLETION_STATUS_LABELS[report.sessionInfo.completionStatus] }
      ]
    },
    {
      title: "行为表现指标",
      rows: behaviorRows(report.behaviorMetrics)
    },
    {
      title: "EEG 状态摘要",
      rows: eegRows(report.eegSummary)
    },
    {
      title: "音乐适配结果",
      rows: musicRows(report.musicAdaptation)
    }
  ];
}

function behaviorRows(
  metrics: SingleSessionBehaviorMetrics
): Array<{ label: string; value: string }> {
  return [
    optionalRow("总试次", metrics.totalTrials),
    optionalRow("正确次数", metrics.correctCount),
    optionalRateRow("正确率", metrics.accuracyRate),
    optionalRow("漏按次数", metrics.omissionCount),
    optionalRateRow("漏按率", metrics.omissionRate),
    optionalRow("误按次数", metrics.falseAlarmCount),
    optionalRateRow("误按率", metrics.falseAlarmRate),
    optionalRow("平均反应时", metrics.averageReactionTimeMs, "ms"),
    optionalRow("反应时波动", metrics.reactionTimeVariabilityMs, "ms"),
    optionalRateRow("完成度", metrics.completionRate),
    optionalRateRow("路线准确度", metrics.routeAccuracy),
    optionalRow("节拍误差", metrics.timingErrorMs, "ms")
  ].filter((row): row is { label: string; value: string } => row !== null);
}

function eegRows(summary: SingleSessionEegSummary): Array<{ label: string; value: string }> {
  return [
    optionalScoreRow("平均注意指数", summary.averageAttentionIndex),
    optionalScoreRow("平均放松指数", summary.averageRelaxationIndex),
    optionalScoreRow("平均疲劳指数", summary.averageFatigueIndex),
    optionalRateRow("有效数据比例", summary.validSampleRate),
    optionalRow("干扰帧数", summary.artifactCount),
    optionalRow("数据帧数", summary.frameCount),
    summary.qualityStatus
      ? { label: "信号质量", value: EEG_QUALITY_LABELS[summary.qualityStatus] }
      : null
  ].filter((row): row is { label: string; value: string } => row !== null);
}

function musicRows(
  musicAdaptation: SingleSessionMusicAdaptationResult | null
): Array<{ label: string; value: string }> {
  if (!musicAdaptation) {
    return [{ label: "音乐记录", value: "本次未记录音乐适配数据。" }];
  }

  return [
    { label: "音乐", value: musicAdaptation.trackTitle },
    optionalScoreRow("适配评分", musicAdaptation.suitabilityScore),
    { label: "适配标签", value: musicAdaptation.recommendationLabel },
    optionalRow("注意变化", musicAdaptation.attentionChange),
    optionalRow("放松变化", musicAdaptation.relaxationChange),
    optionalRow("疲劳变化", musicAdaptation.fatigueChange),
    musicAdaptation.userFeedbackLabel
      ? { label: "用户反馈", value: musicAdaptation.userFeedbackLabel }
      : null,
    musicAdaptation.nextMusicSuggestion
      ? { label: "下次音乐建议", value: musicAdaptation.nextMusicSuggestion }
      : null
  ].filter((row): row is { label: string; value: string } => row !== null);
}

function buildNarrativeSummary(report: SingleSessionTrainingReport): string {
  const modules = report.completedModules
    .map((module) => module.displayName ?? MODULE_LABELS[module.moduleType])
    .join("、");
  const accuracy = report.behaviorMetrics.accuracyRate;
  const eegQuality = report.eegSummary.qualityStatus
    ? EEG_QUALITY_LABELS[report.eegSummary.qualityStatus]
    : "未记录 EEG 质量";
  const accuracyText =
    accuracy === undefined ? "行为指标已记录" : `行为正确率为 ${formatRate(accuracy)}`;

  return sanitizePlainText(
    `本次完成 ${modules}，训练状态为 ${COMPLETION_STATUS_LABELS[report.sessionInfo.completionStatus]}。${accuracyText}，EEG ${eegQuality}。相关内容用于训练回顾、趋势追踪和后续安排参考。`
  );
}

function buildPdfLines(report: SingleSessionTrainingReport): string[] {
  const lines = [
    "单次训练报告",
    `${report.userInfo.displayName} 的训练回顾`,
    report.narrativeSummary,
    report.scopeNotice,
    ""
  ];

  for (const section of report.sections) {
    lines.push(section.title);
    for (const row of section.rows) {
      lines.push(`${row.label}: ${row.value}`);
    }
    lines.push("");
  }

  lines.push("完成模块");
  for (const module of report.completedModules) {
    lines.push(
      `${module.displayName ?? MODULE_LABELS[module.moduleType]}: ${formatDuration(module.durationSeconds)} / ${
        COMPLETION_STATUS_LABELS[module.completionStatus]
      }`
    );
  }
  lines.push("");
  lines.push("异常事件");
  if (report.abnormalEvents.length === 0) {
    lines.push("本次未记录异常事件。");
  } else {
    for (const event of report.abnormalEvents) {
      lines.push(
        `${EVENT_SEVERITY_LABELS[event.severity]} ${formatDateTime(event.occurredAt)} ${event.message}`
      );
    }
  }
  lines.push("");
  lines.push("本次训练建议");
  lines.push(report.recommendation);

  return lines.flatMap((line) => wrapText(line, 34)).slice(0, 44);
}

function buildSimplePdf(lines: string[]): Uint8Array {
  const content = [
    "BT",
    "/F1 16 Tf",
    "50 790 Td",
    "22 TL",
    ...lines.map((line, index) => `${index === 0 ? "" : "T* "}${encodePdfText(line)} Tj`),
    "ET"
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${asciiByteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [6 0 R] >>",
    "<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 2 >> >>"
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(asciiByteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = asciiByteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

function validateReportInput(input: SingleSessionReportInput): void {
  requireNonEmpty(input.userInfo.userId, "userInfo.userId is required.");
  requireNonEmpty(input.userInfo.displayName, "userInfo.displayName is required.");
  requireNonEmpty(input.sessionInfo.sessionId, "sessionInfo.sessionId is required.");
  requireIsoDate(input.sessionInfo.startedAt, "sessionInfo.startedAt is invalid.");
  requireIsoDate(input.sessionInfo.endedAt, "sessionInfo.endedAt is invalid.");
  if (Date.parse(input.sessionInfo.endedAt) < Date.parse(input.sessionInfo.startedAt)) {
    throw new SingleSessionReportGeneratorError(
      "INVALID_INPUT",
      "sessionInfo.endedAt cannot be earlier than startedAt."
    );
  }
  requireNonNegative(input.sessionInfo.durationSeconds, "sessionInfo.durationSeconds");
  if (input.completedModules.length === 0) {
    throw new SingleSessionReportGeneratorError(
      "INVALID_INPUT",
      "completedModules must include at least one module."
    );
  }
  for (const module of input.completedModules) {
    requireNonNegative(module.durationSeconds, "completedModule.durationSeconds");
  }
  validateBehaviorMetrics(input.behaviorMetrics);
  validateEegSummary(input.eegSummary);
  if (input.musicAdaptation?.suitabilityScore !== undefined) {
    requireScore(input.musicAdaptation.suitabilityScore, "musicAdaptation.suitabilityScore");
  }
  for (const event of input.abnormalEvents) {
    requireIsoDate(event.occurredAt, "abnormalEvent.occurredAt is invalid.");
    requireNonEmpty(event.message, "abnormalEvent.message is required.");
  }
}

function validateBehaviorMetrics(metrics: SingleSessionBehaviorMetrics): void {
  for (const [fieldName, value] of Object.entries(metrics)) {
    if (value === undefined) {
      continue;
    }
    if (
      fieldName.endsWith("Rate") ||
      fieldName === "routeAccuracy" ||
      fieldName === "completionRate"
    ) {
      requireRate(value, `behaviorMetrics.${fieldName}`);
    } else {
      requireNonNegative(value, `behaviorMetrics.${fieldName}`);
    }
  }
}

function validateEegSummary(summary: SingleSessionEegSummary): void {
  for (const scoreField of [
    "averageAttentionIndex",
    "averageRelaxationIndex",
    "averageFatigueIndex"
  ] as const) {
    const value = summary[scoreField];
    if (value !== undefined) {
      requireScore(value, `eegSummary.${scoreField}`);
    }
  }
  if (summary.validSampleRate !== undefined) {
    requireRate(summary.validSampleRate, "eegSummary.validSampleRate");
  }
  if (summary.artifactCount !== undefined) {
    requireNonNegative(summary.artifactCount, "eegSummary.artifactCount");
  }
  if (summary.frameCount !== undefined) {
    requireNonNegative(summary.frameCount, "eegSummary.frameCount");
  }
}

function sanitizeUserInfo(userInfo: SingleSessionReportUserInfo): SingleSessionReportUserInfo {
  const sanitized: SingleSessionReportUserInfo = {
    userId: sanitizePlainText(userInfo.userId),
    displayName: sanitizePlainText(userInfo.displayName)
  };
  if (userInfo.ageRange !== undefined) {
    sanitized.ageRange = sanitizePlainText(userInfo.ageRange);
  }
  if (userInfo.userProfileId !== undefined) {
    sanitized.userProfileId = sanitizePlainText(userInfo.userProfileId);
  }
  if (userInfo.guardianConsentLabel !== undefined) {
    sanitized.guardianConsentLabel = sanitizePlainText(userInfo.guardianConsentLabel);
  }
  return sanitized;
}

function sanitizeCompletedModule(
  module: CompletedTrainingModuleSummary
): CompletedTrainingModuleSummary {
  const sanitized: CompletedTrainingModuleSummary = {
    moduleType: module.moduleType,
    durationSeconds: module.durationSeconds,
    completionStatus: module.completionStatus
  };
  if (module.displayName !== undefined) {
    sanitized.displayName = sanitizePlainText(module.displayName);
  }
  return sanitized;
}

function sanitizeMusicAdaptation(
  musicAdaptation: SingleSessionMusicAdaptationResult
): SingleSessionMusicAdaptationResult {
  const sanitized: SingleSessionMusicAdaptationResult = {
    trackTitle: sanitizePlainText(musicAdaptation.trackTitle),
    recommendationLabel: sanitizePlainText(musicAdaptation.recommendationLabel)
  };
  if (musicAdaptation.suitabilityScore !== undefined) {
    sanitized.suitabilityScore = musicAdaptation.suitabilityScore;
  }
  if (musicAdaptation.attentionChange !== undefined) {
    sanitized.attentionChange = musicAdaptation.attentionChange;
  }
  if (musicAdaptation.relaxationChange !== undefined) {
    sanitized.relaxationChange = musicAdaptation.relaxationChange;
  }
  if (musicAdaptation.fatigueChange !== undefined) {
    sanitized.fatigueChange = musicAdaptation.fatigueChange;
  }
  if (musicAdaptation.userFeedbackLabel !== undefined) {
    sanitized.userFeedbackLabel = sanitizePlainText(musicAdaptation.userFeedbackLabel);
  }
  if (musicAdaptation.nextMusicSuggestion !== undefined) {
    sanitized.nextMusicSuggestion = sanitizePlainText(musicAdaptation.nextMusicSuggestion);
  }
  return sanitized;
}

function sanitizeAbnormalEvent(event: SingleSessionAbnormalEvent): SingleSessionAbnormalEvent {
  return {
    eventType: event.eventType,
    occurredAt: event.occurredAt,
    severity: event.severity,
    message: sanitizePlainText(event.message)
  };
}

function sanitizePlainText(value: string): string {
  return FORBIDDEN_REPLACEMENTS.reduce(
    (current, [forbiddenTerm, replacement]) => current.replaceAll(forbiddenTerm, replacement),
    value.trim()
  );
}

function assertNoForbiddenTerms(value: string): void {
  const matched = FORBIDDEN_REPLACEMENTS.map(([term]) => term).find((term) => value.includes(term));
  if (matched) {
    throw new SingleSessionReportGeneratorError(
      "UNSAFE_REPORT_TEXT",
      `Report output contains restricted wording: ${matched}.`
    );
  }
}

function optionalRow(
  label: string,
  value: number | undefined,
  suffix = ""
): { label: string; value: string } | null {
  return value === undefined ? null : { label, value: `${formatNumber(value)}${suffix}` };
}

function optionalRateRow(
  label: string,
  value: number | undefined
): { label: string; value: string } | null {
  return value === undefined ? null : { label, value: formatRate(value) };
}

function optionalScoreRow(
  label: string,
  value: number | undefined
): { label: string; value: string } | null {
  return value === undefined ? null : { label, value: `${formatNumber(value)}/100` };
}

function formatRate(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes === 0) {
    return `${remainingSeconds} 秒`;
  }
  return remainingSeconds === 0 ? `${minutes} 分钟` : `${minutes} 分 ${remainingSeconds} 秒`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai"
  }).format(new Date(value));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function wrapText(value: string, maxLength: number): string[] {
  if (value.length <= maxLength) {
    return [value];
  }

  const lines: string[] = [];
  for (let start = 0; start < value.length; start += maxLength) {
    lines.push(value.slice(start, start + maxLength));
  }
  return lines;
}

function encodePdfText(value: string): string {
  const hex = ["feff"];
  for (let index = 0; index < value.length; index += 1) {
    hex.push(value.charCodeAt(index).toString(16).padStart(4, "0"));
  }
  return `<${hex.join("")}>`;
}

function asciiByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function requireNonEmpty(value: string, message: string): void {
  if (value.trim().length === 0) {
    throw new SingleSessionReportGeneratorError("INVALID_INPUT", message);
  }
}

function requireIsoDate(value: string, message: string): void {
  if (Number.isNaN(Date.parse(value))) {
    throw new SingleSessionReportGeneratorError("INVALID_INPUT", message);
  }
}

function requireRate(value: number, fieldName: string): void {
  requireFiniteNumber(value, fieldName);
  if (value < 0 || value > 1) {
    throw new SingleSessionReportGeneratorError(
      "INVALID_INPUT",
      `${fieldName} must be between 0 and 1.`
    );
  }
}

function requireScore(value: number, fieldName: string): void {
  requireFiniteNumber(value, fieldName);
  if (value < 0 || value > 100) {
    throw new SingleSessionReportGeneratorError(
      "INVALID_INPUT",
      `${fieldName} must be between 0 and 100.`
    );
  }
}

function requireNonNegative(value: number, fieldName: string): void {
  requireFiniteNumber(value, fieldName);
  if (value < 0) {
    throw new SingleSessionReportGeneratorError(
      "INVALID_INPUT",
      `${fieldName} must be non-negative.`
    );
  }
}

function requireFiniteNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new SingleSessionReportGeneratorError("INVALID_INPUT", `${fieldName} must be finite.`);
  }
}
