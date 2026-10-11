import {
  buildWeeklyTrainingReportView,
  generateWeeklyTrainingReport,
  type WeeklyTrainingReportInput
} from "./weekly-training-report.js";

/**
 * Mock weekly report input for local demos, tests, and UI integration examples.
 * All ids are synthetic and must not be treated as real user data.
 */
export const mockWeeklyTrainingReportInput: WeeklyTrainingReportInput = {
  reportId: "weekly-report-demo-001",
  generatedAt: "2026-06-16T10:00:00.000Z",
  userInfo: {
    userId: "trainee-demo-001",
    userProfileId: "profile-demo-001",
    displayName: "小林",
    ageRange: "10-12",
    therapistUserId: "therapist-demo-001",
    guardianConsentLabel: "已确认"
  },
  period: {
    periodStart: "2026-06-08T00:00:00.000Z",
    periodEnd: "2026-06-14T23:59:59.000Z",
    timezone: "Asia/Shanghai"
  },
  plan: {
    plannedSessionCount: 4,
    plannedDurationMinutes: 80
  },
  sessions: [
    {
      sessionId: "session-demo-001",
      trainingType: "music_therapy",
      startedAt: "2026-06-09T09:00:00.000Z",
      endedAt: "2026-06-09T09:12:00.000Z",
      durationSeconds: 720,
      completionStatus: "completed",
      behaviorMetrics: {
        accuracyRate: 0.78,
        averageReactionTimeMs: 760
      },
      eegSummaryMetrics: {
        averageAttentionIndex: 58,
        averageRelaxationIndex: 61,
        averageFatigueIndex: 38,
        validSampleRate: 0.86,
        artifactCount: 6,
        frameCount: 720,
        qualityStatus: "unstable"
      },
      musicAdaptation: {
        trackTitle: "森林慢节奏",
        suitabilityScore: 70,
        recommendationLabel: "可继续观察使用",
        attentionChange: 2,
        relaxationChange: 7,
        fatigueChange: -2,
        userFeedbackLabel: "喜欢"
      },
      abnormalEventCount: 1,
      abnormalEventMessages: ["第 8 分钟 EEG 信号短暂波动，已提示调整佩戴。"]
    },
    {
      sessionId: "session-demo-002",
      trainingType: "attention_game",
      startedAt: "2026-06-10T09:00:00.000Z",
      endedAt: "2026-06-10T09:18:00.000Z",
      durationSeconds: 1080,
      completionStatus: "completed",
      behaviorMetrics: {
        accuracyRate: 0.74,
        omissionRate: 0.16,
        falseAlarmRate: 0.08,
        averageReactionTimeMs: 820,
        reactionTimeVariabilityMs: 190
      },
      eegSummaryMetrics: {
        averageAttentionIndex: 62,
        averageRelaxationIndex: 58,
        averageFatigueIndex: 44,
        validSampleRate: 0.9,
        artifactCount: 4,
        frameCount: 1080,
        qualityStatus: "good"
      }
    },
    {
      sessionId: "session-demo-003",
      trainingType: "go_nogo_game",
      startedAt: "2026-06-12T09:00:00.000Z",
      endedAt: "2026-06-12T09:16:00.000Z",
      durationSeconds: 960,
      completionStatus: "completed",
      behaviorMetrics: {
        accuracyRate: 0.82,
        omissionRate: 0.1,
        falseAlarmRate: 0.09,
        inhibitorySuccessRate: 0.91,
        averageReactionTimeMs: 710,
        reactionTimeVariabilityMs: 150
      },
      eegSummaryMetrics: {
        averageAttentionIndex: 67,
        averageRelaxationIndex: 60,
        averageFatigueIndex: 39,
        validSampleRate: 0.93,
        artifactCount: 3,
        frameCount: 960,
        qualityStatus: "good"
      }
    },
    {
      sessionId: "session-demo-004",
      trainingType: "rhythm_navigation",
      startedAt: "2026-06-14T09:00:00.000Z",
      endedAt: "2026-06-14T09:20:00.000Z",
      durationSeconds: 1200,
      completionStatus: "completed",
      behaviorMetrics: {
        accuracyRate: 0.84,
        omissionRate: 0.08,
        falseAlarmRate: 0.06,
        routeAccuracy: 0.86,
        timingErrorMs: 170,
        averageReactionTimeMs: 690,
        reactionTimeVariabilityMs: 138
      },
      eegSummaryMetrics: {
        averageAttentionIndex: 70,
        averageRelaxationIndex: 62,
        averageFatigueIndex: 35,
        validSampleRate: 0.94,
        artifactCount: 2,
        frameCount: 1200,
        qualityStatus: "good"
      },
      musicAdaptation: {
        trackTitle: "轻节拍导航",
        suitabilityScore: 78,
        recommendationLabel: "适合节律训练前后使用",
        attentionChange: 4,
        relaxationChange: 5,
        fatigueChange: -3,
        userFeedbackLabel: "一般"
      }
    }
  ],
  therapistNotes: "本周整体完成稳定，下周可保持短时训练并观察反应时波动。"
};

export const mockWeeklyTrainingReport = generateWeeklyTrainingReport(mockWeeklyTrainingReportInput);

export const mockTherapistWeeklyTrainingReportView = buildWeeklyTrainingReportView(
  mockWeeklyTrainingReport,
  "therapist"
);

export const mockGuardianWeeklyTrainingReportView = buildWeeklyTrainingReportView(
  mockWeeklyTrainingReport,
  "guardian"
);
