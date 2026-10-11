import { useEffect, useMemo, useState } from "react";
import {
  AppShell,
  buildDemoSystemStatus,
  clearDemoHandoffFromCurrentUrl,
  createLocalWorkspaceBaseUrls,
  createUnifiedAuthApiClients,
  DemoModeBadge,
  getConfiguredApiBaseUrl,
  isAuthPortalRole,
  isDemoAuthResult,
  loadDemoAuthFromLocation,
  logoutUnifiedAuthApiSession,
  MedicalChartContainer,
  MedicalMetricCard,
  NeuroButton,
  NeuroGlassCard,
  PatientRiskBadge,
  PermissionDeniedState,
  resolveWorkspaceNavigationTarget,
  SoftMotionWrapper,
  StatusDistributionChart,
  SystemHealthIndicator,
  UnifiedAuthPortal,
  type AppShellEEGStatus,
  type AppShellNotification,
  type UnifiedAuthResult,
  type WorkspaceBaseUrls
} from "@neuro-cog-rehab/ui-components";

import {
  fetchAdminOperationLogSummary,
  type AdminOperationLogApiSession,
  type AdminOperationLogSummary
} from "./operation-log-api-client.js";

const AUTH_SESSION_STORAGE_KEY = "ncr-admin-unified-auth-session";
const AUTH_API_CLIENTS = createAuthApiClientsFromEnv();

const ADMIN_EEG_STATUS: AppShellEEGStatus = {
  connectionStatus: "connected",
  signalQuality: "good",
  attentionScore: null,
  relaxationScore: null,
  fatigueScore: null,
  latencyMs: 280,
  statusText: "机构设备总览可用"
};

const ADMIN_NOTIFICATIONS: AppShellNotification[] = [
  {
    id: "permission-review",
    title: "权限复核提醒",
    message: "本周有 3 条权限变更记录待管理员复核。",
    level: "warning",
    createdAtLabel: "今天"
  },
  {
    id: "export-log",
    title: "数据导出日志",
    message: "脱敏导出记录已进入操作日志，可按时间和操作者查询。",
    level: "info",
    createdAtLabel: "今天"
  }
];

interface AdminMetric {
  label: string;
  value: string;
  helper: string;
}

interface AdminRouteView {
  path: string;
  kicker: string;
  title: string;
  description: string;
  primaryActionLabel: string;
  primaryActionPath: string;
  metrics: AdminMetric[];
  boundaryItems: string[];
  taskTitle: string;
  tasks: string[];
}

const COMMON_BOUNDARY_ITEMS = [
  "管理员仅查看所属机构范围内的账号、设备和日志。",
  "训练用户数据按授权关系访问，默认只展示汇总趋势。",
  "脱敏导出不包含姓名、联系方式或原始脑电数据。"
];

