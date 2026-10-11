import { getAppShellRoleLabel, getDefaultAppShellPath } from "./app-shell-menu.js";
import type { AppShellRole } from "./app-shell-types.js";

export interface WorkspaceOverviewProps {
  role: AppShellRole;
  title?: string;
  description?: string;
}

/**
 * Reusable role workspace overview used while a full page is being connected.
 * The component keeps product-facing copy focused on rehabilitation workflow,
 * avoiding generic admin-template language.
 */
export function WorkspaceOverview({
  role,
  title,
  description
}: WorkspaceOverviewProps): JSX.Element {
  const roleLabel = getAppShellRoleLabel(role);
  const defaultPath = getDefaultAppShellPath(role);
  const metrics = buildWorkspaceMetrics(role);

  return (
    <div className="ncr-workspace-overview">
      <section className="ncr-workspace-overview__hero">
        <article className="ncr-workspace-overview__card">
          <span className="ncr-data-panel__eyebrow">{roleLabel}医疗工作空间</span>
          <h1>{title ?? "认知康复工作空间已连接"}</h1>
          <p>
            {description ??
              "当前页面接入统一导航、实时状态栏、脑电状态入口、通知中心和医疗级背景。后续业务页面可在不改变训练数据结构和接口字段的前提下逐步接入。"}
          </p>
          <p>默认入口：{defaultPath}</p>
        </article>
        <article className="ncr-workspace-overview__card">
          <h2>状态边界</h2>
          <p>所有提示均用于训练安全、状态观察和趋势反馈，不包含诊断结论或效果保证。</p>
        </article>
      </section>

      <section className="ncr-workspace-overview__metrics" aria-label="工作区状态指标">
        {metrics.map((metric) => (
          <article className="ncr-workspace-overview__metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>
    </div>
  );
}

function buildWorkspaceMetrics(role: AppShellRole): Array<{ label: string; value: string }> {
  if (role === "parent") {
    return [
      { label: "本周完成", value: "3次" },
      { label: "累计时长", value: "58分" },
      { label: "下次建议", value: "放松后训练" }
    ];
  }

  if (role === "therapist") {
    return [
      { label: "今日待训练", value: "8人" },
      { label: "待查看提醒", value: "2条" },
      { label: "处方更新", value: "4项" }
    ];
  }

  if (role === "org_admin") {
    return [
      { label: "机构用户", value: "128人" },
      { label: "在线设备", value: "24台" },
      { label: "日志待审", value: "6条" }
    ];
  }

  return [
    { label: "今日任务", value: "4项" },
    { label: "建议时长", value: "24分" },
    { label: "设备状态", value: "待检查" }
  ];
}
