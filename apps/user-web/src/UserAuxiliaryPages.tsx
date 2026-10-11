import {
  DemoModeBadge,
  EEGDisconnectedState,
  MedicalMetricCard,
  NeuroButton,
  NeuroGlassCard,
  PatientRiskBadge,
  SystemHealthIndicator
} from "@neuro-cog-rehab/ui-components";
import type { ReactNode } from "react";

import type { TraineeDashboardData } from "./trainee-dashboard-model.js";

type AuxiliaryPageProps = {
  data: TraineeDashboardData;
  onBackToDashboard: () => void;
};

type TraineeSettingsPageProps = AuxiliaryPageProps & {
  onOpenConsent: () => void;
};

const DEMO_DATA_NOTE = "当前页面使用演示数据展示结构，尚未接入真实后端接口。";

export function TraineeDevicePage({ data, onBackToDashboard }: AuxiliaryPageProps): JSX.Element {
  const status = data.deviceStatus;
  const isConnected = status.connectionStatus === "connected";
  const signalLabel = buildSignalLabel(status.signalQuality);
  const latencyLabel = status.latencyMs === null ? "暂无延迟数据" : `${status.latencyMs} ms`;

  return (
    <AuxiliaryPageFrame
      eyebrow="Trainee Device"
      title="设备状态"
      description="用于训练前检查 EEG 模拟设备或后续真实设备的连接状态。"
      action={<DemoModeBadge label="演示数据" />}
      onBackToDashboard={onBackToDashboard}
    >
      <div className="aux-grid aux-grid--device">
        <NeuroGlassCard className="aux-primary-card" level="floating">
          <div className="aux-card-heading">
            <span>EEG 连接检查</span>
            <PatientRiskBadge
              severity={isConnected ? "none" : "watch"}
              label={isConnected ? "已连接" : "待连接"}
            />
          </div>
          <SystemHealthIndicator
            layout="stacked"
            items={[
              {
                id: "connection",
                label: "连接状态",
                value: isConnected ? "可用于训练" : "需要检查",
                status: isConnected ? "good" : "warning",
                helperText: "训练开始前建议先确认设备状态。"
              },
              {
                id: "quality",
                label: "信号质量",
                value: signalLabel,
                status: status.signalQuality === "good" ? "good" : "warning",
                helperText: "信号波动时先调整佩戴位置。"
              },
              {
                id: "latency",
                label: "数据延迟",
                value: latencyLabel,
                status: status.latencyMs !== null && status.latencyMs <= 800 ? "good" : "warning",
                helperText: "延迟过高时建议重新连接。"
              }
            ]}
          />
          <p className="aux-copy">{DEMO_DATA_NOTE}</p>
        </NeuroGlassCard>

        <div className="aux-metric-stack">
          <MedicalMetricCard
            label="注意指数"
            value={status.attentionScore ?? "暂无数据"}
            unit={status.attentionScore === null ? "" : "分"}
            progress={status.attentionScore ?? null}
            tone="clinical"
            variant="core"
          />
          <MedicalMetricCard
            label="放松指数"
            value={status.relaxationScore ?? "暂无数据"}
            unit={status.relaxationScore === null ? "" : "分"}
            progress={status.relaxationScore ?? null}
            tone="monitoring"
            variant="info"
          />
          <MedicalMetricCard
            label="疲劳趋势"
            value={status.fatigueScore ?? "暂无数据"}
            unit={status.fatigueScore === null ? "" : "分"}
            progress={status.fatigueScore ?? null}
            tone="warning"
            variant="risk"
          />
        </div>

        {!isConnected ? (
          <EEGDisconnectedState onAction={() => undefined} />
        ) : (
          <NeuroGlassCard className="aux-list-card">
            <h2>训练前建议</h2>
            <ul className="aux-check-list">
              <li>佩戴位置稳定后再开始正式训练。</li>
              <li>如果提示信号不稳定，先休息并重新调整设备。</li>
              <li>本页面只展示训练安全相关状态，不提供诊断判断。</li>
            </ul>
          </NeuroGlassCard>
        )}
      </div>
    </AuxiliaryPageFrame>
  );
}

