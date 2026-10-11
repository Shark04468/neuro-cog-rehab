import type {
  AdaptiveDifficultyConfig,
  AttentionGameResult,
  BaselineAssessment,
  EEGFeatureFrame,
  MusicTherapySession,
  RiskAlert,
  TherapistProfile,
  TrainingReport,
  TrainingSession,
  UserProfile
} from "../index.js";

export const exampleUserProfile: UserProfile = {
  id: "profile-001",
  userId: "user-001",
  displayName: "Training User A",
  ageBand: "11_13",
  organizationId: "org-001",
  guardianUserIds: ["guardian-001"],
  therapistUserIds: ["therapist-001"],
  trainingGoals: ["sustained attention practice", "reaction control practice"],
  sensoryConsiderations: ["low visual stimulation", "moderate audio volume"],
  consentVersion: "2026-06",
  consentConfirmedAt: "2026-06-15T08:00:00.000Z",
  status: "active",
  createdAt: "2026-06-15T08:00:00.000Z",
  updatedAt: "2026-06-15T08:00:00.000Z"
};

export const exampleTherapistProfile: TherapistProfile = {
  id: "therapist-profile-001",
  userId: "therapist-001",
  displayName: "Therapist A",
  organizationId: "org-001",
  professionalTitle: "Training Specialist",
  serviceScopes: ["attention training review", "stage report review"],
  assignedUserProfileIds: ["profile-001"],
  contactEmail: "therapist@example.test",
  isActive: true,
  createdAt: "2026-06-15T08:00:00.000Z",
  updatedAt: "2026-06-15T08:00:00.000Z"
};

export const exampleBaselineAssessment: BaselineAssessment = {
  id: "baseline-001",
  userId: "user-001",
  sessionId: "session-001",
  createdAt: "2026-06-15T08:05:00.000Z",
  focusSelfRating: 3,
  fatigueSelfRating: 2,
  moodSelfRating: 4,
  environmentNoiseRating: 1,
  readinessConfirmed: true,
  notes: "User completed a short readiness check before training."
};

export const exampleTrainingSession: TrainingSession = {
  id: "session-001",
  userId: "user-001",
  baselineAssessmentId: "baseline-001",
  plannedByTherapistId: "therapist-001",
  trainingType: "attention_training",
  status: "completed",
  flowStage: "training",
  startedAt: "2026-06-15T08:06:00.000Z",
  endedAt: "2026-06-15T08:16:00.000Z",
  difficultyLevel: 2,
  eegEnabled: true,
  dataSensitivity: "sensitive"
};

export const exampleEEGFeatureFrame: EEGFeatureFrame = {
  id: "eeg-frame-001",
  sessionId: "session-001",
  timestamp: "2026-06-15T08:06:10.000Z",
  source: "simulator",
  windowSeconds: 2,
  samplingRateHz: 256,
  attentionIndex: 58,
  relaxationIndex: 62,
  signalQuality: 96,
  qualityStatus: "good",
  artifactFlag: false,
  bandPower: {
    delta: 0.12,
    theta: 0.2,
    alpha: 0.31,
    beta: 0.28,
    gamma: 0.09
  }
};

export const exampleMusicTherapySession: MusicTherapySession = {
  id: "music-session-001",
  userId: "user-001",
  trainingSessionId: "session-001",
  trackId: "track-quiet-001",
  trackTitle: "Quiet Rhythm",
  purpose: "pre_training_relaxation",
  startedAt: "2026-06-15T08:00:00.000Z",
  endedAt: "2026-06-15T08:05:00.000Z",
  durationSeconds: 300,
  volumeLevel: 45,
  completionRate: 1,
  userComfortRating: 4
};

export const exampleAttentionGameResult: AttentionGameResult = {
  sessionId: "session-001",
  userId: "user-001",
  trainingType: "attention_training",
  startedAt: "2026-06-15T08:06:00.000Z",
  endedAt: "2026-06-15T08:16:00.000Z",
  durationSeconds: 600,
  difficultyLevel: 2,
  completionRate: 1,
  accuracyRate: 0.82,
  totalTrials: 60,
  correctTrials: 49,
  errorCount: 11,
  pauseCount: 1,
  targetHitRate: 0.86,
  distractorErrorRate: 0.12,
  averageReactionTimeMs: 510,
  longestContinuousCorrectCount: 8,
  focusStabilityScore: 74
};

export const exampleAdaptiveDifficultyConfig: AdaptiveDifficultyConfig = {
  id: "adaptive-config-001",
  trainingType: "attention_training",
  minDifficultyLevel: 1,
  maxDifficultyLevel: 5,
  stepSize: 1,
  evaluationWindowSize: 3,
  accuracyUpperThreshold: 0.85,
  accuracyLowerThreshold: 0.6,
  reactionTimeTargetMs: 550,
  safetyPauseThreshold: 3,
  isEnabled: true,
  updatedBy: "therapist-001",
  updatedAt: "2026-06-15T08:20:00.000Z"
};

export const exampleRiskAlert: RiskAlert = {
  id: "risk-alert-001",
  userId: "user-001",
  sessionId: "session-001",
  category: "data_quality",
  severity: "watch",
  message: "EEG signal quality changed during part of the session.",
  recommendedAction: "Review sensor placement and compare with training event records.",
  createdAt: "2026-06-15T08:17:00.000Z"
};

export const exampleTrainingReport: TrainingReport = {
  id: "report-001",
  userId: "user-001",
  therapistUserId: "therapist-001",
  periodStart: "2026-06-01",
  periodEnd: "2026-06-15",
  generatedAt: "2026-06-15T08:30:00.000Z",
  sessionCount: 4,
  completedSessionCount: 4,
  averageCompletionRate: 1,
  metricSummaries: [
    {
      trainingType: "attention_training",
      completedSessionCount: 2,
      averageCompletionRate: 1,
      averageAccuracyRate: 0.8,
      averageReactionTimeMs: 530,
      trendLabel: "stable"
    }
  ],
  riskAlerts: [exampleRiskAlert],
  narrativeSummary: "This report summarizes auxiliary training records and observed trends.",
  nextTrainingFocus: ["maintain low-stimulation attention practice"],
  dataScopeNotice: "Report data is privacy-sensitive and limited to authorized training review."
};
