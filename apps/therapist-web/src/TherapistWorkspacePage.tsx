import { useMemo, useState } from "react";

import { SystemErrorState } from "@neuro-cog-rehab/ui-components";

import {
  buildTherapistWorkspaceAction,
  buildTherapistWorkspaceViewModel,
  RISK_FILTER_LABELS,
  TRAINING_STATUS_LABELS,
  type TherapistWorkspaceAction,
  type TherapistWorkspaceFilters,
  type TherapistWorkspacePrincipal,
  type TherapistWorkspaceUser,
  type TherapistWorkspaceUserRow,
  type WorkspaceRiskFilter,
  type WorkspaceTrainingStatusFilter
} from "./therapist-workspace-model.js";

export interface TherapistWorkspacePageProps {
  principal: TherapistWorkspacePrincipal;
  therapistName: string;
  users: TherapistWorkspaceUser[];
  onOpenUserDetail?: (userId: string) => void;
  onOpenPrescriptionEditor?: (userId: string) => void;
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

export function TherapistWorkspacePage(props: TherapistWorkspacePageProps) {
  const [filters, setFilters] = useState<TherapistWorkspaceFilters>({
    trainingStatus: "all",
    risk: "all"
  });
  const [lastAction, setLastAction] = useState<TherapistWorkspaceAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const workspaceResult = useMemo(() => {
    try {
      return {
        viewModel: buildTherapistWorkspaceViewModel({
          principal: props.principal,
          therapistName: props.therapistName,
          users: props.users,
          filters
        }),
        error: null
      };
    } catch (error) {
      return {
        viewModel: null,
        error: error instanceof Error ? error.message : "治疗师工作台加载失败。"
      };
    }
  }, [filters, props.principal, props.therapistName, props.users]);

  if (workspaceResult.error || !workspaceResult.viewModel) {
    return (
      <SystemErrorState message="工作台数据暂时无法加载。请稍后重试，或返回统一入口重新进入当前工作区。" />
    );
  }

  const viewModel = workspaceResult.viewModel;

  const handleAction = (userId: string, type: TherapistWorkspaceAction["type"]) => {
    try {
      setLastAction(
        buildTherapistWorkspaceAction({
          principal: props.principal,
          users: props.users,
          userId,
          actionType: type
        })
      );
      if (type === "open_user_detail") {
        props.onOpenUserDetail?.(userId);
      }
      if (type === "generate_prescription") {
        props.onOpenPrescriptionEditor?.(userId);
      }
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "当前账号无权访问该用户数据。");
    }
  };

  return (
    <section className="workspace-page" aria-labelledby="workspace-title">
      <header className="workspace-header">
        <div>
          <p className="workspace-eyebrow">治疗师工作台</p>
          <h1 id="workspace-title">{viewModel.therapistName}，今日训练概览</h1>
          <span>仅展示已授权绑定用户的训练任务、完成记录和需要关注的训练提醒。</span>
        </div>
        <div className="permission-note">
          <span>权限范围</span>
          <strong>{viewModel.accessibleUserCount} 名授权用户</strong>
          <p>筛选和快捷入口均基于当前账号权限校验。</p>
        </div>
      </header>

      <div className="summary-grid">
        {viewModel.summaryCards.map((card) => (
          <article className="summary-card" key={card.id}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.helperText}</p>
          </article>
        ))}
      </div>

