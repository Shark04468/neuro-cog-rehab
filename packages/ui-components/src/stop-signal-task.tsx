import type { StopSignalResult, StopSignalTrialResult } from "@neuro-cog-rehab/shared-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildStopSignalTrial,
  buildStopSignalTrialSequence,
  calculateStopSignalMetrics,
  completeStopSignalTrial,
  createStopSignalResult,
  getStopSignalTaskConfig,
  STOP_SIGNAL_DIFFICULTIES
} from "./stop-signal-task-model.js";
import type {
  StopSignalDifficulty,
  StopSignalMetrics,
  StopSignalTaskConfig,
  StopSignalTaskProps,
  StopSignalTrial,
  StopSignalTrialType
} from "./stop-signal-task-types.js";
import {
  EEGSafetyPrompt,
  TrainingSessionShell,
  type TrainingEEGStatus,
  type TrainingMonitorItem
} from "./training-session-shell.js";

const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 420;

type StopSignalPhase = "ready" | "running" | "paused" | "completed";

export function StopSignalTask(props: StopSignalTaskProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startedAtMsRef = useRef<number | null>(null);
  const accumulatedPausedMsRef = useRef(0);
  const pauseStartedAtMsRef = useRef<number | null>(null);
  const pauseCountRef = useRef(0);
  const activeTrialRef = useRef<StopSignalTrial | null>(null);
  const trialSequenceRef = useRef<StopSignalTrialType[]>([]);
  const trialIndexRef = useRef(0);
  const nextTrialAtMsRef = useRef<number | null>(null);
  const trialResultsRef = useRef<StopSignalTrialResult[]>([]);

  const width = props.width ?? DEFAULT_WIDTH;
  const height = props.height ?? DEFAULT_HEIGHT;
  const [difficulty, setDifficulty] = useState<StopSignalDifficulty>(
    props.initialDifficulty ?? "medium"
  );
  const config = useMemo(() => getStopSignalTaskConfig(difficulty), [difficulty]);
  const [phase, setPhase] = useState<StopSignalPhase>("ready");
  const [activeTrial, setActiveTrial] = useState<StopSignalTrial | null>(null);
  const [stopSignalVisible, setStopSignalVisible] = useState(false);
  const [trialResults, setTrialResults] = useState<StopSignalTrialResult[]>([]);
  const [metrics, setMetrics] = useState<StopSignalMetrics>(() =>
    calculateStopSignalMetrics({ trialResults: [], plannedTrialCount: config.trialCount })
  );
  const [result, setResult] = useState<StopSignalResult | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "选择难度后开始训练：看到目标后准备点击，若出现停止信号请保持等待。"
  );

  const updateMetrics = useCallback(
    (records: StopSignalTrialResult[]) => {
      setMetrics(
        calculateStopSignalMetrics({
          trialResults: records,
          plannedTrialCount: config.trialCount
        })
      );
    },
    [config.trialCount]
  );

  const scheduleNextTrial = useCallback((nowMs: number, nextConfig: StopSignalTaskConfig) => {
    nextTrialAtMsRef.current = nowMs + nextConfig.interTrialIntervalMs;
  }, []);

  const presentTrial = useCallback(
    (nowMs: number) => {
      if (trialIndexRef.current >= trialSequenceRef.current.length) {
        return false;
      }

      const trial = buildStopSignalTrial({
        config,
        trialIndex: trialIndexRef.current,
        trialType: trialSequenceRef.current[trialIndexRef.current] ?? "go",
        targetPresentedAtMs: nowMs,
        width,
        height
      });

      trialIndexRef.current += 1;
      activeTrialRef.current = trial;
      nextTrialAtMsRef.current = null;
      setActiveTrial(trial);
      setStopSignalVisible(false);
      setStatusMessage("目标出现，请准备点击；如果出现停止信号，请保持等待。");
      return true;
    },
    [config, height, width]
  );

  const finishTraining = useCallback(
    (nowMs: number, finalRecords: StopSignalTrialResult[] = trialResultsRef.current) => {
      const startedAtMs = startedAtMsRef.current ?? nowMs;
      const nextResult = createStopSignalResult({
        sessionId: props.sessionId,
        userId: props.userId,
        startedAtMs,
        endedAtMs: nowMs,
        activeDurationSeconds: getActiveDurationMs(nowMs) / 1000,
        pauseCount: pauseCountRef.current,
        config,
        trialResults: finalRecords
      });

      activeTrialRef.current = null;
      nextTrialAtMsRef.current = null;
      setActiveTrial(null);
      setStopSignalVisible(false);
      setResult(nextResult);
      setPhase("completed");
      setStatusMessage("本次 Stop-Signal 训练已结束，可导出包含每个 trial 的结果。");
      props.onComplete?.(
        nextResult,
        calculateStopSignalMetrics({
          trialResults: finalRecords,
          plannedTrialCount: config.trialCount
        })
      );
    },
    [config, props]
  );

  const completeActiveTrial = useCallback(
    (nowMs: number, response: "click" | "timeout") => {
      const trial = activeTrialRef.current;
      if (!trial) {
        return;
      }

      const record = completeStopSignalTrial({
        trial,
        config,
        completedAtMs: nowMs,
        response
      });
      const nextRecords = [...trialResultsRef.current, record];

      trialResultsRef.current = nextRecords;
      activeTrialRef.current = null;
      setTrialResults(nextRecords);
      setActiveTrial(null);
      setStopSignalVisible(false);
      updateMetrics(nextRecords);

      if (nextRecords.length >= config.trialCount) {
        finishTraining(nowMs, nextRecords);
        return;
      }

      scheduleNextTrial(nowMs, config);
      setStatusMessage(resultMessage(record));
    },
    [config, finishTraining, scheduleNextTrial, updateMetrics]
  );

  const startTraining = () => {
    const nowMs = Date.now();

    startedAtMsRef.current = nowMs;
    accumulatedPausedMsRef.current = 0;
    pauseStartedAtMsRef.current = null;
    pauseCountRef.current = 0;
    activeTrialRef.current = null;
    trialResultsRef.current = [];
    trialIndexRef.current = 0;
    trialSequenceRef.current = buildStopSignalTrialSequence(config);
    nextTrialAtMsRef.current = nowMs + 500;
    setActiveTrial(null);
    setStopSignalVisible(false);
    setTrialResults([]);
    updateMetrics([]);
    setResult(null);
    setPhase("running");
    setStatusMessage("训练开始，请保持观察并按规则反应。");
  };

  const pauseTraining = () => {
    if (phase !== "running") {
      return;
    }

    pauseStartedAtMsRef.current = Date.now();
    pauseCountRef.current += 1;
    setPhase("paused");
    setStatusMessage("训练已暂停，当前 trial 的时序会保持。");
  };

  const resumeTraining = () => {
    const pauseStartedAtMs = pauseStartedAtMsRef.current;
    if (phase !== "paused" || pauseStartedAtMs === null) {
      return;
    }

    const nowMs = Date.now();
    const pausedMs = nowMs - pauseStartedAtMs;
    accumulatedPausedMsRef.current += pausedMs;

    if (activeTrialRef.current) {
      const shifted = {
        ...activeTrialRef.current,
        targetPresentedAtMs: activeTrialRef.current.targetPresentedAtMs + pausedMs,
        targetExpiresAtMs: activeTrialRef.current.targetExpiresAtMs + pausedMs,
        stopSignalAtMs:
          activeTrialRef.current.stopSignalAtMs === null
            ? null
            : activeTrialRef.current.stopSignalAtMs + pausedMs
      };
      activeTrialRef.current = shifted;
      setActiveTrial(shifted);
    }
    if (nextTrialAtMsRef.current !== null) {
      nextTrialAtMsRef.current += pausedMs;
    }

    pauseStartedAtMsRef.current = null;
    setPhase("running");
    setStatusMessage("训练继续，请按当前 trial 规则反应。");
  };

  const endTraining = () => {
    if (phase === "ready" || phase === "completed") {
      return;
    }

    finishTraining(Date.now());
  };

  const handleCanvasClick = () => {
    if (phase !== "running") {
      return;
    }
    if (!activeTrialRef.current) {
      setStatusMessage("当前没有目标，请等待下一次 trial。");
      return;
    }

    completeActiveTrial(Date.now(), "click");
  };

  useEffect(() => {
    if (phase !== "running") {
      return;
    }

    const intervalId = window.setInterval(() => {
      const nowMs = Date.now();
      const trial = activeTrialRef.current;

      if (!trial && nextTrialAtMsRef.current !== null && nowMs >= nextTrialAtMsRef.current) {
        if (!presentTrial(nowMs)) {
          finishTraining(nowMs);
        }
        return;
      }

      if (!trial) {
        return;
      }

      if (trial.stopSignalAtMs !== null && nowMs >= trial.stopSignalAtMs && !stopSignalVisible) {
        setStopSignalVisible(true);
        setStatusMessage("停止信号出现，请保持等待。");
      }

      if (nowMs > trial.targetExpiresAtMs) {
        completeActiveTrial(nowMs, "timeout");
      }
    }, 120);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [completeActiveTrial, finishTraining, phase, presentTrial, stopSignalVisible]);

  useEffect(() => {
    drawStopSignalCanvas({
      canvas: canvasRef.current,
      trial: activeTrial,
      stopSignalVisible,
      phase,
      width,
      height
    });
  }, [activeTrial, height, phase, stopSignalVisible, width]);

  function getActiveDurationMs(nowMs: number): number {
    const startedAtMs = startedAtMsRef.current;
    if (startedAtMs === null) {
      return 0;
    }

    const activePauseMs =
      pauseStartedAtMsRef.current === null ? 0 : nowMs - pauseStartedAtMsRef.current;
    return Math.max(nowMs - startedAtMs - accumulatedPausedMsRef.current - activePauseMs, 0);
  }

  const progressPercent =
    config.trialCount <= 0 ? 0 : Math.round((trialResults.length / config.trialCount) * 100);
  const shellEegStatus: TrainingEEGStatus = {
    connectionLabel: "已连接",
    signalQualityLabel: "信号稳定",
    attentionScore: 64,
    relaxationScore: 49,
    fatigueScore: 30,
    signalQualityScore: 86,
    qualityStatus: "good",
    paused: phase === "paused",
    safetyMode: true,
    tone: "good",
    message: "状态监测入口可用，训练中仅保留必要反馈。"
  };
  const shellMonitorItems: TrainingMonitorItem[] = [
    { label: "当前正确率", value: formatPercent(metrics.completionRate), tone: "good" },
    {
      label: "冲动反应",
      value: metrics.impulsiveResponseCount.toString(),
      helperText: "用于本次训练过程回顾",
      tone: metrics.impulsiveResponseCount > 2 ? "watch" : "neutral"
    },
    { label: "停止成功率", value: formatPercent(metrics.stopSuccessRate) },
    { label: "训练进度", value: `${progressPercent}%` }
  ];

  return (
    <TrainingSessionShell
      moduleName="Stop-Signal 反应抑制"
      moduleSubtitle="看到目标先准备，出现停止提示时保持等待。"
      statusLabel={phaseLabel(phase)}
      remainingTimeLabel={`${Math.max(0, config.trialCount - trialResults.length)} 次`}
      difficultyLabel={config.label}
      eegStatus={shellEegStatus}
      progressPercent={progressPercent}
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
      onPause={pauseTraining}
      onExit={endTraining}
      onResume={resumeTraining}
      onRestart={startTraining}
      monitorItems={shellMonitorItems}
      isPaused={phase === "paused"}
      isCompleted={phase === "completed"}
      pauseTitle="Stop-Signal训练已暂停"
      pauseMessage="可以短暂休息，准备好后继续观察目标和停止提示。"
      completeTitle="Stop-Signal训练已完成"
      completeMessage="本次停止成功率和反应记录已生成，可用于训练记录。"
      safetyPrompt={
        <EEGSafetyPrompt
          tone="good"
          title="训练安全模式"
          message="停止提示使用温和琥珀色，不使用闪烁或刺眼警报。"
        />
      }
      variant="inhibition"
    >
      <section className="ncr-stop-signal">
        <StopSignalStyles />
        <header className="ncr-stop-signal__header">
          <div>
            <p className="ncr-stop-signal__eyebrow">反应抑制训练 / Stop-Signal</p>
            <h2>目标出现后准备点击，停止信号出现时等待</h2>
            <p>任务用于辅助训练反应抑制和规则切换，训练记录仅用于过程回顾和趋势分析。</p>
          </div>
          <div className="ncr-stop-signal__counter" aria-label="训练进度">
            <strong>
              {trialResults.length}/{config.trialCount}
            </strong>
            <span>{phaseLabel(phase)}</span>
          </div>
        </header>

        <div className="ncr-stop-signal__controls" role="group" aria-label="选择难度参数">
          {(Object.keys(STOP_SIGNAL_DIFFICULTIES) as StopSignalDifficulty[]).map((option) => {
            const optionConfig = STOP_SIGNAL_DIFFICULTIES[option];
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
                  SSD {optionConfig.stopSignalDelayMs}ms · {optionConfig.targetDisplayTimeMs}ms ·{" "}
                  {optionConfig.trialCount} 次 · {Math.round(optionConfig.stopTrialRatio * 100)}%
                  停止
                </span>
              </button>
            );
          })}
        </div>

        <div className="ncr-stop-signal__actions">
          <button type="button" onClick={startTraining} disabled={phase === "running"}>
            {phase === "completed" ? "重新开始" : "开始"}
          </button>
          <button type="button" onClick={pauseTraining} disabled={phase !== "running"}>
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

        <div className="ncr-stop-signal__status" aria-live="polite">
          <strong>
            {activeTrial ? trialStatusLabel(activeTrial, stopSignalVisible) : "准备观察"}
          </strong>
          <span>{statusMessage}</span>
        </div>

        <canvas
          ref={canvasRef}
          className="ncr-stop-signal__canvas"
          width={width}
          height={height}
          onClick={handleCanvasClick}
          aria-label="Stop-Signal 反应抑制训练画布"
        />

        <div className="ncr-stop-signal__metrics">
          <Metric label="停止成功率" value={formatPercent(metrics.stopSuccessRate)} />
          <Metric label="冲动反应数" value={metrics.impulsiveResponseCount.toString()} />
          <Metric label="Go 命中" value={metrics.goSuccessCount.toString()} />
          <Metric label="Go 漏按" value={metrics.goMissedCount.toString()} />
          <Metric
            label="平均 Go 反应"
            value={`${Math.round(metrics.averageGoReactionTimeMs)} ms`}
          />
          <Metric label="完成进度" value={formatPercent(metrics.completionRate)} />
        </div>

        {result ? (
          <section className="ncr-stop-signal__result" aria-label="StopSignalResult">
            <div>
              <h3>StopSignalResult</h3>
              <button type="button" onClick={() => exportJson(result)}>
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
    <div className="ncr-stop-signal__metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function resultMessage(record: StopSignalTrialResult): string {
  switch (record.outcome) {
    case "go_success":
      return "已记录目标反应，请继续观察下一次 trial。";
    case "go_missed":
      return "本次目标未点击，已记录为漏按。";
    case "stop_success":
      return "已保持等待，本次停止 trial 完成。";
    case "stop_failed":
      return "停止信号出现后发生点击，已记录为冲动反应。";
    case "responded_before_stop_signal":
      return "停止信号出现前已点击，已单独记录为提前反应。";
  }
}

function trialStatusLabel(trial: StopSignalTrial, stopSignalVisible: boolean): string {
  if (trial.trialType === "stop" && stopSignalVisible) {
    return "停止信号";
  }

  return "目标出现";
}

function exportJson(result: StopSignalResult) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json"
    })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${result.sessionId}-stop-signal-result.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function drawStopSignalCanvas(input: {
  canvas: HTMLCanvasElement | null;
  trial: StopSignalTrial | null;
  stopSignalVisible: boolean;
  phase: StopSignalPhase;
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
    drawCenteredText(context, "开始后请观察目标和停止信号", input.width, input.height);
    return;
  }

  if (input.phase === "paused") {
    drawCenteredText(context, "训练已暂停", input.width, input.height);
    return;
  }

  if (!input.trial) {
    drawCenteredText(context, "请等待下一次 trial", input.width, input.height);
    return;
  }

  drawTrialTarget(context, input.trial, input.stopSignalVisible);
}

