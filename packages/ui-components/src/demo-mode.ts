import type { DataScope } from "@neuro-cog-rehab/shared-types";

import type { AppShellSystemStatus } from "./app-shell-types.js";
import {
  getDashboardPathForRole,
  isAuthPortalRole,
  UnifiedAuthError
} from "./unified-auth-model.js";
import type { AuthPortalRole, UnifiedAuthResult, UnifiedLoginInput } from "./unified-auth-types.js";

export type DemoEEGState = "focused" | "relaxed" | "fatigued";

export interface DemoModeConfig {
  enabled: boolean;
  scenarioId: string;
  scenarioName: string;
  badgeLabel: string;
  dataLabel: string;
}

export interface DemoAccount {
  role: AuthPortalRole;
  label: string;
  identifier: string;
  passwordHint: string;
  displayName: string;
  organizationId?: string | undefined;
  description: string;
}

export interface DemoEEGFeatureFrame {
  id: string;
  sessionId: string;
  timestamp: string;
  attentionScore: number;
  relaxationScore: number;
  fatigueScore: number;
  thetaPower: number;
  alphaPower: number;
  betaPower: number;
  signalQuality: number;
  signalQualityStatus: "good" | "unstable" | "noisy" | "disconnected";
  artifactLevel: number;
  demoData: true;
  demoDataLabel: string;
}

export interface DemoEEGStreamController {
  start: () => void;
  stop: () => void;
  nextFrame: () => DemoEEGFeatureFrame;
  isRunning: () => boolean;
}

export interface DemoTrainingRecord {
  id: string;
  userId: string;
  userDisplayName: string;
  moduleName: string;
  completedAtLabel: string;
  durationMinutes: number;
  completionStatus: "completed" | "paused";
  trendSummary: string;
  demoData: true;
  demoDataLabel: string;
}

export interface DemoWeeklyReport {
  id: string;
  userId: string;
  title: string;
  periodLabel: string;
  completionRate: number;
  totalTrainingMinutes: number;
  summary: string;
  nextSuggestion: string;
  demoData: true;
  demoDataLabel: string;
}

export interface DemoRiskAlert {
  id: string;
  userId: string;
  level: "watch" | "needs_review";
  message: string;
  occurredAtLabel: string;
  demoData: true;
  demoDataLabel: string;
}

export interface DemoTrainingDataSet {
  demoData: true;
  demoDataLabel: string;
  trainingRecords: DemoTrainingRecord[];
  weeklyReports: DemoWeeklyReport[];
  riskAlerts: DemoRiskAlert[];
  musicRecommendations: Array<{
    id: string;
    userId: string;
    trackTitle: string;
    tag: string;
    reason: string;
    demoData: true;
    demoDataLabel: string;
  }>;
  prescriptions: Array<{
    id: string;
    userId: string;
    weeklyFrequency: number;
    durationMinutes: number;
    modules: string[];
    note: string;
    demoData: true;
    demoDataLabel: string;
  }>;
}

export const DEMO_MODE_CONFIG: DemoModeConfig = {
  enabled: true,
  scenarioId: "ncr-roadshow-demo",
  scenarioName: "项目汇报演示流程",
  badgeLabel: "演示模式",
  dataLabel: "演示数据 - 非真实训练记录"
};

export const DEMO_HANDOFF_FLAG = "ncrDemo";
export const DEMO_HANDOFF_ROLE = "ncrDemoRole";

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    role: "trainee",
    label: "训练用户演示账号",
    identifier: "demo-trainee",
    passwordHint: "demo-pass",
    displayName: "小林 · 演示",
    description: "进入认知训练舱、模拟 EEG、音乐疗愈和训练流程。"
  },
  {
    role: "parent",
    label: "家长演示账号",
    identifier: "demo-parent",
    passwordHint: "demo-pass",
    displayName: "家长端 · 演示",
    description: "查看训练坚持情况、阶段简报和下次训练建议。"
  },
  {
    role: "therapist",
    label: "治疗师演示账号",
    identifier: "demo-therapist",
    passwordHint: "demo-pass",
    displayName: "陈老师 · 演示",
    organizationId: "org-demo-roadshow",
    description: "查看康复数据指挥中心、用户详情、趋势图和报告中心。"
  },
  {
    role: "org_admin",
    label: "机构管理员演示账号",
    identifier: "demo-admin",
    passwordHint: "demo-pass",
    displayName: "机构管理员 · 演示",
    organizationId: "org-demo-roadshow",
    description: "查看机构概览、权限边界、设备和操作日志入口。"
  }
];

