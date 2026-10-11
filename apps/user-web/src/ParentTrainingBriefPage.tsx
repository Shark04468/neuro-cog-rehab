import { useMemo } from "react";
import {
  DemoModeBadge,
  MedicalMetricCard,
  NeuroButton,
  NeuroGlassCard,
  PatientRiskBadge,
  SoftMotionWrapper,
  type NeuroTone
} from "@neuro-cog-rehab/ui-components";

import {
  buildParentTrainingBriefTemplate,
  mockParentTrainingBriefInput,
  type ParentBriefSection,
  type ParentTrainingBriefInput
} from "./parent-training-brief-model.js";

export interface ParentTrainingBriefPageProps {
  input?: ParentTrainingBriefInput;
  onBackToHome: () => void;
}

export function ParentTrainingBriefPage(props: ParentTrainingBriefPageProps) {
  const brief = useMemo(
    () => buildParentTrainingBriefTemplate(props.input ?? mockParentTrainingBriefInput),
    [props.input]
  );

  return (
    <main className="app-shell">
      <section className="parent-brief-band" aria-labelledby="parent-brief-title">
        <div className="parent-brief-inner">
          <NeuroButton variant="ghost" onClick={props.onBackToHome}>
            返回今日首页
          </NeuroButton>

          <NeuroGlassCard className="parent-brief-header" level="floating">
            <div>
              <p className="home-kicker">家长端训练简报</p>
              <h1 id="parent-brief-title">
                {brief.traineeDisplayName}的{brief.periodLabel}训练回顾
              </h1>
              <p className="home-subtitle">{brief.summaryText}</p>
            </div>
            <div className="parent-brief-notice">
              <DemoModeBadge
                description="当前简报为演示数据，用于展示页面结构和汇报流程。"
                label="演示简报"
              />
              <span>生成时间</span>
              <strong>{brief.generatedAtLabel}</strong>
              <p>{brief.scopeNotice}</p>
            </div>
          </NeuroGlassCard>

          <NeuroGlassCard className="parent-brief-section" aria-labelledby="brief-overview-title">
            <div className="section-heading">
              <div>
                <p>简报字段结构</p>
                <h2 id="brief-overview-title">家长需要看到的内容</h2>
              </div>
              <PatientRiskBadge label="通俗版" severity="info" />
            </div>
            <div className="brief-field-grid">
              {brief.fieldStructure.map((field) => (
                <NeuroGlassCard className="brief-field-card" key={field.id} level="base">
                  <span>{field.id}</span>
                  <h3>{field.title}</h3>
                  <p>{field.description}</p>
                  <small>{field.dataKeys.join(" / ")}</small>
                </NeuroGlassCard>
              ))}
            </div>
          </NeuroGlassCard>

          <section className="parent-brief-metrics" aria-label="训练简报概览">
            {brief.heroMetrics.map((metric, index) => (
              <SoftMotionWrapper delayMs={index * 60} key={metric.label}>
                <MedicalMetricCard
                  helperText={metric.helperText}
                  label={metric.label}
                  progress={resolveParentMetricProgress(metric.value, index)}
                  statusLabel={metric.tone === "positive" ? "稳定趋势" : "阶段记录"}
                  tone={resolveParentTone(metric.tone)}
                  value={metric.value}
                  variant="report"
                />
              </SoftMotionWrapper>
            ))}
          </section>

          <div className="parent-brief-layout">
            <section className="parent-brief-section-list" aria-label="家长端简报正文">
              {brief.sections.map((section) => (
                <BriefSectionCard section={section} key={section.id} />
              ))}
            </section>

            <aside className="parent-brief-side" aria-label="示例文案与数据来源">
              <NeuroGlassCard className="parent-brief-side-card" aria-labelledby="brief-copy-title">
                <p>示例文案</p>
                <h2 id="brief-copy-title">可以直接展示给家长</h2>
                <ul>
                  {brief.exampleCopy.map((copy) => (
                    <li key={copy}>{copy}</li>
                  ))}
                </ul>
              </NeuroGlassCard>

              <NeuroGlassCard
                className="parent-brief-side-card"
                aria-labelledby="brief-source-title"
              >
                <p>数据来源说明</p>
                <h2 id="brief-source-title">每条内容来自哪里</h2>
                <dl>
                  {brief.dataSources.map((source) => (
                    <div key={source.label}>
                      <dt>{source.label}</dt>
                      <dd>{source.description}</dd>
                    </div>
                  ))}
                </dl>
              </NeuroGlassCard>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function BriefSectionCard(props: { section: ParentBriefSection }) {
  return (
    <NeuroGlassCard className="parent-brief-card" level="raised">
      <PatientRiskBadge
        label={props.section.title}
        severity={props.section.tone === "positive" ? "info" : "watch"}
      />
      <span>{props.section.title}</span>
      <h2>{props.section.headline}</h2>
      <p>{props.section.body}</p>
      <ul>
        {props.section.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </NeuroGlassCard>
  );
}

function resolveParentTone(tone: ParentBriefSection["tone"]): NeuroTone {
  if (tone === "positive") {
    return "monitoring";
  }
  if (tone === "next") {
    return "clinical";
  }

  return "calm";
}

function resolveParentMetricProgress(value: string, index: number): number {
  const ratioParts = value
    .split("/")
    .map((part) => Number.parseInt(part.replace(/[^\d]/g, ""), 10));
  const completed = ratioParts[0];
  const total = ratioParts[1];

  if (
    completed !== undefined &&
    total !== undefined &&
    Number.isFinite(completed) &&
    Number.isFinite(total) &&
    total > 0
  ) {
    return Math.round((completed / total) * 100);
  }

  const numericValue = Number.parseInt(value.replace(/[^\d]/g, ""), 10);
  if (Number.isFinite(numericValue)) {
    return Math.max(24, Math.min(96, numericValue + index * 12));
  }

  return 56 + index * 10;
}
