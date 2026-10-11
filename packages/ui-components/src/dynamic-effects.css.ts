// Shared dynamic visual effects are exported as an injectable CSS string because
// the package is compiled by tsc without a CSS bundling step.
export const NEURO_DYNAMIC_EFFECTS_CSS = `
.ncr-dynamic-effects-scope,
.ncr-dynamic-effect {
  --ncr-dynamic-opacity: 0.58;
  --ncr-dynamic-speed: 1;
  --ncr-dynamic-size: 280px;
  --ncr-dynamic-x: 12%;
  --ncr-dynamic-y: 12%;
  --ncr-dynamic-tone: var(--ncr-color-clinical, #1a9bb5);
  --ncr-dynamic-tone-soft: rgba(38, 184, 210, 0.18);
}

.ncr-dynamic-effect {
  pointer-events: none;
}

.ncr-dynamic-effect[data-intensity="minimal"] {
  --ncr-dynamic-opacity: 0.22;
  --ncr-dynamic-speed: 0.66;
}

.ncr-dynamic-effect[data-intensity="low"] {
  --ncr-dynamic-opacity: 0.38;
  --ncr-dynamic-speed: 0.82;
}

.ncr-dynamic-effect[data-intensity="medium"] {
  --ncr-dynamic-opacity: 0.54;
  --ncr-dynamic-speed: 1;
}

.ncr-dynamic-effect[data-intensity="high"] {
  --ncr-dynamic-opacity: 0.72;
  --ncr-dynamic-speed: 1.12;
}

.ncr-dynamic-effect[data-training-mode="true"] {
  --ncr-dynamic-opacity: 0.24;
  --ncr-dynamic-speed: 0.54;
}

.ncr-dynamic-effect[data-tone="monitoring"] {
  --ncr-dynamic-tone: var(--ncr-color-monitoring, #22a8a1);
  --ncr-dynamic-tone-soft: rgba(34, 168, 161, 0.16);
}

.ncr-dynamic-effect[data-tone="calm"] {
  --ncr-dynamic-tone: var(--ncr-color-calm, #7b8ee8);
  --ncr-dynamic-tone-soft: rgba(123, 142, 232, 0.15);
}

.ncr-dynamic-effect[data-tone="warning"] {
  --ncr-dynamic-tone: var(--ncr-color-warning, #b9851e);
  --ncr-dynamic-tone-soft: rgba(185, 133, 30, 0.12);
}

.ncr-dynamic-effect[data-tone="neutral"] {
  --ncr-dynamic-tone: var(--ncr-color-text-muted, #5f7280);
  --ncr-dynamic-tone-soft: rgba(95, 114, 128, 0.12);
}

.ncr-animated-eeg-wave {
  display: block;
  width: 100%;
  min-height: 92px;
  opacity: var(--ncr-dynamic-opacity);
  overflow: visible;
}

.ncr-animated-eeg-wave__grid {
  opacity: 0.18;
}

.ncr-animated-eeg-wave__trace {
  fill: none;
  stroke: var(--ncr-dynamic-tone);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 10px var(--ncr-dynamic-tone-soft));
  stroke-dasharray: 24 14;
  animation: ncr-eeg-wave-drift calc(12s / var(--ncr-dynamic-speed)) linear infinite;
}

.ncr-animated-eeg-wave__trace--secondary {
  stroke-width: 2;
  opacity: 0.56;
  animation-duration: calc(18s / var(--ncr-dynamic-speed));
  animation-direction: reverse;
}

.ncr-neural-particles {
  position: absolute;
  inset: 0;
  opacity: var(--ncr-dynamic-opacity);
  overflow: hidden;
}

.ncr-neural-particles svg {
  width: 100%;
  height: 100%;
}

.ncr-neural-particles__link {
  stroke: var(--ncr-dynamic-tone);
  stroke-width: 0.7;
  opacity: 0.2;
  animation: ncr-neural-link-breathe calc(10s / var(--ncr-dynamic-speed)) ease-in-out infinite;
}

.ncr-neural-particles__node {
  fill: var(--ncr-dynamic-tone);
  opacity: 0.45;
  filter: drop-shadow(0 0 8px var(--ncr-dynamic-tone-soft));
  animation: ncr-neural-node-float calc(13s / var(--ncr-dynamic-speed)) ease-in-out infinite;
}

.ncr-neural-particles__node:nth-of-type(2n) {
  animation-delay: -3s;
}

.ncr-neural-particles__node:nth-of-type(3n) {
  animation-delay: -6s;
}

.ncr-data-flow-grid {
  position: absolute;
  inset: 0;
  opacity: var(--ncr-dynamic-opacity);
  background-image:
    linear-gradient(rgba(37, 151, 189, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(37, 151, 189, 0.12) 1px, transparent 1px),
    linear-gradient(110deg, transparent 0 32%, var(--ncr-dynamic-tone-soft) 42%, transparent 52%);
  background-size: 44px 44px, 44px 44px, 260px 100%;
  mask-image: radial-gradient(circle at 50% 32%, black, transparent 76%);
  animation: ncr-data-grid-flow calc(20s / var(--ncr-dynamic-speed)) linear infinite;
}

.ncr-soft-gradient-orb {
  position: absolute;
  left: var(--ncr-dynamic-x);
  top: var(--ncr-dynamic-y);
  width: var(--ncr-dynamic-size);
  height: var(--ncr-dynamic-size);
  opacity: calc(var(--ncr-dynamic-opacity) * 0.62);
  border-radius: 999px;
  background:
    radial-gradient(circle, var(--ncr-dynamic-tone-soft) 0 28%, transparent 68%),
    radial-gradient(circle at 62% 32%, rgba(255, 255, 255, 0.28), transparent 48%);
  filter: blur(10px);
  transform: translate3d(-50%, -50%, 0);
  animation: ncr-orb-breathe calc(16s / var(--ncr-dynamic-speed)) ease-in-out infinite;
}

.ncr-glow-pulse-card,
.ncr-scan-line-highlight {
  position: relative;
  overflow: hidden;
}

.ncr-glow-pulse-card {
  border: 1px solid rgba(114, 196, 224, 0.28);
  border-radius: var(--ncr-radius-lg, 16px);
  background: var(--ncr-color-surface, rgba(255, 255, 255, 0.74));
  box-shadow:
    0 20px 54px rgba(20, 85, 121, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.58);
  isolation: isolate;
}

.ncr-glow-pulse-card::before {
  content: "";
  position: absolute;
  inset: -1px;
  z-index: -1;
  border-radius: inherit;
  opacity: calc(var(--ncr-dynamic-opacity) * 0.8);
  background: radial-gradient(circle at 30% 0%, var(--ncr-dynamic-tone-soft), transparent 48%);
  animation: ncr-card-pulse calc(9s / var(--ncr-dynamic-speed)) ease-in-out infinite;
}

.ncr-glow-pulse-card__content {
  position: relative;
  z-index: 1;
}

.ncr-floating-metric {
  display: inline-grid;
  gap: 6px;
  min-width: 142px;
  border: 1px solid rgba(116, 185, 212, 0.26);
  border-radius: var(--ncr-radius-lg, 16px);
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 16px 40px rgba(20, 85, 121, 0.1);
  animation: ncr-metric-float calc(8s / var(--ncr-dynamic-speed)) ease-in-out infinite;
}

[data-ncr-theme="neuro-dark"] .ncr-floating-metric,
[data-ncr-theme="neuro-dark"] .ncr-glow-pulse-card {
  background: rgba(9, 26, 43, 0.7);
}

.ncr-floating-metric span,
.ncr-floating-metric strong,
.ncr-floating-metric small {
  display: block;
}

.ncr-floating-metric span {
  color: var(--ncr-color-text-muted, #5f7280);
  font-size: 12px;
  font-weight: 760;
}

.ncr-floating-metric strong {
  color: var(--ncr-color-text, #0d2533);
  font-size: 32px;
  line-height: 1;
}

.ncr-floating-metric small {
  color: var(--ncr-dynamic-tone);
  font-size: 12px;
  font-weight: 760;
}

.ncr-page-transition {
  animation: ncr-page-enter calc(620ms / var(--ncr-dynamic-speed)) cubic-bezier(0.2, 0, 0, 1) both;
}

.ncr-loading-brain-scan {
  display: grid;
  place-items: center;
  gap: 12px;
  color: var(--ncr-color-text, #0d2533);
  text-align: center;
}

.ncr-loading-brain-scan svg {
  width: var(--ncr-loading-size, 104px);
  height: var(--ncr-loading-size, 104px);
  opacity: var(--ncr-dynamic-opacity);
}

.ncr-loading-brain-scan__outline {
  fill: none;
  stroke: var(--ncr-dynamic-tone);
  stroke-width: 3;
  opacity: 0.72;
}

.ncr-loading-brain-scan__path {
  fill: none;
  stroke: var(--ncr-color-calm, #7b8ee8);
  stroke-width: 2;
  opacity: 0.5;
}

.ncr-loading-brain-scan__line {
  stroke: rgba(255, 255, 255, 0.82);
  stroke-width: 5;
  filter: drop-shadow(0 0 8px var(--ncr-dynamic-tone));
  animation: ncr-brain-scan calc(3.8s / var(--ncr-dynamic-speed)) ease-in-out infinite;
}

.ncr-loading-brain-scan span {
  color: var(--ncr-color-text-muted, #5f7280);
  font-size: 13px;
  font-weight: 760;
}

.ncr-realtime-signal-ring {
  display: inline-grid;
  place-items: center;
  position: relative;
  min-width: 132px;
}

.ncr-realtime-signal-ring svg {
  width: var(--ncr-ring-size, 128px);
  height: var(--ncr-ring-size, 128px);
  transform: rotate(-90deg);
}

.ncr-realtime-signal-ring__track {
  fill: none;
  stroke: rgba(116, 185, 212, 0.18);
  stroke-width: 9;
}

.ncr-realtime-signal-ring__progress {
  fill: none;
  stroke: var(--ncr-dynamic-tone);
  stroke-width: 9;
  stroke-linecap: round;
  filter: drop-shadow(0 0 8px var(--ncr-dynamic-tone-soft));
  transition: stroke-dashoffset 720ms cubic-bezier(0.2, 0, 0, 1);
  animation: ncr-ring-glow calc(6s / var(--ncr-dynamic-speed)) ease-in-out infinite;
}

.ncr-realtime-signal-ring__label {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 22px;
  text-align: center;
}

.ncr-realtime-signal-ring__label strong,
.ncr-realtime-signal-ring__label span {
  display: block;
}

.ncr-realtime-signal-ring__label strong {
  color: var(--ncr-color-text, #0d2533);
  font-size: 24px;
  line-height: 1;
}

.ncr-realtime-signal-ring__label span {
  margin-top: 6px;
  color: var(--ncr-color-text-muted, #5f7280);
  font-size: 12px;
  font-weight: 760;
}

.ncr-scan-line-highlight::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: calc(var(--ncr-dynamic-opacity) * 0.64);
  background: linear-gradient(105deg, transparent 0 42%, rgba(255, 255, 255, 0.42) 50%, transparent 58% 100%);
  transform: translateX(-120%);
  animation: ncr-scan-highlight calc(8.5s / var(--ncr-dynamic-speed)) cubic-bezier(0.2, 0, 0, 1) infinite;
}

.ncr-dynamic-showcase {
  position: relative;
  display: grid;
  gap: 18px;
  min-height: 640px;
  overflow: hidden;
  border-radius: 24px;
  padding: 24px;
  color: var(--ncr-color-text);
  background:
    radial-gradient(circle at 12% 12%, rgba(38, 184, 210, 0.14), transparent 32%),
    radial-gradient(circle at 84% 8%, rgba(123, 142, 232, 0.14), transparent 30%),
    rgba(255, 255, 255, 0.28);
}

[data-ncr-theme="neuro-dark"] .ncr-dynamic-showcase {
  background:
    radial-gradient(circle at 12% 12%, rgba(38, 184, 210, 0.12), transparent 32%),
    radial-gradient(circle at 84% 8%, rgba(123, 142, 232, 0.12), transparent 30%),
    rgba(6, 18, 31, 0.28);
}

.ncr-dynamic-showcase__content {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 18px;
}

.ncr-dynamic-showcase__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
  gap: 18px;
  align-items: stretch;
}

.ncr-dynamic-showcase__hero h1,
.ncr-dynamic-showcase__hero p {
  margin: 0;
}

.ncr-dynamic-showcase__hero h1 {
  margin-top: 10px;
  max-width: 720px;
  font-size: clamp(30px, 5vw, 54px);
  line-height: 1.05;
  letter-spacing: 0;
}

.ncr-dynamic-showcase__hero p {
  margin-top: 14px;
  color: var(--ncr-color-text-muted);
  line-height: 1.7;
}

.ncr-dynamic-showcase__panel {
  border: 1px solid rgba(116, 185, 212, 0.26);
  border-radius: 22px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(18px);
  box-shadow: 0 20px 54px rgba(20, 85, 121, 0.12), inset 0 1px 0 rgba(255,255,255,0.58);
}

[data-ncr-theme="neuro-dark"] .ncr-dynamic-showcase__panel {
  background: rgba(9, 26, 43, 0.68);
}

.ncr-dynamic-showcase__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.ncr-dynamic-showcase__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.ncr-dynamic-showcase__rings {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: center;
}

@keyframes ncr-eeg-wave-drift {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: -152;
  }
}

@keyframes ncr-neural-link-breathe {
  0%,
  100% {
    opacity: 0.14;
  }
  50% {
    opacity: 0.34;
  }
}

@keyframes ncr-neural-node-float {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(0, -8px, 0);
  }
}

@keyframes ncr-data-grid-flow {
  from {
    background-position: 0 0, 0 0, -260px 0;
  }
  to {
    background-position: 44px 44px, 44px 44px, 260px 0;
  }
}

@keyframes ncr-orb-breathe {
  0%,
  100% {
    transform: translate3d(-50%, -50%, 0) scale(0.96);
  }
  50% {
    transform: translate3d(-50%, -50%, 0) scale(1.06);
  }
}

@keyframes ncr-card-pulse {
  0%,
  100% {
    opacity: calc(var(--ncr-dynamic-opacity) * 0.46);
  }
  50% {
    opacity: calc(var(--ncr-dynamic-opacity) * 0.86);
  }
}

@keyframes ncr-metric-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

@keyframes ncr-page-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes ncr-brain-scan {
  0%,
  100% {
    transform: translateY(-32px);
    opacity: 0.18;
  }
  45%,
  55% {
    opacity: 0.82;
  }
  50% {
    transform: translateY(32px);
  }
}

@keyframes ncr-ring-glow {
  0%,
  100% {
    opacity: 0.78;
  }
  50% {
    opacity: 1;
  }
}

@keyframes ncr-scan-highlight {
  0%,
  42% {
    transform: translateX(-120%);
  }
  82%,
  100% {
    transform: translateX(120%);
  }
}

@media (max-width: 980px) {
  .ncr-dynamic-showcase__hero,
  .ncr-dynamic-showcase__grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ncr-dynamic-effect,
  .ncr-dynamic-effect *,
  .ncr-dynamic-effect *::before,
  .ncr-dynamic-effect *::after,
  .ncr-page-transition,
  .ncr-scan-line-highlight::after,
  .ncr-glow-pulse-card::before {
    animation: none !important;
    transition: none !important;
  }

  .ncr-neural-particles__link,
  .ncr-neural-particles__node,
  .ncr-data-flow-grid,
  .ncr-soft-gradient-orb {
    opacity: 0.14 !important;
  }
}
`;
