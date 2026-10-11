import type { RhythmNavigationResult } from "@neuro-cog-rehab/shared-types";

import type {
  RhythmNavigationClickRecord,
  RhythmNavigationDifficulty,
  RhythmNavigationDifficultyConfig,
  RhythmNavigationMetrics,
  RhythmNavigationNode,
  RhythmNavigationRound,
  RhythmNavigationRouteStep,
  RhythmNavigationRuleType,
  RhythmNavigationToneCue
} from "./rhythm-navigation-game-types.js";

const NODE_COLORS = ["#3f7f8f", "#6f8f4f", "#8a6aa8", "#b07a4f", "#5f8f78"] as const;

interface RhythmNavigationRuleDefinition {
  type: RhythmNavigationRuleType;
  label: string;
  prompt: string;
  ruleColor: string;
  toneCue: RhythmNavigationToneCue | null;
  cueFrequencyHz: number | null;
}

export const RHYTHM_NAVIGATION_RULES: Record<
  RhythmNavigationRuleType,
  RhythmNavigationRuleDefinition
> = {
  blue_forward: {
    type: "blue_forward",
    label: "蓝色路线",
    prompt: "蓝色路线：按正序点击记住的节点。",
    ruleColor: "#3578b8",
    toneCue: null,
    cueFrequencyHz: null
  },
  yellow_reverse: {
    type: "yellow_reverse",
    label: "黄色路线",
    prompt: "黄色路线：按倒序点击记住的节点。",
    ruleColor: "#c8952f",
    toneCue: null,
    cueFrequencyHz: null
  },
  low_tone_left: {
    type: "low_tone_left",
    label: "低音提示",
    prompt: "低音提示：选择左侧目标。",
    ruleColor: "#4f8b79",
    toneCue: "low",
    cueFrequencyHz: 220
  },
  high_tone_right: {
    type: "high_tone_right",
    label: "高音提示",
    prompt: "高音提示：选择右侧目标。",
    ruleColor: "#7b64a8",
    toneCue: "high",
    cueFrequencyHz: 440
  }
};

export const RHYTHM_NAVIGATION_DIFFICULTIES: Record<
  RhythmNavigationDifficulty,
  RhythmNavigationDifficultyConfig
> = {
  easy: {
    id: "easy",
    label: "基础",
    difficultyLevel: 1,
    nodeCount: 3,
    routeLength: 3,
    previewDurationMs: 3000,
    beatEnabled: false,
    beatIntervalMs: 1200,
    timingToleranceMs: 500,
    taskSwitchingEnabled: true,
    availableRules: ["blue_forward"],
    ruleSwitchIntervalSteps: 3
  },
  medium: {
    id: "medium",
    label: "进阶",
    difficultyLevel: 2,
    nodeCount: 4,
    routeLength: 4,
    previewDurationMs: 2600,
    beatEnabled: true,
    beatIntervalMs: 1050,
    timingToleranceMs: 420,
    taskSwitchingEnabled: true,
    availableRules: ["blue_forward", "yellow_reverse", "low_tone_left", "high_tone_right"],
    ruleSwitchIntervalSteps: 1
  },
  hard: {
    id: "hard",
    label: "挑战",
    difficultyLevel: 3,
    nodeCount: 5,
    routeLength: 5,
    previewDurationMs: 2100,
    beatEnabled: true,
    beatIntervalMs: 900,
    timingToleranceMs: 340,
    taskSwitchingEnabled: true,
    availableRules: ["blue_forward", "yellow_reverse", "low_tone_left", "high_tone_right"],
    ruleSwitchIntervalSteps: 1
  }
};

export function getRhythmNavigationDifficultyConfig(
  difficulty: RhythmNavigationDifficulty
): RhythmNavigationDifficultyConfig {
  const config = RHYTHM_NAVIGATION_DIFFICULTIES[difficulty];
  return { ...config, availableRules: [...config.availableRules] };
}