const ADMIN_ROUTE_VIEWS: AdminRouteView[] = [
  {
    path: "/admin/dashboard",
    kicker: "Organization Control Center",
    title: "机构概览",
    description:
      "统一查看成员、设备、权限和操作日志。页面仅展示运营与训练记录趋势，不输出诊断或效果承诺。",
    primaryActionLabel: "查看操作日志",
    primaryActionPath: "/admin/logs",
    metrics: [
      { label: "机构训练用户", value: "128", helper: "仅显示授权范围内账号数量" },
      { label: "治疗师账号", value: "18", helper: "含启用与待复核账号" },
      { label: "在线设备", value: "24", helper: "用于训练前连接状态观察" },
      { label: "本周脱敏导出", value: "6", helper: "所有导出均写入操作日志" }
    ],
    boundaryItems: COMMON_BOUNDARY_ITEMS,
    taskTitle: "待处理事项",
    tasks: [
      "复核新治疗师账号邀请码",
      "查看本周数据导出操作日志",
      "确认设备连接异常的机构分布",
      "检查未完成知情同意更新的账号"
    ]
  },
  {
    path: "/admin/therapists",
    kicker: "Therapist Accounts",
    title: "治疗师管理",
    description: "管理机构治疗师账号、邀请状态和工作区启用情况，所有变更写入操作日志。",
    primaryActionLabel: "查看权限设置",
    primaryActionPath: "/admin/permissions",
    metrics: [
      { label: "已启用账号", value: "16", helper: "可进入治疗师工作台" },
      { label: "待复核邀请", value: "2", helper: "需要管理员确认机构归属" },
      { label: "本周处方更新", value: "31", helper: "仅为训练配置记录" },
      { label: "绑定训练用户", value: "94", helper: "按授权关系统计" }
    ],
    boundaryItems: COMMON_BOUNDARY_ITEMS,
    taskTitle: "账号复核",
    tasks: ["复核治疗师邀请码", "检查停用账号的数据访问范围", "同步机构角色说明"]
  },
  {
    path: "/admin/users",
    kicker: "Authorized Users",
    title: "用户管理",
    description: "查看机构授权训练用户的建档状态、知情同意状态和训练记录汇总。",
    primaryActionLabel: "查看数据统计",
    primaryActionPath: "/admin/statistics",
    metrics: [
      { label: "授权用户", value: "128", helper: "包含训练用户与家长账号" },
      { label: "待完善建档", value: "9", helper: "缺少非敏感训练信息" },
      { label: "同意版本待更新", value: "5", helper: "需要重新确认协议版本" },
      { label: "本周活跃用户", value: "73", helper: "按训练记录汇总" }
    ],
    boundaryItems: COMMON_BOUNDARY_ITEMS,
    taskTitle: "用户数据维护",
    tasks: ["提醒治疗师复核建档完整性", "查看待更新知情同意记录", "归档长期未使用账号"]
  },
  {
    path: "/admin/devices",
    kicker: "Device Operations",
    title: "设备管理",
    description: "查看机构 EEG 设备连接状态、最近同步时间和训练前检查提醒。",
    primaryActionLabel: "查看机构概览",
    primaryActionPath: "/admin/dashboard",
    metrics: [
      { label: "在线设备", value: "24", helper: "当前可用于训练前检查" },
      { label: "信号不稳定提醒", value: "4", helper: "提示调整佩戴或连接" },
      { label: "待维护设备", value: "2", helper: "按设备状态标记" },
      { label: "今日连接会话", value: "41", helper: "按训练会话汇总" }
    ],
    boundaryItems: COMMON_BOUNDARY_ITEMS,
    taskTitle: "设备提醒",
    tasks: ["检查信号不稳定设备", "确认设备型号登记信息", "复核断线重连记录"]
  },
  {
    path: "/admin/statistics",
    kicker: "De-identified Statistics",
    title: "数据统计",
    description: "展示脱敏后的训练次数、完成率、模块使用和设备状态趋势。",
    primaryActionLabel: "查看导出日志",
    primaryActionPath: "/admin/logs",
    metrics: [
      { label: "本周训练次数", value: "286", helper: "按完成记录汇总" },
      { label: "平均完成率", value: "82%", helper: "用于运营趋势观察" },
      { label: "音乐疗愈使用", value: "96", helper: "按标签汇总" },
      { label: "脱敏导出", value: "6", helper: "不包含身份信息" }
    ],
    boundaryItems: COMMON_BOUNDARY_ITEMS,
    taskTitle: "统计复核",
    tasks: ["检查导出范围是否为摘要特征", "复核周报生成记录", "查看异常暂停趋势"]
  },
  {
    path: "/admin/logs",
    kicker: "Audit Trail",
    title: "操作日志",
    description: "查询登录、查看用户详情、修改处方、导出数据、生成报告和权限变更记录。",
    primaryActionLabel: "查看权限设置",
    primaryActionPath: "/admin/permissions",
    metrics: [
      { label: "今日日志", value: "142", helper: "包含系统与人工操作" },
      { label: "权限变更", value: "3", helper: "需要管理员复核" },
      { label: "数据导出", value: "1", helper: "已记录操作者与时间" },
      { label: "异常暂停记录", value: "4", helper: "仅用于训练安全追踪" }
    ],
    boundaryItems: COMMON_BOUNDARY_ITEMS,
    taskTitle: "日志检查",
    tasks: ["按时间筛选数据导出记录", "复核权限变更操作者", "检查异常暂停通知链路"]
  },
  {
    path: "/admin/permissions",
    kicker: "Role Permission",
    title: "权限设置",
    description: "维护机构管理员、治疗师、家长和训练用户的可访问菜单与数据范围。",
    primaryActionLabel: "查看治疗师管理",
    primaryActionPath: "/admin/therapists",
    metrics: [
      { label: "角色模板", value: "5", helper: "对应当前系统身份" },
      { label: "待复核变更", value: "3", helper: "权限变更需留痕" },
      { label: "机构管理员", value: "4", helper: "仅管理所属机构" },
      { label: "授权关系", value: "94", helper: "治疗师与训练用户绑定" }
    ],
    boundaryItems: COMMON_BOUNDARY_ITEMS,
    taskTitle: "权限维护",
    tasks: ["确认新增治疗师的数据范围", "复核管理员权限变更", "检查无授权菜单是否隐藏"]
  }
];

