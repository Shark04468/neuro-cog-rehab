import {
  createGameSessionCore,
  type CountdownState,
  type GameSessionCore
} from "@neuro-cog-rehab/game-core";
import type { GameSessionResult } from "@neuro-cog-rehab/shared-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildSustainedAttentionStimulus,
  calculateSustainedAttentionMetrics,
  createStandardGameSessionResult,
  createSustainedAttentionTaskConfig,
  findSustainedAttentionStimulusAtPoint,
  getNextSustainedAttentionDelayMs,
  SUSTAINED_ATTENTION_DURATIONS,
  SUSTAINED_ATTENTION_FREQUENCIES
} from "./sustained-attention-task-model.js";
import type {
  SustainedAttentionDurationSeconds,
  SustainedAttentionFrequency,
  SustainedAttentionMetrics,
  SustainedAttentionStimulus,
  SustainedAttentionTaskConfig,
  SustainedAttentionTaskProps
} from "./sustained-attention-task-types.js";
import {
  EEGSafetyPrompt,
  TrainingSessionShell,
  type TrainingEEGStatus,
  type TrainingMonitorItem
} from "./training-session-shell.js";

const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 420;

type SustainedAttentionPhase = "ready" | "running" | "paused" | "completed";

export function SustainedAttentionTask(props: SustainedAttentionTaskProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coreRef = useRef<GameSessionCore | null>(null);
  const activeStimulusRef = useRef<SustainedAttentionStimulus | null>(null);
  const nextStimulusAtMsRef = useRef<number | null>(null);
  const stimulusIndexRef = useRef(0);
  const pauseStartedAtMsRef = useRef<number | null>(null);

  const width = props.width ?? DEFAULT_WIDTH;
  const height = props.height ?? DEFAULT_HEIGHT;
  const [durationSeconds, setDurationSeconds] = useState<SustainedAttentionDurationSeconds>(
    props.initialDurationSeconds ?? 180
  );
  const [frequency, setFrequency] = useState<SustainedAttentionFrequency>(
    props.initialFrequency ?? "medium"
  );
  const [distractorsEnabled, setDistractorsEnabled] = useState(
    props.initialDistractorsEnabled ?? true
  );
  const taskConfig = useMemo(
    () =>
      createSustainedAttentionTaskConfig({
        durationSeconds,
        frequency,
        distractorsEnabled
      }),
    [distractorsEnabled, durationSeconds, frequency]
  );
  const [phase, setPhase] = useState<SustainedAttentionPhase>("ready");
  const [activeStimulus, setActiveStimulus] = useState<SustainedAttentionStimulus | null>(null);
  const [countdown, setCountdown] = useState<CountdownState | null>(null);
  const [metrics, setMetrics] = useState<SustainedAttentionMetrics>(emptyMetrics);
  const [result, setResult] = useState<GameSessionResult | null>(null);
  const [statusMessage, setStatusMessage] = useState("选择训练时长和目标频率后开始。");

  const refreshMetrics = useCallback((nowMs: number) => {
    const core = coreRef.current;
    if (!core) {
      return;
    }

    const snapshot = core.getSnapshot(nowMs);
    setCountdown(snapshot.countdown);
    setMetrics(calculateSustainedAttentionMetrics(snapshot));
  }, []);

  const scheduleNextStimulus = useCallback(
    (nowMs: number, config: SustainedAttentionTaskConfig) => {
      nextStimulusAtMsRef.current = nowMs + getNextSustainedAttentionDelayMs(config);
    },
    []
  );

  const presentStimulus = useCallback(
    (nowMs: number) => {
      const core = coreRef.current;
      if (!core) {
        return;
      }

      const stimulus = buildSustainedAttentionStimulus({
        config: taskConfig,
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
        stimulus.role === "target" ? "目标出现，请尽快点击。" : "这是干扰项，保持观察即可。"
      );

      core.presentStimulus({
        id: stimulus.id,
        kind: stimulus.role === "target" ? "target" : "distractor",
        expectedResponse: stimulus.role === "target",
        presentedAtMs: nowMs,
        responseWindowMs: taskConfig.targetDisplayMs,
        metadata: {
          task: "sustained_attention",
          role: stimulus.role,
          frequency: taskConfig.frequency,
          distractorsEnabled: taskConfig.distractorsEnabled
        }
      });
    },
    [height, taskConfig, width]
  );

  const finishTraining = useCallback(
    (nowMs: number) => {
      const core = coreRef.current;
      if (!core) {
        return;
      }

      const coreResult = core.complete(nowMs);
      const snapshot = core.getSnapshot(nowMs);
      const nextMetrics = calculateSustainedAttentionMetrics(snapshot);
      const standardResult = createStandardGameSessionResult(coreResult);

      setResult(standardResult);
      setMetrics(nextMetrics);
      setCountdown(core.getCountdown(nowMs));
      setActiveStimulus(null);
      activeStimulusRef.current = null;
      nextStimulusAtMsRef.current = null;
      setPhase("completed");
      setStatusMessage("本次持续注意训练已结束，可导出标准 GameSessionResult。");
      props.onComplete?.(standardResult, nextMetrics);
    },
    [props]
  );

  const startTraining = () => {
    const nowMs = Date.now();
    const core = createGameSessionCore({
      sessionId: props.sessionId,
      userId: props.userId,
      trainingType: "attention_training",
      plannedDurationSeconds: durationSeconds,
      difficulty: taskConfig
    });

    core.start(nowMs);
    coreRef.current = core;
    stimulusIndexRef.current = 0;
    activeStimulusRef.current = null;
    nextStimulusAtMsRef.current = null;
    setActiveStimulus(null);
    setMetrics(emptyMetrics);
    setResult(null);
    setCountdown(core.getCountdown(nowMs));
    setPhase("running");
    setStatusMessage("请持续观察屏幕，目标出现时再点击。");
    scheduleNextStimulus(nowMs, taskConfig);
  };

  const pauseTraining = () => {
    const core = coreRef.current;
    if (!core || phase !== "running") {
      return;
    }

    const nowMs = Date.now();
    pauseStartedAtMsRef.current = nowMs;
    setCountdown(core.pause(nowMs));
    setPhase("paused");
    setStatusMessage("训练已暂停，当前刺激和倒计时会保持。");
  };

  const resumeTraining = () => {
    const core = coreRef.current;
    const pauseStartedAtMs = pauseStartedAtMsRef.current;
    if (!core || phase !== "paused" || pauseStartedAtMs === null) {
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
    setCountdown(core.resume(nowMs));
    setPhase("running");
    setStatusMessage("训练已继续，请保持观察。");
  };

  const endTraining = () => {
    if (phase === "ready" || phase === "completed") {
      return;
    }

    finishTraining(Date.now());
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const core = coreRef.current;
    if (!core || phase !== "running") {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const point = {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height
    };
    const nowMs = Date.now();
    const stimulus = findSustainedAttentionStimulusAtPoint(activeStimulusRef.current, point);
    const click = core.recordClick({
      clickedAtMs: nowMs,
      ...(stimulus ? { stimulusId: stimulus.id } : {})
    });

    if (!stimulus) {
      setStatusMessage("未点击到目标，请继续观察屏幕。");
    } else if (stimulus.role === "target" && click.classification === "correct_response") {
      setStatusMessage("已记录目标反应，请继续保持观察。");
      clearStimulusAndScheduleNext(nowMs);
    } else if (stimulus.role === "distractor") {
      setStatusMessage("这是干扰项，下一次请等待目标再点击。");
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
    link.download = `${result.sessionId}-sustained-attention-result.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearStimulusAndScheduleNext = (nowMs: number) => {
    activeStimulusRef.current = null;
    setActiveStimulus(null);
    scheduleNextStimulus(nowMs, taskConfig);
  };

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
        setStatusMessage("继续观察屏幕，等待下一次目标。");
        scheduleNextStimulus(nowMs, taskConfig);
      } else if (
        !stimulus &&
        nextStimulusAtMsRef.current !== null &&
        nowMs >= nextStimulusAtMsRef.current
      ) {
        presentStimulus(nowMs);
      }

      refreshMetrics(nowMs);
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [finishTraining, phase, presentStimulus, refreshMetrics, scheduleNextStimulus, taskConfig]);

  useEffect(() => {
    drawSustainedAttentionCanvas({
      canvas: canvasRef.current,
      stimulus: activeStimulus,
      phase,
      width,
      height,
      distractorsEnabled
    });
  }, [activeStimulus, distractorsEnabled, height, phase, width]);

  const progressPercent = Math.round((countdown?.progressRate ?? 0) * 100);
  const shellEegStatus: TrainingEEGStatus = {
    connectionLabel: "已连接",
    signalQualityLabel: "信号稳定",
    attentionScore: 64,
    relaxationScore: 50,
    fatigueScore: 31,
    signalQualityScore: 86,
    qualityStatus: "good",
    paused: phase === "paused",
    safetyMode: true,
    tone: metrics.taskPersistenceScore < 45 && phase === "running" ? "watch" : "good",
    message:
      metrics.taskPersistenceScore < 45 && phase === "running"
        ? "任务坚持指标略有波动，可按需暂停休息。"
        : "当前状态适合继续本次持续注意训练。"
  };
  const shellMonitorItems: TrainingMonitorItem[] = [
    {
      label: "当前正确率",
      value: `${Math.round(metrics.accuracy * 100)}%`,
      tone: metrics.accuracy >= 0.75 ? "good" : "neutral"
    },
    {
      label: "漏反应",
      value: metrics.missedCount.toString(),
      tone: metrics.missedCount > 3 ? "watch" : "neutral"
    },
    {
      label: "反应波动",
      value: `${Math.round(metrics.reactionTimeVariabilityMs)} ms`
    },
    {
      label: "训练进度",
      value: `${progressPercent}%`
    }
  ];

  return (
    <TrainingSessionShell
      moduleName="持续注意训练"
      moduleSubtitle="保持观察，目标出现后尽快点击，干扰项无需响应。"
      statusLabel={phaseLabel(phase)}
      remainingTimeLabel={formatClock(countdown?.remainingSeconds ?? durationSeconds)}
      difficultyLabel={`${durationSeconds / 60}分钟 · ${SUSTAINED_ATTENTION_FREQUENCIES[frequency].label}`}
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
      pauseTitle="持续注意训练已暂停"
      pauseMessage="可以闭眼放松片刻，确认状态稳定后再继续。"
      completeTitle="持续注意训练已完成"
      completeMessage="本次漏反应、反应波动和任务坚持指标已生成。"
      safetyPrompt={
        <EEGSafetyPrompt
          title={shellEegStatus.tone === "watch" ? "建议短暂调整" : "稳定观察模式"}
          message={shellEegStatus.message ?? "当前状态适合继续本次持续注意训练。"}
          tone={shellEegStatus.tone}
        />
      }
      variant="attention"
    >
      <section className="ncr-sustained-task">
        <SustainedAttentionStyles />
        <header className="ncr-sustained-task__header">
          <div>
            <p className="ncr-sustained-task__eyebrow">注意力训练 / 持续注意</p>
            <h2>持续观察，目标出现时点击</h2>
            <p>目标会间隔出现，请保持观察节奏。干扰项出现时无需点击。</p>
          </div>
          <div className="ncr-sustained-task__timer" aria-label="训练倒计时">
            <strong>{formatClock(countdown?.remainingSeconds ?? durationSeconds)}</strong>
            <span>{phaseLabel(phase)}</span>
          </div>
        </header>

        <div className="ncr-sustained-task__controls">
          <div className="ncr-sustained-task__group" role="group" aria-label="选择训练时长">
            {SUSTAINED_ATTENTION_DURATIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={durationSeconds === option ? "is-active" : ""}
                disabled={phase === "running" || phase === "paused"}
                onClick={() => {
                  setDurationSeconds(option);
                }}
              >
                {option / 60} 分钟
              </button>
            ))}
          </div>

          <div className="ncr-sustained-task__group" role="group" aria-label="选择目标频率">
            {(Object.keys(SUSTAINED_ATTENTION_FREQUENCIES) as SustainedAttentionFrequency[]).map(
              (option) => (
                <button
                  key={option}
                  type="button"
                  className={frequency === option ? "is-active" : ""}
                  disabled={phase === "running" || phase === "paused"}
                  onClick={() => {
                    setFrequency(option);
                  }}
                >
                  {SUSTAINED_ATTENTION_FREQUENCIES[option].label}
                </button>
              )
            )}
          </div>

          <label className="ncr-sustained-task__toggle">
            <input
              type="checkbox"
              checked={distractorsEnabled}
              disabled={phase === "running" || phase === "paused"}
              onChange={(event) => {
                setDistractorsEnabled(event.target.checked);
              }}
            />
            <span>显示干扰项</span>
          </label>
        </div>

        <div className="ncr-sustained-task__actions">
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

        <div className="ncr-sustained-task__status" aria-live="polite">
          <strong>{activeStimulus?.role === "target" ? "目标出现" : "观察中"}</strong>
          <span>{statusMessage}</span>
        </div>

        <canvas
          ref={canvasRef}
          className="ncr-sustained-task__canvas"
          width={width}
          height={height}
          onClick={handleCanvasClick}
          aria-label="持续注意训练画布"
        />

        <div className="ncr-sustained-task__metrics">
          <Metric label="目标次数" value={metrics.targetCount.toString()} />
          <Metric label="命中" value={metrics.hitCount.toString()} />
          <Metric label="漏反应" value={metrics.missedCount.toString()} />
          <Metric label="误点" value={metrics.falsePressCount.toString()} />
          <Metric label="平均反应" value={`${Math.round(metrics.averageReactionTimeMs)} ms`} />
          <Metric label="反应波动" value={`${Math.round(metrics.reactionTimeVariabilityMs)} ms`} />
          <Metric label="注意稳定" value={metrics.attentionStabilityScore.toString()} />
          <Metric label="任务坚持" value={metrics.taskPersistenceScore.toString()} />
        </div>

        {result ? (
          <section className="ncr-sustained-task__result" aria-label="标准 GameSessionResult">
            <div>
              <h3>标准 GameSessionResult</h3>
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
    <div className="ncr-sustained-task__metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function drawSustainedAttentionCanvas(input: {
  canvas: HTMLCanvasElement | null;
  stimulus: SustainedAttentionStimulus | null;
  phase: SustainedAttentionPhase;
  width: number;
  height: number;
  distractorsEnabled: boolean;
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

  drawFixationMark(context, input.width, input.height);

  if (input.phase === "ready" || input.phase === "completed") {
    drawCenteredText(context, "开始后请持续观察中心区域", input.width, input.height);
    return;
  }

  if (input.stimulus) {
    drawStimulus(context, input.stimulus);
  } else if (input.phase === "paused") {
    drawCenteredText(context, "训练已暂停", input.width, input.height);
  } else {
    context.fillStyle = "#6b7d76";
    context.font = "600 16px Inter, system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(
      input.distractorsEnabled ? "等待目标或干扰项出现" : "等待目标出现",
      input.width / 2,
      input.height - 34
    );
  }
}

function drawFixationMark(context: CanvasRenderingContext2D, width: number, height: number) {
  context.save();
  context.strokeStyle = "#86a89c";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(width / 2, height / 2, 8, 0, Math.PI * 2);
  context.stroke();
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
  context.fillText(text, width / 2, height / 2 + 42);
}

function drawStimulus(context: CanvasRenderingContext2D, stimulus: SustainedAttentionStimulus) {
  context.save();
  context.fillStyle = stimulus.color;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 3;
  context.beginPath();

  if (stimulus.role === "target") {
    context.arc(stimulus.x, stimulus.y, stimulus.size / 2, 0, Math.PI * 2);
  } else {
    const half = stimulus.size / 2;
    context.rect(stimulus.x - half, stimulus.y - half, stimulus.size, stimulus.size);
  }

  context.fill();
  context.stroke();
  context.restore();
}

function SustainedAttentionStyles() {
  return <style>{sustainedAttentionCss}</style>;
}

function phaseLabel(phase: SustainedAttentionPhase): string {
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

const emptyMetrics: SustainedAttentionMetrics = {
  targetCount: 0,
  hitCount: 0,
  missedCount: 0,
  falsePressCount: 0,
  averageReactionTimeMs: 0,
  reactionTimeVariabilityMs: 0,
  accuracy: 0,
  attentionStabilityScore: 0,
  taskPersistenceScore: 0
};

const sustainedAttentionCss = `
.ncr-sustained-task {
  box-sizing: border-box;
  width: 100%;
  color: #20322c;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ncr-sustained-task__header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.ncr-sustained-task__eyebrow {
  margin: 0 0 6px;
  color: #657a72;
  font-size: 13px;
  font-weight: 700;
}

.ncr-sustained-task__header h2 {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: 0;
}

.ncr-sustained-task__header p {
  margin: 8px 0 0;
  max-width: 640px;
  color: #536a62;
  font-size: 14px;
  line-height: 1.5;
}

.ncr-sustained-task__timer {
  min-width: 120px;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
  text-align: center;
}

.ncr-sustained-task__timer strong {
  display: block;
  color: #27594d;
  font-size: 28px;
  line-height: 1;
}

.ncr-sustained-task__timer span {
  display: block;
  margin-top: 5px;
  color: #657a72;
  font-size: 13px;
  font-weight: 700;
}

.ncr-sustained-task__controls,
.ncr-sustained-task__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}

.ncr-sustained-task__group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ncr-sustained-task__toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  border: 1px solid #d4e2dc;
  border-radius: 8px;
  background: #ffffff;
  padding: 0 12px;
  color: #28483f;
  font-weight: 700;
}

.ncr-sustained-task button {
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

.ncr-sustained-task button.is-active,
.ncr-sustained-task__actions button:not(.is-secondary) {
  border-color: #5f9f87;
  background: #dff0e8;
}

.ncr-sustained-task button:disabled,
.ncr-sustained-task__toggle:has(input:disabled) {
  cursor: not-allowed;
  opacity: 0.55;
}

.ncr-sustained-task button:focus-visible,
.ncr-sustained-task input:focus-visible {
  outline: 3px solid #9ccbbb;
  outline-offset: 2px;
}

.ncr-sustained-task__status {
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

.ncr-sustained-task__status span {
  color: #586f66;
}

.ncr-sustained-task__canvas {
  display: block;
  width: 100%;
  max-width: 100%;
  aspect-ratio: 12 / 7;
  border: 1px solid #d4e2dc;
  border-radius: 8px;
  background: #f8fbfa;
  cursor: pointer;
}

.ncr-sustained-task__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.ncr-sustained-task__metric {
  min-width: 0;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 10px;
}

.ncr-sustained-task__metric span {
  display: block;
  color: #657a72;
  font-size: 12px;
  font-weight: 700;
}

.ncr-sustained-task__metric strong {
  display: block;
  margin-top: 4px;
  color: #20322c;
  font-size: 20px;
  line-height: 1.1;
}

.ncr-sustained-task__result {
  margin-top: 14px;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 14px;
}

.ncr-sustained-task__result > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.ncr-sustained-task__result h3 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0;
}

.ncr-sustained-task__result pre {
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
  .ncr-sustained-task__header {
    display: grid;
  }

  .ncr-sustained-task__metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
`;
