import {
  EEGVisualizationShell,
  MedicalDataPanel,
  MedicalMetricCard,
  NeuroAlert,
  NeuroButton,
  NeuroDesignSystemProvider,
  NeuroGlassCard,
  NeuroInput,
  NeuroPageBackground,
  NeuroSelect,
  NeuroStatusBadge,
  NeuroTag
} from "./design-system.js";
import type { NeuroThemeMode } from "./design-system-tokens.js";

export interface DesignSystemExamplePageProps {
  theme?: NeuroThemeMode;
}

const overviewMetrics = [
  {
    id: "training-progress",
    label: "今日任务",
    value: "3/4",
    unit: "项",
    helperText: "展示训练完成进度，不作为能力判断。",
    trendLabel: "进行中",
    progress: 75,
    tone: "clinical" as const
  },
  {
    id: "attention-trend",
    label: "注意趋势",
    value: 68,
    unit: "分",
    helperText: "用于训练状态参考。",
    trendLabel: "较稳定",
    progress: 68,
    tone: "monitoring" as const
  },
  {
    id: "reaction-pace",
    label: "反应节奏",
    value: 412,
    unit: "ms",
    helperText: "结合任务类型查看变化。",
    trendLabel: "可追踪",
    progress: 58,
    tone: "primary" as const
  },
  {
    id: "rest-reminder",
    label: "休息提醒",
    value: 12,
    unit: "min",
    helperText: "到达建议时长后提示暂停。",
    trendLabel: "温和提示",
    progress: 42,
    tone: "calm" as const
  }
];

export function DesignSystemExamplePage({
  theme = "hospital-light"
}: DesignSystemExamplePageProps): JSX.Element {
  return (
    <NeuroDesignSystemProvider theme={theme}>
      <NeuroPageBackground>
        <div className="ncr-demo-layout">
          <div className="ncr-demo-hero">
            <NeuroGlassCard level="floating">
              <div className="ncr-demo-eyebrow">Smart Rehab Platform</div>
              <h1 className="ncr-demo-title">认知康复一体化系统</h1>
              <p className="ncr-demo-copy">
                面向辅助训练、状态评估、训练记录与趋势分析的统一前端视觉系统，适配用户端、治疗师端和管理端。
              </p>
              <div className="ncr-demo-actions">
                <NeuroButton>开始训练流程</NeuroButton>
                <NeuroButton variant="secondary">查看训练记录</NeuroButton>
                <NeuroButton variant="ghost">进入治疗师工作台</NeuroButton>
              </div>
            </NeuroGlassCard>

            <EEGVisualizationShell
              attentionScore={68}
              connectionLabel="已连接"
              fatigueScore={24}
              qualityLabel="稳定"
              relaxationScore={55}
              statusTone="monitoring"
              subtitle="实时状态只用于训练过程提示和记录展示。"
              title="脑电状态可视化"
            />
          </div>

          <MedicalDataPanel
            action={<NeuroStatusBadge tone="clinical">浅色医院科技风</NeuroStatusBadge>}
            metrics={overviewMetrics}
            subtitle="核心数据使用柔和光晕和监测仪式线条，避免高频闪烁与强刺激。"
            title="训练状态总览"
          />

          <div className="ncr-demo-controls">
            <MedicalMetricCard
              helperText="核心数据卡使用轻微蓝绿色边框光，不使用强刺激闪烁。"
              label="训练会话"
              progress={72}
              statusLabel="实时刷新"
              tone="monitoring"
              unit="min"
              value={24}
              variant="core"
            />
            <MedicalMetricCard
              helperText="风险提示只用于训练安全提醒，使用温和琥珀色。"
              label="佩戴提示"
              progress={46}
              statusLabel="复核"
              tone="warning"
              value="轻微波动"
              variant="risk"
            />
            <MedicalMetricCard
              helperText="报告卡弱化动效，优先保障治疗师端阅读效率。"
              label="周报草稿"
              statusLabel="待查看"
              tone="primary"
              value="3"
              unit="份"
              variant="report"
            />
          </div>

          <div className="ncr-demo-controls">
            <NeuroInput
              helperText="建议显示昵称或匿名编号，避免泄露敏感身份信息。"
              label="用户显示名"
              placeholder="示例：训练用户 A"
            />
            <NeuroSelect
              helperText="不同端可复用同一选择器视觉。"
              label="训练模块"
              options={[
                { label: "音乐疗愈", value: "music" },
                { label: "注意力训练", value: "attention" },
                { label: "Go/No-Go 训练", value: "go-nogo" },
                { label: "节律导航", value: "rhythm" }
              ]}
            />
            <NeuroAlert title="温和状态提示" tone="warning">
              当前信号略有波动，可先调整佩戴或短暂休息后继续训练。
            </NeuroAlert>
          </div>

          <NeuroGlassCard interactive>
            <div className="ncr-eeg-shell__chips">
              <NeuroTag tone="clinical">医院白</NeuroTag>
              <NeuroTag tone="monitoring">冰蓝监测线</NeuroTag>
              <NeuroTag tone="calm">淡紫蓝辅助状态</NeuroTag>
              <NeuroTag tone="warning">低刺激提醒</NeuroTag>
            </div>
          </NeuroGlassCard>
        </div>
      </NeuroPageBackground>
    </NeuroDesignSystemProvider>
  );
}