export const mockTrainingData: DemoTrainingDataSet = {
  demoData: true,
  demoDataLabel: DEMO_MODE_CONFIG.dataLabel,
  trainingRecords: [
    {
      id: "demo-record-music-001",
      userId: "demo-trainee-001",
      userDisplayName: "小林",
      moduleName: "音乐疗愈",
      completedAtLabel: "今天 09:40",
      durationMinutes: 8,
      completionStatus: "completed",
      trendSummary: "放松指数较训练前上升，疲劳趋势保持平稳。",
      demoData: true,
      demoDataLabel: DEMO_MODE_CONFIG.dataLabel
    },
    {
      id: "demo-record-go-nogo-001",
      userId: "demo-trainee-001",
      userDisplayName: "小林",
      moduleName: "Go/No-Go 点击反应",
      completedAtLabel: "今天 09:53",
      durationMinutes: 6,
      completionStatus: "completed",
      trendSummary: "误按率保持在可观察范围，下一轮建议维持标准难度。",
      demoData: true,
      demoDataLabel: DEMO_MODE_CONFIG.dataLabel
    },
    {
      id: "demo-record-rhythm-001",
      userId: "demo-trainee-002",
      userDisplayName: "小雨",
      moduleName: "节律导航",
      completedAtLabel: "昨天 18:10",
      durationMinutes: 7,
      completionStatus: "paused",
      trendSummary: "节拍同步出现短时波动，建议下次先降低路线长度。",
      demoData: true,
      demoDataLabel: DEMO_MODE_CONFIG.dataLabel
    }
  ],
  weeklyReports: [
    {
      id: "demo-weekly-report-001",
      userId: "demo-trainee-001",
      title: "小林 第6周训练趋势简报",
      periodLabel: "本周演示周期",
      completionRate: 82,
      totalTrainingMinutes: 86,
      summary: "本周训练完成较稳定，注意稳定性曲线整体保持平稳，疲劳趋势未持续升高。",
      nextSuggestion: "下周建议保持短时多次训练节奏，并在点击反应练习前完成设备检查。",
      demoData: true,
      demoDataLabel: DEMO_MODE_CONFIG.dataLabel
    },
    {
      id: "demo-weekly-report-002",
      userId: "demo-trainee-002",
      title: "小雨 音乐疗愈适配记录",
      periodLabel: "本周演示周期",
      completionRate: 74,
      totalTrainingMinutes: 64,
      summary: "自然声与低强度节律音乐的主观反馈较好，训练后放松趋势更稳定。",
      nextSuggestion: "建议继续使用自然声作为训练后恢复音乐，任务复杂度先保持当前水平。",
      demoData: true,
      demoDataLabel: DEMO_MODE_CONFIG.dataLabel
    }
  ],
  riskAlerts: [
    {
      id: "demo-risk-alert-001",
      userId: "demo-trainee-002",
      level: "watch",
      message: "最近一次训练中 EEG 信号出现短时波动，建议复核佩戴状态。",
      occurredAtLabel: "昨天 18:14",
      demoData: true,
      demoDataLabel: DEMO_MODE_CONFIG.dataLabel
    },
    {
      id: "demo-risk-alert-002",
      userId: "demo-trainee-001",
      level: "needs_review",
      message: "Go/No-Go 模块出现连续误按，系统建议短暂休息后再继续。",
      occurredAtLabel: "今天 09:57",
      demoData: true,
      demoDataLabel: DEMO_MODE_CONFIG.dataLabel
    }
  ],
  musicRecommendations: [
    {
      id: "demo-music-001",
      userId: "demo-trainee-001",
      trackTitle: "晨间稳定节律",
      tag: "focus",
      reason: "适合作为注意训练前的低强度准备音乐。",
      demoData: true,
      demoDataLabel: DEMO_MODE_CONFIG.dataLabel
    }
  ],
  prescriptions: [
    {
      id: "demo-prescription-001",
      userId: "demo-trainee-001",
      weeklyFrequency: 4,
      durationMinutes: 24,
      modules: ["音乐疗愈", "注意力训练", "Go/No-Go", "节律导航"],
      note: "演示处方仅用于汇报流程，不代表真实训练安排。",
      demoData: true,
      demoDataLabel: DEMO_MODE_CONFIG.dataLabel
    }
  ]
};

