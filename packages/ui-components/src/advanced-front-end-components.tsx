import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";
import type { EEGFeatureFrame, EEGQualityStatus } from "@neuro-cog-rehab/shared-types";

import { ADVANCED_FRONTEND_COMPONENTS_CSS } from "./advanced-front-end-components.css.js";
import { MedicalMetricCard, NeuroGlassCard, NeuroStatusBadge, NeuroTag } from "./design-system.js";
import {
  joinNeuroClassNames,
  normalizeMetricProgress,
  resolveNeuroTone,
  type NeuroTone
} from "./design-system-tokens.js";
import type { AuthPortalRole, AuthRoleIconKind, AuthRoleOption } from "./unified-auth-types.js";

export type ReducedMotionMode = "system" | "reduced" | "full";
export type SystemHealthStatus = "good" | "syncing" | "warning" | "offline" | "error";
export type PatientRiskSeverity = "none" | "info" | "watch" | "needs_review" | "action_required";

export interface AdvancedFrontendStylesProps {
  nonce?: string | undefined;
}

export interface ReducedMotionContextValue {
  reducedMotion: boolean;
  mode: ReducedMotionMode;
}

export interface ReducedMotionProviderProps {
  children: ReactNode;
  mode?: ReducedMotionMode | undefined;
}

export interface SoftMotionWrapperProps {
  children: ReactNode;
  className?: string | undefined;
  delayMs?: number | undefined;
  disabled?: boolean | undefined;
  variant?: "rise" | "fade" | "scale" | undefined;
}

export interface RoleEntranceCardProps {
  option: AuthRoleOption;
  selected: boolean;
  onSelect: (role: AuthPortalRole) => void;
  className?: string | undefined;
}

export interface DemoModeBadgeProps {
  label?: string | undefined;
  description?: string | undefined;
  compact?: boolean | undefined;
  className?: string | undefined;
}

export interface SystemHealthItem {
  id: string;
  label: string;
  value: string;
  status: SystemHealthStatus;
  helperText?: string | undefined;
}

export interface SystemHealthIndicatorProps {
  items: SystemHealthItem[];
  layout?: "inline" | "stacked" | undefined;
  className?: string | undefined;
}

export type EEGWaveFrame = EEGFeatureFrame & {
  attentionScore?: number | undefined;
  relaxationScore?: number | undefined;
  fatigueScore?: number | undefined;
  artifactLevel?: number | undefined;
};

export interface EEGWaveCanvasProps {
  frames?: EEGWaveFrame[] | undefined;
  height?: number | undefined;
  paused?: boolean | undefined;
  qualityStatus?: EEGQualityStatus | undefined;
  reducedIntensity?: boolean | undefined;
  className?: string | undefined;
  ariaLabel?: string | undefined;
}

export interface CognitiveStatusRingItem {
  id: string;
  label: string;
  value: number | null | undefined;
  tone: "attention" | "relaxation" | "fatigue" | "neutral";
  helperText?: string | undefined;
}

export interface CognitiveStatusRingProps {
  attentionScore?: number | null | undefined;
  relaxationScore?: number | null | undefined;
  fatigueScore?: number | null | undefined;
  items?: CognitiveStatusRingItem[] | undefined;
  compact?: boolean | undefined;
  className?: string | undefined;
}

export interface TrainingMissionMetric {
  id: string;
  label: string;
  value: string;
}

export interface TrainingMissionTask {
  id: string;
  title: string;
  moduleName: string;
  durationLabel: string;
  difficultyLabel: string;
  focusArea?: string | undefined;
  statusLabel?: string | undefined;
}

export interface TrainingMissionCardProps {
  title: string;
  subtitle: string;
  progressPercent: number;
  metrics: TrainingMissionMetric[];
  tasks: TrainingMissionTask[];
  actionLabel: string;
  actionDescription?: string | undefined;
  startHint?: string | undefined;
  disabled?: boolean | undefined;
  emptyMessage?: string | undefined;
  onStart: () => void;
  className?: string | undefined;
}

export interface TherapistCommandPanelStat {
  id: string;
  label: string;
  value: string | number;
}

