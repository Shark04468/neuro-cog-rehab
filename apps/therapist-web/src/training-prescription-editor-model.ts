import {
  canPrincipalAccessWorkspaceUser,
  TherapistWorkspaceAccessError,
  type TherapistWorkspacePrincipal,
  type TherapistWorkspaceUser
} from "./therapist-workspace-model.js";

export type PrescriptionTrainingModule =
  | "music_therapy"
  | "attention_game"
  | "go_nogo_game"
  | "rhythm_navigation";

export type PrescriptionMusicType =
  | "focus"
  | "relax"
  | "rhythm"
  | "nature"
  | "white_noise"
  | "custom";

export type PrescriptionDifficulty = "light" | "standard" | "advanced";

export type PrescriptionRiskReminderKey =
  | "signal_unstable"
  | "fatigue_rising"
  | "user_discomfort"
  | "daily_limit"
  | "photosensitive_caution";

export interface TrainingPrescriptionDraft {
  userId: string;
  weeklySessionCount: number;
  sessionDurationMinutes: number;
  moduleCombination: PrescriptionTrainingModule[];
  musicType: PrescriptionMusicType;
  initialDifficulty: PrescriptionDifficulty;
  adaptiveAdjustmentEnabled: boolean;
  dailyMaxTrainingMinutes: number;
  riskReminderKeys: PrescriptionRiskReminderKey[];
  therapistNote: string;
}

export interface SavedTrainingPrescription extends TrainingPrescriptionDraft {
  id: string;
  therapistId: string;
  organizationId: string;
  status: "active";
  version: number;
  updatedAt: string;
}

export interface TrainingPrescriptionOperationLog {
  id: string;
  action: "training_prescription_saved";
  actorUserId: string;
  therapistId: string;
  organizationId: string;
  userId: string;
  occurredAt: string;
  message: string;
  beforeSummary: string;
  afterSummary: string;
  dataSensitivity: "sensitive";
}

export interface TrainingPrescriptionValidationIssue {
  field: keyof TrainingPrescriptionDraft | "permission";
  message: string;
}

export interface PrescriptionOption<TValue extends string> {
  value: TValue;
  label: string;
  helperText: string;
}

export interface PrescriptionPreviewTask {
  moduleType: PrescriptionTrainingModule;
  title: string;
  durationMinutes: number;
  difficultyLabel: string;
  userFacingNote: string;
}

export interface TrainingPrescriptionEditorViewModel {
  userId: string;
  displayName: string;
  ageRange: string;
  draft: TrainingPrescriptionDraft;
  moduleOptions: Array<PrescriptionOption<PrescriptionTrainingModule>>;
  musicTypeOptions: Array<PrescriptionOption<PrescriptionMusicType>>;
  difficultyOptions: Array<PrescriptionOption<PrescriptionDifficulty>>;
  riskReminderOptions: Array<PrescriptionOption<PrescriptionRiskReminderKey>>;
  previewTasks: PrescriptionPreviewTask[];
  scopeNotice: string;
}

export interface TrainingPrescriptionSaveResult {
  prescription: SavedTrainingPrescription;
  operationLog: TrainingPrescriptionOperationLog;
}

export class TrainingPrescriptionEditorValidationError extends Error {
  public constructor(public readonly issues: TrainingPrescriptionValidationIssue[]) {
    super("Training prescription draft is invalid.");
    this.name = "TrainingPrescriptionEditorValidationError";
  }
}

const MODULE_ORDER: PrescriptionTrainingModule[] = [
  "music_therapy",
  "attention_game",
  "go_nogo_game",
  "rhythm_navigation"
];

export const PRESCRIPTION_MODULE_LABELS: Record<PrescriptionTrainingModule, string> = {
  music_therapy: "音乐放松",
  attention_game: "注意力训练",
  go_nogo_game: "Go/No-Go 点击练习",
  rhythm_navigation: "节律导航"
};

export const PRESCRIPTION_MUSIC_TYPE_LABELS: Record<PrescriptionMusicType, string> = {
  focus: "注意唤醒",
  relax: "放松恢复",
  rhythm: "节律训练",
  nature: "自然声",
  white_noise: "白噪声",
  custom: "个体化音乐"
};

