import { useEffect, useMemo, useState } from "react";
import {
  AppShell,
  buildDemoSystemStatus,
  clearDemoHandoffFromCurrentUrl,
  createLocalWorkspaceBaseUrls,
  createUnifiedAuthApiClients,
  EmptyReportState,
  getConfiguredApiBaseUrl,
  isAuthPortalRole,
  isDemoAuthResult,
  loadDemoAuthFromLocation,
  logoutUnifiedAuthApiSession,
  MusicLibraryPage,
  PermissionDeniedState,
  mockMusicLibraryUsers,
  mockMusicTracks,
  mockTrainingData,
  resolveWorkspaceNavigationTarget,
  UnifiedAuthPortal,
  type AppShellEEGStatus,
  type AppShellNotification,
  type MusicLibrarySelectionState,
  type MusicLibraryUser,
  type MusicTrack,
  type UnifiedAuthResult,
  type WorkspaceBaseUrls
} from "@neuro-cog-rehab/ui-components";

import { TherapistPrescriptionEditorPage } from "./TherapistPrescriptionEditorPage.js";
import { TherapistDashboard } from "./TherapistDashboard.js";
import { TherapistUserDetailPage } from "./TherapistUserDetailPage.js";
import {
  listTherapistReports,
  readTherapistReport,
  type TherapistReportSummary
} from "./report-api-client.js";
import { mockTherapistDashboardSupplement } from "./therapist-dashboard-mock.js";
import { mockUserDetailRecords } from "./therapist-user-detail-mock.js";
import { mockTherapistPrincipal, mockTherapistWorkspaceUsers } from "./therapist-workspace-mock.js";
import {
  loadMusicTracks,
  readMusicSelection,
  saveMusicSelection,
  type MusicSelectionRecord
} from "./music-library-api-client.js";
import type {
  TherapistWorkspacePrincipal,
  TherapistWorkspaceUser
} from "./therapist-workspace-model.js";
import {
  loadTherapistUserDetailSnapshot,
  loadTherapistWorkspaceSnapshot
} from "./therapist-workspace-api-client.js";
import { saveTrainingPrescriptionToApi } from "./training-prescription-api-client.js";
import {
  applySavedPrescriptionToWorkspaceUsers,
  type SavedTrainingPrescription,
  type TrainingPrescriptionOperationLog,
  type TrainingPrescriptionSaveResult
} from "./training-prescription-editor-model.js";

type ActiveTherapistView =
  | { type: "workspace" }
  | { type: "users" }
  | { type: "user_detail"; userId: string }
  | { type: "prescription_editor"; userId: string }
  | { type: "live_monitoring" }
  | { type: "report_center" }
  | { type: "music_library" }
  | { type: "data_export" }
  | { type: "settings" };

const AUTH_SESSION_STORAGE_KEY = "ncr-therapist-unified-auth-session";
const AUTH_API_CLIENTS = createAuthApiClientsFromEnv();

const THERAPIST_APP_SHELL_EEG_STATUS: AppShellEEGStatus = {
  connectionStatus: "connected",
  signalQuality: "good",
  attentionScore: 72,
  relaxationScore: 48,
  fatigueScore: 28,
  latencyMs: 360,
  statusText: "监测入口可用"
};

const THERAPIST_APP_SHELL_NOTIFICATIONS: AppShellNotification[] = [
  {
    id: "today-review",
    title: "今日训练提醒",
    message: "有 2 条训练安全提示待查看，请在用户详情中复核趋势和记录。",
    level: "warning",
    createdAtLabel: "今天"
  },
  {
    id: "prescription-log",
    title: "处方变更记录",
    message: "训练处方编辑器会记录操作日志，便于后续追踪。",
    level: "info",
    createdAtLabel: "今天"
  }
];