export function TraineeSettingsPage({
  data,
  onBackToDashboard,
  onOpenConsent
}: TraineeSettingsPageProps): JSX.Element {
  return (
    <AuxiliaryPageFrame
      eyebrow="Trainee Settings"
      title="训练设置"
      description="查看当前训练提醒、知情同意入口和演示模式说明。"
      action={<DemoModeBadge label="演示配置" />}
      onBackToDashboard={onBackToDashboard}
    >
      <div className="aux-grid">
        <NeuroGlassCard className="aux-list-card" level="floating">
          <h2>安全提醒</h2>
          <ul className="aux-check-list">
            {data.safetyTips.map((tip) => (
              <li key={tip.id}>
                <strong>{tip.title}</strong>
                <span>{tip.message}</span>
              </li>
            ))}
          </ul>
        </NeuroGlassCard>

        <NeuroGlassCard className="aux-list-card">
          <h2>协议与隐私</h2>
          <p className="aux-copy">
            训练记录、EEG 摘要和反馈内容都按敏感数据处理。未成年人使用前需要监护人知情同意。
          </p>
          <div className="aux-actions">
            <NeuroButton onClick={onOpenConsent} type="button">
              查看知情同意
            </NeuroButton>
            <NeuroButton onClick={onBackToDashboard} type="button" variant="secondary">
              返回训练舱
            </NeuroButton>
          </div>
        </NeuroGlassCard>

        <NeuroGlassCard className="aux-list-card">
          <h2>数据来源</h2>
          <p className="aux-copy">{DEMO_DATA_NOTE}</p>
        </NeuroGlassCard>
      </div>
    </AuxiliaryPageFrame>
  );
}

export function ParentRecordsPage({ data, onBackToDashboard }: AuxiliaryPageProps): JSX.Element {
  return (
    <AuxiliaryPageFrame
      eyebrow="Parent Records"
      title="训练记录"
      description="查看最近一周训练完成情况，帮助家长了解坚持情况和任务节奏。"
      action={<DemoModeBadge label="演示记录" />}
      onBackToDashboard={onBackToDashboard}
    >
      <div className="aux-grid">
        <NeuroGlassCard className="aux-primary-card" level="floating">
          <div className="aux-card-heading">
            <span>最近 7 天</span>
            <PatientRiskBadge severity="info" label="趋势摘要" />
          </div>
          <div className="aux-week-bars" aria-label="最近 7 天训练时长">
            {data.weeklyProgress.days.map((day) => {
              const completionRatio =
                day.plannedMinutes > 0 ? day.completedMinutes / day.plannedMinutes : 0;
              const barHeight = Math.max(8, Math.min(100, completionRatio * 100));

              return (
                <div className="aux-week-bar" key={day.dayLabel}>
                  <span style={{ height: `${barHeight}%` }} />
                  <strong>{day.dayLabel}</strong>
                  <em>{day.completedMinutes} 分钟</em>
                </div>
              );
            })}
          </div>
        </NeuroGlassCard>

        <div className="aux-metric-stack">
          <MedicalMetricCard
            label="本周训练次数"
            value={`${data.weeklyProgress.completedSessions}/${data.weeklyProgress.plannedSessions}`}
            helperText="显示已完成次数与计划次数。"
            progress={
              data.weeklyProgress.plannedSessions > 0
                ? (data.weeklyProgress.completedSessions / data.weeklyProgress.plannedSessions) *
                  100
                : null
            }
            tone="clinical"
            variant="core"
          />
          <MedicalMetricCard
            label="本周训练时长"
            value={data.weeklyProgress.completedMinutes}
            unit="分钟"
            helperText={`目标 ${data.weeklyProgress.targetMinutes} 分钟`}
            progress={
              data.weeklyProgress.targetMinutes > 0
                ? (data.weeklyProgress.completedMinutes / data.weeklyProgress.targetMinutes) * 100
                : null
            }
            tone="monitoring"
            variant="training"
          />
          <MedicalMetricCard
            label="连续训练"
            value={data.weeklyProgress.streakDays}
            unit="天"
            helperText="用于展示训练坚持情况。"
            tone="monitoring"
            variant="info"
          />
        </div>
      </div>
    </AuxiliaryPageFrame>
  );
}

