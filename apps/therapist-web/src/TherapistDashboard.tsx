import { useMemo, useState, type CSSProperties } from "react";

import {
  CognitiveRadarChart,
  EmptyReportState,
  EmptyState,
  MedicalChartContainer,
  MedicalMetricCard,
  MetricRingChart,
  PatientRiskBadge,
  StatusDistributionChart,
  SystemErrorState,
  TherapistCommandPanel,
  TrainingHeatmap,
  TrendLineChart,
  type MedicalChartTone,
  type NeuroTone,
  type PatientRiskSeverity
} from "@neuro-cog-rehab/ui-components";

import {
  assertTherapistDashboardUserAccess,
  buildTherapistDashboardViewModel,
  createDefaultTherapistDashboardFilters,
  DASHBOARD_RISK_LABELS,
  DASHBOARD_TRAINING_STATUS_LABELS,
  type TherapistDashboardEEGTrendPoint,
  type TherapistDashboardFilters,
  type TherapistDashboardModuleHeatPoint,
  type TherapistDashboardMusicTrendPoint,
  type TherapistDashboardQualitySummary,
  type TherapistDashboardReport,
  type TherapistDashboardRiskAlert,
  type TherapistDashboardStatMetric,
  type TherapistDashboardSupplement,
  type TherapistDashboardTimeRange,
  type TherapistDashboardTodo,
  type TherapistDashboardTrendPoint,
  type TherapistDashboardUserRow
} from "./therapist-dashboard-model.js";
import type {
  TherapistWorkspacePrincipal,
  TherapistWorkspaceUser,
  WorkspaceRiskFilter,
  WorkspaceRiskLevel,
  WorkspaceTrainingStatus,
  WorkspaceTrainingStatusFilter
} from "./therapist-workspace-model.js";

export interface TherapistDashboardProps {
  principal: TherapistWorkspacePrincipal;
  therapistName: string;
  users: TherapistWorkspaceUser[];
  supplement: TherapistDashboardSupplement;
  onOpenUserDetail?: (userId: string) => void;
  onOpenPrescriptionEditor?: (userId: string) => void;
  onOpenLiveMonitoring?: () => void;
  onOpenReportCenter?: () => void;
}

export interface CommandMetricCardProps {
  metric: TherapistDashboardStatMetric;
}

export interface PatientTrainingStatusMapProps {
  moduleHeat: TherapistDashboardModuleHeatPoint[];
  statusDistribution: Record<WorkspaceTrainingStatus, number>;
}

export interface EEGQualityOverviewProps {
  quality: TherapistDashboardQualitySummary[];
  trend: TherapistDashboardEEGTrendPoint[];
}

export interface RehabilitationTrendChartProps {
  eegTrend: TherapistDashboardEEGTrendPoint[];
  musicTrend: TherapistDashboardMusicTrendPoint[];
  timeRange: TherapistDashboardTimeRange;
  trainingTrend: TherapistDashboardTrendPoint[];
}

export interface PendingActionPanelProps {
  alerts: TherapistDashboardRiskAlert[];
  deviceIssueCount: number;
  parentFeedbackCount: number;
  pendingReportCount: number;
  prescriptionAdjustmentCount: number;
  todos: TherapistDashboardTodo[];
  onOpenAlert: (userId: string) => void;
  onRunTodo: (todo: TherapistDashboardTodo) => void;
}

export interface AdvancedPatientTableProps {
  filters: TherapistDashboardFilters;
  timeRange: TherapistDashboardTimeRange;
  users: TherapistDashboardUserRow[];
  onCreatePrescription: (userId: string) => void;
  onFiltersChange: (filters: TherapistDashboardFilters) => void;
  onOpenUserDetail: (userId: string) => void;
  onTimeRangeChange: (range: TherapistDashboardTimeRange) => void;
}

export interface PrescriptionQuickActionProps {
  users: TherapistDashboardUserRow[];
  onCreatePrescription: (userId: string) => void;
}

export interface ReportQuickEntryProps {
  pendingReportCount: number;
  reports: TherapistDashboardReport[];
  onOpenReportCenter: () => void;
}

const trainingStatusOptions: WorkspaceTrainingStatusFilter[] = [
  "all",
  "scheduled_today",
  "in_progress",
  "completed_today",
  "paused",
  "no_plan"
];

const riskFilterOptions: WorkspaceRiskFilter[] = [
  "all",
  "has_reminder",
  "needs_review",
  "watch",
  "none"
];

