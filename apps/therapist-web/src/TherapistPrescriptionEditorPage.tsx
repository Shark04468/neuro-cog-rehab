import { useMemo, useState } from "react";

import { SystemErrorState } from "@neuro-cog-rehab/ui-components";

import {
  buildPrescriptionPreviewTasks,
  buildTrainingPrescriptionEditorViewModel,
  PRESCRIPTION_DIFFICULTY_LABELS,
  PRESCRIPTION_MUSIC_TYPE_LABELS,
  saveTrainingPrescriptionDraft,
  TrainingPrescriptionEditorValidationError,
  type PrescriptionDifficulty,
  type PrescriptionMusicType,
  type PrescriptionRiskReminderKey,
  type PrescriptionTrainingModule,
  type SavedTrainingPrescription,
  type TrainingPrescriptionDraft,
  type TrainingPrescriptionOperationLog,
  type TrainingPrescriptionSaveResult,
  type TrainingPrescriptionValidationIssue
} from "./training-prescription-editor-model.js";
import type {
  TherapistWorkspacePrincipal,
  TherapistWorkspaceUser
} from "./therapist-workspace-model.js";

export interface TherapistPrescriptionEditorPageProps {
  principal: TherapistWorkspacePrincipal;
  users: TherapistWorkspaceUser[];
  userId: string;
  existingPrescription: SavedTrainingPrescription | null;
  operationLogs: TrainingPrescriptionOperationLog[];
  onBackToWorkspace: () => void;
  onSaved: (result: TrainingPrescriptionSaveResult) => void;
}

const fallbackDraft: TrainingPrescriptionDraft = {
  userId: "",
  weeklySessionCount: 3,
  sessionDurationMinutes: 15,
  moduleCombination: ["music_therapy", "attention_game"],
  musicType: "nature",
  initialDifficulty: "light",
  adaptiveAdjustmentEnabled: true,
  dailyMaxTrainingMinutes: 30,
  riskReminderKeys: ["signal_unstable", "user_discomfort", "daily_limit"],
  therapistNote: ""
};

