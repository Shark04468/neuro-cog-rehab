export interface MvpTrainingUserMock {
  id: string;
  profileId: string;
  displayName: string;
  ageRange: string;
  guardianConsentAccepted: boolean;
  trainingGoal: string;
  createdAt: string;
}

export interface MvpPrescriptionMock {
  weeklySessionCount: number;
  sessionDurationMinutes: number;
  dailyMaxTrainingMinutes: number;
  musicType: "nature" | "relax" | "focus" | "rhythm" | "white_noise" | "custom";
  initialDifficulty: "light" | "standard" | "advanced";
  enabledModules: Array<"music_therapy" | "attention_game" | "go_nogo_game" | "rhythm_navigation">;
  therapistNote: string;
}

export interface MvpEegFrameMock {
  timestamp: string;
  attentionScore: number;
  relaxationScore: number;
  fatigueScore: number;
  signalQuality: number;
  artifactLevel: number;
}

export interface MvpE2eMockData {
  therapist: {
    accountId: string;
    displayName: string;
    organizationId: string;
  };
  trainee: MvpTrainingUserMock;
  prescription: MvpPrescriptionMock;
  eegSimulator: {
    connectionState: "connected";
    qualityLabel: "good";
    frames: MvpEegFrameMock[];
  };
  session: {
    expectedSavedStageCount: number;
    modules: string[];
  };
}

export const mvpE2eMock: MvpE2eMockData = {
  therapist: {
    accountId: "therapist-account-001",
    displayName: "陈老师",
    organizationId: "org-rehab-001"
  },
  trainee: {
    id: "trainee-lin-001",
    profileId: "profile-lin-001",
    displayName: "小林",
    ageRange: "10-12",
    guardianConsentAccepted: true,
    trainingGoal: "提升训练坚持度、注意稳定性和规则切换表现",
    createdAt: "2026-06-16T08:00:00.000Z"
  },
  prescription: {
    weeklySessionCount: 3,
    sessionDurationMinutes: 20,
    dailyMaxTrainingMinutes: 30,
    musicType: "nature",
    initialDifficulty: "light",
    enabledModules: ["music_therapy", "attention_game", "go_nogo_game", "rhythm_navigation"],
    therapistNote: "本周按轻量节奏完成任务，过程中可随时暂停休息。"
  },
  eegSimulator: {
    connectionState: "connected",
    qualityLabel: "good",
    // E2E only uses summary-like frames; raw EEG samples are not stored in the browser test.
    frames: [
      {
        timestamp: "2026-06-16T08:01:00.000Z",
        attentionScore: 65,
        relaxationScore: 55,
        fatigueScore: 32,
        signalQuality: 88,
        artifactLevel: 8
      },
      {
        timestamp: "2026-06-16T08:01:01.000Z",
        attentionScore: 67,
        relaxationScore: 56,
        fatigueScore: 33,
        signalQuality: 86,
        artifactLevel: 9
      },
      {
        timestamp: "2026-06-16T08:01:02.000Z",
        attentionScore: 66,
        relaxationScore: 58,
        fatigueScore: 34,
        signalQuality: 87,
        artifactLevel: 7
      }
    ]
  },
  session: {
    expectedSavedStageCount: 9,
    modules: ["音乐疗愈", "注意力训练", "Go/No-Go训练", "节律导航训练"]
  }
};

export function createMockTrainingUser(): MvpTrainingUserMock {
  return { ...mvpE2eMock.trainee };
}
