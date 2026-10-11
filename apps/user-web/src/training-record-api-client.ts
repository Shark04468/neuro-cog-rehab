import type { TrainingRecordSaveDraft } from "./training-feedback-model.js";

export interface TrainingRecordApiSession {
  apiBaseUrl: string;
  accessToken: string;
  userId: string;
  userProfileId: string;
  organizationId?: string;
}

export interface TrainingRecordApiSaveResult {
  provider: "api";
  recordId: string;
  createdAt: string;
}

interface ApiTrainingRecordResponse {
  id: string;
  createdAt: string;
}

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export class TrainingRecordApiClientError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TrainingRecordApiClientError";
  }
}

/**
 * Saves a completed session draft through api-server. This client submits only
 * summary metrics and structured stage summaries; raw EEG frames are not sent.
 */
export async function saveTrainingRecordDraftToApi(
  draft: TrainingRecordSaveDraft,
  session: TrainingRecordApiSession,
  fetcher: typeof fetch = fetch
): Promise<TrainingRecordApiSaveResult> {
  validateApiSession(session);
  const apiBaseUrl = session.apiBaseUrl.replace(/\/+$/, "");

  let response: Response;
  try {
    response = await fetcher(`${apiBaseUrl}/training-records`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(toCreateTrainingRecordInput(draft, session))
    });
  } catch {
    throw new TrainingRecordApiClientError("训练记录接口暂时不可用，请稍后重试。");
  }

  const body = await readJsonResponse(response);
  if (!response.ok) {
    throw new TrainingRecordApiClientError(extractApiErrorMessage(body));
  }

  const record = body as ApiTrainingRecordResponse;
  return {
    provider: "api",
    recordId: record.id,
    createdAt: record.createdAt
  };
}

function toCreateTrainingRecordInput(
  draft: TrainingRecordSaveDraft,
  session: TrainingRecordApiSession
) {
  return {
    userId: session.userId,
    userProfileId: session.userProfileId,
    ...(session.organizationId !== undefined ? { organizationId: session.organizationId } : {}),
    trainingType: draft.trainingType,
    startedAt: draft.startedAt,
    endedAt: draft.endedAt,
    durationSeconds: draft.durationSeconds,
    behaviorMetrics: {
      accuracyRate: deriveCompletionRate(draft),
      averageReactionTimeMs: draft.behaviorMetrics.averageReactionTimeMs ?? undefined,
      customMetrics: sanitizeCustomMetrics({
        sourceDraftId: draft.id,
        sessionId: draft.sessionId,
        completedStageCount: draft.behaviorMetrics.completedStageCount,
        skippedStageCount: draft.behaviorMetrics.skippedStageCount,
        savedStageResultCount: draft.behaviorMetrics.savedStageResultCount,
        attentionStabilityScore: draft.behaviorMetrics.attentionStabilityScore,
        inhibitionSuccessRate: draft.behaviorMetrics.inhibitionSuccessRate,
        rhythmRouteAccuracy: draft.behaviorMetrics.rhythmRouteAccuracy,
        musicSuitabilityScore: draft.behaviorMetrics.musicSuitabilityScore,
        stageResults: draft.stageResults.map((stageResult) => ({
          stageId: stageResult.stageId,
          status: stageResult.status,
          durationSeconds: stageResult.durationSeconds,
          summary: stageResult.summary,
          savedAt: stageResult.savedAt
        })),
        feedbackSummary: draft.feedbackSummary
      })
    },
    eegSummaryMetrics: {
      qualityStatus: "unstable",
      validSampleRate: 0,
      frameCount: 0,
      artifactCount: 0
    },
    difficultyConfig: {
      initialLevel: 1,
      finalLevel: 1,
      adaptiveEnabled: false,
      parameters: {
        source: "single_session_flow"
      }
    },
    abnormalEvents: [],
    completionStatus: draft.completionStatus
  };
}

function deriveCompletionRate(draft: TrainingRecordSaveDraft): number {
  const total = draft.behaviorMetrics.completedStageCount + draft.behaviorMetrics.skippedStageCount;
  if (total <= 0) {
    return 0;
  }
  return roundRate(draft.behaviorMetrics.completedStageCount / total);
}

function roundRate(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
}

function sanitizeCustomMetrics(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, nestedValue ?? null])
  );
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function validateApiSession(session: TrainingRecordApiSession): void {
  if (session.apiBaseUrl.trim().length === 0) {
    throw new TrainingRecordApiClientError("训练记录接口地址未配置。");
  }
  if (session.accessToken.trim().length === 0) {
    throw new TrainingRecordApiClientError("训练记录保存需要有效登录状态。");
  }
  if (session.userId.trim().length === 0 || session.userProfileId.trim().length === 0) {
    throw new TrainingRecordApiClientError("缺少训练用户或档案授权范围。");
  }
}

function extractApiErrorMessage(body: unknown): string {
  const candidate = body as ApiErrorBody;
  return candidate.error?.message ?? "训练记录保存失败，请稍后重试。";
}
