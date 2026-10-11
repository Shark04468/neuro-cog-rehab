import { useMemo, useState } from "react";

import type { SessionSummary } from "./session-flow-model.js";
import {
  buildTrainingEndFeedback,
  type TrainingFeedbackSection,
  type TrainingRecordSaveDraft
} from "./training-feedback-model.js";

export interface TrainingEndFeedbackPageProps {
  summary: SessionSummary;
  onBackToHome: () => void;
  onSaveRecord?:
    | ((draft: TrainingRecordSaveDraft) => Promise<TrainingRecordPersistenceResult>)
    | undefined;
}

export interface TrainingRecordPersistenceResult {
  provider: "draft" | "api";
  recordId: string;
  savedAt: string;
}

export function TrainingEndFeedbackPage(props: TrainingEndFeedbackPageProps) {
  const feedback = useMemo(() => buildTrainingEndFeedback(props.summary), [props.summary]);
  const [isTherapistDetailOpen, setIsTherapistDetailOpen] = useState(false);
  const [savedRecord, setSavedRecord] = useState<TrainingRecordSaveDraft | null>(null);
  const [persistenceResult, setPersistenceResult] =
    useState<TrainingRecordPersistenceResult | null>(null);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveRecord = async () => {
    try {
      setIsSavingRecord(true);
      const result =
        props.onSaveRecord === undefined
          ? {
              provider: "draft" as const,
              recordId: feedback.trainingRecordDraft.id,
              savedAt: feedback.trainingRecordDraft.savedAt
            }
          : await props.onSaveRecord(feedback.trainingRecordDraft);
      setSavedRecord(feedback.trainingRecordDraft);
      setPersistenceResult(result);
      setSaveError(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "训练记录保存失败，请稍后重试。");
    } finally {
      setIsSavingRecord(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="feedback-band" aria-labelledby="feedback-title">
        <div className="feedback-inner">
          <button className="text-button" type="button" onClick={props.onBackToHome}>
            返回今日首页
          </button>

          <header className="feedback-header">
            <div>
              <p className="home-kicker">训练结束反馈</p>
              <h1 id="feedback-title">{feedback.title}</h1>
              <p className="home-subtitle">{feedback.subtitle}</p>
            </div>
            <div className="feedback-record-box">
              <span>训练记录</span>
              <strong>{savedRecord ? "已保存记录" : "等待保存"}</strong>
              <p>
                {props.onSaveRecord
                  ? "将通过授权接口保存训练摘要，不写入原始脑电数据。"
                  : "本页只保留本次页面状态，不把敏感训练数据写入浏览器长期存储。"}
              </p>
            </div>
          </header>

          <div className="feedback-grid" aria-label="本次训练反馈">
            {feedback.sections.map((section) => (
              <FeedbackCard key={section.id} section={section} />
            ))}
          </div>

          <section className="feedback-actions-panel" aria-labelledby="record-actions">
            <div>
              <p>保存为训练记录</p>
              <h2 id="record-actions">生成本次训练记录草稿</h2>
              <span>草稿包含阶段结果和趋势指标，按敏感训练数据处理，后续可由授权接口提交。</span>
            </div>
            <button
              className="primary-action"
              type="button"
              disabled={savedRecord !== null || isSavingRecord}
              onClick={handleSaveRecord}
            >
              {savedRecord ? "训练记录已保存" : isSavingRecord ? "正在保存..." : "保存为训练记录"}
            </button>
          </section>

          {saveError ? (
            <p className="feedback-save-message" data-status="error" role="alert">
              {saveError}
            </p>
          ) : null}

          {savedRecord ? (
            <section className="feedback-save-message" data-status="saved" aria-live="polite">
              <strong>
                {persistenceResult?.provider === "api" ? "训练记录已提交" : "训练记录草稿已生成"}
              </strong>
              <span>
                记录编号 {persistenceResult?.recordId ?? savedRecord.id}，共{" "}
                {savedRecord.behaviorMetrics.savedStageResultCount} 条阶段结果。
              </span>
            </section>
          ) : null}

          <section className="therapist-detail-panel" aria-labelledby="therapist-detail">
            <div className="therapist-detail-panel__header">
              <div>
                <p>治疗师详细数据入口</p>
                <h2 id="therapist-detail">授权角色查看</h2>
              </div>
              <button
                className="secondary-action"
                type="button"
                aria-expanded={isTherapistDetailOpen}
                onClick={() => setIsTherapistDetailOpen((isOpen) => !isOpen)}
              >
                {isTherapistDetailOpen ? "收起详细数据" : "查看详细数据"}
              </button>
            </div>

            {isTherapistDetailOpen ? (
              <div className="therapist-detail-panel__content">
                {feedback.therapistDetails.map((group) => (
                  <div className="therapist-detail-group" key={group.title}>
                    <h3>{group.title}</h3>
                    <dl>
                      {group.entries.map((entry) => (
                        <div key={`${group.title}-${entry.label}`}>
                          <dt>{entry.label}</dt>
                          <dd>{entry.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
                <pre aria-label="TrainingRecordSaveDraft">
                  {JSON.stringify(feedback.trainingRecordDraft, null, 2)}
                </pre>
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}

function FeedbackCard(props: { section: TrainingFeedbackSection }) {
  return (
    <article className="feedback-card" data-tone={props.section.tone}>
      <span>{props.section.title}</span>
      <h2>{props.section.headline}</h2>
      <p>{props.section.body}</p>
    </article>
  );
}
