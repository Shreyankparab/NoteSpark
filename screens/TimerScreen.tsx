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
import * as Notifications from "expo-notifications";
import {
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { saveImage } from "../utils/imageStorage";
import ImageCaptureModal from "../components/modals/ImageCaptureModal";
import TimeTableModal from "../components/modals/TimeTableModal";
import AppearanceScreen from "./AppearanceScreen";
import { getThemeById, DEFAULT_THEME, Theme } from "../constants/themes";

// Import types and constants

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
import { ScreenName, SoundPreset, Task, Subject, UserSettings } from "../types";
import {
  AUTH_MODAL_HEIGHT,
  TIMER_END_TIME_KEY,
  TIMER_STATUS_KEY,
  SOUND_PRESETS,
} from "../constants";

// Import utilities
import { playCompletionSound } from "../utils/audio";
import {
  scheduleTimerNotification,
  cancelTimerNotification,
  setupNotifications,
  areNotificationsAvailable,
  scheduleTimerCompletionNotification,
  cancelTimerCompletionNotification,
} from "../utils/notifications";
import { loadSettings, saveSettings } from "../utils/storage";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { signInWithGoogle, getGoogleSetupHelp } from "../utils/googleAuth";
WebBrowser.maybeCompleteAuthSession();

// Import components
import NavButton from "../components/NavButton";
import TimerContent from "../components/TimerContent";
import TasksContent from "../components/TasksContent";
import NotesContent from "../components/NotesContent";
import PlaceholderContent from "../components/PlaceholderContent";
import ProfileModal from "../components/modals/ProfileModal";
import SettingsModal from "../components/modals/SettingsModal";
import TaskInputModal from "../components/modals/TaskInputModal";
import NotesModal from "../components/modals/NotesModal";
import SubjectsScreen from "./SubjectsScreen";
import FlipDeviceOverlay from "../components/FlipDeviceOverlay";
import AddCustomTaskModal from "../components/modals/AddCustomTaskModal";
import EditTaskModal from "../components/modals/EditTaskModal";

// Notes type
interface Note {
  id: string;
  title: string;
  content: string;
  createdAt?: number;
  updatedAt?: number;
  pinned?: boolean;
  userId: string;
  taskId?: string | null;
  duration?: number; // Pomodoro duration in seconds
  imageUrl?: string; // URL to the image associated with the note
}

// Normalize Firestore Timestamp/number to millis
const toMillis = (val: any): number | undefined => {
  if (!val) return undefined;
  if (typeof val === "number") return val;
  if (typeof val.toMillis === "function") return val.toMillis();
  if (typeof val.toDate === "function") return val.toDate().getTime();
  return undefined;
};

// BACKGROUND TASK PLACEHOLDER
const registerTimerTask = async () => {
  console.log("Background timer task registered.");
};

// FIRESTORE: Create initial user document
const createInitialUserDocument = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(
      userRef,
      {
        streak: 1,
        lastActive: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Failed to create user document:", error);
  }
};

// Helper function to check task achievements on load (silently, without notifications)
const checkTaskAchievementsOnLoad = async (userId: string, completedTasksCount: number) => {
  try {
    const { checkTasksCompletedAchievements } = require("../utils/achievements");
    
    // Silently check and unlock achievements without showing notifications
    await checkTasksCompletedAchievements(userId, completedTasksCount);
    console.log(`✅ Checked task achievements on load: ${completedTasksCount} tasks completed`);
  } catch (error) {
    console.error("❌ Failed to check task achievements on load:", error);
  }
};

// FIRESTORE: Update streak logic
const updateStreak = async (userId: string): Promise<number> => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const newActiveTimestamp = serverTimestamp();

    if (!userSnap.exists()) {
      await setDoc(userRef, { 
        streak: 1, 
        lastActive: newActiveTimestamp,
        activeDays: [todayStr],
        streakStartDate: todayStr
      });
      return 1;
    }

    const data = userSnap.data();
    const lastActive = data?.lastActive?.toDate
      ? data.lastActive.toDate()
      : null;
    let streak = data?.streak || 0;
    let activeDays = (data?.activeDays || []) as string[];
    let streakStartDate = data?.streakStartDate || todayStr;

    // Check if today is already recorded
    if (activeDays.includes(todayStr)) {
      // User already visited today, no changes needed
      return streak;
    }

    if (!lastActive) {
      await updateDoc(userRef, { 
        streak: 1, 
        lastActive: newActiveTimestamp,
        activeDays: [todayStr],
        streakStartDate: todayStr
      });
      return 1;
    }

    const yesterday = new Date(today.getTime());
    yesterday.setDate(yesterday.getDate() - 1);
    const lastActiveDay = new Date(lastActive.getTime());
    lastActiveDay.setHours(0, 0, 0, 0);

    if (lastActiveDay.getTime() === yesterday.getTime()) {
      // Case A: User visited YESTERDAY. Streak continues!
      streak += 1;
      activeDays = [...activeDays, todayStr];
    } else if (lastActiveDay.getTime() < yesterday.getTime()) {
      // Case B: User skipped at least one full day. Streak reset.
      streak = 1;
      // Start new streak, keep only today
      activeDays = [todayStr];
      streakStartDate = todayStr;
    }
    // If lastActiveDay is today, this shouldn't happen due to the check above

    await updateDoc(userRef, { 
      streak, 
      lastActive: newActiveTimestamp,
      activeDays,
      streakStartDate
    });
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

  // --- UI/Auth State ---
  const [user, setUser] = useState<User | null>(null);
  const [activeScreen, setActiveScreen] = useState<ScreenName>("Timer");
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTaskInputModal, setShowTaskInputModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
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
      const settings = await loadSettings();
      setInitialTime((settings.duration || DEFAULT_MINUTES) * 60);
      setIsSoundOn(settings.isSoundOn ?? true);
      setIsVibrationOn(settings.isVibrationOn ?? true);
      setSelectedSound(settings.selectedSound || SOUND_PRESETS[0]);
      
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
  const handleTimerCompletion = async () => {
    if (isActive) setIsActive(false);
    AsyncStorage.removeItem(TIMER_END_TIME_KEY).catch(() => {});
    AsyncStorage.removeItem(TIMER_STATUS_KEY).catch(() => {});
    cancelTimerNotification();

    const completedAt = Date.now();
    const taskTitle = currentTask?.title || "Pomodoro Session";
    const duration = initialTime / 60; // store as minutes
    const taskSubjectId = currentTask?.subjectId; // Capture subjectId early
    
    console.log('🎯 Timer completed with task:', { 
      taskTitle, 
      subjectId: taskSubjectId,
      hasCurrentTask: !!currentTask 
    });

    // Do NOT upload anything yet. We will open the image modal and let the
    // user choose an image, then perform upload from there to avoid Blob issues.

    // Mark current task as completed in Firestore
    if (currentTask && user) {
      try {
        const taskRef = doc(db, "tasks", currentTask.id);
        await updateDoc(taskRef, {
          status: "completed",
          completedAt,
        });
        console.log("✅ Task marked as completed in Firestore");

        // Update local state immediately for better UX
        setCurrentTask((prev) =>
          prev ? { ...prev, status: "completed", completedAt } : null
        );

        // Calculate total completed tasks for achievement checking
        const totalCompletedTasks = tasks.filter(t => t.status === "completed").length + 1; // +1 for the current task

        // Check for task completion achievements
        try {
          const { checkTasksCompletedAchievements } = require("../utils/achievements");
          const { showMultipleAchievementNotifications } = require("../utils/achievementNotification");

          const newTaskAchievements = await checkTasksCompletedAchievements(
            user.uid,
            totalCompletedTasks
          );

          if (newTaskAchievements.length > 0) {
            console.log(`🏆 Showing ${newTaskAchievements.length} new task achievements`);
            await showMultipleAchievementNotifications(newTaskAchievements);
          }
        } catch (error) {
          console.error("❌ Failed to check task achievements:", error);
        }

        // Clear current task after a brief delay to show completion status
        setTimeout(() => {
          setCurrentTask(null);
        }, 1000);
      } catch (error) {
        console.error("❌ Failed to update task in Firestore:", error);
      }
    }

    // Trigger sensory feedback
    if (isSoundOn) {
      playCompletionSound(selectedSound);
    }
    if (isVibrationOn) {
      Vibration.vibrate([1000, 500, 1000, 500, 1000]);
    }

    // Update streak
    if (user) {
      const newStreak = await updateStreak(user.uid);
      setStreak(newStreak);
      
      // Check for achievements after streak update
      try {
        const {
          checkStreakAchievements,
          checkFocusTimeAchievements,
        } = require("../utils/achievements");
        const {
          showMultipleAchievementNotifications,
        } = require("../utils/achievementNotification");

        // Check for streak and focus time achievements
        const newStreakAchievements = await checkStreakAchievements(user.uid, newStreak);
        const newFocusAchievements = await checkFocusTimeAchievements(
          user.uid,
          totalFocusMinutes || 0
        );

        // Combine all new achievements
        const allNewAchievements = [...newStreakAchievements, ...newFocusAchievements];

        if (allNewAchievements.length > 0) {
          console.log(`🏆 Showing ${allNewAchievements.length} new achievements after session completion`);
          showMultipleAchievementNotifications(allNewAchievements);
        }
      } catch (err) {
        console.error("Failed to check achievements after session completion:", err);
      }
    }

    // Save session data for modals
    setCompletedSession({
      taskTitle,
      duration,
      completedAt,
      subjectId: taskSubjectId,
    });
    
    console.log('💾 Saved completed session with subjectId:', taskSubjectId);

    // Show image modal first
    setShowImageModal(true);
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
        const updatedStreak = await updateStreak(currentUser.uid);
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
      await createInitialUserDocument(userCredential.user.uid);
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

  // Removed Expo hook response handler

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

  const handleStartPause = async () => {
    if (!user) {
      setShowAuthModal(true);
      Alert.alert(
        "Sign In Required",
        "Please sign in to start your Pomodoro session."
      );
      return;
    }

    const newActiveState = !isActive;

    // If starting timer, show task input modal
    if (newActiveState && !currentTask) {
      setShowTaskInputModal(true);
      return;
    }

    setIsActive(newActiveState);

    if (newActiveState) {
      const endTime = Date.now() + seconds * 1000;
      await AsyncStorage.setItem(TIMER_END_TIME_KEY, String(endTime));
      await AsyncStorage.setItem(TIMER_STATUS_KEY, "active");

      // Schedule completion notification
      const notificationId = await scheduleTimerCompletionNotification(
        seconds,
        currentTask?.title
      );
      setCompletionNotificationId(notificationId);

      // Update current task status to active in Firestore
      if (currentTask) {
        try {
          const taskRef = doc(db, "tasks", currentTask.id);
          await updateDoc(taskRef, { status: "active" });
          console.log("✅ Task status updated to active");

          // Update local state immediately for better UX
          setCurrentTask((prev) =>
            prev ? { ...prev, status: "active" } : null
          );
        } catch (error) {
          console.error("❌ Failed to update task status:", error);
        }
      }
    } else {
      await AsyncStorage.removeItem(TIMER_END_TIME_KEY);
      await AsyncStorage.setItem(TIMER_STATUS_KEY, "paused");
      cancelTimerNotification();
      
      // Cancel completion notification when paused
      await cancelTimerCompletionNotification(completionNotificationId);
      setCompletionNotificationId(null);

      // Update current task status to pending in Firestore
      if (currentTask) {
        try {
          const taskRef = doc(db, "tasks", currentTask.id);
          await updateDoc(taskRef, { status: "pending" });
          console.log("✅ Task status updated to pending");

          // Update local state immediately for better UX
          setCurrentTask((prev) =>
            prev ? { ...prev, status: "pending" } : null
          );
        } catch (error) {
          console.error("❌ Failed to update task status:", error);
        }
      }
    }
  };

  const handleTaskSave = async (taskTitle: string, subjectId?: string) => {
    setShowTaskInputModal(false);

    if (!taskTitle) {
      // User skipped, start timer without task
      setIsActive(true);
      const endTime = Date.now() + seconds * 1000;
      await AsyncStorage.setItem(TIMER_END_TIME_KEY, String(endTime));
      await AsyncStorage.setItem(TIMER_STATUS_KEY, "active");
      return;
    }

    if (!user) return;

    // Create new task in Firestore with "active" status immediately
    // This ensures flip timeout will always find the task in "active" state
    const newTask: any = {
      title: taskTitle,
      duration: initialTime / 60,
      createdAt: Date.now(),
      status: "active", // Start as active since timer starts immediately
      userId: user.uid,
    };

    // Only add subjectId if it exists (Firebase doesn't accept undefined)
    if (subjectId) {
      newTask.subjectId = subjectId;
    }

    try {
      const tasksRef = collection(db, "tasks");
      const docRef = doc(tasksRef);
      await setDoc(docRef, newTask);
      console.log("✅ Task saved to Firestore with active status");

      // Create the full task object with the generated ID
      const fullTask: Task = {
        ...newTask,
        id: docRef.id,
      };

      // Set current task immediately with active status
      setCurrentTask(fullTask);

      // Start timer immediately
      setIsActive(true);
      const endTime = Date.now() + seconds * 1000;
      await AsyncStorage.setItem(TIMER_END_TIME_KEY, String(endTime));
      await AsyncStorage.setItem(TIMER_STATUS_KEY, "active");
      
      console.log("✅ Timer started with task in active status");
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
  const handleAddCustomTask = async (title: string, duration: number, subjectId?: string) => {
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
          />
        );
      case "Notes":
        return (
          <NotesContent
            onOpenProfile={() => setShowProfileModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenAppearance={() => setShowAppearanceModal(true)}
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
              onPress={() => setShowAppearanceModal(true)}
              style={{ marginRight: 16 }}
            >
              <Ionicons
                name="color-palette"
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
            <TouchableOpacity
              onPress={() => setShowProfileModal(true)}
              style={{ marginRight: 16 }}
            >
              {user?.photoURL ? (
                <Image
                  source={{ uri: user.photoURL }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.8)",
                  }}
                />
              ) : (
                <Ionicons
                  name="person-circle-outline"
                  size={28}
                  color="white"
                />
              )}
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
          />
        )}
      </View>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <NavButton
          icon="timer-outline"
          label="Timer"
          active={activeScreen === "Timer"}
          onPress={setActiveScreen}
        />
        <NavButton
          icon="document-text-outline"
          label="Notes"
          active={activeScreen === "Notes"}
          onPress={setActiveScreen}
        />
        <NavButton
          icon="flash-outline"
          label="Flashcards"
          active={activeScreen === "Flashcards"}
          onPress={setActiveScreen}
        />
        <NavButton
          icon="checkbox-outline"
          label="Tasks"
          active={activeScreen === "Tasks"}
          onPress={setActiveScreen}
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
                  editable={!isLoading}
                />
              </>
            )}

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isLoading}
            />
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

      {/* Appearance Modal */}
      {showAppearanceModal && (
        <Modal
          visible={showAppearanceModal}
          animationType="slide"
          onRequestClose={() => setShowAppearanceModal(false)}
        >
          <AppearanceScreen
            onClose={() => setShowAppearanceModal(false)}
            currentThemeId={currentTheme.id}
            onThemeChange={(themeId) => {
              const newTheme = getThemeById(themeId);
              setCurrentTheme(newTheme);
            }}
          />
        </Modal>
      )}
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
});
