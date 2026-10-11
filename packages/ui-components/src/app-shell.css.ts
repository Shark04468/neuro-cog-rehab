export const APP_SHELL_CSS = `
.ncr-app-shell-provider {
  min-height: 100vh;
}

.ncr-shell {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  color: var(--ncr-color-text);
  background:
    radial-gradient(circle at 12% 8%, rgba(34, 168, 161, 0.14), transparent 34%),
    radial-gradient(circle at 78% 6%, rgba(79, 142, 216, 0.13), transparent 32%),
    var(--ncr-bg-medical-base);
}

.ncr-shell__layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(232px, 272px) minmax(0, 1fr);
  min-height: 100vh;
}

.ncr-shell__layout:has(.ncr-shell-sidebar[data-collapsed="true"]) {
  grid-template-columns: 84px minmax(0, 1fr);
}

.ncr-shell__overlay {
  display: none;
}

.ncr-shell__content-frame {
  min-width: 0;
  padding: 18px 22px 28px;
}

.ncr-shell__main {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.ncr-shell__content {
  min-width: 0;
  border: 1px solid rgba(143, 204, 226, 0.12);
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.24), rgba(230, 249, 252, 0.12)),
    radial-gradient(circle at 18% 0%, rgba(34, 168, 161, 0.1), transparent 32%);
  box-shadow: 0 26px 80px rgba(20, 85, 121, 0.08), inset 0 1px 0 rgba(255,255,255,0.38);
  overflow: hidden;
}

.ncr-shell__content > .app-shell,
.ncr-shell__content > .therapist-shell {
  min-height: auto;
  background: transparent;
}

.ncr-shell__content .home-band,
.ncr-shell__content .therapist-band {
  min-height: auto;
}

[data-ncr-theme="neuro-dark"] .ncr-shell__content {
  background: rgba(8, 24, 40, 0.42);
  border-color: rgba(112, 213, 236, 0.2);
}

.ncr-medical-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.ncr-medical-bg__base,
.ncr-medical-bg__grid {
  position: absolute;
  inset: 0;
}

.ncr-medical-bg__base {
  opacity: 0.92;
  background: var(--ncr-bg-medical-base);
}

.ncr-medical-bg__grid {
  inset: -24px;
  opacity: 0.28;
  background-image:
    linear-gradient(var(--ncr-color-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--ncr-color-grid) 1px, transparent 1px),
    linear-gradient(115deg, transparent 0 42%, rgba(34, 168, 161, 0.055) 44%, transparent 48%);
  background-size: 48px 48px, 48px 48px, 420px 100%;
  mask-image: radial-gradient(circle at center, black, transparent 78%);
  animation: ncr-shell-data-grid 28s linear infinite;
}

.ncr-medical-bg__eeg {
  position: absolute;
  inset: 12% -8% auto -8%;
  height: 260px;
  opacity: 0.3;
  background:
    linear-gradient(90deg, transparent, rgba(22, 127, 168, 0.12), transparent),
    repeating-linear-gradient(90deg, transparent 0 26px, rgba(22, 127, 168, 0.22) 27px, transparent 30px 52px);
  clip-path: polygon(0 51%, 5% 50%, 8% 44%, 11% 60%, 14% 36%, 17% 56%, 22% 50%, 27% 54%, 31% 42%, 35% 62%, 39% 49%, 44% 52%, 49% 38%, 53% 60%, 58% 48%, 64% 52%, 69% 40%, 74% 59%, 80% 49%, 86% 54%, 92% 45%, 100% 51%, 100% 66%, 0 66%);
  filter: drop-shadow(0 0 10px rgba(34, 168, 161, 0.12));
  animation: ncr-shell-eeg-drift 26s linear infinite;
}

.ncr-medical-bg__wave {
  position: absolute;
  left: 0;
  right: 0;
  top: 24%;
  height: 90px;
  opacity: 0.22;
  background:
    linear-gradient(90deg, transparent, rgba(36, 172, 199, 0.18), transparent),
    repeating-linear-gradient(
      90deg,
      transparent 0 22px,
      rgba(24, 141, 174, 0.24) 23px 24px,
      transparent 25px 50px
    );
  clip-path: polygon(0 48%, 7% 45%, 13% 55%, 18% 41%, 25% 52%, 32% 44%, 39% 50%, 45% 38%, 52% 55%, 58% 42%, 64% 51%, 72% 43%, 79% 57%, 86% 45%, 93% 52%, 100% 48%, 100% 68%, 0 68%);
  animation: ncr-shell-wave 12s linear infinite;
}

.ncr-medical-bg__network {
  position: absolute;
  inset: 0;
  opacity: 0.34;
  background:
    radial-gradient(circle at 24% 28%, rgba(34, 168, 161, 0.32) 0 2px, transparent 3px),
    radial-gradient(circle at 38% 54%, rgba(20, 95, 133, 0.28) 0 2px, transparent 3px),
    radial-gradient(circle at 66% 32%, rgba(123, 142, 232, 0.24) 0 2px, transparent 3px),
    radial-gradient(circle at 74% 70%, rgba(26, 155, 181, 0.26) 0 2px, transparent 3px);
}

.ncr-medical-bg__network::before,
.ncr-medical-bg__network::after {
  content: "";
  position: absolute;
  inset: 10% 14%;
  border: 1px solid rgba(86, 177, 205, 0.12);
  transform: skewY(-7deg);
  box-shadow: 0 0 44px rgba(48, 179, 207, 0.12);
}

.ncr-medical-bg__network::after {
  inset: 22% 22% 14% 8%;
  transform: skewY(9deg);
}

.ncr-medical-bg__scan {
  position: absolute;
  inset: 0;
  opacity: 0.22;
  background: linear-gradient(115deg, transparent 0 42%, rgba(255,255,255,0.34) 50%, transparent 58% 100%);
  transform: translateX(-70%);
  animation: ncr-shell-scan 13s cubic-bezier(0.2, 0, 0, 1) infinite;
}

.ncr-medical-bg__focus {
  position: absolute;
  inset: 0;
  opacity: 0.72;
  background:
    radial-gradient(circle at 20% 12%, rgba(34, 168, 161, 0.16), transparent 28%),
    radial-gradient(circle at 82% 8%, rgba(79, 142, 216, 0.14), transparent 24%),
    radial-gradient(circle at 76% 80%, rgba(213, 166, 74, 0.08), transparent 22%);
}

.ncr-medical-bg[data-training-mode="true"] .ncr-medical-bg__grid,
.ncr-medical-bg[data-training-mode="true"] .ncr-medical-bg__network,
.ncr-medical-bg[data-training-mode="true"] .ncr-medical-bg__eeg {
  opacity: 0.16;
}

.ncr-medical-bg[data-training-mode="true"] .ncr-medical-bg__wave {
  opacity: 0.14;
  animation-duration: 28s;
}

.ncr-medical-bg[data-training-mode="true"] .ncr-medical-bg__scan {
  opacity: 0;
  animation: none;
}

.ncr-shell-sidebar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100vh;
  padding: 18px 14px;
  border-right: 1px solid rgba(125, 192, 218, 0.24);
  background: linear-gradient(180deg, rgba(255,255,255,0.72), rgba(238, 250, 253, 0.42));
  backdrop-filter: blur(22px);
  box-shadow: 18px 0 58px rgba(20, 85, 121, 0.1);
}

[data-ncr-theme="neuro-dark"] .ncr-shell-sidebar {
  background: linear-gradient(180deg, rgba(9, 26, 43, 0.86), rgba(8, 23, 39, 0.58));
  border-right-color: rgba(106, 202, 230, 0.2);
}

.ncr-shell-sidebar__brand {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 12px;
  align-items: center;
  padding: 10px 10px 14px;
  border-bottom: 1px solid rgba(116, 185, 212, 0.24);
}

.ncr-shell-sidebar__logo {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  color: #ffffff;
  font-weight: 800;
  background: linear-gradient(135deg, #145f85, #22a8a1);
  box-shadow: 0 0 28px rgba(34, 168, 161, 0.34);
}

.ncr-shell-sidebar__brand strong,
.ncr-shell-sidebar__brand span {
  display: block;
}

.ncr-shell-sidebar__brand strong {
  font-size: 15px;
  letter-spacing: 0;
}

.ncr-shell-sidebar__brand span {
  margin-top: 2px;
  color: var(--ncr-color-text-muted);
  font-size: 12px;
}

.ncr-shell-sidebar__nav {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
  padding: 2px;
}

.ncr-shell-sidebar__link {
  position: relative;
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 10px;
  width: 100%;
  padding: 11px 10px;
  border: 1px solid transparent;
  border-radius: 16px;
  color: var(--ncr-color-text);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition:
    transform var(--ncr-motion-normal) var(--ncr-motion-ease),
    border-color var(--ncr-motion-normal) var(--ncr-motion-ease),
    background var(--ncr-motion-normal) var(--ncr-motion-ease),
    box-shadow var(--ncr-motion-normal) var(--ncr-motion-ease);
}

.ncr-shell-sidebar__link:hover,
.ncr-shell-sidebar__link:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(70, 175, 207, 0.36);
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 12px 34px rgba(34, 120, 161, 0.12);
  outline: none;
}

.ncr-shell-sidebar__link[data-active="true"] {
  border-color: rgba(34, 168, 161, 0.54);
  background: linear-gradient(135deg, rgba(255,255,255,0.78), rgba(221, 248, 250, 0.54));
  box-shadow: 0 0 0 1px rgba(104, 216, 231, 0.16), 0 18px 40px rgba(24, 130, 166, 0.16);
}

[data-ncr-theme="neuro-dark"] .ncr-shell-sidebar__link[data-active="true"] {
  background: linear-gradient(135deg, rgba(15, 50, 78, 0.86), rgba(11, 68, 75, 0.5));
}

.ncr-shell-sidebar__icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 12px;
  color: var(--ncr-color-primary);
  background: rgba(73, 188, 219, 0.1);
  font-size: 12px;
  font-weight: 800;
}

.ncr-shell-sidebar__label {
  display: block;
  font-size: 14px;
  font-weight: 760;
}

.ncr-shell-sidebar__desc {
  display: block;
  margin-top: 2px;
  color: var(--ncr-color-text-muted);
  font-size: 12px;
  line-height: 1.35;
}

.ncr-shell-sidebar__footer {
  display: grid;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(116, 185, 212, 0.22);
}

.ncr-shell-sidebar__logout,
.ncr-shell-mobile-toggle,
.ncr-shell-icon-button,
.ncr-shell-theme-toggle {
  border: 1px solid rgba(103, 181, 211, 0.3);
  border-radius: 999px;
  color: var(--ncr-color-text);
  background: rgba(255,255,255,0.58);
  cursor: pointer;
  transition:
    transform var(--ncr-motion-fast) var(--ncr-motion-ease),
    box-shadow var(--ncr-motion-fast) var(--ncr-motion-ease),
    border-color var(--ncr-motion-fast) var(--ncr-motion-ease);
}

.ncr-shell-sidebar__logout {
  padding: 10px 12px;
  font-weight: 700;
}

.ncr-shell-sidebar__logout:hover,
.ncr-shell-mobile-toggle:hover,
.ncr-shell-icon-button:hover,
.ncr-shell-theme-toggle:hover {
  transform: translateY(-1px);
  border-color: rgba(34, 168, 161, 0.46);
  box-shadow: 0 12px 28px rgba(25, 126, 164, 0.14);
}

.ncr-shell-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 72px;
  padding: 12px 16px;
  border: 1px solid rgba(126, 190, 217, 0.26);
  border-radius: 22px;
  background: rgba(255,255,255,0.64);
  backdrop-filter: blur(20px);
  box-shadow: 0 18px 42px rgba(20, 85, 121, 0.1), inset 0 1px 0 rgba(255,255,255,0.62);
}

[data-ncr-theme="neuro-dark"] .ncr-shell-topbar,
[data-ncr-theme="neuro-dark"] .ncr-shell-icon-button,
[data-ncr-theme="neuro-dark"] .ncr-shell-theme-toggle,
[data-ncr-theme="neuro-dark"] .ncr-shell-sidebar__logout {
  background: rgba(11, 35, 55, 0.72);
}

.ncr-shell-topbar__left,
.ncr-shell-topbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.ncr-shell-topbar__identity {
  min-width: 0;
}

.ncr-shell-topbar__identity strong,
.ncr-shell-topbar__identity span {
  display: block;
}

.ncr-shell-topbar__identity strong {
  overflow: hidden;
  max-width: 280px;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ncr-shell-topbar__identity span {
  margin-top: 2px;
  color: var(--ncr-color-text-muted);
  font-size: 12px;
}

.ncr-shell-mobile-toggle,
.ncr-shell-icon-button,
.ncr-shell-theme-toggle {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
}

.ncr-shell-mobile-toggle {
  display: none;
}

.ncr-role-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(99, 186, 217, 0.3);
  border-radius: 999px;
  padding: 8px 10px;
  background: rgba(255,255,255,0.58);
  font-size: 13px;
  font-weight: 760;
}

.ncr-role-badge::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--ncr-color-monitoring);
  box-shadow: 0 0 16px var(--ncr-color-glow);
}

.ncr-role-badge[data-role="parent"]::before {
  background: var(--ncr-color-calm);
}

.ncr-role-badge[data-role="org_admin"]::before {
  background: var(--ncr-color-primary);
}

.ncr-shell-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--ncr-color-text-muted);
  font-size: 13px;
}

.ncr-shell-breadcrumb a,
.ncr-shell-breadcrumb span {
  color: inherit;
  text-decoration: none;
}

.ncr-shell-breadcrumb__current {
  color: var(--ncr-color-text);
  font-weight: 740;
}

.ncr-shell-breadcrumb__separator {
  opacity: 0.5;
}

.ncr-shell-eeg {
  display: inline-grid;
  grid-template-columns: 8px 1fr;
  gap: 8px;
  align-items: center;
  min-width: 176px;
  border: 1px solid rgba(103, 181, 211, 0.28);
  border-radius: 999px;
  padding: 8px 10px;
  background: rgba(255,255,255,0.48);
}

.ncr-shell-eeg__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--ncr-color-monitoring);
  box-shadow: 0 0 14px rgba(34, 168, 161, 0.7);
}

.ncr-shell-eeg[data-status="unstable"] .ncr-shell-eeg__dot,
.ncr-shell-eeg[data-status="disconnected"] .ncr-shell-eeg__dot {
  background: var(--ncr-color-warning);
}

.ncr-shell-eeg strong,
.ncr-shell-eeg span {
  display: block;
}

.ncr-shell-eeg strong {
  font-size: 12px;
}

.ncr-shell-eeg span {
  color: var(--ncr-color-text-muted);
  font-size: 11px;
}

.ncr-shell-notifications {
  position: relative;
}

.ncr-shell-notifications__count {
  position: absolute;
  top: -4px;
  right: -3px;
  display: grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  color: #ffffff;
  background: linear-gradient(135deg, #1a9bb5, #22a8a1);
  font-size: 10px;
  font-weight: 800;
}

.ncr-shell-notifications__panel {
  position: absolute;
  right: 0;
  top: 48px;
  z-index: 10;
  width: min(340px, calc(100vw - 32px));
  border: 1px solid rgba(116, 185, 212, 0.28);
  border-radius: 18px;
  background: rgba(255,255,255,0.88);
  box-shadow: 0 24px 64px rgba(20, 85, 121, 0.18);
  backdrop-filter: blur(18px);
  overflow: hidden;
}

[data-ncr-theme="neuro-dark"] .ncr-shell-notifications__panel {
  background: rgba(10, 31, 50, 0.94);
}

.ncr-shell-notifications__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(116, 185, 212, 0.22);
}

.ncr-shell-notifications__list {
  display: grid;
  gap: 0;
  max-height: 320px;
  overflow: auto;
}

.ncr-shell-notifications__item {
  padding: 13px 16px;
  border-bottom: 1px solid rgba(116, 185, 212, 0.16);
}

.ncr-shell-notifications__item strong,
.ncr-shell-notifications__item span,
.ncr-shell-notifications__item p {
  display: block;
}

.ncr-shell-notifications__item span {
  margin-top: 2px;
  color: var(--ncr-color-text-muted);
  font-size: 11px;
}

.ncr-shell-notifications__item p {
  margin: 6px 0 0;
  color: var(--ncr-color-text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.ncr-shell-theme-toggle {
  width: auto;
  min-width: 84px;
  padding: 0 12px;
  font-weight: 750;
}

.ncr-main-workspace {
  min-width: 0;
  animation: ncr-shell-page-enter 420ms cubic-bezier(0.2, 0, 0, 1) both;
}

.ncr-main-workspace__surface {
  min-width: 0;
}

.ncr-shell__content {
  padding: 0;
}

.ncr-shell-topbar {
  display: grid;
  grid-template-columns: minmax(300px, 0.9fr) minmax(360px, 1.2fr) auto;
  align-items: center;
  min-height: 78px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.72), rgba(232, 249, 252, 0.46)),
    repeating-linear-gradient(90deg, transparent 0 28px, rgba(20, 95, 133, 0.035) 29px 30px);
}

.ncr-shell-topbar__system {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 11px;
  align-items: center;
  min-width: 188px;
}

.ncr-shell-topbar__system-mark {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 15px;
  color: #ffffff;
  background:
    linear-gradient(135deg, var(--ncr-color-primary), var(--ncr-color-monitoring)),
    radial-gradient(circle, rgba(255, 255, 255, 0.28), transparent 60%);
  box-shadow: 0 0 28px rgba(34, 168, 161, 0.22);
  font-size: 13px;
  font-weight: 900;
}

.ncr-shell-topbar__system strong,
.ncr-shell-topbar__system span {
  display: block;
}

.ncr-shell-topbar__system strong {
  font-size: 14px;
  letter-spacing: 0;
}

.ncr-shell-topbar__system span {
  margin-top: 2px;
  color: var(--ncr-color-text-muted);
  font-size: 11px;
}

.ncr-shell-topbar__center {
  min-width: 0;
}

.ncr-shell-avatar {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(34, 168, 161, 0.36);
  border-radius: 999px;
  color: #ffffff;
  background: linear-gradient(135deg, #145f85, #22a8a1);
  box-shadow: 0 0 28px rgba(34, 168, 161, 0.22);
  font-size: 12px;
  font-weight: 900;
}

.ncr-system-status-cluster {
  display: flex;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
  padding: 2px;
}

.ncr-system-status-pill {
  display: inline-grid;
  grid-template-columns: 8px auto auto;
  gap: 7px;
  align-items: center;
  min-height: 34px;
  border: 1px solid rgba(126, 190, 217, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.56);
  color: var(--ncr-color-text-muted);
  white-space: nowrap;
  padding: 7px 10px;
}

.ncr-system-status-pill i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--ncr-color-monitoring);
  box-shadow: 0 0 14px rgba(34, 168, 161, 0.48);
}

.ncr-system-status-pill[data-tone="warning"] i {
  background: var(--ncr-color-warning);
  box-shadow: 0 0 14px rgba(201, 151, 53, 0.36);
}

.ncr-system-status-pill[data-tone="notice"] i {
  background: var(--ncr-color-calm);
}

.ncr-system-status-pill span {
  font-size: 11px;
  font-weight: 820;
}

.ncr-system-status-pill strong {
  color: var(--ncr-color-text);
  font-size: 12px;
  font-weight: 860;
}

.ncr-shell-sidebar {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.76), rgba(238, 250, 253, 0.44)),
    radial-gradient(circle at 12% 6%, rgba(34, 168, 161, 0.14), transparent 30%);
}

.ncr-shell-sidebar__brand {
  position: relative;
  grid-template-columns: 42px minmax(0, 1fr) 32px;
}

.ncr-shell-sidebar__collapse {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(103, 181, 211, 0.28);
  border-radius: 999px;
  color: var(--ncr-color-primary);
  background: rgba(255, 255, 255, 0.58);
  cursor: pointer;
}

.ncr-shell-sidebar__demo {
  border: 1px solid rgba(201, 151, 53, 0.28);
  border-radius: 16px;
  background: rgba(255, 250, 236, 0.58);
  color: #775617;
  padding: 10px 11px;
}

.ncr-shell-sidebar__demo strong,
.ncr-shell-sidebar__demo span {
  display: block;
}

.ncr-shell-sidebar__demo span {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.45;
}

.ncr-shell-sidebar__link {
  grid-template-columns: 34px minmax(0, 1fr) auto;
}

.ncr-shell-sidebar__link[data-active="true"]::before {
  content: "";
  position: absolute;
  inset: 9px auto 9px 0;
  width: 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--ncr-color-clinical), var(--ncr-color-monitoring));
  box-shadow: 0 0 18px rgba(34, 168, 161, 0.46);
}

.ncr-shell-sidebar__text {
  min-width: 0;
}

.ncr-shell-sidebar__badge {
  align-self: start;
  border: 1px solid rgba(34, 168, 161, 0.28);
  border-radius: 999px;
  background: rgba(232, 251, 249, 0.72);
  color: var(--ncr-color-primary);
  font-size: 11px;
  font-weight: 820;
  padding: 4px 7px;
}

.ncr-shell-sidebar__system {
  display: grid;
  gap: 4px;
  border: 1px solid rgba(126, 190, 217, 0.22);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.45);
  padding: 11px;
}

.ncr-shell-sidebar__system span,
.ncr-shell-sidebar__system em {
  color: var(--ncr-color-text-muted);
  font-size: 11px;
  font-style: normal;
}

.ncr-shell-sidebar__system strong {
  color: var(--ncr-color-text);
  font-size: 13px;
}

.ncr-shell-sidebar[data-collapsed="true"] {
  width: 84px;
  min-width: 84px;
}

.ncr-shell-sidebar[data-collapsed="true"] .ncr-shell-sidebar__brand {
  grid-template-columns: 42px;
  justify-content: center;
}

.ncr-shell-sidebar[data-collapsed="true"] .ncr-shell-sidebar__brand div,
.ncr-shell-sidebar[data-collapsed="true"] .ncr-shell-sidebar__demo,
.ncr-shell-sidebar[data-collapsed="true"] .ncr-shell-sidebar__text,
.ncr-shell-sidebar[data-collapsed="true"] .ncr-shell-sidebar__badge,
.ncr-shell-sidebar[data-collapsed="true"] .ncr-shell-sidebar__system,
.ncr-shell-sidebar[data-collapsed="true"] .ncr-shell-sidebar__logout {
  display: none;
}

.ncr-shell-sidebar[data-collapsed="true"] .ncr-shell-sidebar__collapse {
  position: absolute;
  right: -10px;
  top: 16px;
}

.ncr-shell-sidebar[data-collapsed="true"] .ncr-shell-sidebar__link {
  grid-template-columns: 34px;
  justify-content: center;
}

.ncr-page-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  border: 1px solid rgba(126, 190, 217, 0.22);
  border-radius: 24px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(232, 249, 252, 0.42)),
    radial-gradient(circle at 88% 12%, rgba(34, 168, 161, 0.11), transparent 34%);
  box-shadow: 0 20px 56px rgba(20, 85, 121, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  padding: 20px;
}

.ncr-page-header h1,
.ncr-page-header p {
  margin: 0;
}

.ncr-page-header h1 {
  font-size: clamp(26px, 4vw, 42px);
  line-height: 1.15;
}

.ncr-page-header__eyebrow {
  color: var(--ncr-color-clinical);
  font-size: 12px;
  font-weight: 860;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.ncr-page-header__description {
  max-width: 760px;
  margin-top: 10px !important;
  color: var(--ncr-color-text-muted);
  line-height: 1.65;
}

.ncr-page-header__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.ncr-page-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.ncr-shell-state {
  position: relative;
  overflow: hidden;
  display: grid;
  justify-items: center;
  gap: 12px;
  min-height: 320px;
  border: 1px solid rgba(126, 190, 217, 0.24);
  border-radius: 26px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.66), rgba(232, 249, 252, 0.4)),
    repeating-linear-gradient(90deg, transparent 0 24px, rgba(20, 95, 133, 0.035) 25px 26px);
  box-shadow: 0 22px 62px rgba(20, 85, 121, 0.08), inset 0 1px 0 rgba(255,255,255,0.62);
  padding: 34px;
  text-align: center;
}

.ncr-shell-state::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 22% 8%, rgba(34, 168, 161, 0.13), transparent 34%),
    linear-gradient(90deg, transparent, rgba(103, 181, 211, 0.09), transparent);
  opacity: 0.9;
}

.ncr-shell-state > * {
  position: relative;
  z-index: 1;
}

.ncr-shell-state__loader,
.ncr-shell-state__mark {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  border-radius: 22px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--ncr-color-primary), var(--ncr-color-monitoring));
  box-shadow: 0 0 30px rgba(34, 168, 161, 0.22);
  font-size: 28px;
  font-weight: 900;
}

.ncr-shell-state__mark {
  letter-spacing: 0;
}

.ncr-shell-state__loader {
  border: 3px solid rgba(34, 168, 161, 0.18);
  border-top-color: var(--ncr-color-primary);
  background: transparent;
  animation: ncr-shell-loading-spin 1.4s linear infinite;
}

.ncr-shell-state--loading {
  border-color: rgba(34, 168, 161, 0.26);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(232, 249, 252, 0.48)),
    repeating-linear-gradient(90deg, transparent 0 24px, rgba(20, 95, 133, 0.035) 25px 26px);
}

.ncr-shell-state--loading .ncr-loading-brain-scan {
  margin-bottom: 4px;
}

.ncr-shell-state--loading .ncr-loading-brain-scan span {
  font-weight: 860;
}

.ncr-shell-state--empty {
  border-style: dashed;
  border-color: rgba(77, 151, 187, 0.26);
}

.ncr-shell-state--empty .ncr-shell-state__mark,
.ncr-shell-state--training .ncr-shell-state__mark,
.ncr-shell-state--report .ncr-shell-state__mark {
  background: linear-gradient(135deg, rgba(77, 151, 187, 0.9), rgba(34, 168, 161, 0.82));
}

.ncr-shell-state h2,
.ncr-shell-state p {
  margin: 0;
}

.ncr-shell-state p {
  max-width: 520px;
  color: var(--ncr-color-text-muted);
  line-height: 1.62;
}

.ncr-shell-state__action {
  border: 1px solid rgba(34, 168, 161, 0.34);
  border-radius: 999px;
  background: linear-gradient(135deg, var(--ncr-color-primary), var(--ncr-color-monitoring));
  color: #ffffff;
  cursor: pointer;
  font-weight: 820;
  padding: 11px 16px;
}

.ncr-shell-state__action:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 38px rgba(20, 95, 133, 0.18);
}

.ncr-shell-state__hint-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 620px;
}

.ncr-shell-state__hint-grid span {
  border: 1px solid rgba(126, 190, 217, 0.26);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  color: var(--ncr-color-text-muted);
  font-size: 12px;
  font-weight: 820;
  padding: 7px 10px;
}

.ncr-shell-state__steps {
  display: grid;
  gap: 10px;
  width: min(560px, 100%);
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  text-align: left;
}

.ncr-shell-state__steps li {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border: 1px solid rgba(126, 190, 217, 0.24);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.56);
  padding: 10px 12px;
}

.ncr-shell-state__steps span {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--ncr-color-primary), var(--ncr-color-monitoring));
  font-size: 12px;
}

.ncr-shell-state__steps strong {
  color: var(--ncr-color-text);
  font-size: 13px;
  line-height: 1.45;
}

.ncr-shell-state__support {
  max-width: 620px !important;
  border: 1px solid rgba(201, 151, 53, 0.24);
  border-radius: 16px;
  background: rgba(255, 250, 236, 0.64);
  padding: 10px 12px;
  font-size: 13px;
}

.ncr-shell-state--device {
  border-color: rgba(201, 151, 53, 0.3);
  background:
    linear-gradient(135deg, rgba(255, 250, 236, 0.72), rgba(232, 249, 252, 0.36)),
    repeating-linear-gradient(90deg, transparent 0 24px, rgba(20, 95, 133, 0.035) 25px 26px);
}

.ncr-shell-state--device .ncr-shell-state__mark {
  font-size: 18px;
  background: linear-gradient(135deg, #a87520, var(--ncr-color-warning));
}

.ncr-shell-state--permission {
  border-color: rgba(123, 142, 232, 0.24);
  background:
    linear-gradient(135deg, rgba(246, 248, 255, 0.72), rgba(255, 255, 255, 0.52)),
    repeating-linear-gradient(90deg, transparent 0 24px, rgba(123, 142, 232, 0.035) 25px 26px);
}

.ncr-shell-state--permission .ncr-shell-state__mark {
  background: linear-gradient(135deg, var(--ncr-color-calm), #7b8ee8);
}

.ncr-shell-state--error {
  border-color: rgba(201, 151, 53, 0.28);
  background: linear-gradient(135deg, rgba(255, 250, 236, 0.72), rgba(255, 255, 255, 0.52));
}

.ncr-shell-state--error .ncr-shell-state__mark {
  background: linear-gradient(135deg, #a87520, var(--ncr-color-warning));
}

.ncr-skeleton-medical-card {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  min-width: 0;
  border: 1px solid rgba(126, 190, 217, 0.24);
  border-radius: 22px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.72), rgba(232, 249, 252, 0.42)),
    repeating-linear-gradient(90deg, transparent 0 24px, rgba(20, 95, 133, 0.035) 25px 26px);
  box-shadow: 0 18px 46px rgba(20, 85, 121, 0.08), inset 0 1px 0 rgba(255,255,255,0.6);
  padding: 18px;
}

.ncr-skeleton-medical-card[data-compact="true"] {
  padding: 14px;
}

.ncr-skeleton-medical-card__badge,
.ncr-skeleton-medical-card__lines i {
  position: relative;
  overflow: hidden;
  background: rgba(126, 190, 217, 0.2);
}

.ncr-skeleton-medical-card__badge::after,
.ncr-skeleton-medical-card__lines i::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.62), transparent);
  transform: translateX(-100%);
  animation: ncr-shell-skeleton-scan 2.6s ease-in-out infinite;
}

.ncr-skeleton-medical-card__badge {
  width: 48px;
  height: 48px;
  border-radius: 18px;
}

.ncr-skeleton-medical-card strong {
  color: var(--ncr-color-text);
  font-size: 14px;
}

.ncr-skeleton-medical-card__lines {
  display: grid;
  gap: 9px;
  margin-top: 12px;
}

.ncr-skeleton-medical-card__lines i {
  display: block;
  width: calc(94% - var(--skeleton-row, 0) * 8%);
  height: 11px;
  border-radius: 999px;
  animation-delay: calc(var(--skeleton-row, 0) * 120ms);
}

.ncr-workspace-overview {
  display: grid;
  gap: 18px;
  padding: 22px;
}

.ncr-workspace-overview__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.75fr);
  gap: 18px;
}

.ncr-workspace-overview__card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(126, 190, 217, 0.26);
  border-radius: 26px;
  padding: 18px;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.72), rgba(231, 249, 252, 0.5)),
    radial-gradient(circle at 88% 0%, rgba(123, 142, 232, 0.14), transparent 34%);
  box-shadow: 0 22px 58px rgba(20, 85, 121, 0.1), inset 0 1px 0 rgba(255,255,255,0.62);
}

.ncr-workspace-overview__card::after {
  content: "";
  position: absolute;
  inset: auto 18px 16px 18px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(34, 168, 161, 0.54), transparent);
}

[data-ncr-theme="neuro-dark"] .ncr-workspace-overview__card {
  background: rgba(11, 35, 55, 0.68);
}

.ncr-workspace-overview__card h1,
.ncr-workspace-overview__card h2,
.ncr-workspace-overview__card p {
  margin: 0;
}

.ncr-workspace-overview__card h1 {
  max-width: 720px;
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.16;
}

.ncr-workspace-overview__card p {
  margin-top: 10px;
  color: var(--ncr-color-text-muted);
  line-height: 1.65;
}

.ncr-workspace-overview__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.ncr-workspace-overview__metric {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(103, 181, 211, 0.24);
  border-radius: 18px;
  padding: 14px;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.56), rgba(232, 249, 252, 0.36)),
    repeating-linear-gradient(90deg, transparent 0 18px, rgba(26, 155, 181, 0.05) 19px 20px);
}

.ncr-workspace-overview__metric::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: linear-gradient(180deg, var(--ncr-color-clinical), var(--ncr-color-monitoring));
}

.ncr-workspace-overview__metric span,
.ncr-workspace-overview__metric strong {
  display: block;
}

.ncr-workspace-overview__metric span {
  color: var(--ncr-color-text-muted);
  font-size: 12px;
}

.ncr-workspace-overview__metric strong {
  margin-top: 8px;
  font-size: 24px;
}

.ncr-workspace-overview__metric button {
  position: relative;
  z-index: 1;
  margin-top: 12px;
  border: 1px solid rgba(70, 175, 207, 0.34);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  color: var(--ncr-color-primary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  padding: 8px 12px;
  transition:
    border-color var(--ncr-motion-fast) var(--ncr-motion-ease),
    box-shadow var(--ncr-motion-fast) var(--ncr-motion-ease),
    transform var(--ncr-motion-fast) var(--ncr-motion-ease);
}

.ncr-workspace-overview__metric button:hover,
.ncr-workspace-overview__metric button:focus-visible {
  border-color: rgba(34, 168, 161, 0.54);
  box-shadow: 0 12px 28px rgba(25, 126, 164, 0.14);
  outline: none;
  transform: translateY(-1px);
}

.ncr-workspace-api-notice {
  border: 1px solid rgba(103, 181, 211, 0.28);
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.68), rgba(232, 249, 252, 0.42)),
    repeating-linear-gradient(90deg, transparent 0 20px, rgba(26, 155, 181, 0.04) 21px 22px);
  box-shadow: 0 16px 42px rgba(20, 85, 121, 0.08), inset 0 1px 0 rgba(255,255,255,0.58);
  color: var(--ncr-color-text-muted);
  font-size: 13px;
  font-weight: 780;
  margin-bottom: 14px;
  padding: 12px 14px;
}

.ncr-workspace-api-notice--warning {
  border-color: rgba(201, 151, 53, 0.34);
  background:
    linear-gradient(135deg, rgba(255,255,255,0.76), rgba(255, 248, 232, 0.52)),
    repeating-linear-gradient(90deg, transparent 0 20px, rgba(201, 151, 53, 0.045) 21px 22px);
  color: #7b6127;
}

@keyframes ncr-shell-wave {
  from {
    transform: translateX(-4%);
  }
  to {
    transform: translateX(4%);
  }
}

@keyframes ncr-shell-data-grid {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(48px, 0, 0);
  }
}

@keyframes ncr-shell-eeg-drift {
  from {
    transform: translate3d(-3%, 0, 0);
  }
  to {
    transform: translate3d(3%, 0, 0);
  }
}

@keyframes ncr-shell-scan {
  0%,
  26% {
    transform: translateX(-70%);
  }
  62%,
  100% {
    transform: translateX(70%);
  }
}

@keyframes ncr-shell-page-enter {
  from {
    opacity: 0;
    transform: translate3d(0, 12px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes ncr-shell-loading-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes ncr-shell-skeleton-scan {
  0%,
  40% {
    transform: translateX(-100%);
  }
  82%,
  100% {
    transform: translateX(100%);
  }
}

@media (max-width: 1040px) {
  .ncr-shell__layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .ncr-shell-sidebar {
    position: fixed;
    z-index: 20;
    width: min(320px, calc(100vw - 32px));
    min-width: 0;
    transform: translateX(-110%);
    transition: transform var(--ncr-motion-normal) var(--ncr-motion-emphasis);
  }

  .ncr-shell-sidebar[data-open="true"] {
    transform: translateX(0);
  }

  .ncr-shell__overlay {
    position: fixed;
    inset: 0;
    z-index: 19;
    display: block;
    background: rgba(6, 18, 31, 0.22);
    backdrop-filter: blur(3px);
  }

  .ncr-shell-mobile-toggle {
    display: grid;
  }
}

@media (max-width: 780px) {
  .ncr-shell__content-frame {
    padding: 12px;
  }

  .ncr-shell-topbar {
    align-items: flex-start;
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .ncr-shell-topbar__left,
  .ncr-shell-topbar__center,
  .ncr-shell-topbar__right {
    width: 100%;
    flex-wrap: wrap;
  }

  .ncr-system-status-cluster {
    justify-content: flex-start;
  }

  .ncr-page-header {
    display: grid;
  }

  .ncr-shell-eeg {
    min-width: 0;
    flex: 1;
  }

  .ncr-workspace-overview__hero,
  .ncr-workspace-overview__metrics {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ncr-medical-bg__eeg,
  .ncr-medical-bg__grid,
  .ncr-medical-bg__wave,
  .ncr-medical-bg__scan,
  .ncr-main-workspace,
  .ncr-shell-state__loader,
  .ncr-skeleton-medical-card__badge::after,
  .ncr-skeleton-medical-card__lines i::after,
  .ncr-shell-sidebar__link,
  .ncr-shell-sidebar,
  .ncr-shell-sidebar__logout,
  .ncr-shell-mobile-toggle,
  .ncr-shell-icon-button,
  .ncr-shell-theme-toggle {
    animation: none !important;
    transition: none !important;
  }
}
`;
