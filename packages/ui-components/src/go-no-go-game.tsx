import {
  createGameSessionCore,
  type CountdownState,
  type GameSessionCore
} from "@neuro-cog-rehab/game-core";
import type { GoNoGoGameResult } from "@neuro-cog-rehab/shared-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildEEGStatusPanelViewModel,
  type EEGStatusPanelInput
} from "./eeg-status-panel-model.js";
import {
  buildGoNoGoStimulus,
  calculateGoNoGoMetrics,
  createGoNoGoGameResult,
  getGoNoGoDifficultyConfig,
  GO_NO_GO_DIFFICULTIES
} from "./go-no-go-game-model.js";
import type {
  GoNoGoDifficulty,
  GoNoGoDifficultyConfig,
  GoNoGoGameProps,
  GoNoGoMetrics,
  GoNoGoStimulus
} from "./go-no-go-game-types.js";
import {
  EEGSafetyPrompt,
  TrainingSessionShell,
  type TrainingEEGStatus,
  type TrainingMonitorItem,
  type TrainingSafetyTone
} from "./training-session-shell.js";

const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 420;

type GoNoGoPhase = "ready" | "running" | "paused" | "completed";
type PauseReason = "manual" | "eeg";

const EEG_READY_STATUS: EEGStatusPanelInput = {
  connectionStatus: "connected",
  qualityStatus: "good",
  attentionScore: 66,
  relaxationScore: 48,
  fatigueScore: 32,
  latencyMs: 180
};

const EEG_INTERRUPTED_STATUS: EEGStatusPanelInput = {
  connectionStatus: "disconnected",
  qualityStatus: "disconnected",
  attentionScore: null,
  relaxationScore: null,
  fatigueScore: null,
  latencyMs: 3200
};