export function TherapistPrescriptionEditorPage(props: TherapistPrescriptionEditorPageProps) {
  const editorResult = useMemo(() => {
    try {
      return {
        viewModel: buildTrainingPrescriptionEditorViewModel({
          principal: props.principal,
          users: props.users,
          userId: props.userId,
          existingPrescription: props.existingPrescription
        }),
        error: null
      };
    } catch (error) {
      return {
        viewModel: null,
        error: error instanceof Error ? error.message : "无法加载训练处方编辑器。"
      };
    }
  }, [props.existingPrescription, props.principal, props.userId, props.users]);
  const [draft, setDraft] = useState<TrainingPrescriptionDraft>(
    () => editorResult.viewModel?.draft ?? { ...fallbackDraft, userId: props.userId }
  );
  const [validationIssues, setValidationIssues] = useState<TrainingPrescriptionValidationIssue[]>(
    []
  );
  const [lastSaved, setLastSaved] = useState<TrainingPrescriptionSaveResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (editorResult.error || !editorResult.viewModel) {
    return (
      <SystemErrorState
        actionLabel="返回工作台"
        message="训练处方编辑器暂时无法打开。请返回工作台后重试，处方变更仍需经过权限校验和操作日志记录。"
        onAction={props.onBackToWorkspace}
      />
    );
  }

  const viewModel = editorResult.viewModel;
  const previewTasks = buildPrescriptionPreviewTasks(draft);
  const operationLogs = uniqueOperationLogs([
    ...(lastSaved ? [lastSaved.operationLog] : []),
    ...props.operationLogs.filter((log) => log.userId === props.userId)
  ]).slice(0, 4);

  const updateNumberField = (
    field: "weeklySessionCount" | "sessionDurationMinutes" | "dailyMaxTrainingMinutes",
    value: string
  ) => {
    const nextValue = Number.parseInt(value, 10);
    setDraft((current) => ({
      ...current,
      [field]: Number.isNaN(nextValue) ? 0 : nextValue
    }));
  };

  const handleModuleToggle = (moduleType: PrescriptionTrainingModule, checked: boolean) => {
    setDraft((current) => ({
      ...current,
      moduleCombination: toggleValue(current.moduleCombination, moduleType, checked)
    }));
  };

  const handleRiskToggle = (riskKey: PrescriptionRiskReminderKey, checked: boolean) => {
    setDraft((current) => ({
      ...current,
      riskReminderKeys: toggleValue(current.riskReminderKeys, riskKey, checked)
    }));
  };

  const handleSave = () => {
    try {
      const result = saveTrainingPrescriptionDraft({
        principal: props.principal,
        users: props.users,
        draft,
        previousPrescription: lastSaved?.prescription ?? props.existingPrescription,
        savedAt: new Date().toISOString()
      });
      setLastSaved(result);
      setValidationIssues([]);
      setSaveError(null);
      props.onSaved(result);
    } catch (error) {
      if (error instanceof TrainingPrescriptionEditorValidationError) {
        setValidationIssues(error.issues);
        setSaveError(null);
        return;
      }
      setSaveError(error instanceof Error ? error.message : "保存训练处方失败。");
    }
  };

  return (
    <section className="prescription-editor-page" aria-labelledby="prescription-title">
      <button type="button" className="detail-back-button" onClick={props.onBackToWorkspace}>
        返回工作台
      </button>

      <header className="prescription-header">
        <div>
          <p>训练处方编辑器</p>
          <h1 id="prescription-title">为 {viewModel.displayName} 设置训练安排</h1>
          <span>
            年龄段 {viewModel.ageRange}。{viewModel.scopeNotice}
          </span>
        </div>
        <div className="prescription-safety-note">
          <span>默认值</span>
          <strong>短时、低强度、可暂停</strong>
          <p>保存前会检查训练时长、模块组合和风险提醒。</p>
        </div>
      </header>

      {validationIssues.length > 0 || saveError ? (
        <section className="form-alert" role="alert">
          <strong>请先调整以下内容</strong>
          {saveError ? <p>{saveError}</p> : null}
          {validationIssues.length > 0 ? (
            <ul>
              {validationIssues.map((issue) => (
                <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <div className="prescription-layout">
        <form
          className="prescription-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <section className="prescription-section" aria-labelledby="load-title">
            <div className="section-heading section-heading--small">
              <div>
                <p>训练负荷</p>
                <h2 id="load-title">次数与时长</h2>
              </div>
            </div>
            <div className="form-grid">
              <label className="field-control">
                <span>每周训练次数</span>
                <input
                  min={1}
                  max={5}
                  type="number"
                  value={draft.weeklySessionCount}
                  onChange={(event) => updateNumberField("weeklySessionCount", event.target.value)}
                />
                <small>建议从 2-3 次开始，根据训练记录再调整。</small>
              </label>
              <label className="field-control">
                <span>单次训练时长</span>
                <input
                  min={5}
                  max={30}
                  type="number"
                  value={draft.sessionDurationMinutes}
                  onChange={(event) =>
                    updateNumberField("sessionDurationMinutes", event.target.value)
                  }
                />
                <small>首期建议保持短时任务，避免连续训练过久。</small>
              </label>
              <label className="field-control">
                <span>每日最大训练时长</span>
                <input
                  min={10}
                  max={45}
                  type="number"
                  value={draft.dailyMaxTrainingMinutes}
                  onChange={(event) =>
                    updateNumberField("dailyMaxTrainingMinutes", event.target.value)
                  }
                />
                <small>用户端会按该上限展示今日剩余建议时长。</small>
              </label>
            </div>
          </section>

          <section className="prescription-section" aria-labelledby="module-title">
            <div className="section-heading section-heading--small">
              <div>
                <p>训练模块组合</p>
                <h2 id="module-title">选择本周主要任务</h2>
              </div>
            </div>
            <div className="checkbox-grid">
              {viewModel.moduleOptions.map((option) => (
                <label className="choice-control" key={option.value}>
                  <input
                    type="checkbox"
                    checked={draft.moduleCombination.includes(option.value)}
                    onChange={(event) => handleModuleToggle(option.value, event.target.checked)}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.helperText}</small>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="prescription-section" aria-labelledby="music-title">
            <div className="section-heading section-heading--small">
              <div>
                <p>音乐与难度</p>
                <h2 id="music-title">低干扰起步</h2>
              </div>
            </div>
            <div className="form-grid">
              <label className="field-control">
                <span>音乐类型</span>
                <select
                  value={draft.musicType}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      musicType: event.target.value as PrescriptionMusicType
                    }))
                  }
                >
                  {viewModel.musicTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>{musicHelper(draft.musicType)}</small>
              </label>
              <label className="field-control">
                <span>初始难度</span>
                <select
                  value={draft.initialDifficulty}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      initialDifficulty: event.target.value as PrescriptionDifficulty
                    }))
                  }
                >
                  {viewModel.difficultyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>{difficultyHelper(draft.initialDifficulty)}</small>
              </label>
              <label className="toggle-control">
                <input
                  type="checkbox"
                  checked={draft.adaptiveAdjustmentEnabled}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      adaptiveAdjustmentEnabled: event.target.checked
                    }))
                  }
                />
                <span>
                  <strong>启用自适应调整</strong>
                  <small>仅根据训练表现、EEG质量和用户反馈做下一轮强度建议。</small>
                </span>
              </label>
            </div>
          </section>

          <section className="prescription-section" aria-labelledby="risk-title">
            <div className="section-heading section-heading--small">
              <div>
                <p>风险提醒</p>
                <h2 id="risk-title">训练安全边界</h2>
              </div>
            </div>
            <div className="checkbox-grid">
              {viewModel.riskReminderOptions.map((option) => (
                <label className="choice-control" key={option.value}>
                  <input
                    type="checkbox"
                    checked={draft.riskReminderKeys.includes(option.value)}
                    onChange={(event) => handleRiskToggle(option.value, event.target.checked)}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.helperText}</small>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="prescription-section" aria-labelledby="note-title">
            <div className="section-heading section-heading--small">
              <div>
                <p>治疗师备注</p>
                <h2 id="note-title">给用户端的温和提示</h2>
              </div>
            </div>
            <label className="field-control">
              <span>备注内容</span>
              <textarea
                maxLength={240}
                value={draft.therapistNote}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    therapistNote: event.target.value
                  }))
                }
              />
              <small>{draft.therapistNote.length}/240。避免使用确定性效果承诺。</small>
            </label>
          </section>

          <div className="prescription-actions">
            <button type="submit" className="report-button">
              保存训练处方
            </button>
            <button type="button" className="is-secondary" onClick={props.onBackToWorkspace}>
              取消
            </button>
          </div>
        </form>

        <aside className="prescription-preview" aria-label="处方预览">
          <section className="prescription-section">
            <p>用户端任务预览</p>
            <h2>按处方展示今日任务</h2>
            <div className="preview-summary">
              <span>每周 {draft.weeklySessionCount} 次</span>
              <span>每次 {draft.sessionDurationMinutes} 分钟</span>
              <span>每日上限 {draft.dailyMaxTrainingMinutes} 分钟</span>
            </div>
            <div className="preview-task-list">
              {previewTasks.map((task, index) => (
                <article className="preview-task" key={`${task.moduleType}-${index}`}>
                  <div>{index + 1}</div>
                  <span>
                    <strong>{task.title}</strong>
                    <small>
                      {task.durationMinutes} 分钟 / {task.difficultyLabel}
                    </small>
                  </span>
                  <p>{task.userFacingNote}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="prescription-section">
            <p>当前配置</p>
            <h2>保存摘要</h2>
            <dl className="detail-dl">
              <dt>音乐类型</dt>
              <dd>{PRESCRIPTION_MUSIC_TYPE_LABELS[draft.musicType]}</dd>
              <dt>初始难度</dt>
              <dd>{PRESCRIPTION_DIFFICULTY_LABELS[draft.initialDifficulty]}</dd>
              <dt>自适应调整</dt>
              <dd>{draft.adaptiveAdjustmentEnabled ? "启用" : "关闭"}</dd>
              <dt>风险提醒</dt>
              <dd>{draft.riskReminderKeys.length} 条</dd>
            </dl>
          </section>

          <section className="prescription-section">
            <p>操作日志</p>
            <h2>处方变更记录</h2>
            {operationLogs.length === 0 ? (
              <span className="empty-state">保存后会在这里显示敏感操作日志。</span>
            ) : (
              <div className="operation-log-list">
                {operationLogs.map((log) => (
                  <article className="operation-log-item" key={log.id}>
                    <strong>{log.message}</strong>
                    <span>{new Date(log.occurredAt).toLocaleString("zh-CN")}</span>
                    <p>{log.afterSummary}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}

function toggleValue<TValue extends string>(
  values: TValue[],
  value: TValue,
  checked: boolean
): TValue[] {
  if (checked) {
    return values.includes(value) ? values : [...values, value];
  }

  return values.filter((candidate) => candidate !== value);
}

function uniqueOperationLogs(
  logs: TrainingPrescriptionOperationLog[]
): TrainingPrescriptionOperationLog[] {
  const seenLogIds = new Set<string>();

  return logs.filter((log) => {
    if (seenLogIds.has(log.id)) {
      return false;
    }
    seenLogIds.add(log.id);
    return true;
  });
}

function musicHelper(musicType: PrescriptionMusicType): string {
  return `${PRESCRIPTION_MUSIC_TYPE_LABELS[musicType]}，以用户舒适反馈和训练状态为准。`;
}

function difficultyHelper(difficulty: PrescriptionDifficulty): string {
  return `${PRESCRIPTION_DIFFICULTY_LABELS[difficulty]}起点，可由治疗师或规则在后续轮次调整。`;
}
