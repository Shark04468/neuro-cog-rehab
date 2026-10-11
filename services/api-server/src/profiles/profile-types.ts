export type ProfileGender = "female" | "male" | "non_binary" | "prefer_not_to_say" | "unspecified";

export type ProfileAgeBand = "8_10" | "11_13" | "14_16" | "other";

export type GuardianConsentStatus = "granted" | "pending" | "revoked";

export type TaskPersistenceLevel =
  | "usually_completes"
  | "needs_prompting"
  | "often_stops"
  | "variable";

export type EegConnectionType = "none" | "bluetooth" | "usb" | "simulator";

export type UserProfileArchiveStatus = "active" | "archived";

export interface BasicProfileInfo {
  /** Nickname used in low-stimulation training flows. */
  nickname: string;
  /** Age band instead of exact age to reduce unnecessary sensitive data exposure. */
  ageBand: ProfileAgeBand;
  /** Optional gender field for user-provided profile context. */
  gender?: ProfileGender;
  /** Non-clinical goals for auxiliary training and trend review. */
  trainingGoals: string[];
}

export interface TrainingProfileInfo {
  /** Attention difficulty manifestations reported for training personalization only. */
  attentionDifficultyManifestations: string[];
  /** Impulse-control manifestations reported for training personalization only. */
  impulseControlManifestations: string[];
  /** Task persistence pattern observed in training or home practice. */
  taskPersistenceLevel: TaskPersistenceLevel;
  /** Optional contextual note about task persistence. */
  taskPersistenceNotes?: string;
}

export interface RiskScreeningInfo {
  /** Used only to avoid unsafe visual stimulation in training content. */
  photosensitivityRisk: boolean;
  /** Used only as a training-safety prompt, not as a diagnostic record. */
  seizureHistoryNotice: boolean;
  /** Used only to remind staff or guardians to adjust/stop training when needed. */
  severeHeadache: boolean;
  /** Used only to remind staff or guardians to adjust/stop training when needed. */
  significantDizziness: boolean;
  /** Guardian consent state required before sensitive profile workflows. */
  guardianConsentStatus: GuardianConsentStatus;
}

export interface DeviceProfileInfo {
  /** Whether an EEG device is bound for state reference data. */
  eegDeviceBound: boolean;
  /** Optional EEG device model. */
  eegDeviceModel?: string;
  /** EEG connection path used by the simulator or future device adapter. */
  eegConnectionType: EegConnectionType;
}

export interface TrainingUserProfileRecord {
  id: string;
  traineeUserId: string;
  organizationId?: string;
  basicInfo: BasicProfileInfo;
  trainingInfo: TrainingProfileInfo;
  riskScreening: RiskScreeningInfo;
  deviceInfo: DeviceProfileInfo;
  /** Sensitive professional note. Visible only to authorized roles. */
  therapistNotes?: string;
  status: UserProfileArchiveStatus;
  createdByUserId: string;
  archivedByUserId?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileQuery {
  traineeUserId?: string;
  organizationId?: string;
  status?: UserProfileArchiveStatus;
}

export interface CreateUserProfileInput {
  traineeUserId?: string;
  organizationId?: string;
  basicInfo: BasicProfileInfo;
  trainingInfo: TrainingProfileInfo;
  riskScreening: RiskScreeningInfo;
  deviceInfo: DeviceProfileInfo;
  therapistNotes?: string;
}

export interface UpdateUserProfileInput {
  basicInfo?: Partial<BasicProfileInfo>;
  trainingInfo?: Partial<TrainingProfileInfo>;
  riskScreening?: Partial<RiskScreeningInfo>;
  deviceInfo?: Partial<DeviceProfileInfo>;
  therapistNotes?: string;
}

export interface ProfileApiRequest<TBody = unknown, TParams = Record<string, string>> {
  principal: {
    userId: string;
    roles: ("trainee" | "parent" | "therapist" | "org_admin" | "system_admin")[];
    organizationId?: string;
    userProfileId?: string;
  };
  body: TBody;
  params: TParams;
}

export interface ProfileApiResponse<TBody = unknown> {
  status: number;
  body: TBody;
}