export function GoNoGoGame(props: GoNoGoGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coreRef = useRef<GameSessionCore | null>(null);
  const activeStimulusRef = useRef<GoNoGoStimulus | null>(null);
  const nextStimulusAtMsRef = useRef<number | null>(null);
  const stimulusIndexRef = useRef(0);
  const pauseStartedAtMsRef = useRef<number | null>(null);
  const lastPauseReasonRef = useRef<PauseReason | null>(null);

  const width = props.width ?? DEFAULT_WIDTH;
  const height = props.height ?? DEFAULT_HEIGHT;
  const [difficulty, setDifficulty] = useState<GoNoGoDifficulty>(
    props.initialDifficulty ?? "medium"
  );
  const config = useMemo(() => getGoNoGoDifficultyConfig(difficulty), [difficulty]);
  const [phase, setPhase] = useState<GoNoGoPhase>("ready");
  const [activeStimulus, setActiveStimulus] = useState<GoNoGoStimulus | null>(null);
  const [countdown, setCountdown] = useState<CountdownState | null>(null);
  const [metrics, setMetrics] = useState<GoNoGoMetrics>(emptyMetrics);
  const [result, setResult] = useState<GoNoGoGameResult | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "选择难度后开始训练：绿色出现时点击，红色出现时保持等待。"
  );
  const [simulateEegInterruption, setSimulateEegInterruption] = useState(false);
  const effectiveEegStatus =
    props.eegStatus ?? (simulateEegInterruption ? EEG_INTERRUPTED_STATUS : EEG_READY_STATUS);
  const eegViewModel = useMemo(
    () => buildEEGStatusPanelViewModel(effectiveEegStatus),
    [effectiveEegStatus]
  );
  const showEegSimulationControls = props.eegStatus
    ? false
    : (props.showEegSimulationControls ?? true);

  const refreshMetrics = useCallback((nowMs: number) => {
    const core = coreRef.current;
    if (!core) {
      return;
    }

    const snapshot = core.getSnapshot(nowMs);
    setCountdown(snapshot.countdown);
    setMetrics(calculateGoNoGoMetrics(snapshot));
  }, []);

  const scheduleNextStimulus = useCallback((nowMs: number, nextConfig: GoNoGoDifficultyConfig) => {
    nextStimulusAtMsRef.current = nowMs + nextConfig.stimulusIntervalMs;
  }, []);

  const presentStimulus = useCallback(
    (nowMs: number) => {
      const core = coreRef.current;
      if (!core) {
        return;
      }

      const stimulus = buildGoNoGoStimulus({
        config,
        stimulusIndex: stimulusIndexRef.current,
        appearedAtMs: nowMs,
        width,
        height
      });
      stimulusIndexRef.current += 1;
      activeStimulusRef.current = stimulus;
      nextStimulusAtMsRef.current = null;
      setActiveStimulus(stimulus);
      setStatusMessage(
        stimulus.role === "go" ? "绿色目标出现，请点击。" : "红色目标出现，请等待。"
      );

      core.presentStimulus({
        id: stimulus.id,
        kind: stimulus.role,
        expectedResponse: stimulus.role === "go",
        presentedAtMs: nowMs,
        responseWindowMs: config.stimulusDisplayMs,
        responseAllowedAfterMs: config.responseAllowedAfterMs,
        metadata: {
          task: "go_no_go",
          role: stimulus.role,
          targetRatio: config.targetRatio,
          stimulusIntervalMs: config.stimulusIntervalMs
        }
      });
    },
    [config, height, width]
  );

  const finishTraining = useCallback(
    (nowMs: number) => {
      const core = coreRef.current;
      if (!core) {
        return;
      }

      const coreResult = core.complete(nowMs);
      const snapshot = core.getSnapshot(nowMs);
      const nextMetrics = calculateGoNoGoMetrics(snapshot);
      const nextResult = createGoNoGoGameResult({ coreResult, metrics: nextMetrics });

      setResult(nextResult);
      setMetrics(nextMetrics);
      setCountdown(core.getCountdown(nowMs));
      setActiveStimulus(null);
      activeStimulusRef.current = null;
      nextStimulusAtMsRef.current = null;
      setPhase("completed");
      setStatusMessage("本次 Go/No-Go 训练已结束，可导出本次训练结果。");
      props.onComplete?.(nextResult, nextMetrics);
    },
    [props]
  );

  const clearStimulusAndScheduleNext = useCallback(
    (nowMs: number) => {
      activeStimulusRef.current = null;
      setActiveStimulus(null);
      scheduleNextStimulus(nowMs, config);
    },
    [config, scheduleNextStimulus]
  );

  const pauseTraining = useCallback(
    (reason: PauseReason = "manual") => {
      const core = coreRef.current;
      if (!core || phase !== "running") {
        return;
      }

      const nowMs = Date.now();
      pauseStartedAtMsRef.current = nowMs;
      lastPauseReasonRef.current = reason;
      setCountdown(core.pause(nowMs));
      setPhase("paused");
      setStatusMessage(
        reason === "eeg"
          ? "EEG 状态暂不稳定，训练已暂停。请调整佩戴或重新连接后继续。"
          : "训练已暂停，当前倒计时和刺激状态会保持。"
      );
    },
    [phase]
  );

  const startTraining = () => {
    if (eegViewModel.shouldPauseTraining) {
      setStatusMessage("请先确认 EEG 连接和信号状态，再开始训练。");
      return;
    }

    const nowMs = Date.now();
    const core = createGameSessionCore({
      sessionId: props.sessionId,
      userId: props.userId,
      trainingType: "go_no_go",
      plannedDurationSeconds: config.durationSeconds,
      difficulty: config
    });

    core.start(nowMs);
    coreRef.current = core;
    stimulusIndexRef.current = 0;
    activeStimulusRef.current = null;
    nextStimulusAtMsRef.current = null;
    pauseStartedAtMsRef.current = null;
    lastPauseReasonRef.current = null;
    setActiveStimulus(null);
    setMetrics(emptyMetrics);
    setResult(null);
    setCountdown(core.getCountdown(nowMs));
    setPhase("running");
    setStatusMessage("训练开始。看到绿色就点击，看到红色请保持等待。");
    scheduleNextStimulus(nowMs, config);
  };

  const resumeTraining = () => {
    const core = coreRef.current;
    const pauseStartedAtMs = pauseStartedAtMsRef.current;
    if (!core || phase !== "paused" || pauseStartedAtMs === null) {
      return;
    }
    if (eegViewModel.shouldPauseTraining) {
      setStatusMessage("EEG 状态仍需调整，恢复稳定后再继续训练。");
      return;
    }

    const nowMs = Date.now();
    const pausedMs = nowMs - pauseStartedAtMs;
    const stimulus = activeStimulusRef.current;
    if (stimulus) {
      const shifted = {
        ...stimulus,
        appearedAtMs: stimulus.appearedAtMs + pausedMs,
        expiresAtMs: stimulus.expiresAtMs + pausedMs
      };
      activeStimulusRef.current = shifted;
      setActiveStimulus(shifted);
    }
    if (nextStimulusAtMsRef.current !== null) {
      nextStimulusAtMsRef.current += pausedMs;
    }

    pauseStartedAtMsRef.current = null;
    lastPauseReasonRef.current = null;
    setCountdown(core.resume(nowMs));
    setPhase("running");
    setStatusMessage("训练继续，请按当前颜色规则反应。");
  };

  const endTraining = () => {
    if (phase === "ready" || phase === "completed") {
      return;
    }

    finishTraining(Date.now());
  };

  const handleCanvasClick = () => {
    const core = coreRef.current;
    if (!core || phase !== "running") {
      return;
    }

    const nowMs = Date.now();
    const stimulus = activeStimulusRef.current;
    if (stimulus && nowMs > stimulus.expiresAtMs) {
      core.advance(nowMs);
      activeStimulusRef.current = null;
      setActiveStimulus(null);
      scheduleNextStimulus(nowMs, config);
      refreshMetrics(nowMs);
      return;
    }

    const click = core.recordClick({
      clickedAtMs: nowMs,
      ...(stimulus ? { stimulusId: stimulus.id } : {}),
      metadata: {
        task: "go_no_go"
      }
    });

    if (!stimulus) {
      setStatusMessage("当前没有目标，请等待下一次颜色提示。");
    } else if (stimulus.role === "go" && click.classification === "correct_response") {
      setStatusMessage("已记录绿色目标反应，请继续观察。");
      clearStimulusAndScheduleNext(nowMs);
    } else if (stimulus.role === "no_go" && click.classification === "false_press") {
      setStatusMessage("红色目标需要等待，本次已记录为误按。");
      clearStimulusAndScheduleNext(nowMs);
    } else if (click.classification === "early_response") {
      setStatusMessage("点击过早，请等颜色稳定出现后再反应。");
      clearStimulusAndScheduleNext(nowMs);
    }

    refreshMetrics(nowMs);
  };

  const exportJson = () => {
    if (!result) {
      return;
    }

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(result, null, 2)], {
        type: "application/json"
      })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result.sessionId}-go-no-go-result.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (phase === "running" && eegViewModel.shouldPauseTraining) {
      pauseTraining("eeg");
    }
  }, [eegViewModel.shouldPauseTraining, pauseTraining, phase]);

  useEffect(() => {
    if (phase !== "running") {
      return;
    }

    const intervalId = window.setInterval(() => {
      const core = coreRef.current;
      if (!core) {
        return;
      }

      const nowMs = Date.now();
      const nextCountdown = core.advance(nowMs);
      const stimulus = activeStimulusRef.current;

      if (nextCountdown.remainingSeconds <= 0) {
        finishTraining(nowMs);
        return;
      }

      if (stimulus && nowMs > stimulus.expiresAtMs) {
        activeStimulusRef.current = null;
        setActiveStimulus(null);
        setStatusMessage(
          stimulus.role === "go" ? "绿色目标未点击，已记录为漏按。" : "保持等待完成。"
        );
        scheduleNextStimulus(nowMs, config);
      } else if (
        !stimulus &&
        nextStimulusAtMsRef.current !== null &&
        nowMs >= nextStimulusAtMsRef.current
      ) {
        presentStimulus(nowMs);
      }

      refreshMetrics(nowMs);
    }, 160);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [config, finishTraining, phase, presentStimulus, refreshMetrics, scheduleNextStimulus]);

  useEffect(() => {
    drawGoNoGoCanvas({
      canvas: canvasRef.current,
      stimulus: activeStimulus,
      phase,
      width,
      height
    });
  }, [activeStimulus, height, phase, width]);

  const shellTone = toTrainingTone(eegViewModel.tone);
  const shellEegStatus: TrainingEEGStatus = {
    connectionLabel: effectiveEegStatus.connectionStatus === "connected" ? "已连接" : "已断开",
    signalQualityLabel:
      effectiveEegStatus.qualityStatus === "good"
        ? "信号稳定"
        : effectiveEegStatus.qualityStatus === "disconnected"
          ? "暂无稳定数据"
          : "建议复核",
    attentionScore: effectiveEegStatus.attentionScore,
    relaxationScore: effectiveEegStatus.relaxationScore,
    fatigueScore: effectiveEegStatus.fatigueScore,
    signalQualityScore:
      effectiveEegStatus.qualityStatus === "good"
        ? 88
        : effectiveEegStatus.qualityStatus === "disconnected"
          ? 0
          : 58,
    qualityStatus: effectiveEegStatus.qualityStatus,
    paused: phase === "paused",
    safetyMode: true,
    tone: shellTone,
    message: eegViewModel.shouldPauseTraining
      ? "EEG状态需要复核，训练已暂停。"
      : "EEG状态适合继续本次训练。"
  };
  const shellMonitorItems: TrainingMonitorItem[] = [
    { label: "当前正确率", value: formatPercent(metrics.accuracyRate), tone: "good" },
    { label: "漏按率", value: formatPercent(metrics.omissionRate) },
    {
      label: "误按率",
      value: formatPercent(metrics.falsePressRate),
      tone: metrics.falsePressRate > 0.2 ? "watch" : "neutral"
    },
    {
      label: "训练进度",
      value: `${Math.round((countdown?.progressRate ?? 0) * 100)}%`
    }
  ];

  return (
    <TrainingSessionShell
      moduleName="Go/No-Go 点击反应"
      moduleSubtitle="绿色目标出现时点击，红色目标出现时保持等待。"
      statusLabel={phaseLabel(phase)}
      remainingTimeLabel={formatClock(countdown?.remainingSeconds ?? config.durationSeconds)}
      difficultyLabel={config.label}
      eegStatus={shellEegStatus}
      progressPercent={(countdown?.progressRate ?? 0) * 100}
      primaryActionLabel={
        phase === "completed"
          ? "重新开始"
          : phase === "paused"
            ? "继续训练"
            : phase === "ready"
              ? "开始训练"
              : undefined
      }
      primaryActionDisabled={phase === "running"}
      onPrimaryAction={phase === "paused" ? resumeTraining : startTraining}
      pauseDisabled={phase !== "running"}
      exitDisabled={phase === "ready"}
      onPause={() => pauseTraining("manual")}
      onExit={endTraining}
      onResume={resumeTraining}
      onRestart={startTraining}
      monitorItems={shellMonitorItems}
      isPaused={phase === "paused"}
      isCompleted={phase === "completed"}
      pauseTitle={lastPauseReasonRef.current === "eeg" ? "EEG状态异常，训练已暂停" : "训练已暂停"}
      pauseMessage="请先确认佩戴舒适或短暂休息，准备好后再继续。"
      completeTitle="Go/No-Go训练已完成"
      completeMessage="本次点击反应和抑制控制指标已生成，可用于训练记录。"
      safetyPrompt={
        eegViewModel.shouldPauseTraining ? (
          <EEGSafetyPrompt
            tone="watch"
            title="温和提示"
            message="当前信号需要复核，请调整佩戴或稍作休息后继续。"
          />
        ) : (
          <EEGSafetyPrompt
            tone={shellTone}
            title="训练安全模式"
            message="正式训练中已降低装饰动效，只保留目标颜色与必要反馈。"
          />
        )
      }
      variant="inhibition"
    >
      <section className="ncr-go-no-go">
        <GoNoGoStyles />
        <header className="ncr-go-no-go__header">
          <div>
            <p className="ncr-go-no-go__eyebrow">点击反应训练 / Go-No-Go</p>
            <h2>绿色点击，红色等待</h2>
            <p>任务用于辅助训练反应控制和任务规则保持。训练记录仅用于过程回顾和趋势分析。</p>
          </div>
          <div className="ncr-go-no-go__timer" aria-label="训练倒计时">
            <strong>{formatClock(countdown?.remainingSeconds ?? config.durationSeconds)}</strong>
            <span>{phaseLabel(phase)}</span>
          </div>
        </header>

        <div className={`ncr-go-no-go__eeg ncr-go-no-go__eeg--${eegViewModel.tone}`}>
          <div>
            <strong>{eegViewModel.headline}</strong>
            <span>{eegViewModel.helperText}</span>
          </div>
          <span>{eegViewModel.qualityLabel}</span>
        </div>

        {showEegSimulationControls ? (
          <label className="ncr-go-no-go__toggle">
            <input
              type="checkbox"
              checked={simulateEegInterruption}
              onChange={(event) => {
                setSimulateEegInterruption(event.target.checked);
              }}
            />
            <span>模拟 EEG 状态异常暂停</span>
          </label>
        ) : null}

        <div className="ncr-go-no-go__controls" role="group" aria-label="选择难度配置">
          {(Object.keys(GO_NO_GO_DIFFICULTIES) as GoNoGoDifficulty[]).map((option) => {
            const optionConfig = GO_NO_GO_DIFFICULTIES[option];
            return (
              <button
                key={option}
                type="button"
                className={difficulty === option ? "is-active" : ""}
                disabled={phase === "running" || phase === "paused"}
                onClick={() => {
                  setDifficulty(option);
                }}
              >
                {optionConfig.label}
                <span>
                  {optionConfig.durationSeconds}s · {optionConfig.stimulusIntervalMs}ms ·{" "}
                  {Math.round(optionConfig.targetRatio * 100)}% 绿色
                </span>
              </button>
            );
          })}
        </div>

        <div className="ncr-go-no-go__actions">
          <button type="button" onClick={startTraining} disabled={phase === "running"}>
            {phase === "completed" ? "重新开始" : "开始"}
          </button>
          <button
            type="button"
            onClick={() => pauseTraining("manual")}
            disabled={phase !== "running"}
          >
            暂停
          </button>
          <button type="button" onClick={resumeTraining} disabled={phase !== "paused"}>
            继续
          </button>
          <button
            type="button"
            className="is-secondary"
            onClick={endTraining}
            disabled={phase === "ready"}
          >
            结束
          </button>
        </div>

        <div className="ncr-go-no-go__status" aria-live="polite">
          <strong>{activeStimulus ? activeStimulus.label : "准备观察"}</strong>
          <span>{statusMessage}</span>
        </div>

        <canvas
          ref={canvasRef}
          className="ncr-go-no-go__canvas"
          width={width}
          height={height}
          onClick={handleCanvasClick}
          aria-label="Go No-Go 点击反应训练画布"
        />

        <div className="ncr-go-no-go__metrics">
          <Metric label="平均反应时" value={`${Math.round(metrics.averageReactionTimeMs)} ms`} />
          <Metric
            label="反应时波动"
            value={`${Math.round(metrics.reactionTimeVariabilityMs)} ms`}
          />
          <Metric label="正确率" value={formatPercent(metrics.accuracyRate)} />
          <Metric label="漏按率" value={formatPercent(metrics.omissionRate)} />
          <Metric label="误按率" value={formatPercent(metrics.falsePressRate)} />
          <Metric label="抑制成功率" value={formatPercent(metrics.inhibitionSuccessRate)} />
        </div>

        {result ? (
          <section className="ncr-go-no-go__result" aria-label="GoNoGoGameResult">
            <div>
              <h3>GoNoGoGameResult</h3>
              <button type="button" onClick={exportJson}>
                导出 JSON
              </button>
            </div>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </section>
        ) : null}
      </section>
    </TrainingSessionShell>
  );
}

