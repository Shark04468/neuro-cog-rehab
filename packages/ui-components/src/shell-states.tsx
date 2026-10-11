import type { CSSProperties, ReactNode } from "react";

import { DynamicEffectsStyles, LoadingBrainScan } from "./dynamic-effects.js";

export interface ShellStateProps {
  title: string;
  message?: string | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
}

export interface SkeletonMedicalCardProps {
  title?: string | undefined;
  rows?: number | undefined;
  compact?: boolean | undefined;
}

export interface EEGDisconnectedStateProps {
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  steps?: string[] | undefined;
}

export interface PermissionDeniedStateProps {
  actionLabel?: string | undefined;
  message?: string | undefined;
  onAction?: (() => void) | undefined;
  roleLabel?: string | undefined;
}

export interface SystemErrorStateProps {
  actionLabel?: string | undefined;
  message?: string | undefined;
  onAction?: (() => void) | undefined;
  supportHint?: string | undefined;
}

export function LoadingState({
  title = "正在加载工作空间",
  message = "系统正在同步训练状态、授权范围和页面数据。"
}: Partial<ShellStateProps>): JSX.Element {
  return (
    <section className="ncr-shell-state ncr-shell-state--loading" role="status">
      <DynamicEffectsStyles />
      <LoadingBrainScan intensity="low" label={title} size={112} tone="monitoring" />
      <p>{message}</p>
    </section>
  );
}

export function SkeletonMedicalCard({
  title = "正在整理数据",
  rows = 4,
  compact = false
}: SkeletonMedicalCardProps): JSX.Element {
  const safeRows = Math.max(1, Math.min(8, Math.round(rows)));

  return (
    <article
      aria-label={title}
      className="ncr-skeleton-medical-card"
      data-compact={compact}
      role="status"
    >
      <span className="ncr-skeleton-medical-card__badge" />
      <div>
        <strong>{title}</strong>
        <div className="ncr-skeleton-medical-card__lines">
          {Array.from({ length: safeRows }, (_, index) => (
            <i key={index} style={{ "--skeleton-row": index } as CSSProperties} />
          ))}
        </div>
      </div>
    </article>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction
}: ShellStateProps): JSX.Element {
  return (
    <StateFrame
      actionLabel={actionLabel}
      icon="--"
      message={message}
      onAction={onAction}
      title={title}
      tone="empty"
    />
  );
}

export function EmptyTrainingState({
  actionLabel = "查看历史记录",
  message = "今天暂时没有新的训练任务。治疗师配置后，这里会显示训练顺序、预计时长和开始入口。",
  onAction,
  title = "今日暂无训练任务"
}: Partial<ShellStateProps>): JSX.Element {
  return (
    <StateFrame
      actionLabel={onAction ? actionLabel : undefined}
      icon="训"
      message={message}
      onAction={onAction}
      title={title}
      tone="training"
    >
      <div className="ncr-shell-state__hint-grid" aria-label="可继续查看的内容">
        <span>等待治疗师配置</span>
        <span>可查看历史记录</span>
        <span>保持短时训练节奏</span>
      </div>
    </StateFrame>
  );
}

export function EmptyReportState({
  actionLabel = "返回训练概览",
  message = "完成训练并保存记录后，系统会生成单次训练摘要或阶段简报。",
  onAction,
  title = "暂无训练报告"
}: Partial<ShellStateProps>): JSX.Element {
  return (
    <StateFrame
      actionLabel={onAction ? actionLabel : undefined}
      icon="报"
      message={message}
      onAction={onAction}
      title={title}
      tone="report"
    >
      <div className="ncr-shell-state__hint-grid" aria-label="报告生成条件">
        <span>完成训练</span>
        <span>保存训练记录</span>
        <span>由授权角色查看</span>
      </div>
    </StateFrame>
  );
}

export function EEGDisconnectedState({
  actionLabel = "重新检查连接",
  onAction,
  steps = ["确认设备已开启并有电量", "检查佩戴位置是否稳定", "在设备页面重新连接后再开始训练"]
}: EEGDisconnectedStateProps): JSX.Element {
  return (
    <StateFrame
      actionLabel={onAction ? actionLabel : undefined}
      icon="EEG"
      message="当前未检测到稳定的 EEG 设备连接。请先完成连接检查，训练会在信号可用后继续。"
      onAction={onAction}
      title="设备暂未连接"
      tone="device"
    >
      <ol className="ncr-shell-state__steps" aria-label="设备连接步骤">
        {steps.map((step, index) => (
          <li key={step}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </li>
        ))}
      </ol>
    </StateFrame>
  );
}

export function PermissionDeniedState({
  actionLabel = "返回当前工作区",
  message,
  onAction,
  roleLabel = "当前身份"
}: PermissionDeniedStateProps): JSX.Element {
  return (
    <StateFrame
      actionLabel={onAction ? actionLabel : undefined}
      icon="权"
      message={
        message ?? `${roleLabel}暂时不能访问该页面。系统会按授权范围展示训练记录、报告和管理功能。`
      }
      onAction={onAction}
      title="权限范围不包含该页面"
      tone="permission"
    />
  );
}

export function SystemErrorState({
  actionLabel = "重试",
  message = "系统暂时无法完成当前页面的数据加载。请稍后重试，或返回工作区继续其他操作。",
  onAction,
  supportHint = "如果多次出现，请联系管理员并提供当前页面和发生时间。"
}: SystemErrorStateProps): JSX.Element {
  return (
    <StateFrame
      actionLabel={onAction ? actionLabel : undefined}
      icon="!"
      message={message}
      onAction={onAction}
      title="系统暂时异常"
      tone="error"
    >
      <p className="ncr-shell-state__support">{supportHint}</p>
    </StateFrame>
  );
}

export function ErrorState({
  title,
  message,
  actionLabel,
  onAction
}: ShellStateProps): JSX.Element {
  return (
    <StateFrame
      actionLabel={actionLabel}
      icon="!"
      message={message}
      onAction={onAction}
      title={title}
      tone="error"
    />
  );
}

function StateFrame({
  actionLabel,
  children,
  icon,
  message,
  onAction,
  title,
  tone
}: {
  actionLabel?: string | undefined;
  children?: ReactNode;
  icon: string;
  message?: string | undefined;
  onAction?: (() => void) | undefined;
  title: string;
  tone: "device" | "empty" | "error" | "permission" | "report" | "training";
}): JSX.Element {
  return (
    <section
      className={`ncr-shell-state ncr-shell-state--${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <span className="ncr-shell-state__mark" aria-hidden="true">
        {icon}
      </span>
      <h2>{title}</h2>
      {message ? <p>{message}</p> : null}
      {children}
      {actionLabel && onAction ? (
        <button className="ncr-shell-state__action" onClick={onAction} type="button">
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
