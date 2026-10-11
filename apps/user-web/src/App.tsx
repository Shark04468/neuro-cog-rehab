import { useEffect, useMemo, useState } from "react";
import {
  AppShell,
  buildDemoSystemStatus,
  clearDemoHandoffFromCurrentUrl,
  createUnifiedAuthApiClients,
  createLocalWorkspaceBaseUrls,
  getConfiguredApiBaseUrl,
  GoNoGoGame,
  isAuthPortalRole,
  loadDemoAuthFromLocation,
  logoutUnifiedAuthApiSession,
  mockMusicTracks,
  MusicTherapyTrainingPage,
  PermissionDeniedState,
  resolveWorkspaceNavigationTarget,
  RhythmNavigationGame,
  StopSignalTask,
  SustainedAttentionTask,
  TargetDetectionGame,
  UnifiedAuthPortal,
  type AppShellEEGStatus,
  type AppShellNotification,
  type WorkspaceBaseUrls,
  type UnifiedAuthResult
} from "@neuro-cog-rehab/ui-components";

import { buildUserHomeViewModel, type TherapistHomeConfig } from "./home-model.js";
import {
  canEnterTrainingWithConsent,
  type InformedConsentRecord
} from "./informed-consent-model.js";
import {
  loadInformedConsentRecord,
  saveInformedConsentRecord
} from "./informed-consent-storage.js";
import { InformedConsentPage } from "./InformedConsentPage.js";
import { ParentTrainingBriefPage } from "./ParentTrainingBriefPage.js";
import {
  buildHomeConfigFromPrescription,
  mockActiveTrainingPrescriptionForHome,
  type PrescriptionHomeBaseState
} from "./prescription-home-config.js";
import { SessionTrainingFlowPage } from "./SessionTrainingFlowPage.js";
import type { TherapistSessionFlowConfig } from "./session-flow-model.js";
import { TraineeDashboard } from "./TraineeDashboard.js";
import { mockTraineeDashboardData } from "./trainee-dashboard-mock.js";
import { fetchDashboardDataWithTrainingHistory } from "./training-history-api-client.js";
import {
  saveTrainingRecordDraftToApi,
  type TrainingRecordApiSession
} from "./training-record-api-client.js";
import type { TrainingRecordSaveDraft } from "./training-feedback-model.js";
import {
  ParentAdvicePage,
  ParentRecordsPage,
  ParentRiskPage,
  ParentSettingsPage,
  TraineeDevicePage,
  TraineeSettingsPage
} from "./UserAuxiliaryPages.js";

const therapistHomeBaseState: PrescriptionHomeBaseState = {
  completedTodayMinutes: 8,
  restAfterMinutes: 12,
  deviceStatus: {
    connectionStatus: "connected",
    signalQuality: "good",
    attentionScore: 68,
    relaxationScore: 54,
    fatigueTrendLabel: "平稳",
    latencyMs: 420
  },
  lastTrainingSummary: {
    moduleName: "Go/No-Go 点击反应练习",
    completedAtLabel: "昨天 18:20",
    summary: "上次练习完成度良好，绿色目标点击更稳定，红色目标误点次数有所减少。",
    nextSuggestion: "今天先从标准难度开始，注意每次点击前看清颜色提示。"
  }
};

const therapistConfiguredHome: TherapistHomeConfig = buildHomeConfigFromPrescription({
  prescription: mockActiveTrainingPrescriptionForHome,
  baseState: therapistHomeBaseState
});

const therapistSessionFlowConfig: TherapistSessionFlowConfig = {
  sessionId: "single-session-demo-001",
  userId: "trainee-demo-001",
  traineeDisplayName: therapistConfiguredHome.traineeDisplayName,
  therapistName: "陈老师",
  skippedStageIds: [],
  dailyTrainingLimitMinutes: therapistConfiguredHome.dailyTrainingLimitMinutes,
  recommendedMusicTitle: therapistConfiguredHome.recommendedMusic.title
};

const AUTH_SESSION_STORAGE_KEY = "ncr-unified-auth-session";
const AUTH_API_CLIENTS = createAuthApiClientsFromEnv();

type UserActiveView =
  | "home"
  | "session_flow"
  | "parent_brief"
  | "parent_records"
  | "parent_advice"
  | "parent_risk"
  | "parent_settings"
  | "informed_consent"
  | "trainee_device"
  | "trainee_settings"
  | "music_therapy"
  | "attention_training"
  | "sustained_attention"
  | "go_nogo_training"
  | "stop_signal"
  | "rhythm_navigation";

