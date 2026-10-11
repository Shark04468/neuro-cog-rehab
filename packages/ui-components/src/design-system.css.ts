// The ui-components package is built with tsc only, so shared CSS is exported as an
// injectable string instead of relying on a separate asset copy step.
export const NEURO_DESIGN_SYSTEM_CSS = `
:where(.ncr-design-system),
:where([data-ncr-theme]) {
  --ncr-font-sans:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    "Microsoft YaHei", sans-serif;
  --ncr-font-mono:
    "SFMono-Regular", Consolas, "Liberation Mono", "Microsoft YaHei Mono", monospace;
  --ncr-font-numeric:
    "DIN Alternate", "Roboto Mono", "SFMono-Regular", Consolas, "Microsoft YaHei Mono", monospace;
  --ncr-radius-xs: 6px;
  --ncr-radius-sm: 8px;
  --ncr-radius-md: 12px;
  --ncr-radius-lg: 16px;
  --ncr-radius-xl: 22px;
  --ncr-border-thin: 1px solid var(--ncr-color-border);
  --ncr-shadow-soft: 0 18px 46px rgba(20, 85, 121, 0.12);
  --ncr-shadow-raised: 0 24px 64px rgba(20, 85, 121, 0.18);
  --ncr-shadow-inner: inset 0 1px 0 rgba(255, 255, 255, 0.62);
  --ncr-glow-primary: 0 0 0 1px rgba(82, 194, 229, 0.18), 0 0 26px var(--ncr-color-glow);
  --ncr-duration-fast: 160ms;
  --ncr-duration-normal: 260ms;
  --ncr-duration-slow: 720ms;
  --ncr-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ncr-ease-emphasis: cubic-bezier(0.16, 1, 0.3, 1);
  font-family: var(--ncr-font-sans);
}

:where([data-ncr-theme="hospital-light"]) {
  --ncr-color-bg: #f8fcff;
  --ncr-color-bg-alt: #eaf8fb;
  --ncr-color-surface: rgba(255, 255, 255, 0.76);
  --ncr-color-surface-strong: rgba(255, 255, 255, 0.92);
  --ncr-color-text: #0d2533;
  --ncr-color-text-muted: #627889;
  --ncr-color-border: rgba(126, 177, 201, 0.32);
  --ncr-color-primary: #145f85;
  --ncr-color-clinical: #167fa8;
  --ncr-color-monitoring: #22a8a1;
  --ncr-color-calm: #4f8ed8;
  --ncr-color-warning: #c99735;
  --ncr-color-critical: #c17a35;
  --ncr-color-glow: rgba(32, 175, 210, 0.22);
  --ncr-color-grid: rgba(67, 137, 173, 0.105);
  --ncr-color-medical-blue: #145f85;
  --ncr-color-cyan-green: #22a8a1;
  --ncr-color-deep-navy: #06121f;
  --ncr-color-soft-green: #62b894;
  --ncr-color-calm-blue: #4f8ed8;
  --ncr-color-soft-amber: #d5a64a;
  --ncr-color-muted-orange: #c17a35;
  --ncr-bg-medical-base: linear-gradient(135deg, #ffffff 0%, #f8fcff 38%, #eaf8fb 74%, #f4f8ff 100%);
}

:where([data-ncr-theme="neuro-dark"]) {
  --ncr-color-bg: #06121f;
  --ncr-color-bg-alt: #092337;
  --ncr-color-surface: rgba(9, 26, 43, 0.74);
  --ncr-color-surface-strong: rgba(12, 34, 56, 0.92);
  --ncr-color-text: #edf8ff;
  --ncr-color-text-muted: #a7bdcf;
  --ncr-color-border: rgba(113, 201, 230, 0.28);
  --ncr-color-primary: #78d9ff;
  --ncr-color-clinical: #4fd0e3;
  --ncr-color-monitoring: #38d4bd;
  --ncr-color-calm: #78b7ff;
  --ncr-color-warning: #f0c66d;
  --ncr-color-critical: #f0a15d;
  --ncr-color-glow: rgba(74, 208, 227, 0.28);
  --ncr-color-grid: rgba(120, 217, 255, 0.1);
  --ncr-color-medical-blue: #78d9ff;
  --ncr-color-cyan-green: #38d4bd;
  --ncr-color-deep-navy: #06121f;
  --ncr-color-soft-green: #78d8ad;
  --ncr-color-calm-blue: #78b7ff;
  --ncr-color-soft-amber: #f0c66d;
  --ncr-color-muted-orange: #f0a15d;
  --ncr-bg-medical-base: linear-gradient(135deg, #06121f 0%, #092337 56%, #071a2b 100%);
}

.ncr-design-system {
  color: var(--ncr-color-text);
  background: var(--ncr-color-bg);
  min-height: 100%;
}

.ncr-page-background {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  overflow: hidden;
  background: var(--ncr-bg-medical-base);
}

[data-ncr-theme="neuro-dark"] .ncr-page-background {
  background:
    linear-gradient(135deg, var(--ncr-color-bg) 0%, var(--ncr-color-bg-alt) 52%, #071a2b 100%);
}

.ncr-page-background::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image:
    linear-gradient(var(--ncr-color-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--ncr-color-grid) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0.12));
}

.ncr-page-background::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: 0.58;
  background:
    linear-gradient(115deg, transparent 0 18%, rgba(30, 162, 195, 0.12) 22%, transparent 32%),
    repeating-linear-gradient(
      100deg,
      transparent 0 24px,
      rgba(34, 168, 161, 0.08) 25px,
      transparent 32px
    );
  animation: ncr-data-current 18s linear infinite;
}

.ncr-medical-grade-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.ncr-medical-grade-bg__eeg,
.ncr-medical-grade-bg__network,
.ncr-medical-grade-bg__grid,
.ncr-medical-grade-bg__focus {
  position: absolute;
  inset: 0;
}

.ncr-medical-grade-bg__eeg {
  top: 10%;
  height: 220px;
  opacity: 0.34;
  background:
    linear-gradient(90deg, transparent, rgba(22, 127, 168, 0.12), transparent),
    repeating-linear-gradient(
      90deg,
      transparent 0 24px,
      rgba(22, 127, 168, 0.26) 25px,
      transparent 27px 48px
    );
  clip-path: polygon(
    0 52%,
    4% 51%,
    7% 47%,
    10% 58%,
    13% 38%,
    16% 55%,
    20% 49%,
    24% 53%,
    28% 43%,
    32% 61%,
    36% 48%,
    40% 51%,
    45% 39%,
    50% 59%,
    55% 48%,
    60% 52%,
    65% 42%,
    70% 58%,
    75% 49%,
    80% 53%,
    86% 45%,
    92% 55%,
    100% 50%,
    100% 66%,
    0 66%
  );
  filter: drop-shadow(0 0 10px rgba(34, 168, 161, 0.14));
  animation: ncr-medical-eeg-drift 24s linear infinite;
}

.ncr-medical-grade-bg__network {
  opacity: 0.38;
  background:
    radial-gradient(circle at 18% 24%, rgba(34, 168, 161, 0.24) 0 2px, transparent 3px),
    radial-gradient(circle at 35% 58%, rgba(20, 95, 133, 0.2) 0 2px, transparent 3px),
    radial-gradient(circle at 62% 28%, rgba(79, 142, 216, 0.2) 0 2px, transparent 3px),
    radial-gradient(circle at 82% 66%, rgba(34, 168, 161, 0.2) 0 2px, transparent 3px);
}

.ncr-medical-grade-bg__network::before,
.ncr-medical-grade-bg__network::after {
  content: "";
  position: absolute;
  inset: 12% 12% 18% 16%;
  border: 1px solid rgba(86, 177, 205, 0.11);
  transform: skewY(-6deg);
  box-shadow: 0 0 50px rgba(48, 179, 207, 0.1);
}

.ncr-medical-grade-bg__network::after {
  inset: 24% 18% 10% 8%;
  transform: skewY(8deg);
}

.ncr-medical-grade-bg__grid {
  opacity: 0.34;
  background-image:
    linear-gradient(var(--ncr-color-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--ncr-color-grid) 1px, transparent 1px),
    linear-gradient(115deg, transparent 0 42%, rgba(34, 168, 161, 0.06) 44%, transparent 48%);
  background-size: 52px 52px, 52px 52px, 420px 100%;
  animation: ncr-data-current 26s linear infinite;
}

.ncr-medical-grade-bg__focus {
  opacity: 0.72;
  background:
    radial-gradient(circle at 24% 18%, rgba(34, 168, 161, 0.18), transparent 28%),
    radial-gradient(circle at 78% 12%, rgba(79, 142, 216, 0.14), transparent 26%),
    radial-gradient(circle at 70% 82%, rgba(213, 166, 74, 0.1), transparent 24%);
}

.ncr-page-background[data-training-mode="true"] .ncr-medical-grade-bg__eeg,
.ncr-page-background[data-training-mode="true"] .ncr-medical-grade-bg__grid {
  opacity: 0.16;
  animation-duration: 42s;
}

.ncr-page-background[data-training-mode="true"] .ncr-medical-grade-bg__network {
  opacity: 0.2;
}

.ncr-page-background__content {
  position: relative;
  z-index: 1;
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 44px 0;
}

.ncr-glass-card,
.ncr-data-panel,
.ncr-medical-metric-card,
.ncr-eeg-shell,
.ncr-alert,
.ncr-field,
.ncr-demo-section {
  border: var(--ncr-border-thin);
  background: var(--ncr-color-surface);
  box-shadow: var(--ncr-shadow-soft), var(--ncr-shadow-inner);
  backdrop-filter: blur(18px) saturate(1.12);
}

.ncr-glass-card {
  border-radius: var(--ncr-radius-lg);
  padding: var(--ncr-card-padding, 22px);
  transition:
    transform var(--ncr-duration-normal) var(--ncr-ease-standard),
    box-shadow var(--ncr-duration-normal) var(--ncr-ease-standard),
    border-color var(--ncr-duration-normal) var(--ncr-ease-standard);
}

.ncr-glass-card[data-interactive="true"]:hover {
  transform: translateY(-3px);
  box-shadow: var(--ncr-shadow-raised), var(--ncr-glow-primary);
  border-color: rgba(75, 182, 220, 0.5);
}

.ncr-glass-card[data-level="floating"] {
  box-shadow: var(--ncr-shadow-raised), var(--ncr-glow-primary);
}

.ncr-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  border: 0;
  border-radius: var(--ncr-radius-sm);
  padding: 0 16px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--ncr-color-primary), var(--ncr-color-clinical));
  box-shadow: 0 12px 28px rgba(20, 95, 133, 0.22);
  font: inherit;
  font-weight: 760;
  letter-spacing: 0;
  cursor: pointer;
  overflow: hidden;
  transition:
    transform var(--ncr-duration-fast) var(--ncr-ease-standard),
    box-shadow var(--ncr-duration-fast) var(--ncr-ease-standard),
    opacity var(--ncr-duration-fast) var(--ncr-ease-standard);
}

.ncr-button::after {
  content: "";
  position: absolute;
  inset: -40% auto -40% -60%;
  width: 48%;
  transform: skewX(-18deg);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.34), transparent);
  animation: ncr-button-sheen 5.8s var(--ncr-ease-standard) infinite;
}

.ncr-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 34px rgba(20, 95, 133, 0.28), var(--ncr-glow-primary);
}

.ncr-button:focus-visible,
.ncr-input:focus-visible,
.ncr-select:focus-visible {
  outline: 3px solid rgba(54, 190, 222, 0.42);
  outline-offset: 2px;
}

.ncr-button:disabled {
  cursor: not-allowed;
  opacity: 0.56;
  transform: none;
  box-shadow: none;
}

.ncr-button[data-variant="secondary"] {
  color: var(--ncr-color-primary);
  background: rgba(255, 255, 255, 0.56);
  border: var(--ncr-border-thin);
}

.ncr-button[data-variant="ghost"] {
  color: var(--ncr-color-text);
  background: transparent;
  border: var(--ncr-border-thin);
  box-shadow: none;
}

.ncr-field {
  display: grid;
  gap: 8px;
  border-radius: var(--ncr-radius-md);
  padding: 12px;
}

.ncr-field__label,
.ncr-data-panel__eyebrow,
.ncr-eeg-shell__eyebrow,
.ncr-demo-eyebrow {
  color: var(--ncr-color-text-muted);
  font-size: 12px;
  font-weight: 780;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ncr-field__helper {
  color: var(--ncr-color-text-muted);
  font-size: 13px;
  line-height: 1.45;
}

.ncr-input,
.ncr-select {
  width: 100%;
  box-sizing: border-box;
  border: var(--ncr-border-thin);
  border-radius: var(--ncr-radius-sm);
  background: rgba(255, 255, 255, 0.62);
  color: var(--ncr-color-text);
  padding: 11px 12px;
  font: inherit;
  transition:
    border-color var(--ncr-duration-fast) var(--ncr-ease-standard),
    box-shadow var(--ncr-duration-fast) var(--ncr-ease-standard);
}

[data-ncr-theme="neuro-dark"] .ncr-input,
[data-ncr-theme="neuro-dark"] .ncr-select {
  background: rgba(6, 18, 31, 0.44);
}

.ncr-input:focus,
.ncr-select:focus {
  border-color: rgba(54, 190, 222, 0.62);
  box-shadow: var(--ncr-glow-primary);
}

.ncr-tag,
.ncr-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: var(--ncr-border-thin);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  color: var(--ncr-tone-color, var(--ncr-color-primary));
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 780;
}

.ncr-status-badge::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 14px currentColor;
}

.ncr-alert {
  border-radius: var(--ncr-radius-md);
  padding: 14px 16px;
  color: var(--ncr-color-text);
  border-left: 4px solid var(--ncr-tone-color, var(--ncr-color-clinical));
}

.ncr-alert strong {
  display: block;
  margin-bottom: 5px;
  font-size: 15px;
}

.ncr-alert p {
  margin: 0;
  color: var(--ncr-color-text-muted);
  line-height: 1.55;
}

.ncr-data-panel {
  border-radius: var(--ncr-radius-xl);
  padding: 22px;
}

.ncr-data-panel__header,
.ncr-eeg-shell__header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
}

.ncr-data-panel__title,
.ncr-eeg-shell__title {
  margin: 4px 0 0;
  color: var(--ncr-color-text);
  font-size: clamp(22px, 3vw, 34px);
  line-height: 1.12;
  letter-spacing: 0;
}

.ncr-data-panel__subtitle,
.ncr-eeg-shell__subtitle {
  margin: 9px 0 0;
  color: var(--ncr-color-text-muted);
  line-height: 1.6;
}

.ncr-data-panel__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 22px;
}

.ncr-data-panel__metric {
  border: var(--ncr-border-thin);
  border-radius: var(--ncr-radius-lg);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.62), rgba(239, 250, 252, 0.42)),
    repeating-linear-gradient(90deg, transparent 0 18px, rgba(22, 127, 168, 0.035) 19px 20px);
  padding: 16px;
}

[data-ncr-theme="neuro-dark"] .ncr-data-panel__metric {
  background: rgba(6, 18, 31, 0.34);
}

.ncr-data-panel__metric-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.ncr-data-panel__metric-label {
  color: var(--ncr-color-text-muted);
  font-size: 13px;
  font-weight: 720;
}

.ncr-data-panel__metric-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 10px;
  color: var(--ncr-color-text);
}

.ncr-data-panel__metric-value strong {
  font-family: var(--ncr-font-numeric);
  font-size: 30px;
  line-height: 1;
}

.ncr-data-panel__metric-value span {
  color: var(--ncr-color-text-muted);
  font-size: 13px;
  font-weight: 700;
}

.ncr-data-panel__progress {
  height: 8px;
  margin-top: 13px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(116, 160, 184, 0.18);
}

.ncr-data-panel__progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--ncr-tone-color, var(--ncr-color-clinical)), #a9e8f7);
  box-shadow: 0 0 18px var(--ncr-tone-color, var(--ncr-color-clinical));
  transition: width var(--ncr-duration-slow) var(--ncr-ease-emphasis);
}

.ncr-data-panel__metric-helper {
  margin: 10px 0 0;
  color: var(--ncr-color-text-muted);
  font-size: 13px;
  line-height: 1.45;
}

.ncr-medical-metric-card {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  padding: 16px;
}

.ncr-medical-metric-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: linear-gradient(180deg, var(--ncr-tone-color, var(--ncr-color-clinical)), transparent);
  opacity: 0.88;
}

.ncr-medical-metric-card::after {
  content: "";
  position: absolute;
  inset: auto 14px 12px 14px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--ncr-tone-color, var(--ncr-color-clinical)), transparent);
  opacity: 0.42;
}

.ncr-medical-metric-card[data-variant="core"] {
  border-color: color-mix(in srgb, var(--ncr-tone-color, var(--ncr-color-clinical)) 44%, transparent);
  box-shadow:
    0 20px 54px rgba(20, 85, 121, 0.13),
    0 0 0 1px rgba(255, 255, 255, 0.58),
    0 0 30px color-mix(in srgb, var(--ncr-tone-color, var(--ncr-color-clinical)) 20%, transparent),
    var(--ncr-shadow-inner);
}

.ncr-medical-metric-card[data-variant="risk"] {
  border-color: rgba(201, 151, 53, 0.38);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.78), rgba(255, 248, 232, 0.58)),
    radial-gradient(circle at 92% 8%, rgba(213, 166, 74, 0.14), transparent 34%);
  --ncr-tone-color: var(--ncr-color-soft-amber);
}

.ncr-medical-metric-card[data-variant="training"] {
  border-color: rgba(34, 168, 161, 0.34);
  box-shadow:
    0 22px 58px rgba(20, 85, 121, 0.12),
    0 0 26px rgba(34, 168, 161, 0.14),
    var(--ncr-shadow-inner);
}

.ncr-medical-metric-card[data-variant="training"]::after {
  animation: ncr-medical-status-line 7.5s var(--ncr-ease-standard) infinite;
}

.ncr-medical-metric-card[data-variant="report"] {
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 14px 34px rgba(20, 85, 121, 0.08), var(--ncr-shadow-inner);
}

.ncr-medical-metric-card__top {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.ncr-medical-metric-card__top > span {
  color: var(--ncr-color-text-muted);
  font-size: 12px;
  font-weight: 820;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.ncr-medical-metric-card__value {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 12px;
}

.ncr-medical-metric-card__value strong {
  color: var(--ncr-color-text);
  font-family: var(--ncr-font-numeric);
  font-size: clamp(28px, 4vw, 42px);
  line-height: 0.95;
  letter-spacing: 0;
}

.ncr-medical-metric-card__value span {
  color: var(--ncr-color-text-muted);
  font-size: 13px;
  font-weight: 760;
}

.ncr-medical-metric-card__track {
  position: relative;
  z-index: 1;
  height: 9px;
  margin-top: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(126, 177, 201, 0.18);
}

.ncr-medical-metric-card__track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    var(--ncr-tone-color, var(--ncr-color-clinical)),
    rgba(169, 232, 247, 0.86)
  );
  box-shadow: 0 0 18px color-mix(in srgb, var(--ncr-tone-color, var(--ncr-color-clinical)) 34%, transparent);
  transition: width var(--ncr-duration-slow) var(--ncr-ease-emphasis);
}

.ncr-medical-metric-card p {
  position: relative;
  z-index: 1;
  margin: 12px 0 0;
  color: var(--ncr-color-text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.ncr-eeg-shell {
  border-radius: var(--ncr-radius-xl);
  padding: 22px;
}

.ncr-eeg-shell__wave {
  position: relative;
  min-height: 128px;
  margin-top: 20px;
  overflow: hidden;
  border: var(--ncr-border-thin);
  border-radius: var(--ncr-radius-lg);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.56), rgba(255, 255, 255, 0.18)),
    linear-gradient(rgba(22, 127, 168, 0.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(22, 127, 168, 0.09) 1px, transparent 1px);
  background-size: 100% 100%, 32px 32px, 32px 32px;
}

.ncr-eeg-shell__wave::before,
.ncr-eeg-shell__wave::after {
  content: "";
  position: absolute;
  left: -6%;
  right: -6%;
  top: 22%;
  height: 76px;
  background: linear-gradient(90deg, transparent, var(--ncr-color-monitoring), var(--ncr-color-calm-blue), transparent);
  clip-path: polygon(
    0 55%,
    4% 55%,
    6% 50%,
    8% 62%,
    10% 36%,
    12% 58%,
    15% 54%,
    19% 57%,
    22% 42%,
    24% 66%,
    26% 51%,
    31% 55%,
    34% 46%,
    36% 63%,
    39% 54%,
    44% 55%,
    48% 40%,
    50% 64%,
    53% 53%,
    58% 56%,
    62% 44%,
    65% 62%,
    69% 54%,
    74% 56%,
    78% 48%,
    81% 61%,
    86% 54%,
    91% 56%,
    95% 49%,
    100% 55%,
    100% 59%,
    95% 53%,
    91% 60%,
    86% 58%,
    81% 65%,
    78% 52%,
    74% 60%,
    69% 58%,
    65% 66%,
    62% 48%,
    58% 60%,
    53% 57%,
    50% 68%,
    48% 44%,
    44% 59%,
    39% 58%,
    36% 67%,
    34% 50%,
    31% 59%,
    26% 55%,
    24% 70%,
    22% 46%,
    19% 61%,
    15% 58%,
    12% 62%,
    10% 40%,
    8% 66%,
    6% 54%,
    4% 59%,
    0 59%
  );
  filter: drop-shadow(0 0 7px rgba(34, 168, 161, 0.32));
  animation: ncr-wave-drift 14s linear infinite;
}

.ncr-eeg-shell__wave::after {
  top: 46%;
  opacity: 0.38;
  animation-duration: 19s;
  animation-direction: reverse;
}

.ncr-eeg-shell__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.ncr-demo-layout {
  display: grid;
  gap: 18px;
}

.ncr-demo-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 18px;
  align-items: stretch;
}

.ncr-demo-section {
  border-radius: var(--ncr-radius-xl);
  padding: 22px;
}

.ncr-demo-title {
  margin: 8px 0 0;
  color: var(--ncr-color-text);
  font-size: clamp(32px, 5vw, 56px);
  line-height: 1.02;
  letter-spacing: 0;
}

.ncr-demo-copy {
  max-width: 720px;
  margin: 14px 0 0;
  color: var(--ncr-color-text-muted);
  font-size: 16px;
  line-height: 1.7;
}

.ncr-demo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 22px;
}

.ncr-demo-controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

[data-tone="primary"] {
  --ncr-tone-color: var(--ncr-color-primary);
}

[data-tone="clinical"] {
  --ncr-tone-color: var(--ncr-color-clinical);
}

[data-tone="monitoring"] {
  --ncr-tone-color: var(--ncr-color-monitoring);
}

[data-tone="calm"] {
  --ncr-tone-color: var(--ncr-color-calm);
}

[data-tone="warning"] {
  --ncr-tone-color: var(--ncr-color-warning);
}

[data-tone="critical"] {
  --ncr-tone-color: var(--ncr-color-critical);
}

[data-tone="neutral"] {
  --ncr-tone-color: var(--ncr-color-text-muted);
}

@keyframes ncr-data-current {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(44px, 0, 0);
  }
}

@keyframes ncr-medical-eeg-drift {
  from {
    transform: translate3d(-3%, 0, 0);
  }
  to {
    transform: translate3d(3%, 0, 0);
  }
}

@keyframes ncr-medical-status-line {
  0%,
  34% {
    opacity: 0.22;
    transform: translateX(-16%);
  }
  72%,
  100% {
    opacity: 0.48;
    transform: translateX(16%);
  }
}

@keyframes ncr-button-sheen {
  0%,
  56% {
    transform: translateX(0) skewX(-18deg);
  }
  100% {
    transform: translateX(360%) skewX(-18deg);
  }
}

@keyframes ncr-wave-drift {
  from {
    transform: translate3d(0, -50%, 0);
  }
  to {
    transform: translate3d(120px, -50%, 0);
  }
}

@media (max-width: 920px) {
  .ncr-page-background__content {
    width: min(100% - 28px, 1180px);
    padding: 28px 0;
  }

  .ncr-demo-hero,
  .ncr-data-panel__grid,
  .ncr-demo-controls {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  :where(.ncr-design-system, [data-ncr-theme]) *,
  :where(.ncr-design-system, [data-ncr-theme]) *::before,
  :where(.ncr-design-system, [data-ncr-theme]) *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 1ms !important;
  }
}
`;