export function ParentAdvicePage({ data, onBackToDashboard }: AuxiliaryPageProps): JSX.Element {
  return (
    <AuxiliaryPageFrame
      eyebrow="Parent Advice"
      title="治疗师建议"
      description="展示治疗师给家长和训练用户的阶段性提示，语言保持克制和可理解。"
      action={<DemoModeBadge label="演示建议" />}
      onBackToDashboard={onBackToDashboard}
    >
      <div className="aux-grid">
        <NeuroGlassCard className="aux-primary-card" level="floating">
          <div className="aux-card-heading">
            <span>{data.therapistMessage ? "当前留言" : "暂无新留言"}</span>
            <PatientRiskBadge severity="info" label="建议" />
          </div>
          {data.therapistMessage ? (
            <>
              <p className="aux-copy">{data.therapistMessage.message}</p>
              <p className="aux-copy aux-copy--subtle">
                {data.therapistMessage.therapistName} · {data.therapistMessage.sentAtLabel}
              </p>
            </>
          ) : (
            <p className="aux-copy">治疗师暂未更新新的训练建议。</p>
          )}
        </NeuroGlassCard>

        <NeuroGlassCard className="aux-list-card">
          <h2>家长可协助观察</h2>
          <ul className="aux-check-list">
            <li>训练前是否愿意开始任务。</li>
            <li>训练中是否需要额外休息。</li>
            <li>结束后是否能用简单语言描述感受。</li>
          </ul>
        </NeuroGlassCard>
      </div>
    </AuxiliaryPageFrame>
  );
}

export function ParentRiskPage({ data, onBackToDashboard }: AuxiliaryPageProps): JSX.Element {
  return (
    <AuxiliaryPageFrame
      eyebrow="Parent Safety"
      title="风险提醒"
      description="仅用于训练安全提示和休息建议，不作为诊断判断。"
      action={<PatientRiskBadge severity="watch" label="温和提醒" />}
      onBackToDashboard={onBackToDashboard}
    >
      <div className="aux-grid">
        <NeuroGlassCard className="aux-list-card" level="floating">
          <h2>当前提醒</h2>
          <ul className="aux-check-list">
            {data.safetyTips.map((tip) => (
              <li key={tip.id}>
                <strong>{tip.title}</strong>
                <span>{tip.message}</span>
              </li>
            ))}
          </ul>
        </NeuroGlassCard>

        <NeuroGlassCard className="aux-list-card">
          <h2>处理建议</h2>
          <ul className="aux-check-list">
            <li>出现不适反馈时先暂停训练并休息。</li>
            <li>设备信号不稳定时优先调整佩戴，不强行继续。</li>
            <li>如需调整训练计划，请由授权治疗师处理。</li>
          </ul>
        </NeuroGlassCard>
      </div>
    </AuxiliaryPageFrame>
  );
}

export function ParentSettingsPage({ data, onBackToDashboard }: AuxiliaryPageProps): JSX.Element {
  return (
    <AuxiliaryPageFrame
      eyebrow="Parent Settings"
      title="账号设置"
      description="家长端演示设置页，用于展示后续账号、安全和授权配置入口。"
      action={<DemoModeBadge label="演示设置" />}
      onBackToDashboard={onBackToDashboard}
    >
      <div className="aux-grid">
        <NeuroGlassCard className="aux-list-card" level="floating">
          <h2>授权对象</h2>
          <p className="aux-copy">当前查看对象：{data.traineeName}</p>
          <p className="aux-copy aux-copy--subtle">
            后续接入真实后端后，此处应由授权关系接口返回，不在前端硬编码身份关系。
          </p>
        </NeuroGlassCard>

        <NeuroGlassCard className="aux-list-card">
          <h2>隐私边界</h2>
          <ul className="aux-check-list">
            <li>家长端默认展示简化反馈，不展示无关敏感字段。</li>
            <li>数据导出和报告查看需要授权角色校验。</li>
            <li>演示数据不会被写入真实训练记录。</li>
          </ul>
        </NeuroGlassCard>
      </div>
    </AuxiliaryPageFrame>
  );
}

function AuxiliaryPageFrame({
  action,
  children,
  description,
  eyebrow,
  onBackToDashboard,
  title
}: {
  action?: ReactNode;
  children: ReactNode;
  description: string;
  eyebrow: string;
  onBackToDashboard: () => void;
  title: string;
}): JSX.Element {
  return (
    <main className="aux-page" aria-labelledby="aux-page-title">
      <section className="aux-hero">
        <div>
          <p>{eyebrow}</p>
          <h1 id="aux-page-title">{title}</h1>
          <span>{description}</span>
        </div>
        <div className="aux-actions">
          {action}
          <NeuroButton onClick={onBackToDashboard} type="button" variant="secondary">
            返回总览
          </NeuroButton>
        </div>
      </section>
      {children}
    </main>
  );
}

function buildSignalLabel(
  signalQuality: TraineeDashboardData["deviceStatus"]["signalQuality"]
): string {
  switch (signalQuality) {
    case "good":
      return "良好";
    case "unstable":
      return "不稳定";
    case "offline":
      return "离线";
    default:
      return "未知";
  }
}
