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