export function buildRhythmNavigationRound(input: {
  config: RhythmNavigationDifficultyConfig;
  roundIndex: number;
  previewStartedAtMs: number;
  width: number;
  height: number;
  random?: () => number;
}): RhythmNavigationRound {
  const random = input.random ?? Math.random;
  const nodes = buildNodes({
    nodeCount: input.config.nodeCount,
    width: input.width,
    height: input.height
  });
  const memorizedRouteNodeIds = buildRouteNodeIds({
    nodes,
    routeLength: input.config.routeLength,
    random
  });
  const ruleSequence = buildRuleSequence(input.config);
  const route = ruleSequence.map<RhythmNavigationRouteStep>((ruleType, stepIndex) => {
    const rule = RHYTHM_NAVIGATION_RULES[ruleType];
    const nodeId = resolveExpectedNodeIdForRule({
      ruleType,
      nodes,
      memorizedRouteNodeIds,
      stepIndex
    });
    const node = findNodeOrThrow(nodes, nodeId);
    const previousRuleType =
      stepIndex === 0 || ruleSequence[stepIndex - 1] === ruleType
        ? null
        : (ruleSequence[stepIndex - 1] ?? null);
    const previousRuleExpectedNodeId =
      previousRuleType === null
        ? null
        : resolveExpectedNodeIdForRule({
            ruleType: previousRuleType,
            nodes,
            memorizedRouteNodeIds,
            stepIndex
          });

    return {
      stepIndex,
      ruleType,
      ruleLabel: rule.label,
      rulePrompt: rule.prompt,
      ruleColor: rule.ruleColor,
      toneCue: rule.toneCue,
      nodeId,
      nodeColor: node.color,
      previousRuleType,
      previousRuleExpectedNodeId,
      isTaskSwitch: previousRuleType !== null
    };
  });

  return {
    id: `rhythm-navigation-round-${input.roundIndex}`,
    roundIndex: input.roundIndex,
    nodes,
    route,
    previewStartedAtMs: input.previewStartedAtMs,
    previewUntilMs: input.previewStartedAtMs + input.config.previewDurationMs
  };
}

export function findRhythmNavigationNodeAtPoint(
  nodes: readonly RhythmNavigationNode[],
  point: { x: number; y: number }
): RhythmNavigationNode | null {
  for (const node of [...nodes].reverse()) {
    const dx = point.x - node.x;
    const dy = point.y - node.y;
    if (Math.sqrt(dx * dx + dy * dy) <= node.radius) {
      return node;
    }
  }

  return null;
}

export function createRhythmNavigationClickRecord(input: {
  stepIndex: number;
  clickedNodeId: string;
  expectedStep: RhythmNavigationRouteStep;
  clickedAtMs: number;
  stepStartedAtMs: number;
  inputStartedAtMs: number;
  config: RhythmNavigationDifficultyConfig;
}): RhythmNavigationClickRecord {
  const expectedBeatAtMs =
    input.config.beatEnabled && input.stepIndex >= 0
      ? input.inputStartedAtMs + input.config.beatIntervalMs * (input.stepIndex + 1)
      : null;
  const beatOffsetMs =
    expectedBeatAtMs === null ? null : Math.round(input.clickedAtMs - expectedBeatAtMs);
  const isTimingCorrect =
    beatOffsetMs === null ? null : Math.abs(beatOffsetMs) <= input.config.timingToleranceMs;
  const isCorrect = input.clickedNodeId === input.expectedStep.nodeId;

  return {
    stepIndex: input.stepIndex,
    clickedNodeId: input.clickedNodeId,
    expectedNodeId: input.expectedStep.nodeId,
    clickedAtMs: input.clickedAtMs,
    reactionTimeMs: round(input.clickedAtMs - input.stepStartedAtMs, 2),
    beatOffsetMs,
    isCorrect,
    isTimingCorrect,
    expectedRuleType: input.expectedStep.ruleType,
    previousRuleType: input.expectedStep.previousRuleType,
    isTaskSwitch: input.expectedStep.isTaskSwitch,
    isOldRuleInterferenceError:
      input.expectedStep.isTaskSwitch &&
      !isCorrect &&
      input.expectedStep.previousRuleExpectedNodeId !== null &&
      input.clickedNodeId === input.expectedStep.previousRuleExpectedNodeId
  };
}

