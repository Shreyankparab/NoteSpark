// --- GLOBAL TYPES ---
export type ScreenName = "Timer" | "Notes" | "Flashcards" | "Tasks";

export type SoundPreset = "Chime (Default)" | "Bell Tone" | "Zen Gong" | "Digital Alarm";

export interface Task {
  id: string;
  title: string;
  duration: number; // in minutes
  createdAt: number;
  completedAt?: number;
  status: "active" | "completed" | "pending";
  userId: string;
}

export interface UserSettings {
  duration: number;
  isSoundOn: boolean;
  isVibrationOn: boolean;
  selectedSound: SoundPreset;
}

export interface PomodoroNote {
  id: string;
  taskTitle: string;
  duration: number; // in minutes
  notes: string;
  completedAt: number; // timestamp
  userId: string;
  imageUrl?: string;
}
