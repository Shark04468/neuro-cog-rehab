import { describe, expect, it } from "vitest";

import {
  EEGQualityDetectionError,
  EEGQualityDetector,
  assessEEGQualityFrame,
  buildEEGQualityRules,
  type EEGFeatureFrame
} from "../src/index.js";

function frame(overrides: Partial<EEGFeatureFrame> = {}): EEGFeatureFrame {
  return {
    timestamp: "2026-06-15T08:00:00.000Z",
    attentionScore: 70,
    relaxationScore: 55,
    fatigueScore: 20,
    thetaPower: 0.31,
    alphaPower: 0.36,
    betaPower: 0.33,
    signalQuality: 92,
    artifactLevel: 8,
    ...overrides
  };
}

describe("EEGQualityDetector", () => {
  it("marks stable frames as good without clinical wording", () => {
    const result = assessEEGQualityFrame(frame());

    expect(result.status).toBe("good");
    expect(result.reasonCode).toBe("quality_within_range");
    expect(result.reason.toLowerCase()).not.toContain("diagnosis");
    expect(result.reason.toLowerCase()).not.toContain("treatment");
    expect(result.metrics.signalQuality).toBe(92);
  });

  it("marks low signal quality as unstable and explains headset contact", () => {
    const result = assessEEGQualityFrame(frame({ signalQuality: 44 }));

    expect(result.status).toBe("unstable");
    expect(result.reasonCode).toBe("signal_below_usable_threshold");
    expect(result.reason).toContain("headset fit");
  });

  it("marks high artifact levels as noisy", () => {
    const result = assessEEGQualityFrame(frame({ artifactLevel: 72 }));

    expect(result.status).toBe("noisy");
    expect(result.reasonCode).toBe("artifact_above_noisy_threshold");
  });

  it("marks missing frames as disconnected after the configured timeout", () => {
    const detector = new EEGQualityDetector({ disconnectedAfterMs: 2500 });
    detector.update(frame());

    const result = detector.checkTimeout(new Date("2026-06-15T08:00:03.000Z"));

    expect(result.status).toBe("disconnected");
    expect(result.reasonCode).toBe("data_stream_timeout");
    expect(result.metrics.missingDataMs).toBe(3000);
  });

  it("recovers from disconnected to good or unstable when new frames arrive", () => {
    const detector = new EEGQualityDetector({ disconnectedAfterMs: 1000 });
    detector.update(frame());
    expect(detector.checkTimeout(new Date("2026-06-15T08:00:02.000Z")).status).toBe("disconnected");

    const recoveredGood = detector.update(frame({ timestamp: "2026-06-15T08:00:03.000Z" }));
    const recoveredUnstable = detector.update(
      frame({ timestamp: "2026-06-15T08:00:04.000Z", signalQuality: 60 })
    );

    expect(recoveredGood.status).toBe("good");
    expect(recoveredUnstable.status).toBe("unstable");
  });

  it("supports configurable thresholds", () => {
    const strictRules = buildEEGQualityRules({
      minGoodSignalQuality: 95,
      minUsableSignalQuality: 70,
      maxGoodArtifactLevel: 10,
      noisyArtifactLevel: 25,
      disconnectedAfterMs: 5000
    });

    const result = assessEEGQualityFrame(frame({ signalQuality: 92 }), strictRules);

    expect(result.status).toBe("unstable");
    expect(result.reasonCode).toBe("signal_below_good_threshold");
  });

  it("treats exact EEG quality thresholds as deterministic boundary values", () => {
    expect(assessEEGQualityFrame(frame({ signalQuality: 75, artifactLevel: 20 })).status).toBe(
      "good"
    );
    expect(assessEEGQualityFrame(frame({ signalQuality: 50 })).reasonCode).toBe(
      "signal_below_good_threshold"
    );
    expect(assessEEGQualityFrame(frame({ signalQuality: 49.99 })).reasonCode).toBe(
      "signal_below_usable_threshold"
    );
    expect(assessEEGQualityFrame(frame({ artifactLevel: 55 })).status).toBe("noisy");
  });

  it("marks a stream as disconnected exactly at the missing-data boundary", () => {
    const detector = new EEGQualityDetector({ disconnectedAfterMs: 3000 });
    detector.update(frame());

    const boundary = detector.checkTimeout(new Date("2026-06-15T08:00:03.000Z"));
    const justBeforeBoundary = detector.update(
      frame({ timestamp: "2026-06-15T08:00:06.000Z" }),
      new Date("2026-06-15T08:00:08.999Z")
    );

    expect(boundary.status).toBe("disconnected");
    expect(boundary.metrics.missingDataMs).toBe(3000);
    expect(justBeforeBoundary.status).toBe("good");
    expect(justBeforeBoundary.metrics.missingDataMs).toBe(2999);
  });

  it("handles invalid rules and frames with explicit errors", () => {
    expect(
      () =>
        new EEGQualityDetector({
          minGoodSignalQuality: 40,
          minUsableSignalQuality: 60
        })
    ).toThrow(EEGQualityDetectionError);

    expect(() => assessEEGQualityFrame(frame({ signalQuality: 120 }))).toThrow(
      EEGQualityDetectionError
    );
    expect(() => assessEEGQualityFrame(frame({ timestamp: "not-an-iso-time" }))).toThrow(
      EEGQualityDetectionError
    );
    expect(() => new EEGQualityDetector({ disconnectedAfterMs: 0 })).toThrow(
      EEGQualityDetectionError
    );
  });
});