export function App(): JSX.Element {
  const [authResult, setAuthResult] = useState<UnifiedAuthResult | null>(() =>
    loadUnifiedAuthSession()
  );
  const [activePath, setActivePath] = useState(() =>
    typeof window === "undefined" ? "/admin/dashboard" : window.location.pathname
  );
  const [operationLogSummary, setOperationLogSummary] = useState<AdminOperationLogSummary | null>(
    null
  );
  const normalizedAdminPath = activePath.startsWith("/admin") ? activePath : "/admin/dashboard";
  const baseRouteView = resolveAdminRouteView(normalizedAdminPath);
  const routeView = useMemo(
    () => applyOperationLogSummaryToAdminRouteView(baseRouteView, operationLogSummary),
    [baseRouteView, operationLogSummary]
  );
  const operationLogApiSession = useMemo(
    () => buildAdminOperationLogApiSession(authResult),
    [authResult]
  );

  useEffect(() => {
    let isCancelled = false;

    if (normalizedAdminPath !== "/admin/logs" || operationLogApiSession === null) {
      if (normalizedAdminPath !== "/admin/logs") {
        setOperationLogSummary(null);
      }
      return () => {
        isCancelled = true;
      };
    }

    fetchAdminOperationLogSummary(operationLogApiSession)
      .then((summary) => {
        if (!isCancelled) {
          setOperationLogSummary(summary);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setOperationLogSummary(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [normalizedAdminPath, operationLogApiSession]);

  const handleAuthenticated = (result: UnifiedAuthResult) => {
    saveUnifiedAuthSession(result);
    setAuthResult(result);
    setActivePath(result.dashboardPath);
  };

  const handleLogout = () => {
    revokeApiSession(authResult);
    clearUnifiedAuthSession();
    navigateWithinCurrentApp("/");
    setActivePath("/");
    setAuthResult(null);
  };

  const handleNavigate = (path: string) => {
    navigateWithinCurrentApp(path);
    setActivePath(path);
  };

  if (authResult === null) {
    return (
      <UnifiedAuthPortal
        authClient={AUTH_API_CLIENTS?.authClient}
        initialRole="org_admin"
        navigate={navigateWithinCurrentApp}
        onAuthenticated={handleAuthenticated}
        registerClient={AUTH_API_CLIENTS?.registerClient}
      />
    );
  }

  if (authResult.role !== "org_admin") {
    return (
      <AppShell
        activePath={authResult.dashboardPath}
        displayName={authResult.displayName}
        eegStatus={ADMIN_EEG_STATUS}
        notifications={ADMIN_NOTIFICATIONS}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        organizationName="认知康复演示中心"
        role={authResult.role}
        systemStatus={buildDemoSystemStatus(authResult)}
      >
        <PermissionDeniedState
          actionLabel="重新选择身份"
          message="当前账号不属于机构管理员角色。平台会保留身份边界，不展示机构管理数据。"
          onAction={handleLogout}
          roleLabel="当前身份"
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      activePath={normalizedAdminPath}
      displayName={authResult.displayName}
      eegStatus={ADMIN_EEG_STATUS}
      notifications={ADMIN_NOTIFICATIONS}
      onLogout={handleLogout}
      onNavigate={handleNavigate}
      organizationName="认知康复演示中心"
      role="org_admin"
      systemStatus={buildDemoSystemStatus(authResult)}
    >
      <main className="admin-shell">
        <section className="admin-dashboard" aria-labelledby="admin-dashboard-title">
          <SoftMotionWrapper>
            <NeuroGlassCard className="admin-hero" level="floating">
              <div>
                <div className="admin-hero__meta">
                  <p>{routeView.kicker}</p>
                  {isDemoAuthResult(authResult) ? (
                    <DemoModeBadge
                      description="当前页面使用演示数据，不代表真实训练记录。"
                      label="演示数据"
                    />
                  ) : null}
                </div>
                <h1 id="admin-dashboard-title">{routeView.title}</h1>
                <span>{routeView.description}</span>
              </div>
              <div className="admin-hero__actions">
                <SystemHealthIndicator items={buildAdminSystemHealth(routeView)} layout="stacked" />
                <NeuroButton onClick={() => handleNavigate(routeView.primaryActionPath)}>
                  {routeView.primaryActionLabel}
                </NeuroButton>
              </div>
            </NeuroGlassCard>
          </SoftMotionWrapper>

          <section className="admin-metric-grid" aria-label="机构运行摘要">
            {routeView.metrics.map((item, index) => (
              <SoftMotionWrapper delayMs={index * 60} key={item.label}>
                <MedicalMetricCard
                  helperText={item.helper}
                  label={item.label}
                  progress={resolveAdminMetricProgress(item.value, index)}
                  statusLabel="机构摘要"
                  tone={resolveAdminMetricTone(index)}
                  value={item.value}
                  variant={index === 0 ? "core" : "info"}
                />
              </SoftMotionWrapper>
            ))}
          </section>

          <div className="admin-content-grid">
            <NeuroGlassCard className="admin-panel" aria-labelledby="admin-permission-title">
              <div className="admin-panel__heading">
                <p>Access Boundary</p>
                <h2 id="admin-permission-title">权限与数据边界</h2>
              </div>
              <ul className="admin-check-list">
                {routeView.boundaryItems.map((item) => (
                  <li key={item}>
                    <PatientRiskBadge label="边界" severity="info" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </NeuroGlassCard>

            <MedicalChartContainer
              className="admin-chart-panel"
              eyebrow="Institution Monitor"
              helperText="仅展示机构运行与训练记录摘要趋势，用于管理复核和资源安排。"
              title="机构运行状态分布"
            >
              <StatusDistributionChart
                helperText="数据为脱敏汇总口径，不包含用户身份信息。"
                items={buildAdminStatusDistribution(routeView)}
                title="状态分布"
              />
            </MedicalChartContainer>

            <NeuroGlassCard
              className="admin-panel admin-review-panel"
              aria-labelledby="admin-task-title"
            >
              <div className="admin-panel__heading">
                <p>Today Review</p>
                <h2 id="admin-task-title">{routeView.taskTitle}</h2>
              </div>
              <div className="admin-task-list">
                {routeView.tasks.map((task, index) => (
                  <article key={task}>
                    <PatientRiskBadge
                      label={index === 0 ? "待复核" : "记录"}
                      severity={index === 0 ? "watch" : "info"}
                    />
                    <p>{task}</p>
                  </article>
                ))}
              </div>
            </NeuroGlassCard>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function createAuthApiClientsFromEnv() {
  const apiBaseUrl = getConfiguredApiBaseUrl(import.meta.env);
  return apiBaseUrl === null ? undefined : createUnifiedAuthApiClients({ apiBaseUrl });
}

function buildAdminOperationLogApiSession(
  authResult: UnifiedAuthResult | null
): AdminOperationLogApiSession | null {
  if (authResult?.apiSession === undefined || authResult.role !== "org_admin") {
    return null;
  }

  return {
    apiBaseUrl: authResult.apiSession.apiBaseUrl,
    accessToken: authResult.apiSession.accessToken,
    ...(authResult.principal.organizationId !== undefined
      ? { organizationId: authResult.principal.organizationId }
      : {})
  };
}

function applyOperationLogSummaryToAdminRouteView(
  routeView: AdminRouteView,
  summary: AdminOperationLogSummary | null
): AdminRouteView {
  if (summary === null || routeView.path !== "/admin/logs") {
    return routeView;
  }

  return {
    ...routeView,
    description: "已连接 API 操作日志，展示登录、权限变更、数据导出和异常暂停等机构审计摘要。",
    metrics: [
      {
        label: "日志总数",
        value: String(summary.totalLogs),
        helper: "来自 /operation-logs 授权查询"
      },
      {
        label: "权限变更",
        value: String(summary.permissionUpdateCount),
        helper: "当前返回范围内的权限操作"
      },
      {
        label: "数据导出",
        value: String(summary.dataExportCount),
        helper: "脱敏导出审计记录"
      },
      {
        label: "异常暂停记录",
        value: String(summary.abnormalPauseCount),
        helper: "训练安全事件审计"
      }
    ],
    tasks: summary.latestTasks
  };
}

function resolveAdminMetricTone(index: number): "clinical" | "monitoring" | "calm" | "warning" {
  const tones = ["clinical", "monitoring", "calm", "warning"] as const;
  return tones[index % tones.length] ?? "monitoring";
}

function resolveAdminMetricProgress(value: string, index: number): number {
  const numericValue = Number.parseInt(value.replace(/[^\d]/g, ""), 10);
  if (Number.isFinite(numericValue)) {
    if (value.includes("%")) {
      return Math.max(0, Math.min(100, numericValue));
    }

    return Math.max(28, Math.min(96, 42 + numericValue + index * 6));
  }

  return 56 + index * 8;
}

function buildAdminSystemHealth(routeView: AdminRouteView) {
  return [
    {
      id: "scope",
      label: "数据范围",
      value: "机构授权",
      status: "good" as const,
      helperText: "按角色与机构边界展示"
    },
    {
      id: "sync",
      label: "同步状态",
      value: "已同步",
      status: "good" as const,
      helperText: routeView.path.includes("logs") ? "日志索引可查询" : "摘要数据可用"
    },
    {
      id: "review",
      label: "复核状态",
      value: routeView.tasks.length > 2 ? "待处理" : "稳定",
      status: routeView.tasks.length > 2 ? ("warning" as const) : ("good" as const),
      helperText: "仅用于管理流程提醒"
    }
  ];
}

function buildAdminStatusDistribution(routeView: AdminRouteView) {
  const values = routeView.metrics
    .map((metric) => Number.parseInt(metric.value.replace(/[^\d]/g, ""), 10))
    .filter((value) => Number.isFinite(value));

  const [primary = 42, secondary = 24, tertiary = 16] = values;

  return [
    {
      label: "授权范围",
      value: Math.min(100, Math.max(18, primary)),
      tone: "medicalBlue" as const
    },
    {
      label: "今日复核",
      value: Math.min(100, Math.max(12, secondary)),
      tone: "cyanGreen" as const
    },
    { label: "温和提醒", value: Math.min(100, Math.max(8, tertiary)), tone: "softAmber" as const }
  ];
}

function resolveAdminRouteView(path: string): AdminRouteView {
  return (
    ADMIN_ROUTE_VIEWS.find((view) => path === view.path || path.startsWith(`${view.path}/`)) ??
    ADMIN_ROUTE_VIEWS[0]!
  );
}

function loadUnifiedAuthSession(): UnifiedAuthResult | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const demoSession = loadDemoAuthFromLocation(window.location.pathname, window.location.search);
    if (demoSession) {
      window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(demoSession));
      clearDemoHandoffFromCurrentUrl();
      return demoSession;
    }

    const rawSession = window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!rawSession) {
      return null;
    }

    const parsed = JSON.parse(rawSession) as Partial<UnifiedAuthResult>;
    if (
      isAuthPortalRole(parsed.role) &&
      typeof parsed.dashboardPath === "string" &&
      typeof parsed.displayName === "string" &&
      parsed.principal !== undefined
    ) {
      return parsed as UnifiedAuthResult;
    }
  } catch {
    window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  }

  return null;
}

function saveUnifiedAuthSession(result: UnifiedAuthResult): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(result));
}

function clearUnifiedAuthSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

function revokeApiSession(authResult: UnifiedAuthResult | null): void {
  if (authResult?.apiSession === undefined) {
    return;
  }

  void logoutUnifiedAuthApiSession({
    apiBaseUrl: authResult.apiSession.apiBaseUrl,
    accessToken: authResult.apiSession.accessToken,
    refreshToken: authResult.apiSession.refreshToken
  }).catch(() => {
    // Do not block local session cleanup when the API is unavailable.
  });
}

function navigateWithinCurrentApp(path: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const target = resolveWorkspaceNavigationTarget(path, {
    baseUrls: getWorkspaceBaseUrls(),
    currentOrigin: window.location.origin
  });

  if (target.isExternalWorkspace) {
    window.location.assign(target.href);
    return;
  }

  window.history.pushState({}, "", target.href);
}

function getWorkspaceBaseUrls(): WorkspaceBaseUrls {
  const currentOrigin = typeof window === "undefined" ? "" : window.location.origin;
  const defaults = createLocalWorkspaceBaseUrls({
    org_admin: currentOrigin
  });

  return {
    trainee: import.meta.env.VITE_TRAINEE_WEB_URL ?? defaults.trainee,
    parent:
      import.meta.env.VITE_PARENT_WEB_URL ??
      import.meta.env.VITE_TRAINEE_WEB_URL ??
      defaults.parent,
    therapist: import.meta.env.VITE_THERAPIST_WEB_URL ?? defaults.therapist,
    org_admin: import.meta.env.VITE_ADMIN_WEB_URL ?? defaults.org_admin
  };
}