      <section className="workspace-toolbar" aria-label="工作台筛选">
        <label>
          <span>训练状态</span>
          <select
            value={filters.trainingStatus}
            onChange={(event) => {
              setFilters((current) => ({
                ...current,
                trainingStatus: event.target.value as WorkspaceTrainingStatusFilter
              }));
            }}
          >
            {trainingStatusOptions.map((option) => (
              <option key={option} value={option}>
                {TRAINING_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>关注提醒</span>
          <select
            value={filters.risk}
            onChange={(event) => {
              setFilters((current) => ({
                ...current,
                risk: event.target.value as WorkspaceRiskFilter
              }));
            }}
          >
            {riskFilterOptions.map((option) => (
              <option key={option} value={option}>
                {RISK_FILTER_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <div className="filter-result">
          <span>当前列表</span>
          <strong>{viewModel.filteredUserCount} 名用户</strong>
        </div>
      </section>

      <div className="workspace-content-grid">
        <section className="panel-card" aria-labelledby="today-due-title">
          <div className="panel-heading">
            <div>
              <p>今日待训练用户</p>
              <h2 id="today-due-title">需要安排或跟进</h2>
            </div>
            <span>{viewModel.todayDueUsers.length} 人</span>
          </div>
          <div className="compact-list">
            {viewModel.todayDueUsers.map((user) => (
              <article className="compact-user-card" key={user.id}>
                <div>
                  <strong>{user.displayName}</strong>
                  <span>{user.todayPlan.moduleNames.join(" / ") || "等待训练处方"}</span>
                </div>
                <em>{user.trainingStatusLabel}</em>
              </article>
            ))}
          </div>
        </section>

        <section className="panel-card" aria-labelledby="alerts-title">
          <div className="panel-heading">
            <div>
              <p>需要关注提醒</p>
              <h2 id="alerts-title">训练安全与流程提示</h2>
            </div>
            <span>{viewModel.alerts.length} 条</span>
          </div>
          <div className="alert-list">
            {viewModel.alerts.map((alert) => (
              <article className="alert-item" data-level={alert.level} key={alert.userId}>
                <strong>{alert.displayName}</strong>
                <p>{alert.message}</p>
                <span>{alert.occurredAtLabel}</span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="panel-card" aria-labelledby="recent-title">
        <div className="panel-heading">
          <div>
            <p>最近训练完成情况</p>
            <h2 id="recent-title">最近阶段记录</h2>
          </div>
          <span>{viewModel.recentCompletions.length} 条</span>
        </div>
        <div className="recent-table-wrap">
          <table className="workspace-table">
            <thead>
              <tr>
                <th>用户</th>
                <th>最近模块</th>
                <th>完成时间</th>
                <th>时长</th>
                <th>记录摘要</th>
              </tr>
            </thead>
            <tbody>
              {viewModel.recentCompletions.map((user) => (
                <tr key={user.id}>
                  <td>{user.displayName}</td>
                  <td>{user.lastSession?.moduleName ?? "--"}</td>
                  <td>{user.lastSession?.completedAtLabel ?? "--"}</td>
                  <td>{user.lastSession ? `${user.lastSession.durationMinutes} 分钟` : "--"}</td>
                  <td>{user.lastSession?.note ?? "暂无训练记录"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel-card" aria-labelledby="user-list-title">
        <div className="panel-heading">
          <div>
            <p>用户列表</p>
            <h2 id="user-list-title">授权训练用户</h2>
          </div>
          <span>{viewModel.filteredUserCount} 人</span>
        </div>
        <div className="user-table-wrap">
          <table className="workspace-table workspace-table--users">
            <thead>
              <tr>
                <th>用户</th>
                <th>今日计划</th>
                <th>训练状态</th>
                <th>提醒</th>
                <th>依从性概览</th>
                <th>快捷操作</th>
              </tr>
            </thead>
            <tbody>
              {viewModel.userRows.map((user) => (
                <UserRow key={user.id} user={user} onAction={handleAction} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {lastAction || actionError ? (
        <section className="action-feedback" data-status={actionError ? "error" : "ready"}>
          {actionError ? (
            <p>{actionError}</p>
          ) : (
            <>
              <strong>{lastAction?.label}</strong>
              <span>已通过权限校验，后续可接入详情页或训练处方生成接口。</span>
            </>
          )}
        </section>
      ) : null}
    </section>
  );
}

function UserRow(props: {
  user: TherapistWorkspaceUserRow;
  onAction: (userId: string, type: TherapistWorkspaceAction["type"]) => void;
}) {
  return (
    <tr>
      <td>
        <strong>{props.user.displayName}</strong>
        <span>{props.user.ageRange} 岁段</span>
      </td>
      <td>
        {props.user.todayPlan.moduleNames.length > 0
          ? props.user.todayPlan.moduleNames.join(" / ")
          : "等待训练处方"}
        <span>{props.user.todayPlan.plannedMinutes} 分钟</span>
      </td>
      <td>
        <span className="status-badge" data-status={props.user.trainingStatus}>
          {props.user.trainingStatusLabel}
        </span>
      </td>
      <td>
        <span className="risk-badge" data-level={props.user.riskReminder.level}>
          {props.user.riskLabel}
        </span>
        <small>{props.user.riskReminder.message}</small>
      </td>
      <td>
        <strong>{props.user.complianceLabel}</strong>
        <span>
          计划 {props.user.compliance.plannedSessions7d} 次，完成{" "}
          {props.user.compliance.completedSessions7d} 次
        </span>
      </td>
      <td>
        <div className="row-actions">
          <button
            type="button"
            onClick={() => {
              props.onAction(props.user.id, "open_user_detail");
            }}
          >
            用户详情
          </button>
          <button
            type="button"
            className="is-secondary"
            onClick={() => {
              props.onAction(props.user.id, "generate_prescription");
            }}
          >
            生成处方
          </button>
        </div>
      </td>
    </tr>
  );
}
