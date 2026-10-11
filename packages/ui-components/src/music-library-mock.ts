import type { MusicLibraryUser, MusicTrack } from "./music-library-types.js";

export const mockMusicTracks: MusicTrack[] = [
  {
    id: "music-focus-soft-pulse",
    title: "Soft Focus Pulse",
    duration: 240,
    bpm: 72,
    tags: ["focus", "rhythm"],
    intensityLevel: 2,
    recommendedScene: "训练前 3-5 分钟注意准备",
    contraindicationNote: "如对持续节拍感到不适，请选择更轻柔素材。",
    fileUrl: "https://assets.example.test/music/soft-focus-pulse.mp3"
  },
  {
    id: "music-relax-evening-breath",
    title: "Evening Breath",
    duration: 360,
    bpm: 58,
    tags: ["relax"],
    intensityLevel: 1,
    recommendedScene: "训练后放松恢复",
    contraindicationNote: "如用户表示困倦明显，可缩短使用时长。",
    fileUrl: "https://assets.example.test/music/evening-breath.mp3"
  },
  {
    id: "music-rhythm-step-guide",
    title: "Step Guide Rhythm",
    duration: 210,
    bpm: 96,
    tags: ["rhythm"],
    intensityLevel: 3,
    recommendedScene: "节律导航基础训练",
    contraindicationNote: "如节拍压力较大，请降低音量或改用低强度素材。",
    fileUrl: "https://assets.example.test/music/step-guide-rhythm.mp3"
  },
  {
    id: "music-nature-rain-room",
    title: "Rain Room",
    duration: 420,
    bpm: null,
    tags: ["nature", "relax"],
    intensityLevel: 1,
    recommendedScene: "安静任务间歇或冷静过渡",
    contraindicationNote: "如用户不喜欢雨声，可替换为其他自然声。",
    fileUrl: "https://assets.example.test/music/rain-room.mp3"
  },
  {
    id: "music-white-noise-calm-band",
    title: "Calm Noise Band",
    duration: 300,
    bpm: null,
    tags: ["white_noise"],
    intensityLevel: 2,
    recommendedScene: "低干扰背景遮蔽",
    contraindicationNote: "如用户对持续噪声敏感，请不要使用。",
    fileUrl: "https://assets.example.test/music/calm-noise-band.mp3"
  },
  {
    id: "music-custom-familiar-route",
    title: "Familiar Route",
    duration: 260,
    bpm: 80,
    tags: ["custom", "focus"],
    intensityLevel: 2,
    recommendedScene: "个体化偏好素材试用",
    contraindicationNote: "使用前请确认用户和监护人接受该素材。",
    fileUrl: "https://assets.example.test/music/familiar-route.mp3"
  }
];

export const mockMusicLibraryUsers: MusicLibraryUser[] = [
  {
    id: "trainee-chen-01",
    displayName: "晨晨",
    ageRange: "8-10",
    trainingGoal: "训练前注意准备和任务进入",
    soundSensitivityNote: "对持续噪声较敏感"
  },
  {
    id: "trainee-lin-02",
    displayName: "林林",
    ageRange: "11-13",
    trainingGoal: "节律同步和任务切换",
    soundSensitivityNote: "节拍过强时需要降低音量"
  },
  {
    id: "trainee-yu-03",
    displayName: "小予",
    ageRange: "14-16",
    trainingGoal: "训练后放松恢复",
    soundSensitivityNote: "偏好自然声"
  }
];
