import { Dimensions } from "react-native";
import { SoundPreset } from "../types";

// --- GLOBAL CONSTANTS ---
export const SCREEN_HEIGHT = Dimensions.get("window").height;
export const AUTH_MODAL_HEIGHT = SCREEN_HEIGHT * 0.6;

// --- Helper: Timer Storage Keys ---
export const TIMER_END_TIME_KEY = "@pomodoro_end_time";
export const TIMER_STATUS_KEY = "@pomodoro_status";
export const SETTINGS_KEY = "@user_settings";
export const PERSISTENT_NOTIFICATION_ID = "timer-notification-id";

// --- Constants: Sound Presets ---
export const SOUND_PRESETS: SoundPreset[] = [
  "Chime (Default)",
  "Bell Tone",
  "Zen Gong",
  "Digital Alarm",
];

// ⭐ LOCAL SOUND MAP
export const SOUND_MAP: Record<SoundPreset, any> = {
  "Chime (Default)": require("../assets/sounds/chime.mp3"),
  "Bell Tone": require("../assets/sounds/bell.mp3"),
  "Zen Gong": require("../assets/sounds/gong.mp3"),
  "Digital Alarm": require("../assets/sounds/alarm.mp3"),
};

// Timer circle constants
export const TIMER_SIZE = 256;
export const BORDER_WIDTH = 8;
export const PROGRESS_BORDER_WIDTH = BORDER_WIDTH * 2;
export const HALF_SIZE = TIMER_SIZE / 2;

// --- White Noise Constants ---
export type WhiteNoiseType = 
  | "None"
  | "Rain"
  | "Ocean Waves"
  | "Forest"
  | "Coffee Shop"
  | "Fireplace"
  | "Brown Noise"
  | "Pink Noise"
  | "White Noise";

export const WHITE_NOISE_PRESETS: WhiteNoiseType[] = [
  "None",
  "Rain",
  "Ocean Waves", 
  "Forest",
  "Coffee Shop",
  "Fireplace",
  "Brown Noise",
  "Pink Noise",
  "White Noise",
];

export const WHITE_NOISE_DESCRIPTIONS: Record<WhiteNoiseType, string> = {
  "None": "No background sound",
  "Rain": "Gentle rainfall sounds",
  "Ocean Waves": "Calming ocean waves",
  "Forest": "Birds and nature sounds",
  "Coffee Shop": "Ambient cafe atmosphere",
  "Fireplace": "Crackling fire sounds",
  "Brown Noise": "Deep, low-frequency noise",
  "Pink Noise": "Balanced frequency noise",
  "White Noise": "Classic white noise",
};

export const WHITE_NOISE_ICONS: Record<WhiteNoiseType, string> = {
  "None": "volume-mute",
  "Rain": "rainy",
  "Ocean Waves": "water",
  "Forest": "leaf",
  "Coffee Shop": "cafe",
  "Fireplace": "flame",
  "Brown Noise": "radio",
  "Pink Noise": "pulse",
  "White Noise": "volume-high",
};

// Temporary sound map using existing audio files as placeholders
// In production, replace these with actual white noise audio files
export const WHITE_NOISE_SOUND_MAP: Record<WhiteNoiseType, any> = {
  "None": null,
  "Rain": require("../assets/sounds/rain.mp3"), 
  "Ocean Waves": require("../assets/sounds/ocean-waves.mp3"), 
  "Forest": require("../assets/sounds/forest.mp3"), 
  "Coffee Shop": require("../assets/sounds/coffee-shop.mp3"), 
  "Fireplace": require("../assets/sounds/fireplace.mp3"), 
  "Brown Noise": require("../assets/sounds/brown-noise.mp3"), 
  "Pink Noise": require("../assets/sounds/pink-noise.mp3"), 
  "White Noise": require("../assets/sounds/white-noise.mp3"), 
};