export function calculateRhythmNavigationMetrics(input: {
  clickRecords: RhythmNavigationClickRecord[];
  routeLength: number;
  beatEnabled: boolean;
}): RhythmNavigationMetrics {
  const correctClicks = input.clickRecords.filter((record) => record.isCorrect);
  const sequenceErrorCount = input.clickRecords.filter((record) => !record.isCorrect).length;
  const beatOffsets = input.clickRecords.flatMap((record) =>
    record.beatOffsetMs === null ? [] : [Math.abs(record.beatOffsetMs)]
  );
  const timingCorrectClicks = input.clickRecords.filter(
    (record) => record.isTimingCorrect === true
  );
  const switchRecords = input.clickRecords.filter((record) => record.isTaskSwitch);
  const switchCorrectRecords = switchRecords.filter((record) => record.isCorrect);
  const taskSwitchErrorCount = switchRecords.filter((record) => !record.isCorrect).length;
  const oldRuleInterferenceErrorCount = input.clickRecords.filter(
    (record) => record.isOldRuleInterferenceError
  ).length;
  const reactionTimes = input.clickRecords.map((record) => record.reactionTimeMs);
  const routeAccuracy =
    input.routeLength === 0 ? 0 : round(correctClicks.length / input.routeLength, 4);
  const routeCompletionRate =
    input.routeLength === 0 ? 0 : round(input.clickRecords.length / input.routeLength, 4);
  const averageBeatOffsetMs = average(beatOffsets);

  return {
    routeAccuracy,
    sequenceErrorCount,
    timingError: input.beatEnabled ? averageBeatOffsetMs : 0,
    averageReactionTime: average(reactionTimes),
    workingMemoryScore: Math.round(routeAccuracy * 100),
    taskSwitchingScore:
      switchRecords.length === 0
        ? 100
        : Math.round((switchCorrectRecords.length / switchRecords.length) * 100),
    rhythmSyncRate:
      !input.beatEnabled || beatOffsets.length === 0
        ? 1
        : round(timingCorrectClicks.length / beatOffsets.length, 4),
    routeCompletionRate,
    taskSwitchErrorCount,
    oldRuleInterferenceErrorCount,
    taskRuleChangeCount: switchRecords.length,
    ruleAccuracy: routeAccuracy,
    workingMemoryStepAccuracy: routeAccuracy,
    averageBeatOffsetMs
  };
}

export function createRhythmNavigationResult(input: {
  sessionId: string;
  userId: string;
  startedAtMs: number;
  endedAtMs: number;
  activeDurationSeconds: number;
  pauseCount: number;
  config: RhythmNavigationDifficultyConfig;
  metrics: RhythmNavigationMetrics;
}): RhythmNavigationResult {
  const totalTrials = input.config.routeLength;
  const correctTrials = Math.round(input.metrics.routeAccuracy * totalTrials);

  return {
    sessionId: input.sessionId,
    userId: input.userId,
    trainingType: "rhythm_navigation",
    startedAt: new Date(input.startedAtMs).toISOString(),
    endedAt: new Date(input.endedAtMs).toISOString(),
    durationSeconds: round(input.activeDurationSeconds, 3),
    difficultyLevel: input.config.difficultyLevel,
    completionRate: input.metrics.routeCompletionRate,
    accuracyRate: input.metrics.routeAccuracy,
    totalTrials,
    correctTrials,
    errorCount: input.metrics.sequenceErrorCount,
    pauseCount: input.pauseCount,
    routeAccuracy: input.metrics.routeAccuracy,
    sequenceErrorCount: input.metrics.sequenceErrorCount,
    timingError: input.metrics.timingError,
    averageReactionTime: input.metrics.averageReactionTime,
    workingMemoryScore: input.metrics.workingMemoryScore,
    taskSwitchingScore: input.metrics.taskSwitchingScore,
    rhythmSyncRate: input.metrics.rhythmSyncRate,
    routeCompletionRate: input.metrics.routeCompletionRate,
    taskSwitchErrorCount: input.metrics.taskSwitchErrorCount,
    oldRuleInterferenceErrorCount: input.metrics.oldRuleInterferenceErrorCount,
    taskRuleChangeCount: input.metrics.taskRuleChangeCount,
    ruleAccuracy: input.metrics.ruleAccuracy,
    workingMemoryStepAccuracy: input.metrics.workingMemoryStepAccuracy,
    averageBeatOffsetMs: input.metrics.averageBeatOffsetMs
  };
}