export const PRESCRIPTION_DIFFICULTY_LABELS: Record<PrescriptionDifficulty, string> = {
  light: "轻量",
  standard: "标准",
  advanced: "进阶"
};

export const PRESCRIPTION_RISK_REMINDER_LABELS: Record<PrescriptionRiskReminderKey, string> = {
  signal_unstable: "EEG 信号不稳定时先暂停并调整佩戴",
  fatigue_rising: "疲劳趋势升高时缩短任务或切换放松音乐",
  user_discomfort: "用户主动反馈不适时立即停止本轮训练",
  daily_limit: "达到每日建议时长后不再追加训练",
  photosensitive_caution: "避免强闪烁或快速高对比刺激"
};

export function buildTrainingPrescriptionEditorViewModel(input: {
  principal: TherapistWorkspacePrincipal;
  users: TherapistWorkspaceUser[];
  userId: string;
  existingPrescription: SavedTrainingPrescription | null;
}): TrainingPrescriptionEditorViewModel {
  const user = findEditableWorkspaceUser(input.principal, input.users, input.userId);
  const draft = input.existingPrescription
    ? toDraft(input.existingPrescription)
    : createDefaultTrainingPrescriptionDraft(user);

  return {
    userId: user.id,
    displayName: user.displayName,
    ageRange: user.ageRange,
    draft,
    moduleOptions: MODULE_ORDER.map((moduleType) => ({
      value: moduleType,
      label: PRESCRIPTION_MODULE_LABELS[moduleType],
      helperText: moduleHelperText(moduleType)
    })),
    musicTypeOptions: (
      [
        "relax",
        "nature",
        "focus",
        "rhythm",
        "white_noise",
        "custom"
      ] satisfies PrescriptionMusicType[]
    ).map((musicType) => ({
      value: musicType,
      label: PRESCRIPTION_MUSIC_TYPE_LABELS[musicType],
      helperText: musicTypeHelperText(musicType)
    })),
    difficultyOptions: (["light", "standard", "advanced"] satisfies PrescriptionDifficulty[]).map(
      (difficulty) => ({
        value: difficulty,
        label: PRESCRIPTION_DIFFICULTY_LABELS[difficulty],
        helperText: difficultyHelperText(difficulty)
      })
    ),
    riskReminderOptions: (
      [
        "signal_unstable",
        "fatigue_rising",
        "user_discomfort",
        "daily_limit",
        "photosensitive_caution"
      ] satisfies PrescriptionRiskReminderKey[]
    ).map((riskKey) => ({
      value: riskKey,
      label: PRESCRIPTION_RISK_REMINDER_LABELS[riskKey],
      helperText: riskReminderHelperText(riskKey)
    })),
    previewTasks: buildPrescriptionPreviewTasks(draft),
    scopeNotice: "当前内容仅用于辅助训练安排、训练记录和趋势观察。"
  };
}

export function createDefaultTrainingPrescriptionDraft(
  user: TherapistWorkspaceUser
): TrainingPrescriptionDraft {
  const isLowLoadPreferred =
    user.trainingStatus === "paused" ||
    user.riskReminder.level === "needs_review" ||
    user.riskReminder.category === "fatigue_trend";
  const mappedModules = user.todayPlan.moduleNames
    .map(moduleFromWorkspaceName)
    .filter((moduleType): moduleType is PrescriptionTrainingModule => moduleType !== null);
  const moduleCombination =
    uniqueModules(mappedModules).length > 0
      ? uniqueModules(mappedModules)
      : (["music_therapy", "attention_game"] satisfies PrescriptionTrainingModule[]);
  const riskReminderKeys: PrescriptionRiskReminderKey[] = [
    "signal_unstable",
    "user_discomfort",
    "daily_limit",
    "photosensitive_caution"
  ];

  if (isLowLoadPreferred) {
    riskReminderKeys.splice(1, 0, "fatigue_rising");
  }

  return {
    userId: user.id,
    weeklySessionCount: isLowLoadPreferred ? 2 : 3,
    sessionDurationMinutes: isLowLoadPreferred ? 12 : 15,
    moduleCombination,
    musicType: isLowLoadPreferred ? "relax" : "nature",
    initialDifficulty: "light",
    adaptiveAdjustmentEnabled: true,
    dailyMaxTrainingMinutes: isLowLoadPreferred ? 24 : 30,
    riskReminderKeys,
    therapistNote: "先保持短时、低干扰安排，训练中可随时暂停休息。"
  };
}