export function App() {
  const [authResult, setAuthResult] = useState<UnifiedAuthResult | null>(() =>
    loadUnifiedAuthSession()
  );
  const [activeView, setActiveView] = useState<ActiveTherapistView>(() =>
    getInitialTherapistView()
  );
  const [workspaceUsers, setWorkspaceUsers] = useState(mockTherapistWorkspaceUsers);
  const [dashboardSupplement, setDashboardSupplement] = useState(mockTherapistDashboardSupplement);
  const [detailRecords, setDetailRecords] = useState(mockUserDetailRecords);
  const [workspaceApiState, setWorkspaceApiState] = useState<"idle" | "loading" | "error">("idle");
  const [workspaceApiError, setWorkspaceApiError] = useState<string | null>(null);
  const [savedPrescriptions, setSavedPrescriptions] = useState<SavedTrainingPrescription[]>([]);
  const [operationLogs, setOperationLogs] = useState<TrainingPrescriptionOperationLog[]>([]);
  const [apiReports, setApiReports] = useState<TherapistReportSummary[]>([]);
  const [selectedReport, setSelectedReport] = useState<TherapistReportSummary | null>(null);
  const [reportApiState, setReportApiState] = useState<"idle" | "loading" | "error">("idle");
  const [reportApiError, setReportApiError] = useState<string | null>(null);
  const [reportDetailState, setReportDetailState] = useState<"idle" | "loading" | "error">("idle");
  const [reportDetailError, setReportDetailError] = useState<string | null>(null);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>(mockMusicTracks);
  const [musicSelectionState, setMusicSelectionState] = useState<MusicLibrarySelectionState>({
    recommendedTrackIdsByUserId: {},
    disabledTrackIdsByUserId: {}
  });
  const [musicApiState, setMusicApiState] = useState<"idle" | "loading" | "error">("idle");
  const [musicApiError, setMusicApiError] = useState<string | null>(null);
  const therapistWorkspacePrincipal = useMemo(
    () => buildTherapistWorkspacePrincipal(authResult),
    [authResult]
  );
  const musicLibraryUsers = useMemo(
    () => buildMusicLibraryUsers(workspaceUsers),
    [workspaceUsers]
  );

  const handlePrescriptionSaved = (result: TrainingPrescriptionSaveResult) => {
    setSavedPrescriptions((current) => [
      result.prescription,
      ...current.filter((prescription) => prescription.userId !== result.prescription.userId)
    ]);
    setOperationLogs((current) => [result.operationLog, ...current]);
    setWorkspaceUsers((current) =>
      applySavedPrescriptionToWorkspaceUsers(current, result.prescription)
    );
    persistPrescriptionToApi(result);
  };
  const handleReportDetailOpen = (reportId: string) => {
    const apiSession = authResult?.apiSession;
    if (apiSession === undefined) {
      setSelectedReport(apiReports.find((report) => report.id === reportId) ?? null);
      return;
    }

    setReportDetailState("loading");
    setReportDetailError(null);
    void readTherapistReport({
      reportId,
      session: {
        apiBaseUrl: apiSession.apiBaseUrl,
        accessToken: apiSession.accessToken
      }
    })
      .then((report) => {
        setSelectedReport(report);
        setReportDetailState("idle");
      })
      .catch((error) => {
        setReportDetailState("error");
        setReportDetailError(
          error instanceof Error ? error.message : "Report detail API temporarily unavailable."
        );
      });
  };
  const handleLogout = () => {
    revokeApiSession(authResult);
    clearUnifiedAuthSession();
    navigateWithinCurrentApp("/");
    setAuthResult(null);
    setActiveView({ type: "workspace" });
  };
  const handleAuthPortalNavigate = (path: string) => {
    const targetPath = resolveTherapistAuthTarget(path);
    navigateWithinCurrentApp(targetPath);
    setActiveView(getTherapistViewFromPath(targetPath));
  };
  const handleAuthenticated = (result: UnifiedAuthResult) => {
    const targetPath = resolveTherapistAuthTarget(result.dashboardPath);
    saveUnifiedAuthSession(result);
    setAuthResult(result);
    setActiveView(getTherapistViewFromPath(targetPath));
  };
  const handleMusicSelectionChange = (nextState: MusicLibrarySelectionState) => {
    setMusicSelectionState(nextState);
    const apiSession = authResult?.apiSession;
    if (apiSession === undefined) {
      return;
    }
    const session = {
      apiBaseUrl: apiSession.apiBaseUrl,
      accessToken: apiSession.accessToken
    };
    for (const user of workspaceUsers) {
      const hasSelection =
        nextState.recommendedTrackIdsByUserId[user.id] !== undefined ||
        nextState.disabledTrackIdsByUserId[user.id] !== undefined;
      if (!hasSelection) {
        continue;
      }
      void saveMusicSelection({
        session,
        userId: user.id,
        userProfileId: user.userProfileId,
        organizationId: user.organizationId,
        state: nextState
      }).catch((error) => {
        console.warn(
          error instanceof Error ? error.message : "Music library selection API synchronization failed."
        );
      });
    }
  };
  const handleShellNavigate = (path: string) => {
    navigateWithinCurrentApp(path);

    if (path === "/therapist/users") {
      setActiveView({ type: "users" });
      return;
    }

    if (path === "/therapist/prescriptions") {
      const firstAccessibleUser = workspaceUsers.find((user) =>
        canOpenPrescriptionFromSidebar(therapistWorkspacePrincipal, user)
      );
      if (firstAccessibleUser) {
        setActiveView({ type: "prescription_editor", userId: firstAccessibleUser.id });
        return;
      }
    }

    if (path === "/therapist/live-monitoring") {
      setActiveView({ type: "live_monitoring" });
      return;
    }

    if (path === "/therapist/reports") {
      setActiveView({ type: "report_center" });
      return;
    }

    if (path === "/therapist/music-library") {
      setActiveView({ type: "music_library" });
      return;
    }

    if (path === "/therapist/data-export") {
      setActiveView({ type: "data_export" });
      return;
    }

    if (path === "/therapist/settings") {
      setActiveView({ type: "settings" });
      return;
    }

    setActiveView({ type: "workspace" });
  };
  const activeUserDetailId = activeView.type === "user_detail" ? activeView.userId : null;

  useEffect(() => {
    const apiSession = authResult?.apiSession;
    if (apiSession === undefined) {
      return;
    }

    let cancelled = false;
    setWorkspaceApiState("loading");
    setWorkspaceApiError(null);
    void loadTherapistWorkspaceSnapshot({
      session: {
        apiBaseUrl: apiSession.apiBaseUrl,
        accessToken: apiSession.accessToken
      }
    })
      .then((snapshot) => {
        if (cancelled) {
          return;
        }
        setWorkspaceUsers(snapshot.users);
        setDashboardSupplement(snapshot.dashboardSupplement);
        setDetailRecords(snapshot.detailRecords);
        setWorkspaceApiState("idle");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setWorkspaceApiState("error");
        setWorkspaceApiError(
          error instanceof Error
            ? error.message
            : "Therapist workspace API temporarily unavailable."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [authResult?.apiSession?.accessToken, authResult?.apiSession?.apiBaseUrl]);

  useEffect(() => {
    const apiSession = authResult?.apiSession;
    if (apiSession === undefined || activeUserDetailId === null) {
      return;
    }

    let cancelled = false;
    void loadTherapistUserDetailSnapshot({
      userId: activeUserDetailId,
      session: {
        apiBaseUrl: apiSession.apiBaseUrl,
        accessToken: apiSession.accessToken
      }
    })
      .then((snapshot) => {
        if (cancelled) {
          return;
        }
        setWorkspaceUsers((current) => [
          snapshot.user,
          ...current.filter((user) => user.id !== snapshot.user.id)
        ]);
        setDetailRecords((current) => [
          snapshot.detailRecord,
          ...current.filter((record) => record.userId !== snapshot.detailRecord.userId)
        ]);
      })
      .catch((error) => {
        console.warn(
          error instanceof Error
            ? error.message
            : "Therapist user detail API synchronization failed."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [activeUserDetailId, authResult?.apiSession?.accessToken, authResult?.apiSession?.apiBaseUrl]);

  useEffect(() => {
    if (activeView.type !== "report_center" || authResult?.apiSession === undefined) {
      return;
    }

    let cancelled = false;
    setReportApiState("loading");
    setReportApiError(null);
    void listTherapistReports({
      session: {
        apiBaseUrl: authResult.apiSession.apiBaseUrl,
        accessToken: authResult.apiSession.accessToken
      }
    })
      .then((result) => {
        if (cancelled) {
          return;
        }
        setApiReports(result.reports);
        setSelectedReport((current) =>
          current === null
            ? null
            : (result.reports.find((report) => report.id === current.id) ?? current)
        );
        setReportApiState("idle");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setReportApiState("error");
        setReportApiError(
          error instanceof Error ? error.message : "Report API temporarily unavailable."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [activeView.type, authResult?.apiSession]);

  useEffect(() => {
    const apiSession = authResult?.apiSession;
    if (activeView.type !== "music_library" || apiSession === undefined) {
      return;
    }

    let cancelled = false;
    setMusicApiState("loading");
    setMusicApiError(null);
    const session = {
      apiBaseUrl: apiSession.apiBaseUrl,
      accessToken: apiSession.accessToken
    };

    void Promise.all([
      loadMusicTracks({ session }),
      Promise.all(
        workspaceUsers.map((user) =>
          readMusicSelection({
            session,
            userId: user.id,
            userProfileId: user.userProfileId,
            organizationId: user.organizationId
          })
        )
      )
    ])
      .then(([trackResult, selections]) => {
        if (cancelled) {
          return;
        }
        setMusicTracks(trackResult.tracks);
        setMusicSelectionState(buildMusicSelectionState(selections));
        setMusicApiState("idle");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setMusicApiState("error");
        setMusicApiError(
          error instanceof Error ? error.message : "Music library API temporarily unavailable."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [activeView.type, authResult?.apiSession, workspaceUsers]);

  if (authResult === null) {
    return (
      <UnifiedAuthPortal
        authClient={AUTH_API_CLIENTS?.authClient}
        initialRole="therapist"
        navigate={handleAuthPortalNavigate}
        onAuthenticated={handleAuthenticated}
        registerClient={AUTH_API_CLIENTS?.registerClient}
      />
    );
  }

  if (authResult.role !== "therapist") {
    return <TherapistRoleNotice authResult={authResult} onLogout={handleLogout} />;
  }

  return (
    <AppShell
      activePath={getTherapistShellPath(activeView)}
      displayName={authResult.displayName}
      eegStatus={THERAPIST_APP_SHELL_EEG_STATUS}
      notifications={THERAPIST_APP_SHELL_NOTIFICATIONS}
      onLogout={handleLogout}
      onNavigate={handleShellNavigate}
      organizationName="认知康复演示中心"
      role="therapist"
      systemStatus={buildDemoSystemStatus(authResult)}
    >
      <main className="therapist-shell">
        <section className="therapist-band">
          <div className="therapist-inner">
            {workspaceApiState === "loading" ? (
              <div className="ncr-workspace-api-notice" role="status">
                正在读取授权训练用户与趋势摘要...
              </div>
            ) : workspaceApiState === "error" ? (
              <div
                className="ncr-workspace-api-notice ncr-workspace-api-notice--warning"
                role="status"
              >
                {workspaceApiError ?? "治疗师工作区 API 暂时不可用，当前显示演示数据。"}
              </div>
            ) : null}
            {activeView.type === "user_detail" ? (
              <TherapistUserDetailPage
                key={activeView.userId}
                principal={therapistWorkspacePrincipal}
                users={workspaceUsers}
                detailRecords={detailRecords}
                userId={activeView.userId}
                onBackToWorkspace={() => setActiveView({ type: "workspace" })}
              />
            ) : activeView.type === "prescription_editor" ? (
              <TherapistPrescriptionEditorPage
                key={activeView.userId}
                principal={therapistWorkspacePrincipal}
                users={workspaceUsers}
                userId={activeView.userId}
                existingPrescription={
                  savedPrescriptions.find(
                    (prescription) => prescription.userId === activeView.userId
                  ) ?? null
                }
                operationLogs={operationLogs}
                onBackToWorkspace={() => setActiveView({ type: "workspace" })}
                onSaved={handlePrescriptionSaved}
              />
            ) : activeView.type === "users" ? (
              <TherapistRouteOverview
                title="用户管理"
                eyebrow="Authorized Users"
                description="查看当前治疗师账号绑定范围内的训练用户、今日训练状态和待跟进提醒。具体数据访问仍由后端权限校验控制。"
                metrics={[
                  ["绑定用户", `${workspaceUsers.length} 人`],
                  [
                    "今日待训练",
                    `${workspaceUsers.filter((user) => user.trainingStatus !== "completed_today").length} 人`
                  ],
                  [
                    "需要关注",
                    `${workspaceUsers.filter((user) => user.riskReminder.level !== "none").length} 条`
                  ]
                ]}
              />
            ) : activeView.type === "live_monitoring" ? (
              <TherapistLiveMonitoringPanel />
            ) : activeView.type === "report_center" ? (
              <ReportCenterOverview
                apiError={reportApiError}
                apiState={reportApiState}
                demoMode={isDemoAuthResult(authResult)}
                onOpenReportDetail={handleReportDetailOpen}
                reportDetailError={reportDetailError}
                reportDetailState={reportDetailState}
                reports={apiReports}
                selectedReport={selectedReport}
              />
            ) : activeView.type === "music_library" ? (
              <>
                {musicApiState === "loading" ? (
                  <div className="ncr-workspace-api-notice" role="status">
                    正在读取音乐素材库与授权用户推荐状态...
                  </div>
                ) : musicApiState === "error" ? (
                  <div
                    className="ncr-workspace-api-notice ncr-workspace-api-notice--warning"
                    role="status"
                  >
                    {musicApiError ?? "音乐库 API 暂时不可用，当前显示演示素材。"}
                  </div>
                ) : null}
                <MusicLibraryPage
                  tracks={musicTracks}
                  users={musicLibraryUsers.length > 0 ? musicLibraryUsers : mockMusicLibraryUsers}
                  initialSelectionState={musicSelectionState}
                  onSelectionChange={handleMusicSelectionChange}
                />
              </>
            ) : activeView.type === "data_export" ? (
              <TherapistRouteOverview
                title="数据导出"
                eyebrow="De-identified Export"
                description="导出授权范围内的脱敏训练摘要。默认不包含姓名、联系方式、具体身份信息或原始脑电数据，导出操作需要写入操作日志。"
                metrics={[
                  ["本周导出", "2 次"],
                  ["待复核范围", "1 项"],
                  ["默认格式", "CSV / JSON"]
                ]}
              />
            ) : activeView.type === "settings" ? (
              <TherapistRouteOverview
                title="设置"
                eyebrow="Workspace Settings"
                description="管理个人工作台偏好、通知提醒和显示模式。权限范围和数据授权由后端系统统一控制。"
                metrics={[
                  ["通知提醒", "已开启"],
                  ["显示模式", "浅色"],
                  ["权限边界", "治疗师绑定用户"]
                ]}
              />
            ) : (
              <TherapistDashboard
                principal={therapistWorkspacePrincipal}
                supplement={dashboardSupplement}
                therapistName={authResult.displayName}
                users={workspaceUsers}
                onOpenLiveMonitoring={() => handleShellNavigate("/therapist/live-monitoring")}
                onOpenReportCenter={() => handleShellNavigate("/therapist/reports")}
                onOpenUserDetail={(userId) => {
                  navigateWithinCurrentApp(`/therapist/users/${userId}`);
                  setActiveView({ type: "user_detail", userId });
                }}
                onOpenPrescriptionEditor={(userId) => {
                  navigateWithinCurrentApp("/therapist/prescriptions");
                  setActiveView({ type: "prescription_editor", userId });
                }}
              />
            )}
          </div>
        </section>
      </main>
    </AppShell>
  );

  function persistPrescriptionToApi(result: TrainingPrescriptionSaveResult): void {
    const apiSession = authResult?.apiSession;
    if (apiSession === undefined) {
      return;
    }
    const user = workspaceUsers.find((candidate) => candidate.id === result.prescription.userId);
    if (user === undefined) {
      return;
    }

    void saveTrainingPrescriptionToApi({
      session: {
        apiBaseUrl: apiSession.apiBaseUrl,
        accessToken: apiSession.accessToken
      },
      draft: result.prescription,
      user
    })
      .then((apiPrescription) => {
        setSavedPrescriptions((current) => [
          apiPrescription,
          ...current.filter((prescription) => prescription.userId !== apiPrescription.userId)
        ]);
      })
      .catch((error) => {
        console.warn(
          error instanceof Error
            ? error.message
            : "Training prescription API synchronization failed."
        );
      });
  }
}

function createAuthApiClientsFromEnv() {
  const apiBaseUrl = getConfiguredApiBaseUrl(import.meta.env);
  return apiBaseUrl === null ? undefined : createUnifiedAuthApiClients({ apiBaseUrl });
}

function buildTherapistWorkspacePrincipal(
  authResult: UnifiedAuthResult | null
): TherapistWorkspacePrincipal {
  if (authResult === null || authResult.authProvider !== "api") {
    return mockTherapistPrincipal;
  }

  const roles = authResult.principal.roles.filter(isTherapistWorkspaceRole);
  return {
    userId: authResult.principal.userId,
    // api-server bindings use account user ids for therapist access checks.
    therapistId: authResult.principal.userId,
    organizationId: authResult.principal.organizationId ?? mockTherapistPrincipal.organizationId,
    roles: roles.length > 0 ? roles : ["therapist"]
  };
}

function isTherapistWorkspaceRole(
  role: string
): role is TherapistWorkspacePrincipal["roles"][number] {
  return role === "therapist" || role === "org_admin" || role === "system_admin";
}

function canOpenPrescriptionFromSidebar(
  principal: TherapistWorkspacePrincipal,
  user: TherapistWorkspaceUser
): boolean {
  if (principal.roles.includes("system_admin")) {
    return true;
  }
  if (user.organizationId !== principal.organizationId) {
    return false;
  }
  return (
    principal.roles.includes("org_admin") || user.boundTherapistIds.includes(principal.therapistId)
  );
}

function buildMusicLibraryUsers(users: TherapistWorkspaceUser[]): MusicLibraryUser[] {
  return users.map((user) => ({
    id: user.id,
    displayName: user.displayName,
    ageRange: user.ageRange,
    trainingGoal:
      user.todayPlan.moduleNames.length > 0
        ? `今日训练：${user.todayPlan.moduleNames.join("、")}`
        : "治疗师尚未配置今日训练任务。",
    ...(user.riskReminder.category === "comfort_feedback"
      ? { soundSensitivityNote: user.riskReminder.message }
      : {})
  }));
}

function buildMusicSelectionState(selections: MusicSelectionRecord[]): MusicLibrarySelectionState {
  return {
    recommendedTrackIdsByUserId: Object.fromEntries(
      selections.map((selection) => [selection.userId, selection.recommendedTrackIds])
    ),
    disabledTrackIdsByUserId: Object.fromEntries(
      selections.map((selection) => [selection.userId, selection.disabledTrackIds])
    )
  };
}

function getTherapistShellPath(activeView: ActiveTherapistView): string {
  if (activeView.type === "users") {
    return "/therapist/users";
  }

  if (activeView.type === "user_detail") {
    return `/therapist/users/${activeView.userId}`;
  }

  if (activeView.type === "prescription_editor") {
    return "/therapist/prescriptions";
  }

  if (activeView.type === "live_monitoring") {
    return "/therapist/live-monitoring";
  }

  if (activeView.type === "report_center") {
    return "/therapist/reports";
  }

  if (activeView.type === "music_library") {
    return "/therapist/music-library";
  }

  if (activeView.type === "data_export") {
    return "/therapist/data-export";
  }

  if (activeView.type === "settings") {
    return "/therapist/settings";
  }

  return "/therapist/dashboard";
}

function getInitialTherapistView(): ActiveTherapistView {
  if (typeof window === "undefined") {
    return { type: "workspace" };
  }

  return getTherapistViewFromPath(window.location.pathname);
}

function getTherapistViewFromPath(pathname: string): ActiveTherapistView {
  if (pathname === "/therapist/reports") {
    return { type: "report_center" };
  }

  if (pathname === "/therapist/users") {
    return { type: "users" };
  }

  if (pathname === "/therapist/prescriptions") {
    return { type: "prescription_editor", userId: mockTherapistWorkspaceUsers[0]?.id ?? "" };
  }

  if (pathname === "/therapist/live-monitoring") {
    return { type: "live_monitoring" };
  }

  if (pathname === "/therapist/music-library") {
    return { type: "music_library" };
  }

  if (pathname === "/therapist/data-export") {
    return { type: "data_export" };
  }

  if (pathname === "/therapist/settings") {
    return { type: "settings" };
  }

  return { type: "workspace" };
}

function resolveTherapistAuthTarget(path: string): string {
  if (typeof window === "undefined" || path !== "/therapist/dashboard") {
    return path;
  }

  const currentPath = window.location.pathname;
  return isTherapistDeepLink(currentPath) ? currentPath : path;
}

function isTherapistDeepLink(pathname: string): boolean {
  return [
    "/therapist/users",
    "/therapist/prescriptions",
    "/therapist/live-monitoring",
    "/therapist/reports",
    "/therapist/music-library",
    "/therapist/data-export",
    "/therapist/settings"
  ].includes(pathname);
}

function TherapistRouteOverview(props: {
  description: string;
  eyebrow: string;
  metrics: Array<readonly [string, string]>;
  title: string;
}): JSX.Element {
  return (
    <div className="ncr-workspace-overview">
      <section className="ncr-workspace-overview__hero">
        <article className="ncr-workspace-overview__card">
          <span className="ncr-data-panel__eyebrow">{props.eyebrow}</span>
          <h1>{props.title}</h1>
          <p>{props.description}</p>
        </article>
        <article className="ncr-workspace-overview__card">
          <h2>权限与数据边界</h2>
          <p>
            当前栏目只展示治疗师已授权范围内的训练记录、状态趋势和辅助训练安排。任何导出、报告生成或配置保存仍需要后端权限校验与操作日志记录。
          </p>
        </article>
      </section>
      <section className="ncr-workspace-overview__metrics" aria-label={`${props.title}摘要`}>
        {props.metrics.map(([label, value]) => (
          <article className="ncr-workspace-overview__metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
    </div>
  );
}

function TherapistLiveMonitoringPanel(): JSX.Element {
  const monitoredSessions = [
    {
      id: "session-lin",
      traineeName: "小林",
      moduleName: "Go/No-Go 点击反应",
      stageLabel: "第 2 / 4 阶段",
      elapsedLabel: "08:30",
      eegQuality: "信号稳定",
      attentionScore: 72,
      fatigueScore: 28,
      status: "training"
    },
    {
      id: "session-yu",
      traineeName: "小雨",
      moduleName: "音乐疗愈",
      stageLabel: "静息恢复",
      elapsedLabel: "04:10",
      eegQuality: "请复核佩戴",
      attentionScore: 58,
      fatigueScore: 46,
      status: "review"
    },
    {
      id: "session-qiqi",
      traineeName: "琪琪",
      moduleName: "节律导航",
      stageLabel: "暂停观察",
      elapsedLabel: "06:45",
      eegQuality: "等待继续",
      attentionScore: 61,
      fatigueScore: 52,
      status: "paused"
    }
  ];

  const timeline = ["身份确认", "设备检查", "静息基线", "模块训练", "阶段保存", "训练总结"];

  return (
    <section className="therapist-live-monitor" aria-labelledby="therapist-live-title">
      <header className="therapist-live-monitor__hero">
        <div>
          <p className="therapist-dashboard__eyebrow">Realtime Rehabilitation Command</p>
          <h1 id="therapist-live-title">实时训练监测中心</h1>
          <span>
            用于查看授权训练会话的连接状态、阶段进度和温和提醒。页面只做训练过程观察与记录跟进，不输出诊断判断。
          </span>
        </div>
        <div className="therapist-live-monitor__signal-card" aria-label="实时信号摘要">
          <span>全局会话状态</span>
          <strong>3 个会话在线</strong>
          <p>1 个会话建议复核佩戴，1 个会话处于暂停观察。</p>
        </div>
      </header>

      <section className="therapist-live-monitor__grid">
        <article className="therapist-live-monitor__map" aria-label="脑电摘要监测图">
          <div className="therapist-live-monitor__map-head">
            <div>
              <p>EEG Summary Field</p>
              <h2>脑电摘要状态场</h2>
            </div>
            <span>摘要特征 / 非原始脑电</span>
          </div>
          <div className="therapist-live-monitor__signal-field" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="therapist-live-monitor__vitals">
            <span>
              平均注意指数 <strong>64</strong>
            </span>
            <span>
              平均疲劳趋势 <strong>42</strong>
            </span>
            <span>
              数据延迟 <strong>360ms</strong>
            </span>
          </div>
        </article>

        <aside className="therapist-live-monitor__timeline" aria-label="训练流程阶段">
          <p>Session Timeline</p>
          <h2>单次训练流程</h2>
          <ol>
            {timeline.map((item, index) => (
              <li data-active={index >= 1 && index <= 3 ? "true" : "false"} key={item}>
                <span>{index + 1}</span>
                <strong>{item}</strong>
              </li>
            ))}
          </ol>
        </aside>
      </section>

      <section className="therapist-live-monitor__sessions" aria-label="授权训练会话">
        {monitoredSessions.map((session) => (
          <article className="therapist-live-session" data-status={session.status} key={session.id}>
            <div className="therapist-live-session__topline">
              <span>{session.traineeName}</span>
              <em>{session.elapsedLabel}</em>
            </div>
            <h2>{session.moduleName}</h2>
            <p>{session.stageLabel}</p>
            <div className="therapist-live-session__metrics">
              <span>
                注意指数 <strong>{session.attentionScore}</strong>
              </span>
              <span>
                疲劳趋势 <strong>{session.fatigueScore}</strong>
              </span>
              <span>
                信号 <strong>{session.eegQuality}</strong>
              </span>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}

function ReportCenterOverview(props: {
  apiError: string | null;
  apiState: "idle" | "loading" | "error";
  demoMode: boolean;
  onOpenReportDetail: (reportId: string) => void;
  reportDetailError: string | null;
  reportDetailState: "idle" | "loading" | "error";
  reports: TherapistReportSummary[];
  selectedReport: TherapistReportSummary | null;
}): JSX.Element {
  const hasApiReports = props.reports.length > 0;
  const apiRiskCount = props.reports.reduce((sum, report) => sum + report.riskAlerts.length, 0);

  return (
    <div className="ncr-workspace-overview">
      <section className="ncr-workspace-overview__hero">
        <article className="ncr-workspace-overview__card">
          <span className="ncr-data-panel__eyebrow">报告中心</span>
          <h1>训练报告中心</h1>
          <p>
            这里展示单次训练报告、周报草稿和家长端简报入口。报告仅用于训练记录、
            状态趋势和下次训练建议，不输出诊断结论或效果保证。
          </p>
        </article>
        {props.apiState === "loading" ? (
          <article className="ncr-workspace-overview__card">
            <span className="ncr-data-panel__eyebrow">API Reports</span>
            <h2>正在读取授权报告</h2>
            <p>系统正在从后端读取当前账号授权范围内的训练报告摘要。</p>
          </article>
        ) : hasApiReports ? (
          <article className="ncr-workspace-overview__card">
            <span className="ncr-data-panel__eyebrow">API Reports</span>
            <h2>已接入真实报告接口</h2>
            <p>当前列表来自 /reports，仅展示授权范围内的训练记录与趋势摘要。</p>
          </article>
        ) : props.demoMode ? (
          <article className="ncr-workspace-overview__card">
            <span className="ncr-data-panel__eyebrow">演示报告</span>
            <h2>演示报告已生成</h2>
            <p>以下报告均为演示数据，用于展示训练记录、状态趋势和下次建议，不代表真实训练结果。</p>
          </article>
        ) : props.apiState === "error" ? (
          <article className="ncr-workspace-overview__card">
            <span className="ncr-data-panel__eyebrow">API Reports</span>
            <h2>报告接口暂时不可用</h2>
            <p>{props.apiError ?? "请确认后端 API 已启动，并且当前账号具备报告读取权限。"}</p>
          </article>
        ) : (
          <EmptyReportState message="当前暂无待展示的新报告。完成训练并保存记录后，可在这里生成单次训练报告、周报和家长端简报。" />
        )}
      </section>
      <section className="ncr-workspace-overview__metrics" aria-label="报告中心摘要">
        <article className="ncr-workspace-overview__metric">
          <span>待复核周报</span>
          <strong>
            {hasApiReports ? `${props.reports.length} 份` : props.demoMode ? "2 份" : "0 份"}
          </strong>
        </article>
        <article className="ncr-workspace-overview__metric">
          <span>本周已生成</span>
          <strong>
            {hasApiReports ? `${props.reports.length} 份` : props.demoMode ? "3 份" : "0 份"}
          </strong>
        </article>
        <article className="ncr-workspace-overview__metric">
          <span>异常事件复核</span>
          <strong>{hasApiReports ? `${apiRiskCount} 条` : props.demoMode ? "2 条" : "0 条"}</strong>
        </article>
      </section>
      {hasApiReports ? (
        <section className="ncr-workspace-overview__metrics" aria-label="真实报告列表">
          {props.reports.map((report) => (
            <article className="ncr-workspace-overview__metric" key={report.id}>
              <span>{report.reportType === "weekly" ? "周报" : "单次报告"}</span>
              <strong>{report.id}</strong>
              <p>
                完成 {report.completedSessionCount}/{report.sessionCount} 次 · 完成率{" "}
                {Math.round(report.averageCompletionRate * 100)}%
              </p>
              <p>{report.narrativeSummary}</p>
              <button type="button" onClick={() => props.onOpenReportDetail(report.id)}>
                查看详情
              </button>
            </article>
          ))}
        </section>
      ) : props.demoMode ? (
        <section className="ncr-workspace-overview__metrics" aria-label="演示报告列表">
          {mockTrainingData.weeklyReports.map((report) => (
            <article className="ncr-workspace-overview__metric" key={report.id}>
              <span>{report.demoDataLabel}</span>
              <strong>{report.title}</strong>
              <p>
                {report.periodLabel} · 完成率 {report.completionRate}% · 总时长{" "}
                {report.totalTrainingMinutes} 分钟
              </p>
              <p>{report.summary}</p>
            </article>
          ))}
        </section>
      ) : null}
      {props.reportDetailState === "loading" ? (
        <section className="ncr-workspace-overview__hero" aria-label="报告详情读取状态">
          <article className="ncr-workspace-overview__card">
            <span className="ncr-data-panel__eyebrow">Report Detail</span>
            <h2>正在读取报告详情</h2>
            <p>系统正在从 /reports/:id 读取授权范围内的报告摘要。</p>
          </article>
        </section>
      ) : props.reportDetailState === "error" ? (
        <section className="ncr-workspace-overview__hero" aria-label="报告详情错误">
          <article className="ncr-workspace-overview__card">
            <span className="ncr-data-panel__eyebrow">Report Detail</span>
            <h2>报告详情暂时不可用</h2>
            <p>
              {props.reportDetailError ?? "请确认后端 API 已启动，且当前账号拥有该报告读取权限。"}
            </p>
          </article>
        </section>
      ) : props.selectedReport ? (
        <section className="ncr-workspace-overview__hero" aria-label="报告详情">
          <article className="ncr-workspace-overview__card">
            <span className="ncr-data-panel__eyebrow">Report Detail</span>
            <h2>
              {props.selectedReport.reportType === "weekly" ? "训练周报详情" : "单次训练报告详情"}
            </h2>
            <p>{props.selectedReport.narrativeSummary}</p>
            <p>
              完成 {props.selectedReport.completedSessionCount}/{props.selectedReport.sessionCount}{" "}
              次， 平均完成率 {Math.round(props.selectedReport.averageCompletionRate * 100)}%。
            </p>
          </article>
          <article className="ncr-workspace-overview__card">
            <span className="ncr-data-panel__eyebrow">Next Focus</span>
            <h2>下次训练关注点</h2>
            <ul>
              {props.selectedReport.nextTrainingFocus.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{props.selectedReport.dataScopeNotice}</p>
          </article>
        </section>
      ) : null}
    </div>
  );
}

function TherapistRoleNotice(props: { authResult: UnifiedAuthResult; onLogout: () => void }) {
  const [activePath, setActivePath] = useState(props.authResult.dashboardPath);
  const handleNoticeNavigate = (path: string) => {
    setActivePath(path);
    navigateWithinCurrentApp(path);
  };

  return (
    <AppShell
      activePath={activePath}
      displayName={props.authResult.displayName}
      eegStatus={THERAPIST_APP_SHELL_EEG_STATUS}
      notifications={THERAPIST_APP_SHELL_NOTIFICATIONS}
      onLogout={props.onLogout}
      onNavigate={handleNoticeNavigate}
      organizationName="认知康复演示中心"
      role={props.authResult.role}
      systemStatus={buildDemoSystemStatus(props.authResult)}
    >
      <PermissionDeniedState
        actionLabel="重新选择身份"
        message="当前身份不是治疗师，治疗师端不会展示未授权训练数据。请进入对应空间或重新选择身份。"
        onAction={props.onLogout}
        roleLabel="当前身份"
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
    // Keep workspace logout responsive even if the API session has already expired.
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
    therapist: currentOrigin
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
