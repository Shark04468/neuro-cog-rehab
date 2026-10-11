import {
  createGameSessionCore,
  type CountdownState,
  type GameSessionCore
} from "@neuro-cog-rehab/game-core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildTargetDetectionTrial,
  calculateTargetDetectionMetrics,
  createTargetDetectionDifficulty,
  createTargetDetectionGameResult,
  findShapeAtPoint,
  TARGET_DETECTION_DIFFICULTIES
} from "./target-detection-game-model.js";
import type {
  TargetDetectionDifficulty,
  TargetDetectionGameProps,
  TargetDetectionGameResult,
  TargetDetectionMetrics,
  TargetDetectionShape,
  TargetDetectionTrial
} from "./target-detection-game-types.js";
import {
  EEGSafetyPrompt,
  TrainingSessionShell,
  type TrainingEEGStatus,
  type TrainingMonitorItem
} from "./training-session-shell.js";

const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 420;
const DEFAULT_DURATION_SECONDS = 60;

type TargetDetectionPhase = "ready" | "running" | "paused" | "completed";

export function TargetDetectionGame(props: TargetDetectionGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coreRef = useRef<GameSessionCore | null>(null);
  const trialRef = useRef<TargetDetectionTrial | null>(null);
  const clickedShapeIdsRef = useRef<Set<string>>(new Set());
  const trialIndexRef = useRef(0);

  const width = props.width ?? DEFAULT_WIDTH;
  const height = props.height ?? DEFAULT_HEIGHT;
  const plannedDurationSeconds = props.plannedDurationSeconds ?? DEFAULT_DURATION_SECONDS;
  const [difficultyId, setDifficultyId] = useState<TargetDetectionDifficulty>(
    props.initialDifficulty ?? "easy"
  );
  const difficulty = useMemo(() => createTargetDetectionDifficulty(difficultyId), [difficultyId]);
  const [phase, setPhase] = useState<TargetDetectionPhase>("ready");
  const [currentTrial, setCurrentTrial] = useState<TargetDetectionTrial | null>(null);
  const [clickedShapeIds, setClickedShapeIds] = useState<Set<string>>(new Set());
  const [countdown, setCountdown] = useState<CountdownState | null>(null);
  const [metrics, setMetrics] = useState<TargetDetectionMetrics>(emptyMetrics);
  const [statusMessage, setStatusMessage] = useState("选择难度后开始训练。");
  const [result, setResult] = useState<TargetDetectionGameResult | null>(null);

  const refreshMetrics = useCallback((nowMs: number) => {
    const core = coreRef.current;
    if (!core) {
      return;
    }

    const snapshot = core.getSnapshot(nowMs);
    setMetrics(calculateTargetDetectionMetrics(snapshot));
    setCountdown(snapshot.countdown);
  }, []);

  const presentNextTrial = useCallback(
    (nowMs: number) => {
      const core = coreRef.current;
      if (!core) {
        return;
      }

      const nextTrial = buildTargetDetectionTrial({
        difficulty,
        trialIndex: trialIndexRef.current,
        startedAtMs: nowMs,
        width,
        height
      });
      trialIndexRef.current += 1;
      trialRef.current = nextTrial;
      clickedShapeIdsRef.current = new Set();
      setClickedShapeIds(new Set());

      for (const shape of nextTrial.shapes) {
        core.presentStimulus({
          id: shape.id,
          kind: shape.role === "target" ? "target" : "distractor",
          expectedResponse: shape.role === "target",
          presentedAtMs: nowMs,
          responseWindowMs: nextTrial.durationMs,
          metadata: {
            trialId: nextTrial.id,
            shapeKind: shape.kind,
            shapeRole: shape.role
          }
        });
      }

      setCurrentTrial(nextTrial);
      setStatusMessage(`请寻找并点击${nextTrial.targetLabel}，保持节奏，不需要抢点。`);
    },
    [difficulty, height, width]
  );

  const finishTraining = useCallback(
    (nowMs: number) => {
      const core = coreRef.current;
      if (!core) {
        return;
      }

      const coreResult = core.complete(nowMs);
      const snapshot = core.getSnapshot(nowMs);
      const nextResult = createTargetDetectionGameResult({
        coreResult,
        snapshot,
        difficulty
      });

      setResult(nextResult);
      setMetrics({
        correctCount: nextResult.correctCount,
        errorCount: nextResult.errorCount,
        missedCount: nextResult.missedCount,
        averageReactionTime: nextResult.averageReactionTime,
        reactionTimeVariability: nextResult.reactionTimeVariability,
        accuracy: nextResult.accuracy,
        attentionStabilityScore: nextResult.attentionStabilityScore
      });
      setCountdown(core.getCountdown(nowMs));
      setPhase("completed");
      setCurrentTrial(null);
      trialRef.current = null;
      setStatusMessage("本次训练已结束，可导出 JSON 结果。");
      props.onComplete?.(nextResult);
    },
    [difficulty, props]
  );

  const startTraining = () => {
    const nowMs = Date.now();
    const core = createGameSessionCore({
      sessionId: props.sessionId,
      userId: props.userId,
      trainingType: "attention_training",
      plannedDurationSeconds,
      difficulty
    });

    core.start(nowMs);
    coreRef.current = core;
    trialIndexRef.current = 0;
    setPhase("running");
    setResult(null);
    setMetrics(emptyMetrics);
    setCountdown(core.getCountdown(nowMs));
    presentNextTrial(nowMs);
  };

  const pauseTraining = () => {
    const core = coreRef.current;
    if (!core || phase !== "running") {
      return;
    }

    const nowMs = Date.now();
    setCountdown(core.pause(nowMs));
    setPhase("paused");
    setStatusMessage("训练已暂停，画面保持不变。准备好后可以继续。");
  };

  const resumeTraining = () => {
    const core = coreRef.current;
    if (!core || phase !== "paused") {
      return;
    }

    const nowMs = Date.now();
    setCountdown(core.resume(nowMs));
    setPhase("running");
    setStatusMessage("训练已继续，请按当前目标图形完成点击。");
  };

  const endTraining = () => {
    if (phase === "ready" || phase === "completed") {
      return;
    }

    finishTraining(Date.now());
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const core = coreRef.current;
    const trial = trialRef.current;

    if (!core || !trial || phase !== "running") {
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
    const shape = findShapeAtPoint(trial.shapes, point);
    const click = core.recordClick({
      clickedAtMs: Date.now(),
      ...(shape ? { stimulusId: shape.id } : {})
    });

    if (!shape) {
      setStatusMessage("这次没有点到图形，先看清目标再点击。");
    } else if (shape.role === "target" && click.classification === "correct_response") {
      const nextClickedShapeIds = new Set(clickedShapeIdsRef.current);
      nextClickedShapeIds.add(shape.id);
      clickedShapeIdsRef.current = nextClickedShapeIds;
      setClickedShapeIds(new Set(nextClickedShapeIds));
      setStatusMessage("已记录一次目标点击，继续观察其它目标。");
    } else if (shape.role === "distractor") {
      setStatusMessage("这是干扰图形，下一轮继续找目标。");
    }

    refreshMetrics(Date.now());
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
    link.download = `${result.sessionId}-target-detection-result.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (phase !== "running") {
      return;
    }

    const intervalId = window.setInterval(() => {
      const core = coreRef.current;
      const trial = trialRef.current;
      const nowMs = Date.now();

      if (!core) {
        return;
      }

      const nextCountdown = core.advance(nowMs);
      refreshMetrics(nowMs);

      if (nextCountdown.remainingSeconds <= 0) {
        finishTraining(nowMs);
        return;
      }

      if (trial && nowMs - trial.startedAtMs >= trial.durationMs) {
        presentNextTrial(nowMs);
      }
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [finishTraining, phase, presentNextTrial, refreshMetrics]);

  useEffect(() => {
    drawTargetDetectionCanvas({
      canvas: canvasRef.current,
      trial: currentTrial,
      clickedShapeIds,
      phase,
      width,
      height
    });
  }, [clickedShapeIds, currentTrial, height, phase, width]);

  const progressPercent = Math.round((countdown?.progressRate ?? 0) * 100);
  const shellEegStatus: TrainingEEGStatus = {
    connectionLabel: "已连接",
    signalQualityLabel: "信号稳定",
    attentionScore: 66,
    relaxationScore: 52,
    fatigueScore: 28,
    signalQualityScore: 88,
    qualityStatus: "good",
    paused: phase === "paused",
    safetyMode: true,
    tone: "good",
    message: "训练中仅保留目标、干扰项和必要反馈。"
  };
  const shellMonitorItems: TrainingMonitorItem[] = [
    {
      label: "当前正确率",
      value: `${Math.round(metrics.accuracy * 100)}%`,
      tone: metrics.accuracy >= 0.75 ? "good" : "neutral"
    },
    {
      label: "漏按次数",
      value: metrics.missedCount.toString(),
      tone: metrics.missedCount > 3 ? "watch" : "neutral"
    },
    {
      label: "误点次数",
      value: metrics.errorCount.toString(),
      tone: metrics.errorCount > 3 ? "watch" : "neutral"
    },
    {
      label: "训练进度",
      value: `${progressPercent}%`
    }
  ];

  return (
    <TrainingSessionShell
      moduleName="目标探测注意力训练"
      moduleSubtitle="观察图形并点击指定目标，忽略干扰项。"
      statusLabel={phaseLabel(phase)}
      remainingTimeLabel={formatClock(countdown?.remainingSeconds ?? plannedDurationSeconds)}
      difficultyLabel={difficulty.label}
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
      pauseTitle="注意力训练已暂停"
      pauseMessage="可以短暂休息，准备好后再继续本轮目标探测。"
      completeTitle="目标探测训练已完成"
      completeMessage="本次正确率、漏按和反应时指标已生成。"
      safetyPrompt={
        <EEGSafetyPrompt
          title="专注训练安全模式"
          message="页面已降低无关动效，只保留目标图形与训练反馈。"
          tone="good"
        />
      }
      variant="attention"
    >
      <section className="ncr-target-game">
        <TargetDetectionStyles />
        <header className="ncr-target-game__header">
          <div>
            <p className="ncr-target-game__eyebrow">注意力训练 / 目标探测</p>
            <h2>找到指定图形并轻点它</h2>
            <p>每轮图形会稳定呈现一小段时间。请先观察目标，再点击，避免连续乱点。</p>
          </div>
          <div className="ncr-target-game__timer" aria-label="训练倒计时">
            <strong>{formatClock(countdown?.remainingSeconds ?? plannedDurationSeconds)}</strong>
            <span>{phaseLabel(phase)}</span>
          </div>
        </header>

        <div className="ncr-target-game__toolbar">
          <div className="ncr-target-game__difficulty" role="group" aria-label="选择训练难度">
            {(Object.keys(TARGET_DETECTION_DIFFICULTIES) as TargetDetectionDifficulty[]).map(
              (id) => (
                <button
                  key={id}
                  type="button"
                  className={difficultyId === id ? "is-active" : ""}
                  disabled={phase === "running" || phase === "paused"}
                  onClick={() => {
                    setDifficultyId(id);
                  }}
                >
                  {TARGET_DETECTION_DIFFICULTIES[id].label}
                </button>
              )
            )}
          </div>

          <div className="ncr-target-game__actions">
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
        </div>

        <div className="ncr-target-game__focus-line" aria-live="polite">
          <strong>本轮目标：{currentTrial?.targetLabel ?? "等待开始"}</strong>
          <span>{statusMessage}</span>
        </div>

        <canvas
          ref={canvasRef}
          className="ncr-target-game__canvas"
          width={width}
          height={height}
          onClick={handleCanvasClick}
          aria-label="目标探测注意力训练画布"
        />

        <div className="ncr-target-game__metrics">
          <Metric label="正确" value={metrics.correctCount.toString()} />
          <Metric label="误点" value={metrics.errorCount.toString()} />
          <Metric label="漏按" value={metrics.missedCount.toString()} />
          <Metric label="平均反应" value={`${Math.round(metrics.averageReactionTime)} ms`} />
          <Metric label="正确率" value={`${Math.round(metrics.accuracy * 100)}%`} />
          <Metric label="稳定指数" value={`${metrics.attentionStabilityScore}`} />
        </div>

        {result ? (
          <section className="ncr-target-game__result" aria-label="训练结果 JSON">
            <div>
              <h3>本次训练结果</h3>
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
    <div className="ncr-target-game__metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function drawTargetDetectionCanvas(input: {
  canvas: HTMLCanvasElement | null;
  trial: TargetDetectionTrial | null;
  clickedShapeIds: Set<string>;
  phase: TargetDetectionPhase;
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

  if (!input.trial || input.phase === "ready" || input.phase === "completed") {
    context.fillStyle = "#536a62";
    context.font = "600 22px Inter, system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("按下开始后，目标图形会出现在这里", input.width / 2, input.height / 2);
    return;
  }

  for (const shape of input.trial.shapes) {
    drawShape(context, shape, input.clickedShapeIds.has(shape.id));
  }

  if (input.phase === "paused") {
    context.fillStyle = "rgba(248, 251, 250, 0.82)";
    context.fillRect(0, 0, input.width, input.height);
    context.fillStyle = "#314b43";
    context.font = "700 24px Inter, system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("训练已暂停", input.width / 2, input.height / 2);
  }
}

function drawShape(
  context: CanvasRenderingContext2D,
  shape: TargetDetectionShape,
  isSelected: boolean
) {
  context.save();
  context.fillStyle = isSelected ? "#d9efe7" : shape.color;
  context.strokeStyle = isSelected ? "#24584c" : "#ffffff";
  context.lineWidth = isSelected ? 5 : 3;
  context.beginPath();

  const half = shape.size / 2;
  switch (shape.kind) {
    case "circle":
      context.arc(shape.x, shape.y, half, 0, Math.PI * 2);
      break;
    case "square":
      context.rect(shape.x - half, shape.y - half, shape.size, shape.size);
      break;
    case "triangle":
      context.moveTo(shape.x, shape.y - half);
      context.lineTo(shape.x + half, shape.y + half);
      context.lineTo(shape.x - half, shape.y + half);
      context.closePath();
      break;
    case "diamond":
      context.moveTo(shape.x, shape.y - half);
      context.lineTo(shape.x + half, shape.y);
      context.lineTo(shape.x, shape.y + half);
      context.lineTo(shape.x - half, shape.y);
      context.closePath();
      break;
  }

  context.fill();
  context.stroke();
  context.restore();
}

function TargetDetectionStyles() {
  return <style>{targetDetectionCss}</style>;
}

function phaseLabel(phase: TargetDetectionPhase): string {
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

const emptyMetrics: TargetDetectionMetrics = {
  correctCount: 0,
  errorCount: 0,
  missedCount: 0,
  averageReactionTime: 0,
  reactionTimeVariability: 0,
  accuracy: 0,
  attentionStabilityScore: 0
};

const targetDetectionCss = `
.ncr-target-game {
  box-sizing: border-box;
  width: 100%;
  color: #20322c;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ncr-target-game__header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.ncr-target-game__eyebrow {
  margin: 0 0 6px;
  color: #657a72;
  font-size: 13px;
  font-weight: 700;
}

.ncr-target-game__header h2 {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: 0;
}

.ncr-target-game__header p {
  margin: 8px 0 0;
  max-width: 640px;
  color: #536a62;
  font-size: 14px;
  line-height: 1.5;
}

.ncr-target-game__timer {
  min-width: 120px;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
  text-align: center;
}

.ncr-target-game__timer strong {
  display: block;
  color: #27594d;
  font-size: 28px;
  line-height: 1;
}

.ncr-target-game__timer span {
  display: block;
  margin-top: 5px;
  color: #657a72;
  font-size: 13px;
  font-weight: 700;
}

.ncr-target-game__toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.ncr-target-game__difficulty,
.ncr-target-game__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ncr-target-game button {
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

.ncr-target-game button.is-active,
.ncr-target-game__actions button:not(.is-secondary) {
  border-color: #5f9f87;
  background: #dff0e8;
}

.ncr-target-game button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.ncr-target-game button:focus-visible {
  outline: 3px solid #9ccbbb;
  outline-offset: 2px;
}

.ncr-target-game__focus-line {
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

.ncr-target-game__focus-line strong {
  color: #20322c;
}

.ncr-target-game__focus-line span {
  color: #586f66;
}

.ncr-target-game__canvas {
  display: block;
  width: 100%;
  max-width: 100%;
  aspect-ratio: 12 / 7;
  border: 1px solid #d4e2dc;
  border-radius: 8px;
  background: #f8fbfa;
  cursor: pointer;
}

.ncr-target-game__metrics {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.ncr-target-game__metric {
  min-width: 0;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 10px;
}

.ncr-target-game__metric span {
  display: block;
  color: #657a72;
  font-size: 12px;
  font-weight: 700;
}

.ncr-target-game__metric strong {
  display: block;
  margin-top: 4px;
  color: #20322c;
  font-size: 20px;
  line-height: 1.1;
}

.ncr-target-game__result {
  margin-top: 14px;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 14px;
}

.ncr-target-game__result > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.ncr-target-game__result h3 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0;
}

.ncr-target-game__result pre {
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
  .ncr-target-game__header {
    display: grid;
  }

  .ncr-target-game__metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
`;
