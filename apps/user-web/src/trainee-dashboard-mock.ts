import type { TraineeDashboardData } from "./trainee-dashboard-model.js";

export const mockTraineeDashboardData: TraineeDashboardData = {
  traineeName: "小林",
  statusSummary: "今天建议完成 4 个短任务，先检查设备，再按自己的节奏开始。",
  todayTasks: [
    {
      id: "task-music",
      title: "静息准备与音乐放松",
      moduleName: "音乐疗愈",
      durationMinutes: 6,
      difficultyLabel: "轻量",
      focusArea: "帮助进入稳定训练状态",
      therapistNote: "先用低强度音乐，让身体和注意力慢慢进入节奏。",
      status: "ready"
    },
    {
      id: "task-attention",
      title: "目标探测注意力训练",
      moduleName: "注意力训练",
      durationMinutes: 8,
      difficultyLabel: "标准",
      focusArea: "观察目标并保持专注",
      therapistNote: "不需要追求速度，先看清目标再点击。",
      status: "ready"
    },
    {
      id: "task-gonogo",
      title: "Go/No-Go 点击反应",
      moduleName: "点击反应",
      durationMinutes: 6,
      difficultyLabel: "标准",
      focusArea: "练习等待提示和控制点击",
      therapistNote: "看到红色提示时先停一下，保持平稳节奏。",
      status: "waiting"
    },
    {
      id: "task-rhythm",
      title: "节律导航路线记忆",
      moduleName: "节律导航",
      durationMinutes: 8,
      difficultyLabel: "标准",
      focusArea: "记住路线并跟随节拍",
      therapistNote: "规则切换前先读提示，按提示慢慢完成。",
      status: "waiting"
    }
  ],
  deviceStatus: {
    connectionStatus: "connected",
    signalQuality: "good",
    attentionScore: 68,
    relaxationScore: 54,
    fatigueScore: 32,
    latencyMs: 420
  },
  recommendedMusic: {
    title: "晨间低频白噪与自然声",
    tagLabel: "注意唤醒 / 自然声",
    durationMinutes: 6,
    bpm: 72,
    intensityLabel: "低强度",
    recommendedScene: "适合训练前 5-6 分钟静息准备。"
  },
  weeklyProgress: {
    completedSessions: 4,
    plannedSessions: 5,
    completedMinutes: 72,
    targetMinutes: 100,
    streakDays: 3,
    days: [
      { dayLabel: "周一", completedMinutes: 16, plannedMinutes: 20, attentionStabilityScore: 62 },
      { dayLabel: "周二", completedMinutes: 14, plannedMinutes: 20, attentionStabilityScore: 64 },
      { dayLabel: "周三", completedMinutes: 0, plannedMinutes: 20, attentionStabilityScore: null },
      { dayLabel: "周四", completedMinutes: 20, plannedMinutes: 20, attentionStabilityScore: 69 },
      { dayLabel: "周五", completedMinutes: 22, plannedMinutes: 20, attentionStabilityScore: 71 },
      { dayLabel: "周六", completedMinutes: 0, plannedMinutes: 0, attentionStabilityScore: null },
      { dayLabel: "今天", completedMinutes: 0, plannedMinutes: 20, attentionStabilityScore: null }
    ]
  },
  attentionTrend: [
    { dayLabel: "周一", attentionStabilityScore: 62, reactionConsistencyScore: 58 },
    { dayLabel: "周二", attentionStabilityScore: 64, reactionConsistencyScore: 61 },
    { dayLabel: "周三", attentionStabilityScore: 63, reactionConsistencyScore: 60 },
    { dayLabel: "周四", attentionStabilityScore: 69, reactionConsistencyScore: 65 },
    { dayLabel: "周五", attentionStabilityScore: 71, reactionConsistencyScore: 66 },
    { dayLabel: "周六", attentionStabilityScore: 70, reactionConsistencyScore: 67 },
    { dayLabel: "今天", attentionStabilityScore: 72, reactionConsistencyScore: 68 }
  ],
  lastFeedback: {
    moduleName: "Go/No-Go 点击反应",
    completedAtLabel: "昨天 18:20",
    completionLabel: "完成良好",
    summary: "等待提示时更稳定，红色提示误点次数比上次减少。",
    nextSuggestion: "今天继续从标准难度开始，先看清颜色提示再点击。"
  },
  therapistMessage: {
    therapistName: "陈老师",
    sentAtLabel: "今天 09:00",
    message: "今天任务不需要赶时间。如果设备提示信号波动，先调整佩戴，休息一下再继续。"
  },
  safetyTips: [
    {
      id: "tip-rest",
      title: "休息提醒",
      message: "连续训练约 12 分钟后，建议休息 2-3 分钟。"
    },
    {
      id: "tip-signal",
      title: "设备提示",
      message: "如果信号不稳定，请先调整佩戴位置，不要急着开始任务。"
    }
  ],
  restReminder: "感觉疲劳、头痛或明显不舒服时，可以暂停并告诉家长或治疗师。"
};
