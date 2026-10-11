import type { TrendPoint, UserDetailSourceRecord } from "./therapist-user-detail-model.js";

function weekPoints(seed: number): TrendPoint[] {
  return [
    ["周一", 64, 820, 0.16, 0.12, 61, 55, 38],
    ["周二", 66, 790, 0.14, 0.1, 63, 56, 36],
    ["周三", 67, 760, 0.13, 0.11, 64, 57, 37],
    ["周四", 69, 750, 0.12, 0.09, 66, 58, 35],
    ["周五", 70, 735, 0.11, 0.08, 67, 60, 34],
    ["周六", 68, 770, 0.12, 0.1, 65, 59, 36],
    ["周日", 71, 730, 0.1, 0.08, 68, 61, 33]
  ].map(
    ([label, attention, reaction, falseAlarm, omission, eegAttention, relaxation, fatigue]) => ({
      label: String(label),
      attentionStabilityScore: Number(attention) + seed,
      averageReactionTimeMs: Number(reaction) - seed * 8,
      falseAlarmRate: Math.max(0.04, Number(falseAlarm) - seed * 0.005),
      omissionRate: Math.max(0.04, Number(omission) - seed * 0.004),
      eegAttentionIndex: Number(eegAttention) + seed,
      eegRelaxationIndex: Number(relaxation) + Math.round(seed / 2),
      eegFatigueIndex: Math.max(20, Number(fatigue) - seed)
    })
  );
}

function monthPoints(seed: number): TrendPoint[] {
  return [
    ["第1周", 61, 850, 0.18, 0.14, 59, 54, 40],
    ["第2周", 64, 810, 0.15, 0.12, 62, 56, 38],
    ["第3周", 67, 780, 0.13, 0.1, 65, 58, 36],
    ["第4周", 70, 740, 0.11, 0.09, 68, 60, 34]
  ].map(
    ([label, attention, reaction, falseAlarm, omission, eegAttention, relaxation, fatigue]) => ({
      label: String(label),
      attentionStabilityScore: Number(attention) + seed,
      averageReactionTimeMs: Number(reaction) - seed * 10,
      falseAlarmRate: Math.max(0.04, Number(falseAlarm) - seed * 0.006),
      omissionRate: Math.max(0.04, Number(omission) - seed * 0.005),
      eegAttentionIndex: Number(eegAttention) + seed,
      eegRelaxationIndex: Number(relaxation) + Math.round(seed / 2),
      eegFatigueIndex: Math.max(20, Number(fatigue) - seed)
    })
  );
}

