import type {
  SavedTrainingPrescription,
  TrainingPrescriptionDraft
} from "./training-prescription-editor-model.js";
import type { TherapistWorkspaceUser } from "./therapist-workspace-model.js";

export interface TrainingPrescriptionApiSession {
  apiBaseUrl: string;
  accessToken: string;
}

export interface SaveTrainingPrescriptionApiInput {
  session: TrainingPrescriptionApiSession;
  draft: TrainingPrescriptionDraft;
  user: TherapistWorkspaceUser;
  fetcher?: typeof fetch;
}

interface ApiTrainingPrescriptionRecord extends TrainingPrescriptionDraft {
  id: string;
  userProfileId: string;
  organizationId?: string;
  therapistUserId: string;
  status: "active";
  version: number;
  updatedAt: string;
}

interface ApiErrorBody {
  error?: {
    message?: string;
  };
}

export class TrainingPrescriptionApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrainingPrescriptionApiError";
  }
}

export async function saveTrainingPrescriptionToApi(
  input: SaveTrainingPrescriptionApiInput
): Promise<SavedTrainingPrescription> {
  const response = await (input.fetcher ?? fetch)(
    `${input.session.apiBaseUrl.replace(/\/+$/, "")}/training-prescriptions`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.session.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        ...input.draft,
        userProfileId: input.user.userProfileId,
        organizationId: input.user.organizationId
      })
    }
  );
  const body = await readJson(response);
  if (!response.ok) {
    throw new TrainingPrescriptionApiError(extractErrorMessage(body));
  }

  const record = body as ApiTrainingPrescriptionRecord;
  return {
    id: record.id,
    userId: record.userId,
    weeklySessionCount: record.weeklySessionCount,
    sessionDurationMinutes: record.sessionDurationMinutes,
    moduleCombination: record.moduleCombination,
    musicType: record.musicType,
    initialDifficulty: record.initialDifficulty,
    adaptiveAdjustmentEnabled: record.adaptiveAdjustmentEnabled,
    dailyMaxTrainingMinutes: record.dailyMaxTrainingMinutes,
    riskReminderKeys: record.riskReminderKeys,
    therapistNote: record.therapistNote,
    therapistId: record.therapistUserId,
    organizationId: record.organizationId ?? input.user.organizationId,
    status: "active",
    version: record.version,
    updatedAt: record.updatedAt
  };
}

async function readJson(response: Response): Promise<unknown> {
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

function extractErrorMessage(body: unknown): string {
  return (
    (body as ApiErrorBody).error?.message ??
    "Training prescription API did not complete the save operation."
  );
}
