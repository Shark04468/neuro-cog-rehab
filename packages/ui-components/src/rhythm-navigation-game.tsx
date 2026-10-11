import type { RhythmNavigationResult } from "@neuro-cog-rehab/shared-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildRhythmNavigationRound,
  calculateRhythmNavigationMetrics,
  createRhythmNavigationClickRecord,
  createRhythmNavigationResult,
  findRhythmNavigationNodeAtPoint,
  getRhythmNavigationDifficultyConfig,
  getRhythmNavigationRuleCueFrequency,
  RHYTHM_NAVIGATION_DIFFICULTIES
} from "./rhythm-navigation-game-model.js";
import type {
  RhythmNavigationClickRecord,
  RhythmNavigationDifficulty,
  RhythmNavigationGameProps,
  RhythmNavigationMetrics,
  RhythmNavigationNode,
  RhythmNavigationRound,
  RhythmNavigationRouteStep
} from "./rhythm-navigation-game-types.js";
import {
  EEGSafetyPrompt,
  TrainingSessionShell,
  type TrainingEEGStatus,
  type TrainingMonitorItem
} from "./training-session-shell.js";

const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 420;

type RhythmNavigationPhase = "ready" | "preview" | "input" | "paused" | "completed";

export function RhythmNavigationGame(props: RhythmNavigationGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startedAtMsRef = useRef<number | null>(null);
  const accumulatedPausedMsRef = useRef(0);
  const pauseStartedAtMsRef = useRef<number | null>(null);
  const pauseCountRef = useRef(0);
  const roundRef = useRef<RhythmNavigationRound | null>(null);
  const inputStartedAtMsRef = useRef<number | null>(null);
  const stepStartedAtMsRef = useRef<number | null>(null);
  const currentStepIndexRef = useRef(0);
  const clickRecordsRef = useRef<RhythmNavigationClickRecord[]>([]);
  const lastToneStepRef = useRef<number | null>(null);

  const width = props.width ?? DEFAULT_WIDTH;
  const height = props.height ?? DEFAULT_HEIGHT;
  const [difficulty, setDifficulty] = useState<RhythmNavigationDifficulty>(
    props.initialDifficulty ?? "medium"
  );
  const config = useMemo(() => getRhythmNavigationDifficultyConfig(difficulty), [difficulty]);
  const [phase, setPhase] = useState<RhythmNavigationPhase>("ready");
  const [round, setRound] = useState<RhythmNavigationRound | null>(null);
  const [clickRecords, setClickRecords] = useState<RhythmNavigationClickRecord[]>([]);
  const [renderNowMs, setRenderNowMs] = useState(Date.now());
  const [metrics, setMetrics] = useState<RhythmNavigationMetrics>(() =>
    calculateRhythmNavigationMetrics({
      clickRecords: [],
      routeLength: config.routeLength,
      beatEnabled: config.beatEnabled
    })
  );
  const [result, setResult] = useState<RhythmNavigationResult | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "选择难度后开始训练：先观察路线和规则，再按提示点击节点。"
  );

  const playCueForStep = useCallback((step: RhythmNavigationRouteStep | undefined) => {
    if (!step || step.toneCue === null || lastToneStepRef.current === step.stepIndex) {
      return;
    }

    const frequency = getRhythmNavigationRuleCueFrequency(step.ruleType);
    if (frequency === null) {
      return;
    }

    lastToneStepRef.current = step.stepIndex;

    try {
      const windowWithAudio = window as Window & {
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioContextConstructor = window.AudioContext ?? windowWithAudio.webkitAudioContext;
      if (!AudioContextConstructor) {
        return;
      }

      const audioContext = new AudioContextConstructor();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.035, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
      window.setTimeout(() => {
        void audioContext.close();
      }, 260);
    } catch {
      // Audio cues are optional; visual rule prompts remain the primary safe feedback.
    }
  }, []);

  const refreshMetrics = useCallback(
    (records: RhythmNavigationClickRecord[]) => {
      setMetrics(
        calculateRhythmNavigationMetrics({
          clickRecords: records,
          routeLength: config.routeLength,
          beatEnabled: config.beatEnabled
        })
      );
    },
    [config.beatEnabled, config.routeLength]
  );

  const finishTraining = useCallback(
    (nowMs: number, records: RhythmNavigationClickRecord[] = clickRecordsRef.current) => {
      const startedAtMs = startedAtMsRef.current ?? nowMs;
      const nextMetrics = calculateRhythmNavigationMetrics({
        clickRecords: records,
        routeLength: config.routeLength,
        beatEnabled: config.beatEnabled
      });
      const activeDurationMs = Math.max(
        nowMs - startedAtMs - accumulatedPausedMsRef.current - activePauseMs(nowMs),
        0
      );
      const nextResult = createRhythmNavigationResult({
        sessionId: props.sessionId,
        userId: props.userId,
        startedAtMs,
        endedAtMs: nowMs,
        activeDurationSeconds: activeDurationMs / 1000,
        pauseCount: pauseCountRef.current,
        config,
        metrics: nextMetrics
      });

      setMetrics(nextMetrics);
      setResult(nextResult);
      setPhase("completed");
      setStatusMessage("本次节律导航训练已结束，可导出 RhythmNavigationResult。");
      props.onComplete?.(nextResult, nextMetrics);
    },
    [config, props]
  );

  const startTraining = () => {
    const nowMs = Date.now();
    const nextRound = buildRhythmNavigationRound({
      config,
      roundIndex: 0,
      previewStartedAtMs: nowMs,
      width,
      height
    });

    startedAtMsRef.current = nowMs;
    accumulatedPausedMsRef.current = 0;
    pauseStartedAtMsRef.current = null;
    pauseCountRef.current = 0;
    roundRef.current = nextRound;
    inputStartedAtMsRef.current = null;
    stepStartedAtMsRef.current = null;
    currentStepIndexRef.current = 0;
    clickRecordsRef.current = [];
    lastToneStepRef.current = null;
    setRound(nextRound);
    setClickRecords([]);
    refreshMetrics([]);
    setResult(null);
    setRenderNowMs(nowMs);
    setPhase("preview");
    setStatusMessage(
      "请记住路线，并留意每一步的规则提示：蓝色正序、黄色倒序、低音点左侧、高音点右侧。"
    );
  };

  const pauseTraining = () => {
    if (phase !== "preview" && phase !== "input") {
      return;
    }

    pauseStartedAtMsRef.current = Date.now();
    pauseCountRef.current += 1;
    setPhase("paused");
    setStatusMessage("训练已暂停，当前路线、规则和节拍状态会保持。");
  };

  const resumeTraining = () => {
    const pauseStartedAtMs = pauseStartedAtMsRef.current;
    if (phase !== "paused" || pauseStartedAtMs === null) {
      return;
    }

    const nowMs = Date.now();
    const pausedMs = nowMs - pauseStartedAtMs;
    accumulatedPausedMsRef.current += pausedMs;

    if (roundRef.current) {
      const shiftedRound = {
        ...roundRef.current,
        previewStartedAtMs: roundRef.current.previewStartedAtMs + pausedMs,
        previewUntilMs: roundRef.current.previewUntilMs + pausedMs
      };
      roundRef.current = shiftedRound;
      setRound(shiftedRound);
    }
    if (inputStartedAtMsRef.current !== null) {
      inputStartedAtMsRef.current += pausedMs;
    }
    if (stepStartedAtMsRef.current !== null) {
      stepStartedAtMsRef.current += pausedMs;
    }

    pauseStartedAtMsRef.current = null;
    const nextPhase: RhythmNavigationPhase =
      inputStartedAtMsRef.current === null ? "preview" : "input";
    setPhase(nextPhase);

    if (nextPhase === "input") {
      const nextStep = roundRef.current?.route[currentStepIndexRef.current];
      setStatusMessage(nextStep ? ruleStatusMessage(nextStep) : "训练继续，请完成剩余路线。");
      playCueForStep(nextStep);
    } else {
      setStatusMessage("训练继续，请继续观察路线和规则。");
    }
  };

  const endTraining = () => {
    if (phase === "ready" || phase === "completed") {
      return;
    }

    finishTraining(Date.now());
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== "input") {
      return;
    }

    const canvas = canvasRef.current;
    const currentRound = roundRef.current;
    const inputStartedAtMs = inputStartedAtMsRef.current;
    const stepStartedAtMs = stepStartedAtMsRef.current;
    if (!canvas || !currentRound || inputStartedAtMs === null || stepStartedAtMs === null) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const point = {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height
    };
    const node = findRhythmNavigationNodeAtPoint(currentRound.nodes, point);
    if (!node) {
      setStatusMessage("这次没有点到节点，请看清位置后再点击。");
      return;
    }

    const stepIndex = currentStepIndexRef.current;
    const expectedStep = currentRound.route[stepIndex];
    if (!expectedStep) {
      return;
    }

    const nowMs = Date.now();
    const record = createRhythmNavigationClickRecord({
      stepIndex,
      clickedNodeId: node.id,
      expectedStep,
      clickedAtMs: nowMs,
      stepStartedAtMs,
      inputStartedAtMs,
      config
    });
    const nextRecords = [...clickRecordsRef.current, record];

    clickRecordsRef.current = nextRecords;
    currentStepIndexRef.current += 1;
    stepStartedAtMsRef.current = nowMs;
    setClickRecords(nextRecords);
    refreshMetrics(nextRecords);

    if (nextRecords.length >= config.routeLength) {
      finishTraining(nowMs, nextRecords);
      return;
    }

    const nextStep = currentRound.route[stepIndex + 1];
    setStatusMessage(
      `${clickStatusMessage(record, config.beatEnabled)} ${ruleStatusMessage(nextStep)}`
    );
    playCueForStep(nextStep);
  };

  useEffect(() => {
    if (phase !== "preview" && phase !== "input") {
      return;
    }

    const intervalId = window.setInterval(() => {
      const nowMs = Date.now();
      setRenderNowMs(nowMs);

      const currentRound = roundRef.current;
      if (phase === "preview" && currentRound && nowMs >= currentRound.previewUntilMs) {
        inputStartedAtMsRef.current = nowMs;
        stepStartedAtMsRef.current = nowMs;
        setPhase("input");

        const firstStep = currentRound.route[0];
        setStatusMessage(firstStep ? ruleStatusMessage(firstStep) : "请按记忆完成路线。");
        playCueForStep(firstStep);
      }
    }, 120);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [phase, playCueForStep]);

  useEffect(() => {
    drawRhythmNavigationCanvas({
      canvas: canvasRef.current,
      round,
      clickRecords,
      phase,
      config,
      currentStepIndex: currentStepIndexRef.current,
      inputStartedAtMs: inputStartedAtMsRef.current,
      nowMs: renderNowMs,
      width,
      height
    });
  }, [clickRecords, config, height, phase, renderNowMs, round, width]);

  const progressPercent =
    config.routeLength <= 0 ? 0 : Math.round((clickRecords.length / config.routeLength) * 100);
  const shellEegStatus: TrainingEEGStatus = {
    connectionLabel: "已连接",
    signalQualityLabel: "信号稳定",
    attentionScore: 68,
    relaxationScore: 51,
    fatigueScore: 29,
    signalQualityScore: 87,
    qualityStatus: "good",
    paused: phase === "paused",
    safetyMode: true,
    tone: "good",
    message: "训练中保留必要节拍与路线提示，背景动效已降低。"
  };
  const shellMonitorItems: TrainingMonitorItem[] = [
    {
      label: "当前正确率",
      value: formatPercent(metrics.routeAccuracy),
      tone: metrics.routeAccuracy >= 0.7 ? "good" : "neutral"
    },
    {
      label: "任务切换错误",
      value: metrics.taskSwitchErrorCount.toString(),
      helperText: "规则变化时的策略切换记录",
      tone: metrics.taskSwitchErrorCount > 0 ? "watch" : "neutral"
    },
    {
      label: "旧规则干扰",
      value: metrics.oldRuleInterferenceErrorCount.toString(),
      helperText: "仍按上一规则点击时记录",
      tone: metrics.oldRuleInterferenceErrorCount > 0 ? "watch" : "neutral"
    },
    {
      label: "训练进度",
      value: `${progressPercent}%`
    }
  ];

  function activePauseMs(nowMs: number): number {
    return pauseStartedAtMsRef.current === null ? 0 : nowMs - pauseStartedAtMsRef.current;
  }

  return (
    <TrainingSessionShell
      moduleName="节律导航训练"
      moduleSubtitle="记住路线、按规则切换顺序，并在节拍窗口内完成点击。"
      statusLabel={statusLabel(phase, config.beatEnabled)}
      remainingTimeLabel={`${Math.max(0, config.routeLength - clickRecords.length)} 步`}
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
      primaryActionDisabled={phase === "preview" || phase === "input"}
      onPrimaryAction={phase === "paused" ? resumeTraining : startTraining}
      pauseDisabled={phase !== "preview" && phase !== "input"}
      exitDisabled={phase === "ready" || phase === "completed"}
      onPause={pauseTraining}
      onExit={endTraining}
      onResume={resumeTraining}
      onRestart={startTraining}
      monitorItems={shellMonitorItems}
      isPaused={phase === "paused"}
      isCompleted={phase === "completed"}
      pauseTitle="节律导航已暂停"
      pauseMessage="请短暂休息，确认节拍提示不会造成紧张后再继续。"
      completeTitle="节律导航训练已完成"
      completeMessage="本次路线记忆、节拍同步和任务切换指标已生成。"
      safetyPrompt={
        <EEGSafetyPrompt
          title="训练安全模式"
          message="节拍提示只作为时间窗口参考，不使用高频闪烁或强节奏刺激。"
          tone="good"
        />
      }
      variant="rhythm"
    >
      <section className="ncr-rhythm-nav">
        <RhythmNavigationStyles />
        <header className="ncr-rhythm-nav__header">
          <div>
            <p className="ncr-rhythm-nav__eyebrow">节律训练 / 路线记忆导航</p>
            <h2>按规则切换路线点击策略</h2>
            <p>
              任务用于辅助训练工作记忆、节奏同步、任务切换和抑制控制，结果仅用于训练记录和趋势分析。
            </p>
          </div>
          <div className="ncr-rhythm-nav__counter" aria-label="路线进度">
            <strong>
              {clickRecords.length}/{config.routeLength}
            </strong>
            <span>{phaseLabel(phase)}</span>
          </div>
        </header>

        <div className="ncr-rhythm-nav__controls" role="group" aria-label="选择节律导航难度">
          {(Object.keys(RHYTHM_NAVIGATION_DIFFICULTIES) as RhythmNavigationDifficulty[]).map(
            (option) => {
              const optionConfig = RHYTHM_NAVIGATION_DIFFICULTIES[option];
              return (
                <button
                  key={option}
                  type="button"
                  className={difficulty === option ? "is-active" : ""}
                  disabled={phase === "preview" || phase === "input" || phase === "paused"}
                  onClick={() => {
                    setDifficulty(option);
                  }}
                >
                  {optionConfig.label}
                  <span>
                    {optionConfig.nodeCount} 节点 · {optionConfig.routeLength} 步 ·{" "}
                    {optionConfig.availableRules.length} 条规则
                  </span>
                </button>
              );
            }
          )}
        </div>

        <div className="ncr-rhythm-nav__actions">
          <button
            type="button"
            onClick={startTraining}
            disabled={phase === "preview" || phase === "input" || phase === "paused"}
          >
            {phase === "completed" ? "重新开始" : "开始"}
          </button>
          <button
            type="button"
            onClick={pauseTraining}
            disabled={phase !== "preview" && phase !== "input"}
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
            disabled={phase === "ready" || phase === "completed"}
          >
            结束
          </button>
        </div>

        <div className="ncr-rhythm-nav__status" aria-live="polite">
          <strong>{statusLabel(phase, config.beatEnabled)}</strong>
          <span>{statusMessage}</span>
        </div>

        <canvas
          ref={canvasRef}
          className="ncr-rhythm-nav__canvas"
          width={width}
          height={height}
          onClick={handleCanvasClick}
          aria-label="节律导航训练画布"
        />

        <div className="ncr-rhythm-nav__metrics">
          <Metric label="路线正确率" value={formatPercent(metrics.routeAccuracy)} />
          <Metric label="顺序错误" value={metrics.sequenceErrorCount.toString()} />
          <Metric label="切换错误" value={metrics.taskSwitchErrorCount.toString()} />
          <Metric label="旧规则干扰" value={metrics.oldRuleInterferenceErrorCount.toString()} />
          <Metric label="节拍偏移" value={`${Math.round(metrics.timingError)} ms`} />
          <Metric label="平均反应" value={`${Math.round(metrics.averageReactionTime)} ms`} />
          <Metric label="工作记忆" value={metrics.workingMemoryScore.toString()} />
          <Metric label="任务切换" value={metrics.taskSwitchingScore.toString()} />
        </div>

        {result ? (
          <section className="ncr-rhythm-nav__result" aria-label="RhythmNavigationResult">
            <div>
              <h3>RhythmNavigationResult</h3>
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
    <div className="ncr-rhythm-nav__metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function clickStatusMessage(record: RhythmNavigationClickRecord, beatEnabled: boolean): string {
  if (record.isOldRuleInterferenceError) {
    return "已记录一次旧规则干扰错误，请按新的规则继续。";
  }
  if (!record.isCorrect) {
    return "本步点击与当前规则不一致，请继续完成剩余路线。";
  }
  if (beatEnabled && record.isTimingCorrect === false) {
    return "节点选择正确，节拍时机略有偏移。";
  }
  return beatEnabled ? "节点与节拍均已记录。" : "节点选择正确。";
}

function ruleStatusMessage(step: RhythmNavigationRouteStep | undefined): string {
  if (!step) {
    return "";
  }

  return `${step.isTaskSwitch ? "规则变化：" : "当前规则："}${step.rulePrompt}`;
}

function statusLabel(phase: RhythmNavigationPhase, beatEnabled: boolean): string {
  if (phase === "preview") {
    return "路线与规则预览";
  }
  if (phase === "input") {
    return beatEnabled ? "节拍规则回忆" : "规则回忆";
  }
  if (phase === "paused") {
    return "已暂停";
  }
  return "准备观察";
}

function exportJson(result: RhythmNavigationResult) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json"
    })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${result.sessionId}-rhythm-navigation-result.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function drawRhythmNavigationCanvas(input: {
  canvas: HTMLCanvasElement | null;
  round: RhythmNavigationRound | null;
  clickRecords: RhythmNavigationClickRecord[];
  phase: RhythmNavigationPhase;
  config: ReturnType<typeof getRhythmNavigationDifficultyConfig>;
  currentStepIndex: number;
  inputStartedAtMs: number | null;
  nowMs: number;
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

  if (!input.round || input.phase === "ready" || input.phase === "completed") {
    drawCenteredText(context, "开始后会短暂显示路线和规则", input.width, input.height);
    return;
  }

  drawRoutePreview(context, input.round, input.phase === "preview");
  drawNodes(context, input.round.nodes, input.clickRecords);

  const currentStep = input.round.route[input.currentStepIndex];
  if (input.phase === "input" && currentStep) {
    drawRuleBanner(context, currentStep, input.width);
  }

  if (input.phase === "input" && input.config.beatEnabled && input.inputStartedAtMs !== null) {
    drawBeatGuide(context, input);
  }

  if (input.phase === "paused") {
    context.fillStyle = "rgba(248, 251, 250, 0.84)";
    context.fillRect(0, 0, input.width, input.height);
    drawCenteredText(context, "训练已暂停", input.width, input.height);
  }
}

function drawRoutePreview(
  context: CanvasRenderingContext2D,
  round: RhythmNavigationRound,
  showRoute: boolean
) {
  if (!showRoute) {
    return;
  }

  context.save();
  context.lineWidth = 4;
  context.setLineDash([8, 8]);

  round.route.forEach((step, index) => {
    const node = round.nodes.find((candidate) => candidate.id === step.nodeId);
    const previousStep = round.route[index - 1];
    const previousNode = previousStep
      ? round.nodes.find((candidate) => candidate.id === previousStep.nodeId)
      : null;
    if (!node) {
      return;
    }

    if (previousNode) {
      context.strokeStyle = step.ruleColor;
      context.beginPath();
      context.moveTo(previousNode.x, previousNode.y);
      context.lineTo(node.x, node.y);
      context.stroke();
    }
  });

  context.setLineDash([]);
  context.font = "700 14px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";

  round.route.forEach((step) => {
    const node = round.nodes.find((candidate) => candidate.id === step.nodeId);
    if (!node) {
      return;
    }

    context.fillStyle = step.ruleColor;
    context.beginPath();
    context.roundRect(node.x - 54, node.y - node.radius - 34, 108, 24, 8);
    context.fill();
    context.fillStyle = "#ffffff";
    context.fillText(`${step.stepIndex + 1} ${step.ruleLabel}`, node.x, node.y - node.radius - 22);
  });
  context.restore();
}

function drawNodes(
  context: CanvasRenderingContext2D,
  nodes: RhythmNavigationNode[],
  clickRecords: RhythmNavigationClickRecord[]
) {
  const clickedNodeIds = new Set(clickRecords.map((record) => record.clickedNodeId));

  for (const node of nodes) {
    context.save();
    context.fillStyle = clickedNodeIds.has(node.id) ? "#d9efe7" : node.color;
    context.strokeStyle = clickedNodeIds.has(node.id) ? "#24584c" : "#ffffff";
    context.lineWidth = clickedNodeIds.has(node.id) ? 5 : 3;
    context.beginPath();
    context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = "#ffffff";
    context.font = "700 18px Inter, system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(node.label, node.x, node.y);
    context.restore();
  }
}

function drawRuleBanner(
  context: CanvasRenderingContext2D,
  step: RhythmNavigationRouteStep,
  width: number
) {
  context.save();
  context.fillStyle = step.ruleColor;
  context.beginPath();
  context.roundRect(24, 20, width - 48, 42, 10);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "700 16px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(`${step.isTaskSwitch ? "规则变化：" : ""}${step.rulePrompt}`, width / 2, 42);
  context.restore();
}

function drawBeatGuide(
  context: CanvasRenderingContext2D,
  input: {
    config: ReturnType<typeof getRhythmNavigationDifficultyConfig>;
    currentStepIndex: number;
    inputStartedAtMs: number | null;
    nowMs: number;
    width: number;
    height: number;
  }
) {
  if (input.inputStartedAtMs === null) {
    return;
  }

  const targetBeatAtMs =
    input.inputStartedAtMs + input.config.beatIntervalMs * (input.currentStepIndex + 1);
  const distanceToBeatMs = Math.abs(input.nowMs - targetBeatAtMs);
  const normalized = Math.max(0, 1 - distanceToBeatMs / input.config.beatIntervalMs);
  const radius = 18 + normalized * 26;
  const x = input.width / 2;
  const y = input.height - 46;

  context.save();
  context.strokeStyle = distanceToBeatMs <= input.config.timingToleranceMs ? "#4f8b79" : "#b58b4c";
  context.lineWidth = 4;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = "#536a62";
  context.font = "700 13px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText("节拍窗口", x, y + 4);
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

function RhythmNavigationStyles() {
  return <style>{rhythmNavigationCss}</style>;
}

function phaseLabel(phase: RhythmNavigationPhase): string {
  switch (phase) {
    case "ready":
      return "准备中";
    case "preview":
      return "预览中";
    case "input":
      return "回忆中";
    case "paused":
      return "已暂停";
    case "completed":
      return "已结束";
  }
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

const rhythmNavigationCss = `
.ncr-rhythm-nav {
  box-sizing: border-box;
  width: 100%;
  color: #20322c;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ncr-rhythm-nav__header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.ncr-rhythm-nav__eyebrow {
  margin: 0 0 6px;
  color: #657a72;
  font-size: 13px;
  font-weight: 700;
}

.ncr-rhythm-nav__header h2 {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: 0;
}

.ncr-rhythm-nav__header p {
  margin: 8px 0 0;
  max-width: 700px;
  color: #536a62;
  font-size: 14px;
  line-height: 1.5;
}

.ncr-rhythm-nav__counter {
  min-width: 120px;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
  text-align: center;
}

.ncr-rhythm-nav__counter strong {
  display: block;
  color: #27594d;
  font-size: 28px;
  line-height: 1;
}

.ncr-rhythm-nav__counter span {
  display: block;
  margin-top: 5px;
  color: #657a72;
  font-size: 13px;
  font-weight: 700;
}

.ncr-rhythm-nav__controls,
.ncr-rhythm-nav__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}

.ncr-rhythm-nav__controls button {
  display: grid;
  gap: 4px;
  min-width: 172px;
  min-height: 58px;
  text-align: left;
}

.ncr-rhythm-nav__controls button span {
  color: #647a72;
  font-size: 12px;
  font-weight: 600;
}

.ncr-rhythm-nav button {
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

.ncr-rhythm-nav button.is-active,
.ncr-rhythm-nav__actions button:not(.is-secondary) {
  border-color: #5f9f87;
  background: #dff0e8;
}

.ncr-rhythm-nav button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.ncr-rhythm-nav button:focus-visible {
  outline: 3px solid #9ccbbb;
  outline-offset: 2px;
}

.ncr-rhythm-nav__status {
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

.ncr-rhythm-nav__status span {
  color: #586f66;
}

.ncr-rhythm-nav__canvas {
  display: block;
  width: 100%;
  max-width: 100%;
  aspect-ratio: 12 / 7;
  border: 1px solid #d4e2dc;
  border-radius: 8px;
  background: #f8fbfa;
  cursor: pointer;
}

.ncr-rhythm-nav__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.ncr-rhythm-nav__metric {
  min-width: 0;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 10px;
}

.ncr-rhythm-nav__metric span {
  display: block;
  color: #657a72;
  font-size: 12px;
  font-weight: 700;
}

.ncr-rhythm-nav__metric strong {
  display: block;
  margin-top: 4px;
  color: #20322c;
  font-size: 20px;
  line-height: 1.1;
}

.ncr-rhythm-nav__result {
  margin-top: 14px;
  border: 1px solid #d9e5df;
  border-radius: 8px;
  background: #ffffff;
  padding: 14px;
}

.ncr-rhythm-nav__result > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.ncr-rhythm-nav__result h3 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0;
}

.ncr-rhythm-nav__result pre {
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
  .ncr-rhythm-nav__header {
    display: grid;
  }

  .ncr-rhythm-nav__metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
`;
