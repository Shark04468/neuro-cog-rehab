import { describe, expect, it } from "vitest";
import {
  TRAINING_TYPES,
  createAppError,
  isUserRole,
  type AdaptiveDifficultyConfig,
  type AdaptiveDifficultyEvaluationInput,
  type AdaptiveDifficultyRecommendation,
  type BaselineAssessment,
  type EEGFeatureFrame,
  type EEGQualityStatus,
  type EegSample,
  type GameSessionResult,
  type GeneratedTrainingPrescription,
  type GoNoGoGameResult,
  type MusicTrack,
  type MusicTherapySession,
  type RhythmNavigationResult,
  type StopSignalResult,
  type RiskAlert,
  type TherapistProfile,
  type TrainingReport,
  type TrainingSession,
  type TrialEvent
} from "../src/index.js";
import {
  exampleAttentionGameResult,
  exampleBaselineAssessment,
  exampleEEGFeatureFrame,
  exampleRiskAlert,
  exampleTrainingReport,
  exampleTrainingSession,
  exampleUserProfile
} from "../src/examples/core-types.example.js";

describe("shared type foundations", () => {
  it("recognizes supported user roles", () => {
    expect(isUserRole("trainee")).toBe(true);
    expect(isUserRole("diagnostic_user")).toBe(false);
  });

  it("keeps training types within the auxiliary training boundary", () => {
    expect(TRAINING_TYPES).toEqual([
      "music_relaxation",
      "attention_training",
      "go_no_go",
      "stop_signal",
      "rhythm_navigation"
    ]);
  });

  it("creates structured application errors", () => {
    expect(createAppError("PERMISSION_DENIED", "Data scope is not allowed.")).toEqual({
      code: "PERMISSION_DENIED",
      message: "Data scope is not allowed."
    });
  });

  it("allows typed EEG samples and trial events without clinical conclusions", () => {
    const eegSample: EegSample = {
      sessionId: "session-1",
      timestamp: "2026-01-01T00:00:00.000Z",
      attentionIndex: 58,
      relaxationIndex: 62,
      signalQuality: 95,
      artifactFlag: false
    };

    const trialEvent: TrialEvent = {
      sessionId: "session-1",
      trialIndex: 1,
      trainingType: "go_no_go",
      isCorrect: true,
      reactionTimeMs: 420,
      difficultyLevel: 1,
      clientTimestamp: "2026-01-01T00:00:01.000Z"
    };

    expect(eegSample.signalQuality).toBeGreaterThan(0);
    expect(trialEvent.trainingType).toBe("go_no_go");
  });

  it("exports the required MVP domain types through the shared entrypoint", () => {
    const baseline: BaselineAssessment = exampleBaselineAssessment;
    const session: TrainingSession = exampleTrainingSession;
    const eegFrame: EEGFeatureFrame = exampleEEGFeatureFrame;
    const qualityStatus: EEGQualityStatus = eegFrame.qualityStatus;
    const riskAlert: RiskAlert = exampleRiskAlert;
    const report: TrainingReport = exampleTrainingReport;

    expect(exampleUserProfile.guardianUserIds).toEqual(["guardian-001"]);
    expect(baseline.readinessConfirmed).toBe(true);
    expect(session.dataSensitivity).toBe("sensitive");
    expect(qualityStatus).toBe("good");
    expect(exampleAttentionGameResult.trainingType).toBe("attention_training");
    expect(riskAlert.category).toBe("data_quality");
    expect(report.metricSummaries).toHaveLength(1);
  });

  it("supports game, music, therapist, and adaptive configuration shapes", () => {
    const therapist: TherapistProfile = {
      id: "therapist-profile-2",
      userId: "therapist-2",
      displayName: "Therapist B",
      serviceScopes: ["training report review"],
      assignedUserProfileIds: ["profile-2"],
      contactEmail: "therapist-b@example.test",
      isActive: true,
      createdAt: "2026-06-15T00:00:00.000Z",
      updatedAt: "2026-06-15T00:00:00.000Z"
    };

    const musicSession: MusicTherapySession = {
      id: "music-2",
      userId: "user-2",
      trackId: "track-2",
      trackTitle: "Soft Pulse",
      purpose: "cool_down",
      startedAt: "2026-06-15T00:00:00.000Z",
      durationSeconds: 180,
      volumeLevel: 40,
      completionRate: 0.9
    };

    const musicTrack: MusicTrack = {
      id: "music-track-2",
      title: "Gentle Focus Pulse",
      duration: 240,
      bpm: 72,
      tags: ["focus", "rhythm"],
      intensityLevel: 2,
      recommendedScene: "Short attention warm-up before training.",
      contraindicationNote: "Skip when the user reports sound discomfort.",
      fileUrl: "https://assets.example.test/music/gentle-focus-pulse.mp3"
    };

    const baseGameResult: GameSessionResult = {
      sessionId: "session-2",
      userId: "user-2",
      trainingType: "go_no_go",
      startedAt: "2026-06-15T00:00:00.000Z",
      endedAt: "2026-06-15T00:05:00.000Z",
      durationSeconds: 300,
      difficultyLevel: 1,
      completionRate: 1,
      accuracyRate: 0.75,
      totalTrials: 20,
      correctTrials: 15,
      errorCount: 5,
      pauseCount: 0
    };

    const goNoGoResult: GoNoGoGameResult = {
      ...baseGameResult,
      trainingType: "go_no_go",
      goAccuracyRate: 0.8,
      noGoInhibitionRate: 0.7,
      falseAlarmCount: 3,
      omissionCount: 2,
      earlyResponseCount: 1,
      averageGoReactionTimeMs: 430
    };

    const rhythmResult: RhythmNavigationResult = {
      ...baseGameResult,
      trainingType: "rhythm_navigation",
      routeAccuracy: 0.82,
      sequenceErrorCount: 3,
      timingError: 120,
      averageReactionTime: 540,
      workingMemoryScore: 78,
      taskSwitchingScore: 74,
      rhythmSyncRate: 0.72,
      routeCompletionRate: 0.85,
      taskSwitchErrorCount: 2,
      oldRuleInterferenceErrorCount: 1,
      taskRuleChangeCount: 3,
      ruleAccuracy: 0.82,
      workingMemoryStepAccuracy: 0.78,
      averageBeatOffsetMs: 120
    };

    const stopSignalResult: StopSignalResult = {
      ...baseGameResult,
      trainingType: "stop_signal",
      stopSignalDelayMs: 280,
      targetDisplayTimeMs: 1300,
      stopTrialRatio: 0.3,
      goTrialCount: 14,
      stopTrialCount: 6,
      stopSuccessRate: 0.67,
      stopFailureCount: 2,
      respondedBeforeStopSignalCount: 1,
      impulsiveResponseCount: 3,
      averageGoReactionTimeMs: 420,
      trialResults: [
        {
          trialId: "trial-1",
          trialIndex: 0,
          trialType: "stop",
          targetPresentedAt: "2026-06-15T00:00:01.000Z",
          stopSignalPresentedAt: "2026-06-15T00:00:01.280Z",
          stopSignalDelayMs: 280,
          outcome: "stop_success",
          isCorrect: true
        }
      ]
    };

    const adaptiveConfig: AdaptiveDifficultyConfig = {
      id: "adaptive-2",
      trainingType: "go_no_go",
      minDifficultyLevel: 1,
      maxDifficultyLevel: 4,
      stepSize: 1,
      evaluationWindowSize: 3,
      accuracyUpperThreshold: 0.85,
      accuracyLowerThreshold: 0.6,
      safetyPauseThreshold: 2,
      isEnabled: true,
      updatedBy: "therapist-2",
      updatedAt: "2026-06-15T00:00:00.000Z"
    };

    const adaptiveInput: AdaptiveDifficultyEvaluationInput = {
      currentDifficultyLevel: 2,
      recentAccuracyRate: 0.86,
      omissionRate: 0.04,
      commissionRate: 0.05,
      averageReactionTimeMs: 640,
      reactionTimeVariabilityMs: 120,
      eegAttentionIndex: 68,
      eegFatigueIndex: 40,
      eegQualityStatus: "good",
      subjectiveFeedback: "just_right"
    };

    const adaptiveRecommendation: AdaptiveDifficultyRecommendation = {
      nextDifficultyLevel: 3,
      targetPresentationTimeMs: 1200,
      distractorCount: 5,
      stimulusIntervalMs: 1100,
      recommendedDurationSeconds: 240,
      musicUseSuggestion: "optional_focus_support",
      shouldPause: false,
      direction: "increase",
      explanation: "Rule-based training configuration suggestion.",
      ruleExplanations: [
        {
          ruleId: "performance.increase_boundary",
          triggered: true,
          message: "Recent training values are within the configured increase boundary.",
          direction: "increase"
        }
      ],
      inputSummary: adaptiveInput
    };

    const generatedPrescription: GeneratedTrainingPrescription = {
      userId: "trainee-1",
      generatedAt: "2026-06-15T00:00:00.000Z",
      weeklyTrainingFrequency: {
        sessionsPerWeek: 3,
        explanation: "Initial auxiliary training frequency."
      },
      sessionDurationMinutes: 15,
      recommendedModuleCombination: [
        {
          moduleType: "sustained_attention",
          displayName: "持续注意训练",
          priority: 1,
          recommendedMinutes: 8,
          difficultyStartLevel: 1,
          targetFocus: ["attention_stability"],
          explanation: "漏按率较高时优先安排持续注意训练。"
        }
      ],
      musicTherapySuggestion: {
        recommended: true,
        preferredTags: ["relax"],
        timing: "after_training",
        intensityLevel: 1,
        explanation: "训练后使用低强度放松素材。"
      },
      gameDifficultyStartLevel: 1,
      riskReminders: [
        {
          category: "training_load",
          severity: "watch",
          message: "疲劳趋势偏高时降低训练强度。",
          suggestedAction: "缩短单次时长并记录反馈。"
        }
      ],
      nextWeekAdjustmentSuggestions: ["根据完成率和疲劳趋势小步调整。"],
      explanation: "辅助训练建议。",
      scopeNotice: "不作为诊断、治疗或疗效保证。"
    };

    expect(therapist.isActive).toBe(true);
    expect(musicTrack.tags).toContain("focus");
    expect(musicSession.purpose).toBe("cool_down");
    expect(goNoGoResult.falseAlarmCount).toBe(3);
    expect(stopSignalResult.trainingType).toBe("stop_signal");
    expect(stopSignalResult.trialResults[0]?.outcome).toBe("stop_success");
    expect(rhythmResult.trainingType).toBe("rhythm_navigation");
    expect(adaptiveConfig.maxDifficultyLevel).toBe(4);
    expect(adaptiveRecommendation.shouldPause).toBe(false);
    expect(generatedPrescription.recommendedModuleCombination[0]?.moduleType).toBe(
      "sustained_attention"
    );
  });

  it("keeps example report wording inside training-record and trend boundaries", () => {
    const serialized = JSON.stringify(exampleTrainingReport).toLowerCase();

    expect(serialized).not.toContain("diagnosis");
    expect(serialized).not.toContain("cure");
    expect(serialized).not.toContain("guarantee");
    expect(serialized).not.toContain("treatment replacement");
  });
});
