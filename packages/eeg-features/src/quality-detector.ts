import {
  DEFAULT_EEG_QUALITY_RULES,
  type EEGFeatureFrame,
  type EEGQualityAssessment,
  type EEGQualityMetrics,
  type EEGQualityReasonCode,
  type EEGQualityRuleOverrides,
  type EEGQualityRules,
  type EEGQualityStatus
} from "./types.js";

export type EEGQualityErrorCode = "INVALID_RULES" | "INVALID_FRAME" | "INVALID_TIMESTAMP";

export class EEGQualityDetectionError extends Error {
  constructor(
    public readonly code: EEGQualityErrorCode,
    message: string
  ) {
    super(message);
    this.name = "EEGQualityDetectionError";
  }
}

export class EEGQualityDetector {
  private readonly rules: EEGQualityRules;
  private lastFrame: EEGFeatureFrame | null = null;

  constructor(ruleOverrides: EEGQualityRuleOverrides = {}) {
    this.rules = buildEEGQualityRules(ruleOverrides);
  }

  getRules(): EEGQualityRules {
    return { ...this.rules };
  }

  reset(): void {
    this.lastFrame = null;
  }

  /**
   * Accepts the latest frame from a stream and immediately returns its quality.
   * A fresh frame automatically clears a previous disconnected state.
   */
  update(frame: EEGFeatureFrame, checkedAt?: Date): EEGQualityAssessment {
    validateFrame(frame);
    const frameTimeMs = parseTimestamp(frame.timestamp, "frame timestamp");
    const checkedAtMs = checkedAt ? parseDate(checkedAt, "checkedAt") : frameTimeMs;
    this.lastFrame = { ...frame };

    return assessFrame(frame, checkedAtMs, frameTimeMs, this.rules);
  }

  /**
   * Checks stream continuity when no new frame has arrived.
   * Call this from a timer in WebSocket or training-session integrations.
   */
  checkTimeout(checkedAt = new Date()): EEGQualityAssessment {
    const checkedAtMs = parseDate(checkedAt, "checkedAt");

    if (!this.lastFrame) {
      return createAssessment({
        status: "disconnected",
        reasonCode: "no_frame_received",
        reason:
          "No EEG feature frame has been received; check whether the data source is connected.",
        checkedAtMs,
        lastFrameAtMs: null,
        metrics: {
          signalQuality: null,
          artifactLevel: null,
          missingDataMs: this.rules.disconnectedAfterMs
        }
      });
    }

    const lastFrameAtMs = parseTimestamp(this.lastFrame.timestamp, "last frame timestamp");
    return assessFrame(this.lastFrame, checkedAtMs, lastFrameAtMs, this.rules);
  }
}

export function buildEEGQualityRules(overrides: EEGQualityRuleOverrides = {}): EEGQualityRules {
  const rules: EEGQualityRules = {
    ...DEFAULT_EEG_QUALITY_RULES,
    ...overrides
  };

  validateRules(rules);
  return rules;
}

export function assessEEGQualityFrame(
  frame: EEGFeatureFrame,
  ruleOverrides: EEGQualityRuleOverrides = {},
  checkedAt?: Date
): EEGQualityAssessment {
  const detector = new EEGQualityDetector(ruleOverrides);
  return detector.update(frame, checkedAt);
}

