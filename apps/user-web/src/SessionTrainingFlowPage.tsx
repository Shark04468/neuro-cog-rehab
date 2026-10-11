import { useMemo, useState } from "react";

import {
  buildDemoEegPauseFrames,
  completeCurrentStage,
  createSessionTrainingFlowState,
  generateSessionSummary,
  getCurrentFlowStage,
  pauseSessionForEeg,
  resumeSessionFlow,
  type SessionFlowStageId,
  type SessionFlowStageState,
  type SessionStageResult,
  type TherapistSessionFlowConfig
} from "./session-flow-model.js";
import { TrainingEndFeedbackPage } from "./TrainingEndFeedbackPage.js";
import type { TrainingRecordPersistenceResult } from "./TrainingEndFeedbackPage.js";
import type { TrainingRecordSaveDraft } from "./training-feedback-model.js";

export interface SessionTrainingFlowPageProps {
  config: TherapistSessionFlowConfig;
  onBackToHome: () => void;
  onSaveTrainingRecord?:
    | ((draft: TrainingRecordSaveDraft) => Promise<TrainingRecordPersistenceResult>)
    | undefined;
}

const MODULE_STAGE_IDS: SessionFlowStageId[] = [
  "music_therapy",
  "attention_training",
  "go_nogo_training",
  "rhythm_navigation"
];