export interface TherapistCommandPanelAlert {
  id: string;
  label: string;
  title: string;
  message: string;
  meta?: string | undefined;
  severity?: PatientRiskSeverity | undefined;
  onSelect?: (() => void) | undefined;
}

export interface TherapistCommandPanelAction {
  id: string;
  title: string;
  description: string;
  meta?: string | undefined;
  tone?: NeuroTone | undefined;
  onSelect: () => void;
}

export interface TherapistCommandPanelProps {
  title: string;
  eyebrow?: string | undefined;
  summaryLabel?: string | undefined;
  stats: TherapistCommandPanelStat[];
  alerts: TherapistCommandPanelAlert[];
  actions: TherapistCommandPanelAction[];
  emptyAlertTitle?: string | undefined;
  emptyAlertMessage?: string | undefined;
  className?: string | undefined;
}

export interface PatientRiskBadgeProps {
  severity: PatientRiskSeverity;
  label?: string | undefined;
  helperText?: string | undefined;
  className?: string | undefined;
}

export interface MedicalChartContainerProps {
  title: string;
  eyebrow?: string | undefined;
  helperText?: string | undefined;
  action?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
}

export interface ConsentNoticeSection {
  id: string;
  title: string;
  body: string;
  bullets?: string[] | undefined;
}

export interface ConsentNoticePanelProps {
  title: string;
  subtitle?: string | undefined;
  versionLabel?: string | undefined;
  scopeNotice: string;
  sections?: ConsentNoticeSection[] | undefined;
  className?: string | undefined;
}

const ReducedMotionContext = createContext<ReducedMotionContextValue>({
  reducedMotion: false,
  mode: "system"
});

const ROLE_ENTRANCE_META: Record<AuthPortalRole, { headline: string; detail: string }> = {
  trainee: {
    headline: "训练与反馈",
    detail: "进入今日任务、设备检查与个人趋势反馈。"
  },
  parent: {
    headline: "进度与简报",
    detail: "查看训练坚持情况、阶段简报与下次建议。"
  },
  therapist: {
    headline: "处方与监测",
    detail: "管理训练处方、实时状态观察与报告。"
  },
  org_admin: {
    headline: "机构与权限",
    detail: "维护机构成员、设备、权限和操作日志。"
  }
};

export function AdvancedFrontendComponentsStyles({
  nonce
}: AdvancedFrontendStylesProps): JSX.Element {
  return <style nonce={nonce}>{ADVANCED_FRONTEND_COMPONENTS_CSS}</style>;
}

