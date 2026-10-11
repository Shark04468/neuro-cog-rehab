import {
  AnimatedEEGWave,
  DataFlowGrid,
  DynamicEffectsStyles,
  FloatingMetric,
  GlowPulseCard,
  LoadingBrainScan,
  NeuralParticleBackground,
  PageTransition,
  RealtimeSignalRing,
  ScanLineHighlight,
  SoftGradientOrb
} from "./dynamic-effects.js";
import { NeuroStatusBadge, NeuroTag } from "./design-system.js";

export interface DynamicEffectsExamplePageProps {
  trainingMode?: boolean;
}

export function DynamicEffectsExamplePage({
  trainingMode = false
}: DynamicEffectsExamplePageProps): JSX.Element {
  return (
    <PageTransition intensity="low" trainingMode={trainingMode}>
      <DynamicEffectsStyles />
      <section className="ncr-dynamic-showcase" data-training-mode={String(trainingMode)}>
        <DataFlowGrid intensity="low" tone="clinical" trainingMode={trainingMode} />
        <NeuralParticleBackground
          intensity="medium"
          tone="monitoring"
          trainingMode={trainingMode}
        />
        <SoftGradientOrb
          intensity="low"
          size={420}
          tone="clinical"
          trainingMode={trainingMode}
          x="14%"
          y="18%"
        />
        <SoftGradientOrb
          intensity="low"
          size={360}
          tone="calm"
          trainingMode={trainingMode}
          x="86%"
          y="18%"
        />

        <div className="ncr-dynamic-showcase__content">
          <div className="ncr-dynamic-showcase__hero">
            <GlowPulseCard
              className="ncr-dynamic-showcase__panel"
              intensity="medium"
              tone="clinical"
              trainingMode={trainingMode}
            >
              <NeuroTag tone="monitoring">Dynamic Safety Layer</NeuroTag>
              <h1>脑科学实时监测视觉组件</h1>
              <p>
                这组组件用于营造康复训练、状态评估和趋势追踪氛围。动画保持低频、低透明度和柔和位移，
                训练进行时可通过 trainingMode 自动降低背景强度。
              </p>
              <div className="ncr-dynamic-showcase__metrics">
                <FloatingMetric
                  label="注意指数"
                  value={72}
                  helperText="平稳观察"
                  trainingMode={trainingMode}
                />
                <FloatingMetric
                  label="放松指数"
                  value={54}
                  tone="calm"
                  helperText="中等水平"
                  trainingMode={trainingMode}
                />
                <FloatingMetric
                  label="信号延迟"
                  value={320}
                  unit="ms"
                  tone="warning"
                  helperText="可训练范围"
                  trainingMode={trainingMode}
                />
              </div>
            </GlowPulseCard>

            <ScanLineHighlight intensity="low" tone="monitoring" trainingMode={trainingMode}>
              <div className="ncr-dynamic-showcase__panel">
                <NeuroStatusBadge tone="monitoring">实时状态</NeuroStatusBadge>
                <AnimatedEEGWave
                  ariaLabel="低频动态脑电波示意"
                  intensity="medium"
                  tone="monitoring"
                  trainingMode={trainingMode}
                />
                <div className="ncr-dynamic-showcase__rings">
                  <RealtimeSignalRing label="信号质量" value={86} trainingMode={trainingMode} />
                  <RealtimeSignalRing
                    label="疲劳趋势"
                    value={28}
                    tone="warning"
                    trainingMode={trainingMode}
                  />
                </div>
              </div>
            </ScanLineHighlight>
          </div>

          <div className="ncr-dynamic-showcase__grid">
            <GlowPulseCard
              className="ncr-dynamic-showcase__panel"
              intensity="low"
              tone="calm"
              trainingMode={trainingMode}
            >
              <h2>LoadingBrainScan</h2>
              <p>用于报告生成、数据加载和设备连接等待，不使用闪白或快速闪烁。</p>
              <LoadingBrainScan label="正在整理训练摘要" tone="calm" trainingMode={trainingMode} />
            </GlowPulseCard>

            <ScanLineHighlight intensity="low" tone="clinical" trainingMode={trainingMode}>
              <div className="ncr-dynamic-showcase__panel">
                <h2>ScanLineHighlight</h2>
                <p>适合重点卡片扫光，频率低、范围小，避免干扰阅读。</p>
                <AnimatedEEGWave intensity="low" tone="clinical" trainingMode={trainingMode} />
              </div>
            </ScanLineHighlight>

            <GlowPulseCard
              className="ncr-dynamic-showcase__panel"
              intensity="low"
              tone="monitoring"
              trainingMode={trainingMode}
            >
              <h2>训练安全策略</h2>
              <p>
                背景粒子和网格默认低透明度；当进入训练任务，可将 trainingMode 设为 true，
                背景强度会降为 minimal 或 low。
              </p>
              <NeuroStatusBadge tone={trainingMode ? "warning" : "monitoring"}>
                {trainingMode ? "训练中低动效" : "展示模式"}
              </NeuroStatusBadge>
            </GlowPulseCard>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
