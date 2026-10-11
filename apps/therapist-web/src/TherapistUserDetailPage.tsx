import { init as initECharts } from "echarts/dist/echarts.esm.min.mjs";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildMedicalMonitoringLineChartOption,
  EmptyState,
  SystemErrorState
} from "@neuro-cog-rehab/ui-components";

import {
  buildTherapistUserDetailViewModel,
  buildWeeklyReportDraft,
  type TrainingRecordDetail,
  type UserDetailRange,
  type UserDetailSourceRecord,
  type UserTrendChart,
  type WeeklyReportDraft
} from "./therapist-user-detail-model.js";
import type {
  TherapistWorkspacePrincipal,
  TherapistWorkspaceUser
} from "./therapist-workspace-model.js";

export interface TherapistUserDetailPageProps {
  principal: TherapistWorkspacePrincipal;
  users: TherapistWorkspaceUser[];
  detailRecords: UserDetailSourceRecord[];
  userId: string;
  onBackToWorkspace: () => void;
}

const rangeOptions: Array<{ label: string; value: UserDetailRange }> = [
  { label: "按周查看", value: "week" },
  { label: "按月查看", value: "month" }
];

export function TherapistUserDetailPage(props: TherapistUserDetailPageProps) {
  const [range, setRange] = useState<UserDetailRange>("week");
  const [selectedTrainingRecordId, setSelectedTrainingRecordId] = useState<string | undefined>();
  const [weeklyReportDraft, setWeeklyReportDraft] = useState<WeeklyReportDraft | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const result = useMemo(() => {
    try {
      const detailInput =
        selectedTrainingRecordId === undefined
          ? {
              principal: props.principal,
              users: props.users,
              detailRecords: props.detailRecords,
              userId: props.userId,
              range
            }
          : {
              principal: props.principal,
              users: props.users,
              detailRecords: props.detailRecords,
              userId: props.userId,
              range,
              selectedTrainingRecordId
            };

      return {
        viewModel: buildTherapistUserDetailViewModel(detailInput),
        error: null
      };
    } catch (error) {
      return {
        viewModel: null,
        error: error instanceof Error ? error.message : "用户详情加载失败。"
      };
    }
  }, [
    props.detailRecords,
    props.principal,
    props.userId,
    props.users,
    range,
    selectedTrainingRecordId
  ]);

  if (result.error || !result.viewModel) {
    return (
      <SystemErrorState
        actionLabel="返回工作台"
        message="用户详情暂时无法加载。请返回工作台后稍后再试，或联系管理员复核授权范围。"
        onAction={props.onBackToWorkspace}
      />
    );
  }

  const viewModel = result.viewModel;

  const handleGenerateWeeklyReport = () => {
    try {
      setWeeklyReportDraft(
        buildWeeklyReportDraft({
          principal: props.principal,
          users: props.users,
          detailRecords: props.detailRecords,
          userId: props.userId
        })
      );
      setReportError(null);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "周报草稿生成失败。");
    }
  };

  return (
    <section className="user-detail-page" aria-labelledby="user-detail-title">
      <button type="button" className="detail-back-button" onClick={props.onBackToWorkspace}>
        返回工作台
      </button>

      <header className="user-detail-header">
        <div>
          <p className="workspace-eyebrow">用户详情</p>
          <h1 id="user-detail-title">{viewModel.basicInfo.displayName} 的训练记录</h1>
          <span>仅展示当前治疗师已授权查看的训练数据，用于训练回顾和趋势分析。</span>
        </div>
        <div className="detail-actions-card">
          <span>趋势范围</span>
          <div className="range-control" role="group" aria-label="趋势查看范围">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={range === option.value ? "is-active" : ""}
                onClick={() => {
                  setRange(option.value);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className="report-button" onClick={handleGenerateWeeklyReport}>
            生成周报
          </button>
        </div>
      </header>

      <div className="detail-top-grid">
        <section className="detail-card" aria-labelledby="basic-info-title">
          <p>用户基础信息</p>
          <h2 id="basic-info-title">{viewModel.basicInfo.displayName}</h2>
          <dl className="detail-dl">
            <div>
              <dt>年龄段</dt>
              <dd>{viewModel.basicInfo.ageRange}</dd>
            </div>
            <div>
              <dt>性别</dt>
              <dd>{viewModel.basicInfo.genderLabel}</dd>
            </div>
            <div>
              <dt>监护人同意</dt>
              <dd>
                {viewModel.basicInfo.guardianConsentStatus === "confirmed" ? "已确认" : "待确认"}
              </dd>
            </div>
            <div>
              <dt>绑定治疗师</dt>
              <dd>{viewModel.basicInfo.boundTherapistName}</dd>
            </div>
          </dl>
        </section>

        <section className="detail-card" aria-labelledby="training-goal-title">
          <p>训练目标</p>
          <h2 id="training-goal-title">{viewModel.trainingGoal.primaryGoal}</h2>
          <div className="focus-tags">
            {viewModel.trainingGoal.focusAreas.map((area) => (
              <span key={area}>{area}</span>
            ))}
          </div>
          <strong>{viewModel.trainingGoal.weeklyPlanLabel}</strong>
          <small>{viewModel.trainingGoal.safetyNote}</small>
        </section>

        <section className="detail-card" aria-labelledby="baseline-title">
          <p>基线评估结果</p>
          <h2 id="baseline-title">{viewModel.baselineAssessment.assessedAtLabel}</h2>
          <div className="metric-strip">
            <MetricItem
              label="注意参考"
              value={`${viewModel.baselineAssessment.attentionReferenceScore}`}
            />
            <MetricItem
              label="反应时"
              value={`${viewModel.baselineAssessment.averageReactionTimeMs}ms`}
            />
            <MetricItem
              label="规则等待"
              value={`${viewModel.baselineAssessment.impulseControlReferenceScore}`}
            />
            <MetricItem
              label="节律同步"
              value={`${viewModel.baselineAssessment.rhythmSyncReferenceScore}`}
            />
          </div>
          <small>{viewModel.baselineAssessment.summary}</small>
        </section>
      </div>

      <section className="detail-card" aria-labelledby="recent-records-title">
        <div className="detail-section-heading">
          <div>
            <p>最近训练记录</p>
            <h2 id="recent-records-title">单次训练详情</h2>
          </div>
          <span>{viewModel.recentTrainingRecords.length} 条</span>
        </div>
        <div className="record-layout">
          <div className="record-list" role="list" aria-label="最近训练记录">
            {viewModel.recentTrainingRecords.map((record) => (
              <button
                key={record.id}
                type="button"
                className={
                  record.id === viewModel.selectedTrainingRecord.id
                    ? "record-list-item is-active"
                    : "record-list-item"
                }
                onClick={() => {
                  setSelectedTrainingRecordId(record.id);
                }}
              >
                <strong>{record.trainingTypeLabel}</strong>
                <span>{record.completedAtLabel}</span>
                <em>{record.completionStatusLabel}</em>
              </button>
            ))}
          </div>
          <TrainingRecordDetailPanel record={viewModel.selectedTrainingRecord} />
        </div>
      </section>

      <div className="chart-grid">
        <TrendChart chart={viewModel.attentionTrendChart} />
        <TrendChart chart={viewModel.reactionTimeTrendChart} />
        <TrendChart chart={viewModel.responseErrorTrendChart} />
        <TrendChart chart={viewModel.eegTrendChart} />
      </div>

      <div className="detail-bottom-grid">
        <section className="detail-card" aria-labelledby="music-adaptation-title">
          <div className="detail-section-heading">
            <div>
              <p>音乐适配记录</p>
              <h2 id="music-adaptation-title">音乐使用反馈</h2>
            </div>
            <span>{viewModel.musicAdaptations.length} 条</span>
          </div>
          <div className="music-adaptation-list">
            {viewModel.musicAdaptations.length > 0 ? (
              viewModel.musicAdaptations.map((record) => (
                <article key={record.id} className="music-adaptation-item">
                  <strong>{record.trackTitle}</strong>
                  <span>{record.usedAtLabel}</span>
                  <p>
                    {record.recommendationLabel}，适配分 {record.suitabilityScore}/100。
                  </p>
                  <small>{record.nextSuggestion}</small>
                </article>
              ))
            ) : (
              <EmptyState
                message="完成音乐疗愈训练并保存记录后，这里会显示音乐标签、主观反馈和趋势性建议。"
                title="暂无音乐适配记录"
              />
            )}
          </div>
        </section>

        <section className="detail-card" aria-labelledby="notes-title">
          <div className="detail-section-heading">
            <div>
              <p>治疗师备注</p>
              <h2 id="notes-title">训练跟进备注</h2>
            </div>
            <span>{viewModel.therapistNotes.length} 条</span>
          </div>
          <div className="note-list">
            {viewModel.therapistNotes.map((note) => (
              <article key={note.id} className="note-item">
                <strong>{note.authorName}</strong>
                <span>
                  {note.createdAtLabel} / {note.visibilityLabel}
                </span>
                <p>{note.content}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      {weeklyReportDraft || reportError ? (
        <section className="weekly-report-panel" data-status={reportError ? "error" : "ready"}>
          {reportError ? (
            <p>{reportError}</p>
          ) : (
            <>
              <div className="detail-section-heading">
                <div>
                  <p>周报草稿</p>
                  <h2>最近7天训练回顾</h2>
                </div>
                <span>{weeklyReportDraft?.periodLabel}</span>
              </div>
              <p>{weeklyReportDraft?.summary}</p>
              <div className="report-columns">
                <ReportList title="关键观察" items={weeklyReportDraft?.keyObservations ?? []} />
                <ReportList title="下周建议" items={weeklyReportDraft?.nextWeekSuggestions ?? []} />
              </div>
            </>
          )}
        </section>
      ) : null}
    </section>
  );
}

function MetricItem(props: { label: string; value: string }) {
  return (
    <div>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function TrainingRecordDetailPanel(props: { record: TrainingRecordDetail }) {
  return (
    <article className="record-detail-panel">
      <div>
        <p>{props.record.completedAtLabel}</p>
        <h3>{props.record.trainingTypeLabel}</h3>
        <span>{props.record.note}</span>
      </div>
      <div className="metric-strip metric-strip--record">
        <MetricItem label="正确率" value={`${Math.round(props.record.accuracyRate * 100)}%`} />
        <MetricItem label="反应时" value={`${props.record.averageReactionTimeMs}ms`} />
        <MetricItem label="误按率" value={`${Math.round(props.record.falseAlarmRate * 100)}%`} />
        <MetricItem label="漏按率" value={`${Math.round(props.record.omissionRate * 100)}%`} />
        <MetricItem label="注意指数" value={`${props.record.eegAttentionIndex}`} />
        <MetricItem label="放松指数" value={`${props.record.eegRelaxationIndex}`} />
        <MetricItem label="疲劳指数" value={`${props.record.eegFatigueIndex}`} />
        <MetricItem label="难度" value={props.record.difficultyLabel} />
      </div>
    </article>
  );
}

function TrendChart(props: { chart: UserTrendChart }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const chartInstance = initECharts(containerRef.current);
    const option = buildMedicalMonitoringLineChartOption({
      title: props.chart.title,
      categories: props.chart.labels,
      yAxisName: props.chart.yAxisLabel,
      series: props.chart.series.map((series) => ({
        name: series.name,
        data: series.values
      }))
    });

    chartInstance.setOption(option, true);
    const handleResize = () => chartInstance.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chartInstance.dispose();
    };
  }, [props.chart]);

  return (
    <section className="chart-card" aria-label={props.chart.title}>
      <h2>{props.chart.title}</h2>
      <div
        ref={containerRef}
        className="echarts-surface"
        role="img"
        aria-label={props.chart.title}
      />
    </section>
  );
}

function ReportList(props: { title: string; items: string[] }) {
  return (
    <div className="report-list">
      <h3>{props.title}</h3>
      <ul>
        {props.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
