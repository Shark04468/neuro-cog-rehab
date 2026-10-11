export type ParentBriefTone = "steady" | "positive" | "next";

export type ParentBriefFieldId =
  | "brief_meta"
  | "training_persistence"
  | "task_completion"
  | "positive_changes"
  | "next_suggestions"
  | "data_sources";

export interface ParentBriefFieldDefinition {
  /** Stable field id used by API payloads and UI rendering. */
  id: ParentBriefFieldId;
  /** Parent-facing field title. */
  title: string;
  /** Plain-language explanation of what this field contains. */
  description: string;
  /** Data keys expected by this template section. */
  dataKeys: string[];
}

export interface ParentBriefMetricCard {
  label: string;
  value: string;
  helperText: string;
  tone: ParentBriefTone;
}

export interface ParentBriefSection {
  id: Exclude<ParentBriefFieldId, "brief_meta">;
  title: string;
  headline: string;
  body: string;
  items: string[];
  tone: ParentBriefTone;
}

export interface ParentBriefDataSource {
  label: string;
  description: string;
}

export interface ParentTrainingBriefInput {
  traineeDisplayName: string;
  periodLabel: string;
  generatedAtLabel: string;
  plannedSessionCount: number;
  completedSessionCount: number;
  totalTrainingMinutes: number;
  completedTaskNames: string[];
  positiveSignals: string[];
  nextSuggestions: string[];
  trainingContextNote?: string;
  dataSources: ParentBriefDataSource[];
}

export interface ParentTrainingBriefTemplate {
  templateName: "parent_training_brief";
  audience: "guardian";
  traineeDisplayName: string;
  periodLabel: string;
  generatedAtLabel: string;
  scopeNotice: string;
  fieldStructure: ParentBriefFieldDefinition[];
  summaryText: string;
  heroMetrics: ParentBriefMetricCard[];
  sections: ParentBriefSection[];
  exampleCopy: string[];
  dataSources: ParentBriefDataSource[];
}

export class ParentTrainingBriefModelError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ParentTrainingBriefModelError";
  }
}

const MAX_VISIBLE_ITEMS = 4;

export const parentBriefFieldStructure: ParentBriefFieldDefinition[] = [
  {
    id: "brief_meta",
    title: "简报基础信息",
    description: "展示孩子昵称、简报周期和生成时间。",
    dataKeys: ["traineeDisplayName", "periodLabel", "generatedAtLabel"]
  },
  {
    id: "training_persistence",
    title: "训练坚持情况",
    description: "展示本周期计划次数、完成次数、累计训练时长和坚持提示。",
    dataKeys: ["plannedSessionCount", "completedSessionCount", "totalTrainingMinutes"]
  },
  {
    id: "task_completion",
    title: "任务完成情况",
    description: "展示本周期完成过的训练任务，用简单语言说明完成进展。",
    dataKeys: ["completedTaskNames"]
  },
  {
    id: "positive_changes",
    title: "积极变化",
    description: "展示训练记录中可观察到的积极变化，只做趋势描述。",
    dataKeys: ["positiveSignals"]
  },
  {
    id: "next_suggestions",
    title: "下次建议",
    description: "展示下次训练前后可以做的小建议，避免增加家长焦虑。",
    dataKeys: ["nextSuggestions", "trainingContextNote"]
  },
  {
    id: "data_sources",
    title: "数据来源说明",
    description: "说明简报来自训练记录、任务结果、用户反馈和设备状态摘要。",
    dataKeys: ["dataSources"]
  }
];