export function ReducedMotionProvider({
  children,
  mode = "system"
}: ReducedMotionProviderProps): JSX.Element {
  const [systemReduced, setSystemReduced] = useState(false);

  useEffect(() => {
    if (mode !== "system" || typeof window === "undefined" || !("matchMedia" in window)) {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSystemReduced(mediaQuery.matches);

    const handleChange = () => setSystemReduced(mediaQuery.matches);
    mediaQuery.addEventListener?.("change", handleChange);

    return () => {
      mediaQuery.removeEventListener?.("change", handleChange);
    };
  }, [mode]);

  const value = useMemo<ReducedMotionContextValue>(
    () => ({
      mode,
      reducedMotion: mode === "reduced" || (mode === "system" && systemReduced)
    }),
    [mode, systemReduced]
  );

  return (
    <ReducedMotionContext.Provider value={value}>
      <AdvancedFrontendComponentsStyles />
      {children}
    </ReducedMotionContext.Provider>
  );
}

export function useReducedMotionPreference(): ReducedMotionContextValue {
  return useContext(ReducedMotionContext);
}

export function SoftMotionWrapper({
  children,
  className,
  delayMs = 0,
  disabled = false,
  variant = "rise"
}: SoftMotionWrapperProps): JSX.Element {
  const { reducedMotion } = useReducedMotionPreference();

  return (
    <div
      className={joinNeuroClassNames("ncr-soft-motion", className)}
      data-disabled={String(disabled)}
      data-reduced-motion={String(reducedMotion)}
      data-variant={variant}
      style={{ "--ncr-soft-delay": `${Math.max(0, delayMs)}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function RoleEntranceCard({
  option,
  selected,
  onSelect,
  className
}: RoleEntranceCardProps): JSX.Element {
  const meta = ROLE_ENTRANCE_META[option.role];

  return (
    <>
      <AdvancedFrontendComponentsStyles />
      <button
        aria-pressed={selected}
        className={joinNeuroClassNames("ncr-role-entrance-card", className)}
        data-role={option.role}
        data-selected={String(selected)}
        onClick={() => onSelect(option.role)}
        type="button"
      >
        <span className="ncr-role-entrance-card__content">
          <span className="ncr-role-entrance-card__icon" aria-hidden="true">
            <RoleIcon kind={option.iconKind} />
          </span>
          <span className="ncr-role-entrance-card__body">
            <span className="ncr-role-entrance-card__overline">{option.shortLabel}</span>
            <strong>{option.label}</strong>
            <em>{meta.headline}</em>
            <span>{meta.detail}</span>
          </span>
        </span>
        <span className="ncr-role-entrance-card__status" aria-hidden="true">
          {selected ? "已选择" : "选择身份"}
        </span>
      </button>
    </>
  );
}

export function DemoModeBadge({
  label = "演示数据",
  description,
  compact = false,
  className
}: DemoModeBadgeProps): JSX.Element {
  return (
    <>
      <AdvancedFrontendComponentsStyles />
      <span
        className={joinNeuroClassNames("ncr-demo-mode-badge", className)}
        data-compact={compact}
        title={description}
      >
        {label}
      </span>
    </>
  );
}

export function SystemHealthIndicator({
  items,
  layout = "inline",
  className
}: SystemHealthIndicatorProps): JSX.Element {
  return (
    <>
      <AdvancedFrontendComponentsStyles />
      <div
        className={joinNeuroClassNames("ncr-system-health-indicator", className)}
        data-layout={layout}
        role="list"
      >
        {items.map((item) => (
          <div
            className="ncr-system-health-indicator__item"
            data-status={item.status}
            key={item.id}
            role="listitem"
          >
            <i className="ncr-system-health-indicator__dot" aria-hidden="true" />
            <strong>
              {item.label}：{item.value}
            </strong>
            {item.helperText ? <span>{item.helperText}</span> : null}
          </div>
        ))}
      </div>
    </>
  );
}

export function EEGWaveCanvas({
  frames,
  height = 120,
  paused = false,
  qualityStatus = "good",
  reducedIntensity = false,
  className,
  ariaLabel = "动态脑电特征波形"
}: EEGWaveCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { reducedMotion } = useReducedMotionPreference();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return undefined;
    }

    let animationFrame = 0;
    const sourceFrames = frames && frames.length > 0 ? frames : createSyntheticEEGFrames();

    const render = (timeMs: number) => {
      drawEEGWave({
        canvas,
        context,
        frames: sourceFrames,
        height,
        offset: reducedMotion || paused ? 0 : timeMs / (reducedIntensity ? 9000 : 5200),
        qualityStatus,
        reducedIntensity
      });

      if (!reducedMotion && !paused) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    render(0);

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [frames, height, paused, qualityStatus, reducedIntensity, reducedMotion]);

  return (
    <>
      <AdvancedFrontendComponentsStyles />
      <canvas
        aria-label={ariaLabel}
        className={joinNeuroClassNames("ncr-eeg-wave-canvas", className)}
        data-paused={paused}
        data-quality={qualityStatus}
        height={height}
        ref={canvasRef}
        role="img"
        style={{ "--ncr-eeg-wave-height": `${height}px` } as CSSProperties}
      />
    </>
  );
}

export function CognitiveStatusRing({
  attentionScore,
  relaxationScore,
  fatigueScore,
  items,
  compact = false,
  className
}: CognitiveStatusRingProps): JSX.Element {
  const visibleItems = items ?? [
    { id: "attention", label: "注意状态", value: attentionScore, tone: "attention" as const },
    { id: "relaxation", label: "放松状态", value: relaxationScore, tone: "relaxation" as const },
    { id: "fatigue", label: "疲劳趋势", value: fatigueScore, tone: "fatigue" as const }
  ];

  return (
    <>
      <AdvancedFrontendComponentsStyles />
      <div
        className={joinNeuroClassNames("ncr-cognitive-status-ring", className)}
        data-compact={compact}
      >
        {visibleItems.map((item) => {
          const value = normalizeNullableScore(item.value);
          return (
            <article
              className="ncr-cognitive-status-ring__item"
              data-tone={item.tone}
              key={item.id}
            >
              <div
                aria-label={`${item.label} ${value ?? "等待数据"}`}
                className="ncr-cognitive-status-ring__ring"
                role="img"
                style={{ "--ncr-ring-score": value ?? 0 } as CSSProperties}
              >
                <strong>{value ?? "--"}</strong>
              </div>
              <span>{item.label}</span>
              {item.helperText ? <span>{item.helperText}</span> : null}
            </article>
          );
        })}
      </div>
    </>
  );
}

export function TrainingMissionCard({
  title,
  subtitle,
  progressPercent,
  metrics,
  tasks,
  actionLabel,
  actionDescription,
  startHint,
  disabled = false,
  emptyMessage = "治疗师配置后，这里会显示今日训练模块、顺序和预计时长。",
  onStart,
  className
}: TrainingMissionCardProps): JSX.Element {
  const progress = normalizeMetricProgress(progressPercent) ?? 0;

  return (
    <>
      <AdvancedFrontendComponentsStyles />
      <NeuroGlassCard
        className={joinNeuroClassNames("ncr-training-mission-card", className)}
        level="floating"
      >
        <header className="ncr-training-mission-card__header">
          <div>
            <span className="ncr-advanced-eyebrow">Today Mission</span>
            <h2 className="ncr-training-mission-card__title">{title}</h2>
            <p className="ncr-training-mission-card__subtitle">{subtitle}</p>
          </div>
          <div
            aria-label={`今日训练进度 ${progress}%`}
            className="ncr-training-mission-card__progress"
            role="img"
            style={{ "--ncr-mission-progress": `${progress}%` } as CSSProperties}
          >
            <strong>{progress}%</strong>
          </div>
        </header>

        <div className="ncr-training-mission-card__metrics">
          {metrics.map((metric) => (
            <div className="ncr-training-mission-card__metric" key={metric.id}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>

        <div className="ncr-training-mission-card__tasks" aria-label="今日训练路线">
          {tasks.length === 0 ? (
            <div className="ncr-training-mission-card__task">
              <span className="ncr-training-mission-card__task-index">0</span>
              <div>
                <strong>暂无训练任务</strong>
                <p>{emptyMessage}</p>
              </div>
              <PatientRiskBadge severity="info" label="等待配置" />
            </div>
          ) : (
            tasks.map((task, index) => (
              <article className="ncr-training-mission-card__task" key={task.id}>
                <span className="ncr-training-mission-card__task-index">{index + 1}</span>
                <div>
                  <span>
                    {task.moduleName} · {task.durationLabel} · {task.difficultyLabel}
                  </span>
                  <strong>{task.title}</strong>
                  {task.focusArea ? <p>{task.focusArea}</p> : null}
                </div>
                {task.statusLabel ? (
                  <NeuroStatusBadge tone="monitoring">{task.statusLabel}</NeuroStatusBadge>
                ) : null}
              </article>
            ))
          )}
        </div>

        <div className="ncr-training-mission-card__action">
          <button
            className="ncr-training-mission-card__button"
            disabled={disabled}
            onClick={onStart}
            type="button"
          >
            <span>{actionLabel}</span>
            {actionDescription ? <small>{actionDescription}</small> : null}
          </button>
          {startHint ? <p className="ncr-training-mission-card__subtitle">{startHint}</p> : null}
        </div>
      </NeuroGlassCard>
    </>
  );
}

export function TherapistCommandPanel({
  title,
  eyebrow = "Pending Actions",
  summaryLabel,
  stats,
  alerts,
  actions,
  emptyAlertTitle = "暂无需要复核的训练提醒",
  emptyAlertMessage = "系统会持续记录训练过程中的温和提醒，用于后续复核和训练安排。",
  className
}: TherapistCommandPanelProps): JSX.Element {
  return (
    <>
      <AdvancedFrontendComponentsStyles />
      <NeuroGlassCard
        className={joinNeuroClassNames("ncr-therapist-command-panel", className)}
        level="floating"
      >
        <header className="ncr-therapist-command-panel__header">
          <div>
            <span className="ncr-advanced-eyebrow">{eyebrow}</span>
            <h2 className="ncr-therapist-command-panel__title">{title}</h2>
          </div>
          {summaryLabel ? <NeuroStatusBadge tone="warning">{summaryLabel}</NeuroStatusBadge> : null}
        </header>

        <div className="ncr-therapist-command-panel__stats">
          {stats.map((stat) => (
            <article className="ncr-therapist-command-panel__stat" key={stat.id}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </div>

        <div className="ncr-therapist-command-panel__alerts">
          {alerts.length === 0 ? (
            <article className="ncr-therapist-command-panel__alert">
              <PatientRiskBadge severity="info" label={emptyAlertTitle} />
              <p>{emptyAlertMessage}</p>
            </article>
          ) : (
            alerts.map((alert) => (
              <button
                className="ncr-therapist-command-panel__alert"
                key={alert.id}
                onClick={alert.onSelect}
                type="button"
              >
                <PatientRiskBadge severity={alert.severity ?? "watch"} label={alert.label} />
                <strong>{alert.title}</strong>
                <p>{alert.message}</p>
                {alert.meta ? <p>{alert.meta}</p> : null}
              </button>
            ))
          )}
        </div>

        <div className="ncr-therapist-command-panel__actions">
          {actions.map((action) => (
            <button
              className="ncr-therapist-command-panel__action"
              data-tone={resolveNeuroTone(action.tone)}
              key={action.id}
              onClick={action.onSelect}
              type="button"
            >
              {action.meta ? (
                <NeuroTag tone={action.tone ?? "monitoring"}>{action.meta}</NeuroTag>
              ) : null}
              <strong>{action.title}</strong>
              <p>{action.description}</p>
            </button>
          ))}
        </div>
      </NeuroGlassCard>
    </>
  );
}

export function PatientRiskBadge({
  severity,
  label,
  helperText,
  className
}: PatientRiskBadgeProps): JSX.Element {
  return (
    <>
      <AdvancedFrontendComponentsStyles />
      <span
        className={joinNeuroClassNames("ncr-patient-risk-badge", className)}
        data-severity={severity}
        title={helperText}
      >
        {label ?? riskSeverityLabel(severity)}
      </span>
    </>
  );
}

export function MedicalChartContainer({
  title,
  eyebrow = "Medical Data View",
  helperText,
  action,
  children,
  className
}: MedicalChartContainerProps): JSX.Element {
  return (
    <>
      <AdvancedFrontendComponentsStyles />
      <NeuroGlassCard className={joinNeuroClassNames("ncr-medical-chart-container", className)}>
        <header className="ncr-medical-chart-container__header">
          <div>
            <span className="ncr-advanced-eyebrow">{eyebrow}</span>
            <h2 className="ncr-medical-chart-container__title">{title}</h2>
            {helperText ? (
              <p className="ncr-training-mission-card__subtitle">{helperText}</p>
            ) : null}
          </div>
          {action}
        </header>
        <div className="ncr-medical-chart-container__body">{children}</div>
      </NeuroGlassCard>
    </>
  );
}

export function ConsentNoticePanel({
  title,
  subtitle,
  versionLabel,
  scopeNotice,
  sections,
  className
}: ConsentNoticePanelProps): JSX.Element {
  return (
    <>
      <AdvancedFrontendComponentsStyles />
      <NeuroGlassCard className={joinNeuroClassNames("ncr-consent-notice-panel", className)}>
        <header className="ncr-consent-notice-panel__header">
          <div>
            <span className="ncr-advanced-eyebrow">Consent & Privacy</span>
            <h2 className="ncr-consent-notice-panel__title">{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {versionLabel ? <DemoModeBadge label={versionLabel} compact /> : null}
        </header>
        <div className="ncr-consent-notice-panel__body">
          <p>{scopeNotice}</p>
          {sections && sections.length > 0 ? (
            <div className="ncr-consent-notice-panel__sections">
              {sections.map((section) => (
                <article className="ncr-consent-notice-panel__section" key={section.id}>
                  <h3>{section.title}</h3>
                  <p>{section.body}</p>
                  {section.bullets && section.bullets.length > 0 ? (
                    <ul>
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </NeuroGlassCard>
    </>
  );
}

export function AdvancedFrontendComponentsExample(): JSX.Element {
  const tasks: TrainingMissionTask[] = [
    {
      id: "music",
      title: "音乐疗愈准备",
      moduleName: "音乐疗愈",
      durationLabel: "6 分钟",
      difficultyLabel: "低负荷",
      focusArea: "先完成设备检查，再进入稳定节奏。"
    },
    {
      id: "attention",
      title: "目标探测训练",
      moduleName: "注意力训练",
      durationLabel: "8 分钟",
      difficultyLabel: "标准"
    }
  ];

  return (
    <ReducedMotionProvider>
      <SoftMotionWrapper>
        <NeuroGlassCard level="floating">
          <DemoModeBadge description="仅用于项目展示，不代表真实训练结果。" />
          <SystemHealthIndicator
            items={[
              { id: "system", label: "系统", value: "稳定", status: "good" },
              { id: "device", label: "设备", value: "EEG 已连接", status: "good" },
              { id: "sync", label: "数据", value: "已同步", status: "syncing" }
            ]}
          />
        </NeuroGlassCard>
      </SoftMotionWrapper>
      <TrainingMissionCard
        actionDescription="进入设备检查与训练流程"
        actionLabel="开始今日训练"
        metrics={[
          { id: "count", label: "训练模块", value: "2 项" },
          { id: "duration", label: "预计时长", value: "14 分钟" },
          { id: "music", label: "推荐音乐", value: "自然声" },
          { id: "state", label: "状态", value: "可开始" }
        ]}
        onStart={() => undefined}
        progressPercent={35}
        startHint="该示例只展示组件组合，不保存训练记录。"
        subtitle="今日任务由治疗师配置，用户可随时暂停。"
        tasks={tasks}
        title="今日认知训练任务"
      />
      <MedicalChartContainer
        title="状态趋势图表容器"
        helperText="用于统一包裹折线图、雷达图和热力图。"
      >
        <MedicalMetricCard label="注意指数" value={68} unit="分" progress={68} tone="clinical" />
      </MedicalChartContainer>
    </ReducedMotionProvider>
  );
}

function RoleIcon({ kind }: { kind: AuthRoleIconKind }): JSX.Element {
  if (kind === "guardian") {
    return (
      <svg viewBox="0 0 32 32" role="img">
        <path
          d="M10 14.4a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Zm12-1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3.8 25.8c.8-4.8 3.2-7.4 6.2-7.4s5.4 2.6 6.2 7.4H3.8Zm13.2 0c.5-3.1 2.2-5 4.8-5 2.5 0 4.5 1.9 5 5H17Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (kind === "therapist") {
    return (
      <svg viewBox="0 0 32 32" role="img">
        <path
          d="M16 4a5 5 0 0 1 5 5v2h2.5A2.5 2.5 0 0 1 26 13.5v10A2.5 2.5 0 0 1 23.5 26h-15A2.5 2.5 0 0 1 6 23.5v-10A2.5 2.5 0 0 1 8.5 11H11V9a5 5 0 0 1 5-5Zm-2.5 7h5V9a2.5 2.5 0 0 0-5 0v2Zm1.4 5v2.1h-2.1v2.8h2.1V23h2.8v-2.1h2.1v-2.8h-2.1V16h-2.8Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (kind === "organization") {
    return (
      <svg viewBox="0 0 32 32" role="img">
        <path
          d="M6 26V7.6L16 4l10 3.6V26h-6v-6h-8v6H6Zm4-15h4V8h-4v3Zm8 0h4V8h-4v3Zm-8 6h4v-3h-4v3Zm8 0h4v-3h-4v3Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" role="img">
      <path
        d="M16 4a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm0 4a8 8 0 0 1 7.8 6.2h-5.1l-2-3.8a1.4 1.4 0 0 0-2.5.1l-2.7 6.2-1.2-2a1.4 1.4 0 0 0-1.2-.7H8.2A8 8 0 0 1 16 8Zm0 16a8 8 0 0 1-7.8-6.2h2.1l2.2 3.5a1.4 1.4 0 0 0 2.5-.2l2.6-6 1 1.8c.3.5.8.7 1.3.7h3.9A8 8 0 0 1 16 24Z"
        fill="currentColor"
      />
    </svg>
  );
}

function drawEEGWave(input: {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  frames: EEGWaveFrame[];
  height: number;
  offset: number;
  qualityStatus: EEGQualityStatus;
  reducedIntensity: boolean;
}): void {
  const rect = input.canvas.getBoundingClientRect();
  const width = Math.max(320, Math.round(rect.width || input.canvas.clientWidth || 640));
  const height = input.height;
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  input.canvas.width = Math.round(width * dpr);
  input.canvas.height = Math.round(height * dpr);
  input.canvas.style.height = `${height}px`;

  const ctx = input.context;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "rgba(20, 95, 133, 0.08)");
  gradient.addColorStop(0.5, "rgba(34, 168, 161, 0.16)");
  gradient.addColorStop(1, "rgba(127, 159, 232, 0.08)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(88, 125, 145, 0.16)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 18; y < height; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const channels = [
    { key: "attention", color: "#145f85", base: height * 0.32 },
    { key: "relaxation", color: "#22a8a1", base: height * 0.55 },
    { key: "fatigue", color: "#c17a35", base: height * 0.76 }
  ] as const;

  channels.forEach((channel, channelIndex) => {
    ctx.beginPath();
    const amplitude = input.reducedIntensity ? 9 : 14;
    input.frames.forEach((frame, index) => {
      const x = (index / Math.max(1, input.frames.length - 1)) * width;
      const score = getEEGFrameScore(frame, channel.key, index);
      const phase = input.offset + index * 0.72 + channelIndex * 0.9;
      const normalized = (score - 50) / 50;
      const y = channel.base - normalized * amplitude + Math.sin(phase) * (amplitude * 0.32);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = qualityStrokeColor(input.qualityStatus, channel.color);
    ctx.lineWidth = input.reducedIntensity ? 1.8 : 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = channel.color;
    ctx.shadowBlur = input.reducedIntensity ? 4 : 9;
    ctx.stroke();
    ctx.shadowBlur = 0;
  });
}

function getEEGFrameScore(
  frame: EEGWaveFrame,
  channel: "attention" | "relaxation" | "fatigue",
  index: number
): number {
  if (channel === "attention") {
    return clampScore(frame.attentionScore ?? frame.attentionIndex ?? 58 + Math.sin(index) * 6);
  }
  if (channel === "relaxation") {
    return clampScore(frame.relaxationScore ?? frame.relaxationIndex ?? 54 + Math.cos(index) * 5);
  }
  return clampScore(frame.fatigueScore ?? 100 - (frame.relaxationIndex ?? 54) * 0.7);
}

function qualityStrokeColor(status: EEGQualityStatus, fallback: string): string {
  if (status === "disconnected") {
    return "rgba(84, 112, 134, 0.42)";
  }
  if (status === "noisy") {
    return "rgba(193, 122, 53, 0.78)";
  }
  if (status === "unstable") {
    return "rgba(127, 159, 232, 0.78)";
  }
  return fallback;
}

function createSyntheticEEGFrames(count = 48): EEGWaveFrame[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `synthetic-eeg-${index}`,
    sessionId: "demo-session",
    timestamp: new Date(Date.now() - (count - index) * 1000).toISOString(),
    source: "simulator",
    windowSeconds: 1,
    samplingRateHz: 128,
    attentionIndex: clampScore(62 + Math.sin(index / 3) * 8),
    relaxationIndex: clampScore(56 + Math.cos(index / 4) * 7),
    fatigueScore: clampScore(34 + Math.sin(index / 5) * 5),
    signalQuality: 90,
    qualityStatus: "good",
    artifactFlag: false,
    bandPower: {
      delta: 0.18,
      theta: 0.36,
      alpha: 0.48,
      beta: 0.42,
      gamma: 0.12
    }
  }));
}

function normalizeNullableScore(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  return clampScore(value);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function riskSeverityLabel(severity: PatientRiskSeverity): string {
  switch (severity) {
    case "action_required":
    case "needs_review":
      return "建议复核";
    case "watch":
      return "温和关注";
    case "info":
      return "提示";
    case "none":
      return "状态稳定";
  }
}