function assessFrame(
  frame: EEGFeatureFrame,
  checkedAtMs: number,
  frameTimeMs: number,
  rules: EEGQualityRules
): EEGQualityAssessment {
  const missingDataMs = Math.max(0, checkedAtMs - frameTimeMs);
  const metrics: EEGQualityMetrics = {
    signalQuality: frame.signalQuality,
    artifactLevel: frame.artifactLevel,
    missingDataMs
  };

  if (missingDataMs >= rules.disconnectedAfterMs) {
    return createAssessment({
      status: "disconnected",
      reasonCode: "data_stream_timeout",
      reason:
        "No EEG feature frame arrived within the configured time window; check the data connection.",
      checkedAtMs,
      lastFrameAtMs: frameTimeMs,
      metrics
    });
  }

  if (frame.artifactLevel >= rules.noisyArtifactLevel) {
    return createAssessment({
      status: "noisy",
      reasonCode: "artifact_above_noisy_threshold",
      reason:
        "Artifact level is above the noisy threshold; reduce movement and check sensor contact before continuing.",
      checkedAtMs,
      lastFrameAtMs: frameTimeMs,
      metrics
    });
  }

  if (frame.signalQuality < rules.minUsableSignalQuality) {
    return createAssessment({
      status: "unstable",
      reasonCode: "signal_below_usable_threshold",
      reason:
        "Signal quality is below the usable threshold; check headset fit and electrode contact.",
      checkedAtMs,
      lastFrameAtMs: frameTimeMs,
      metrics
    });
  }

  if (frame.signalQuality < rules.minGoodSignalQuality) {
    return createAssessment({
      status: "unstable",
      reasonCode: "signal_below_good_threshold",
      reason:
        "Signal quality is below the good threshold; monitor headset fit and signal stability.",
      checkedAtMs,
      lastFrameAtMs: frameTimeMs,
      metrics
    });
  }

  if (frame.artifactLevel > rules.maxGoodArtifactLevel) {
    return createAssessment({
      status: "unstable",
      reasonCode: "artifact_above_good_threshold",
      reason:
        "Artifact level is above the good range but below the noisy threshold; monitor movement and sensor contact.",
      checkedAtMs,
      lastFrameAtMs: frameTimeMs,
      metrics
    });
  }

  return createAssessment({
    status: "good",
    reasonCode: "quality_within_range",
    reason: "Signal quality is within the configured range for training-state reference.",
    checkedAtMs,
    lastFrameAtMs: frameTimeMs,
    metrics
  });
}

function createAssessment(input: {
  status: EEGQualityStatus;
  reasonCode: EEGQualityReasonCode;
  reason: string;
  checkedAtMs: number;
  lastFrameAtMs: number | null;
  metrics: EEGQualityMetrics;
}): EEGQualityAssessment {
  return {
    status: input.status,
    reasonCode: input.reasonCode,
    reason: input.reason,
    checkedAt: new Date(input.checkedAtMs).toISOString(),
    lastFrameAt: input.lastFrameAtMs === null ? null : new Date(input.lastFrameAtMs).toISOString(),
    metrics: input.metrics
  };
}

function validateRules(rules: EEGQualityRules): void {
  validateScore("minGoodSignalQuality", rules.minGoodSignalQuality);
  validateScore("minUsableSignalQuality", rules.minUsableSignalQuality);
  validateScore("maxGoodArtifactLevel", rules.maxGoodArtifactLevel);
  validateScore("noisyArtifactLevel", rules.noisyArtifactLevel);

  if (rules.minUsableSignalQuality > rules.minGoodSignalQuality) {
    throw new EEGQualityDetectionError(
      "INVALID_RULES",
      "minUsableSignalQuality must be less than or equal to minGoodSignalQuality."
    );
  }

  if (rules.maxGoodArtifactLevel >= rules.noisyArtifactLevel) {
    throw new EEGQualityDetectionError(
      "INVALID_RULES",
      "maxGoodArtifactLevel must be lower than noisyArtifactLevel."
    );
  }

  if (!Number.isFinite(rules.disconnectedAfterMs) || rules.disconnectedAfterMs <= 0) {
    throw new EEGQualityDetectionError(
      "INVALID_RULES",
      "disconnectedAfterMs must be a positive finite number."
    );
  }
}

function validateFrame(frame: EEGFeatureFrame): void {
  parseTimestamp(frame.timestamp, "frame timestamp");

  for (const [fieldName, value] of Object.entries(frame)) {
    if (fieldName === "timestamp") {
      continue;
    }

    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new EEGQualityDetectionError("INVALID_FRAME", `${fieldName} must be a finite number.`);
    }
  }

  validateScore("signalQuality", frame.signalQuality, "INVALID_FRAME");
  validateScore("artifactLevel", frame.artifactLevel, "INVALID_FRAME");
}

function validateScore(
  fieldName: string,
  value: number,
  code: EEGQualityErrorCode = "INVALID_RULES"
): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new EEGQualityDetectionError(code, `${fieldName} must be between 0 and 100.`);
  }
}

function parseTimestamp(timestamp: string, fieldName: string): number {
  const timestampMs = Date.parse(timestamp);
  if (!Number.isFinite(timestampMs)) {
    throw new EEGQualityDetectionError(
      "INVALID_TIMESTAMP",
      `${fieldName} must be a valid ISO time.`
    );
  }

  return timestampMs;
}

function parseDate(value: Date, fieldName: string): number {
  const timestampMs = value.getTime();
  if (!Number.isFinite(timestampMs)) {
    throw new EEGQualityDetectionError("INVALID_TIMESTAMP", `${fieldName} must be a valid Date.`);
  }

  return timestampMs;
}