export function SessionTrainingFlowPage(props: SessionTrainingFlowPageProps) {
  const [flowState, setFlowState] = useState(() => createSessionTrainingFlowState(props.config));
  const currentStage = getCurrentFlowStage(flowState);
  const sessionSummary = useMemo(() => generateSessionSummary(flowState), [flowState]);

  const handleSaveStage = () => {
    setFlowState((current) => {
      const activeStage = getCurrentFlowStage(current);
      if (!activeStage || activeStage.status !== "active") {
        return current;
      }

      return completeCurrentStage(current, new Date(), {
        savedFromPage: "single_session_flow",
        eegPauseAllowed: activeStage.requiresEeg
      });
    });
  };

  const handleEegPause = () => {
    setFlowState((current) =>
      pauseSessionForEeg(current, {
        now: new Date(),
        eegFrames: buildDemoEegPauseFrames(new Date()),
        elapsedSeconds: sessionSummary.totalDurationSeconds
      })
    );
  };

  const handleResume = () => {
    setFlowState((current) => resumeSessionFlow(current));
  };

  if (!currentStage && sessionSummary.status === "saved") {
    return (
      <TrainingEndFeedbackPage
        onBackToHome={props.onBackToHome}
        onSaveRecord={props.onSaveTrainingRecord}
        summary={sessionSummary}
      />
    );
  }

  return (
    <main className="app-shell">
      <section className="flow-band" aria-labelledby="flow-title">
        <div className="flow-inner">
          <button className="text-button" type="button" onClick={props.onBackToHome}>
            返回今日首页
          </button>

          <header className="flow-header">
            <div>
              <p className="home-kicker">单次训练总流程</p>
              <h1 id="flow-title">{props.config.traineeDisplayName} 的本次训练</h1>
              <p className="home-subtitle">
                按阶段完成训练，每个阶段结束后保存结果。所有内容仅用于训练记录和趋势查看。
              </p>
            </div>
            <div className="flow-save-card">
              <span>SessionSummary</span>
              <strong>{sessionSummary.savedStageResultCount} 个阶段结果</strong>
              <p>{sessionSummary.recommendedNextStep}</p>
            </div>
          </header>

          <section className="flow-config-panel" aria-labelledby="flow-config">
            <div>
              <p>治疗师配置</p>
              <h2 id="flow-config">模块开启与跳过</h2>
            </div>
            <div className="flow-config-grid">
              {MODULE_STAGE_IDS.map((stageId) => (
                <span
                  className="flow-config-pill"
                  data-enabled={!props.config.skippedStageIds.includes(stageId)}
                  key={stageId}
                >
                  {stageLabel(stageId)}
                  {props.config.skippedStageIds.includes(stageId) ? "：跳过" : "：开启"}
                </span>
              ))}
            </div>
          </section>

          {flowState.pauseDecision?.prompt ? (
            <section className="flow-pause-banner" aria-live="polite">
              <div>
                <p>{flowState.pauseDecision.prompt.title}</p>
                <strong>{flowState.pauseDecision.prompt.message}</strong>
                <span>{flowState.pauseDecision.prompt.restSuggestion}</span>
              </div>
              <button className="secondary-action" type="button" onClick={handleResume}>
                状态稳定后继续
              </button>
            </section>
          ) : null}

          <div className="flow-layout">
            <aside className="flow-steps" aria-label="训练阶段进度">
              {flowState.stages.map((stage) => (
                <StageProgressItem key={stage.id} stage={stage} />
              ))}
            </aside>

            <section className="flow-stage-panel" aria-labelledby="active-stage">
              {currentStage ? (
                <>
                  <div className="flow-stage-panel__heading">
                    <div>
                      <p>
                        第 {currentStage.order} 阶段 / {flowState.stages.length} 阶段
                      </p>
                      <h2 id="active-stage">{currentStage.title}</h2>
                    </div>
                    <span data-status={currentStage.status}>
                      {stageStatusLabel(currentStage.status)}
                    </span>
                  </div>

                  <div className="flow-stage-panel__bar" aria-label="当前阶段进度">
                    <span style={{ width: `${currentStage.progressPercent}%` }} />
                  </div>

                  <StageContent
                    currentStage={currentStage}
                    recommendedMusicTitle={props.config.recommendedMusicTitle}
                    latestResult={flowState.savedStageResults.at(-1) ?? null}
                    summary={sessionSummary}
                  />

                  <div className="flow-actions">
                    <button
                      className="primary-action"
                      type="button"
                      disabled={flowState.status === "paused"}
                      onClick={handleSaveStage}
                    >
                      {currentStage.id === "save_training_record"
                        ? "保存训练记录"
                        : "保存本阶段结果"}
                    </button>
                    {currentStage.requiresEeg ? (
                      <button className="secondary-action" type="button" onClick={handleEegPause}>
                        EEG 状态异常时暂停
                      </button>
                    ) : null}
                  </div>
                </>
              ) : (
                <FinalSummaryPanel summary={sessionSummary} />
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function StageProgressItem(props: { stage: SessionFlowStageState }) {
  return (
    <article className="flow-step" data-status={props.stage.status}>
      <div className="flow-step__topline">
        <span>{props.stage.order}</span>
        <strong>{props.stage.shortLabel}</strong>
        <em>{stageStatusLabel(props.stage.status)}</em>
      </div>
      <p>{props.stage.description}</p>
      <div className="flow-step__bar" aria-label={`${props.stage.title}进度`}>
        <span style={{ width: `${props.stage.progressPercent}%` }} />
      </div>
    </article>
  );
}

function StageContent(props: {
  currentStage: SessionFlowStageState;
  recommendedMusicTitle: string;
  latestResult: SessionStageResult | null;
  summary: ReturnType<typeof generateSessionSummary>;
}) {
  const stage = props.currentStage;

  if (stage.id === "training_summary" || stage.id === "save_training_record") {
    return <FinalSummaryPanel summary={props.summary} />;
  }

  return (
    <div className="flow-stage-content">
      <p>{stage.description}</p>
      <div className="flow-module-grid">
        <InfoTile
          label="预计时长"
          value={`${Math.round(stage.defaultDurationSeconds / 60)} 分钟`}
        />
        <InfoTile label="EEG 状态" value={stage.requiresEeg ? "训练中持续观察" : "本阶段不需要"} />
        <InfoTile label="推荐音乐" value={props.recommendedMusicTitle} />
        <InfoTile label="阶段结果" value={props.latestResult ? "上一阶段已保存" : "等待保存"} />
      </div>
      <p className="flow-helper-text">
        阶段结束后会保存当前结果，保存内容按敏感训练数据处理，仅授权角色可查看。
      </p>
    </div>
  );
}

function InfoTile(props: { label: string; value: string }) {
  return (
    <div className="flow-info-tile">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function FinalSummaryPanel(props: { summary: ReturnType<typeof generateSessionSummary> }) {
  return (
    <div className="flow-summary-panel">
      <h2>本次训练总结</h2>
      <div className="flow-summary-grid">
        <InfoTile label="已完成阶段" value={`${props.summary.completedStageCount}`} />
        <InfoTile label="已跳过阶段" value={`${props.summary.skippedStageCount}`} />
        <InfoTile label="已保存结果" value={`${props.summary.savedStageResultCount}`} />
        <InfoTile
          label="累计时长"
          value={`${Math.round(props.summary.totalDurationSeconds / 60)} 分钟`}
        />
      </div>
      <p>{props.summary.recommendedNextStep}</p>
      <pre aria-label="SessionSummary">{JSON.stringify(props.summary, null, 2)}</pre>
    </div>
  );
}

function stageLabel(stageId: SessionFlowStageId): string {
  switch (stageId) {
    case "music_therapy":
      return "音乐疗愈";
    case "attention_training":
      return "注意力训练";
    case "go_nogo_training":
      return "Go/No-Go";
    case "rhythm_navigation":
      return "节律导航";
    case "identity_confirmation":
      return "身份确认";
    case "eeg_device_check":
      return "EEG检查";
    case "resting_baseline":
      return "静息基线";
    case "training_summary":
      return "训练总结";
    case "save_training_record":
      return "保存记录";
  }
}

function stageStatusLabel(status: SessionFlowStageState["status"]): string {
  switch (status) {
    case "pending":
      return "等待中";
    case "active":
      return "进行中";
    case "paused":
      return "已暂停";
    case "completed":
      return "已完成";
    case "skipped":
      return "已跳过";
  }
}
