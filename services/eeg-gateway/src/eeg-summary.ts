import type { EEGQualityStatus } from "@neuro-cog-rehab/eeg-features";

import type {
  EEGFeatureFrame,
  EegDataSource,
  EegGatewayQualityCounts,
  EegGatewaySessionSummary,
  EegQualitySnapshot
} from "./types.js";

interface RunningTotals {
  attentionScore: number;
  relaxationScore: number;
  fatigueScore: number;
  signalQuality: number;
  artifactLevel: number;
}

export class EegSessionSummaryAccumulator {
  private frameCount = 0;
  private readonly totals: RunningTotals = {
    attentionScore: 0,
    relaxationScore: 0,
    fatigueScore: 0,
    signalQuality: 0,
    artifactLevel: 0
  };

  private readonly qualityCounts: EegGatewayQualityCounts = {
    good: 0,
    unstable: 0,
    noisy: 0,
    disconnected: 0
  };

  private readonly abnormalEvents: EegGatewaySessionSummary["abnormalEvents"] = [];
  private latestQuality: EegQualitySnapshot | null = null;
  private firstFrameAt: string | null = null;

  addFrame(frame: EEGFeatureFrame, quality: EegQualitySnapshot): void {
    this.frameCount += 1;
    this.totals.attentionScore += frame.attentionScore;
    this.totals.relaxationScore += frame.relaxationScore;
    this.totals.fatigueScore += frame.fatigueScore;
    this.totals.signalQuality += frame.signalQuality;
    this.totals.artifactLevel += frame.artifactLevel;
    this.qualityCounts[quality.status] += 1;
    this.latestQuality = quality;
    this.firstFrameAt ??= frame.timestamp;

    this.recordAbnormalEvent(quality);
  }

  recordDisconnect(occurredAt: string): void {
    this.qualityCounts.disconnected += 1;
    this.abnormalEvents.push({
      eventType: "device_disconnect",
      occurredAt,
      message: "EEG data stream did not provide frames within the configured time window."
    });
  }

  toSummary(input: {
    userId: string;
    sessionId: string;
    source: EegDataSource | null;
    createdAt: string;
    endedAt: string;
    completionStatus: EegGatewaySessionSummary["completionStatus"];
  }): EegGatewaySessionSummary {
    const startedAt = this.firstFrameAt ?? input.createdAt;
    const durationSeconds = Math.max(0, (Date.parse(input.endedAt) - Date.parse(startedAt)) / 1000);

    return {
      userId: input.userId,
      sessionId: input.sessionId,
      source: input.source,
      startedAt,
      endedAt: input.endedAt,
      durationSeconds: round(durationSeconds, 2),
      frameCount: this.frameCount,
      averageAttentionScore: this.average("attentionScore"),
      averageRelaxationScore: this.average("relaxationScore"),
      averageFatigueScore: this.average("fatigueScore"),
      averageSignalQuality: this.average("signalQuality"),
      averageArtifactLevel: this.average("artifactLevel"),
      latestQualityStatus: this.latestQuality,
      qualityCounts: { ...this.qualityCounts },
      completionStatus: input.completionStatus,
      abnormalEvents: [...this.abnormalEvents]
    };
  }

  private average(field: keyof RunningTotals): number | null {
    if (this.frameCount === 0) {
      return null;
    }

    return round(this.totals[field] / this.frameCount, 2);
  }

  private recordAbnormalEvent(quality: EegQualitySnapshot): void {
    const eventType = eventTypeForQuality(quality.status);
    if (!eventType) {
      return;
    }

    this.abnormalEvents.push({
      eventType,
      occurredAt: quality.checkedAt,
      message: quality.reason
    });
  }
}

function eventTypeForQuality(
  status: EEGQualityStatus
): EegGatewaySessionSummary["abnormalEvents"][number]["eventType"] | null {
  if (status === "unstable") {
    return "low_signal_quality";
  }
  if (status === "noisy") {
    return "noisy_signal";
  }
  if (status === "disconnected") {
    return "device_disconnect";
  }

  return null;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
