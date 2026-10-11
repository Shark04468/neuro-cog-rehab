import type {
  CoreGameSessionResult,
  GameDifficultyParameters,
  GameSessionSnapshot
} from "@neuro-cog-rehab/game-core";

export type TargetDetectionDifficulty = "easy" | "medium" | "hard";

export type TargetDetectionShapeKind = "circle" | "square" | "triangle" | "diamond";

export type TargetDetectionShapeRole = "target" | "distractor";

export interface TargetDetectionDifficultyConfig extends GameDifficultyParameters {
  id: TargetDetectionDifficulty;
  label: string;
  targetCount: number;
  distractorCount: number;
  presentationTimeMs: number;
}

export interface TargetDetectionShape {
  id: string;
  trialIndex: number;
  role: TargetDetectionShapeRole;
  kind: TargetDetectionShapeKind;
  x: number;
  y: number;
  size: number;
  color: string;
}

export interface TargetDetectionTrial {
  id: string;
  trialIndex: number;
  startedAtMs: number;
  durationMs: number;
  targetKind: TargetDetectionShapeKind;
  targetLabel: string;
  shapes: TargetDetectionShape[];
}

export interface TargetDetectionMetrics {
  correctCount: number;
  errorCount: number;
  missedCount: number;
  averageReactionTime: number;
  reactionTimeVariability: number;
  accuracy: number;
  attentionStabilityScore: number;
}

export interface TargetDetectionGameResult
  extends Omit<CoreGameSessionResult, keyof TargetDetectionMetrics>, TargetDetectionMetrics {
  gameId: "target_detection_attention";
  difficultyId: TargetDetectionDifficulty;
  targetCountPerTrial: number;
  distractorCountPerTrial: number;
  presentationTimeMs: number;
  exportedAt: string;
}

export interface TargetDetectionResultInput {
  coreResult: CoreGameSessionResult;
  snapshot: GameSessionSnapshot;
  difficulty: TargetDetectionDifficultyConfig;
  exportedAt?: string;
}

export interface TargetDetectionGameProps {
  userId: string;
  sessionId: string;
  initialDifficulty?: TargetDetectionDifficulty;
  plannedDurationSeconds?: number;
  width?: number;
  height?: number;
  onComplete?: (result: TargetDetectionGameResult) => void;
}
