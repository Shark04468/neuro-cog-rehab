import type {
  HomeRecommendedMusic,
  HomeTrainingTaskType,
  TherapistConfiguredTask,
  TherapistHomeConfig
} from "./home-model.js";

export type UserPrescriptionModule =
  | "music_therapy"
  | "attention_game"
  | "go_nogo_game"
  | "rhythm_navigation";

export type UserPrescriptionMusicType =
  | "focus"
  | "relax"
  | "rhythm"
  | "nature"
  | "white_noise"
  | "custom";

export type UserPrescriptionDifficulty = "light" | "standard" | "advanced";

export interface ActiveTrainingPrescriptionForHome {
  id: string;
  userId: string;
  traineeDisplayName: string;
  weeklySessionCount: number;
  sessionDurationMinutes: number;
  moduleCombination: UserPrescriptionModule[];
  musicType: UserPrescriptionMusicType;
  initialDifficulty: UserPrescriptionDifficulty;
  adaptiveAdjustmentEnabled: boolean;
  dailyMaxTrainingMinutes: number;
  therapistNote: string;
  updatedAt: string;
}

export type PrescriptionHomeBaseState = Omit<
  TherapistHomeConfig,
  "traineeDisplayName" | "todayTasks" | "recommendedMusic" | "dailyTrainingLimitMinutes"
>;

export class PrescriptionHomeConfigError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PrescriptionHomeConfigError";
  }
}

export const mockActiveTrainingPrescriptionForHome: ActiveTrainingPrescriptionForHome = {
  id: "prescription-trainee-lin-001",
  userId: "trainee-lin-001",
  traineeDisplayName: "小林",
  weeklySessionCount: 3,
  sessionDurationMinutes: 15,
  moduleCombination: ["music_therapy", "attention_game", "rhythm_navigation"],
  musicType: "nature",
  initialDifficulty: "light",
  adaptiveAdjustmentEnabled: true,
  dailyMaxTrainingMinutes: 30,
  therapistNote: "先从轻量任务开始，训练中感觉累了可以暂停休息。",
  updatedAt: "2026-06-16T00:00:00.000Z"
};

export function buildHomeConfigFromPrescription(input: {
  prescription: ActiveTrainingPrescriptionForHome;
  baseState: PrescriptionHomeBaseState;
}): TherapistHomeConfig {
  validateActivePrescription(input.prescription);

  return {
    ...input.baseState,
    traineeDisplayName: input.prescription.traineeDisplayName,
    dailyTrainingLimitMinutes: input.prescription.dailyMaxTrainingMinutes,
    recommendedMusic: buildRecommendedMusic(input.prescription),
    todayTasks: buildTasksFromPrescription(input.prescription)
  };
}

function validateActivePrescription(prescription: ActiveTrainingPrescriptionForHome): void {
  if (prescription.traineeDisplayName.trim().length === 0) {
    throw new PrescriptionHomeConfigError("traineeDisplayName is required.");
  }
  if (prescription.sessionDurationMinutes <= 0) {
    throw new PrescriptionHomeConfigError("sessionDurationMinutes must be positive.");
  }
  if (prescription.dailyMaxTrainingMinutes < prescription.sessionDurationMinutes) {
    throw new PrescriptionHomeConfigError(
      "dailyMaxTrainingMinutes must cover at least one planned session."
    );
  }
  if (prescription.moduleCombination.length === 0) {
    throw new PrescriptionHomeConfigError("moduleCombination must include at least one module.");
  }
}

function buildTasksFromPrescription(
  prescription: ActiveTrainingPrescriptionForHome
): TherapistConfiguredTask[] {
  const baseDuration = Math.max(
    4,
    Math.floor(prescription.sessionDurationMinutes / prescription.moduleCombination.length)
  );
  const primaryIndex = Math.max(
    0,
    prescription.moduleCombination.findIndex((moduleType) => moduleType !== "music_therapy")
  );
  let remainingMinutes =
    prescription.sessionDurationMinutes - baseDuration * prescription.moduleCombination.length;

  return prescription.moduleCombination.map((moduleType, index) => {
    const extraMinute = remainingMinutes > 0 ? 1 : 0;
    remainingMinutes -= extraMinute;
    const meta = moduleTaskMeta(moduleType);

    return {
      id: `${prescription.id}-${moduleType}-${index + 1}`,
      taskType: meta.taskType,
      title: meta.title,
      durationMinutes: baseDuration + extraMinute,
      difficultyLabel: difficultyLabel(prescription.initialDifficulty),
      focusArea: meta.focusArea,
      therapistNote:
        index === primaryIndex
          ? prescription.therapistNote
          : "按提示完成即可，过程中可以主动休息。",
      isPrimary: index === primaryIndex
    };
  });
}

function buildRecommendedMusic(
  prescription: ActiveTrainingPrescriptionForHome
): HomeRecommendedMusic {
  const meta = musicMeta(prescription.musicType);

  return {
    title: meta.title,
    scene: meta.scene,
    durationMinutes: Math.min(8, Math.max(5, Math.round(prescription.sessionDurationMinutes / 3))),
    intensityLabel: prescription.initialDifficulty === "advanced" ? "中等强度" : "低强度"
  };
}

function moduleTaskMeta(moduleType: UserPrescriptionModule): {
  taskType: HomeTrainingTaskType;
  title: string;
  focusArea: string;
} {
  switch (moduleType) {
    case "music_therapy":
      return {
        taskType: "music_therapy",
        title: "低强度音乐放松",
        focusArea: "训练前准备与训练后恢复"
      };
    case "attention_game":
      return {
        taskType: "attention_game",
        title: "目标探测短练习",
        focusArea: "持续观察与目标点击"
      };
    case "go_nogo_game":
      return {
        taskType: "go_nogo_game",
        title: "Go/No-Go 点击练习",
        focusArea: "看清颜色提示后再点击"
      };
    case "rhythm_navigation":
      return {
        taskType: "rhythm_navigation",
        title: "节律导航基础路线",
        focusArea: "记住路线、跟上节拍、按规则切换"
      };
  }
}

function musicMeta(musicType: UserPrescriptionMusicType): { title: string; scene: string } {
  switch (musicType) {
    case "focus":
      return { title: "轻唤醒节奏", scene: "训练前准备" };
    case "relax":
      return { title: "舒缓放松音乐", scene: "休息与训练后恢复" };
    case "rhythm":
      return { title: "柔和节拍音乐", scene: "节律任务前准备" };
    case "nature":
      return { title: "森林慢节奏", scene: "训练前准备与训练后放松" };
    case "white_noise":
      return { title: "轻柔白噪声", scene: "短时低干扰背景声" };
    case "custom":
      return { title: "个体化音乐", scene: "按治疗师选择使用" };
  }
}

function difficultyLabel(
  difficulty: UserPrescriptionDifficulty
): TherapistConfiguredTask["difficultyLabel"] {
  switch (difficulty) {
    case "light":
      return "轻量";
    case "standard":
      return "标准";
    case "advanced":
      return "进阶";
  }
}
