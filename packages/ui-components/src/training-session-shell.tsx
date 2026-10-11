import type { CSSProperties, ReactNode } from "react";
import type { EEGQualityStatus } from "@neuro-cog-rehab/shared-types";

import {
  CognitiveStateRadar,
  createMockEEGFeatureFrames,
  NeuroMetricRing,
  ProfessionalEEGWavePanel,
  SignalQualityMeter,
  type EEGSessionTimelineEvent,
  type EEGVisualizationFrame
} from "./professional-eeg-visualization.js";
import { TRAINING_SESSION_SHELL_CSS } from "./training-session-shell.css.js";

export type TrainingSafetyTone = "neutral" | "good" | "watch" | "pause" | "complete";
export type TrainingSessionVariant = "music" | "attention" | "inhibition" | "rhythm";

export interface TrainingMonitorItem {
  label: string;
  value: string;
  helperText?: string | undefined;
  tone?: TrainingSafetyTone | undefined;
}

export interface TrainingEEGStatus {
  connectionLabel: string;
  signalQualityLabel: string;
  attentionScore?: number | null | undefined;
  relaxationScore?: number | null | undefined;
  fatigueScore?: number | null | undefined;
  stabilityScore?: number | null | undefined;
  engagementScore?: number | null | undefined;
  signalQualityScore?: number | null | undefined;
  qualityStatus?: EEGQualityStatus | undefined;
  frames?: EEGVisualizationFrame[] | undefined;
  timelineEvents?: EEGSessionTimelineEvent[] | undefined;
  paused?: boolean | undefined;
  safetyMode?: boolean | undefined;
  tone: TrainingSafetyTone;
  message?: string | undefined;
}

export interface TrainingTopBarProps {
  moduleName: string;
  moduleSubtitle: string;
  statusLabel: string;
  remainingTimeLabel: string;
  difficultyLabel: string;
  eegStatus: TrainingEEGStatus;
  progressPercent: number;
  primaryActionLabel?: string | undefined;
  primaryActionDisabled?: boolean | undefined;
  onPrimaryAction?: (() => void) | undefined;
  pauseDisabled?: boolean | undefined;
  exitDisabled?: boolean | undefined;
  onPause?: (() => void) | undefined;
  onExit?: (() => void) | undefined;
}

export interface TrainingFocusStageProps {
  children: ReactNode;
  safetyPrompt?: ReactNode | undefined;
}

export interface TrainingSideMonitorProps {
  eegStatus: TrainingEEGStatus;
  monitorItems: TrainingMonitorItem[];
  progressPercent: number;
}

export interface TrainingPauseOverlayProps {
  isVisible: boolean;
  title?: string | undefined;
  message?: string | undefined;
  onResume?: (() => void) | undefined;
  onExit?: (() => void) | undefined;
}

export interface TrainingCompleteOverlayProps {
  isVisible: boolean;
  title?: string | undefined;
  message?: string | undefined;
  onRestart?: (() => void) | undefined;
}

export interface EEGSafetyPromptProps {
  tone: TrainingSafetyTone;
  title: string;
  message: string;
}

export interface DifficultyBadgeProps {
  label: string;
}

export interface SessionProgressRingProps {
  percent: number;
  label?: string | undefined;
}

export interface TrainingSessionShellProps extends TrainingTopBarProps {
  children: ReactNode;
  monitorItems: TrainingMonitorItem[];
  setupPanel?: ReactNode | undefined;
  resultPanel?: ReactNode | undefined;
  safetyPrompt?: ReactNode | undefined;
  isPaused?: boolean | undefined;
  isCompleted?: boolean | undefined;
  onResume?: (() => void) | undefined;
  onRestart?: (() => void) | undefined;
  pauseTitle?: string | undefined;
  pauseMessage?: string | undefined;
  completeTitle?: string | undefined;
  completeMessage?: string | undefined;
  variant?: TrainingSessionVariant | undefined;
}