export function TherapistDashboard(props: TherapistDashboardProps): JSX.Element {
  return <TherapistCommandCenter {...props} />;
}

export function TherapistCommandCenter({
  principal,
  therapistName,
  users,
  supplement,
  onOpenUserDetail,
  onOpenPrescriptionEditor,
  onOpenLiveMonitoring,
  onOpenReportCenter
}: TherapistDashboardProps): JSX.Element {
  const [filters, setFilters] = useState<TherapistDashboardFilters>(() =>
    createDefaultTherapistDashboardFilters()
  );
  const [timeRange, setTimeRange] = useState<TherapistDashboardTimeRange>("7d");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const dashboardResult = useMemo(() => {
    try {
      return {
        viewModel: buildTherapistDashboardViewModel({
          principal,
          therapistName,
          users,
          filters,
          supplement
        }),
        error: null
      };
    } catch (error) {
      return {
        viewModel: null,
        error: error instanceof Error ? error.message : "治疗师指挥中心加载失败。"
      };
    }
  }, [filters, principal, supplement, therapistName, users]);

  if (dashboardResult.error || !dashboardResult.viewModel) {
    return (
      <SystemErrorState
        message="康复数据指挥中心暂时无法完成加载。请稍后重试，或返回工作区查看其他模块。"
        supportHint="系统已隐藏底层错误信息，避免向普通用户暴露技术细节。"
      />
    );
  }

  const viewModel = dashboardResult.viewModel;

  const runProtectedUserAction = (userId: string, action: "detail" | "prescription" | "record") => {
    try {
      const user = assertTherapistDashboardUserAccess({ principal, users, userId });
      setActionError(null);

      if (action === "prescription") {
        setActionMessage("权限校验通过，正在进入训练处方编辑器。");
        onOpenPrescriptionEditor?.(user.id);
        return;
      }

      setActionMessage(
        action === "record"
          ? "权限校验通过，当前版本先进入用户详情，后续可接入单次训练记录页面。"
          : "权限校验通过，正在进入用户详情。"
      );
      onOpenUserDetail?.(user.id);
    } catch (error) {
      setActionMessage(null);
      setActionError(error instanceof Error ? error.message : "当前账号无权访问该用户训练数据。");
    }
  };

  const runCommandAction = (todo: TherapistDashboardTodo) => {
    if (todo.userId && todo.actionType === "create_prescription") {
      runProtectedUserAction(todo.userId, "prescription");
      return;
    }
    if (todo.userId) {
      runProtectedUserAction(todo.userId, "record");
      return;
    }
    if (todo.actionType === "open_live_monitoring") {
      setActionError(null);
      setActionMessage("正在进入实时训练监测入口。");
      onOpenLiveMonitoring?.();
      return;
    }

    setActionError(null);
    setActionMessage("正在进入报告中心入口。");
    onOpenReportCenter?.();
  };

  return (
    <section className="therapist-command-center" aria-labelledby="therapist-command-title">
      <header className="therapist-command-hero">
        <div className="therapist-command-hero__copy">
          <p className="therapist-command-hero__eyebrow">Rehabilitation Data Command Center</p>
          <h1 id="therapist-command-title">{viewModel.therapistName}，康复数据指挥中心</h1>
          <p>
            聚合授权训练用户的今日任务、状态趋势、EEG摘要质量和待处理事项，用于辅助训练安排、过程复核和报告跟进。
          </p>
          <div className="therapist-command-hero__meta" aria-label="系统状态">
            <span>权限范围：绑定训练用户</span>
            <span>数据口径：训练记录与摘要特征</span>
            <span>时段：最近{timeRange === "7d" ? "7天" : "30天"}</span>
          </div>
        </div>
        <div className="therapist-command-hero__console">
          <span>实时会话入口</span>
          <strong>{viewModel.todayDueCount} 名用户待跟进</strong>
          <p>异常提醒使用温和复核提示，仅用于训练安全和流程调整。</p>
          <button onClick={onOpenLiveMonitoring} type="button">
            进入实时训练监测
          </button>
        </div>
      </header>

      <section className="therapist-command-center__metrics" aria-label="顶部关键指标">
        {viewModel.statMetrics.map((metric) => (
          <CommandMetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="therapist-command-center__grid" aria-label="中央监测区">
        <div className="therapist-command-center__monitoring">
          <PatientTrainingStatusMap
            moduleHeat={viewModel.moduleHeat}
            statusDistribution={viewModel.statusDistribution}
          />
          <RehabilitationTrendChart
            eegTrend={viewModel.eegTrend}
            musicTrend={viewModel.musicTrend}
            timeRange={timeRange}
            trainingTrend={viewModel.trainingTrend}
          />
          <EEGQualityOverview quality={viewModel.eegQuality} trend={viewModel.eegTrend} />
        </div>
        <PendingActionPanel
          alerts={viewModel.riskAlerts}
          deviceIssueCount={viewModel.deviceIssueCount}
          onOpenAlert={(userId) => runProtectedUserAction(userId, "record")}
          onRunTodo={runCommandAction}
          parentFeedbackCount={viewModel.parentFeedbackCount}
          pendingReportCount={viewModel.pendingReportCount}
          prescriptionAdjustmentCount={viewModel.prescriptionAdjustmentCount}
          todos={viewModel.todos}
        />
      </section>

      <section className="therapist-command-center__bottom">
        <AdvancedPatientTable
          filters={filters}
          onCreatePrescription={(userId) => runProtectedUserAction(userId, "prescription")}
          onFiltersChange={setFilters}
          onOpenUserDetail={(userId) => runProtectedUserAction(userId, "detail")}
          onTimeRangeChange={setTimeRange}
          timeRange={timeRange}
          users={viewModel.filteredUsers}
        />
        <div className="therapist-command-center__quick-column">
          <PrescriptionQuickAction
            onCreatePrescription={(userId) => runProtectedUserAction(userId, "prescription")}
            users={viewModel.filteredUsers}
          />
          <ReportQuickEntry
            onOpenReportCenter={() => {
              setActionError(null);
              setActionMessage("正在进入报告中心入口。");
              onOpenReportCenter?.();
            }}
            pendingReportCount={viewModel.pendingReportCount}
            reports={viewModel.recentReports}
          />
        </div>
      </section>

      {actionMessage || actionError ? (
        <aside
          className="therapist-command-feedback"
          data-status={actionError ? "error" : "ready"}
          role={actionError ? "alert" : "status"}
        >
          {actionError ?? actionMessage}
        </aside>
      ) : null}
    </section>
  );
}

export function CommandMetricCard({ metric }: CommandMetricCardProps): JSX.Element {
  return (
    <MedicalMetricCard
      className="command-metric-card"
      helperText={metric.helperText}
      label={metric.label}
      statusLabel="实时摘要"
      tone={mapStatMetricTone(metric.tone)}
      value={metric.value}
      variant="core"
    />
  );
}

export function PatientTrainingStatusMap({
  moduleHeat,
  statusDistribution
}: PatientTrainingStatusMapProps): JSX.Element {
  const statusRows = [
    ["今日待训练", statusDistribution.scheduled_today, "scheduled_today"],
    ["训练中", statusDistribution.in_progress, "in_progress"],
    ["今日已完成", statusDistribution.completed_today, "completed_today"],
    ["暂停待跟进", statusDistribution.paused, "paused"],
    ["未配置任务", statusDistribution.no_plan, "no_plan"]
  ] as const;

  return (
    <section className="command-panel patient-training-status-map" aria-labelledby="status-map">
      <header className="command-panel__header">
        <div>
          <p>Patient Training Field</p>
          <h2 id="status-map">用户训练状态分布</h2>
        </div>
        <span>今日状态</span>
      </header>
      <div className="patient-training-status-map__body patient-training-status-map__body--medical">
        <StatusDistributionChart
          helperText="按今日训练状态汇总授权用户，仅用于训练安排和过程复核。"
          items={statusRows.map(([label, count, status]) => ({
            label,
            value: count,
            tone: mapTrainingStatusTone(status)
          }))}
          title="训练状态分布"
        />
        <TrainingHeatmap
          data={moduleHeat.flatMap((item) => [
            { x: "计划", y: item.moduleName, value: Math.min(100, item.plannedCount * 20) },
            {
              x: "完成",
              y: item.moduleName,
              value: item.plannedCount === 0 ? 0 : (item.completedCount / item.plannedCount) * 100
            }
          ])}
          helperText="以低饱和热度显示不同训练模块的计划与完成情况。"
          title="训练模块完成热度"
          xLabels={["计划", "完成"]}
          yLabels={moduleHeat.map((item) => item.moduleName)}
        />
      </div>
    </section>
  );
}

export function EEGQualityOverview({ quality, trend }: EEGQualityOverviewProps): JSX.Element {
  const latest = trend.at(-1) ?? { attentionScore: 0, relaxationScore: 0, fatigueScore: 0 };

  return (
    <section className="command-panel eeg-quality-overview" aria-labelledby="eeg-quality">
      <header className="command-panel__header">
        <div>
          <p>EEG Signal Overview</p>
          <h2 id="eeg-quality">EEG信号质量概览</h2>
        </div>
        <span>摘要特征</span>
      </header>
      <div className="eeg-quality-overview__summary eeg-quality-overview__summary--medical">
        {quality.map((item) => (
          <MetricRingChart
            helperText={mapQualityToneText(item.tone)}
            key={item.label}
            label={item.label}
            size={112}
            tone={mapQualityTone(item.tone)}
            value={item.value}
          />
        ))}
      </div>
      <CognitiveRadarChart
        dimensions={[
          { label: "注意", value: latest.attentionScore, tone: "medicalBlue" },
          { label: "放松", value: latest.relaxationScore, tone: "cyanGreen" },
          { label: "疲劳", value: latest.fatigueScore, tone: "softAmber" },
          {
            label: "稳定",
            value: Math.max(0, 100 - Math.abs(latest.attentionScore - latest.relaxationScore)),
            tone: "palePurple"
          },
          {
            label: "参与",
            value: Math.max(0, latest.attentionScore - latest.fatigueScore / 3),
            tone: "calmBlue"
          }
        ]}
        helperText="多维状态仅用于训练过程观察，不输出诊断结论。"
        size={240}
        title="实时状态轮廓"
      />
      <TrendLineChart
        categories={trend.map((point) => point.dayLabel)}
        helperText="最近训练会话的 EEG 摘要趋势。"
        series={[
          {
            name: "注意指数",
            values: trend.map((point) => point.attentionScore),
            tone: "medicalBlue"
          },
          {
            name: "放松指数",
            values: trend.map((point) => point.relaxationScore),
            tone: "cyanGreen"
          },
          {
            name: "疲劳趋势",
            values: trend.map((point) => point.fatigueScore),
            tone: "softAmber"
          }
        ]}
        title="EEG 摘要趋势"
        yAxisLabel="0-100"
      />
      <div className="eeg-quality-overview__latest">
        <span>注意 {latest.attentionScore}</span>
        <span>放松 {latest.relaxationScore}</span>
        <span>疲劳趋势 {latest.fatigueScore}</span>
      </div>
    </section>
  );
}

export function RehabilitationTrendChart({
  trainingTrend,
  eegTrend,
  musicTrend,
  timeRange
}: RehabilitationTrendChartProps): JSX.Element {
  return (
    <section className="command-panel rehabilitation-trend-chart" aria-labelledby="rehab-trend">
      <header className="command-panel__header">
        <div>
          <p>Rehabilitation Trend</p>
          <h2 id="rehab-trend">注意稳定性与适配趋势</h2>
        </div>
        <span>最近{timeRange === "7d" ? "7天" : "30天"}</span>
      </header>
      <MedicalChartContainer
        eyebrow="Unified Medical Chart"
        helperText="统一图表容器用于保持治疗师端图表标题、说明和边界信息一致。"
        title="趋势监测曲线"
      >
        <TrendLineChart
          categories={trainingTrend.map((point) => point.dayLabel)}
          helperText="用于观察训练完成、注意稳定和音乐适配的阶段性变化。"
          series={[
            {
              name: "训练完成率",
              values: trainingTrend.map((point) => point.averageCompletionRate),
              tone: "cyanGreen"
            },
            {
              name: "注意稳定性",
              values: eegTrend.map((point) => point.attentionScore),
              tone: "medicalBlue"
            },
            {
              name: "音乐适配趋势",
              values: musicTrend.map((point) => point.suitabilityScore),
              tone: "palePurple"
            }
          ]}
          title="趋势监测曲线"
          yAxisLabel="0-100"
        />
      </MedicalChartContainer>
    </section>
  );
}

export function PendingActionPanel({
  alerts,
  todos,
  pendingReportCount,
  prescriptionAdjustmentCount,
  deviceIssueCount,
  parentFeedbackCount,
  onOpenAlert,
  onRunTodo
}: PendingActionPanelProps): JSX.Element {
  const actionStats = [
    ["待生成报告", pendingReportCount],
    ["待调整处方", prescriptionAdjustmentCount],
    ["设备状态复核", deviceIssueCount],
    ["家长反馈提醒", parentFeedbackCount]
  ] as const;

  return (
    <TherapistCommandPanel
      actions={todos.slice(0, 6).map((todo) => ({
        id: todo.id,
        title: todo.title,
        description: todo.description,
        meta: commandTodoCategoryLabel(todo.category),
        tone: "monitoring",
        onSelect: () => onRunTodo(todo)
      }))}
      alerts={alerts.map((alert) => ({
        id: alert.id,
        label: alert.levelLabel,
        title: alert.userDisplayName,
        message: alert.message,
        meta: alert.occurredAtLabel,
        severity: mapWorkspaceRiskSeverity(alert.level),
        onSelect: () => onOpenAlert(alert.userId)
      }))}
      className="pending-action-panel"
      emptyAlertMessage="当前授权用户没有新的训练安全提示。系统会持续记录训练过程中的温和提醒。"
      emptyAlertTitle="暂无需要复核的训练提醒"
      stats={actionStats.map(([label, value]) => ({
        id: label,
        label,
        value
      }))}
      summaryLabel={`${alerts.length} 条提醒`}
      title="右侧待处理区"
    />
  );
}

export function AdvancedPatientTable({
  users,
  filters,
  timeRange,
  onFiltersChange,
  onTimeRangeChange,
  onOpenUserDetail,
  onCreatePrescription
}: AdvancedPatientTableProps): JSX.Element {
  return (
    <section
      className="command-panel advanced-patient-table"
      aria-labelledby="advanced-patient-table"
    >
      <header className="command-panel__header advanced-patient-table__header">
        <div>
          <p>Authorized Patient List</p>
          <h2 id="advanced-patient-table">下方用户列表</h2>
        </div>
        <div className="time-range-switch" aria-label="趋势时间范围">
          {(["7d", "30d"] as const).map((range) => (
            <button
              aria-pressed={timeRange === range}
              key={range}
              onClick={() => onTimeRangeChange(range)}
              type="button"
            >
              {range === "7d" ? "近7天" : "近30天"}
            </button>
          ))}
        </div>
      </header>

      <div className="advanced-patient-table__filters" aria-label="用户筛选">
        <label>
          <span>搜索用户</span>
          <input
            onChange={(event) => {
              onFiltersChange({ ...filters, searchTerm: event.target.value });
            }}
            placeholder="输入昵称或档案ID"
            type="search"
            value={filters.searchTerm}
          />
        </label>
        <label>
          <span>训练状态</span>
          <select
            onChange={(event) => {
              onFiltersChange({
                ...filters,
                trainingStatus: event.target.value as WorkspaceTrainingStatusFilter
              });
            }}
            value={filters.trainingStatus}
          >
            {trainingStatusOptions.map((option) => (
              <option key={option} value={option}>
                {DASHBOARD_TRAINING_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>风险等级</span>
          <select
            onChange={(event) => {
              onFiltersChange({
                ...filters,
                risk: event.target.value as WorkspaceRiskFilter
              });
            }}
            value={filters.risk}
          >
            {riskFilterOptions.map((option) => (
              <option key={option} value={option}>
                {DASHBOARD_RISK_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="advanced-patient-table__wrap">
        <table>
          <thead>
            <tr>
              <th>用户</th>
              <th>本周训练</th>
              <th>最近状态</th>
              <th>趋势</th>
              <th>当前处方</th>
              <th>操作入口</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <button
                    className="command-link-button"
                    onClick={() => onOpenUserDetail(user.id)}
                    type="button"
                  >
                    {user.displayName}
                  </button>
                  <span>
                    {user.ageRange} 岁段 · {user.userProfileId}
                  </span>
                </td>
                <td>
                  <strong>{user.weeklySessionCount} 次</strong>
                  <span>{user.complianceLabel}</span>
                </td>
                <td>
                  <span className="command-status-pill" data-status={user.trainingStatus}>
                    {user.trainingStatusLabel}
                  </span>
                  <PatientRiskBadge
                    helperText={user.riskMessage}
                    label={user.riskLabel}
                    severity={mapWorkspaceRiskSeverity(user.riskLevel)}
                  />
                  <small>{user.lastSessionLabel}</small>
                </td>
                <td>
                  <div className="advanced-patient-table__trend">
                    <span style={createChartFillStyle(user.attentionTrendScore)}>
                      注意：{user.attentionTrendLabel}
                    </span>
                    <span style={createChartFillStyle(user.fatigueTrendScore)}>
                      疲劳：{user.fatigueTrendLabel}
                    </span>
                  </div>
                </td>
                <td>
                  <strong>{user.currentPrescriptionLabel}</strong>
                  <span>{user.todayModulesLabel}</span>
                </td>
                <td>
                  <div className="command-row-actions">
                    <button onClick={() => onOpenUserDetail(user.id)} type="button">
                      详情
                    </button>
                    <button onClick={() => onCreatePrescription(user.id)} type="button">
                      处方
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PrescriptionQuickAction({
  users,
  onCreatePrescription
}: PrescriptionQuickActionProps): JSX.Element {
  const candidates = users
    .filter((user) => user.trainingStatus === "no_plan" || user.riskLevel === "needs_review")
    .slice(0, 3);

  return (
    <section
      className="command-panel prescription-quick-action"
      aria-labelledby="prescription-quick-action"
    >
      <header className="command-panel__header">
        <div>
          <p>Prescription Quick Action</p>
          <h2 id="prescription-quick-action">快速处方入口</h2>
        </div>
        <span>{candidates.length} 项</span>
      </header>
      {candidates.length === 0 ? (
        <EmptyState
          message="当前筛选范围暂无需要立即调整的训练处方。治疗师仍可从用户详情进入处方编辑。"
          title="暂无待调整处方"
        />
      ) : (
        candidates.map((user) => (
          <button key={user.id} onClick={() => onCreatePrescription(user.id)} type="button">
            <span>{user.displayName}</span>
            <strong>{user.currentPrescriptionLabel}</strong>
            <small>{user.riskMessage}</small>
          </button>
        ))
      )}
    </section>
  );
}

export function ReportQuickEntry({
  reports,
  pendingReportCount,
  onOpenReportCenter
}: ReportQuickEntryProps): JSX.Element {
  return (
    <section className="command-panel report-quick-entry" aria-labelledby="report-quick-entry">
      <header className="command-panel__header">
        <div>
          <p>报告中心</p>
          <h2 id="report-quick-entry">报告生成入口</h2>
        </div>
        <span>{pendingReportCount} 份待生成</span>
      </header>
      <button className="report-quick-entry__primary" onClick={onOpenReportCenter} type="button">
        进入报告中心
      </button>
      <div className="report-quick-entry__list">
        {reports.length === 0 ? (
          <EmptyReportState message="当前暂无最近生成的报告。完成训练并保存记录后，可在这里查看单次报告和周报。" />
        ) : (
          reports.slice(0, 3).map((report) => (
            <article key={report.id}>
              <span>{report.userDisplayName}</span>
              <strong>{report.title}</strong>
              <em>{report.generatedAtLabel}</em>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function mapTrainingStatusTone(status: WorkspaceTrainingStatus): MedicalChartTone {
  switch (status) {
    case "completed_today":
      return "cyanGreen";
    case "in_progress":
      return "medicalBlue";
    case "paused":
      return "softAmber";
    case "no_plan":
      return "grayBlue";
    case "scheduled_today":
    default:
      return "calmBlue";
  }
}

function mapQualityTone(tone: TherapistDashboardQualitySummary["tone"]): MedicalChartTone {
  switch (tone) {
    case "good":
      return "cyanGreen";
    case "watch":
      return "softAmber";
    case "unstable":
    default:
      return "mutedOrange";
  }
}

function mapQualityToneText(tone: TherapistDashboardQualitySummary["tone"]): string {
  switch (tone) {
    case "good":
      return "当前摘要质量稳定";
    case "watch":
      return "建议训练前复核佩戴";
    case "unstable":
    default:
      return "建议先调整设备状态";
  }
}

function mapStatMetricTone(tone: TherapistDashboardStatMetric["tone"]): NeuroTone {
  switch (tone) {
    case "teal":
      return "monitoring";
    case "violet":
      return "calm";
    case "orange":
      return "warning";
    case "blue":
    default:
      return "clinical";
  }
}

function mapWorkspaceRiskSeverity(level: WorkspaceRiskLevel): PatientRiskSeverity {
  switch (level) {
    case "needs_review":
      return "needs_review";
    case "watch":
      return "watch";
    case "none":
    default:
      return "none";
  }
}

function commandTodoCategoryLabel(category: TherapistDashboardTodo["category"]): string {
  switch (category) {
    case "risk":
      return "提醒复核";
    case "report":
      return "报告";
    case "prescription":
      return "处方";
    case "device":
      return "设备";
    case "feedback":
      return "家长反馈";
    case "monitoring":
      return "实时监测";
  }
}

export function createChartFillStyle(percent: number): CSSProperties {
  return {
    "--chart-fill": `${Math.max(0, Math.min(100, Math.round(percent)))}%`
  } as CSSProperties;
}