const USER_APP_SHELL_EEG_STATUS: AppShellEEGStatus = {
  connectionStatus: "connected",
  signalQuality: "good",
  attentionScore: 68,
  relaxationScore: 54,
  fatigueScore: 32,
  latencyMs: 420,
  statusText: "EEG 已连接"
};

const USER_APP_SHELL_NOTIFICATIONS: AppShellNotification[] = [
  {
    id: "rest-reminder",
    title: "训练节奏提醒",
    message: "今日任务由治疗师配置，训练中可随时暂停休息。",
    level: "info",
    createdAtLabel: "今天"
  }
];

export function App() {
  const [authResult, setAuthResult] = useState<UnifiedAuthResult | null>(() =>
    loadUnifiedAuthSession()
  );
  const [activeView, setActiveView] = useState<UserActiveView>(() =>
    resolveInitialUserView(window.location.pathname)
  );
  const [consentRecord, setConsentRecord] = useState<InformedConsentRecord | null>(() =>
    loadInformedConsentRecord(therapistSessionFlowConfig.userId)
  );
  const [dashboardData, setDashboardData] = useState(mockTraineeDashboardData);
  const home = useMemo(() => buildUserHomeViewModel(therapistConfiguredHome), []);
  const handleAuthenticated = (result: UnifiedAuthResult) => {
    saveUnifiedAuthSession(result);
    setAuthResult(result);
    setActiveView(result.role === "parent" ? "parent_brief" : "home");
  };
  const handleLogout = () => {
    revokeApiSession(authResult);
    clearUnifiedAuthSession();
    navigateWithinCurrentApp("/");
    setAuthResult(null);
    setActiveView("home");
  };
  const handleStartTraining = () => {
    if (canEnterTrainingWithConsent(consentRecord, therapistSessionFlowConfig.userId)) {
      setActiveView("session_flow");
      return;
    }

    setActiveView("informed_consent");
  };
  const handleShellNavigate = (path: string) => {
    navigateWithinCurrentApp(path);

    const auxiliaryView = resolveAuxiliaryViewFromPath(path);
    if (auxiliaryView) {
      setActiveView(auxiliaryView);
      return;
    }

    const trainingView = resolveTrainingViewFromPath(path);
    if (trainingView) {
      if (!canEnterTrainingWithConsent(consentRecord, therapistSessionFlowConfig.userId)) {
        setActiveView("informed_consent");
        return;
      }

      setActiveView(trainingView);
      return;
    }

    if (path.startsWith("/parent")) {
      setActiveView("parent_brief");
      return;
    }

    if (path === "/trainee/reports") {
      setActiveView("parent_brief");
      return;
    }

    setActiveView("home");
  };
  const trainingRecordApiSession = useMemo(
    () => buildTrainingRecordApiSession(authResult),
    [authResult]
  );
  useEffect(() => {
    let isCancelled = false;

    if (trainingRecordApiSession === null) {
      setDashboardData(mockTraineeDashboardData);
      return () => {
        isCancelled = true;
      };
    }

    fetchDashboardDataWithTrainingHistory(mockTraineeDashboardData, trainingRecordApiSession)
      .then((nextDashboardData) => {
        if (!isCancelled) {
          setDashboardData(nextDashboardData);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setDashboardData(mockTraineeDashboardData);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [trainingRecordApiSession]);
  const handleSaveTrainingRecord =
    trainingRecordApiSession === null
      ? undefined
      : async (draft: TrainingRecordSaveDraft) => {
          const result = await saveTrainingRecordDraftToApi(draft, trainingRecordApiSession);
          return {
            provider: result.provider,
            recordId: result.recordId,
            savedAt: result.createdAt
          };
        };
  const renderTrainingView = (activePath: string, content: JSX.Element) =>
    renderWithShell(activePath, content, { isTrainingActive: true });
  const renderWithShell = (
    activePath: string,
    content: JSX.Element,
    options: { isTrainingActive?: boolean } = {}
  ) => {
    if (authResult === null) {
      return content;
    }

    return (
      <AppShell
        activePath={activePath}
        displayName={authResult.displayName}
        eegStatus={USER_APP_SHELL_EEG_STATUS}
        notifications={USER_APP_SHELL_NOTIFICATIONS}
        onLogout={handleLogout}
        onNavigate={handleShellNavigate}
        organizationName="认知康复演示中心"
        role={authResult.role}
        systemStatus={buildDemoSystemStatus(authResult)}
        isTrainingActive={options.isTrainingActive ?? false}
      >
        {content}
      </AppShell>
    );
  };

  if (authResult === null) {
    return (
      <UnifiedAuthPortal
        authClient={AUTH_API_CLIENTS?.authClient}
        registerClient={AUTH_API_CLIENTS?.registerClient}
        navigate={navigateWithinCurrentApp}
        onAuthenticated={(result) => handleAuthenticated(result)}
      />
    );
  }

  if (authResult.role === "therapist" || authResult.role === "org_admin") {
    return <RoleSpaceNotice authResult={authResult} onLogout={handleLogout} />;
  }

  if (activeView === "session_flow") {
    return renderWithShell(
      "/trainee/dashboard",
      <SessionTrainingFlowPage
        config={therapistSessionFlowConfig}
        onBackToHome={() => setActiveView("home")}
        onSaveTrainingRecord={handleSaveTrainingRecord}
      />,
      { isTrainingActive: true }
    );
  }

  if (activeView === "music_therapy") {
    return renderTrainingView(
      "/trainee/music",
      <MusicTherapyTrainingPage
        userId={therapistSessionFlowConfig.userId}
        trainingSessionId={`${therapistSessionFlowConfig.sessionId}-music`}
        tracks={mockMusicTracks}
      />
    );
  }

  if (activeView === "attention_training") {
    return renderTrainingView(
      "/trainee/attention",
      <TargetDetectionGame
        userId={therapistSessionFlowConfig.userId}
        sessionId={`${therapistSessionFlowConfig.sessionId}-attention`}
      />
    );
  }

  if (activeView === "sustained_attention") {
    return renderTrainingView(
      "/trainee/attention/sustained",
      <SustainedAttentionTask
        userId={therapistSessionFlowConfig.userId}
        sessionId={`${therapistSessionFlowConfig.sessionId}-sustained`}
      />
    );
  }

  if (activeView === "go_nogo_training") {
    return renderTrainingView(
      "/trainee/reaction",
      <GoNoGoGame
        userId={therapistSessionFlowConfig.userId}
        sessionId={`${therapistSessionFlowConfig.sessionId}-go-nogo`}
      />
    );
  }

  if (activeView === "stop_signal") {
    return renderTrainingView(
      "/trainee/reaction/stop-signal",
      <StopSignalTask
        userId={therapistSessionFlowConfig.userId}
        sessionId={`${therapistSessionFlowConfig.sessionId}-stop-signal`}
      />
    );
  }

  if (activeView === "rhythm_navigation") {
    return renderTrainingView(
      "/trainee/rhythm",
      <RhythmNavigationGame
        userId={therapistSessionFlowConfig.userId}
        sessionId={`${therapistSessionFlowConfig.sessionId}-rhythm`}
      />
    );
  }

  if (activeView === "parent_brief") {
    return renderWithShell(
      authResult.role === "parent" ? "/parent/weekly-brief" : "/trainee/reports",
      <ParentTrainingBriefPage onBackToHome={() => setActiveView("home")} />
    );
  }

  if (activeView === "parent_records") {
    return renderWithShell(
      "/parent/records",
      <ParentRecordsPage
        data={dashboardData}
        onBackToDashboard={() => setActiveView("parent_brief")}
      />
    );
  }

  if (activeView === "parent_advice") {
    return renderWithShell(
      "/parent/advice",
      <ParentAdvicePage
        data={dashboardData}
        onBackToDashboard={() => setActiveView("parent_brief")}
      />
    );
  }

  if (activeView === "parent_risk") {
    return renderWithShell(
      "/parent/risk",
      <ParentRiskPage
        data={dashboardData}
        onBackToDashboard={() => setActiveView("parent_brief")}
      />
    );
  }

  if (activeView === "parent_settings") {
    return renderWithShell(
      "/parent/settings",
      <ParentSettingsPage
        data={dashboardData}
        onBackToDashboard={() => setActiveView("parent_brief")}
      />
    );
  }

  if (activeView === "informed_consent") {
    return renderWithShell(
      "/trainee/settings",
      <InformedConsentPage
        existingRecord={consentRecord}
        userId={therapistSessionFlowConfig.userId}
        onBackToHome={() => setActiveView("home")}
        onConsentSaved={(record) => {
          const saveResult = saveInformedConsentRecord(record);
          if (!saveResult.saved) {
            throw new Error(saveResult.message ?? "Consent record could not be saved.");
          }

          setConsentRecord(record);
          setActiveView("session_flow");
        }}
      />
    );
  }

  if (activeView === "trainee_device") {
    return renderWithShell(
      "/trainee/device",
      <TraineeDevicePage data={dashboardData} onBackToDashboard={() => setActiveView("home")} />
    );
  }

  if (activeView === "trainee_settings") {
    return renderWithShell(
      "/trainee/settings",
      <TraineeSettingsPage
        data={dashboardData}
        onBackToDashboard={() => setActiveView("home")}
        onOpenConsent={() => setActiveView("informed_consent")}
      />
    );
  }

  if (activeView === "home") {
    return renderWithShell(
      authResult.role === "parent" ? "/parent/dashboard" : "/trainee/dashboard",
      <TraineeDashboard data={dashboardData} onStartTraining={handleStartTraining} />
    );
  }

  return renderWithShell(
    authResult.role === "parent" ? "/parent/dashboard" : "/trainee/dashboard",
    <main className="app-shell">
      <section className="home-band" aria-labelledby="home-title">
        <div className="home-inner">
          <header className="home-header">
            <div>
              <p className="home-kicker">训练用户端</p>
              <h1 id="home-title">{home.greeting}</h1>
              <p className="home-subtitle">
                今日任务由治疗师配置，训练中请保持舒适节奏，随时可以休息。
              </p>
            </div>
            <div className="home-time-box" aria-label="训练时长提醒">
              <span>今日提醒</span>
              <strong>{home.remainingTodayMinutes} 分钟可用</strong>
              <p>{home.trainingTimeReminder}</p>
            </div>
          </header>

          <div className="home-layout">
            <section className="home-section home-section--tasks" aria-labelledby="today-tasks">
              <div className="section-heading">
                <div>
                  <p>今日训练任务</p>
                  <h2 id="today-tasks">按顺序完成，不需要赶时间</h2>
                </div>
                <span>{home.totalPlannedMinutes} 分钟计划</span>
              </div>

              <div className="task-list">
                {home.todayTasks.map((task, index) => (
                  <article className="task-card" key={task.id}>
                    <div className="task-card__index">{index + 1}</div>
                    <div className="task-card__content">
                      <div className="task-card__topline">
                        <span>{task.badgeLabel}</span>
                        <strong>{task.durationMinutes} 分钟</strong>
                      </div>
                      <h3>{task.title}</h3>
                      <p>{task.focusArea}</p>
                      <small>治疗师提示：{task.therapistNote}</small>
                    </div>
                    <div className="task-card__level">{task.difficultyLabel}</div>
                  </article>
                ))}
              </div>

              <button
                className="primary-action"
                type="button"
                disabled={!home.canStartTraining || home.primaryTask === null}
                onClick={handleStartTraining}
              >
                开始训练
              </button>
              <button
                className="secondary-action home-brief-action"
                type="button"
                onClick={() => setActiveView("parent_brief")}
              >
                查看家长训练简报
              </button>
            </section>

            <aside className="home-side" aria-label="今日状态概览">
              <section className="status-panel" aria-labelledby="device-status">
                <div className="section-heading section-heading--small">
                  <div>
                    <p>EEG 设备连接状态</p>
                    <h2 id="device-status">头戴设备状态</h2>
                  </div>
                  <span
                    className="status-pill"
                    data-status={home.canStartTraining ? "ready" : "wait"}
                  >
                    {home.deviceLabel}
                  </span>
                </div>

                <div className="metric-grid">
                  <MetricTile label="信号" value={home.signalLabel} />
                  <MetricTile
                    label="注意指数"
                    value={formatScore(therapistConfiguredHome.deviceStatus.attentionScore)}
                  />
                  <MetricTile
                    label="放松指数"
                    value={formatScore(therapistConfiguredHome.deviceStatus.relaxationScore)}
                  />
                  <MetricTile
                    label="疲劳趋势"
                    value={therapistConfiguredHome.deviceStatus.fatigueTrendLabel}
                  />
                </div>
                <p className="soft-note">{home.latencyLabel}。如信号不稳定，请先调整佩戴再开始。</p>
              </section>

              <section className="info-panel" aria-labelledby="last-training">
                <p>上次训练简要反馈</p>
                <h2 id="last-training">{therapistConfiguredHome.lastTrainingSummary.moduleName}</h2>
                <span>{therapistConfiguredHome.lastTrainingSummary.completedAtLabel}</span>
                <p>{therapistConfiguredHome.lastTrainingSummary.summary}</p>
                <strong>{therapistConfiguredHome.lastTrainingSummary.nextSuggestion}</strong>
              </section>

              <section className="music-panel" aria-labelledby="music-title">
                <p>今日推荐音乐</p>
                <h2 id="music-title">{therapistConfiguredHome.recommendedMusic.title}</h2>
                <div className="music-meta">
                  <span>{therapistConfiguredHome.recommendedMusic.durationMinutes} 分钟</span>
                  <span>{therapistConfiguredHome.recommendedMusic.intensityLabel}</span>
                </div>
                <p>{therapistConfiguredHome.recommendedMusic.scene}</p>
              </section>

              <section className="rest-panel" aria-labelledby="rest-tip">
                <p>休息提示</p>
                <h2 id="rest-tip">感觉累了就停一停</h2>
                <span>{home.restReminder}</span>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function createAuthApiClientsFromEnv() {
  const apiBaseUrl = getConfiguredApiBaseUrl(import.meta.env);
  return apiBaseUrl === null ? undefined : createUnifiedAuthApiClients({ apiBaseUrl });
}

function buildTrainingRecordApiSession(
  authResult: UnifiedAuthResult | null
): TrainingRecordApiSession | null {
  if (
    authResult?.apiSession === undefined ||
    (authResult.role !== "trainee" && authResult.role !== "parent") ||
    authResult.principal.userProfileId === undefined
  ) {
    return null;
  }

  return {
    apiBaseUrl: authResult.apiSession.apiBaseUrl,
    accessToken: authResult.apiSession.accessToken,
    userId: authResult.principal.userId,
    userProfileId: authResult.principal.userProfileId,
    ...(authResult.principal.organizationId !== undefined
      ? { organizationId: authResult.principal.organizationId }
      : {})
  };
}

function RoleSpaceNotice(props: { authResult: UnifiedAuthResult; onLogout: () => void }) {
  const [activePath, setActivePath] = useState(props.authResult.dashboardPath);
  const handleNoticeNavigate = (path: string) => {
    setActivePath(path);
    navigateWithinCurrentApp(path);
  };

  return (
    <AppShell
      activePath={activePath}
      displayName={props.authResult.displayName}
      eegStatus={USER_APP_SHELL_EEG_STATUS}
      notifications={USER_APP_SHELL_NOTIFICATIONS}
      onLogout={props.onLogout}
      onNavigate={handleNoticeNavigate}
      organizationName="认知康复演示中心"
      role={props.authResult.role}
      systemStatus={buildDemoSystemStatus(props.authResult)}
    >
      <PermissionDeniedState
        actionLabel="重新选择身份"
        message="当前前端空间用于训练用户和家长查看训练任务、简报与记录。治疗师和机构管理员请进入对应工作区，系统不会展示未授权训练数据。"
        onAction={props.onLogout}
        roleLabel={props.authResult.role === "therapist" ? "治疗师身份" : "机构管理员身份"}
      />
    </AppShell>
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
    // Local logout must still complete even when the API is temporarily unavailable.
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
    parent: currentOrigin,
    trainee: currentOrigin
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

function resolveInitialUserView(path: string): UserActiveView {
  const auxiliaryView = resolveAuxiliaryViewFromPath(path);
  if (auxiliaryView) {
    return auxiliaryView;
  }

  if (path.startsWith("/parent")) {
    return "parent_brief";
  }

  return resolveTrainingViewFromPath(path) ?? "home";
}

function resolveAuxiliaryViewFromPath(path: string): UserActiveView | null {
  switch (path) {
    case "/trainee/device":
      return "trainee_device";
    case "/trainee/settings":
      return "trainee_settings";
    case "/parent/records":
      return "parent_records";
    case "/parent/advice":
      return "parent_advice";
    case "/parent/risk":
      return "parent_risk";
    case "/parent/settings":
      return "parent_settings";
    default:
      return null;
  }
}

function resolveTrainingViewFromPath(path: string): UserActiveView | null {
  switch (path) {
    case "/trainee/session":
      return "session_flow";
    case "/trainee/music":
      return "music_therapy";
    case "/trainee/attention":
      return "attention_training";
    case "/trainee/attention/sustained":
    case "/trainee/sustained-attention":
      return "sustained_attention";
    case "/trainee/reaction":
      return "go_nogo_training";
    case "/trainee/reaction/stop-signal":
    case "/trainee/stop-signal":
      return "stop_signal";
    case "/trainee/rhythm":
      return "rhythm_navigation";
    default:
      return null;
  }
}

function MetricTile(props: { label: string; value: string }) {
  return (
    <div className="metric-tile">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function formatScore(value: number | null): string {
  return value === null ? "--" : `${Math.round(value)}`;
}
