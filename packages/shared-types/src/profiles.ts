/**
 * Status for a training user's profile inside the auxiliary training platform.
 */
export type UserProfileStatus = "draft" | "active" | "paused" | "archived";

/**
 * Age bands used by the first product phase. Exact birth dates can be stored by
 * the backend when needed, but most product flows should use age bands.
 */
export type UserAgeBand = "8_10" | "11_13" | "14_16" | "other";

/**
 * Basic profile for a training user. This is privacy-sensitive data.
 */
export interface UserProfile {
  /** Stable profile identifier. */
  id: string;
  /** Linked authentication user id. */
  userId: string;
  /** Display name or nickname shown in training flows. */
  displayName: string;
  /** Age band used to adapt wording and task length. */
  ageBand: UserAgeBand;
  /** Optional organization that manages this profile. */
  organizationId?: string;
  /** Guardian user ids that are authorized to view this profile. */
  guardianUserIds: string[];
  /** Therapist user ids that are authorized to review training records. */
  therapistUserIds: string[];
  /** Non-clinical training goals selected for this user. */
  trainingGoals: string[];
  /** Interaction or sensory considerations for low-stimulation training design. */
  sensoryConsiderations: string[];
  /** Version of the privacy and guardian consent text accepted for this profile. */
  consentVersion: string;
  /** ISO timestamp when consent was confirmed. */
  consentConfirmedAt: string;
  /** Current profile lifecycle status. */
  status: UserProfileStatus;
  /** ISO timestamp when the profile was created. */
  createdAt: string;
  /** ISO timestamp when the profile was last updated. */
  updatedAt: string;
}

/**
 * Profile for a therapist or professional user who reviews training trends.
 */
export interface TherapistProfile {
  /** Stable therapist profile identifier. */
  id: string;
  /** Linked authentication user id. */
  userId: string;
  /** Display name shown in therapist-side pages. */
  displayName: string;
  /** Organization that owns the therapist workspace, when applicable. */
  organizationId?: string;
  /** Optional professional title for display and audit context. */
  professionalTitle?: string;
  /** Auxiliary training areas the therapist can configure or review. */
  serviceScopes: string[];
  /** Training user profile ids assigned to this therapist. */
  assignedUserProfileIds: string[];
  /** Work email for account and organization communication. */
  contactEmail: string;
  /** Whether the therapist account is enabled. */
  isActive: boolean;
  /** ISO timestamp when the profile was created. */
  createdAt: string;
  /** ISO timestamp when the profile was last updated. */
  updatedAt: string;
}