function drawTrialTarget(
  context: CanvasRenderingContext2D,
  trial: StopSignalTrial,
  stopSignalVisible: boolean
) {
  context.save();
  context.shadowColor = "rgba(32, 50, 44, 0.14)";
  context.shadowBlur = 14;
  context.fillStyle = stopSignalVisible ? "#fff4e0" : "#dff0e8";
  context.strokeStyle = stopSignalVisible ? "#c9684a" : "#4b8f7a";
  context.lineWidth = stopSignalVisible ? 6 : 4;
  context.beginPath();
  context.arc(trial.x, trial.y, trial.size / 2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = stopSignalVisible ? "#a94736" : "#27594d";
  context.font = "700 18px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(stopSignalVisible ? "停止" : "目标", trial.x, trial.y);
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

function StopSignalStyles() {
  return <style>{stopSignalCss}</style>;
}

function phaseLabel(phase: StopSignalPhase): string {
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

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

const stopSignalCss = `
.ncr-stop-signal {
  box-sizing: border-box;
  width: 100%;
  color: #20322c;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ncr-stop-signal__header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.ncr-stop-signal__eyebrow {
  margin: 0 0 6px;
  color: #657a72;
  font-size: 13px;
  font-weight: 700;
}

.ncr-stop-signal__header h2 {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: 0;
}

.ncr-stop-signal__header p {
  margin: 8px 0 0;
  max-width: 660px;
  color: #536a62;
  font-size: 14px;
  line-height: 1.5;
}

.ncr-stop-signal__counter {
  min-width: 120px;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
  text-align: center;
}

.ncr-stop-signal__counter strong {
  display: block;
  color: #27594d;
  font-size: 28px;
  line-height: 1;
}

.ncr-stop-signal__counter span {
  display: block;
  margin-top: 5px;
  color: #657a72;
  font-size: 13px;
  font-weight: 700;
}

.ncr-stop-signal__controls,
.ncr-stop-signal__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}

.ncr-stop-signal__controls button {
  display: grid;
  gap: 4px;
  min-width: 174px;
  min-height: 58px;
  text-align: left;
}

.ncr-stop-signal__controls button span {
  color: #647a72;
  font-size: 12px;
  font-weight: 600;
}

.ncr-stop-signal button {
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

.ncr-stop-signal button.is-active,
.ncr-stop-signal__actions button:not(.is-secondary) {
  border-color: #5f9f87;
  background: #dff0e8;
}

.ncr-stop-signal button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.ncr-stop-signal button:focus-visible {
  outline: 3px solid #9ccbbb;
  outline-offset: 2px;
}

.ncr-stop-signal__status {
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

.ncr-stop-signal__status span {
  color: #586f66;
}

.ncr-stop-signal__canvas {
  display: block;
  width: 100%;
  max-width: 100%;
  aspect-ratio: 12 / 7;
  border: 1px solid #d4e2dc;
  border-radius: 8px;
  background: #f8fbfa;
  cursor: pointer;
}

.ncr-stop-signal__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.ncr-stop-signal__metric {
  min-width: 0;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 10px;
}

.ncr-stop-signal__metric span {
  display: block;
  color: #657a72;
  font-size: 12px;
  font-weight: 700;
}

.ncr-stop-signal__metric strong {
  display: block;
  margin-top: 4px;
  color: #20322c;
  font-size: 20px;
  line-height: 1.1;
}

.ncr-stop-signal__result {
  margin-top: 14px;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 14px;
}

.ncr-stop-signal__result > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.ncr-stop-signal__result h3 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0;
}

.ncr-stop-signal__result pre {
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
  .ncr-stop-signal__header {
    display: grid;
  }

  .ncr-stop-signal__metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
`;
