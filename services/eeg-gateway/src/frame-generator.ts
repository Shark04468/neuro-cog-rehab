import {
  EEG_SIMULATOR_STATES,
  type EEGFeatureFrame,
  type EegFrameGeneratorOptions,
  type EegSimulatorState,
  type RandomSource
} from "./types.js";

const DEFAULT_STATE: EegSimulatorState = "focused";

/**
 * Stateful EEG feature-frame generator. The values are synthetic and intended
 * only for development, training-state reference flows, and trend UI testing.
 */
export class EegFrameGenerator {
  private frameIndex = 0;
  private state: EegSimulatorState;
  private readonly random: RandomSource;

  constructor(options: EegFrameGeneratorOptions = {}) {
    this.state = options.state ?? DEFAULT_STATE;
    this.random = options.random ?? Math.random;
  }

  setState(state: EegSimulatorState): void {
    this.state = state;
    this.frameIndex = 0;
  }

  getState(): EegSimulatorState {
    return this.state;
  }

  nextFrame(now: Date = new Date()): EEGFeatureFrame {
    const frame = generateFrame(this.state, this.frameIndex, now, this.random);
    this.frameIndex += 1;
    return frame;
  }
}

export function isEegSimulatorState(value: unknown): value is EegSimulatorState {
  return typeof value === "string" && EEG_SIMULATOR_STATES.includes(value as EegSimulatorState);
}

function generateFrame(
  state: EegSimulatorState,
  frameIndex: number,
  now: Date,
  random: RandomSource
): EEGFeatureFrame {
  switch (state) {
    case "focused":
      return buildFrame(now, {
        attentionScore: jitter(76, 4, random),
        relaxationScore: jitter(44, 5, random),
        fatigueScore: jitter(18, 3, random),
        thetaPower: jitter(0.24, 0.03, random),
        alphaPower: jitter(0.36, 0.04, random),
        betaPower: jitter(0.5, 0.04, random),
        signalQuality: jitter(94, 3, random),
        artifactLevel: jitter(4, 2, random)
      });
    case "relaxed":
      return buildFrame(now, {
        attentionScore: jitter(48, 5, random),
        relaxationScore: jitter(78, 4, random),
        fatigueScore: jitter(16, 3, random),
        thetaPower: jitter(0.28, 0.03, random),
        alphaPower: jitter(0.56, 0.04, random),
        betaPower: jitter(0.26, 0.03, random),
        signalQuality: jitter(93, 3, random),
        artifactLevel: jitter(5, 2, random)
      });
    case "fatigued": {
      const fatigueTrend = Math.min(92, 36 + frameIndex * 2.5);
      const attentionTrend = Math.max(28, 62 - frameIndex * 1.7);
      return buildFrame(now, {
        attentionScore: jitter(attentionTrend, 5, random),
        relaxationScore: jitter(36, 5, random),
        fatigueScore: jitter(fatigueTrend, 4, random),
        thetaPower: jitter(0.52 + Math.min(frameIndex, 12) * 0.01, 0.04, random),
        alphaPower: jitter(0.28, 0.03, random),
        betaPower: jitter(0.22, 0.03, random),
        signalQuality: jitter(88, 5, random),
        artifactLevel: jitter(12 + Math.min(frameIndex, 10), 4, random)
      });
    }
  }
}

function buildFrame(timestamp: Date, values: Omit<EEGFeatureFrame, "timestamp">): EEGFeatureFrame {
  return {
    timestamp: timestamp.toISOString(),
    attentionScore: toScore(values.attentionScore),
    relaxationScore: toScore(values.relaxationScore),
    fatigueScore: toScore(values.fatigueScore),
    thetaPower: toPower(values.thetaPower),
    alphaPower: toPower(values.alphaPower),
    betaPower: toPower(values.betaPower),
    signalQuality: toScore(values.signalQuality),
    artifactLevel: toScore(values.artifactLevel)
  };
}

function jitter(center: number, radius: number, random: RandomSource): number {
  return center + (random() * 2 - 1) * radius;
}

function toScore(value: number): number {
  return round(clamp(value, 0, 100), 2);
}

function toPower(value: number): number {
  return round(clamp(value, 0, 1), 4);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