export function TrainingSessionShell(props: TrainingSessionShellProps): JSX.Element {
  return (
    <section
      aria-label={`${props.moduleName}训练空间`}
      className="ncr-training-session"
      data-training-mode="true"
      data-variant={props.variant ?? "attention"}
    >
      <TrainingSessionShellStyles />
      <TrainingTopBar {...props} />
      {props.setupPanel ? (
        <div className="ncr-training-session__setup">{props.setupPanel}</div>
      ) : null}
      <div className="ncr-training-session__workspace">
        <TrainingFocusStage safetyPrompt={props.safetyPrompt}>
          {props.children}
          <TrainingPauseOverlay
            isVisible={props.isPaused ?? false}
            message={props.pauseMessage}
            onExit={props.onExit}
            onResume={props.onResume}
            title={props.pauseTitle}
          />
          <TrainingCompleteOverlay
            isVisible={props.isCompleted ?? false}
            message={props.completeMessage}
            onRestart={props.onRestart}
            title={props.completeTitle}
          />
        </TrainingFocusStage>
        <TrainingSideMonitor
          eegStatus={props.eegStatus}
          monitorItems={props.monitorItems}
          progressPercent={props.progressPercent}
        />
      </div>
      {props.resultPanel ? (
        <div className="ncr-training-session__result">{props.resultPanel}</div>
      ) : null}
    </section>
  );
}

export function TrainingTopBar(props: TrainingTopBarProps): JSX.Element {
  return (
    <header aria-label="训练状态栏" className="ncr-training-topbar">
      <div className="ncr-training-topbar__identity">
        <span>当前训练模块</span>
        <strong>{props.moduleName}</strong>
        <p>{props.moduleSubtitle}</p>
      </div>
      <div className="ncr-training-topbar__status">
        <SessionProgressRing label="训练进度" percent={props.progressPercent} />
        <div>
          <span>剩余时间</span>
          <strong>{props.remainingTimeLabel}</strong>
        </div>
        <DifficultyBadge label={props.difficultyLabel} />
        <div className="ncr-training-topbar__eeg" data-tone={props.eegStatus.tone}>
          <span>EEG连接</span>
          <strong>{props.eegStatus.connectionLabel}</strong>
          <small>{props.eegStatus.signalQualityLabel}</small>
        </div>
      </div>
      <div aria-label="训练控制" className="ncr-training-topbar__actions" role="group">
        {props.primaryActionLabel ? (
          <button
            className="ncr-training-topbar__primary"
            disabled={props.primaryActionDisabled}
            onClick={props.onPrimaryAction}
            type="button"
          >
            {props.primaryActionLabel}
          </button>
        ) : null}
        <button disabled={props.pauseDisabled} onClick={props.onPause} type="button">
          暂停
        </button>
        <button disabled={props.exitDisabled} onClick={props.onExit} type="button">
          退出
        </button>
      </div>
    </header>
  );
}

export function TrainingFocusStage({
  children,
  safetyPrompt
}: TrainingFocusStageProps): JSX.Element {
  return (
    <section aria-label="中央训练区域" className="ncr-training-focus-stage">
      {safetyPrompt ? <div className="ncr-training-focus-stage__prompt">{safetyPrompt}</div> : null}
      {children}
    </section>
  );
}