function Metric(props: { label: string; value: string }) {
  return (
    <div className="ncr-go-no-go__metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function drawGoNoGoCanvas(input: {
  canvas: HTMLCanvasElement | null;
  stimulus: GoNoGoStimulus | null;
  phase: GoNoGoPhase;
  width: number;
  height: number;
}) {
  if (!input.canvas) {
    return;
  }

  const context = input.canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, input.width, input.height);
  context.fillStyle = "#f8fbfa";
  context.fillRect(0, 0, input.width, input.height);
  context.strokeStyle = "#d7e4df";
  context.lineWidth = 2;
  context.strokeRect(1, 1, input.width - 2, input.height - 2);

  if (input.phase === "ready" || input.phase === "completed") {
    drawCenteredText(context, "开始后按颜色规则反应", input.width, input.height);
    return;
  }

  if (input.phase === "paused") {
    drawCenteredText(context, "训练已暂停", input.width, input.height);
    return;
  }

  if (input.stimulus) {
    drawStimulus(context, input.stimulus);
    return;
  }

  context.fillStyle = "#667b73";
  context.font = "600 18px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText("请保持观察，等待颜色提示", input.width / 2, input.height / 2);
}

function drawStimulus(context: CanvasRenderingContext2D, stimulus: GoNoGoStimulus) {
  context.save();
  context.shadowColor = "rgba(32, 50, 44, 0.16)";
  context.shadowBlur = 14;
  context.fillStyle = stimulus.color;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 4;
  context.beginPath();
  context.arc(stimulus.x, stimulus.y, stimulus.size / 2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = "#ffffff";
  context.font = "700 18px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(stimulus.label, stimulus.x, stimulus.y);
  context.restore();
}

function drawCenteredText(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number
) {
  context.fillStyle = "#536a62";
  context.font = "600 22px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, width / 2, height / 2);
}

function GoNoGoStyles() {
  return <style>{goNoGoCss}</style>;
}

function phaseLabel(phase: GoNoGoPhase): string {
  switch (phase) {
    case "ready":
      return "准备中";
    case "running":
      return "训练中";
    case "paused":
      return "已暂停";
    case "completed":
      return "已结束";
  }
}

function formatClock(seconds: number): string {
  const normalized = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(normalized / 60);
  const remainingSeconds = normalized % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function toTrainingTone(tone: string): TrainingSafetyTone {
  if (tone === "pause") {
    return "pause";
  }
  if (tone === "watch") {
    return "watch";
  }
  return "good";
}

const emptyMetrics: GoNoGoMetrics = {
  goTrialCount: 0,
  noGoTrialCount: 0,
  hitCount: 0,
  omissionCount: 0,
  falseAlarmCount: 0,
  correctInhibitionCount: 0,
  earlyResponseCount: 0,
  averageReactionTimeMs: 0,
  reactionTimeVariabilityMs: 0,
  accuracyRate: 0,
  omissionRate: 0,
  falsePressRate: 0,
  inhibitionSuccessRate: 0
};

const goNoGoCss = `
.ncr-go-no-go {
  box-sizing: border-box;
  width: 100%;
  color: #20322c;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ncr-go-no-go__header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.ncr-go-no-go__eyebrow {
  margin: 0 0 6px;
  color: #657a72;
  font-size: 13px;
  font-weight: 700;
}

.ncr-go-no-go__header h2 {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: 0;
}

.ncr-go-no-go__header p {
  margin: 8px 0 0;
  max-width: 660px;
  color: #536a62;
  font-size: 14px;
  line-height: 1.5;
}

.ncr-go-no-go__timer {
  min-width: 120px;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
  text-align: center;
}

.ncr-go-no-go__timer strong {
  display: block;
  color: #27594d;
  font-size: 28px;
  line-height: 1;
}

.ncr-go-no-go__timer span {
  display: block;
  margin-top: 5px;
  color: #657a72;
  font-size: 13px;
  font-weight: 700;
}

.ncr-go-no-go__eeg {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  border: 1px solid #d9e5df;
  border-left-width: 6px;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
  margin-bottom: 10px;
}

.ncr-go-no-go__eeg--ready {
  border-left-color: #5f9f87;
}

.ncr-go-no-go__eeg--watch {
  border-left-color: #d29b42;
}

.ncr-go-no-go__eeg--pause {
  border-left-color: #c75050;
}

.ncr-go-no-go__eeg strong,
.ncr-go-no-go__eeg span {
  display: block;
}

.ncr-go-no-go__eeg span {
  color: #586f66;
  font-size: 13px;
  line-height: 1.4;
}

.ncr-go-no-go__toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  border: 1px solid #d4e2dc;
  border-radius: 8px;
  background: #ffffff;
  padding: 0 12px;
  margin-bottom: 12px;
  color: #28483f;
  font-weight: 700;
}

.ncr-go-no-go__controls,
.ncr-go-no-go__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}

.ncr-go-no-go__controls button {
  display: grid;
  gap: 4px;
  min-width: 152px;
  min-height: 58px;
  text-align: left;
}

.ncr-go-no-go__controls button span {
  color: #647a72;
  font-size: 12px;
  font-weight: 600;
}

.ncr-go-no-go button {
  min-height: 38px;
  border: 1px solid #c8d8d1;
  border-radius: 8px;
  background: #ffffff;
  color: #28483f;
  padding: 0 14px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.ncr-go-no-go button.is-active,
.ncr-go-no-go__actions button:not(.is-secondary) {
  border-color: #5f9f87;
  background: #dff0e8;
}

.ncr-go-no-go button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.ncr-go-no-go button:focus-visible,
.ncr-go-no-go input:focus-visible {
  outline: 3px solid #9ccbbb;
  outline-offset: 2px;
}

.ncr-go-no-go__status {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
  margin-bottom: 12px;
}

.ncr-go-no-go__status span {
  color: #586f66;
}

.ncr-go-no-go__canvas {
  display: block;
  width: 100%;
  max-width: 100%;
  aspect-ratio: 12 / 7;
  border: 1px solid #d4e2dc;
  border-radius: 8px;
  background: #f8fbfa;
  cursor: pointer;
}

.ncr-go-no-go__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.ncr-go-no-go__metric {
  min-width: 0;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 10px;
}

.ncr-go-no-go__metric span {
  display: block;
  color: #657a72;
  font-size: 12px;
  font-weight: 700;
}

.ncr-go-no-go__metric strong {
  display: block;
  margin-top: 4px;
  color: #20322c;
  font-size: 20px;
  line-height: 1.1;
}

.ncr-go-no-go__result {
  margin-top: 14px;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 14px;
}

.ncr-go-no-go__result > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.ncr-go-no-go__result h3 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0;
}

.ncr-go-no-go__result pre {
  max-height: 260px;
  overflow: auto;
  margin: 12px 0 0;
  border-radius: 8px;
  background: #f4f8f6;
  color: #20322c;
  padding: 12px;
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 780px) {
  .ncr-go-no-go__header,
  .ncr-go-no-go__eeg {
    display: grid;
  }

  .ncr-go-no-go__metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
`;
