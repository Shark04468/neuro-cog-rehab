import type { TherapistDashboardSupplement } from "./therapist-dashboard-model.js";

export const mockTherapistDashboardSupplement: TherapistDashboardSupplement = {
  displayNameByUserId: {
    "trainee-lin-001": "小林",
    "trainee-yu-002": "小雨",
    "trainee-ming-003": "明明",
    "trainee-qiqi-004": "琪琪",
    "trainee-an-005": "安安",
    "trainee-other-999": "其他机构用户"
  },
  trainingTrend: [
    { dayLabel: "周一", completedSessions: 6, plannedSessions: 8, averageCompletionRate: 76 },
    { dayLabel: "周二", completedSessions: 7, plannedSessions: 8, averageCompletionRate: 82 },
    { dayLabel: "周三", completedSessions: 5, plannedSessions: 8, averageCompletionRate: 64 },
    { dayLabel: "周四", completedSessions: 8, plannedSessions: 9, averageCompletionRate: 86 },
    { dayLabel: "周五", completedSessions: 7, plannedSessions: 9, averageCompletionRate: 79 },
    { dayLabel: "周六", completedSessions: 4, plannedSessions: 5, averageCompletionRate: 80 },
    { dayLabel: "今天", completedSessions: 3, plannedSessions: 8, averageCompletionRate: 62 }
  ],
  eegTrend: [
    { dayLabel: "周一", attentionScore: 62, relaxationScore: 48, fatigueScore: 35 },
    { dayLabel: "周二", attentionScore: 65, relaxationScore: 51, fatigueScore: 33 },
    { dayLabel: "周三", attentionScore: 61, relaxationScore: 53, fatigueScore: 39 },
    { dayLabel: "周四", attentionScore: 69, relaxationScore: 50, fatigueScore: 31 },
    { dayLabel: "周五", attentionScore: 71, relaxationScore: 54, fatigueScore: 30 },
    { dayLabel: "周六", attentionScore: 66, relaxationScore: 57, fatigueScore: 34 },
    { dayLabel: "今天", attentionScore: 68, relaxationScore: 55, fatigueScore: 32 }
  ],
  moduleHeat: [
    { moduleName: "音乐疗愈", completedCount: 9, plannedCount: 14 },
    { moduleName: "注意力训练", completedCount: 7, plannedCount: 12 },
    { moduleName: "Go/No-Go", completedCount: 6, plannedCount: 10 },
    { moduleName: "节律导航", completedCount: 5, plannedCount: 9 }
  ],
  musicTrend: [
    { dayLabel: "周一", suitabilityScore: 72 },
    { dayLabel: "周二", suitabilityScore: 76 },
    { dayLabel: "周三", suitabilityScore: 68 },
    { dayLabel: "周四", suitabilityScore: 81 },
    { dayLabel: "周五", suitabilityScore: 78 },
    { dayLabel: "周六", suitabilityScore: 74 },
    { dayLabel: "今天", suitabilityScore: 70 }
  ],
  eegQuality: [
    { label: "稳定信号", value: 84, tone: "good" },
    { label: "需复核佩戴", value: 12, tone: "watch" },
    { label: "波动会话", value: 4, tone: "unstable" }
  ],
  pendingReportCount: 4,
  parentFeedbackCount: 1,
  recentReports: [
    {
      id: "report-weekly-lin",
      userId: "trainee-lin-001",
      userDisplayName: "小林",
      title: "第6周训练趋势简报",
      generatedAtLabel: "今天 10:20",
      reportType: "weekly"
    },
    {
      id: "report-session-yu",
      userId: "trainee-yu-002",
      userDisplayName: "小雨",
      title: "音乐疗愈训练记录",
      generatedAtLabel: "今天 09:50",
      reportType: "session"
    },
    {
      id: "report-weekly-ming",
      userId: "trainee-ming-003",
      userDisplayName: "明明",
      title: "节律导航阶段反馈",
      generatedAtLabel: "昨天 18:10",
      reportType: "weekly"
    }
  ]
};
