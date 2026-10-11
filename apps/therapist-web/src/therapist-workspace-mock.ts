import type {
  TherapistWorkspacePrincipal,
  TherapistWorkspaceUser
} from "./therapist-workspace-model.js";

export const mockTherapistPrincipal: TherapistWorkspacePrincipal = {
  userId: "therapist-account-001",
  therapistId: "therapist-chen-001",
  organizationId: "org-rehab-001",
  roles: ["therapist"]
};

export const mockTherapistWorkspaceUsers: TherapistWorkspaceUser[] = [
  {
    id: "trainee-lin-001",
    userProfileId: "profile-lin-001",
    displayName: "小林",
    ageRange: "10-12",
    organizationId: "org-rehab-001",
    boundTherapistIds: ["therapist-chen-001"],
    trainingStatus: "scheduled_today",
    todayPlan: {
      moduleNames: ["音乐放松", "注意力训练", "节律导航"],
      plannedMinutes: 24,
      prescriptionStatus: "ready"
    },
    lastSession: {
      completedAtLabel: "昨天 18:20",
      moduleName: "Go/No-Go 点击练习",
      durationMinutes: 8,
      completionStatus: "completed",
      note: "等待提示时更稳定，下次继续从标准难度开始。"
    },
    compliance: {
      plannedSessions7d: 5,
      completedSessions7d: 4,
      missedSessions7d: 1,
      completionRate: 0.8,
      streakDays: 3
    },
    riskReminder: {
      level: "watch",
      category: "device_signal",
      message: "上次训练中头戴设备信号有波动，开始前建议先检查佩戴。",
      occurredAtLabel: "昨天"
    }
  },
  {
    id: "trainee-yu-002",
    userProfileId: "profile-yu-002",
    displayName: "小雨",
    ageRange: "8-10",
    organizationId: "org-rehab-001",
    boundTherapistIds: ["therapist-chen-001"],
    trainingStatus: "in_progress",
    todayPlan: {
      moduleNames: ["音乐放松", "目标探测"],
      plannedMinutes: 18,
      prescriptionStatus: "ready"
    },
    lastSession: {
      completedAtLabel: "今天 09:30",
      moduleName: "音乐疗愈",
      durationMinutes: 6,
      completionStatus: "partial",
      note: "训练中主动要求休息，建议保持短时、低干扰安排。"
    },
    compliance: {
      plannedSessions7d: 4,
      completedSessions7d: 3,
      missedSessions7d: 1,
      completionRate: 0.75,
      streakDays: 2
    },
    riskReminder: {
      level: "needs_review",
      category: "comfort_feedback",
      message: "用户反馈有些累，今天后续任务建议缩短并保留休息。",
      occurredAtLabel: "今天"
    }
  },
  {
    id: "trainee-ming-003",
    userProfileId: "profile-ming-003",
    displayName: "明明",
    ageRange: "13-16",
    organizationId: "org-rehab-001",
    boundTherapistIds: ["therapist-chen-001"],
    trainingStatus: "completed_today",
    todayPlan: {
      moduleNames: ["Go/No-Go", "节律导航"],
      plannedMinutes: 20,
      prescriptionStatus: "ready"
    },
    lastSession: {
      completedAtLabel: "今天 16:10",
      moduleName: "节律导航",
      durationMinutes: 10,
      completionStatus: "completed",
      note: "路线顺序完成较好，规则切换时仍可继续练习。"
    },
    compliance: {
      plannedSessions7d: 5,
      completedSessions7d: 5,
      missedSessions7d: 0,
      completionRate: 1,
      streakDays: 5
    },
    riskReminder: {
      level: "none",
      category: "none",
      message: "暂无需要关注的训练提醒。",
      occurredAtLabel: "今天"
    }
  },
  {
    id: "trainee-qiqi-004",
    userProfileId: "profile-qiqi-004",
    displayName: "琪琪",
    ageRange: "10-12",
    organizationId: "org-rehab-001",
    boundTherapistIds: ["therapist-chen-001"],
    trainingStatus: "paused",
    todayPlan: {
      moduleNames: ["音乐放松"],
      plannedMinutes: 6,
      prescriptionStatus: "needs_update"
    },
    lastSession: {
      completedAtLabel: "前天 17:40",
      moduleName: "持续注意训练",
      durationMinutes: 5,
      completionStatus: "paused",
      note: "训练中出现疲劳趋势，系统已建议休息。"
    },
    compliance: {
      plannedSessions7d: 5,
      completedSessions7d: 2,
      missedSessions7d: 3,
      completionRate: 0.4,
      streakDays: 0
    },
    riskReminder: {
      level: "watch",
      category: "fatigue_trend",
      message: "最近训练疲劳趋势偏高，建议先以放松音乐和短任务为主。",
      occurredAtLabel: "近3天"
    }
  },
  {
    id: "trainee-an-005",
    userProfileId: "profile-an-005",
    displayName: "安安",
    ageRange: "8-10",
    organizationId: "org-rehab-001",
    boundTherapistIds: ["therapist-chen-001"],
    trainingStatus: "no_plan",
    todayPlan: {
      moduleNames: [],
      plannedMinutes: 0,
      prescriptionStatus: "not_set"
    },
    lastSession: null,
    compliance: {
      plannedSessions7d: 0,
      completedSessions7d: 0,
      missedSessions7d: 0,
      completionRate: 0,
      streakDays: 0
    },
    riskReminder: {
      level: "none",
      category: "none",
      message: "暂无需要关注的训练提醒。",
      occurredAtLabel: "今天"
    }
  },
  {
    id: "trainee-other-999",
    userProfileId: "profile-other-999",
    displayName: "其他机构用户",
    ageRange: "10-12",
    organizationId: "org-other-999",
    boundTherapistIds: ["therapist-other-999"],
    trainingStatus: "scheduled_today",
    todayPlan: {
      moduleNames: ["注意力训练"],
      plannedMinutes: 12,
      prescriptionStatus: "ready"
    },
    lastSession: null,
    compliance: {
      plannedSessions7d: 3,
      completedSessions7d: 3,
      missedSessions7d: 0,
      completionRate: 1,
      streakDays: 3
    },
    riskReminder: {
      level: "none",
      category: "none",
      message: "暂无需要关注的训练提醒。",
      occurredAtLabel: "今天"
    }
  }
];
