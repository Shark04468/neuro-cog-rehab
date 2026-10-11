import { describe, expect, it } from "vitest";

import {
  saveTrainingRecordDraftToApi,
  TrainingRecordApiClientError,
  type TrainingRecordApiSession
} from "../src/training-record-api-client.js";
import type { TrainingRecordSaveDraft } from "../src/training-feedback-model.js";

describe("training-record-api-client", () => {
  it("submits a mixed session training record without raw EEG frames", async () => {
    const requests: CapturedRequest[] = [];
    const result = await saveTrainingRecordDraftToApi(
      baseDraft(),
      baseSession(),
      createFetchMock(requests, {
        id: "record-api-001",
        createdAt: "2026-06-17T12:10:00.000Z"
      })
    );

    expect(result).toEqual({
      provider: "api",
      recordId: "record-api-001",
      createdAt: "2026-06-17T12:10:00.000Z"
    });
    expect(requests[0]).toMatchObject({
      path: "/training-records",
      method: "POST",
      authorization: "Bearer access-token"
    });
    expect(requests[0]?.body).toMatchObject({
      userId: "trainee-1",
      userProfileId: "profile-1",
      organizationId: "org-1",
      trainingType: "mixed_session",
      completionStatus: "completed",
      behaviorMetrics: {
        accuracyRate: 0.875,
        averageReactionTimeMs: 620,
        customMetrics: {
          sourceDraftId: "draft-1",
          savedStageResultCount: 7
        }
      },
      eegSummaryMetrics: {
        qualityStatus: "unstable",
        frameCount: 0
      }
    });
    expect(JSON.stringify(requests[0]?.body).toLowerCase()).not.toContain("raweeg");
    expect(JSON.stringify(requests[0]?.body).toLowerCase()).not.toContain("raw_eeg");
  });

  it("returns a clear error when the API denies the save request", async () => {
    await expect(
      saveTrainingRecordDraftToApi(
        baseDraft(),
        baseSession(),
        createFetchMock(
          [],
          {
            error: {
              code: "SENSITIVE_DATA_SCOPE_DENIED",
              message: "No authorized relationship to target profile."
            }
          },
          403
        )
      )
    ).rejects.toThrow("No authorized relationship to target profile.");
  });

  it("validates required API session scope before sending sensitive training summaries", async () => {
    const invalidSession: TrainingRecordApiSession = {
      ...baseSession(),
      userProfileId: ""
    };

    await expect(saveTrainingRecordDraftToApi(baseDraft(), invalidSession)).rejects.toBeInstanceOf(
      TrainingRecordApiClientError
    );
  });
});

interface CapturedRequest {
  path: string;
  method: string;
  authorization?: string;
  body?: unknown;
}

function createFetchMock(requests: CapturedRequest[], body: unknown, status = 201): typeof fetch {
  return async (input, init) => {
    const url = new URL(String(input));
    requests.push({
      path: url.pathname,
      method: init?.method ?? "GET",
      ...(typeof init?.headers === "object" &&
      init.headers !== null &&
      "authorization" in init.headers &&
      typeof init.headers.authorization === "string"
        ? { authorization: init.headers.authorization }
        : {}),
      ...(typeof init?.body === "string" ? { body: JSON.parse(init.body) as unknown } : {})
    });

    return new Response(JSON.stringify(body), { status });
  };
}

function baseSession(): TrainingRecordApiSession {
  return {
    apiBaseUrl: "http://127.0.0.1:3001/",
    accessToken: "access-token",
    userId: "trainee-1",
    userProfileId: "profile-1",
    organizationId: "org-1"
  };
}

function baseDraft(): TrainingRecordSaveDraft {
  return {
    id: "draft-1",
    sessionId: "session-1",
    userId: "trainee-1",
    trainingType: "mixed_session",
    startedAt: "2026-06-17T12:00:00.000Z",
    endedAt: "2026-06-17T12:10:00.000Z",
    durationSeconds: 600,
    completionStatus: "completed",
    dataSensitivity: "sensitive",
    savedAt: "2026-06-17T12:10:00.000Z",
    behaviorMetrics: {
      completedStageCount: 7,
      skippedStageCount: 1,
      savedStageResultCount: 7,
      attentionStabilityScore: 76,
      averageReactionTimeMs: 620,
      inhibitionSuccessRate: 0.82,
      rhythmRouteAccuracy: 0.78,
      musicSuitabilityScore: 72
    },
    stageResults: [
      {
        sessionId: "session-1",
        userId: "trainee-1",
        stageId: "attention_training",
        savedAt: "2026-06-17T12:04:00.000Z",
        durationSeconds: 360,
        status: "completed",
        summary: "注意力训练阶段结果已保存。",
        dataSensitivity: "sensitive",
        payload: {
          averageReactionTimeMs: 620
        }
      }
    ],
    feedbackSummary: {
      completion: "本次训练完成。",
      attention_stability: "注意稳定性趋势已记录。",
      click_reaction: "点击反应表现已记录。",
      impulse_control: "冲动控制表现已记录。",
      rhythm_navigation: "节律导航表现已记录。",
      music_adaptation: "音乐适配结果已记录。",
      next_suggestion: "下次保持相近难度。",
      encouragement: "今天的练习已经完成。"
    }
  };
}