export const mockParentTrainingBriefInput: ParentTrainingBriefInput = {
  traineeDisplayName: "小林",
  periodLabel: "最近 7 天",
  generatedAtLabel: "2026-06-16 19:30",
  plannedSessionCount: 4,
  completedSessionCount: 4,
  totalTrainingMinutes: 66,
  completedTaskNames: ["音乐放松", "目标探测", "Go/No-Go 点击练习", "节律导航"],
  positiveSignals: [
    "本周能按计划完成训练，训练节奏比较稳定。",
    "点击任务中，先看清提示再行动的表现更稳定。",
    "节律导航里，记住路线顺序的完成度有提升。",
    "训练后能主动休息，是很好的训练习惯。"
  ],
  nextSuggestions: [
    "下次继续保持短时训练，每段任务之间留出休息。",
    "开始前先确认头戴设备佩戴舒适，信号稳定后再训练。",
    "如果感觉累，可以先听一段轻柔音乐或暂停训练。"
  ],
  trainingContextNote: "本简报用于家庭了解训练坚持和任务完成情况，不用于判断健康结论。",
  dataSources: [
    {
      label: "训练计划",
      description: "来自治疗师为本周设置的训练次数、训练模块和时长建议。"
    },
    {
      label: "训练记录",
      description: "来自每次训练结束后保存的完成情况、任务结果和休息记录。"
    },
    {
      label: "用户反馈",
      description: "来自训练中或训练后填写的喜欢、一般、累了等主观反馈。"
    },
    {
      label: "设备状态摘要",
      description: "来自头戴设备连接与信号稳定情况，只作为训练状态参考。"
    }
  ]
};

export function buildParentTrainingBriefTemplate(
  input: ParentTrainingBriefInput
): ParentTrainingBriefTemplate {
  validateInput(input);

  const completionRate = input.completedSessionCount / Math.max(1, input.plannedSessionCount);
  const limitedTaskNames = input.completedTaskNames.slice(0, MAX_VISIBLE_ITEMS);
  const limitedPositiveSignals = input.positiveSignals.slice(0, MAX_VISIBLE_ITEMS);
  const limitedNextSuggestions = input.nextSuggestions.slice(0, MAX_VISIBLE_ITEMS);
  const summaryText = buildSummaryText(input, completionRate);

  return {
    templateName: "parent_training_brief",
    audience: "guardian",
    traineeDisplayName: sanitizePlainText(input.traineeDisplayName),
    periodLabel: sanitizePlainText(input.periodLabel),
    generatedAtLabel: sanitizePlainText(input.generatedAtLabel),
    scopeNotice: "这份简报只用于了解训练坚持、任务完成和下次安排，不做健康结论判断。",
    fieldStructure: parentBriefFieldStructure,
    summaryText,
    heroMetrics: [
      {
        label: "训练坚持",
        value: `${input.completedSessionCount}/${input.plannedSessionCount} 次`,
        helperText: completionRate >= 0.8 ? "本周期坚持得比较稳定。" : "先保持短时、可完成的节奏。",
        tone: completionRate >= 0.8 ? "positive" : "steady"
      },
      {
        label: "累计时长",
        value: `${Math.round(input.totalTrainingMinutes)} 分钟`,
        helperText: "按已保存训练记录统计。",
        tone: "steady"
      },
      {
        label: "完成任务",
        value: `${limitedTaskNames.length} 类`,
        helperText:
          limitedTaskNames.length > 0 ? limitedTaskNames.join("、") : "本周期暂无任务记录。",
        tone: "steady"
      }
    ],
    sections: [
      {
        id: "training_persistence",
        title: "训练坚持情况",
        headline: completionRate >= 0.8 ? "本周训练节奏保持得不错" : "本周先把训练节奏放轻一点",
        body: `计划 ${input.plannedSessionCount} 次，已完成 ${
          input.completedSessionCount
        } 次，累计约 ${Math.round(input.totalTrainingMinutes)} 分钟。`,
        items: [
          completionRate >= 0.8
            ? "保持规律训练本身就是重要进展。"
            : "少量、稳定地完成，比一次训练很久更合适。",
          input.trainingContextNote ?? "训练中可以随时暂停和休息。"
        ].map(sanitizePlainText),
        tone: completionRate >= 0.8 ? "positive" : "steady"
      },
      {
        id: "task_completion",
        title: "任务完成情况",
        headline:
          limitedTaskNames.length > 0 ? "这些任务已经有记录" : "本周期还没有可展示的任务记录",
        body: "这里只展示训练任务完成情况，不比较孩子之间的表现。",
        items:
          limitedTaskNames.length > 0
            ? limitedTaskNames.map(sanitizePlainText)
            : ["等待下次训练记录。"],
        tone: "steady"
      },
      {
        id: "positive_changes",
        title: "积极变化",
        headline:
          limitedPositiveSignals.length > 0 ? "可以看到一些积极的小变化" : "继续记录后再看变化",
        body: "这些内容来自训练记录中的趋势观察，用来帮助下次安排更合适的任务。",
        items:
          limitedPositiveSignals.length > 0
            ? limitedPositiveSignals.map(sanitizePlainText)
            : ["目前样本还少，先保持轻松稳定的训练节奏。"],
        tone: "positive"
      },
      {
        id: "next_suggestions",
        title: "下次建议",
        headline: "下次训练可以这样开始",
        body: "建议以孩子愿意参与、能完成为优先，训练中感觉累可以休息。",
        items: limitedNextSuggestions.map(sanitizePlainText),
        tone: "next"
      },
      {
        id: "data_sources",
        title: "数据来源说明",
        headline: "简报来自这些记录",
        body: "所有数据都按敏感训练数据处理，只展示家长需要理解的简化内容。",
        items: input.dataSources.map((source) =>
          sanitizePlainText(`${source.label}：${source.description}`)
        ),
        tone: "steady"
      }
    ],
    exampleCopy: buildExampleCopy(
      input,
      summaryText,
      limitedPositiveSignals,
      limitedNextSuggestions
    ),
    dataSources: input.dataSources.map((source) => ({
      label: sanitizePlainText(source.label),
      description: sanitizePlainText(source.description)
    }))
  };
}

