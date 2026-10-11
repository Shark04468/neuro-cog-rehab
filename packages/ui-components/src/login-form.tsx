import { useState, type FormEvent } from "react";

import { NeuroButton } from "./design-system.js";
import { mockUnifiedLogin, UnifiedAuthError, validateLoginForm } from "./unified-auth-model.js";
import type {
  AuthPortalRole,
  UnifiedAuthClient,
  UnifiedAuthResult,
  UnifiedLoginInput
} from "./unified-auth-types.js";

export interface LoginFormProps {
  selectedRole: AuthPortalRole | null;
  authClient?: UnifiedAuthClient | undefined;
  onAuthenticated: (result: UnifiedAuthResult, input: UnifiedLoginInput) => void;
  onRequestRegister: () => void;
}

type LoginAuthPhase = "idle" | "submitting" | "verified";

const VERIFIED_TRANSITION_MS = 620;

export function LoginForm({
  selectedRole,
  authClient = mockUnifiedLogin,
  onAuthenticated,
  onRequestRegister
}: LoginFormProps): JSX.Element {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberRole, setRememberRole] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authPhase, setAuthPhase] = useState<LoginAuthPhase>("idle");

  const isSubmitting = authPhase !== "idle";
  const input: UnifiedLoginInput = {
    role: selectedRole,
    identifier,
    password,
    rememberRole
  };
  const issues = validateLoginForm(input);
  const canSubmit = issues.length === 0 && !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const currentIssues = validateLoginForm(input);
    if (currentIssues.length > 0) {
      setErrorMessage(currentIssues.map((issue) => issue.message).join(" "));
      return;
    }

    setAuthPhase("submitting");
    setErrorMessage(null);
    try {
      const result = await authClient(input);
      setAuthPhase("verified");
      await delay(VERIFIED_TRANSITION_MS);
      onAuthenticated(result, input);
    } catch (error) {
      if (error instanceof UnifiedAuthError) {
        setErrorMessage(error.issues.map((issue) => issue.message).join(" "));
      } else {
        setErrorMessage("登录暂时无法完成，请稍后重试。");
      }
      setAuthPhase("idle");
    }
  };

  return (
    <form className="ncr-auth-form" data-auth-phase={authPhase} onSubmit={handleSubmit}>
      <div className="ncr-auth-form-head">
        <p className="ncr-auth-form-label">Secure Sign In</p>
        <h2>账号密码登录</h2>
        <span>选择身份后进入对应工作区，数据访问仍由权限系统控制。</span>
      </div>

      {!selectedRole ? (
        <div className="ncr-auth-hint" role="status">
          请先选择登录身份，再输入账号信息。
        </div>
      ) : null}

      {authPhase === "verified" ? (
        <div className="ncr-auth-verification-state" role="status">
          <span aria-hidden="true">✓</span>
          <strong>身份验证通过</strong>
          <em>正在进入对应工作区</em>
        </div>
      ) : null}

      <label className="ncr-auth-field">
        <span>账号 / 手机号 / 邮箱</span>
        <input
          autoComplete="username"
          className="ncr-auth-input"
          disabled={isSubmitting}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="请输入登录账号"
          value={identifier}
        />
      </label>

      <label className="ncr-auth-field">
        <span>密码</span>
        <span className="ncr-auth-input-wrap">
          <input
            autoComplete="current-password"
            className="ncr-auth-input"
            disabled={isSubmitting}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="请输入密码"
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            className="ncr-auth-password-toggle"
            disabled={isSubmitting}
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? "隐藏" : "显示"}
          </button>
        </span>
      </label>

      <div className="ncr-auth-row">
        <label className="ncr-auth-check">
          <input
            checked={rememberRole}
            disabled={isSubmitting}
            onChange={(event) => setRememberRole(event.target.checked)}
            type="checkbox"
          />
          <span>记住本次选择的身份</span>
        </label>
        <a className="ncr-auth-link" href="/forgot-password">
          忘记密码
        </a>
      </div>

      {errorMessage ? (
        <div className="ncr-auth-error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <NeuroButton className="ncr-auth-submit" disabled={!canSubmit} type="submit">
        {authPhase === "verified"
          ? "身份验证通过"
          : authPhase === "submitting"
            ? "正在验证身份..."
            : "进入系统空间"}
      </NeuroButton>

      <div className="ncr-auth-row ncr-auth-row--compact">
        <span className="ncr-auth-hint">请选择与账号授权范围一致的身份进入。</span>
        <button
          className="ncr-auth-link"
          disabled={isSubmitting}
          onClick={onRequestRegister}
          type="button"
        >
          注册账号
        </button>
      </div>

      <div className="ncr-auth-meta-links">
        <a className="ncr-auth-link" href="/privacy">
          隐私协议
        </a>
        <a className="ncr-auth-link" href="/informed-consent">
          知情同意说明
        </a>
      </div>
    </form>
  );
}

function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}
