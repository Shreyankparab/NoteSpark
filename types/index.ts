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

export interface SubSubject {
  id: string;
  name: string;
  subjectId: string; // Parent subject ID
  icon?: string; // Optional emoji or icon
  color?: string; // Optional color (inherits from parent if not set)
  userId: string;
  createdAt: number;
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
  subSubjectId?: string; // optional sub-subject (topic/chapter) assignment
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
  subSubjectId?: string; // optional sub-subject (topic/chapter) assignment
  doodleData?: string; // JSON string of drawing paths
  imageDrawings?: string; // JSON string of map { [url]: drawingData }
  breakDuration?: number; // accumulated break duration in minutes
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
  imageFile: any; // Can be number (require) or string (URI/path)
  imagePath?: string; // String path for DB storage (e.g. "assets/foo.jpg")
  unlockedAt?: any; // timestamp when achieved (can be number or Firebase FieldValue)
  userId: string;
  isClaimed?: boolean;
  claimedAt?: any; // timestamp when claimed
}

export interface UserAchievement {
  achievementId: string;
  unlockedAt: number; // timestamp
  userId: string;
}