export function validateTrainingPrescriptionDraft(input: {
  principal: TherapistWorkspacePrincipal;
  users: TherapistWorkspaceUser[];
  draft: TrainingPrescriptionDraft;
}): TrainingPrescriptionValidationIssue[] {
  findEditableWorkspaceUser(input.principal, input.users, input.draft.userId);

  const draft = normalizeTrainingPrescriptionDraft(input.draft);
  const issues: TrainingPrescriptionValidationIssue[] = [];

  if (!Number.isInteger(draft.weeklySessionCount) || draft.weeklySessionCount < 1) {
    issues.push({ field: "weeklySessionCount", message: "每周训练次数至少为 1 次。" });
  }
  if (draft.weeklySessionCount > 5) {
    issues.push({ field: "weeklySessionCount", message: "每周训练次数不建议超过 5 次。" });
  }
  if (!Number.isInteger(draft.sessionDurationMinutes) || draft.sessionDurationMinutes < 5) {
    issues.push({ field: "sessionDurationMinutes", message: "单次训练时长至少为 5 分钟。" });
  }
  if (draft.sessionDurationMinutes > 30) {
    issues.push({ field: "sessionDurationMinutes", message: "单次训练时长不建议超过 30 分钟。" });
  }
  if (draft.moduleCombination.length === 0) {
    issues.push({ field: "moduleCombination", message: "请至少选择 1 个训练模块。" });
  }
  if (!Number.isInteger(draft.dailyMaxTrainingMinutes) || draft.dailyMaxTrainingMinutes < 10) {
    issues.push({ field: "dailyMaxTrainingMinutes", message: "每日最大训练时长至少为 10 分钟。" });
  }
  if (draft.dailyMaxTrainingMinutes > 45) {
    issues.push({
      field: "dailyMaxTrainingMinutes",
      message: "每日最大训练时长不建议超过 45 分钟。"
    });
  }
  if (draft.dailyMaxTrainingMinutes < draft.sessionDurationMinutes) {
    issues.push({
      field: "dailyMaxTrainingMinutes",
      message: "每日最大训练时长不能小于单次训练时长。"
    });
  }
  if (draft.riskReminderKeys.length === 0) {
    issues.push({ field: "riskReminderKeys", message: "请至少保留 1 条训练安全提醒。" });
  }
  if (draft.therapistNote.length > 240) {
    issues.push({ field: "therapistNote", message: "治疗师备注请控制在 240 字以内。" });
  }

  return issues;
}

export function saveTrainingPrescriptionDraft(input: {
  principal: TherapistWorkspacePrincipal;
  users: TherapistWorkspaceUser[];
  draft: TrainingPrescriptionDraft;
  previousPrescription: SavedTrainingPrescription | null;
  savedAt?: string;
}): TrainingPrescriptionSaveResult {
  const user = findEditableWorkspaceUser(input.principal, input.users, input.draft.userId);
  const issues = validateTrainingPrescriptionDraft({
    principal: input.principal,
    users: input.users,
    draft: input.draft
  });

  if (issues.length > 0) {
    throw new TrainingPrescriptionEditorValidationError(issues);
  }

  const normalizedDraft = normalizeTrainingPrescriptionDraft(input.draft);
  const updatedAt = input.savedAt ?? new Date().toISOString();
  const previousVersion = input.previousPrescription?.version ?? 0;
  const prescription: SavedTrainingPrescription = {
    ...normalizedDraft,
    id: input.previousPrescription?.id ?? `prescription-${user.id}`,
    therapistId: input.principal.therapistId,
    organizationId: user.organizationId,
    status: "active",
    version: previousVersion + 1,
    updatedAt
  };
  const operationLog: TrainingPrescriptionOperationLog = {
    id: `audit-${prescription.id}-${prescription.version}`,
    action: "training_prescription_saved",
    actorUserId: input.principal.userId,
    therapistId: input.principal.therapistId,
    organizationId: user.organizationId,
    userId: user.id,
    occurredAt: updatedAt,
    message: `已保存 ${user.displayName} 的辅助训练安排：每周 ${prescription.weeklySessionCount} 次，每次 ${prescription.sessionDurationMinutes} 分钟。`,
    beforeSummary: input.previousPrescription
      ? summarizePrescription(input.previousPrescription)
      : "首次创建辅助训练安排。",
    afterSummary: summarizePrescription(prescription),
    dataSensitivity: "sensitive"
  };

  return { prescription, operationLog };
}