export const mockUserDetailRecords: UserDetailSourceRecord[] = [
  {
    userId: "trainee-lin-001",
    basicInfo: {
      genderLabel: "未填写",
      guardianConsentStatus: "confirmed",
      boundTherapistName: "陈老师"
    },
    trainingGoal: {
      primaryGoal: "提升持续观察和按规则点击的稳定性",
      focusAreas: ["持续注意", "冲动控制", "节律同步"],
      weeklyPlanLabel: "每周 4 次，每次 20-25 分钟，保留中途休息",
      safetyNote: "训练中若出现疲劳或佩戴不适，先暂停并切换低强度任务。"
    },
    baselineAssessment: {
      assessedAtLabel: "2026-06-10",
      attentionReferenceScore: 62,
      averageReactionTimeMs: 840,
      impulseControlReferenceScore: 58,
      rhythmSyncReferenceScore: 60,
      eegSignalQualityLabel: "可用于趋势参考",
      summary: "基线用于后续训练趋势对比和训练计划起点参考。"
    },
    recentTrainingRecords: [
      {
        id: "record-lin-20260616",
        completedAtLabel: "今天 17:20",
        trainingType: "mixed_session",
        trainingTypeLabel: "综合训练",
        durationMinutes: 24,
        completionStatusLabel: "已完成",
        accuracyRate: 0.82,
        averageReactionTimeMs: 730,
        falseAlarmRate: 0.1,
        omissionRate: 0.08,
        eegAttentionIndex: 68,
        eegRelaxationIndex: 61,
        eegFatigueIndex: 33,
        difficultyLabel: "标准",
        note: "节律导航路线顺序更稳定，Go/No-Go 中等待提示表现较好。"
      },
      {
        id: "record-lin-20260615",
        completedAtLabel: "昨天 18:20",
        trainingType: "go_nogo_game",
        trainingTypeLabel: "Go/No-Go",
        durationMinutes: 8,
        completionStatusLabel: "已完成",
        accuracyRate: 0.79,
        averageReactionTimeMs: 760,
        falseAlarmRate: 0.12,
        omissionRate: 0.09,
        eegAttentionIndex: 66,
        eegRelaxationIndex: 58,
        eegFatigueIndex: 35,
        difficultyLabel: "标准",
        note: "等待规则保持较好，误按率较前次下降。"
      },
      {
        id: "record-lin-20260613",
        completedAtLabel: "3天前",
        trainingType: "attention_game",
        trainingTypeLabel: "目标探测",
        durationMinutes: 10,
        completionStatusLabel: "部分完成",
        accuracyRate: 0.74,
        averageReactionTimeMs: 805,
        falseAlarmRate: 0.14,
        omissionRate: 0.12,
        eegAttentionIndex: 63,
        eegRelaxationIndex: 56,
        eegFatigueIndex: 38,
        difficultyLabel: "轻量",
        note: "训练后段反应时波动稍大，下次建议保留休息。"
      }
    ],
    weeklyTrendPoints: weekPoints(1),
    monthlyTrendPoints: monthPoints(1),
    musicAdaptations: [
      {
        id: "music-lin-001",
        trackTitle: "森林慢节奏",
        usedAtLabel: "今天训练前",
        suitabilityScore: 78,
        recommendationLabel: "可继续观察使用",
        userFeedbackLabel: "喜欢",
        nextSuggestion: "适合训练前准备或训练后放松，音量保持舒适。"
      },
      {
        id: "music-lin-002",
        trackTitle: "轻柔白噪声",
        usedAtLabel: "上周",
        suitabilityScore: 61,
        recommendationLabel: "可短时使用",
        userFeedbackLabel: "一般",
        nextSuggestion: "建议短时使用，若感觉单调可换自然声。"
      }
    ],
    therapistNotes: [
      {
        id: "note-lin-001",
        createdAtLabel: "今天 17:35",
        authorName: "陈老师",
        content: "下次从标准难度开始，节律导航先保持 4 个节点路线。",
        visibilityLabel: "治疗师可见"
      }
    ]
  },
  {
    userId: "trainee-yu-002",
    basicInfo: {
      genderLabel: "女",
      guardianConsentStatus: "confirmed",
      boundTherapistName: "陈老师"
    },
    trainingGoal: {
      primaryGoal: "建立短时训练习惯并减少疲劳中断",
      focusAreas: ["训练坚持", "低干扰注意训练", "音乐放松"],
      weeklyPlanLabel: "每周 3 次，每次 12-18 分钟",
      safetyNote: "保留主动休息入口，优先使用低强度音乐。"
    },
    baselineAssessment: {
      assessedAtLabel: "2026-06-11",
      attentionReferenceScore: 56,
      averageReactionTimeMs: 920,
      impulseControlReferenceScore: 54,
      rhythmSyncReferenceScore: 52,
      eegSignalQualityLabel: "部分时段波动",
      summary: "基线显示训练状态有波动，建议从短时任务开始观察。"
    },
    recentTrainingRecords: [
      {
        id: "record-yu-20260616",
        completedAtLabel: "今天 09:30",
        trainingType: "music_therapy",
        trainingTypeLabel: "音乐放松",
        durationMinutes: 6,
        completionStatusLabel: "部分完成",
        accuracyRate: 0.68,
        averageReactionTimeMs: 920,
        falseAlarmRate: 0.18,
        omissionRate: 0.16,
        eegAttentionIndex: 57,
        eegRelaxationIndex: 64,
        eegFatigueIndex: 48,
        difficultyLabel: "轻量",
        note: "用户主动要求休息，后续建议缩短训练时长。"
      }
    ],
    weeklyTrendPoints: weekPoints(-2),
    monthlyTrendPoints: monthPoints(-2),
    musicAdaptations: [
      {
        id: "music-yu-001",
        trackTitle: "溪流自然声",
        usedAtLabel: "今天",
        suitabilityScore: 70,
        recommendationLabel: "适合训练后恢复",
        userFeedbackLabel: "喜欢",
        nextSuggestion: "适合训练后使用，训练中不建议音量过高。"
      }
    ],
    therapistNotes: [
      {
        id: "note-yu-001",
        createdAtLabel: "今天 09:45",
        authorName: "陈老师",
        content: "保持短任务，先减少干扰项数量。",
        visibilityLabel: "治疗师可见"
      }
    ]
  },
  {
    userId: "trainee-ming-003",
    basicInfo: {
      genderLabel: "男",
      guardianConsentStatus: "confirmed",
      boundTherapistName: "陈老师"
    },
    trainingGoal: {
      primaryGoal: "提升规则切换和节拍同步稳定性",
      focusAreas: ["任务切换", "节律导航", "反应时稳定"],
      weeklyPlanLabel: "每周 5 次，每次 20 分钟",
      safetyNote: "避免连续高难度任务，完成后保留放松阶段。"
    },
    baselineAssessment: {
      assessedAtLabel: "2026-06-08",
      attentionReferenceScore: 68,
      averageReactionTimeMs: 760,
      impulseControlReferenceScore: 66,
      rhythmSyncReferenceScore: 64,
      eegSignalQualityLabel: "稳定",
      summary: "基线用于训练计划起点设置和趋势对比。"
    },
    recentTrainingRecords: [
      {
        id: "record-ming-20260616",
        completedAtLabel: "今天 16:10",
        trainingType: "rhythm_navigation",
        trainingTypeLabel: "节律导航",
        durationMinutes: 10,
        completionStatusLabel: "已完成",
        accuracyRate: 0.88,
        averageReactionTimeMs: 690,
        falseAlarmRate: 0.08,
        omissionRate: 0.06,
        eegAttentionIndex: 72,
        eegRelaxationIndex: 58,
        eegFatigueIndex: 31,
        difficultyLabel: "进阶",
        note: "路线顺序完成较好，规则切换可继续练习。"
      }
    ],
    weeklyTrendPoints: weekPoints(4),
    monthlyTrendPoints: monthPoints(4),
    musicAdaptations: [
      {
        id: "music-ming-001",
        trackTitle: "轻节拍训练",
        usedAtLabel: "昨天",
        suitabilityScore: 74,
        recommendationLabel: "可用于节律任务前准备",
        userFeedbackLabel: "一般",
        nextSuggestion: "适合短时节奏准备，不建议延长播放。"
      }
    ],
    therapistNotes: [
      {
        id: "note-ming-001",
        createdAtLabel: "今天 16:25",
        authorName: "陈老师",
        content: "下次可加入黄色倒序规则，但控制路线长度。",
        visibilityLabel: "治疗师可见"
      }
    ]
  },
  {
    userId: "trainee-qiqi-004",
    basicInfo: {
      genderLabel: "未填写",
      guardianConsentStatus: "confirmed",
      boundTherapistName: "陈老师"
    },
    trainingGoal: {
      primaryGoal: "降低训练疲劳并恢复稳定参与",
      focusAreas: ["音乐放松", "短时注意训练", "训练休息"],
      weeklyPlanLabel: "每周 2-3 次，每次 6-12 分钟",
      safetyNote: "疲劳趋势升高时暂停训练，优先休息。"
    },
    baselineAssessment: {
      assessedAtLabel: "2026-06-09",
      attentionReferenceScore: 52,
      averageReactionTimeMs: 980,
      impulseControlReferenceScore: 51,
      rhythmSyncReferenceScore: 49,
      eegSignalQualityLabel: "可用但需复查佩戴",
      summary: "当前建议以短时低强度任务观察训练状态。"
    },
    recentTrainingRecords: [
      {
        id: "record-qiqi-20260614",
        completedAtLabel: "前天 17:40",
        trainingType: "attention_game",
        trainingTypeLabel: "持续注意",
        durationMinutes: 5,
        completionStatusLabel: "已暂停",
        accuracyRate: 0.6,
        averageReactionTimeMs: 1020,
        falseAlarmRate: 0.2,
        omissionRate: 0.18,
        eegAttentionIndex: 51,
        eegRelaxationIndex: 53,
        eegFatigueIndex: 58,
        difficultyLabel: "轻量",
        note: "训练中疲劳趋势升高，系统建议休息。"
      }
    ],
    weeklyTrendPoints: weekPoints(-5),
    monthlyTrendPoints: monthPoints(-5),
    musicAdaptations: [
      {
        id: "music-qiqi-001",
        trackTitle: "海浪自然声",
        usedAtLabel: "前天",
        suitabilityScore: 66,
        recommendationLabel: "适合休息阶段",
        userFeedbackLabel: "一般",
        nextSuggestion: "建议训练后短时使用，避免作为任务中强提示。"
      }
    ],
    therapistNotes: [
      {
        id: "note-qiqi-001",
        createdAtLabel: "前天 18:00",
        authorName: "陈老师",
        content: "本周先减少任务量，关注休息后的恢复趋势。",
        visibilityLabel: "治疗师可见"
      }
    ]
  },
  {
    userId: "trainee-an-005",
    basicInfo: {
      genderLabel: "未填写",
      guardianConsentStatus: "pending",
      boundTherapistName: "陈老师"
    },
    trainingGoal: {
      primaryGoal: "完成建档后建立第一周训练计划",
      focusAreas: ["基线采集", "音乐适配", "短时目标探测"],
      weeklyPlanLabel: "等待治疗师确认",
      safetyNote: "监护人同意确认后再开始正式训练记录。"
    },
    baselineAssessment: {
      assessedAtLabel: "等待采集",
      attentionReferenceScore: 0,
      averageReactionTimeMs: 0,
      impulseControlReferenceScore: 0,
      rhythmSyncReferenceScore: 0,
      eegSignalQualityLabel: "等待数据",
      summary: "尚未形成基线参考。"
    },
    recentTrainingRecords: [
      {
        id: "record-an-placeholder",
        completedAtLabel: "暂无",
        trainingType: "baseline_assessment",
        trainingTypeLabel: "等待基线",
        durationMinutes: 0,
        completionStatusLabel: "未开始",
        accuracyRate: 0,
        averageReactionTimeMs: 0,
        falseAlarmRate: 0,
        omissionRate: 0,
        eegAttentionIndex: 0,
        eegRelaxationIndex: 0,
        eegFatigueIndex: 0,
        difficultyLabel: "未设置",
        note: "等待完成建档和基线采集。"
      }
    ],
    weeklyTrendPoints: weekPoints(-8),
    monthlyTrendPoints: monthPoints(-8),
    musicAdaptations: [],
    therapistNotes: [
      {
        id: "note-an-001",
        createdAtLabel: "今天",
        authorName: "陈老师",
        content: "先确认监护人同意状态，再安排基线采集。",
        visibilityLabel: "治疗师可见"
      }
    ]
  }
];