export function createSeededRhythmNavigationRandom(seed: number): () => number {
  let state = Math.max(1, Math.floor(seed)) % 2147483647;

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

export function getRhythmNavigationRuleCueFrequency(
  ruleType: RhythmNavigationRuleType
): number | null {
  return RHYTHM_NAVIGATION_RULES[ruleType].cueFrequencyHz;
}

export function resolveExpectedNodeIdForRule(input: {
  ruleType: RhythmNavigationRuleType;
  nodes: RhythmNavigationNode[];
  memorizedRouteNodeIds: string[];
  stepIndex: number;
}): string {
  switch (input.ruleType) {
    case "blue_forward":
      return input.memorizedRouteNodeIds[input.stepIndex] ?? input.memorizedRouteNodeIds[0] ?? "";
    case "yellow_reverse":
      return (
        input.memorizedRouteNodeIds[input.memorizedRouteNodeIds.length - 1 - input.stepIndex] ??
        input.memorizedRouteNodeIds[0] ??
        ""
      );
    case "low_tone_left":
      return findHorizontalEdgeNode(input.nodes, "left").id;
    case "high_tone_right":
      return findHorizontalEdgeNode(input.nodes, "right").id;
  }
}

function buildNodes(input: {
  nodeCount: number;
  width: number;
  height: number;
}): RhythmNavigationNode[] {
  const centerX = input.width / 2;
  const centerY = input.height / 2;
  const radiusX = input.width * 0.32;
  const radiusY = input.height * 0.28;
  const nodeRadius = 34;

  return Array.from({ length: input.nodeCount }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / input.nodeCount;
    return {
      id: `rhythm-node-${index}`,
      index,
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
      radius: nodeRadius,
      color: NODE_COLORS[index % NODE_COLORS.length] ?? NODE_COLORS[0],
      label: `${index + 1}`
    };
  });
}

function buildRouteNodeIds(input: {
  nodes: RhythmNavigationNode[];
  routeLength: number;
  random: () => number;
}): string[] {
  const route: string[] = [];

  for (let stepIndex = 0; stepIndex < input.routeLength; stepIndex += 1) {
    let node = input.nodes[Math.floor(input.random() * input.nodes.length)] ?? input.nodes[0];
    if (!node) {
      throw new Error("At least one navigation node is required.");
    }

    if (route.length > 0 && node.id === route[route.length - 1] && input.nodes.length > 1) {
      const nextIndex = (node.index + 1) % input.nodes.length;
      node = input.nodes[nextIndex] ?? node;
    }

    route.push(node.id);
  }

  return route;
}

function buildRuleSequence(config: RhythmNavigationDifficultyConfig): RhythmNavigationRuleType[] {
  const availableRules =
    config.taskSwitchingEnabled && config.availableRules.length > 0
      ? config.availableRules
      : (["blue_forward"] satisfies RhythmNavigationRuleType[]);
  const switchInterval = Math.max(1, config.ruleSwitchIntervalSteps);

  return Array.from({ length: config.routeLength }, (_, stepIndex) => {
    const ruleIndex = Math.floor(stepIndex / switchInterval) % availableRules.length;
    return availableRules[ruleIndex] ?? "blue_forward";
  });
}

function findHorizontalEdgeNode(
  nodes: RhythmNavigationNode[],
  side: "left" | "right"
): RhythmNavigationNode {
  if (nodes.length === 0) {
    throw new Error("At least one navigation node is required.");
  }

  return nodes.reduce((selected, node) => {
    if (side === "left") {
      return node.x < selected.x ? node : selected;
    }
    return node.x > selected.x ? node : selected;
  }, nodes[0] as RhythmNavigationNode);
}

function findNodeOrThrow(nodes: RhythmNavigationNode[], nodeId: string): RhythmNavigationNode {
  const node = nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    throw new Error(`Unknown rhythm navigation node: ${nodeId}`);
  }
  return node;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 2);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