export function getDemoAccount(role: AuthPortalRole): DemoAccount {
  const account = DEMO_ACCOUNTS.find((item) => item.role === role);
  if (!account) {
    throw new UnifiedAuthError("演示身份暂不可用。", [
      { field: "role", message: "请选择可用的演示身份。" }
    ]);
  }

  return account;
}

export function buildDemoLoginInput(role: AuthPortalRole): UnifiedLoginInput {
  const account = getDemoAccount(role);
  return {
    role,
    identifier: account.identifier,
    password: account.passwordHint,
    rememberRole: true
  };
}

export async function mockDemoAuth(input: UnifiedLoginInput): Promise<UnifiedAuthResult> {
  if (!input.role || !isAuthPortalRole(input.role)) {
    throw new UnifiedAuthError("演示登录需要先选择身份。", [
      { field: "role", message: "请先选择训练用户、家长、治疗师或机构管理员身份。" }
    ]);
  }

  return createDemoAuthResult(input.role);
}

export function createDemoAuthResult(role: AuthPortalRole): UnifiedAuthResult {
  const account = getDemoAccount(role);
  const principal = {
    userId: `demo-${role}`,
    roles: [role],
    dataScope: getDataScopeForRole(role),
    ...(account.organizationId ? { organizationId: account.organizationId } : {})
  };

  return {
    role,
    dashboardPath: getDashboardPathForRole(role),
    displayName: account.displayName,
    issuedAt: new Date().toISOString(),
    authProvider: "demo",
    principal,
    demoMode: {
      enabled: true,
      scenarioId: DEMO_MODE_CONFIG.scenarioId,
      dataLabel: DEMO_MODE_CONFIG.dataLabel,
      accountId: account.identifier
    }
  };
}

export function isDemoAuthResult(result: UnifiedAuthResult | null | undefined): boolean {
  return Boolean(result && (result.authProvider === "demo" || result.demoMode?.enabled));
}

export function buildDemoSystemStatus(
  result: UnifiedAuthResult | null | undefined
): Partial<AppShellSystemStatus> {
  if (!isDemoAuthResult(result)) {
    return { demoMode: false };
  }

  return {
    demoMode: true,
    permissionStatus: "demo",
    permissionLabel: DEMO_MODE_CONFIG.badgeLabel,
    syncStatus: "synced",
    sessionId: DEMO_MODE_CONFIG.scenarioId
  };
}

export function createDemoHandoffPath(path: string, result: UnifiedAuthResult): string {
  if (!isDemoAuthResult(result)) {
    return path;
  }

  const hashIndex = path.indexOf("#");
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const pathWithoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const [pathname, search = ""] = pathWithoutHash.split("?");
  const params = new URLSearchParams(search);
  params.set(DEMO_HANDOFF_FLAG, "1");
  params.set(DEMO_HANDOFF_ROLE, result.role);
  return `${pathname}?${params.toString()}${hash}`;
}

export function loadDemoAuthFromLocation(
  pathname: string,
  search: string
): UnifiedAuthResult | null {
  const params = new URLSearchParams(search);
  if (params.get(DEMO_HANDOFF_FLAG) !== "1") {
    return null;
  }

  const role = params.get(DEMO_HANDOFF_ROLE);
  if (!isAuthPortalRole(role)) {
    return null;
  }

  return createDemoAuthResult(role);
}

