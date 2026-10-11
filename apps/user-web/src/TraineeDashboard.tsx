import { useMemo, useState } from "react";

import {
  CognitiveStatusRing,
  EEGDisconnectedState,
  EEGWaveCanvas,
  SoftMotionWrapper,
  SystemHealthIndicator,
  TrainingMissionCard,
  TrendLineChart,
  type EEGWaveFrame
} from "@neuro-cog-rehab/ui-components";

import {
  buildTraineeDashboardViewModel,
  type TraineeDashboardData,
  type TraineeDashboardDeviceStatus,
  type TraineeDashboardLastFeedback,
  type TraineeDashboardMusicRecommendation,
  type TraineeDashboardSafetyTip,
  type TraineeDashboardTask,
  type TraineeDashboardTherapistMessage,
  type TraineeDashboardTrendPoint,
  type TraineeDashboardViewModel,
  type TraineeDashboardWeeklyProgress
} from "./trainee-dashboard-model.js";

export interface TraineeDashboardProps {
  data: TraineeDashboardData;
  onStartTraining: () => void;
}

export interface MainTrainingMissionCardProps {
  viewModel: TraineeDashboardViewModel;
  startMessage: string | null;
  onStartTraining: () => void;
}

export interface RealtimeCognitiveStatusPanelProps {
  status: TraineeDashboardDeviceStatus;
}

export interface WeeklyTrainingProgressProps {
  progress: TraineeDashboardWeeklyProgress;
  weeklyCompletionRate: number;
  minuteCompletionRate: number;
}

export interface CognitiveTrendStripProps {
  feedback: TraineeDashboardLastFeedback | null;
  points: TraineeDashboardTrendPoint[];
}

export interface MusicTherapyPreviewCardProps {
  music: TraineeDashboardMusicRecommendation;
}

export interface TherapistSuggestionCardProps {
  message: TraineeDashboardTherapistMessage | null;
  restReminder: string;
}

export interface SafetyNoticeCardProps {
  safetyTips: TraineeDashboardSafetyTip[];
  startStateReason: string | null;
}

export function TraineeDashboard(props: TraineeDashboardProps): JSX.Element {
  return <TraineeCognitiveCockpit {...props} />;
}

export function TraineeCognitiveCockpit({
  data,
  onStartTraining
}: TraineeDashboardProps): JSX.Element {
  const viewModel = useMemo(() => buildTraineeDashboardViewModel(data), [data]);
  const [startMessage, setStartMessage] = useState<string | null>(null);

  const handleStartTraining = () => {
    if (!viewModel.startState.canStart) {
      setStartMessage(viewModel.startState.reason);
      return;
    }

    setStartMessage(null);
    onStartTraining();
  };

  return (
    <main className="trainee-cockpit" aria-labelledby="trainee-cockpit-title">
      <section className="trainee-cockpit-hero" aria-label="今日训练欢迎区">
        <div className="trainee-cockpit-hero__copy">
          <p className="trainee-cockpit__eyebrow">Cognitive Training Cockpit</p>
          <h1 id="trainee-cockpit-title">{viewModel.traineeName}，今天进入认知训练舱</h1>
          <p>{viewModel.statusSummary}</p>
        </div>

        <div className="trainee-cockpit-hero__status" aria-label="今日训练状态">
          <StatusTile label="今日训练" value={buildTodayStatusLabel(viewModel)} />
          <StatusTile label="预计时长" value={`${viewModel.totalPlannedMinutes} 分钟`} />
          <StatusTile
            label="安全提醒"
            value={viewModel.startState.canStart ? "可开始" : "先检查"}
          />
        </div>

        <TherapistSuggestionCard
          message={viewModel.therapistMessage}
          restReminder={viewModel.restReminder}
        />
        <SafetyNoticeCard
          safetyTips={viewModel.safetyTips}
          startStateReason={viewModel.startState.reason}
        />
      </section>

      <section className="trainee-cockpit__primary-grid">
        <SoftMotionWrapper>
          <MainTrainingMissionCard
            onStartTraining={handleStartTraining}
            startMessage={startMessage}
            viewModel={viewModel}
          />
        </SoftMotionWrapper>

        <SoftMotionWrapper delayMs={80}>
          <aside className="trainee-cockpit__right-rail" aria-label="实时状态舱">
            <RealtimeCognitiveStatusPanel status={viewModel.deviceStatus} />
            <MusicTherapyPreviewCard music={viewModel.recommendedMusic} />
          </aside>
        </SoftMotionWrapper>
      </section>

      <section className="trainee-cockpit__trend-grid" aria-label="本周训练趋势">
        <WeeklyTrainingProgress
          minuteCompletionRate={viewModel.minuteCompletionRate}
          progress={viewModel.weeklyProgress}
          weeklyCompletionRate={viewModel.weeklyCompletionRate}
        />
        <CognitiveTrendStrip feedback={viewModel.lastFeedback} points={viewModel.attentionTrend} />
      </section>

      <section className="trainee-cockpit-encouragement" aria-label="训练节奏建议">
        <span>本周训练完成较稳定</span>
        <p>
          继续保持短时、稳定、可暂停的训练节奏。下次建议先完成设备检查，再按提示进入音乐准备和任务练习。
        </p>
      </section>
    </main>
  );
}

