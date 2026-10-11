export const TRAINING_SESSION_SHELL_CSS = `
.ncr-training-session,
.ncr-training-session * {
  box-sizing: border-box;
}

.ncr-training-session {
  width: 100%;
  min-height: min(860px, 100vh);
  display: grid;
  gap: 16px;
  color: #102b3a;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ncr-training-topbar,
.ncr-training-session__setup,
.ncr-training-focus-stage,
.ncr-training-side-monitor,
.ncr-training-session__result {
  border: 1px solid rgba(126, 190, 217, 0.26);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(238, 250, 252, 0.68)),
    radial-gradient(circle at top right, rgba(34, 168, 161, 0.08), transparent 32%);
  box-shadow:
    0 18px 42px rgba(20, 85, 121, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.74);
  backdrop-filter: blur(18px);
}

.ncr-training-topbar {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(420px, 1.2fr) auto;
  gap: 14px;
  align-items: center;
  border-radius: 22px;
  padding: 14px;
}

.ncr-training-topbar__identity span,
.ncr-training-topbar__status span,
.ncr-training-topbar__eeg small,
.ncr-difficulty-badge span,
.ncr-training-side-monitor span,
.ncr-training-side-monitor small,
.ncr-training-overlay span,
.ncr-eeg-safety-prompt span {
  color: #5f7280;
  font-size: 12px;
  line-height: 1.45;
}

.ncr-training-topbar__identity strong {
  display: block;
  margin-top: 4px;
  color: #0d2533;
  font-size: clamp(20px, 2.3vw, 28px);
  line-height: 1.12;
}

.ncr-training-topbar__identity p {
  margin: 6px 0 0;
  color: #5f7280;
  line-height: 1.5;
}

.ncr-training-topbar__status {
  display: grid;
  grid-template-columns: 62px minmax(92px, 0.8fr) minmax(118px, 1fr) minmax(130px, 1fr);
  gap: 10px;
  align-items: center;
}

.ncr-training-topbar__status > div:not(.ncr-session-progress-ring),
.ncr-difficulty-badge,
.ncr-training-topbar__eeg {
  min-height: 58px;
  border: 1px solid rgba(126, 190, 217, 0.22);
  border-radius: 16px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.64);
}

.ncr-training-topbar__status strong,
.ncr-difficulty-badge strong,
.ncr-training-topbar__eeg strong {
  display: block;
  margin-top: 4px;
  color: #0d2533;
  font-size: 17px;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.ncr-training-topbar__eeg[data-tone="watch"],
.ncr-training-topbar__eeg[data-tone="pause"] {
  border-color: rgba(208, 145, 42, 0.35);
  background: rgba(255, 247, 228, 0.72);
}

.ncr-training-topbar__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.ncr-training-topbar__actions button,
.ncr-training-overlay button {
  min-height: 40px;
  border: 1px solid rgba(34, 168, 161, 0.3);
  border-radius: 12px;
  padding: 0 13px;
  color: #145f85;
  background: rgba(255, 255, 255, 0.72);
  font: inherit;
  font-weight: 820;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.ncr-training-topbar__actions button:hover,
.ncr-training-overlay button:hover {
  transform: translateY(-1px);
  border-color: rgba(34, 168, 161, 0.46);
  box-shadow: 0 10px 24px rgba(20, 85, 121, 0.12);
}

.ncr-training-topbar__actions button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.ncr-training-topbar__primary,
.ncr-training-overlay button:not(.is-secondary) {
  color: #ffffff !important;
  border-color: rgba(34, 168, 161, 0.2) !important;
  background: linear-gradient(135deg, #145f85, #1a9bb5, #22a8a1) !important;
}

.ncr-session-progress-ring {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.94) 56%, transparent 57%),
    conic-gradient(#22a8a1 var(--session-progress), rgba(126, 190, 217, 0.2) 0);
  box-shadow:
    inset 0 0 16px rgba(26, 155, 181, 0.12),
    0 0 18px rgba(34, 168, 161, 0.1);
}

.ncr-session-progress-ring span {
  color: #145f85;
  font-size: 12px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.ncr-training-session__setup {
  border-radius: 20px;
  padding: 14px;
}

.ncr-training-session__setup label {
  display: grid;
  gap: 6px;
  color: #5f7280;
  font-size: 12px;
  font-weight: 760;
}

.ncr-training-session__setup select,
.ncr-training-session__setup input {
  min-height: 40px;
  border: 1px solid rgba(126, 190, 217, 0.34);
  border-radius: 12px;
  padding: 0 11px;
  color: #102b3a;
  background: rgba(255, 255, 255, 0.75);
  font: inherit;
}

.ncr-training-session__workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 330px);
  gap: 16px;
  align-items: start;
}

.ncr-training-focus-stage {
  position: relative;
  overflow: hidden;
  min-height: 520px;
  display: grid;
  align-content: start;
  border-radius: 24px;
  padding: clamp(14px, 2vw, 20px);
}

.ncr-training-focus-stage::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(rgba(126, 190, 217, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(126, 190, 217, 0.08) 1px, transparent 1px);
  background-size: 56px 56px;
  opacity: 0.24;
}

.ncr-training-session[data-training-mode="true"] .ncr-training-focus-stage::before {
  opacity: 0.12;
}

.ncr-training-focus-stage > * {
  position: relative;
  z-index: 1;
}

.ncr-training-session .ncr-go-no-go__header,
.ncr-training-session .ncr-go-no-go__actions,
.ncr-training-session .ncr-stop-signal__header,
.ncr-training-session .ncr-stop-signal__actions,
.ncr-training-session .ncr-rhythm-nav__header,
.ncr-training-session .ncr-rhythm-nav__actions,
.ncr-training-session .ncr-target-game__header,
.ncr-training-session .ncr-target-game__actions,
.ncr-training-session .ncr-sustained-task__header,
.ncr-training-session .ncr-sustained-task__actions {
  display: none !important;
}

.ncr-training-session .ncr-go-no-go__metrics,
.ncr-training-session .ncr-stop-signal__metrics,
.ncr-training-session .ncr-rhythm-nav__metrics,
.ncr-training-session .ncr-target-game__metrics,
.ncr-training-session .ncr-sustained-task__metrics {
  display: none !important;
}

.ncr-training-session canvas {
  max-width: 100%;
  height: auto;
}

.ncr-training-focus-stage__prompt {
  margin-bottom: 12px;
}

.ncr-eeg-safety-prompt {
  display: grid;
  gap: 4px;
  border: 1px solid rgba(126, 190, 217, 0.24);
  border-radius: 16px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.72);
}

.ncr-eeg-safety-prompt[data-tone="watch"],
.ncr-eeg-safety-prompt[data-tone="pause"] {
  border-color: rgba(208, 145, 42, 0.34);
  background: rgba(255, 247, 228, 0.78);
}

.ncr-eeg-safety-prompt strong {
  color: #0d2533;
}

.ncr-training-side-monitor {
  position: sticky;
  top: 14px;
  display: grid;
  gap: 14px;
  border-radius: 24px;
  padding: 16px;
}

.ncr-training-side-monitor header {
  display: grid;
  gap: 6px;
}

.ncr-training-side-monitor header strong {
  color: #0d2533;
  line-height: 1.45;
}

.ncr-training-side-monitor__eeg-pro,
.ncr-training-side-monitor__items {
  display: grid;
  gap: 10px;
}

.ncr-training-side-monitor__eeg-pro {
  grid-template-columns: minmax(0, 1fr);
}

.ncr-training-side-monitor__items article {
  border: 1px solid rgba(126, 190, 217, 0.22);
  border-radius: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.64);
}

.ncr-training-side-monitor__items article[data-tone="watch"],
.ncr-training-side-monitor__items article[data-tone="pause"] {
  border-color: rgba(208, 145, 42, 0.28);
  background: rgba(255, 247, 228, 0.7);
}

.ncr-training-side-monitor__items strong {
  display: block;
  margin-top: 5px;
  color: #0d2533;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.ncr-training-side-monitor__rings {
  display: grid;
  gap: 8px;
}

.ncr-training-side-monitor__progress {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(34, 168, 161, 0.2);
  border-radius: 18px;
  padding: 12px;
  background: rgba(232, 250, 250, 0.62);
}

.ncr-training-side-monitor__progress > span {
  color: #145f85;
  font-size: 26px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.ncr-training-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(247, 253, 255, 0.72);
  backdrop-filter: blur(8px);
}

.ncr-training-overlay article {
  width: min(420px, 100%);
  border: 1px solid rgba(126, 190, 217, 0.3);
  border-radius: 22px;
  padding: 22px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 22px 58px rgba(20, 85, 121, 0.14);
  text-align: center;
}

.ncr-training-overlay h3 {
  margin: 6px 0 0;
  color: #0d2533;
  font-size: 24px;
}

.ncr-training-overlay p {
  margin: 10px 0 0;
  color: #5f7280;
  line-height: 1.6;
}

.ncr-training-overlay div {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 16px;
}

.ncr-training-session__result {
  border-radius: 20px;
  padding: 16px;
}

@media (max-width: 1120px) {
  .ncr-training-topbar {
    grid-template-columns: 1fr;
  }

  .ncr-training-topbar__status {
    grid-template-columns: 62px repeat(3, minmax(0, 1fr));
  }

  .ncr-training-session__workspace {
    grid-template-columns: 1fr;
  }

  .ncr-training-side-monitor {
    position: static;
  }
}

@media (max-width: 760px) {
  .ncr-training-topbar__status,
  .ncr-training-side-monitor__eeg-pro {
    grid-template-columns: 1fr;
  }

  .ncr-training-topbar__actions,
  .ncr-training-overlay div {
    display: grid;
  }

  .ncr-training-topbar__actions button,
  .ncr-training-overlay button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ncr-training-session *,
  .ncr-training-focus-stage::before {
    animation: none !important;
    transition: none !important;
  }

  .ncr-training-topbar__actions button:hover,
  .ncr-training-overlay button:hover {
    transform: none;
  }
}
`;
