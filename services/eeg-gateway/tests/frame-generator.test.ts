import { describe, expect, it } from "vitest";

import { EegFrameGenerator } from "../src/index.js";

const stableRandom = () => 0.5;

describe("EegFrameGenerator", () => {
  it("generates focused frames with stable attention", () => {
    const generator = new EegFrameGenerator({ state: "focused", random: stableRandom });
    const frame = generator.nextFrame(new Date("2026-06-15T00:00:00.000Z"));

    expect(frame.timestamp).toBe("2026-06-15T00:00:00.000Z");
    expect(frame.attentionScore).toBeGreaterThan(frame.relaxationScore);
    expect(frame.attentionScore).toBeGreaterThanOrEqual(70);
    expect(frame.fatigueScore).toBeLessThan(30);
    expect(frame.signalQuality).toBeGreaterThan(85);
  });

  it("generates relaxed frames with higher relaxation score", () => {
    const generator = new EegFrameGenerator({ state: "relaxed", random: stableRandom });
    const frame = generator.nextFrame();

    expect(frame.relaxationScore).toBeGreaterThan(frame.attentionScore);
    expect(frame.alphaPower).toBeGreaterThan(frame.betaPower);
    expect(frame.artifactLevel).toBeLessThan(15);
  });

  it("increases fatigue over time in fatigued state", () => {
    const generator = new EegFrameGenerator({ state: "fatigued", random: stableRandom });
    const first = generator.nextFrame();
    const second = generator.nextFrame();
    const third = generator.nextFrame();

    expect(first.fatigueScore).toBeLessThan(second.fatigueScore);
    expect(second.fatigueScore).toBeLessThan(third.fatigueScore);
    expect(third.thetaPower).toBeGreaterThan(first.thetaPower);
  });

  it("resets state progression when simulator state changes", () => {
    const generator = new EegFrameGenerator({ state: "fatigued", random: stableRandom });
    generator.nextFrame();
    generator.nextFrame();
    generator.setState("focused");
    const focused = generator.nextFrame();

    expect(focused.attentionScore).toBeGreaterThan(70);
    expect(focused.fatigueScore).toBeLessThan(30);
  });
});