function buildSummaryText(input: ParentTrainingBriefInput, completionRate: number): string {
  const persistenceText =
    completionRate >= 0.8 ? "训练坚持情况比较稳定" : "训练节奏可以再放轻一点，先保证能完成";
  return sanitizePlainText(
    `${input.periodLabel}，${input.traineeDisplayName}${persistenceText}，完成 ${
      input.completedSessionCount
    } 次训练，累计约 ${Math.round(input.totalTrainingMinutes)} 分钟。`
  );
}

function buildExampleCopy(
  input: ParentTrainingBriefInput,
  summaryText: string,
  positiveSignals: string[],
  nextSuggestions: string[]
): string[] {
  return [
    summaryText,
    positiveSignals[0] ?? "本周期记录还不多，先保持轻松稳定的训练节奏。",
    nextSuggestions[0] ?? "下次训练前先确认状态舒适，再开始短时任务。",
    `${input.traineeDisplayName}愿意完成训练和按需要休息，都是值得鼓励的表现。`
  ].map(sanitizePlainText);
}

function validateInput(input: ParentTrainingBriefInput): void {
  requireNonEmpty(input.traineeDisplayName, "traineeDisplayName is required.");
  requireNonEmpty(input.periodLabel, "periodLabel is required.");
  requireNonEmpty(input.generatedAtLabel, "generatedAtLabel is required.");
  requireNonNegativeInteger(input.plannedSessionCount, "plannedSessionCount");
  requireNonNegativeInteger(input.completedSessionCount, "completedSessionCount");
  requireNonNegative(input.totalTrainingMinutes, "totalTrainingMinutes");
  if (input.completedSessionCount > input.plannedSessionCount && input.plannedSessionCount > 0) {
    throw new ParentTrainingBriefModelError(
      "completedSessionCount cannot exceed plannedSessionCount."
    );
  }
  if (input.dataSources.length === 0) {
    throw new ParentTrainingBriefModelError("At least one data source is required.");
  }
}

function sanitizePlainText(value: string): string {
  return value
    .trim()
    .replaceAll("确诊", "状态确认")
    .replaceAll("诊断", "状态记录")
    .replaceAll("治愈", "持续改善")
    .replaceAll("疗效保证", "训练结果保证表述")
    .replaceAll("疗效", "训练变化")
    .replaceAll("脑电功率", "设备状态")
    .replaceAll("artifact", "信号波动");
}

function requireNonEmpty(value: string, message: string): void {
  if (value.trim().length === 0) {
    throw new ParentTrainingBriefModelError(message);
  }
}

function requireNonNegative(value: number, fieldName: string): void {
  requireFiniteNumber(value, fieldName);
  if (value < 0) {
    throw new ParentTrainingBriefModelError(`${fieldName} must be non-negative.`);
  }
}

function requireNonNegativeInteger(value: number, fieldName: string): void {
  requireNonNegative(value, fieldName);
  if (!Number.isInteger(value)) {
    throw new ParentTrainingBriefModelError(`${fieldName} must be an integer.`);
  }
}

function requireFiniteNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new ParentTrainingBriefModelError(`${fieldName} must be finite.`);
  }
}
