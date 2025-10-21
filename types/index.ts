// --- GLOBAL TYPES ---
export type ScreenName = "Timer" | "Notes" | "Flashcards" | "Tasks" | "Profile";

export type SoundPreset = "Chime (Default)" | "Bell Tone" | "Zen Gong" | "Digital Alarm";

export interface Subject {
  id: string;
  name: string;
  color: string; // hex color code
  icon: string; // emoji or icon name
  createdAt: number;
  userId: string;
}

export interface Task {
  id: string;
  title: string;
  duration: number; // in minutes
  createdAt: number;
  completedAt?: number;
  abandonedAt?: number;
  status: "active" | "completed" | "pending" | "abandoned";
  userId: string;
  subjectId?: string; // optional subject assignment
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
  subjectId?: string; // optional subject assignment
  doodleData?: string; // JSON string of drawing paths
}

// --- ACHIEVEMENT TYPES ---
export enum AchievementType {
  STREAK = "streak",
  FOCUS_TIME = "focus_time",
  TASKS_COMPLETED = "tasks_completed"
}

export interface Achievement {
  id: string;
  type: AchievementType;
  name: string;
  description: string;
  imageFile: string; // filename of the badge image in assets folder
  unlockedAt?: any; // timestamp when achieved (can be number or Firebase FieldValue)
  userId: string;
}

export interface UserAchievement {
  achievementId: string;
  unlockedAt: number; // timestamp
  userId: string;
}
