import type { RhythmNavigationResult } from "@neuro-cog-rehab/shared-types";

export type RhythmNavigationDifficulty = "easy" | "medium" | "hard";

export type RhythmNavigationRuleType =
  | "blue_forward"
  | "yellow_reverse"
  | "low_tone_left"
  | "high_tone_right";

export type RhythmNavigationToneCue = "low" | "high";

export interface RhythmNavigationDifficultyConfig {
  id: RhythmNavigationDifficulty;
  label: string;
  difficultyLevel: number;
  /** Number of nodes visible on the route board. */
  nodeCount: number;
  /** Number of memorized route steps the user needs to recall. */
  routeLength: number;
  /** Time the correct route is shown before recall starts. */
  previewDurationMs: number;
  /** Whether clicks are evaluated against a calm beat window. */
  beatEnabled: boolean;
  /** Expected interval between route clicks when beat mode is enabled. */
  beatIntervalMs: number;
  /** Allowed absolute offset from the target beat. */
  timingToleranceMs: number;
  /** Whether route rules can change within one session. */
  taskSwitchingEnabled: boolean;
  /** Rule set available for the configured difficulty. */
  availableRules: RhythmNavigationRuleType[];
  /** Number of route steps before the next rule is selected. */
  ruleSwitchIntervalSteps: number;
}

export interface RhythmNavigationNode {
  id: string;
  index: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  label: string;
}

export interface RhythmNavigationRouteStep {
  stepIndex: number;
  /** Rule shown before this step so the user can switch strategy. */
  ruleType: RhythmNavigationRuleType;
  ruleLabel: string;
  rulePrompt: string;
  ruleColor: string;
  toneCue: RhythmNavigationToneCue | null;
  nodeId: string;
  nodeColor: string;
  /** Rule used on the previous step, when a switch occurs. */
  previousRuleType: RhythmNavigationRuleType | null;
  /** Expected node if the user incorrectly keeps using the previous rule. */
  previousRuleExpectedNodeId: string | null;
  /** True when the current rule differs from the previous expected step. */
  isTaskSwitch: boolean;
}

export interface RhythmNavigationRound {
  id: string;
  roundIndex: number;
  nodes: RhythmNavigationNode[];
  route: RhythmNavigationRouteStep[];
  previewStartedAtMs: number;
  previewUntilMs: number;
}

export interface RhythmNavigationClickRecord {
  stepIndex: number;
  clickedNodeId: string;
  expectedNodeId: string;
  clickedAtMs: number;
  reactionTimeMs: number;
  beatOffsetMs: number | null;
  isCorrect: boolean;
  isTimingCorrect: boolean | null;
  expectedRuleType: RhythmNavigationRuleType;
  previousRuleType: RhythmNavigationRuleType | null;
  isTaskSwitch: boolean;
  isOldRuleInterferenceError: boolean;
}

export interface RhythmNavigationMetrics {
  routeAccuracy: number;
  sequenceErrorCount: number;
  timingError: number;
  averageReactionTime: number;
  workingMemoryScore: number;
  taskSwitchingScore: number;
  rhythmSyncRate: number;
  routeCompletionRate: number;
  taskSwitchErrorCount: number;
  oldRuleInterferenceErrorCount: number;
  taskRuleChangeCount: number;
  ruleAccuracy: number;
  workingMemoryStepAccuracy: number;
  averageBeatOffsetMs: number;
}

export interface RhythmNavigationGameProps {
  userId: string;
  sessionId: string;
  initialDifficulty?: RhythmNavigationDifficulty;
  width?: number;
  height?: number;
  onComplete?: (result: RhythmNavigationResult, metrics: RhythmNavigationMetrics) => void;
}
