import type { ReactNode } from "react";

import type { AuthPortalMode, AuthPortalRole } from "./unified-auth-types.js";

export interface AuthLayoutProps {
  brandSlot: ReactNode;
  roleSlot: ReactNode;
  formSlot: ReactNode;
  mode?: AuthPortalMode | undefined;
  selectedRole?: AuthPortalRole | null | undefined;
}

export interface LoginGlassPanelProps {
  children: ReactNode;
  mode?: AuthPortalMode | undefined;
  selectedRole?: AuthPortalRole | null | undefined;
}

export function AuthLayout({
  brandSlot,
  roleSlot,
  formSlot,
  mode,
  selectedRole
}: AuthLayoutProps): JSX.Element {
  return (
    <main className="ncr-auth-layout">
      <section className="ncr-auth-brand" aria-label="系统品牌叙事区">
        {brandSlot}
      </section>
      <LoginGlassPanel mode={mode} selectedRole={selectedRole}>
        <section className="ncr-auth-role-area" aria-label="身份选择">
          {roleSlot}
        </section>
        <section className="ncr-auth-panel" aria-label="账号登录">
          {formSlot}
        </section>
      </LoginGlassPanel>
    </main>
  );
}

export function LoginGlassPanel({
  children,
  mode = "login",
  selectedRole
}: LoginGlassPanelProps): JSX.Element {
  return (
    <div
      className="ncr-auth-entry-card ncr-login-glass-panel"
      aria-label="统一登录舱"
      data-auth-mode={mode}
      data-selected-role={selectedRole ?? "none"}
    >
      <div className="ncr-login-glass-panel__status" aria-hidden="true">
        <span>SECURE ROLE ACCESS</span>
        <strong>{selectedRole ? "IDENTITY SELECTED" : "WAITING FOR ROLE"}</strong>
      </div>
      {children}
    </div>
  );
}