export function MainTrainingMissionCard({
  viewModel,
  startMessage,
  onStartTraining
}: MainTrainingMissionCardProps): JSX.Element {
  const taskCompletionPercent =
    viewModel.todayTasks.length === 0
      ? 0
      : Math.round((viewModel.completedTaskCount / viewModel.todayTasks.length) * 100);

  return (
    <TrainingMissionCard
      actionDescription="进入设备检查与训练流程"
      actionLabel="开始今日训练"
      className="cockpit-mission-card"
      emptyMessage="治疗师配置后，这里会显示训练顺序、模块时长和开始按钮。也可以先查看已有训练记录。"
      metrics={[
        {
          id: "completion",
          label: "完成情况",
          value: `${viewModel.completedTaskCount}/${viewModel.todayTasks.length}`
        },
        { id: "duration", label: "预计时长", value: `${viewModel.totalPlannedMinutes} 分钟` },
        { id: "music", label: "推荐音乐", value: viewModel.recommendedMusic.tagLabel },
        { id: "state", label: "当前状态", value: buildReadinessLabel(viewModel.deviceStatus) }
      ]}
      onStart={onStartTraining}
      progressPercent={taskCompletionPercent}
      startHint={
        startMessage ??
        "开始后会先检查 EEG 设备，再进入静息准备、音乐疗愈和认知训练模块。训练中可随时暂停。"
      }
      subtitle={
        viewModel.todayTasks.length > 0
          ? `共 ${viewModel.todayTasks.length} 个模块，建议按顺序完成`
          : "配置后将显示今日训练模块、时长和开始入口。"
      }
      tasks={viewModel.todayTasks.map((task) => ({
        id: task.id,
        title: task.title,
        moduleName: task.moduleName,
        durationLabel: `${task.durationMinutes} 分钟`,
        difficultyLabel: task.difficultyLabel,
        focusArea: task.focusArea,
        statusLabel: buildTaskStatusLabel(task.status)
      }))}
      title={viewModel.primaryTask?.title ?? "等待治疗师配置今日训练计划"}
    />
  );
}

export function RealtimeCognitiveStatusPanel({
  status
}: RealtimeCognitiveStatusPanelProps): JSX.Element {
  if (status.connectionStatus === "disconnected" || status.signalQuality === "offline") {
    return <EEGDisconnectedState />;
  }

  const attention = clampScore(status.attentionScore);
  const relaxation = clampScore(status.relaxationScore);
  const fatigue = clampScore(status.fatigueScore);

  return (
    <section className="cockpit-status-panel" aria-label="实时认知状态舱">
      <header className="cockpit-panel-header">
        <div>
          <p className="trainee-cockpit__eyebrow">Realtime Status</p>
          <h2>{buildConnectionLabel(status.connectionStatus)}</h2>
        </div>
        <span className="cockpit-state-badge" data-state={status.signalQuality}>
          {buildSignalLabel(status.signalQuality)}
        </span>
      </header>

      <EEGWaveCanvas
        ariaLabel="训练前实时 EEG 摘要波形"
        frames={buildDashboardEEGFrames(status)}
        height={112}
        qualityStatus={mapDashboardSignalQuality(status.signalQuality)}
        reducedIntensity
      />

      <CognitiveStatusRing
        attentionScore={attention}
        className="cockpit-status-rings"
        fatigueScore={fatigue}
        relaxationScore={relaxation}
      />

      <SystemHealthIndicator
        items={[
          {
            id: "signal",
            label: "信号质量",
            status: status.signalQuality === "good" ? "good" : "warning",
            value: buildSignalLabel(status.signalQuality)
          },
          {
            id: "latency",
            label: "数据延迟",
            status: status.latencyMs !== null && status.latencyMs > 900 ? "warning" : "good",
            value: status.latencyMs === null ? "等待数据" : `${Math.round(status.latencyMs)}ms`
          }
        ]}
        layout="stacked"
      />
    </section>
  );
}