export function clearDemoHandoffFromCurrentUrl(): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete(DEMO_HANDOFF_FLAG);
  url.searchParams.delete(DEMO_HANDOFF_ROLE);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function createMockEEGFeatureFrame(
  input: {
    state?: DemoEEGState;
    sessionId?: string;
    sequence?: number;
    now?: Date;
  } = {}
): DemoEEGFeatureFrame {
  const state = input.state ?? "focused";
  const sequence = input.sequence ?? 0;
  const phase = sequence / 4;
  const now = input.now ?? new Date();
  const trend = state === "fatigued" ? Math.min(18, sequence * 1.8) : 0;

  const attentionBase = state === "focused" ? 72 : state === "relaxed" ? 56 : 48;
  const relaxationBase = state === "relaxed" ? 76 : state === "focused" ? 52 : 46;
  const fatigueBase = state === "fatigued" ? 44 + trend : state === "relaxed" ? 26 : 32;
  const artifactLevel =
    state === "fatigued" ? 10 + Math.round(sequence % 4) : 5 + Math.round(sequence % 3);
  const signalQuality =
    state === "fatigued" ? 82 - Math.round(sequence % 5) : 92 - Math.round(sequence % 3);

  return {
    id: `demo-eeg-${input.sessionId ?? "session"}-${sequence}`,
    sessionId: input.sessionId ?? "demo-session-001",
    timestamp: now.toISOString(),
    attentionScore: clampMetric(attentionBase + Math.sin(phase) * 4 - trend * 0.35),
    relaxationScore: clampMetric(relaxationBase + Math.cos(phase) * 3),
    fatigueScore: clampMetric(fatigueBase + Math.sin(phase / 2) * 3),
    thetaPower: roundMetric(0.42 + Math.sin(phase) * 0.03 + trend * 0.002),
    alphaPower: roundMetric(0.56 + Math.cos(phase) * 0.04),
    betaPower: roundMetric(0.48 + Math.sin(phase + 0.6) * 0.04 - trend * 0.001),
    signalQuality,
    signalQualityStatus: signalQuality >= 88 ? "good" : signalQuality >= 75 ? "unstable" : "noisy",
    artifactLevel,
    demoData: true,
    demoDataLabel: DEMO_MODE_CONFIG.dataLabel
  };
}

export function createMockEEGFrameSeries(
  input: {
    count?: number;
    state?: DemoEEGState;
    sessionId?: string;
    startAt?: Date;
  } = {}
): DemoEEGFeatureFrame[] {
  const count = input.count ?? 24;
  const startAt = input.startAt ?? new Date(Date.now() - count * 1000);
  return Array.from({ length: count }, (_, index) => {
    const frameInput: Parameters<typeof createMockEEGFeatureFrame>[0] = {
      sequence: index,
      now: new Date(startAt.getTime() + index * 1000)
    };
    if (input.state) {
      frameInput.state = input.state;
    }
    if (input.sessionId) {
      frameInput.sessionId = input.sessionId;
    }
    return createMockEEGFeatureFrame(frameInput);
  });
}

export function createMockEEGStream(options: {
  state?: DemoEEGState;
  sessionId?: string;
  intervalMs?: number;
  onFrame: (frame: DemoEEGFeatureFrame) => void;
}): DemoEEGStreamController {
  let sequence = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const nextFrame = () => {
    const frameInput: Parameters<typeof createMockEEGFeatureFrame>[0] = { sequence };
    if (options.state) {
      frameInput.state = options.state;
    }
    if (options.sessionId) {
      frameInput.sessionId = options.sessionId;
    }
    const frame = createMockEEGFeatureFrame(frameInput);
    sequence += 1;
    options.onFrame(frame);
    return frame;
  };

  return {
    start: () => {
      if (timer !== null) {
        return;
      }
      nextFrame();
      timer = setInterval(nextFrame, options.intervalMs ?? 1000);
    },
    stop: () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    },
    nextFrame,
    isRunning: () => timer !== null
  };
}

export const mockAuth = mockDemoAuth;
export const mockEEGStream = createMockEEGStream;

function getDataScopeForRole(role: AuthPortalRole): DataScope {
  if (role === "trainee") {
    return "self";
  }
  if (role === "parent") {
    return "parent_linked";
  }
  if (role === "therapist") {
    return "therapist_linked";
  }

  return "organization";
}

function clampMetric(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function roundMetric(value: number): number {
  return Math.round(value * 1000) / 1000;
}
