export const ADVANCED_FRONTEND_COMPONENTS_CSS = `
.ncr-advanced-style-root {
  display: contents;
}

.ncr-soft-motion {
  --ncr-soft-delay: 0ms;
  animation: ncr-soft-rise 520ms cubic-bezier(0.2, 0, 0, 1) both;
  animation-delay: var(--ncr-soft-delay);
}

.ncr-soft-motion[data-variant="fade"] {
  animation-name: ncr-soft-fade;
}

.ncr-soft-motion[data-variant="scale"] {
  animation-name: ncr-soft-scale;
}

.ncr-soft-motion[data-reduced-motion="true"],
.ncr-soft-motion[data-disabled="true"] {
  animation: none;
}

.ncr-role-entrance-card {
  position: relative;
  min-height: 118px;
  border: 1px solid rgba(126, 190, 217, 0.28);
  border-radius: 22px;
  padding: 14px;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.72), rgba(237, 250, 252, 0.48)),
    radial-gradient(circle at 92% 0%, rgba(95, 206, 190, 0.14), transparent 34%);
  box-shadow: 0 18px 46px rgba(20, 95, 133, 0.1), inset 0 1px 0 rgba(255,255,255,0.72);
  color: var(--ncr-color-text, #102f43);
  cursor: pointer;
  overflow: hidden;
  transition: transform 240ms ease, border-color 240ms ease, box-shadow 240ms ease;
}

.ncr-role-entrance-card::after,
.ncr-training-mission-card::after,
.ncr-medical-chart-container::after,
.ncr-consent-notice-panel::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(110deg, transparent 0 40%, rgba(255,255,255,0.3) 50%, transparent 60% 100%);
  transform: translateX(-120%);
  opacity: 0.62;
  animation: ncr-advanced-sheen 8.8s cubic-bezier(0.2, 0, 0, 1) infinite;
}

.ncr-role-entrance-card:hover {
  transform: translateY(-2px);
  border-color: rgba(34, 168, 161, 0.46);
  box-shadow: 0 24px 58px rgba(20, 95, 133, 0.14), 0 0 0 1px rgba(34, 168, 161, 0.08);
}

.ncr-role-entrance-card[data-selected="true"] {
  border-color: rgba(34, 168, 161, 0.68);
  box-shadow:
    0 26px 64px rgba(20, 95, 133, 0.16),
    0 0 0 1px rgba(34, 168, 161, 0.22),
    0 0 36px rgba(34, 168, 161, 0.16);
}

.ncr-role-entrance-card__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.ncr-role-entrance-card__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 16px;
  color: #145f85;
  background: rgba(222, 247, 251, 0.86);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
}

.ncr-role-entrance-card__icon svg {
  width: 25px;
  height: 25px;
}

.ncr-role-entrance-card__body {
  display: grid;
  gap: 4px;
  min-width: 0;
  text-align: left;
}

.ncr-role-entrance-card__body span,
.ncr-role-entrance-card__status,
.ncr-training-mission-card__subtitle,
.ncr-system-health-indicator__item span,
.ncr-consent-notice-panel p,
.ncr-consent-notice-panel li {
  color: var(--ncr-color-text-muted, #547086);
}

.ncr-role-entrance-card__overline,
.ncr-advanced-eyebrow {
  color: #145f85;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ncr-role-entrance-card__body strong {
  color: var(--ncr-color-text, #102f43);
  font-size: 17px;
  line-height: 1.2;
}

.ncr-role-entrance-card__body em {
  color: #23566f;
  font-size: 13px;
  font-style: normal;
  font-weight: 800;
}

.ncr-role-entrance-card__status {
  position: absolute;
  right: 12px;
  bottom: 10px;
  z-index: 1;
  font-size: 11px;
  font-weight: 800;
}

.ncr-demo-mode-badge,
.ncr-patient-risk-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: fit-content;
  border: 1px solid rgba(126, 190, 217, 0.28);
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(255,255,255,0.66);
  color: #145f85;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  box-shadow: 0 10px 26px rgba(20, 95, 133, 0.09);
}

.ncr-demo-mode-badge::before,
.ncr-patient-risk-badge::before,
.ncr-system-health-indicator__dot {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--ncr-badge-color, #22a8a1);
  box-shadow: 0 0 18px var(--ncr-badge-glow, rgba(34, 168, 161, 0.36));
}

.ncr-patient-risk-badge[data-severity="watch"],
.ncr-patient-risk-badge[data-severity="needs_review"],
.ncr-patient-risk-badge[data-severity="action_required"] {
  --ncr-badge-color: #c17a35;
  --ncr-badge-glow: rgba(193, 122, 53, 0.28);
  border-color: rgba(193, 122, 53, 0.28);
  color: #7b4b1f;
  background: rgba(255, 247, 235, 0.82);
}

.ncr-patient-risk-badge[data-severity="none"],
.ncr-patient-risk-badge[data-severity="info"] {
  --ncr-badge-color: #62b894;
  --ncr-badge-glow: rgba(98, 184, 148, 0.28);
}

.ncr-system-health-indicator {
  display: grid;
  gap: 10px;
}

.ncr-system-health-indicator[data-layout="inline"] {
  display: flex;
  flex-wrap: wrap;
}

.ncr-system-health-indicator__item {
  display: inline-grid;
  grid-template-columns: auto 1fr;
  gap: 7px 9px;
  align-items: center;
  border: 1px solid rgba(126, 190, 217, 0.24);
  border-radius: 16px;
  padding: 9px 11px;
  background: rgba(255,255,255,0.62);
  box-shadow: 0 12px 30px rgba(20, 95, 133, 0.08);
}

.ncr-system-health-indicator__item strong {
  color: var(--ncr-color-text, #102f43);
  font-size: 13px;
}

.ncr-system-health-indicator__item span {
  grid-column: 2;
  font-size: 12px;
}

.ncr-system-health-indicator__item[data-status="warning"] {
  --ncr-badge-color: #c17a35;
  --ncr-badge-glow: rgba(193, 122, 53, 0.28);
}

.ncr-system-health-indicator__item[data-status="offline"],
.ncr-system-health-indicator__item[data-status="error"] {
  --ncr-badge-color: #b36a4c;
  --ncr-badge-glow: rgba(179, 106, 76, 0.22);
}

.ncr-training-mission-card,
.ncr-medical-chart-container,
.ncr-therapist-command-panel,
.ncr-consent-notice-panel {
  position: relative;
  overflow: hidden;
}

.ncr-training-mission-card {
  border: 1px solid rgba(34, 168, 161, 0.34);
}

.ncr-training-mission-card__header,
.ncr-medical-chart-container__header,
.ncr-therapist-command-panel__header,
.ncr-consent-notice-panel__header {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.ncr-training-mission-card__title,
.ncr-medical-chart-container__title,
.ncr-therapist-command-panel__title,
.ncr-consent-notice-panel__title {
  margin: 4px 0 0;
  color: var(--ncr-color-text, #102f43);
  font-size: clamp(20px, 2.2vw, 30px);
  line-height: 1.15;
}

.ncr-training-mission-card__progress {
  display: grid;
  place-items: center;
  width: 94px;
  height: 94px;
  flex: 0 0 auto;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(255,255,255,0.96) 55%, transparent 57%),
    conic-gradient(#22a8a1 var(--ncr-mission-progress), rgba(217, 232, 239, 0.62) 0);
  box-shadow: 0 0 30px rgba(34, 168, 161, 0.16);
}

.ncr-training-mission-card__progress strong {
  color: #145f85;
  font-size: 23px;
}

.ncr-training-mission-card__metrics {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.ncr-training-mission-card__metric {
  border: 1px solid rgba(126, 190, 217, 0.22);
  border-radius: 16px;
  padding: 11px;
  background: rgba(255,255,255,0.56);
}

.ncr-training-mission-card__metric span {
  display: block;
  color: var(--ncr-color-text-muted, #547086);
  font-size: 12px;
}

.ncr-training-mission-card__metric strong {
  display: block;
  margin-top: 5px;
  color: var(--ncr-color-text, #102f43);
  font-size: 16px;
}

.ncr-training-mission-card__tasks {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.ncr-training-mission-card__task {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  border: 1px solid rgba(126, 190, 217, 0.2);
  border-radius: 18px;
  padding: 12px;
  background: rgba(255,255,255,0.58);
}

.ncr-training-mission-card__task-index {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 12px;
  color: #145f85;
  background: rgba(222, 247, 251, 0.82);
  font-weight: 900;
}

.ncr-training-mission-card__task strong {
  display: block;
  color: var(--ncr-color-text, #102f43);
  line-height: 1.25;
}

.ncr-training-mission-card__task span,
.ncr-training-mission-card__task p {
  margin: 3px 0 0;
  color: var(--ncr-color-text-muted, #547086);
  font-size: 12px;
  line-height: 1.45;
}

.ncr-training-mission-card__action {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 8px;
  margin-top: 18px;
}

.ncr-training-mission-card__button {
  position: relative;
  overflow: hidden;
  border: 0;
  border-radius: 20px;
  padding: 15px 18px;
  background: linear-gradient(135deg, #145f85, #22a8a1);
  color: #fff;
  box-shadow: 0 22px 42px rgba(20, 95, 133, 0.22);
  cursor: pointer;
}

.ncr-training-mission-card__button:disabled {
  cursor: not-allowed;
  opacity: 0.64;
}

.ncr-training-mission-card__button span,
.ncr-training-mission-card__button small {
  display: block;
}

.ncr-training-mission-card__button span {
  font-size: 17px;
  font-weight: 900;
}

.ncr-training-mission-card__button small {
  margin-top: 4px;
  opacity: 0.86;
}

.ncr-eeg-wave-canvas {
  display: block;
  width: 100%;
  min-height: var(--ncr-eeg-wave-height, 120px);
  border: 1px solid rgba(126, 190, 217, 0.22);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.48), rgba(232,249,252,0.28)),
    repeating-linear-gradient(90deg, rgba(20,95,133,0.04) 0 1px, transparent 1px 32px);
}

.ncr-cognitive-status-ring {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.ncr-cognitive-status-ring__item {
  display: grid;
  justify-items: center;
  gap: 7px;
  border: 1px solid rgba(126, 190, 217, 0.22);
  border-radius: 18px;
  padding: 12px 8px;
  background: rgba(255,255,255,0.58);
}

.ncr-cognitive-status-ring__ring {
  display: grid;
  place-items: center;
  width: 78px;
  height: 78px;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(255,255,255,0.96) 56%, transparent 58%),
    conic-gradient(var(--ncr-ring-color, #22a8a1) calc(var(--ncr-ring-score) * 1%), rgba(217,232,239,0.62) 0);
  box-shadow: 0 0 24px var(--ncr-ring-glow, rgba(34,168,161,0.18));
  transition: background 520ms ease;
}

.ncr-cognitive-status-ring__item[data-tone="attention"] {
  --ncr-ring-color: #145f85;
  --ncr-ring-glow: rgba(20, 95, 133, 0.18);
}

.ncr-cognitive-status-ring__item[data-tone="relaxation"] {
  --ncr-ring-color: #22a8a1;
  --ncr-ring-glow: rgba(34, 168, 161, 0.2);
}

.ncr-cognitive-status-ring__item[data-tone="fatigue"] {
  --ncr-ring-color: #c17a35;
  --ncr-ring-glow: rgba(193, 122, 53, 0.18);
}

.ncr-cognitive-status-ring__ring strong {
  color: var(--ncr-color-text, #102f43);
  font-size: 20px;
}

.ncr-cognitive-status-ring__item span {
  color: var(--ncr-color-text-muted, #547086);
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}

.ncr-therapist-command-panel__stats {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.ncr-therapist-command-panel__stat {
  border: 1px solid rgba(126, 190, 217, 0.2);
  border-radius: 16px;
  padding: 11px;
  background: rgba(255,255,255,0.58);
}

.ncr-therapist-command-panel__stat strong {
  color: #145f85;
  font-size: 24px;
}

.ncr-therapist-command-panel__stat span {
  display: block;
  color: var(--ncr-color-text-muted, #547086);
  font-size: 12px;
}

.ncr-therapist-command-panel__alerts,
.ncr-therapist-command-panel__actions {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.ncr-therapist-command-panel__alert,
.ncr-therapist-command-panel__action {
  border: 1px solid rgba(126, 190, 217, 0.2);
  border-radius: 18px;
  padding: 12px;
  background: rgba(255,255,255,0.58);
  color: inherit;
  text-align: left;
}

.ncr-therapist-command-panel__alert {
  border-color: rgba(193, 122, 53, 0.24);
  background: rgba(255, 247, 235, 0.72);
}

.ncr-therapist-command-panel__alert strong,
.ncr-therapist-command-panel__action strong {
  display: block;
  margin-top: 6px;
  color: var(--ncr-color-text, #102f43);
}

.ncr-therapist-command-panel__alert p,
.ncr-therapist-command-panel__action p {
  margin: 6px 0 0;
  color: var(--ncr-color-text-muted, #547086);
  font-size: 12px;
  line-height: 1.55;
}

.ncr-therapist-command-panel__action {
  cursor: pointer;
  transition: transform 200ms ease, border-color 200ms ease;
}

.ncr-therapist-command-panel__action:hover {
  transform: translateY(-1px);
  border-color: rgba(34, 168, 161, 0.38);
}

.ncr-medical-chart-container__body,
.ncr-consent-notice-panel__body {
  position: relative;
  z-index: 1;
  margin-top: 14px;
}

.ncr-consent-notice-panel__sections {
  display: grid;
  gap: 12px;
}

.ncr-consent-notice-panel__section {
  border: 1px solid rgba(126, 190, 217, 0.2);
  border-radius: 18px;
  padding: 14px;
  background: rgba(255,255,255,0.58);
}

.ncr-consent-notice-panel__section h3 {
  margin: 0;
  color: var(--ncr-color-text, #102f43);
  font-size: 16px;
}

.ncr-consent-notice-panel__section p {
  margin: 8px 0 0;
}

.ncr-consent-notice-panel__section ul {
  margin: 10px 0 0;
  padding-left: 18px;
}

@keyframes ncr-soft-rise {
  from { opacity: 0; transform: translate3d(0, 12px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

@keyframes ncr-soft-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes ncr-soft-scale {
  from { opacity: 0; transform: scale(0.985); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes ncr-advanced-sheen {
  0%, 58% { transform: translateX(-120%); opacity: 0; }
  68% { opacity: 0.52; }
  100% { transform: translateX(120%); opacity: 0; }
}

@media (max-width: 760px) {
  .ncr-training-mission-card__header,
  .ncr-medical-chart-container__header,
  .ncr-therapist-command-panel__header,
  .ncr-consent-notice-panel__header {
    display: grid;
  }

  .ncr-training-mission-card__metrics,
  .ncr-therapist-command-panel__stats,
  .ncr-cognitive-status-ring {
    grid-template-columns: 1fr;
  }

  .ncr-training-mission-card__task {
    grid-template-columns: auto minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ncr-role-entrance-card,
  .ncr-therapist-command-panel__action,
  .ncr-cognitive-status-ring__ring {
    transition: none !important;
  }

  .ncr-role-entrance-card::after,
  .ncr-training-mission-card::after,
  .ncr-medical-chart-container::after,
  .ncr-consent-notice-panel::after,
  .ncr-soft-motion {
    animation: none !important;
  }
}
`;
