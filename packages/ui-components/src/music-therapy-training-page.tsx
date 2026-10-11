import { useEffect, useMemo, useRef, useState } from "react";

import {
  createMockMusicTherapyEegSnapshot,
  createMusicTherapyTrainingSummary,
  createTrendPoint,
  formatTrainingClock,
  musicTherapyEegGuidance,
  phaseInstruction,
  shouldPauseMusicTrainingForEeg
} from "./music-therapy-training-model.js";
import type {
  MusicTherapyEegSnapshot,
  MusicTherapyTrainingPageProps,
  MusicTherapyTrainingPhase,
  MusicTherapyTrainingSummary,
  MusicTherapyTrendPoint
} from "./music-therapy-training-types.js";
import {
  EEGSafetyPrompt,
  TrainingSessionShell,
  type TrainingEEGStatus,
  type TrainingMonitorItem,
  type TrainingSafetyTone
} from "./training-session-shell.js";
import {
  CognitiveStateRadar,
  EEGSessionTimeline,
  ProfessionalEEGWavePanel,
  SignalQualityMeter,
  type EEGSessionTimelineEvent,
  type EEGVisualizationFrame
} from "./professional-eeg-visualization.js";

const DEFAULT_BASELINE_SECONDS = 60;
const DEFAULT_VOLUME_LEVEL = 45;

interface RuntimeState {
  phase: MusicTherapyTrainingPhase;
  isPaused: boolean;
  baselineElapsedSeconds: number;
  musicElapsedSeconds: number;
  startedAt: string | null;
  playbackStartedAt: string | null;
  trendPoints: MusicTherapyTrendPoint[];
  summary: MusicTherapyTrainingSummary | null;
}

const initialRuntimeState: RuntimeState = {
  phase: "intro",
  isPaused: false,
  baselineElapsedSeconds: 0,
  musicElapsedSeconds: 0,
  startedAt: null,
  playbackStartedAt: null,
  trendPoints: [],
  summary: null
};

