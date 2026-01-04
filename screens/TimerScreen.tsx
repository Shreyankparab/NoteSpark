import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  AppState,
  AppStateStatus,
  Vibration,
  FlatList,
  StyleSheet,
  Image,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { auth, db } from "../firebase/firebaseConfig";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  setDoc,
  getDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import {
  TIMER_END_TIME_KEY,
  TIMER_STATUS_KEY,
  SOUND_PRESETS,
  AUTH_MODAL_HEIGHT,
  WhiteNoiseType,
  WHITE_NOISE_PRESETS,
  WHITE_NOISE_SOUND_MAP,
} from "../constants";
import { SoundPreset, UserSettings, Task, Subject } from "../types";
import {
  scheduleTimerNotification,
  cancelTimerNotification,
  scheduleTimerCompletionNotification,
  cancelTimerCompletionNotification,
  areNotificationsAvailable,
  setupNotifications,
} from "../utils/notifications";
import {
  loadSettings,
  saveSettings,
  playCompletionSound,
} from "../utils";
import {
  checkStreakAchievements,
  checkFocusTimeAchievements,
} from "../utils/achievements";
import { showMultipleAchievementNotifications } from "../utils/achievementNotification";
import { signInWithGoogle, getGoogleSetupHelp } from "../utils/googleAuth";
import { DEFAULT_THEME, getThemeById } from "../constants/themes";
import TimerContent from "../components/TimerContent";
import NotesContent from "../components/NotesContent";
import TasksContent from "../components/TasksContent";
import PlaceholderContent from "../components/PlaceholderContent";
import ProfileModal from "../components/modals/ProfileModal";
import SettingsModal from "../components/modals/SettingsModal";
import TaskInputModal from "../components/modals/TaskInputModal";
import NotesModal from "../components/modals/NotesModal";
import ImageCaptureModal from "../components/modals/ImageCaptureModal";
import NavButton from "../components/NavButton";
import NetworkStatusBanner from "../components/NetworkStatusBanner";
import SubjectsScreen from "./SubjectsScreen";
import TimeTableModal from "../components/modals/TimeTableModal";
import AddCustomTaskModal from "../components/modals/AddCustomTaskModal";
import EditTaskModal from "../components/modals/EditTaskModal";
import FlipDeviceOverlay from "../components/FlipDeviceOverlay";
import WhiteNoiseModal from "../components/modals/WhiteNoiseModal";
// TimerConfigModal replaced by TaskInputModal
import BreakPromptModal from "../components/modals/BreakPromptModal";
import PostSessionModal from "../components/modals/PostSessionModal";

// Image Viewer Modal Component
const ImageViewerModal = ({
  visible,
  imageUrl,
  onClose,
}: {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.imageViewerContainer}>
        <TouchableOpacity
          style={styles.imageViewerCloseButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.imageErrorContainer}>
            <Ionicons name="image-outline" size={80} color="#fff" />
            <Text style={styles.imageErrorText}>Image not available</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

// Types
interface Note {
  id: string;
  title: string;
  content: string;
  createdAt?: number;
  updatedAt?: number;
  pinned?: boolean;
  userId: string;
  taskId?: string | null;
  duration?: number;
  imageUrl?: string;
}

import { User } from "firebase/auth";
import { Theme } from "../constants/themes";

type ScreenName = "Timer" | "Notes" | "Flashcards" | "Tasks";

// Helper functions
const toMillis = (val: any): number | undefined => {
  if (!val) return undefined;
  if (typeof val === "number") return val;
  if (typeof val.toMillis === "function") return val.toMillis();
  if (typeof val.toDate === "function") return val.toDate().getTime();
  return undefined;
};

const registerTimerTask = async () => {
  console.log("Background timer task registered.");
};

// Initial User Doc Creation
const createInitialUserDocument = async (userId: string, displayName?: string, phoneNumber?: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userData: any = {
      streak: 1,
      lastActive: serverTimestamp(),
      storageUsed: 0,
      storageLimit: 524288000 // 500MB default
    };

    if (displayName) userData.displayName = displayName;
    if (phoneNumber) userData.phoneNumber = phoneNumber;

    await setDoc(userRef, userData, { merge: true });
  } catch (error) {
    console.error("Failed to create user document:", error);
  }
};

const checkTaskAchievementsOnLoad = async (userId: string, completedTasksCount: number) => {
  try {
    const { checkTasksCompletedAchievements } = require("../utils/achievements");
    await checkTasksCompletedAchievements(userId, completedTasksCount);
    console.log(`✅ Checked task achievements on load: ${completedTasksCount} tasks completed`);
  } catch (error) {
    console.error("❌ Failed to check task achievements on load:", error);
  }
};

const getStreak = async (userId: string): Promise<number> => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    if (!userSnap.exists()) {
      // New user - initialize with 0 streak
      await setDoc(userRef, {
        streak: 0,
        lastActive: null,
        activeDays: [],
        streakStartDate: todayStr
      });
      return 0;
    }

    // Recalculate streak based on activeDays to ensure consistency
    // This fixes any previous double-counting bugs
    const data = userSnap.data();
    const lastActive = data?.lastActive?.toDate ? data.lastActive.toDate() : null;
    let streak = data?.streak || 0;
    let activeDays = (data?.activeDays || []) as string[];

    // If already active today, return current streak
    if (activeDays.includes(todayStr)) {
      return streak;
    }

    // Check if streak is broken
    if (lastActive) {
      const yesterday = new Date(today.getTime());
      yesterday.setDate(yesterday.getDate() - 1);
      const lastActiveDay = new Date(lastActive.getTime());
      lastActiveDay.setHours(0, 0, 0, 0);

      // If last active was before yesterday, streak is broken
      if (lastActiveDay.getTime() < yesterday.getTime()) {
        // Reset streak to 0 (will be set to 1 when task is completed)
        streak = 0;
        activeDays = [];

        await updateDoc(userRef, {
          streak: 0,
          activeDays: [],
          streakStartDate: todayStr
        });
      }
    }

    // Recalculate streak based on activeDays to ensure consistency
    // This fixes any previous double-counting bugs
    const uniqueDays = Array.from(new Set(activeDays)).sort();
    let calculatedStreak = 0;

    // Check backwards from today to find consecutive days
    const todayDate = new Date(today);
    let cursor = new Date(todayDate);

    // Loop to find streak
    while (true) {
      const cursorStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      if (uniqueDays.includes(cursorStr)) {
        calculatedStreak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        // If today is not active, we shouldn't count it for "current streak" UNLESS
        // the streak was valid up to yesterday.
        // But getStreak is called on login. If they haven't done a task today, 
        // the streak should display what they had yesterday (if valid).
        // However, the standard definition of "current streak" usually implies "days in a row ending today".
        // If I miss today, is my streak 0?
        // Usually, apps show the streak "at risk".

        // NoteSpark Logic:
        // If I logged in today but haven't done task:
        // Streak should be X (from yesterday).
        // If I miss today completely, tomorrow it becomes 0.

        // So: If calculatedStreak is 0 (meaning today is NOT in activeDays), 
        // we should check if yesterday starts the chain.
        if (calculatedStreak === 0) {
          const yesterday = new Date(todayDate);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

          if (uniqueDays.includes(yesterdayStr)) {
            // Streak implies consecutive days ending yesterday
            cursor = new Date(yesterday);
            // Let the next loop iteration start counting from yesterday
            continue;
          }
        }
        break;
      }
    }

    // Update if mismatch found (Self-Healing)
    if (calculatedStreak !== streak) {
      console.log(`Auto-fixing streak for ${userId}: was ${streak}, now ${calculatedStreak}`);
      await updateDoc(userRef, {
        streak: calculatedStreak,
        streakStartDate: data?.streakStartDate || todayStr // Keep original start date or default
      });
      return calculatedStreak;
    }

    return streak;
  } catch (error) {
    console.error("Streak error:", error);
    return 0;
  }
};