export function applySavedPrescriptionToWorkspaceUsers(
  users: TherapistWorkspaceUser[],
  prescription: SavedTrainingPrescription
): TherapistWorkspaceUser[] {
  return users.map((user) => {
    if (user.id !== prescription.userId) {
      return user;
    }

    return {
      ...user,
      trainingStatus: user.trainingStatus === "no_plan" ? "scheduled_today" : user.trainingStatus,
      todayPlan: {
        moduleNames: prescription.moduleCombination.map(
          (moduleType) => PRESCRIPTION_MODULE_LABELS[moduleType]
        ),
        plannedMinutes: prescription.sessionDurationMinutes,
        prescriptionStatus: "ready"
      }
    };
  });
}

export function buildPrescriptionPreviewTasks(
  draft: TrainingPrescriptionDraft
): PrescriptionPreviewTask[] {
  const normalizedDraft = normalizeTrainingPrescriptionDraft(draft);
  if (normalizedDraft.moduleCombination.length === 0) {
    return [];
  }

  const baseDuration = Math.max(
    4,
    Math.floor(normalizedDraft.sessionDurationMinutes / normalizedDraft.moduleCombination.length)
  );
  let remainingMinutes =
    normalizedDraft.sessionDurationMinutes -
    baseDuration * normalizedDraft.moduleCombination.length;

  return normalizedDraft.moduleCombination.map((moduleType, index) => {
    const extraMinute = remainingMinutes > 0 ? 1 : 0;
    remainingMinutes -= extraMinute;

    return {
      moduleType,
      title: PRESCRIPTION_MODULE_LABELS[moduleType],
      durationMinutes: baseDuration + extraMinute,
      difficultyLabel: PRESCRIPTION_DIFFICULTY_LABELS[normalizedDraft.initialDifficulty],
      userFacingNote:
        index === 0 ? "先从轻量节奏开始，过程中可以暂停休息。" : "按提示完成即可，不需要追求很快。"
    };
  });
}

export function normalizeTrainingPrescriptionDraft(
  draft: TrainingPrescriptionDraft
): TrainingPrescriptionDraft {
  return {
    ...draft,
    weeklySessionCount: Math.trunc(draft.weeklySessionCount),
    sessionDurationMinutes: Math.trunc(draft.sessionDurationMinutes),
    moduleCombination: uniqueModules(draft.moduleCombination),
    dailyMaxTrainingMinutes: Math.trunc(draft.dailyMaxTrainingMinutes),
    riskReminderKeys: uniqueRiskReminderKeys(draft.riskReminderKeys),
    therapistNote: draft.therapistNote.trim()
  };
}

function findEditableWorkspaceUser(
  principal: TherapistWorkspacePrincipal,
  users: TherapistWorkspaceUser[],
  userId: string
): TherapistWorkspaceUser {
  const user = users.find((candidate) => candidate.id === userId);
  if (!user || !canPrincipalAccessWorkspaceUser(principal, user)) {
    throw new TherapistWorkspaceAccessError("Current principal cannot edit this training user.");
  }

  return user;
}