export function TrainingSideMonitor({
  eegStatus,
  monitorItems,
  progressPercent
}: TrainingSideMonitorProps): JSX.Element {
  const qualityStatus = eegStatus.qualityStatus ?? resolveQualityStatusFromTone(eegStatus.tone);
  const safetyMode = eegStatus.safetyMode ?? true;
  const frames =
    eegStatus.frames ??
    createMockEEGFeatureFrames({
      latest: buildCurrentEegVisualizationFrame(eegStatus, qualityStatus)
    });
  const currentFrame = buildCurrentEegVisualizationFrame(eegStatus, qualityStatus);

  return (
    <aside aria-label="训练状态反馈" className="ncr-training-side-monitor">
      <header>
        <span>实时状态反馈</span>
        <strong>{eegStatus.message ?? "保持舒适节奏，必要时可以暂停休息。"}</strong>
      </header>
      <div className="ncr-training-side-monitor__eeg-pro" data-tone={eegStatus.tone}>
        <ProfessionalEEGWavePanel
          compact
          frames={frames}
          paused={eegStatus.paused}
          safetyMode={safetyMode}
          signalQualityStatus={qualityStatus}
          title="EEG 多通道趋势"
        />
        <SignalQualityMeter
          compact
          signalQuality={eegStatus.signalQualityScore}
          status={qualityStatus}
        />
        <div className="ncr-training-side-monitor__rings" aria-label="EEG状态圆环">
          <NeuroMetricRing
            label="注意指数"
            paused={eegStatus.paused}
            safetyMode={safetyMode}
            tone="attention"
            value={eegStatus.attentionScore}
          />
          <NeuroMetricRing
            label="放松指数"
            paused={eegStatus.paused}
            safetyMode={safetyMode}
            tone="calm"
            value={eegStatus.relaxationScore}
          />
          <NeuroMetricRing
            label="疲劳趋势"
            paused={eegStatus.paused}
            safetyMode={safetyMode}
            tone="fatigue"
            value={eegStatus.fatigueScore}
          />
        </div>
        <CognitiveStateRadar compact frame={currentFrame} safetyMode={safetyMode} />
      </div>
      <div className="ncr-training-side-monitor__progress">
        <SessionProgressRing label="总进度" percent={progressPercent} />
        <span>{Math.round(Math.max(0, Math.min(100, progressPercent)))}%</span>
      </div>
      <div className="ncr-training-side-monitor__items">
        {monitorItems.map((item) => (
          <article data-tone={item.tone ?? "neutral"} key={`${item.label}-${item.value}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            {item.helperText ? <small>{item.helperText}</small> : null}
          </article>
        ))}
      </div>
    </aside>
  );
}

export function TrainingPauseOverlay({
  isVisible,
  title = "训练已暂停",
  message = "可以先调整呼吸或设备佩戴，准备好后再继续。",
  onResume,
  onExit
}: TrainingPauseOverlayProps): JSX.Element | null {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="ncr-training-overlay" role="status">
      <article>
        <span>Pause</span>
        <h3>{title}</h3>
        <p>{message}</p>
        <div>
          <button onClick={onResume} type="button">
            继续训练
          </button>
          <button className="is-secondary" onClick={onExit} type="button">
            结束本次
          </button>
        </div>
      </article>
    </div>
  );
}

export function TrainingCompleteOverlay({
  isVisible,
  title = "本次训练已完成",
  message = "训练结果已生成，可用于训练记录和趋势回顾。",
  onRestart
}: TrainingCompleteOverlayProps): JSX.Element | null {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="ncr-training-overlay ncr-training-overlay--complete" role="status">
      <article>
        <span>Complete</span>
        <h3>{title}</h3>
        <p>{message}</p>
        {onRestart ? (
          <div>
            <button onClick={onRestart} type="button">
              重新开始
            </button>
          </div>
        ) : null}
      </article>
    </div>
  );
}

export function EEGSafetyPrompt({ tone, title, message }: EEGSafetyPromptProps): JSX.Element {
  return (
    <aside
      className="ncr-eeg-safety-prompt"
      data-tone={tone}
      role={tone === "pause" ? "alert" : "status"}
    >
      <strong>{title}</strong>
      <span>{message}</span>
    </aside>
  );
}

export function DifficultyBadge({ label }: DifficultyBadgeProps): JSX.Element {
  return (
    <div className="ncr-difficulty-badge">
      <span>当前难度</span>
      <strong>{label}</strong>
    </div>
  );
}

export function SessionProgressRing({
  percent,
  label = "进度"
}: SessionProgressRingProps): JSX.Element {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div
      aria-label={`${label}${safePercent}%`}
      className="ncr-session-progress-ring"
      style={{ "--session-progress": `${safePercent}%` } as CSSProperties}
    >
      <span>{safePercent}%</span>
    </div>
  );
}

export function TrainingSessionShellStyles(): JSX.Element {
  return <style>{TRAINING_SESSION_SHELL_CSS}</style>;
}

function resolveQualityStatusFromTone(tone: TrainingSafetyTone): EEGQualityStatus {
  if (tone === "pause") {
    return "disconnected";
  }
  if (tone === "watch") {
    return "unstable";
  }
  return "good";
}

function buildCurrentEegVisualizationFrame(
  eegStatus: TrainingEEGStatus,
  qualityStatus: EEGQualityStatus
): EEGVisualizationFrame {
  return {
    timestamp: new Date().toISOString(),
    qualityStatus,
    ...(typeof eegStatus.attentionScore === "number"
      ? { attentionScore: eegStatus.attentionScore }
      : {}),
    ...(typeof eegStatus.relaxationScore === "number"
      ? { relaxationScore: eegStatus.relaxationScore }
      : {}),
    ...(typeof eegStatus.fatigueScore === "number" ? { fatigueScore: eegStatus.fatigueScore } : {}),
    ...(typeof eegStatus.stabilityScore === "number"
      ? { stabilityScore: eegStatus.stabilityScore }
      : {}),
    ...(typeof eegStatus.engagementScore === "number"
      ? { engagementScore: eegStatus.engagementScore }
      : {}),
    ...(typeof eegStatus.signalQualityScore === "number"
      ? { signalQuality: eegStatus.signalQualityScore }
      : {})
  };
}
