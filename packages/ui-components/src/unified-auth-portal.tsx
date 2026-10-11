import { useState } from "react";

import { AuthLayout } from "./auth-layout.js";
import { NeuroAuthBackground } from "./auth-background.js";
import {
  buildDemoLoginInput,
  createDemoHandoffPath,
  DEMO_ACCOUNTS,
  DEMO_MODE_CONFIG,
  mockDemoAuth,
  type DemoModeConfig
} from "./demo-mode.js";
import { NeuroDesignSystemProvider, NeuroStatusBadge, NeuroTag } from "./design-system.js";
import { LoginForm } from "./login-form.js";
import { RegisterForm } from "./register-form.js";
import type { RegisterFlowSubmitClient } from "./register-flow-model.js";
import { RoleSelector } from "./role-selector.js";
import { ReducedMotionProvider } from "./advanced-front-end-components.js";
import { UNIFIED_AUTH_CSS } from "./unified-auth.css.js";
import { getRoleOption, isAuthPortalRole } from "./unified-auth-model.js";
import type {
  AuthPortalMode,
  AuthPortalRole,
  UnifiedAuthClient,
  UnifiedAuthResult,
  UnifiedLoginInput
} from "./unified-auth-types.js";

export interface UnifiedAuthPortalProps {
  initialRole?: AuthPortalRole | null | undefined;
  defaultMode?: AuthPortalMode;
  authClient?: UnifiedAuthClient | undefined;
  registerClient?: RegisterFlowSubmitClient | undefined;
  demoModeConfig?: DemoModeConfig | false | undefined;
  onAuthenticated?: ((result: UnifiedAuthResult, input: UnifiedLoginInput) => void) | undefined;
  navigate?: ((path: string) => void) | undefined;
}

const REMEMBERED_ROLE_STORAGE_KEY = "ncr-unified-auth-role";

export function UnifiedAuthPortal({
  initialRole,
  defaultMode = "login",
  authClient,
  registerClient,
  demoModeConfig = DEMO_MODE_CONFIG,
  onAuthenticated,
  navigate
}: UnifiedAuthPortalProps): JSX.Element {
  const [mode, setMode] = useState<AuthPortalMode>(defaultMode);
  const [selectedRole, setSelectedRole] = useState<AuthPortalRole | null>(() =>
    initialRole === undefined ? loadRememberedRole() : initialRole
  );

  const selectedRoleOption = selectedRole ? getRoleOption(selectedRole) : null;
  const resolvedDemoConfig =
    demoModeConfig === false ? null : { ...DEMO_MODE_CONFIG, ...demoModeConfig };

  const handleAuthenticated = (result: UnifiedAuthResult, input: UnifiedLoginInput) => {
    persistRememberedRole(input.rememberRole ? result.role : null);
    onAuthenticated?.(result, input);

    if (navigate) {
      navigate(createDemoHandoffPath(result.dashboardPath, result));
      return;
    }

    if (!onAuthenticated && typeof window !== "undefined") {
      window.location.assign(createDemoHandoffPath(result.dashboardPath, result));
    }
  };

  const handleDemoLogin = async (role: AuthPortalRole) => {
    setSelectedRole(role);
    const input = buildDemoLoginInput(role);
    const result = await mockDemoAuth(input);
    handleAuthenticated(result, input);
  };

  return (
    <NeuroDesignSystemProvider theme="hospital-light">
      <ReducedMotionProvider>
        <style>{UNIFIED_AUTH_CSS}</style>
        <NeuroAuthBackground>
          <AuthLayout
            brandSlot={<AuthHeroPanel />}
            mode={mode}
            roleSlot={
              <>
                <div className="ncr-auth-section-head">
                  <div>
                    <p className="ncr-auth-section-label">Role Access</p>
                    <h2>选择进入系统空间</h2>
                    <p>先确认身份，再进入对应工作区。训练数据访问仍由权限系统控制。</p>
                  </div>
                  {selectedRoleOption ? (
                    <NeuroStatusBadge tone="monitoring">
                      {selectedRoleOption.shortLabel}
                    </NeuroStatusBadge>
                  ) : (
                    <NeuroStatusBadge tone="warning">待选择</NeuroStatusBadge>
                  )}
                </div>
                <RoleSelector selectedRole={selectedRole} onRoleChange={setSelectedRole} />
              </>
            }
            selectedRole={selectedRole}
            formSlot={
              <>
                <div className="ncr-auth-tabs" role="tablist" aria-label="登录或注册">
                  <button
                    className="ncr-auth-tab"
                    data-active={String(mode === "login")}
                    onClick={() => setMode("login")}
                    type="button"
                  >
                    登录
                  </button>
                  <button
                    className="ncr-auth-tab"
                    data-active={String(mode === "register")}
                    onClick={() => setMode("register")}
                    type="button"
                  >
                    注册
                  </button>
                </div>
                <div
                  className="ncr-auth-mode-stage"
                  data-auth-mode={mode}
                  key={`${mode}-${selectedRole}`}
                >
                  {mode === "login" ? (
                    <>
                      <LoginForm
                        authClient={authClient}
                        onAuthenticated={handleAuthenticated}
                        onRequestRegister={() => setMode("register")}
                        selectedRole={selectedRole}
                      />
                      {resolvedDemoConfig?.enabled ? (
                        <DemoModeLauncher
                          config={resolvedDemoConfig}
                          onDemoLogin={handleDemoLogin}
                          selectedRole={selectedRole}
                        />
                      ) : null}
                    </>
                  ) : (
                    <RegisterForm
                      submitClient={registerClient}
                      onEnterDashboard={(path) => {
                        if (navigate) {
                          navigate(path);
                          return;
                        }

                        if (typeof window !== "undefined") {
                          window.location.assign(path);
                        }
                      }}
                      onRequestLogin={() => setMode("login")}
                      selectedRole={selectedRole}
                    />
                  )}
                </div>
              </>
            }
          />
        </NeuroAuthBackground>
      </ReducedMotionProvider>
    </NeuroDesignSystemProvider>
  );
}

