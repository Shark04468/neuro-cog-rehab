// Auth portal styles are bundled as an injectable string for the tsc-only package build.
export const UNIFIED_AUTH_CSS = `
.ncr-auth-background {
  --ncr-auth-pointer-x: 72%;
  --ncr-auth-pointer-y: 32%;
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  overflow: hidden;
  color: var(--ncr-color-text);
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.98) 0%, rgba(235, 250, 253, 0.96) 54%, rgba(244, 248, 255, 0.98) 100%),
    radial-gradient(circle at 12% 18%, rgba(34, 168, 161, 0.18), transparent 28%),
    radial-gradient(circle at 86% 12%, rgba(79, 142, 216, 0.14), transparent 26%);
}

.ncr-auth-background::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -6;
  background-image:
    linear-gradient(rgba(22, 127, 168, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(22, 127, 168, 0.1) 1px, transparent 1px),
    linear-gradient(120deg, transparent 0 42%, rgba(34, 168, 161, 0.08) 44%, transparent 48%);
  background-size: 56px 56px, 56px 56px, 360px 100%;
  opacity: 0.66;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0.14));
}

.ncr-auth-background::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -5;
  pointer-events: none;
  background:
    linear-gradient(112deg, transparent 0 28%, rgba(255, 255, 255, 0.38) 42%, transparent 54% 100%),
    repeating-linear-gradient(100deg, transparent 0 36px, rgba(34, 168, 161, 0.07) 37px, transparent 48px);
  opacity: 0.42;
  animation: ncr-auth-ambient-scan 22s linear infinite;
}

.ncr-auth-orb {
  position: absolute;
  z-index: -4;
  pointer-events: none;
  border-radius: 999px;
  filter: blur(18px);
  opacity: 0.62;
  transform: translate3d(-50%, -50%, 0);
}

.ncr-auth-orb--primary {
  left: 14%;
  top: 20%;
  width: 460px;
  height: 460px;
  background: radial-gradient(circle, rgba(38, 184, 210, 0.24), transparent 68%);
  animation: ncr-auth-orb-breathe 18s ease-in-out infinite;
}

.ncr-auth-orb--secondary {
  left: 84%;
  top: 72%;
  width: 520px;
  height: 520px;
  background: radial-gradient(circle, rgba(123, 142, 232, 0.2), transparent 70%);
  animation: ncr-auth-orb-breathe 21s ease-in-out infinite reverse;
}

.ncr-auth-orb--cursor {
  left: var(--ncr-auth-pointer-x);
  top: var(--ncr-auth-pointer-y);
  width: 360px;
  height: 360px;
  opacity: 0.38;
  background: radial-gradient(circle, rgba(34, 168, 161, 0.22), transparent 68%);
  transition:
    left 680ms cubic-bezier(0.2, 0, 0, 1),
    top 680ms cubic-bezier(0.2, 0, 0, 1);
}

.ncr-auth-network,
.ncr-auth-wave,
.ncr-auth-particle-stream {
  position: absolute;
  pointer-events: none;
}

.ncr-auth-network {
  inset: 0;
  z-index: -3;
}

.ncr-auth-node {
  position: absolute;
  left: var(--node-x);
  top: var(--node-y);
  width: var(--node-size);
  height: var(--node-size);
  border: 1px solid rgba(26, 155, 181, 0.46);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.42);
  box-shadow: 0 0 24px rgba(34, 168, 161, 0.24);
  animation: ncr-auth-node-drift var(--node-duration) ease-in-out infinite alternate;
}

.ncr-auth-node::after {
  content: "";
  position: absolute;
  inset: 50% auto auto 50%;
  width: 176px;
  height: 1px;
  transform: rotate(var(--node-angle));
  transform-origin: left center;
  background: linear-gradient(90deg, rgba(26, 155, 181, 0.28), transparent);
}

.ncr-auth-wave {
  inset: 13% -7% auto -7%;
  z-index: -2;
  width: 114%;
  height: 320px;
  opacity: 0.62;
}

.ncr-auth-wave path {
  fill: none;
  stroke-linecap: round;
  stroke-width: 2.6;
  stroke-dasharray: 20 24;
  filter: drop-shadow(0 0 8px rgba(26, 155, 181, 0.2));
  animation: ncr-auth-wave-flow 18s linear infinite;
}

.ncr-auth-wave path:nth-child(2) {
  animation-duration: 24s;
  animation-direction: reverse;
}

.ncr-auth-wave path:nth-child(3) {
  stroke-dasharray: 10 28;
  animation-duration: 28s;
}

.ncr-auth-particle-stream {
  inset: 0;
  z-index: -1;
}

.ncr-auth-particle {
  position: absolute;
  left: var(--particle-x);
  top: var(--particle-y);
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: rgba(26, 155, 181, 0.34);
  box-shadow: 0 0 16px rgba(34, 168, 161, 0.28);
  animation: ncr-auth-particle-flow var(--particle-duration) linear infinite;
  animation-delay: var(--particle-delay);
}

.ncr-auth-layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(320px, 0.95fr) minmax(520px, 0.92fr);
  gap: clamp(28px, 5vw, 76px);
  align-items: center;
  width: min(1320px, calc(100% - 56px));
  min-height: 100vh;
  margin: 0 auto;
  padding: clamp(28px, 5vh, 58px) 0;
}

.ncr-neuro-auth-background {
  background:
    radial-gradient(circle at var(--ncr-auth-pointer-x) var(--ncr-auth-pointer-y), rgba(34, 168, 161, 0.13), transparent 25%),
    linear-gradient(122deg, rgba(255, 255, 255, 0.98) 0%, rgba(236, 250, 253, 0.97) 48%, rgba(244, 248, 255, 0.98) 100%);
}

.ncr-auth-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ncr-auth-layer--medical-gradient {
  z-index: -8;
  background:
    radial-gradient(circle at 14% 18%, rgba(34, 168, 161, 0.2), transparent 28%),
    radial-gradient(circle at 82% 18%, rgba(79, 142, 216, 0.16), transparent 30%),
    radial-gradient(circle at 72% 78%, rgba(20, 95, 133, 0.08), transparent 34%);
}

.ncr-auth-layer--data-grid {
  z-index: -6;
  background-image:
    linear-gradient(rgba(20, 95, 133, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(20, 95, 133, 0.07) 1px, transparent 1px),
    linear-gradient(120deg, transparent 0 44%, rgba(34, 168, 161, 0.055) 46%, transparent 52%);
  background-size: 64px 64px, 64px 64px, 420px 100%;
  opacity: 0.48;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0.16));
  animation: ncr-auth-data-grid-drift 32s linear infinite;
}

.ncr-auth-layer--data-flow {
  z-index: -1;
}

.ncr-auth-data-packet {
  position: absolute;
  left: var(--particle-x);
  top: var(--particle-y);
  width: 28px;
  height: 1px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(20, 95, 133, 0.2), transparent);
  box-shadow: 0 0 14px rgba(34, 168, 161, 0.14);
  opacity: 0;
  animation: ncr-auth-data-packet-flow var(--particle-duration) linear infinite;
  animation-delay: var(--particle-delay);
}

.ncr-auth-brand,
.ncr-auth-entry-card,
.ncr-auth-role-area,
.ncr-auth-panel {
  min-width: 0;
}

.ncr-auth-brand {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 28px;
  min-height: min(640px, calc(100vh - 96px));
  animation: ncr-auth-brand-enter 780ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.ncr-auth-brand-main {
  max-width: 780px;
  position: relative;
  padding-top: 18px;
}

.ncr-auth-brand-main::before {
  content: "DIGITAL REHABILITATION ACCESS";
  display: inline-flex;
  margin-bottom: 18px;
  border: 1px solid rgba(26, 155, 181, 0.26);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.46);
  color: var(--ncr-color-primary);
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 860;
  letter-spacing: 0.1em;
}

.ncr-auth-brand-mark {
  display: inline-grid;
  place-items: center;
  width: 66px;
  height: 66px;
  border: 1px solid rgba(26, 155, 181, 0.42);
  border-radius: 22px;
  color: #ffffff;
  background:
    linear-gradient(135deg, rgba(20, 95, 133, 0.96), rgba(34, 168, 161, 0.9)),
    radial-gradient(circle, rgba(255, 255, 255, 0.24), transparent 62%);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.34), 0 22px 52px rgba(20, 95, 133, 0.22), 0 0 42px rgba(34, 168, 161, 0.28);
  font-size: 25px;
  font-weight: 900;
}

.ncr-auth-brand-kicker,
.ncr-auth-section-label,
.ncr-auth-form-label {
  margin: 0;
  color: var(--ncr-color-text-muted);
  font-size: 12px;
  font-weight: 820;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.ncr-auth-brand-kicker {
  margin-top: 22px;
}

.ncr-auth-brand h1 {
  max-width: 760px;
  margin: 16px 0 0;
  color: var(--ncr-color-text);
  font-size: clamp(42px, 6.2vw, 82px);
  line-height: 0.98;
  letter-spacing: 0;
}

.ncr-auth-brand-subtitle {
  margin: 18px 0 0;
  color: var(--ncr-color-primary);
  font-size: clamp(18px, 2.1vw, 25px);
  font-weight: 820;
  line-height: 1.35;
}

.ncr-auth-brand-copy {
  max-width: 690px;
  margin: 18px 0 0;
  color: var(--ncr-color-text-muted);
  font-size: 16px;
  line-height: 1.8;
}

.ncr-auth-hero-grid {
  display: grid;
  gap: 14px;
  max-width: 860px;
}

.ncr-auth-eeg-preview-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(34, 168, 161, 0.3);
  border-radius: 24px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.68), rgba(232, 249, 252, 0.46)),
    repeating-linear-gradient(90deg, transparent 0 24px, rgba(20, 95, 133, 0.035) 25px 26px);
  box-shadow:
    0 24px 68px rgba(20, 85, 121, 0.13),
    0 0 30px rgba(34, 168, 161, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.66);
  backdrop-filter: blur(18px) saturate(1.16);
  padding: 18px;
}

.ncr-auth-eeg-preview-card::after {
  content: "";
  position: absolute;
  inset: auto 18px 18px;
  height: 1px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(34, 168, 161, 0.38), transparent);
  animation: ncr-auth-preview-line 8s ease-in-out infinite;
}

.ncr-auth-eeg-preview-card__head,
.ncr-auth-eeg-preview-card__metrics {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.ncr-auth-eeg-preview-card__head span {
  color: var(--ncr-color-text-muted);
  font-size: 11px;
  font-weight: 860;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.ncr-auth-eeg-preview-card__head strong {
  color: var(--ncr-color-primary);
  font-size: 14px;
}

.ncr-auth-eeg-preview-card svg {
  display: block;
  width: 100%;
  height: 128px;
  margin: 8px 0 4px;
}

.ncr-auth-eeg-preview-card path {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 3;
  stroke-dasharray: 15 18;
  filter: drop-shadow(0 0 8px rgba(34, 168, 161, 0.18));
  animation: ncr-auth-preview-wave 16s linear infinite;
}

.ncr-auth-eeg-preview-card path:first-child {
  stroke: rgba(20, 95, 133, 0.64);
}

.ncr-auth-eeg-preview-card path:nth-child(2) {
  stroke: rgba(34, 168, 161, 0.42);
  animation-duration: 22s;
  animation-direction: reverse;
}

.ncr-auth-eeg-preview-card__metrics span {
  border: 1px solid rgba(126, 190, 217, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  color: var(--ncr-color-text);
  font-family: var(--ncr-font-numeric, "SFMono-Regular", Consolas, monospace);
  font-size: 12px;
  font-weight: 820;
  padding: 7px 10px;
}

.ncr-auth-capability-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  max-width: 760px;
}

.ncr-auth-brand-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  max-width: 860px;
}

.ncr-auth-brand-metric {
  border: 1px solid rgba(126, 177, 201, 0.28);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.46);
  box-shadow: 0 16px 44px rgba(20, 85, 121, 0.08), inset 0 1px 0 rgba(255,255,255,0.58);
  backdrop-filter: blur(16px) saturate(1.1);
  padding: 15px;
}

.ncr-auth-brand-metric span {
  display: block;
  color: var(--ncr-color-text-muted);
  font-size: 12px;
  font-weight: 780;
}

.ncr-auth-brand-metric strong {
  display: block;
  margin-top: 7px;
  color: var(--ncr-color-text);
  font-size: 15px;
  line-height: 1.45;
}

.ncr-auth-entry-card {
  position: relative;
  isolation: isolate;
  display: grid;
  gap: 18px;
  border: 1px solid rgba(126, 190, 217, 0.38);
  border-radius: 32px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.82), rgba(235, 250, 253, 0.62)),
    radial-gradient(circle at 88% 8%, rgba(79, 142, 216, 0.12), transparent 40%);
  box-shadow:
    0 32px 90px rgba(20, 85, 121, 0.18),
    0 0 0 1px rgba(255, 255, 255, 0.58),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(26px) saturate(1.2);
  padding: clamp(18px, 2vw, 24px);
  overflow: hidden;
  animation:
    ncr-auth-card-enter 820ms cubic-bezier(0.16, 1, 0.3, 1) 100ms both,
    ncr-auth-card-float 14s ease-in-out 1.2s infinite;
}

.ncr-login-glass-panel {
  transform-style: preserve-3d;
}

.ncr-auth-entry-card::after {
  content: "ROLE VERIFIED ACCESS · TRAINING DATA SCOPE";
  position: absolute;
  right: 22px;
  bottom: 18px;
  z-index: 0;
  color: rgba(20, 95, 133, 0.18);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.14em;
  pointer-events: none;
}

.ncr-auth-entry-card::before {
  content: "";
  position: absolute;
  inset: -1px;
  z-index: -1;
  border-radius: inherit;
  opacity: 0.64;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.78), transparent 28%),
    radial-gradient(circle at 20% 0%, rgba(34, 168, 161, 0.18), transparent 34%),
    radial-gradient(circle at 100% 12%, rgba(79, 142, 216, 0.14), transparent 38%);
}

.ncr-login-glass-panel__status {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  border: 1px solid rgba(126, 190, 217, 0.22);
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.55), rgba(232, 249, 252, 0.34)),
    repeating-linear-gradient(90deg, transparent 0 24px, rgba(20, 95, 133, 0.035) 25px 26px);
  color: var(--ncr-color-text-muted);
  padding: 11px 14px;
}

.ncr-login-glass-panel__status span {
  font-size: 11px;
  font-weight: 880;
  letter-spacing: 0.12em;
}

.ncr-login-glass-panel__status strong {
  color: var(--ncr-color-primary);
  font-size: 12px;
  letter-spacing: 0.08em;
}

.ncr-auth-role-area,
.ncr-auth-panel {
  border: 1px solid rgba(126, 190, 217, 0.24);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.42);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62);
  padding: clamp(18px, 2vw, 24px);
}

.ncr-auth-section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.ncr-auth-section-head h2 {
  margin: 5px 0 0;
  color: var(--ncr-color-text);
  font-size: clamp(22px, 2vw, 28px);
  line-height: 1.14;
  letter-spacing: 0;
}

.ncr-auth-section-head p {
  margin: 8px 0 0;
  color: var(--ncr-color-text-muted);
  line-height: 1.58;
}

.ncr-role-selector {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.ncr-role-card {
  position: relative;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 12px;
  min-height: 116px;
  border: 1px solid rgba(126, 177, 201, 0.32);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.54);
  color: var(--ncr-color-text);
  padding: 15px;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition:
    transform var(--ncr-duration-normal) var(--ncr-ease-standard),
    border-color var(--ncr-duration-normal) var(--ncr-ease-standard),
    box-shadow var(--ncr-duration-normal) var(--ncr-ease-standard),
    background var(--ncr-duration-normal) var(--ncr-ease-standard);
}

.ncr-role-entrance-card {
  min-height: 144px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.62), rgba(234, 248, 251, 0.46)),
    radial-gradient(circle at 90% 12%, rgba(34, 168, 161, 0.12), transparent 42%);
}

.ncr-role-card::before {
  content: "";
  position: absolute;
  inset: 12px auto 12px 0;
  width: 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, transparent, rgba(34, 168, 161, 0.72), transparent);
  opacity: 0;
  transition: opacity var(--ncr-duration-normal) var(--ncr-ease-standard);
}

.ncr-role-card::after {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0;
  background: linear-gradient(115deg, transparent, rgba(82, 194, 229, 0.18), transparent);
  transform: translateX(-65%);
  transition:
    opacity var(--ncr-duration-normal) var(--ncr-ease-standard),
    transform var(--ncr-duration-slow) var(--ncr-ease-emphasis);
}

.ncr-role-card:hover {
  transform: translateY(-3px);
  border-color: rgba(26, 155, 181, 0.54);
  box-shadow: 0 18px 42px rgba(20, 95, 133, 0.14);
}

.ncr-role-card:hover::after,
.ncr-role-card[data-selected="true"]::after {
  opacity: 1;
  transform: translateX(70%);
}

.ncr-role-card:hover::before,
.ncr-role-card[data-selected="true"]::before {
  opacity: 1;
}

.ncr-role-card[data-selected="true"] {
  border-color: rgba(34, 168, 161, 0.74);
  background: rgba(247, 253, 255, 0.82);
  box-shadow:
    0 0 0 1px rgba(34, 168, 161, 0.24),
    0 0 34px rgba(32, 175, 210, 0.24),
    0 18px 42px rgba(20, 95, 133, 0.12);
}

.ncr-role-card:focus-visible {
  outline: 3px solid rgba(54, 190, 222, 0.44);
  outline-offset: 3px;
}

.ncr-role-card__icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 16px;
  color: var(--ncr-color-clinical);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(232, 249, 252, 0.58)),
    radial-gradient(circle, rgba(34, 168, 161, 0.2), transparent 62%);
  box-shadow: 0 0 22px rgba(32, 175, 210, 0.16);
}

.ncr-role-card__icon svg {
  width: 27px;
  height: 27px;
}

.ncr-role-card__body {
  position: relative;
  z-index: 1;
  min-width: 0;
}

.ncr-role-card__overline,
.ncr-role-card em,
.ncr-role-card__status {
  display: block;
}

.ncr-role-card__overline {
  margin: 0 0 6px;
  color: var(--ncr-color-primary);
  font-size: 11px;
  font-style: normal;
  font-weight: 880;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.ncr-role-card strong {
  display: block;
  color: var(--ncr-color-text);
  font-size: 16px;
  line-height: 1.25;
}

.ncr-role-card em {
  margin-top: 8px;
  color: var(--ncr-color-clinical);
  font-size: 14px;
  font-style: normal;
  font-weight: 850;
}

.ncr-role-card span {
  display: block;
  margin-top: 7px;
  color: var(--ncr-color-text-muted);
  font-size: 13px;
  line-height: 1.48;
}

.ncr-role-card .ncr-role-card__icon {
  display: grid;
  margin-top: 0;
  color: var(--ncr-color-clinical);
}

.ncr-role-card .ncr-role-card__overline,
.ncr-role-card .ncr-role-card__status {
  margin-top: 0;
}

.ncr-role-card__status {
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: 1;
  border: 1px solid rgba(126, 190, 217, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  color: var(--ncr-color-text-muted);
  font-size: 11px;
  font-weight: 820;
  line-height: 1;
  padding: 6px 8px;
}

.ncr-role-card[data-selected="true"] .ncr-role-card__status {
  border-color: rgba(34, 168, 161, 0.38);
  background: rgba(232, 251, 249, 0.82);
  color: var(--ncr-color-primary);
}

.ncr-auth-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ncr-auth-mode-stage {
  animation: ncr-auth-mode-enter 360ms cubic-bezier(0.2, 0, 0, 1) both;
}

.ncr-auth-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  border: 1px solid rgba(126, 177, 201, 0.28);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.44);
  padding: 6px;
}

.ncr-auth-tab {
  border: 0;
  border-radius: 13px;
  background: transparent;
  color: var(--ncr-color-text-muted);
  cursor: pointer;
  font: inherit;
  font-weight: 820;
  min-height: 38px;
  transition:
    color var(--ncr-duration-fast) var(--ncr-ease-standard),
    background var(--ncr-duration-fast) var(--ncr-ease-standard),
    box-shadow var(--ncr-duration-fast) var(--ncr-ease-standard);
}

.ncr-auth-tab[data-active="true"] {
  color: #ffffff;
  background: linear-gradient(135deg, var(--ncr-color-primary), var(--ncr-color-clinical));
  box-shadow: 0 10px 24px rgba(20, 95, 133, 0.22);
}

.ncr-auth-form {
  display: grid;
  gap: 14px;
}

.ncr-auth-form-head h2 {
  margin: 5px 0 0;
  color: var(--ncr-color-text);
  font-size: 26px;
  line-height: 1.16;
  letter-spacing: 0;
}

.ncr-auth-form-head span {
  display: block;
  margin-top: 8px;
  color: var(--ncr-color-text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.ncr-auth-field {
  display: grid;
  gap: 8px;
}

.ncr-auth-field span {
  color: var(--ncr-color-text-muted);
  font-size: 13px;
  font-weight: 780;
}

.ncr-auth-input-wrap {
  position: relative;
}

.ncr-auth-input,
.ncr-auth-select {
  width: 100%;
  min-height: 50px;
  box-sizing: border-box;
  border: 1px solid rgba(126, 177, 201, 0.42);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.66);
  color: var(--ncr-color-text);
  font: inherit;
  padding: 0 14px;
  transition:
    border-color var(--ncr-duration-fast) var(--ncr-ease-standard),
    box-shadow var(--ncr-duration-fast) var(--ncr-ease-standard),
    background var(--ncr-duration-fast) var(--ncr-ease-standard);
}

.ncr-auth-input:focus,
.ncr-auth-select:focus {
  border-color: rgba(26, 155, 181, 0.76);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 0 0 1px rgba(34, 168, 161, 0.24), 0 0 28px rgba(32, 175, 210, 0.22);
  outline: none;
}

.ncr-auth-password-toggle {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  border: 0;
  border-radius: 12px;
  background: rgba(232, 249, 252, 0.78);
  color: var(--ncr-color-primary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 820;
  padding: 7px 9px;
}

.ncr-auth-input-wrap .ncr-auth-input {
  padding-right: 64px;
}

.ncr-auth-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.ncr-auth-row--compact {
  align-items: stretch;
}

.ncr-auth-check {
  display: inline-grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  color: var(--ncr-color-text-muted);
  font-size: 13px;
  line-height: 1.45;
  cursor: pointer;
}

.ncr-auth-check input {
  width: 16px;
  height: 16px;
  margin: 2px 0 0;
  accent-color: var(--ncr-color-clinical);
}

.ncr-auth-link {
  border: 0;
  background: transparent;
  color: var(--ncr-color-primary);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 820;
  padding: 0;
  text-decoration: none;
}

.ncr-auth-link:focus-visible,
.ncr-auth-tab:focus-visible,
.ncr-auth-password-toggle:focus-visible {
  outline: 3px solid rgba(54, 190, 222, 0.42);
  outline-offset: 2px;
}

.ncr-auth-submit {
  position: relative;
  overflow: hidden;
  width: 100%;
  min-height: 54px;
}

.ncr-auth-submit::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 0 38%, rgba(255, 255, 255, 0.36) 50%, transparent 62% 100%);
  transform: translateX(-85%);
  animation: ncr-auth-submit-sheen 6s ease-in-out infinite;
  pointer-events: none;
}

.ncr-auth-hint,
.ncr-auth-error,
.ncr-auth-success {
  border-radius: 16px;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.5;
}

.ncr-auth-hint {
  border: 1px solid rgba(126, 177, 201, 0.32);
  background: rgba(255, 255, 255, 0.5);
  color: var(--ncr-color-text-muted);
}

.ncr-auth-error {
  border: 1px solid rgba(185, 133, 30, 0.32);
  background: rgba(255, 250, 236, 0.76);
  color: #775617;
}

.ncr-auth-success {
  border: 1px solid rgba(34, 168, 161, 0.34);
  background: rgba(237, 251, 248, 0.74);
  color: #17645f;
}

.ncr-auth-verification-state {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  border: 1px solid rgba(34, 168, 161, 0.42);
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(237, 251, 248, 0.82), rgba(255, 255, 255, 0.62)),
    radial-gradient(circle at 86% 12%, rgba(34, 168, 161, 0.18), transparent 40%);
  box-shadow: 0 0 28px rgba(34, 168, 161, 0.16);
  color: #17645f;
  padding: 13px 14px;
  animation: ncr-auth-verified-enter 360ms cubic-bezier(0.2, 0, 0, 1) both;
}

.ncr-auth-verification-state span {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 14px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--ncr-color-primary), var(--ncr-color-monitoring));
  box-shadow: 0 0 24px rgba(34, 168, 161, 0.24);
  font-weight: 900;
}

.ncr-auth-verification-state strong,
.ncr-auth-verification-state em {
  display: block;
}

.ncr-auth-verification-state strong {
  color: var(--ncr-color-text);
  font-size: 15px;
}

.ncr-auth-verification-state em {
  margin-top: 3px;
  color: var(--ncr-color-text-muted);
  font-size: 12px;
  font-style: normal;
}

.ncr-auth-meta-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  color: var(--ncr-color-text-muted);
  font-size: 12px;
}

.ncr-demo-mode-panel {
  display: grid;
  gap: 12px;
  border: 1px solid rgba(201, 151, 53, 0.28);
  border-radius: 22px;
  background:
    linear-gradient(135deg, rgba(255, 250, 236, 0.72), rgba(232, 249, 252, 0.42)),
    repeating-linear-gradient(90deg, transparent 0 24px, rgba(20, 95, 133, 0.035) 25px 26px);
  box-shadow: 0 18px 46px rgba(20, 85, 121, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.64);
  padding: 16px;
}

.ncr-demo-mode-panel__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.ncr-demo-mode-panel__head span,
.ncr-demo-mode-panel__head strong,
.ncr-demo-mode-panel__head em {
  display: block;
}

.ncr-demo-mode-panel__head span {
  color: #8a641a;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.ncr-demo-mode-panel__head strong {
  margin-top: 4px;
  color: var(--ncr-color-text);
  font-size: 15px;
}

.ncr-demo-mode-panel__head em {
  border: 1px solid rgba(201, 151, 53, 0.26);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.54);
  color: #8a641a;
  font-size: 11px;
  font-style: normal;
  font-weight: 840;
  padding: 6px 8px;
  white-space: nowrap;
}

.ncr-demo-mode-panel p {
  margin: 0;
  color: var(--ncr-color-text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.ncr-demo-mode-panel__primary,
.ncr-demo-account-button {
  border: 1px solid rgba(126, 190, 217, 0.28);
  border-radius: 16px;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.ncr-demo-mode-panel__primary {
  position: relative;
  overflow: hidden;
  min-height: 44px;
  background: linear-gradient(135deg, var(--ncr-color-primary), var(--ncr-color-monitoring));
  color: #ffffff;
  font-weight: 860;
  padding: 0 14px;
}

.ncr-demo-mode-panel__primary::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 0 38%, rgba(255, 255, 255, 0.28) 50%, transparent 62% 100%);
  transform: translateX(-85%);
  animation: ncr-auth-submit-sheen 7s ease-in-out infinite;
  pointer-events: none;
}

.ncr-demo-account-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.ncr-demo-account-button {
  display: grid;
  gap: 4px;
  min-height: 112px;
  background: rgba(255, 255, 255, 0.56);
  color: var(--ncr-color-text);
  padding: 11px;
  transition:
    transform var(--ncr-duration-fast) var(--ncr-ease-standard),
    border-color var(--ncr-duration-fast) var(--ncr-ease-standard),
    box-shadow var(--ncr-duration-fast) var(--ncr-ease-standard);
}

.ncr-demo-account-button:hover,
.ncr-demo-account-button[data-selected="true"] {
  transform: translateY(-1px);
  border-color: rgba(34, 168, 161, 0.48);
  box-shadow: 0 12px 26px rgba(20, 95, 133, 0.1);
}

.ncr-demo-account-button span,
.ncr-demo-account-button strong,
.ncr-demo-account-button em,
.ncr-demo-account-button small {
  display: block;
}

.ncr-demo-account-button span {
  color: var(--ncr-color-primary);
  font-size: 12px;
  font-weight: 860;
}

.ncr-demo-account-button strong {
  color: var(--ncr-color-text);
  font-size: 13px;
}

.ncr-demo-account-button em,
.ncr-demo-account-button small {
  color: var(--ncr-color-text-muted);
  font-size: 11px;
  font-style: normal;
  line-height: 1.42;
}

.ncr-auth-register-fields {
  display: grid;
  gap: 12px;
}

.ncr-register-flow {
  display: grid;
  gap: 18px;
}

.ncr-step-progress {
  display: grid;
  gap: 14px;
}

.ncr-step-progress__track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(126, 177, 201, 0.18);
}

.ncr-step-progress__track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--ncr-color-primary), var(--ncr-color-monitoring));
  box-shadow: 0 0 18px rgba(34, 168, 161, 0.28);
  transition: width var(--ncr-duration-slow) var(--ncr-ease-emphasis);
}

.ncr-step-progress__list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.ncr-step-progress__item {
  display: grid;
  gap: 6px;
  min-width: 0;
  border: 1px solid rgba(126, 177, 201, 0.28);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.42);
  padding: 10px;
}

.ncr-step-progress__item span {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: rgba(126, 177, 201, 0.2);
  color: var(--ncr-color-text-muted);
  font-size: 12px;
  font-weight: 900;
}

.ncr-step-progress__item strong {
  color: var(--ncr-color-text-muted);
  font-size: 12px;
  line-height: 1.25;
}

.ncr-step-progress__item[data-status="active"] {
  border-color: rgba(34, 168, 161, 0.54);
  box-shadow: 0 0 24px rgba(32, 175, 210, 0.16);
}

.ncr-step-progress__item[data-status="active"] span,
.ncr-step-progress__item[data-status="done"] span {
  color: #ffffff;
  background: linear-gradient(135deg, var(--ncr-color-primary), var(--ncr-color-monitoring));
}

.ncr-step-progress__item[data-status="active"] strong,
.ncr-step-progress__item[data-status="done"] strong {
  color: var(--ncr-color-text);
}

.ncr-register-card,
.ncr-success-state {
  border: 1px solid rgba(126, 190, 217, 0.28);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: var(--ncr-shadow-soft), var(--ncr-shadow-inner);
  backdrop-filter: blur(20px) saturate(1.12);
  padding: 22px;
}

.ncr-register-card__head {
  margin-bottom: 18px;
}

.ncr-register-card__head p {
  margin: 0;
  color: var(--ncr-color-text-muted);
  font-size: 12px;
  font-weight: 820;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ncr-register-card__head h3 {
  margin: 6px 0 0;
  color: var(--ncr-color-text);
  font-size: 24px;
  line-height: 1.18;
  letter-spacing: 0;
}

.ncr-register-card__head span {
  display: block;
  margin-top: 8px;
  color: var(--ncr-color-text-muted);
  line-height: 1.58;
}

.ncr-register-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.ncr-register-field--full {
  grid-column: 1 / -1;
}

.ncr-register-note {
  border: 1px solid rgba(26, 155, 181, 0.24);
  border-radius: 16px;
  background: rgba(237, 251, 248, 0.68);
  color: var(--ncr-color-text-muted);
  line-height: 1.58;
  padding: 13px 14px;
}

.ncr-register-textarea {
  min-height: 110px;
  resize: vertical;
  padding-top: 12px;
}

.ncr-password-strength {
  display: grid;
  gap: 9px;
  border: 1px solid rgba(126, 177, 201, 0.28);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.46);
  padding: 13px;
}

.ncr-password-strength > div:first-child {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.ncr-password-strength span {
  color: var(--ncr-color-text-muted);
  font-size: 12px;
  font-weight: 800;
}

.ncr-password-strength strong {
  color: var(--ncr-color-primary);
  font-size: 13px;
}

.ncr-password-strength__meter {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(126, 177, 201, 0.18);
}

.ncr-password-strength__meter span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--ncr-color-warning), var(--ncr-color-monitoring));
  transition: width var(--ncr-duration-normal) var(--ncr-ease-standard);
}

.ncr-password-strength[data-level="strong"] .ncr-password-strength__meter span {
  background: linear-gradient(90deg, var(--ncr-color-clinical), var(--ncr-color-monitoring));
}

.ncr-password-strength p {
  margin: 0;
  color: var(--ncr-color-text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.ncr-consent-card {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 12px;
  border: 1px solid rgba(26, 155, 181, 0.26);
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.76), rgba(237, 251, 248, 0.6)),
    radial-gradient(circle at 92% 12%, rgba(34, 168, 161, 0.12), transparent 36%);
  cursor: pointer;
  padding: 16px;
}

.ncr-consent-card input {
  width: 18px;
  height: 18px;
  margin: 2px 0 0;
  accent-color: var(--ncr-color-monitoring);
}

.ncr-consent-card strong,
.ncr-consent-card span span,
.ncr-consent-card em {
  display: block;
}

.ncr-consent-card strong {
  color: var(--ncr-color-text);
  font-size: 15px;
  line-height: 1.3;
}

.ncr-consent-card span span,
.ncr-consent-card em {
  margin-top: 6px;
  color: var(--ncr-color-text-muted);
  font-size: 13px;
  font-style: normal;
  line-height: 1.52;
}

.ncr-register-actions {
  display: grid;
  grid-template-columns: minmax(0, 0.7fr) minmax(0, 1fr);
  gap: 12px;
}

.ncr-review-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.ncr-review-list div {
  min-width: 0;
  border: 1px solid rgba(126, 177, 201, 0.28);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.45);
  padding: 12px;
}

.ncr-review-list dt {
  color: var(--ncr-color-text-muted);
  font-size: 12px;
  font-weight: 820;
}

.ncr-review-list dd {
  margin: 6px 0 0;
  color: var(--ncr-color-text);
  font-size: 14px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.ncr-success-state {
  display: grid;
  justify-items: start;
  gap: 14px;
  min-height: 460px;
  align-content: center;
}

.ncr-success-state__mark {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 22px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--ncr-color-primary), var(--ncr-color-monitoring));
  box-shadow: 0 0 30px rgba(34, 168, 161, 0.28);
  font-size: 31px;
  font-weight: 900;
}

.ncr-success-state h2 {
  margin: 0;
  color: var(--ncr-color-text);
  font-size: 30px;
  line-height: 1.15;
  letter-spacing: 0;
}

.ncr-success-state p {
  margin: 0;
  color: var(--ncr-color-text-muted);
  line-height: 1.62;
}

.ncr-success-state dl {
  display: grid;
  gap: 8px;
  width: 100%;
  margin: 0;
}

.ncr-success-state dl > div {
  display: grid;
  grid-template-columns: minmax(90px, 0.36fr) minmax(0, 1fr);
  gap: 10px;
  border: 1px solid rgba(126, 177, 201, 0.28);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.45);
  padding: 11px 12px;
}

.ncr-success-state dt {
  color: var(--ncr-color-text-muted);
  font-size: 12px;
  font-weight: 820;
}

.ncr-success-state dd {
  margin: 0;
  color: var(--ncr-color-text);
  overflow-wrap: anywhere;
}

@keyframes ncr-auth-data-grid-drift {
  from {
    background-position: 0 0, 0 0, -120px 0;
  }
  to {
    background-position: 64px 64px, 64px 64px, 120px 0;
  }
}

@keyframes ncr-auth-data-packet-flow {
  from {
    opacity: 0;
    transform: translate3d(-42px, 18px, 0);
  }
  24%,
  72% {
    opacity: 0.56;
  }
  to {
    opacity: 0;
    transform: translate3d(124px, -58px, 0);
  }
}

@keyframes ncr-auth-preview-wave {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: -156;
  }
}

@keyframes ncr-auth-preview-line {
  0%,
  100% {
    transform: translateX(-18%);
    opacity: 0.42;
  }
  50% {
    transform: translateX(18%);
    opacity: 0.78;
  }
}

@keyframes ncr-auth-mode-enter {
  from {
    opacity: 0;
    transform: translate3d(0, 10px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes ncr-auth-submit-sheen {
  0%,
  58% {
    transform: translateX(-85%);
  }
  88%,
  100% {
    transform: translateX(85%);
  }
}

@keyframes ncr-auth-verified-enter {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes ncr-auth-ambient-scan {
  from {
    transform: translate3d(-44px, 0, 0);
  }
  to {
    transform: translate3d(44px, 0, 0);
  }
}

@keyframes ncr-auth-wave-flow {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: -180;
  }
}

@keyframes ncr-auth-node-drift {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(8px, -7px, 0);
  }
}

@keyframes ncr-auth-particle-flow {
  from {
    opacity: 0;
    transform: translate3d(-18px, 12px, 0);
  }
  24%,
  70% {
    opacity: 0.68;
  }
  to {
    opacity: 0;
    transform: translate3d(86px, -46px, 0);
  }
}

@keyframes ncr-auth-orb-breathe {
  0%,
  100% {
    transform: translate3d(-50%, -50%, 0) scale(0.96);
  }
  50% {
    transform: translate3d(-50%, -50%, 0) scale(1.06);
  }
}

@keyframes ncr-auth-brand-enter {
  from {
    opacity: 0;
    transform: translate3d(-22px, 16px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes ncr-auth-card-enter {
  from {
    opacity: 0;
    transform: translate3d(26px, 18px, 0) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes ncr-auth-card-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@media (max-width: 960px) {
  .ncr-auth-layout {
    grid-template-columns: 1fr;
    align-items: stretch;
    min-height: auto;
  }

  .ncr-auth-brand {
    min-height: auto;
  }

  .ncr-auth-brand h1 {
    max-width: 920px;
  }
}

@media (max-width: 820px) {
  .ncr-auth-layout,
  .ncr-role-selector,
  .ncr-demo-account-grid,
  .ncr-auth-brand-metrics,
  .ncr-auth-hero-grid,
  .ncr-register-grid,
  .ncr-register-actions,
  .ncr-review-list,
  .ncr-success-state dl > div {
    grid-template-columns: 1fr;
  }

  .ncr-auth-layout {
    width: min(100% - 28px, 1240px);
    padding: 24px 0;
  }

  .ncr-auth-entry-card,
  .ncr-auth-role-area,
  .ncr-auth-panel {
    border-radius: 24px;
    padding: 16px;
  }

  .ncr-auth-brand {
    gap: 18px;
  }

  .ncr-auth-brand h1 {
    font-size: clamp(34px, 11vw, 54px);
  }

  .ncr-auth-section-head,
  .ncr-auth-row,
  .ncr-login-glass-panel__status {
    display: grid;
  }

  .ncr-auth-wave {
    inset-block-start: 6%;
    height: 220px;
  }

  .ncr-auth-eeg-preview-card svg {
    height: 104px;
  }

  .ncr-role-entrance-card {
    min-height: 132px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ncr-auth-background *,
  .ncr-auth-background *::before,
  .ncr-auth-background *::after {
    animation: none !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }

  .ncr-auth-orb--cursor {
    left: 72%;
    top: 32%;
  }
}
`;