export default function TimerScreen() {
  // --- Timer State ---
  const DEFAULT_MINUTES = 25;
  const [initialTime, setInitialTime] = useState(DEFAULT_MINUTES * 60);
  const [seconds, setSeconds] = useState(initialTime);
  const [isActive, setIsActive] = useState(false);

  // Timer state management

  // --- Settings State ---
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [isVibrationOn, setIsVibrationOn] = useState(true);
  const [selectedSound, setSelectedSound] = useState<SoundPreset>(
    SOUND_PRESETS[0]
  );
  const [isFlipDeviceOn, setIsFlipDeviceOn] = useState(false);
  const [areControlsHidden, setAreControlsHidden] = useState(false);
  const [isDeviceFlipped, setIsDeviceFlipped] = useState(false);

  // --- UI/Auth State ---
  const [user, setUser] = useState<User | null>(null);
  const [activeScreen, setActiveScreen] = useState<ScreenName>("Timer");
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTaskInputModal, setShowTaskInputModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showWhiteNoiseModal, setShowWhiteNoiseModal] = useState(false);
  const [selectedWhiteNoise, setSelectedWhiteNoise] = useState<WhiteNoiseType>("None");
  const [whiteNoiseSound, setWhiteNoiseSound] = useState<Audio.Sound | null>(null);
  const [showSubjectsModal, setShowSubjectsModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>(DEFAULT_THEME);
  const [completionNotificationId, setCompletionNotificationId] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showTimeTableModal, setShowTimeTableModal] = useState(false);
  const [showAddCustomTaskModal, setShowAddCustomTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isEditForPlayAgain, setIsEditForPlayAgain] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [completedSession, setCompletedSession] = useState<{
    taskTitle: string;
    duration: number;
    completedAt: number;
    imageUrl?: string;
    subjectId?: string;
    subSubjectId?: string;
    breakDuration?: number;
  } | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [streak, setStreak] = useState(0);
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // --- Enhanced Pomodoro State ---
  const [timerMode, setTimerMode] = useState<"focus" | "break" | "idle">("idle");
  const [breakDuration, setBreakDuration] = useState(5 * 60); // Default 5 min
  const [isBreakEnabled, setIsBreakEnabled] = useState(false);
  const [showTimerConfigModal, setShowTimerConfigModal] = useState(false);
  const [showBreakPromptModal, setShowBreakPromptModal] = useState(false);
  const [showPostSessionModal, setShowPostSessionModal] = useState(false);

  // Store config for restarting session
  const [lastTimerConfig, setLastTimerConfig] = useState<{
    focusMinutes: number;
    breakMinutes: number | null;
  } | null>(null);

  // --- Session Accumulator State ---
  const [sessionFocusDuration, setSessionFocusDuration] = useState(0); // in minutes
  const [sessionBreakDuration, setSessionBreakDuration] = useState(0); // in minutes

  // --- Task State (from Firestore) ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // AppState ref
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // --- Calculated Progress ---
  const totalTime = initialTime;
  const progressPercentage = 100 - (seconds / totalTime) * 100;

  // Central function: read AsyncStorage and compute remaining time
  const checkAndRestoreTimer = async () => {
    try {
      const endTimeString = await AsyncStorage.getItem(TIMER_END_TIME_KEY);
      const status = await AsyncStorage.getItem(TIMER_STATUS_KEY);

      if (endTimeString && status === "active") {
        const endTime = parseInt(endTimeString, 10);
        const remainingTime = Math.max(
          0,
          Math.floor((endTime - Date.now()) / 1000)
        );

        if (remainingTime > 0) {
          setSeconds(remainingTime);
          setIsActive(true);
        } else {
          // Timer finished while app was backgrounded
          setSeconds(0);
          setIsActive(false);

          // Always trigger completion if timer was active
          console.log("⏰ Timer completed in background, triggering completion...");
          await handleTimerCompletion();

          // Clean up storage
          await AsyncStorage.removeItem(TIMER_END_TIME_KEY);
          await AsyncStorage.setItem(TIMER_STATUS_KEY, "idle");
          cancelTimerNotification();
        }
      } else {
        setIsActive(false);
      }
    } catch (e) {
      console.error("checkAndRestoreTimer error:", e);
    }
  };

  // --- Load Settings & Setup Firestore Listeners ---
  useEffect(() => {
    const initializeSettings = async () => {
      const loadedSettings = await loadSettings();
      setInitialTime((loadedSettings?.duration || DEFAULT_MINUTES) * 60);
      setIsSoundOn(loadedSettings?.isSoundOn ?? true);
      setIsVibrationOn(loadedSettings?.isVibrationOn ?? true);
      setSelectedSound(loadedSettings?.selectedSound || SOUND_PRESETS[0]);

      // Load saved theme
      try {
        const savedThemeId = await AsyncStorage.getItem('selectedTheme');
        if (savedThemeId) {
          const theme = getThemeById(savedThemeId);
          setCurrentTheme(theme);
          console.log(`✅ Loaded theme: ${theme.name}`);
        }
      } catch (error) {
        console.error('❌ Failed to load theme:', error);
      }
    };

    initializeSettings();
    setupNotifications();

    // Handle notification responses (when user taps notification)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('📱 Notification tapped:', data);

      if (data.type === 'timer_complete') {
        // User tapped the completion notification
        console.log('⏰ User tapped timer completion notification');
        // The app is already open, completion screen should be visible
        // If not, trigger it again
        checkAndRestoreTimer();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Setup Firestore real-time listener for tasks
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setCurrentTask(null);
      return;
    }

    console.log("🔥 Setting up Firestore listener for user:", user.uid);

    // Listen to all tasks for this user
    const tasksQuery = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const fetchedTasks: Task[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedTasks.push({
            id: doc.id,
            title: data.title,
            duration: data.duration,
            createdAt: data.createdAt,
            completedAt: data.completedAt,
            status: data.status,
            userId: data.userId,
            subjectId: data.subjectId,
            subSubjectId: data.subSubjectId,
          });
        });

        console.log("✅ Tasks loaded from Firestore:", fetchedTasks.length);
        console.log("📋 Tasks data:", fetchedTasks);
        setTasks(fetchedTasks);

        // Check for task completion achievements when tasks are loaded
        const completedTasksCount = fetchedTasks.filter(t => t.status === "completed").length;
        if (completedTasksCount > 0) {
          checkTaskAchievementsOnLoad(user.uid, completedTasksCount);
        }

        // Find active task
        const activeTask = fetchedTasks.find((t) => t.status === "active");
        if (activeTask) {
          setCurrentTask(activeTask);
        } else if (
          currentTask &&
          !fetchedTasks.find((t) => t.id === currentTask.id)
        ) {
          setCurrentTask(null);
        }
      },
      (error) => {
        console.error("❌ Error listening to tasks:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Setup Firestore real-time listener for subjects
  useEffect(() => {
    if (!user) {
      setSubjects([]);
      return;
    }

    console.log("📚 Setting up Firestore listener for subjects:", user.uid);

    const subjectsQuery = query(
      collection(db, "subjects"),
      where("userId", "==", user.uid)
    );

    const unsubscribeSubjects = onSnapshot(
      subjectsQuery,
      (snapshot) => {
        const fetchedSubjects: Subject[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedSubjects.push({
            id: doc.id,
            name: data.name,
            color: data.color,
            icon: data.icon,
            createdAt: data.createdAt,
            userId: data.userId,
          });
        });

        console.log("✅ Subjects loaded from Firestore:", fetchedSubjects.length);
        setSubjects(fetchedSubjects);
      },
      (error) => {
        console.error("❌ Error listening to subjects:", error);
      }
    );

    return () => unsubscribeSubjects();
  }, [user]);

  // Setup Firestore real-time listener for notes
  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }

    console.log("🗒️ Setting up Firestore listener for notes:", user.uid);

    const notesQ = query(
      collection(db, "notes"),
      where("userId", "==", user.uid)
    );

    const unsubscribeNotes = onSnapshot(
      notesQ,
      (snapshot) => {
        const fetchedNotes: Note[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as any;
          fetchedNotes.push({
            id: doc.id,
            title: data.title || data.taskTitle || "",
            content: data.content || data.notes || "",
            createdAt: toMillis(data.createdAt) || toMillis(data.completedAt),
            updatedAt: toMillis(data.updatedAt) || toMillis(data.completedAt),
            pinned: data.pinned || false,
            userId: data.userId,
            taskId: data.taskId || null,
            duration: data.duration || 0, // Duration in seconds
            imageUrl: data.imageUrl || null, // Image URL associated with the note
          });
        });

        // Sort: pinned first, then updatedAt desc, then createdAt desc
        fetchedNotes.sort((a, b) => {
          const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
          if (pinDiff !== 0) return pinDiff;
          const aTime = a.updatedAt || a.createdAt || 0;
          const bTime = b.updatedAt || b.createdAt || 0;
          return bTime - aTime;
        });

        console.log("🗒️ Notes loaded:", fetchedNotes.length);
        setNotes(fetchedNotes);
      },
      (error) => {
        console.error("❌ Error listening to notes:", error);
      }
    );

    return () => unsubscribeNotes();
  }, [user]);

  // Helper function to format duration
  const formatDuration = (seconds: number): string => {
    if (!seconds) return "";
    const minutes = Math.floor(seconds / 60);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  // Helper function to categorize notes by date
  const categorizeNotesByDate = (notes: Note[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const categories: { [key: string]: Note[] } = {
      Pinned: [],
      Today: [],
      Yesterday: [],
      "This Week": [],
      "Last Week": [],
      "This Month": [],
      Older: [],
    };

    notes.forEach((note) => {
      if (note.pinned) {
        categories.Pinned.push(note);
        return;
      }

      const noteDate = new Date(note.updatedAt || note.createdAt || 0);
      noteDate.setHours(0, 0, 0, 0);

      if (noteDate.getTime() === today.getTime()) {
        categories.Today.push(note);
      } else if (noteDate.getTime() === yesterday.getTime()) {
        categories.Yesterday.push(note);
      } else if (noteDate >= thisWeekStart) {
        categories["This Week"].push(note);
      } else if (noteDate >= lastWeekStart) {
        categories["Last Week"].push(note);
      } else if (noteDate >= thisMonthStart) {
        categories["This Month"].push(note);
      } else {
        categories.Older.push(note);
      }
    });

    // Filter out empty categories
    return Object.entries(categories).filter(([_, notes]) => notes.length > 0);
  };

  // Save settings when they change
  useEffect(() => {
    const settings: UserSettings = {
      duration: initialTime / 60,
      isSoundOn,
      isVibrationOn,
      selectedSound,
    };
    saveSettings(settings);
  }, [initialTime, isSoundOn, isVibrationOn, selectedSound]);

  // --- Core Timer Functionality ---
  // --- Core Timer Functionality ---
  const handleTimerCompletion = async () => {
    setIsActive(false);
    await AsyncStorage.removeItem(TIMER_END_TIME_KEY);
    await AsyncStorage.removeItem(TIMER_STATUS_KEY);
    cancelTimerNotification();

    // Play completion sound using user's selected sound
    if (isSoundOn) {
      try {
        await playCompletionSound(selectedSound);
      } catch (error) {
        console.error("Failed to play sound", error);
      }
    }

    if (isVibrationOn) {
      Vibration.vibrate([0, 500, 200, 500]);
    }

    if (timerMode === "focus") {
      // Focus session complete
      const sessionMinutes = Math.floor(initialTime / 60);
      setSessionFocusDuration((prev) => prev + sessionMinutes);
      setTotalFocusMinutes((prev) => (prev || 0) + sessionMinutes);

      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          await setDoc(userRef, {
            totalFocusMinutes: increment(sessionMinutes),
            lastFocusDate: serverTimestamp()
          }, { merge: true });
        } catch (e) { console.error(e); }
      }

      // Navigate to Break or directly end session
      if (isBreakEnabled) {
        setShowBreakPromptModal(true);
      } else {
        // Breaks disabled - go directly to end session flow (skip PostSessionModal)
        handleEndSession();
      }

    } else if (timerMode === "break") {
      // Break session complete
      const breakMinutes = Math.floor(initialTime / 60);
      setSessionBreakDuration((prev) => prev + breakMinutes);
      setShowPostSessionModal(true);
    } else {
      // Fallback or Unknown state
      setShowPostSessionModal(true);
    }
  };

  const handleAddOneMinute = async () => {
    // Add 60 seconds while keeping timer state and notifications consistent
    const newSeconds = seconds + 60;
    setSeconds(newSeconds);

    if (isActive) {
      const endTime = Date.now() + newSeconds * 1000;
      await AsyncStorage.setItem(TIMER_END_TIME_KEY, String(endTime));
      await AsyncStorage.setItem(TIMER_STATUS_KEY, "active");
      scheduleTimerNotification(newSeconds, currentTask?.title);
    }
  };

  // --- Persistence & AppState Listener ---
  useEffect(() => {
    registerTimerTask();
    checkAndRestoreTimer();

    const sub = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        checkAndRestoreTimer();
      }
      appState.current = nextState;
    });

    return () => {
      sub.remove();
    };
  }, [user]);

  // Timer interval effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let notificationUpdateCounter = 0;

    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const newSeconds = prev - 1;

          // Update notification every 10 seconds or when minutes change to reduce battery drain
          notificationUpdateCounter++;
          const shouldUpdateNotification =
            notificationUpdateCounter % 10 === 0 || // Every 10 seconds
            newSeconds % 60 === 59 || // When minutes change
            newSeconds <= 60; // Every second in last minute

          if (shouldUpdateNotification && newSeconds > 0) {
            scheduleTimerNotification(newSeconds, currentTask?.title);
          }

          // Trigger completion when timer reaches 0
          if (newSeconds <= 0) {
            handleTimerCompletion();
            return 0; // Set to 0 to prevent negative values
          }

          return newSeconds;
        });
      }, 1000);

      // Initial notification
      scheduleTimerNotification(seconds, currentTask?.title);
    } else if (seconds <= 0 && isActive) {
      // Handle case where timer already completed (e.g., app was in background)
      handleTimerCompletion();
      cancelTimerNotification();
    } else {
      cancelTimerNotification();
    }

    return () => interval && clearInterval(interval);
  }, [isActive, seconds, user, currentTask]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setShowAuthModal(false);
        const updatedStreak = await getStreak(currentUser.uid);
        setStreak(updatedStreak);

        // Migrate old achievements to composite ID format (one-time operation)
        try {
          const { migrateUserAchievements, needsMigration } = require("../utils/migrateAchievements");
          const needsUpdate = await needsMigration(currentUser.uid);

          if (needsUpdate) {
            console.log("🔄 Migrating achievements to new format...");
            const result = await migrateUserAchievements(currentUser.uid);
            console.log(`✅ Migration complete: ${result.migrated} migrated, ${result.skipped} skipped, ${result.errors} errors`);
          }
        } catch (err) {
          console.error("Failed to migrate achievements:", err);
        }

        // Clean up duplicate achievements (silent operation)
        try {
          const { cleanupDuplicateAchievements } = require("../utils/achievements");
          const duplicatesRemoved = await cleanupDuplicateAchievements(currentUser.uid);
          if (duplicatesRemoved > 0) {
            console.log(`🧹 Removed ${duplicatesRemoved} duplicate achievement(s) on login`);
          }
        } catch (err) {
          console.error("Failed to cleanup duplicate achievements:", err);
        }

        // Silently check for achievements on login (no notifications)
        // Notifications will only show when user actually earns new achievements during app usage
        try {
          const {
            checkStreakAchievements,
            checkFocusTimeAchievements,
            checkTasksCompletedAchievements,
          } = require("../utils/achievements");

          // Silently check and unlock achievements (returns empty array if already unlocked)
          await checkStreakAchievements(currentUser.uid, updatedStreak);
          await checkFocusTimeAchievements(currentUser.uid, totalFocusMinutes || 0);

          // Task achievements will be checked when tasks load
          const completedTasksCount = tasks.filter(t => t.status === "completed").length;
          if (completedTasksCount > 0) {
            await checkTasksCompletedAchievements(currentUser.uid, completedTasksCount);
          }

          console.log("✅ Silently checked achievements on login (no notifications)");
        } catch (err) {
          console.error("Failed to check achievements on login:", err);
        }
      } else setShowAuthModal(true);
    });
    return () => unsubscribe();
  }, [totalFocusMinutes, tasks]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // --- Settings Handler ---
  const handleSaveSettings = (newMinutes: number) => {
    const newInitialTime = newMinutes * 60;
    setInitialTime(newInitialTime);
    if (!isActive) {
      setSeconds(newInitialTime);
    }
  };

  // --- Firebase Auth Handlers ---
  const handleRegister = async () => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Update the user's profile with the display name immediately
      if (name) {
        await updateProfile(userCredential.user, {
          displayName: name
        });
      }

      await createInitialUserDocument(userCredential.user.uid, name, phone);
      Alert.alert("Success", "Account created and logged in!");
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert("Success", "Login successful!");
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleError(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
      Alert.alert("Success", "Google Sign-In successful!");
    } catch (e) {
      Alert.alert("Error", (e as Error).message || getGoogleSetupHelp());
    } finally {
      setIsLoading(false);
    }
  };

  // Test login functions for development
  const handleTestLogin1 = async () => {
    setEmail("shreyank@gmail.com");
    setPassword("123456");
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, "shreyank@gmail.com", "123456");
      Alert.alert("Success", "Test login 1 successful!");
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestLogin2 = async () => {
    setEmail("joke@gmail.con");
    setPassword("123456");
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, "joke@gmail.con", "123456");
      Alert.alert("Success", "Test login 2 successful!");
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestLogin3 = async () => {
    setEmail("newuser@gmail.com");
    setPassword("123456");
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, "newuser@gmail.com", "123456");
      Alert.alert("Success", "Test login 3 successful!");
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // White noise handler
  const handleWhiteNoiseSelect = async (whiteNoise: WhiteNoiseType) => {
    try {
      // Stop current white noise if playing
      if (whiteNoiseSound) {
        await whiteNoiseSound.stopAsync();
        await whiteNoiseSound.unloadAsync();
        setWhiteNoiseSound(null);
      }

      setSelectedWhiteNoise(whiteNoise);

      // Save preference
      await AsyncStorage.setItem('selectedWhiteNoise', whiteNoise);

      // If timer is active and not "None", start playing
      if (isActive && whiteNoise !== "None") {
        await playWhiteNoise(whiteNoise);
      }

      console.log(`✅ White noise selected: ${whiteNoise}`);
    } catch (error) {
      console.error('❌ Failed to select white noise:', error);
    }
  };

  // Play white noise function
  const playWhiteNoise = async (whiteNoise: WhiteNoiseType) => {
    if (whiteNoise === "None") return;

    try {
      const soundFile = WHITE_NOISE_SOUND_MAP[whiteNoise];
      if (!soundFile) {
        console.log(`⚠️ No sound file found for: ${whiteNoise}`);
        return;
      }

      const { sound } = await Audio.Sound.createAsync(
        soundFile,
        {
          isLooping: true,
          volume: 0.3 // Lower volume for background noise
        }
      );

      await sound.playAsync();
      setWhiteNoiseSound(sound);
      console.log(`🎵 Playing white noise: ${whiteNoise}`);
    } catch (error) {
      console.error('❌ Failed to play white noise:', error);
    }
  };

  // Stop white noise function
  // Stop white noise function
  const stopWhiteNoise = async () => {
    if (whiteNoiseSound) {
      const sound = whiteNoiseSound;
      setWhiteNoiseSound(null); // Optimistically clear state
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
        console.log('🔇 White noise stopped');
      } catch (error: any) {
        // Ignore "not loaded" errors which are common race conditions
        if (error.message && error.message.includes('not loaded')) {
          console.log('⚠️ White noise already unloaded');
        } else {
          console.log('⚠️ Warning stopping white noise:', error.message);
        }
      }
    }
  };

  // Load white noise preference on app start
  useEffect(() => {
    const loadWhiteNoisePreference = async () => {
      try {
        const savedWhiteNoise = await AsyncStorage.getItem('selectedWhiteNoise');
        if (savedWhiteNoise && WHITE_NOISE_PRESETS.includes(savedWhiteNoise as WhiteNoiseType)) {
          setSelectedWhiteNoise(savedWhiteNoise as WhiteNoiseType);
        }
      } catch (error) {
        console.error('❌ Failed to load white noise preference:', error);
      }
    };

    loadWhiteNoisePreference();
  }, []);

  // Start/stop white noise based on timer state
  useEffect(() => {
    if (isActive && selectedWhiteNoise !== "None") {
      playWhiteNoise(selectedWhiteNoise);
    } else {
      stopWhiteNoise();
    }

    // Cleanup on unmount
    return () => {
      stopWhiteNoise();
    };
  }, [isActive, selectedWhiteNoise]);

  // Removed Expo hook response handler

  // Handle Flip Mode UI Hiding and State
  // Handle Flip Mode UI Hiding and State
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isActive && isFlipDeviceOn) {
      // If active and flip mode on, hide controls after 10s regardless of current flip state
      timeout = setTimeout(() => {
        setAreControlsHidden(true);
      }, 10000);
    } else if (!isActive) {
      // Reset if paused/stopped
      setAreControlsHidden(false);
    }

    return () => clearTimeout(timeout);
  }, [isActive, isFlipDeviceOn]);

  // Handle Flip State Change (from Overlay)
  const handleFlipChange = (flipped: boolean) => {
    setIsDeviceFlipped(flipped);
    if (!flipped) {
      // If flipped back up (Face Up), show controls
      setAreControlsHidden(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowProfileModal(false);
      setStreak(0);
      Alert.alert("Success", "You have been logged out.");
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    }
  };

  // --- Enhanced Pomodoro Handlers ---

  const handleConfigStart = async (focusMinutes: number, breakMinutes: number | null, shouldResetSession: boolean = true) => {

    if (shouldResetSession) {
      setSessionFocusDuration(0);
      setSessionBreakDuration(0);
    }

    const focusSeconds = focusMinutes * 60;
    setLastTimerConfig({ focusMinutes, breakMinutes });
    setInitialTime(focusSeconds);
    setSeconds(focusSeconds);

    if (breakMinutes) {
      setIsBreakEnabled(true);
      setBreakDuration(breakMinutes * 60);
    } else {
      setIsBreakEnabled(false);
    }

    setTimerMode("focus");

    // Explicitly start the timer logic here to avoid recursion issues
    setIsActive(true);
    const endTime = Date.now() + focusSeconds * 1000;
    await AsyncStorage.setItem(TIMER_END_TIME_KEY, String(endTime));
    await AsyncStorage.setItem(TIMER_STATUS_KEY, "active");

    // Notification setup
    const notificationId = await scheduleTimerCompletionNotification(
      focusSeconds,
      currentTask?.title || "Focus Session"
    );
    setCompletionNotificationId(notificationId);

    if (currentTask) {
      // Update task to active if existing
      try {
        const taskRef = doc(db, "tasks", currentTask.id);
        await updateDoc(taskRef, { status: "active" });
        setCurrentTask((prev) => prev ? { ...prev, status: "active" } : null);
      } catch (e) { console.error(e); }
    }
  };

  const handleStartBreak = async () => {
    setShowBreakPromptModal(false);
    setTimerMode("break");
    setInitialTime(breakDuration); // Set ring scale
    setSeconds(breakDuration);

    setIsActive(true);
    const endTime = Date.now() + breakDuration * 1000;
    await AsyncStorage.setItem(TIMER_END_TIME_KEY, String(endTime));
    await AsyncStorage.setItem(TIMER_STATUS_KEY, "active");

    // Break Notification
    const notificationId = await scheduleTimerCompletionNotification(
      breakDuration,
      "Break Time"
    );
    setCompletionNotificationId(notificationId);
  };

  const handleSkipBreak = () => {
    setShowBreakPromptModal(false);
    setShowPostSessionModal(true);
  };

  const handleEndSession = async () => {
    setShowPostSessionModal(false);
    setTimerMode("idle");
    setIsActive(false);

    await AsyncStorage.removeItem(TIMER_END_TIME_KEY);
    await AsyncStorage.removeItem(TIMER_STATUS_KEY);
    setSeconds(initialTime); // Reset timer to initial config
    cancelTimerNotification();
    if (completionNotificationId) await cancelTimerCompletionNotification(completionNotificationId);

    // --- Task Completion & Media Flow ---
    const completedAt = Date.now();
    // Use stored duration or calculate based on session. Ideally we track total focus time.
    // For now, we'll use the last focus session's intended duration or accumulated?
    // User wants to log the "Task". 
    const taskTitle = currentTask?.title || "Pomodoro Session";
    // ADDED: Use accumulated session duration plus the last completed interval if it wasn't added yet (which it is in handleTimerCompletion)
    // Wait, handleTimerCompletion adds to the state.
    // If user ends EARLY, we might want to add the partial time?
    // For now, let's assume they only end after a solid block or we just take what's in the accumulator.
    // But if they press "End Session" from the post-session modal, the last block IS finished and added.
    const duration = sessionFocusDuration > 0 ? sessionFocusDuration : initialTime / 60;
    const taskSubjectId = currentTask?.subjectId;

    if (currentTask && user) {
      try {
        const taskRef = doc(db, "tasks", currentTask.id);
        await updateDoc(taskRef, {
          status: "completed",
          completedAt,
          duration: duration, // Update with actual accumulated duration
          breakDuration: sessionBreakDuration, // Save total break time too if needed
        });
        console.log("✅ Task marked as completed in Firestore");

        setCurrentTask(null);

        // Update Streak Logic using Firestore activeDays array
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const data = userSnap.data();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        let currentStreak = data?.streak || 0;
        let activeDays = (data?.activeDays || []) as string[];
        let streakStartDate = data?.streakStartDate || todayStr;

        // Only increment if today is NOT in activeDays
        if (!activeDays.includes(todayStr)) {
          const lastActive = data?.lastActive?.toDate ? data.lastActive.toDate() : null;

          if (lastActive) {
            const yesterday = new Date(today.getTime());
            yesterday.setDate(yesterday.getDate() - 1);
            const lastActiveDay = new Date(lastActive.getTime());
            lastActiveDay.setHours(0, 0, 0, 0);

            if (lastActiveDay.getTime() === yesterday.getTime()) {
              // Consecutive day - increment
              currentStreak += 1;
            } else if (lastActiveDay.getTime() < yesterday.getTime()) {
              // Streak broken - reset
              currentStreak = 1;
              activeDays = [];
              streakStartDate = todayStr;
            }
          } else {
            // First ever task
            currentStreak = 1;
          }

          activeDays = [...activeDays, todayStr];

          await updateDoc(userRef, {
            streak: currentStreak,
            lastActive: serverTimestamp(),
            activeDays,
            streakStartDate
          });

          setStreak(currentStreak);
        }

        // Check Achievements
        try {
          const newStreakAchievements = await checkStreakAchievements(user.uid, currentStreak);
          const newFocusAchievements = await checkFocusTimeAchievements(user.uid, totalFocusMinutes || 0);
          const allNew = [...newStreakAchievements, ...newFocusAchievements];
          if (allNew.length > 0) {
            showMultipleAchievementNotifications(allNew);
          }
        } catch (e) { console.error(e); }

      } catch (error) {
        console.error("Failed to mark task complete:", error);
      }
    }

    // Save session data for modals (clear old imageUrl to force fresh selection)
    setCompletedSession({
      taskTitle,
      duration,
      completedAt,
      subjectId: taskSubjectId,
      subSubjectId: currentTask?.subSubjectId,
      breakDuration: sessionBreakDuration,
      imageUrl: undefined, // Clear old image to show fresh image selection
    });

    // Trigger Image Modal Flow
    setShowImageModal(true);
  };

  const handleRestartSession = async () => {
    setShowPostSessionModal(false);
    if (lastTimerConfig) {
      // Restarting means continuing the "session" in terms of "sitting down to work", but 
      // typically "Start Another" implies a new interval.
      // However, the user asked to total multiple pomodoros in single sessions.
      // So we should NOT reset the session accumulators here if we consider it one big session.
      // "Start Another" -> implies adding more time to the current flow.
      await handleConfigStart(lastTimerConfig.focusMinutes, lastTimerConfig.breakMinutes, false);
    } else {
      // Fallback to default if no config found
      await handleConfigStart(25, 5, false);
    }
  };

  const handleStartPause = async () => {
    if (!user) {
      setShowAuthModal(true);
      Alert.alert(
        "Sign In Required",
        "Please sign in to start your Pomodoro session."
      );
      return;
    }

    // New Flow: If starting fresh (idle) and not active, open config (TaskInputModal now handles config)
    if (!isActive && timerMode === "idle") {
      setShowTaskInputModal(true);
      return;
    }

    // Default toggle behavior for existing sessions (Pause/Resume)
    const newActiveState = !isActive;
    setIsActive(newActiveState);

    if (newActiveState) {
      const endTime = Date.now() + seconds * 1000;
      await AsyncStorage.setItem(TIMER_END_TIME_KEY, String(endTime));
      await AsyncStorage.setItem(TIMER_STATUS_KEY, "active");

      const notificationId = await scheduleTimerCompletionNotification(
        seconds,
        timerMode === "break" ? "Break Time" : (currentTask?.title || "Focus Session")
      );
      setCompletionNotificationId(notificationId);

      if (currentTask && timerMode === "focus") {
        try {
          const taskRef = doc(db, "tasks", currentTask.id);
          await updateDoc(taskRef, { status: "active" });
          setCurrentTask((prev) => (prev ? { ...prev, status: "active" } : null));
        } catch (error) {
          console.error("❌ Failed to update task status:", error);
        }
      }
    } else {
      await AsyncStorage.removeItem(TIMER_END_TIME_KEY);
      await AsyncStorage.setItem(TIMER_STATUS_KEY, "paused");
      cancelTimerNotification();
      await cancelTimerCompletionNotification(completionNotificationId);
      setCompletionNotificationId(null);

      if (currentTask && timerMode === "focus") {
        try {
          const taskRef = doc(db, "tasks", currentTask.id);
          await updateDoc(taskRef, { status: "pending" });
          setCurrentTask((prev) => (prev ? { ...prev, status: "pending" } : null));
        } catch (error) {
          console.error("❌ Failed to update task status:", error);
        }
      }
    }
  };

  const handleTaskSave = async (
    taskTitle: string,
    subjectId: string | undefined,
    focusMinutes: number,
    breakMinutes: number | null,
    subSubjectId?: string | undefined
  ) => {
    setShowTaskInputModal(false);

    // If no task title, just start the timer with config
    if (!taskTitle) {
      await handleConfigStart(focusMinutes, breakMinutes, true);
      return;
    }

    // If user provided task details
    if (!user) return;

    // 1. Create task in Firestore
    const newTask: any = {
      title: taskTitle,
      duration: focusMinutes, // Use the configured duration
      createdAt: Date.now(),
      status: "active",
      userId: user.uid,
    };

    if (subjectId) {
      newTask.subjectId = subjectId;
    }

    if (subSubjectId) {
      newTask.subSubjectId = subSubjectId;
    }

    try {
      const tasksRef = collection(db, "tasks");
      const docRef = doc(tasksRef);
      await setDoc(docRef, newTask);
      console.log("✅ Task saved to Firestore with active status");

      const fullTask: Task = {
        ...newTask,
        id: docRef.id,
      };

      setCurrentTask(fullTask);

      // 2. Start the Timer Config Flow with these settings
      // This will set timerMode='focus', set seconds, start timer, etc.
      // New task starts a new fresh session tracking
      await handleConfigStart(focusMinutes, breakMinutes, true);

    } catch (error) {
      console.error("❌ Failed to save task to Firestore:", error);
      Alert.alert("Error", "Failed to save task. Please try again.");
    }
  };

  const handleEditCurrentTask = () => {
    if (!currentTask || !user) return;
    setTaskToEdit(currentTask);
    setIsEditForPlayAgain(false);
    setShowEditTaskModal(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!user) return;

          try {
            // Update local state immediately for better UX
            setTasks((prevTasks) =>
              prevTasks.filter((task) => task.id !== taskId)
            );

            if (currentTask?.id === taskId) {
              setCurrentTask(null);
            }

            // Delete from Firestore
            const taskRef = doc(db, "tasks", taskId);
            await deleteDoc(taskRef);
            console.log("✅ Task deleted from Firestore");
          } catch (error) {
            console.error("❌ Failed to delete task:", error);
            Alert.alert("Error", "Failed to delete task.");

            // Revert local state if Firestore deletion failed
            // The Firestore listener will restore the correct state
          }
        },
      },
    ]);
  };

  // Handler to add a custom task with pending status
  const handleAddCustomTask = async (title: string, duration: number, subjectId?: string, subSubjectId?: string) => {
    if (!user) {
      Alert.alert("Error", "Please sign in to add tasks.");
      return;
    }

    try {
      const newTask: any = {
        title,
        duration,
        createdAt: Date.now(),
        status: "pending",
        userId: user.uid,
      };

      // Add subjectId if provided
      if (subjectId) {
        newTask.subjectId = subjectId;
      }

      if (subSubjectId) {
        newTask.subSubjectId = subSubjectId;
      }

      const tasksRef = collection(db, "tasks");
      const docRef = doc(tasksRef);
      await setDoc(docRef, newTask);
      console.log("✅ Custom task added with pending status" + (subjectId ? " and assigned to subject" : ""));

      Alert.alert("Success", "Task added! Use the play button to start it.");
    } catch (error) {
      console.error("❌ Failed to add custom task:", error);
      Alert.alert("Error", "Failed to add task. Please try again.");
    }
  };

  // Handler to play a pending task
  const handlePlayTask = async (task: Task) => {
    if (!user) return;

    // Check if there's already an active task
    if (currentTask && currentTask.status === "active") {
      Alert.alert(
        "Active Task Running",
        "Please complete or stop the current task before starting a new one."
      );
      return;
    }

    try {
      // Set this task as current and update to active
      setCurrentTask({ ...task, status: "active" });

      // Update task status in Firestore
      const taskRef = doc(db, "tasks", task.id);
      await updateDoc(taskRef, { status: "active" });
      console.log("✅ Task status updated to active");

      // Set timer duration based on task
      const taskSeconds = task.duration * 60;
      setInitialTime(taskSeconds);
      setSeconds(taskSeconds);

      // Start timer
      setIsActive(true);
      const endTime = Date.now() + taskSeconds * 1000;
      await AsyncStorage.setItem(TIMER_END_TIME_KEY, String(endTime));
      await AsyncStorage.setItem(TIMER_STATUS_KEY, "active");

      // Schedule completion notification
      const notificationId = await scheduleTimerCompletionNotification(
        taskSeconds,
        task.title
      );
      setCompletionNotificationId(notificationId);

      // Switch to Timer screen
      setActiveScreen("Timer");

      console.log(`✅ Started task: ${task.title} (${task.duration} min)`);
    } catch (error) {
      console.error("❌ Failed to start task:", error);
      Alert.alert("Error", "Failed to start task. Please try again.");
    }
  };

  // Handler to play a completed task again - shows dialog with Edit/Play options
  const handlePlayAgain = async (task: Task) => {
    if (!user) return;

    // Check if there's already an active task
    if (currentTask && currentTask.status === "active") {
      Alert.alert(
        "Active Task Running",
        "Please complete or stop the current task before starting a new one."
      );
      return;
    }

    // Show dialog with Edit and Play Again options
    Alert.alert(
      "Play Again",
      `What would you like to do with "${task.title}"?`,
      [
        {
          text: "Edit & Play",
          onPress: () => handleEditAndPlay(task),
        },
        {
          text: "Play Again",
          onPress: async () => {
            try {
              // Create a new task with the same title and duration
              const newTask: any = {
                title: task.title,
                duration: task.duration,
                createdAt: Date.now(),
                status: "active",
                userId: user.uid,
              };

              // Copy subjectId if it exists
              if (task.subjectId) {
                newTask.subjectId = task.subjectId;
              }

              const tasksRef = collection(db, "tasks");
              const docRef = doc(tasksRef);
              await setDoc(docRef, newTask);
              console.log("✅ New task created from completed task");

              // Set as current task
              const fullTask: Task = {
                ...newTask,
                id: docRef.id,
              };
              setCurrentTask(fullTask);

              // Set timer duration
              const taskSeconds = task.duration * 60;
              setInitialTime(taskSeconds);
              setSeconds(taskSeconds);

              // Start timer
              setIsActive(true);
              const endTime = Date.now() + taskSeconds * 1000;
              await AsyncStorage.setItem(TIMER_END_TIME_KEY, String(endTime));
              await AsyncStorage.setItem(TIMER_STATUS_KEY, "active");

              // Schedule completion notification
              const notificationId = await scheduleTimerCompletionNotification(
                taskSeconds,
                task.title
              );
              setCompletionNotificationId(notificationId);

              // Switch to Timer screen
              setActiveScreen("Timer");

              console.log(`✅ Restarted task: ${task.title}`);
            } catch (error) {
              console.error("❌ Failed to restart task:", error);
              Alert.alert("Error", "Failed to restart task. Please try again.");
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  // Handler to edit a task (for regular edit)
  const handleEditTask = (task: Task) => {
    if (!user) return;
    setTaskToEdit(task);
    setIsEditForPlayAgain(false);
    setShowEditTaskModal(true);
  };

  // Handler to edit and play (for play again with edit)
  const handleEditAndPlay = (task: Task) => {
    if (!user) return;

    // Check if there's already an active task
    if (currentTask && currentTask.status === "active") {
      Alert.alert(
        "Active Task Running",
        "Please complete or stop the current task before starting a new one."
      );
      return;
    }

    setTaskToEdit(task);
    setIsEditForPlayAgain(true);
    setShowEditTaskModal(true);
  };

  // Handler to save edited task
  const handleSaveEditedTask = async (newTitle: string) => {
    if (!taskToEdit || !user) return;

    try {
      if (isEditForPlayAgain) {
        // Create NEW task with edited name and start it
        const newTask: any = {
          title: newTitle,
          duration: taskToEdit.duration,
          createdAt: Date.now(),
          status: "active",
          userId: user.uid,
        };

        // Copy subjectId if it exists
        if (taskToEdit.subjectId) {
          newTask.subjectId = taskToEdit.subjectId;
        }

        const tasksRef = collection(db, "tasks");
        const docRef = doc(tasksRef);
        await setDoc(docRef, newTask);
        console.log("✅ New task created with edited name");

        // Set as current task
        const fullTask: Task = {
          ...newTask,
          id: docRef.id,
        };
        setCurrentTask(fullTask);

        // Set timer duration
        const taskSeconds = taskToEdit.duration * 60;
        setInitialTime(taskSeconds);
        setSeconds(taskSeconds);

        // Start timer
        setIsActive(true);
        const endTime = Date.now() + taskSeconds * 1000;
        await AsyncStorage.setItem(TIMER_END_TIME_KEY, String(endTime));
        await AsyncStorage.setItem(TIMER_STATUS_KEY, "active");

        // Schedule completion notification
        const notificationId = await scheduleTimerCompletionNotification(
          taskSeconds,
          newTitle
        );
        setCompletionNotificationId(notificationId);

        // Switch to Timer screen
        setActiveScreen("Timer");

        console.log(`✅ Started new task with edited name: ${newTitle}`);
      } else {
        // Regular edit - update existing task
        const taskRef = doc(db, "tasks", taskToEdit.id);
        await updateDoc(taskRef, { title: newTitle });
        console.log("✅ Task title updated");

        // Update current task if it's the one being edited
        if (currentTask?.id === taskToEdit.id) {
          setCurrentTask({ ...currentTask, title: newTitle });
        }
      }
    } catch (error) {
      console.error("❌ Failed to save task:", error);
      Alert.alert("Error", "Failed to save task. Please try again.");
    }
  };

  // Handler to abandon a pending task - instant without confirmation
  const handleAbandonTask = async (taskId: string) => {
    if (!user) return;

    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, {
        status: "abandoned",
        abandonedAt: Date.now(),
      });
      console.log("✅ Task marked as abandoned");
    } catch (error) {
      console.error("❌ Failed to abandon task:", error);
      Alert.alert("Error", "Failed to abandon task.");
    }
  };

  // Handler to abandon the current active task - instant without confirmation
  const handleAbandonCurrentTask = async () => {
    if (!currentTask || !user) return;

    try {
      // Stop the timer
      setIsActive(false);
      setSeconds(initialTime);
      await AsyncStorage.removeItem(TIMER_END_TIME_KEY);
      await AsyncStorage.removeItem(TIMER_STATUS_KEY);
      cancelTimerNotification();

      // Cancel completion notification
      await cancelTimerCompletionNotification(completionNotificationId);
      setCompletionNotificationId(null);

      // Mark task as abandoned
      const taskRef = doc(db, "tasks", currentTask.id);
      await updateDoc(taskRef, {
        status: "abandoned",
        abandonedAt: Date.now(),
      });
      console.log("✅ Current task marked as abandoned");

      // Clear current task
      setCurrentTask(null);
    } catch (error) {
      console.error("❌ Failed to abandon current task:", error);
      Alert.alert("Error", "Failed to abandon task.");
    }
  };

  const handleReset = async () => {
    setIsActive(false);
    setTimerMode("idle"); // Reset timer mode so modal shows again
    setSeconds(initialTime);
    await AsyncStorage.removeItem(TIMER_END_TIME_KEY);
    await AsyncStorage.removeItem(TIMER_STATUS_KEY);
    cancelTimerNotification();

    // Cancel completion notification on reset
    await cancelTimerCompletionNotification(completionNotificationId);
    setCompletionNotificationId(null);

    // Update current task to pending in Firestore
    if (currentTask && user) {
      try {
        const taskRef = doc(db, "tasks", currentTask.id);
        await updateDoc(taskRef, { status: "pending" });
        console.log("✅ Task reset in Firestore");

        // Update local state immediately for better UX
        setCurrentTask((prev) =>
          prev ? { ...prev, status: "pending" } : null
        );
      } catch (error) {
        console.error("❌ Failed to reset task:", error);
      }
    } else {
      setCurrentTask(null);
    }
  };

  const handleFlipTimeout = async () => {
    console.log("⚠️ Flip timeout triggered - abandoning task");

    // Stop the timer
    setIsActive(false);
    setSeconds(initialTime);
    await AsyncStorage.removeItem(TIMER_END_TIME_KEY);
    await AsyncStorage.removeItem(TIMER_STATUS_KEY);
    cancelTimerNotification();

    // Cancel completion notification
    await cancelTimerCompletionNotification(completionNotificationId);
    setCompletionNotificationId(null);

    // Mark current task as abandoned in Firestore (works for both "pending" and "active" tasks)
    if (currentTask && user) {
      try {
        const taskRef = doc(db, "tasks", currentTask.id);

        // Get current task status for logging
        const taskDoc = await getDoc(taskRef);
        const currentStatus = taskDoc.exists() ? taskDoc.data()?.status : "unknown";
        console.log(`⚠️ Abandoning task with current status: ${currentStatus}`);

        // Update to abandoned regardless of current status
        await updateDoc(taskRef, {
          status: "abandoned",
          abandonedAt: Date.now()
        });
        console.log("✅ Task marked as abandoned due to flip timeout");

        // Update local state
        setCurrentTask(null);

        // Show alert to user
        Alert.alert(
          "Session Abandoned",
          "You didn't flip your device in time. The session has been stopped and the task marked as abandoned.",
          [{ text: "OK" }]
        );
      } catch (error) {
        console.error("❌ Failed to abandon task:", error);
        Alert.alert("Error", "Failed to abandon task. Please try again.");
      }
    } else {
      console.log("⚠️ No current task to abandon");
    }
  };

  const renderContent = () => {
    switch (activeScreen) {
      case "Timer":
        return (
          <TimerContent
            formatTime={formatTime}
            seconds={seconds}
            handleStartPause={handleStartPause}
            isActive={isActive}
            handleReset={handleReset}
            isLoading={isLoading}
            totalTime={totalTime}
            progressPercentage={progressPercentage}
            currentTask={currentTask}
            onEditTask={handleEditCurrentTask}
            onAbandonTask={handleAbandonCurrentTask}
            onAddOneMinute={handleAddOneMinute}
            theme={currentTheme}
            areControlsHidden={areControlsHidden}
          />
        );
      case "Notes":
        return (
          <NotesContent
            onOpenProfile={() => setShowProfileModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenTimeTable={() => setShowTimeTableModal(true)}
            onOpenSubjects={() => setShowSubjectsModal(true)}
            theme={currentTheme}
          />
        );
      case "Flashcards":
        return (
          <PlaceholderContent
            icon="flash"
            title="Flashcards Screen"
            subtitle="Study mode activated!"
          />
        );
      case "Tasks":
        return (
          <TasksContent
            tasks={tasks}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onPlayTask={handlePlayTask}
            onPlayAgain={handlePlayAgain}
            onAbandonTask={handleAbandonTask}
            onAddCustomTask={() => setShowAddCustomTaskModal(true)}
            currentTaskId={currentTask?.id || null}
            theme={currentTheme}
          />
        );
      default:
        return (
          <TimerContent
            formatTime={formatTime}
            seconds={seconds}
            handleStartPause={handleStartPause}
            isActive={isActive}
            handleReset={handleReset}
            isLoading={isLoading}
            totalTime={totalTime}
            progressPercentage={progressPercentage}
            currentTask={currentTask}
            onEditTask={handleEditCurrentTask}
            onAbandonTask={handleAbandonCurrentTask}
            onAddOneMinute={handleAddOneMinute}
            theme={currentTheme}
            areControlsHidden={areControlsHidden}
          />
        );
    }
  };

  return (
    <LinearGradient
      colors={currentTheme.colors as any}
      start={currentTheme.gradientStart || { x: 0, y: 0 }}
      end={currentTheme.gradientEnd || { x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Top Bar (hidden on Notes for dedicated header/search) */}
      {activeScreen !== "Notes" && (
        <View style={styles.topBar}>
          <View style={styles.leftTopContainer}>
            <View style={styles.streakContainer}>
              <Ionicons name="flame" size={20} color="#FF6347" />
              <Text style={styles.streakText}>
                Streak: {streak} {streak === 1 ? "day" : "days"}
              </Text>
            </View>
            {!areNotificationsAvailable() && (
              <View style={styles.notificationStatus}>
                <Ionicons
                  name="notifications-off"
                  size={16}
                  color="rgba(255,255,255,0.7)"
                />
                <Text style={styles.notificationStatusText}>Expo Go</Text>
              </View>
            )}
          </View>

          <View style={styles.topRightButtons}>
            <TouchableOpacity
              onPress={() => setShowWhiteNoiseModal(true)}
              style={{ marginRight: 16 }}
            >
              <Ionicons
                name="musical-notes"
                size={28}
                color="white"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowTimeTableModal(true)}
              style={{ marginRight: 16 }}
            >
              <Ionicons
                name="calendar"
                size={28}
                color="white"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowSubjectsModal(true)}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="folder-outline" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowSettingsModal(true)}>
              <Ionicons name="settings-outline" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Content */}
      <View
        style={[
          styles.contentArea,
          activeScreen === "Notes" && styles.contentAreaStretch,
        ]}
      >
        {renderContent()}

        {/* Flip Device Overlay - Only show on Timer screen */}
        {activeScreen === "Timer" && (
          <FlipDeviceOverlay
            isActive={isActive}
            flipDeviceEnabled={isFlipDeviceOn}
            onTimeout={handleFlipTimeout}
            onFlipChange={handleFlipChange}
          />
        )}
      </View>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <NavButton
          icon="timer-outline"
          label="Timer"
          active={activeScreen === "Timer"}
          onPress={() => setActiveScreen("Timer")}
        />
        <NavButton
          icon="document-text-outline"
          label="Notes"
          active={activeScreen === "Notes"}
          onPress={() => {
            setActiveScreen("Notes");
          }}
        />
        <NavButton
          icon="flash-outline"
          label="Flashcards"
          active={activeScreen === "Flashcards"}
          onPress={() => {
            if (isActive && timerMode === "focus") {
              Alert.alert("Focus Mode", "Flashcards are disabled until the session ends.");
              return;
            }
            setActiveScreen("Flashcards");
          }}
        />
        <NavButton
          icon="checkbox-outline"
          label="Tasks"
          active={activeScreen === "Tasks"}
          onPress={() => {
            if (isActive && timerMode === "focus") {
              Alert.alert("Focus Mode", "Task management is disabled until the session ends.");
              return;
            }
            setActiveScreen("Tasks");
          }}
        />
      </View>

      {/* Auth Modal */}
      <Modal
        visible={showAuthModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (user) setShowAuthModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {isLogin ? "Login" : "Register"}
            </Text>
            <Text style={styles.modalSubtitle}>
              {user
                ? "Session expired. Please re-login."
                : "Sign in to track your progress."}
            </Text>

            {!isLogin && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Name"
                  value={name}
                  onChangeText={setName}
                  editable={!isLoading}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone (Optional)"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  maxLength={10}
                  editable={!isLoading}
                />
              </>
            )}

            <View style={styles.emailInputContainer}>
              <TextInput
                style={[styles.input, styles.emailInput]}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
              />
              <View style={styles.testButtonsContainer}>
                <TouchableOpacity
                  style={styles.testButton}
                  onPress={handleTestLogin1}
                  disabled={isLoading}
                >
                  <Text style={styles.testButtonText}>1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.testButton}
                  onPress={handleTestLogin2}
                  disabled={isLoading}
                >
                  <Text style={styles.testButtonText}>2</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.testButton}
                  onPress={handleTestLogin3}
                  disabled={isLoading}
                >
                  <Text style={styles.testButtonText}>3</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
            />

            <TouchableOpacity
              style={styles.authButton}
              onPress={isLogin ? handleLogin : handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.authButtonText}>
                {isLoading ? "Loading..." : isLogin ? "Login" : "Register"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={isLoading}
            >
              <Ionicons name="logo-google" size={20} color="#DB4437" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsLogin(!isLogin)}
              disabled={isLoading}
            >
              <Text style={styles.switchText}>
                {isLogin
                  ? "Don't have an account? Register"
                  : "Already have an account? Login"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modals */}
      <SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        initialMinutes={initialTime / 60}
        onSaveMinutes={handleSaveSettings}
        isSoundOn={isSoundOn}
        isVibrationOn={isVibrationOn}
        selectedSound={selectedSound}
        onToggleSound={setIsSoundOn}
        onToggleVibration={setIsVibrationOn}
        onSelectSound={setSelectedSound}
        currentTheme={currentTheme}
        onThemeChange={(themeId: string) => {
          const theme = getThemeById(themeId);
          setCurrentTheme(theme);
        }}
        onOpenProfile={() => {
          setShowSettingsModal(false);
          setTimeout(() => setShowProfileModal(true), 300);
        }}
        userProfileImage={user?.photoURL}
      />

      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onLogout={handleLogout}
        streak={streak}
        totalFocusMinutes={tasks.reduce(
          (sum, t) =>
            t.status === "completed" && t.completedAt
              ? sum + (t.duration || 0)
              : sum,
          0
        )}
        totalTasksCompleted={tasks.filter(t => t.status === "completed").length}
      />

      {/* Subjects Modal */}
      <Modal
        visible={showSubjectsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1 }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: Platform.OS === 'ios' ? 60 : 16,
            paddingBottom: 16,
            backgroundColor: '#FFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
          }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#1E293B' }}>
              Subjects
            </Text>
            <TouchableOpacity
              onPress={() => setShowSubjectsModal(false)}
              style={{
                backgroundColor: '#F1F5F9',
                padding: 8,
                borderRadius: 20,
              }}
            >
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <SubjectsScreen />
        </View>
      </Modal>

      <WhiteNoiseModal
        visible={showWhiteNoiseModal}
        onClose={() => setShowWhiteNoiseModal(false)}
        selectedWhiteNoise={selectedWhiteNoise}
        onSelectWhiteNoise={handleWhiteNoiseSelect}
      />

      <TimeTableModal
        visible={showTimeTableModal}
        onClose={() => setShowTimeTableModal(false)}
        userId={user?.uid || null}
      />

      <TaskInputModal
        visible={showTaskInputModal}
        onClose={() => setShowTaskInputModal(false)}
        onSave={handleTaskSave}
        isSoundOn={isSoundOn}
        isVibrationOn={isVibrationOn}
        selectedSound={selectedSound}
        onToggleSound={setIsSoundOn}
        onToggleVibration={setIsVibrationOn}
        onSelectSound={setSelectedSound}
        soundPresets={SOUND_PRESETS}
        isFlipDeviceOn={isFlipDeviceOn}
        onToggleFlipDevice={setIsFlipDeviceOn}
        initialFocusMinutes={initialTime / 60}
      />

      <AddCustomTaskModal
        visible={showAddCustomTaskModal}
        onClose={() => setShowAddCustomTaskModal(false)}
        onSave={handleAddCustomTask}
        subjects={subjects}
      />

      <EditTaskModal
        visible={showEditTaskModal}
        onClose={() => {
          setShowEditTaskModal(false);
          setTaskToEdit(null);
          setIsEditForPlayAgain(false);
        }}
        onSave={handleSaveEditedTask}
        currentTitle={taskToEdit?.title || ""}
      />

      <NotesModal
        visible={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        taskTitle={completedSession?.taskTitle || ""}
        duration={completedSession?.duration || 0}
        completedAt={completedSession?.completedAt || Date.now()}
        imageUrl={completedSession?.imageUrl}
        subjectId={completedSession?.subjectId}
        subSubjectId={completedSession?.subSubjectId}
        breakDuration={completedSession?.breakDuration}
      />

      <ImageCaptureModal
        visible={showImageModal}
        onClose={() => setShowImageModal(false)}
        taskTitle={completedSession?.taskTitle || ""}
        duration={completedSession?.duration || 0}
        onComplete={(imageUrl?: string) => {
          setShowImageModal(false);
          // Show notes modal after image modal is closed
          setTimeout(() => {
            setCompletedSession((prev) =>
              prev ? { ...prev, imageUrl } : prev
            );
            setShowNotesModal(true);
          }, 500);
        }}
      />

      {/* Image Viewer Modal */}
      <ImageViewerModal
        visible={showImageViewer}
        imageUrl={currentImageUrl}
        onClose={() => setShowImageViewer(false)}
      />

      {/* Enhanced Pomodoro Modals */}
      {/* Enhanced Pomodoro Modals */}
      {/* TimerConfigModal removed/replaced by TaskInputModal */}

      <BreakPromptModal
        visible={showBreakPromptModal}
        onStartBreak={handleStartBreak}
        onSkipBreak={handleSkipBreak}
        breakDuration={breakDuration / 60}
      />

      <PostSessionModal
        visible={showPostSessionModal}
        onStartAnother={handleRestartSession}
        onEndSession={handleEndSession}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Image viewer modal styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 8,
  },
  fullScreenImage: {
    width: "100%",
    height: "80%",
  },
  imageErrorContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  imageErrorText: {
    color: "#fff",
    fontSize: 18,
    marginTop: 10,
  },
  // Note image indicator styles
  noteImageIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  noteImageText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    marginLeft: 4,
  },
  topBar: {
    position: "absolute",
    top: 48,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  leftTopContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  streakText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 8,
  },
  notificationStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  notificationStatusText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
  topRightButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  contentArea: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  contentAreaStretch: {
    alignItems: "stretch",
    justifyContent: "flex-start",
  },
  bottomNav: {
    position: "absolute",
    bottom: 24,
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 24,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContainer: {
    backgroundColor: "white",
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: AUTH_MODAL_HEIGHT,
    width: "100%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  modalSubtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  authButton: {
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  authButtonText: { color: "white", fontWeight: "700", fontSize: 18 },
  googleButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DB4437",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  googleButtonText: {
    marginLeft: 12,
    color: "#DB4437",
    fontWeight: "600",
    fontSize: 16,
  },
  switchText: {
    textAlign: "center",
    color: "#4F46E5",
    fontWeight: "700",
    fontSize: 15,
    marginTop: 8,
  },
  // Notes dark theme styles
  notesContainer: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 120,
  },
  notesList: {
    paddingBottom: 140,
  },
  noteCard: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  noteTitle: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  noteSnippet: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    lineHeight: 18,
  },
  noteMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  noteMeta: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  noteChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  noteChipText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "600",
  },
  notesEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  notesEmptyText: {
    color: "white",
    fontWeight: "800",
    marginTop: 12,
    fontSize: 18,
  },
  notesEmptySub: {
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  noteMetaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  durationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(106, 133, 182, 0.4)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  durationText: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "700",
  },
  // Test login button styles
  emailInputContainer: {
    position: "relative",
    marginBottom: 12,
  },
  emailInput: {
    paddingRight: 120, // Make space for test buttons
    marginBottom: 0,
  },
  testButtonsContainer: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: [{ translateY: -12 }],
    flexDirection: "row",
    gap: 4,
  },
  testButton: {
    backgroundColor: "#4F46E5",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  testButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
});