export function WeeklyTrainingProgress({
  progress,
  weeklyCompletionRate,
  minuteCompletionRate
}: WeeklyTrainingProgressProps): JSX.Element {
  return (
    <section className="cockpit-trend-card cockpit-weekly-progress">
      <header className="cockpit-panel-header">
        <div>
          <p className="trainee-cockpit__eyebrow">Weekly Progress</p>
          <h2>本周训练完成率 {weeklyCompletionRate}%</h2>
        </div>
        <span className="cockpit-state-badge">连续 {progress.streakDays} 天</span>
      </header>

      <div className="cockpit-progress-lines">
        <ProgressLine
          label="次数进度"
          percent={weeklyCompletionRate}
          value={`${progress.completedSessions}/${progress.plannedSessions}`}
        />
        <ProgressLine
          label="时长进度"
          percent={minuteCompletionRate}
          value={`${progress.completedMinutes}/${progress.targetMinutes} 分钟`}
        />
      </div>

      <div className="cockpit-week-bars" aria-label="最近 7 天训练完成情况">
        {progress.days.map((day) => {
          const percent =
            day.plannedMinutes === 0
              ? 0
              : Math.min(100, Math.round((day.completedMinutes / day.plannedMinutes) * 100));

          return (
            <div className="cockpit-week-bars__day" key={day.dayLabel}>
              <span>{day.dayLabel}</span>
              <div>
                <i style={{ height: `${Math.max(6, percent)}%` }} />
              </div>
              <strong>{day.completedMinutes}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function CognitiveTrendStrip({ feedback, points }: CognitiveTrendStripProps): JSX.Element {
  return (
    <section className="cockpit-trend-card cockpit-trend-strip">
      <header className="cockpit-panel-header">
        <div>
          <p className="trainee-cockpit__eyebrow">Training Trend</p>
          <h2>训练状态趋势</h2>
        </div>
        <span className="cockpit-state-badge">最近 7 天</span>
      </header>

      <div className="cockpit-mini-chart-grid">
        <TrendLineChart
          categories={points.map((point) => point.dayLabel)}
          helperText="趋势仅用于训练记录回顾和下次训练节奏参考。"
          series={[
            {
              name: "注意稳定性",
              values: points.map((point) => point.attentionStabilityScore),
              tone: "medicalBlue"
            },
            {
              name: "点击反应",
              values: points.map((point) => point.reactionConsistencyScore),
              tone: "cyanGreen"
            },
            {
              name: "音乐适配",
              values: buildDerivedMusicTrendValues(points),
              tone: "palePurple"
            }
          ]}
          title="最近 7 天训练趋势"
          yAxisLabel="0-100"
        />
      </div>

      <article className="cockpit-recent-record">
        <span>最近训练记录</span>
        <strong>{feedback?.moduleName ?? "暂无训练记录"}</strong>
        <p>
          {feedback
            ? `${feedback.completedAtLabel} · ${feedback.summary}`
            : "完成一次训练后，这里会显示本次表现摘要和下次训练建议。"}
        </p>
        {feedback ? <em>{feedback.nextSuggestion}</em> : null}
      </article>
    </section>
  );
}

export function MusicTherapyPreviewCard({ music }: MusicTherapyPreviewCardProps): JSX.Element {
  return (
    <section className="cockpit-music-preview" aria-label="今日推荐音乐">
      <header className="cockpit-panel-header">
        <div>
          <p className="trainee-cockpit__eyebrow">Music Prep</p>
          <h2>{music.title}</h2>
        </div>
      </header>
      <div className="cockpit-music-preview__wave" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="cockpit-music-preview__meta">
        <span>{music.tagLabel}</span>
        <span>{music.durationMinutes} 分钟</span>
        <span>{music.bpm} BPM</span>
        <span>{music.intensityLabel}</span>
      </div>
      <p>{music.recommendedScene}</p>
    </section>
  );
}

export function TherapistSuggestionCard({
  message,
  restReminder
}: TherapistSuggestionCardProps): JSX.Element {
  return (
    <article className="cockpit-compact-card cockpit-therapist-suggestion">
      <span>治疗师建议</span>
      <strong>{message?.therapistName ?? "暂无新建议"}</strong>
      <p>{message?.message ?? restReminder}</p>
    </article>
  );
}

export function SafetyNoticeCard({
  safetyTips,
  startStateReason
}: SafetyNoticeCardProps): JSX.Element {
  const primaryTip = safetyTips[0];

  return (
    <article className="cockpit-compact-card cockpit-safety-notice">
      <span>安全提醒</span>
      <strong>{startStateReason ?? primaryTip?.title ?? "按舒适节奏训练"}</strong>
      <p>
        {startStateReason ??
          primaryTip?.message ??
          "如感觉疲劳、头痛或明显不适，可以暂停并告知家长或治疗师。"}
      </p>
    </article>
  );
}

function StatusTile({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="cockpit-status-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProgressLine({
  label,
  percent,
  value
}: {
  label: string;
  percent: number;
  value: string;
}): JSX.Element {
  return (
    <div className="cockpit-progress-line">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="cockpit-progress-line__track" aria-label={`${label} ${percent}%`}>
        <i style={{ width: `${clamp(percent, 0, 100)}%` }} />
      </div>
    </div>
  );
}

function buildTodayStatusLabel(viewModel: TraineeDashboardViewModel): string {
  if (viewModel.todayTasks.length === 0) {
    return "待配置";
  }

  if (viewModel.completedTaskCount === viewModel.todayTasks.length) {
    return "今日已完成";
  }

  return "准备训练";
}

function buildReadinessLabel(status: TraineeDashboardDeviceStatus): string {
  if (status.connectionStatus === "disconnected" || status.signalQuality === "offline") {
    return "先连接设备";
  }

  if (status.signalQuality === "unstable") {
    return "先调整佩戴";
  }

  if (status.fatigueScore !== null && status.fatigueScore >= 65) {
    return "建议先休息";
  }

  return "适合短时训练";
}

function buildTaskStatusLabel(status: TraineeDashboardTask["status"]): string {
  switch (status) {
    case "completed":
      return "已完成";
    case "ready":
      return "可开始";
    case "waiting":
      return "稍后进行";
  }
}

function buildConnectionLabel(status: TraineeDashboardDeviceStatus["connectionStatus"]): string {
  switch (status) {
    case "connected":
      return "设备连接正常";
    case "connecting":
      return "设备连接中";
    case "disconnected":
      return "设备未连接";
  }
}

function buildSignalLabel(signal: TraineeDashboardDeviceStatus["signalQuality"]): string {
  switch (signal) {
    case "good":
      return "信号稳定";
    case "unstable":
      return "建议调整佩戴";
    case "offline":
      return "等待数据";
  }
}

function mapDashboardSignalQuality(
  signalQuality: TraineeDashboardDeviceStatus["signalQuality"]
): EEGWaveFrame["qualityStatus"] {
  if (signalQuality === "offline") {
    return "disconnected";
  }
  if (signalQuality === "unstable") {
    return "unstable";
  }
  return "good";
}

function buildDashboardEEGFrames(status: TraineeDashboardDeviceStatus): EEGWaveFrame[] {
  const attention = status.attentionScore ?? 62;
  const relaxation = status.relaxationScore ?? 54;
  const fatigue = status.fatigueScore ?? 36;
  const qualityStatus = mapDashboardSignalQuality(status.signalQuality);

  return Array.from({ length: 40 }, (_, index) => {
    const phase = index / 4;
    return {
      id: `dashboard-eeg-${index}`,
      sessionId: "dashboard-preview",
      timestamp: new Date(Date.now() - (40 - index) * 1000).toISOString(),
      source: "simulator",
      windowSeconds: 1,
      samplingRateHz: 128,
      attentionIndex: clamp(Math.round(attention + Math.sin(phase) * 5), 0, 100),
      relaxationIndex: clamp(Math.round(relaxation + Math.cos(phase) * 4), 0, 100),
      fatigueScore: clamp(Math.round(fatigue + Math.sin(phase / 1.4) * 3), 0, 100),
      signalQuality:
        status.signalQuality === "good" ? 92 : status.signalQuality === "unstable" ? 68 : 0,
      qualityStatus,
      artifactFlag: status.signalQuality !== "good",
      bandPower: {
        delta: 0.18,
        theta: 0.38,
        alpha: 0.5,
        beta: 0.44,
        gamma: 0.12
      }
    };
  });
}

function clampScore(value: number | null): number | null {
  return value === null ? null : clamp(Math.round(value), 0, 100);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildDerivedMusicTrendValues(points: TraineeDashboardTrendPoint[]): number[] {
  return points.map((point) =>
    clamp(
      Math.round(point.attentionStabilityScore * 0.48 + point.reactionConsistencyScore * 0.32 + 14),
      0,
      100
    )
  );
}