function DemoModeLauncher({
  config,
  selectedRole,
  onDemoLogin
}: {
  config: DemoModeConfig;
  selectedRole: AuthPortalRole | null;
  onDemoLogin: (role: AuthPortalRole) => void | Promise<void>;
}): JSX.Element {
  const primaryRole = selectedRole ?? "therapist";
  const primaryAccount = DEMO_ACCOUNTS.find((account) => account.role === primaryRole)!;

  return (
    <section className="ncr-demo-mode-panel" aria-label="演示模式入口">
      <div className="ncr-demo-mode-panel__head">
        <div>
          <span>{config.badgeLabel}</span>
          <strong>{config.scenarioName}</strong>
        </div>
        <em>{config.dataLabel}</em>
      </div>
      <p>用于项目汇报、导师展示或比赛路演。以下账号和训练记录均为演示数据，不代表真实训练结果。</p>
      <button
        className="ncr-demo-mode-panel__primary"
        onClick={() => onDemoLogin(primaryRole)}
        type="button"
      >
        使用{primaryAccount.label}进入
      </button>
      <div className="ncr-demo-account-grid" aria-label="可用演示账号">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            className="ncr-demo-account-button"
            data-selected={String(account.role === selectedRole)}
            key={account.role}
            onClick={() => onDemoLogin(account.role)}
            type="button"
          >
            <span>{account.label}</span>
            <strong>{account.identifier}</strong>
            <em>口令：{account.passwordHint}</em>
            <small>{account.description}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

export function AuthHeroPanel(): JSX.Element {
  return (
    <>
      <div className="ncr-auth-brand-main">
        <div className="ncr-auth-brand-mark" aria-hidden="true">
          NT
        </div>
        <p className="ncr-auth-brand-kicker">Hospital Neuroscience Rehab Platform</p>
        <h1>NeuroTune-Cog 认知康复一体化系统</h1>
        <p className="ncr-auth-brand-subtitle">音乐疗愈 · 脑电反馈 · 注意训练 · 康复追踪</p>
        <p className="ncr-auth-brand-copy">面向认知训练与状态追踪的数字化辅助平台。</p>
      </div>

      <div className="ncr-auth-capability-tags" aria-label="系统能力标签">
        <NeuroTag tone="monitoring">实时脑电状态评估</NeuroTag>
        <NeuroTag tone="clinical">个体化认知训练路径</NeuroTag>
        <NeuroTag tone="calm">治疗师闭环管理</NeuroTag>
      </div>

      <div className="ncr-auth-hero-grid">
        <div className="ncr-auth-eeg-preview-card" aria-label="脑电预览卡片">
          <div className="ncr-auth-eeg-preview-card__head">
            <span>EEG Live Preview</span>
            <strong>信号状态稳定</strong>
          </div>
          <svg viewBox="0 0 520 150" role="img" aria-label="低透明脑电状态曲线预览">
            <path d="M0 84 H52 L66 52 L84 118 L104 74 H160 L174 36 L196 126 L220 82 H282 L296 58 L318 106 L344 74 H410 L426 44 L454 112 L476 82 H520" />
            <path d="M0 108 H88 L104 92 L124 116 L146 104 H236 L252 78 L276 124 L302 102 H392 L410 86 L432 118 L456 104 H520" />
          </svg>
          <div className="ncr-auth-eeg-preview-card__metrics">
            <span>注意 68</span>
            <span>放松 54</span>
            <span>延迟 420ms</span>
          </div>
        </div>

        <div className="ncr-auth-brand-metrics" aria-label="系统能力概览">
          <div className="ncr-auth-brand-metric">
            <span>实时状态</span>
            <strong>训练前检查 EEG 连接与信号质量</strong>
          </div>
          <div className="ncr-auth-brand-metric">
            <span>训练闭环</span>
            <strong>任务配置、训练记录、趋势反馈统一追踪</strong>
          </div>
          <div className="ncr-auth-brand-metric">
            <span>数据边界</span>
            <strong>按角色和授权范围访问训练数据</strong>
          </div>
        </div>
      </div>
    </>
  );
}

function loadRememberedRole(): AuthPortalRole | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedRole = window.localStorage.getItem(REMEMBERED_ROLE_STORAGE_KEY);
    return isAuthPortalRole(storedRole) ? storedRole : null;
  } catch {
    return null;
  }
}

function persistRememberedRole(role: AuthPortalRole | null): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (role) {
      window.localStorage.setItem(REMEMBERED_ROLE_STORAGE_KEY, role);
    } else {
      window.localStorage.removeItem(REMEMBERED_ROLE_STORAGE_KEY);
    }
  } catch {
    // Storage may be unavailable in restricted browser contexts; login can still continue.
  }
}
