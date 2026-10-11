import { describe, expect, it, vi } from "vitest";

import {
  saveTrainingPrescriptionToApi,
  TrainingPrescriptionApiError
} from "../src/training-prescription-api-client.js";
import { createDefaultTrainingPrescriptionDraft } from "../src/training-prescription-editor-model.js";
import { mockTherapistWorkspaceUsers } from "../src/therapist-workspace-mock.js";

describe("training-prescription-api-client", () => {
  it("posts a typed prescription payload to the api-server", async () => {
    const user = mockTherapistWorkspaceUsers[0]!;
    const draft = createDefaultTrainingPrescriptionDraft(user);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        id: "prescription-api-001",
        ...draft,
        userProfileId: user.userProfileId,
        organizationId: user.organizationId,
        therapistUserId: "therapist-api-001",
        status: "active",
        version: 2,
        updatedAt: "2026-06-30T09:00:00.000Z"
      })
    );

    const result = await saveTrainingPrescriptionToApi({
      session: { apiBaseUrl: "http://127.0.0.1:4311/", accessToken: "access-token" },
      draft,
      user,
      fetcher
    });

    expect(fetcher).toHaveBeenCalledWith("http://127.0.0.1:4311/training-prescriptions", {
      method: "POST",
      headers: {
        authorization: "Bearer access-token",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        ...draft,
        userProfileId: user.userProfileId,
        organizationId: user.organizationId
      })
    });
    expect(result.id).toBe("prescription-api-001");
    expect(result.therapistId).toBe("therapist-api-001");
    expect(result.version).toBe(2);
  });

  it("surfaces api-server validation errors", async () => {
    const user = mockTherapistWorkspaceUsers[0]!;
    const draft = createDefaultTrainingPrescriptionDraft(user);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ error: { message: "训练处方字段未通过校验。" } }, 400));

    await expect(
      saveTrainingPrescriptionToApi({
        session: { apiBaseUrl: "http://127.0.0.1:4311", accessToken: "access-token" },
        draft,
        user,
        fetcher
      })
    ).rejects.toThrow(TrainingPrescriptionApiError);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