export function MusicTherapyTrainingPage(props: MusicTherapyTrainingPageProps) {
  const baselineDurationSeconds = props.baselineDurationSeconds ?? DEFAULT_BASELINE_SECONDS;
  const volumeLevel = props.volumeLevel ?? DEFAULT_VOLUME_LEVEL;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState(
    props.initialTrackId ?? props.tracks[0]?.id ?? ""
  );
  const [runtime, setRuntime] = useState<RuntimeState>(initialRuntimeState);
  const [audioPrompt, setAudioPrompt] = useState<string | null>(null);

  const selectedTrack = useMemo(
    () => props.tracks.find((track) => track.id === selectedTrackId) ?? props.tracks[0],
    [props.tracks, selectedTrackId]
  );
  const activeElapsedSeconds = runtime.baselineElapsedSeconds + runtime.musicElapsedSeconds;
  const eegSnapshot =
    props.eegSnapshot ??
    createMockMusicTherapyEegSnapshot({
      phase: runtime.phase,
      elapsedSeconds: activeElapsedSeconds,
      ...(selectedTrack ? { track: selectedTrack } : {})
    });
  const shouldPauseForEeg = shouldPauseMusicTrainingForEeg(eegSnapshot);
  const effectivePaused = runtime.isPaused || shouldPauseForEeg;
  const progressPercent =
    runtime.phase === "baseline"
      ? percent(runtime.baselineElapsedSeconds, baselineDurationSeconds)
      : runtime.phase === "music" && selectedTrack
        ? percent(runtime.musicElapsedSeconds, selectedTrack.duration)
        : runtime.phase === "completed"
          ? 100
          : 0;

  useEffect(() => {
    if (runtime.phase !== "baseline" && runtime.phase !== "music") {
      return;
    }

    if (effectivePaused || !selectedTrack) {
      return;
    }

    const timer = window.setInterval(() => {
      setRuntime((current) => tickRuntime(current, selectedTrack, baselineDurationSeconds));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [baselineDurationSeconds, effectivePaused, runtime.phase, selectedTrack]);

  useEffect(() => {
    if (runtime.phase !== "baseline" && runtime.phase !== "music") {
      return;
    }

    const point = createTrendPoint(activeElapsedSeconds, eegSnapshot);
    if (!point) {
      return;
    }

    setRuntime((current) => ({
      ...current,
      trendPoints: appendTrendPoint(current.trendPoints, point)
    }));
  }, [
    activeElapsedSeconds,
    eegSnapshot.attentionScore,
    eegSnapshot.fatigueScore,
    eegSnapshot.relaxationScore,
    runtime.phase
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = Math.min(1, Math.max(0, volumeLevel / 100));

    if (runtime.phase !== "music" || effectivePaused) {
      audio.pause();
      return;
    }

    const playAttempt = audio.play();
    if (playAttempt) {
      playAttempt
        .then(() => {
          setAudioPrompt(null);
        })
        .catch(() => {
          setAudioPrompt("音乐素材暂时无法自动播放，请确认素材链接后再继续。");
        });
    }
  }, [effectivePaused, runtime.phase, selectedTrackId, volumeLevel]);

  const startTraining = () => {
    if (!selectedTrack || shouldPauseForEeg) {
      return;
    }

    setRuntime({
      ...initialRuntimeState,
      phase: "baseline",
      startedAt: new Date().toISOString()
    });
    setAudioPrompt(null);
  };

  const pauseTraining = () => {
    setRuntime((current) => ({ ...current, isPaused: true }));
  };

  const resumeTraining = () => {
    if (shouldPauseForEeg) {
      return;
    }

    setRuntime((current) => ({ ...current, isPaused: false }));
  };

  const endTraining = () => {
    if (!selectedTrack || !runtime.startedAt) {
      return;
    }

    const summary = createMusicTherapyTrainingSummary({
      resultInput: {
        userId: props.userId,
        ...(props.trainingSessionId ? { trainingSessionId: props.trainingSessionId } : {}),
        track: selectedTrack,
        purpose: props.purpose ?? "training_support",
        startedAt: runtime.startedAt,
        endedAt: new Date().toISOString(),
        durationSeconds: runtime.musicElapsedSeconds,
        plannedDurationSeconds: selectedTrack.duration,
        volumeLevel
      },
      trendPoints: runtime.trendPoints,
      baselineDurationSeconds
    });
    setRuntime((current) => ({
      ...current,
      phase: "completed",
      isPaused: false,
      summary
    }));
    audioRef.current?.pause();
    props.onResult?.(summary);
  };

  const canStart = runtime.phase === "intro" || runtime.phase === "completed";
  const canPause = (runtime.phase === "baseline" || runtime.phase === "music") && !effectivePaused;
  const canResume =
    (runtime.phase === "baseline" || runtime.phase === "music") &&
    runtime.isPaused &&
    !shouldPauseForEeg;
  const canEnd = runtime.phase === "baseline" || runtime.phase === "music";
  const shellTone = toTrainingTone(eegSnapshot);
  const shellEegStatus: TrainingEEGStatus = {
    connectionLabel: eegSnapshot.connectionStatus === "connected" ? "已连接" : "待连接",
    signalQualityLabel: eegSnapshot.qualityStatus === "good" ? "信号稳定" : "建议复核",
    attentionScore: eegSnapshot.attentionScore,
    relaxationScore: eegSnapshot.relaxationScore,
    fatigueScore: eegSnapshot.fatigueScore,
    signalQualityScore: eegSnapshot.qualityStatus === "good" ? 88 : 58,
    qualityStatus: eegSnapshot.qualityStatus,
    frames: buildMusicEegFrames(runtime.trendPoints, eegSnapshot),
    timelineEvents: buildMusicTimelineEvents(runtime, baselineDurationSeconds, eegSnapshot),
    paused: runtime.isPaused,
    safetyMode: true,
    tone: shellTone,
    message: musicTherapyEegGuidance(eegSnapshot)
  };
  const monitorItems: TrainingMonitorItem[] = [
    {
      label: "放松状态",
      value: formatNullableScore(eegSnapshot.relaxationScore),
      helperText: "观察本次音乐训练中的放松趋势",
      tone: "good"
    },
    {
      label: "当前正确率",
      value: "不适用",
      helperText: "音乐疗愈模块不进行点击判定"
    },
    {
      label: "训练进度",
      value: `${Math.round(progressPercent)}%`,
      helperText: runtime.phase === "music" ? "音乐播放进度" : "静息基线进度"
    }
  ];

  return (
    <TrainingSessionShell
      moduleName="音乐疗愈训练"
      moduleSubtitle={phaseInstruction(runtime.phase, baselineDurationSeconds)}
      statusLabel={phaseLabel(runtime.phase)}
      remainingTimeLabel={remainingMusicTrainingTimeLabel({
        runtime,
        baselineDurationSeconds,
        selectedTrackDuration: selectedTrack?.duration ?? 0
      })}
      difficultyLabel="柔和沉浸"
      eegStatus={shellEegStatus}
      progressPercent={progressPercent}
      primaryActionLabel={
        canStart
          ? runtime.phase === "completed"
            ? "重新开始"
            : "开始训练"
          : canResume
            ? "继续训练"
            : undefined
      }
      primaryActionDisabled={
        canStart ? !selectedTrack || shouldPauseForEeg : canResume ? shouldPauseForEeg : false
      }
      onPrimaryAction={canStart ? startTraining : canResume ? resumeTraining : undefined}
      pauseDisabled={!canPause}
      exitDisabled={!canEnd}
      onPause={pauseTraining}
      onExit={endTraining}
      onResume={resumeTraining}
      onRestart={startTraining}
      monitorItems={monitorItems}
      isPaused={runtime.isPaused || shouldPauseForEeg}
      isCompleted={runtime.phase === "completed"}
      pauseTitle={shouldPauseForEeg ? "EEG状态需要复核" : "音乐训练已暂停"}
      pauseMessage={
        shouldPauseForEeg
          ? "请先调整佩戴或稍作休息，状态稳定后再继续。"
          : "可以短暂休息，准备好后继续本次训练。"
      }
      completeTitle="本次音乐训练已完成"
      completeMessage="已生成本次音乐适配摘要，可用于训练记录和趋势回顾。"
      safetyPrompt={
        shouldPauseForEeg ? (
          <EEGSafetyPrompt
            tone="watch"
            title="温和提示"
            message="当前信号或疲劳趋势需要复核，建议先暂停并调整状态。"
          />
        ) : (
          <EEGSafetyPrompt
            tone={shellTone}
            title="训练安全模式"
            message="正式训练中已降低背景动效，只保留必要的音乐和状态反馈。"
          />
        )
      }
      setupPanel={
        <div className="ncr-music-training__setup ncr-music-training__setup--shell">
          <label>
            <span>本次音乐</span>
            <select
              value={selectedTrackId}
              disabled={runtime.phase === "baseline" || runtime.phase === "music"}
              onChange={(event) => {
                setSelectedTrackId(event.target.value);
              }}
            >
              {props.tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.title}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span>训练提示</span>
            <strong>{selectedTrack?.recommendedScene ?? "请选择音乐素材"}</strong>
          </div>
        </div>
      }
      resultPanel={runtime.summary ? <ResultSummary summary={runtime.summary} /> : null}
      variant="music"
    >
      <section className="ncr-music-training">
        <MusicTherapyTrainingStyles />
        <header className="ncr-music-training__header ncr-music-training__header--shell">
          <div>
            <p className="ncr-music-training__eyebrow">音乐疗愈训练</p>
            <h2>{phaseTitle(runtime.phase)}</h2>
            <p>{phaseInstruction(runtime.phase, baselineDurationSeconds)}</p>
          </div>
          <div className="ncr-music-training__phase">{phaseLabel(runtime.phase)}</div>
        </header>

        {selectedTrack ? (
          <audio
            ref={audioRef}
            src={selectedTrack.fileUrl}
            preload="none"
            onEnded={endTraining}
            onError={() => {
              setAudioPrompt("音乐素材暂时无法加载，请更换素材或稍后重试。");
            }}
          />
        ) : null}

        {audioPrompt ? <p className="ncr-music-training__audio-note">{audioPrompt}</p> : null}

        <div className="ncr-music-training__progress" aria-label="训练进度">
          <div>
            <span>{runtime.phase === "music" ? "音乐播放" : "静息基线"}</span>
            <strong>
              {runtime.phase === "music"
                ? `${formatTrainingClock(runtime.musicElapsedSeconds)} / ${formatTrainingClock(
                    selectedTrack?.duration ?? 0
                  )}`
                : `${formatTrainingClock(runtime.baselineElapsedSeconds)} / ${formatTrainingClock(
                    baselineDurationSeconds
                  )}`}
            </strong>
          </div>
          <div className="ncr-music-training__progress-bar">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <TrendPanel
          baselineDurationSeconds={baselineDurationSeconds}
          runtime={runtime}
          snapshot={eegSnapshot}
          trendPoints={runtime.trendPoints}
        />
      </section>
    </TrainingSessionShell>
  );
}

function tickRuntime(
  current: RuntimeState,
  selectedTrack: NonNullable<MusicTherapyTrainingPageProps["tracks"][number]>,
  baselineDurationSeconds: number
): RuntimeState {
  if (current.phase === "baseline") {
    const nextBaseline = Math.min(current.baselineElapsedSeconds + 1, baselineDurationSeconds);
    if (nextBaseline >= baselineDurationSeconds) {
      return {
        ...current,
        phase: "music",
        baselineElapsedSeconds: nextBaseline,
        playbackStartedAt: current.playbackStartedAt ?? new Date().toISOString()
      };
    }

    return { ...current, baselineElapsedSeconds: nextBaseline };
  }

  if (current.phase === "music") {
    const nextMusic = Math.min(current.musicElapsedSeconds + 1, selectedTrack.duration);
    if (nextMusic >= selectedTrack.duration) {
      return { ...current, musicElapsedSeconds: nextMusic };
    }

    return { ...current, musicElapsedSeconds: nextMusic };
  }

  return current;
}

function appendTrendPoint(
  current: MusicTherapyTrendPoint[],
  point: MusicTherapyTrendPoint
): MusicTherapyTrendPoint[] {
  if (current.some((item) => item.second === point.second)) {
    return current;
  }

  return [...current.slice(-90), point];
}

function buildMusicEegFrames(
  trendPoints: MusicTherapyTrendPoint[],
  snapshot: MusicTherapyEegSnapshot
): EEGVisualizationFrame[] {
  const source =
    trendPoints.length > 0
      ? trendPoints
      : [
          {
            second: 0,
            attentionScore: snapshot.attentionScore ?? 0,
            relaxationScore: snapshot.relaxationScore ?? 0,
            fatigueScore: snapshot.fatigueScore ?? 0
          }
        ];
  const latestSecond = source[source.length - 1]?.second ?? 0;

  return source.slice(-48).map((point) => {
    const attention = point.attentionScore;
    const relaxation = point.relaxationScore;
    const fatigue = point.fatigueScore;
    const thetaPower = 0.32 + fatigue / 360;
    const alphaPower = 0.36 + relaxation / 280;
    const betaPower = 0.34 + attention / 300;

    return {
      timestamp: new Date(
        Date.now() - Math.max(0, latestSecond - point.second) * 1000
      ).toISOString(),
      attentionScore: attention,
      relaxationScore: relaxation,
      fatigueScore: fatigue,
      stabilityScore: snapshot.qualityStatus === "good" ? 82 : 58,
      engagementScore: Math.round(attention * 0.58 + (100 - fatigue) * 0.28),
      signalQuality: snapshot.qualityStatus === "good" ? 88 : 58,
      qualityStatus: snapshot.qualityStatus,
      thetaPower,
      alphaPower,
      betaPower
    };
  });
}

function buildMusicTimelineEvents(
  runtime: RuntimeState,
  baselineDurationSeconds: number,
  snapshot: MusicTherapyEegSnapshot
): EEGSessionTimelineEvent[] {
  const events: EEGSessionTimelineEvent[] = [
    {
      id: "baseline-start",
      timeLabel: "0:00",
      label: "静息基线",
      description: "先观察安静状态，作为本次训练参考。",
      tone: "neutral"
    }
  ];

  if (
    runtime.phase === "music" ||
    runtime.phase === "completed" ||
    runtime.musicElapsedSeconds > 0
  ) {
    events.push({
      id: "music-start",
      timeLabel: formatTrainingClock(baselineDurationSeconds),
      label: "音乐开始",
      description: "开始播放治疗师配置的音乐素材。",
      tone: "good"
    });
  }

  if (runtime.isPaused) {
    events.push({
      id: "manual-pause",
      timeLabel: formatTrainingClock(runtime.baselineElapsedSeconds + runtime.musicElapsedSeconds),
      label: "训练暂停",
      description: "已保留当前进度，可在状态稳定后继续。",
      tone: "pause"
    });
  }

  if (snapshot.qualityStatus !== "good") {
    events.push({
      id: "signal-review",
      timeLabel: formatTrainingClock(runtime.baselineElapsedSeconds + runtime.musicElapsedSeconds),
      label: "信号复核",
      description: "建议调整佩戴或减少大幅动作。",
      tone: "watch"
    });
  }

  if (runtime.phase === "completed") {
    events.push({
      id: "session-complete",
      timeLabel: formatTrainingClock(runtime.baselineElapsedSeconds + runtime.musicElapsedSeconds),
      label: "训练结束",
      description: "已生成本次趋势摘要。",
      tone: "good"
    });
  }

  return events;
}

function TrendPanel(props: {
  baselineDurationSeconds: number;
  runtime: RuntimeState;
  trendPoints: MusicTherapyTrendPoint[];
  snapshot: MusicTherapyEegSnapshot;
}) {
  const latest = props.trendPoints.at(-1);
  const frames = buildMusicEegFrames(props.trendPoints, props.snapshot);
  const timelineEvents = buildMusicTimelineEvents(
    props.runtime,
    props.baselineDurationSeconds,
    props.snapshot
  );

  return (
    <section className="ncr-music-training__trend" aria-label="实时趋势">
      <ProfessionalEEGWavePanel
        channels={["theta", "alpha", "beta", "relaxation"]}
        frames={frames}
        paused={props.runtime.isPaused}
        safetyMode
        signalQualityStatus={props.snapshot.qualityStatus}
        title="音乐疗愈 EEG 监测"
      />
      <div className="ncr-music-training__neuro-grid">
        <CognitiveStateRadar frame={frames.at(-1)} safetyMode title="音乐中状态维度" />
        <SignalQualityMeter
          signalQuality={props.snapshot.qualityStatus === "good" ? 88 : 58}
          status={props.snapshot.qualityStatus}
          title="佩戴与信号"
        />
      </div>
      <EEGSessionTimeline events={timelineEvents} title="本次音乐训练节点" />
      <Metric
        label="最新状态"
        value={`注意 ${formatNullableScore(
          latest?.attentionScore ?? props.snapshot.attentionScore
        )} · 放松 ${formatNullableScore(latest?.relaxationScore ?? props.snapshot.relaxationScore)}`}
      />
    </section>
  );
}

function ResultSummary(props: { summary: MusicTherapyTrainingSummary }) {
  return (
    <section className="ncr-music-training__summary" aria-label="MusicTherapySession结果摘要">
      <div>
        <h3>本次结果摘要</h3>
        <span>MusicTherapySession</span>
      </div>
      <div className="ncr-music-training__summary-grid">
        <Metric label="音乐时长" value={formatTrainingClock(props.summary.musicDurationSeconds)} />
        <Metric label="注意均值" value={formatNullableScore(props.summary.averageAttentionScore)} />
        <Metric
          label="放松均值"
          value={formatNullableScore(props.summary.averageRelaxationScore)}
        />
        <Metric label="疲劳均值" value={formatNullableScore(props.summary.averageFatigueScore)} />
      </div>
      <pre>{JSON.stringify(props.summary.result, null, 2)}</pre>
    </section>
  );
}

function Metric(props: { label: string; value: string }) {
  return (
    <div className="ncr-music-training__metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function phaseTitle(phase: MusicTherapyTrainingPhase): string {
  switch (phase) {
    case "intro":
      return "准备进入柔和训练空间";
    case "baseline":
      return "静息基线采集中";
    case "music":
      return "音乐播放中";
    case "completed":
      return "训练已完成";
  }
}

function phaseLabel(phase: MusicTherapyTrainingPhase): string {
  switch (phase) {
    case "intro":
      return "准备中";
    case "baseline":
      return "基线采集";
    case "music":
      return "音乐训练";
    case "completed":
      return "已完成";
  }
}

function remainingMusicTrainingTimeLabel(input: {
  runtime: RuntimeState;
  baselineDurationSeconds: number;
  selectedTrackDuration: number;
}): string {
  if (input.runtime.phase === "baseline") {
    return formatTrainingClock(
      input.baselineDurationSeconds - input.runtime.baselineElapsedSeconds
    );
  }
  if (input.runtime.phase === "music") {
    return formatTrainingClock(input.selectedTrackDuration - input.runtime.musicElapsedSeconds);
  }
  return input.runtime.phase === "completed"
    ? "0:00"
    : formatTrainingClock(input.baselineDurationSeconds);
}

function toTrainingTone(snapshot: MusicTherapyEegSnapshot): TrainingSafetyTone {
  if (snapshot.connectionStatus === "disconnected" || snapshot.qualityStatus === "disconnected") {
    return "pause";
  }
  if (snapshot.qualityStatus === "noisy" || snapshot.qualityStatus === "unstable") {
    return "watch";
  }
  return "good";
}

function formatNullableScore(value: number | null | undefined): string {
  return typeof value === "number" ? `${Math.round(value)}` : "--";
}

function percent(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function MusicTherapyTrainingStyles() {
  return <style>{musicTherapyTrainingCss}</style>;
}

const musicTherapyTrainingCss = `
.ncr-music-training {
  display: grid;
  gap: 14px;
}

.ncr-music-training__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.ncr-music-training__eyebrow {
  margin: 0 0 6px;
  color: #1a9bb5;
  font-size: 13px;
  font-weight: 840;
}

.ncr-music-training__header h2 {
  margin: 0;
  color: #0d2533;
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.15;
}

.ncr-music-training__header p {
  max-width: 680px;
  margin: 8px 0 0;
  color: #5f7280;
  line-height: 1.6;
}

.ncr-music-training__phase {
  border: 1px solid rgba(34, 168, 161, 0.25);
  border-radius: 999px;
  padding: 8px 12px;
  color: #145f85;
  background: rgba(232, 250, 250, 0.72);
  font-weight: 840;
}

.ncr-music-training__setup--shell {
  display: grid;
  grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.2fr);
  gap: 14px;
  align-items: end;
}

.ncr-music-training__setup--shell span,
.ncr-music-training__setup--shell strong {
  display: block;
}

.ncr-music-training__setup--shell strong {
  margin-top: 5px;
  color: #0d2533;
}

.ncr-music-training__audio-note {
  border: 1px solid rgba(208, 145, 42, 0.28);
  border-radius: 14px;
  padding: 10px 12px;
  color: #8a681d;
  background: rgba(255, 247, 228, 0.72);
}

.ncr-music-training__progress {
  border: 1px solid rgba(126, 190, 217, 0.24);
  border-radius: 18px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.68);
}

.ncr-music-training__progress span,
.ncr-music-training__metric span,
.ncr-music-training__summary span {
  color: #5f7280;
  font-size: 12px;
}

.ncr-music-training__progress strong,
.ncr-music-training__metric strong {
  display: block;
  margin-top: 5px;
  color: #0d2533;
  font-size: 21px;
  font-variant-numeric: tabular-nums;
}

.ncr-music-training__progress-bar {
  overflow: hidden;
  height: 10px;
  margin-top: 12px;
  border-radius: 999px;
  background: rgba(126, 190, 217, 0.18);
}

.ncr-music-training__progress-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #1a9bb5, #22a8a1);
}

.ncr-music-training__trend,
.ncr-music-training__summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.ncr-music-training__summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.ncr-music-training__metric {
  border: 1px solid rgba(126, 190, 217, 0.24);
  border-radius: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.68);
}

.ncr-music-training__summary {
  display: grid;
  gap: 12px;
}

.ncr-music-training__summary h3 {
  margin: 0;
  color: #0d2533;
}

.ncr-music-training__summary pre {
  max-height: 260px;
  overflow: auto;
  margin: 0;
  border-radius: 14px;
  background: rgba(244, 248, 250, 0.86);
  color: #102b3a;
  padding: 12px;
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 760px) {
  .ncr-music-training__header,
  .ncr-music-training__setup--shell,
  .ncr-music-training__trend,
  .ncr-music-training__summary-grid {
    grid-template-columns: 1fr;
    display: grid;
  }
}
`;