function toDraft(prescription: SavedTrainingPrescription): TrainingPrescriptionDraft {
  return {
    userId: prescription.userId,
    weeklySessionCount: prescription.weeklySessionCount,
    sessionDurationMinutes: prescription.sessionDurationMinutes,
    moduleCombination: prescription.moduleCombination,
    musicType: prescription.musicType,
    initialDifficulty: prescription.initialDifficulty,
    adaptiveAdjustmentEnabled: prescription.adaptiveAdjustmentEnabled,
    dailyMaxTrainingMinutes: prescription.dailyMaxTrainingMinutes,
    riskReminderKeys: prescription.riskReminderKeys,
    therapistNote: prescription.therapistNote
  };
}

function uniqueModules(modules: PrescriptionTrainingModule[]): PrescriptionTrainingModule[] {
  return MODULE_ORDER.filter((moduleType) => modules.includes(moduleType));
}

function uniqueRiskReminderKeys(
  keys: PrescriptionRiskReminderKey[]
): PrescriptionRiskReminderKey[] {
  const order: PrescriptionRiskReminderKey[] = [
    "signal_unstable",
    "fatigue_rising",
    "user_discomfort",
    "daily_limit",
    "photosensitive_caution"
  ];

  return order.filter((key) => keys.includes(key));
}

function moduleFromWorkspaceName(moduleName: string): PrescriptionTrainingModule | null {
  if (moduleName.includes("音乐")) {
    return "music_therapy";
  }
  if (moduleName.includes("Go/No-Go")) {
    return "go_nogo_game";
  }
  if (moduleName.includes("节律")) {
    return "rhythm_navigation";
  }
  if (moduleName.includes("注意") || moduleName.includes("目标探测")) {
    return "attention_game";
  }

  return null;
}

function summarizePrescription(prescription: SavedTrainingPrescription): string {
  const modules = prescription.moduleCombination.map(
    (moduleType) => PRESCRIPTION_MODULE_LABELS[moduleType]
  );

  return `每周 ${prescription.weeklySessionCount} 次，每次 ${prescription.sessionDurationMinutes} 分钟，模块：${modules.join(" / ")}，难度：${PRESCRIPTION_DIFFICULTY_LABELS[prescription.initialDifficulty]}。`;
}

function moduleHelperText(moduleType: PrescriptionTrainingModule): string {
  switch (moduleType) {
    case "music_therapy":
      return "用于训练前准备、训练间休息或训练后恢复。";
    case "attention_game":
      return "用于短时观察、目标探测和持续注意练习。";
    case "go_nogo_game":
      return "用于按规则点击和等待提示的练习。";
    case "rhythm_navigation":
      return "用于路线记忆、节奏同步和规则切换练习。";
  }
}

function musicTypeHelperText(musicType: PrescriptionMusicType): string {
  switch (musicType) {
    case "focus":
      return "适合训练前轻度唤醒，音量保持舒适。";
    case "relax":
      return "适合疲劳或紧张时的短时恢复。";
    case "rhythm":
      return "适合节奏同步任务前的准备。";
    case "nature":
      return "适合多数用户的低干扰背景声。";
    case "white_noise":
      return "适合短时使用，需观察用户主观感受。";
    case "custom":
      return "由治疗师结合用户偏好选择。";
  }
}

function difficultyHelperText(difficulty: PrescriptionDifficulty): string {
  switch (difficulty) {
    case "light":
      return "保守起点，目标更少，节奏更慢。";
    case "standard":
      return "适合已熟悉流程的稳定训练。";
    case "advanced":
      return "仅用于状态稳定且治疗师明确安排时。";
  }
}

function riskReminderHelperText(riskKey: PrescriptionRiskReminderKey): string {
  switch (riskKey) {
    case "signal_unstable":
      return "用于减少低质量 EEG 数据对训练判断的影响。";
    case "fatigue_rising":
      return "用于控制训练负荷和保留休息。";
    case "user_discomfort":
      return "用于优先响应用户主观感受。";
    case "daily_limit":
      return "用于防止单日训练时间过长。";
    case "photosensitive_caution":
      return "用于避免不适合儿童青少年的刺激呈现。";
  }
}
