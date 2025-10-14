import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  Dimensions,
  AppState,
  AppStateStatus,
  Vibration,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";

// --- START Local Integration Imports ---
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
// --- END Local Integration Imports ---

// Firebase imports
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  onSnapshot,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// --- GLOBAL CONSTANTS & TYPES ---
type ScreenName = "Timer" | "Notes" | "Flashcards" | "Tasks";
const SCREEN_HEIGHT = Dimensions.get("window").height;
const AUTH_MODAL_HEIGHT = SCREEN_HEIGHT * 0.6;

// Task interface
interface Task {
  id: string;
  title: string;
  duration: number; // in minutes
  createdAt: number;
  completedAt?: number;
  status: "active" | "completed" | "pending";
  userId: string;
}

// --- Helper: Timer Storage Keys (Only for timer state, not tasks) ---
const TIMER_END_TIME_KEY = "@pomodoro_end_time";
const TIMER_STATUS_KEY = "@pomodoro_status";
const SETTINGS_KEY = "@user_settings";
const PERSISTENT_NOTIFICATION_ID = "timer-notification-id";

// --- Constants: Sound Presets ---
const SOUND_PRESETS = [
  "Chime (Default)",
  "Bell Tone",
  "Zen Gong",
  "Digital Alarm",
];
type SoundPreset = (typeof SOUND_PRESETS)[number];

// ⭐ LOCAL SOUND MAP
const SOUND_MAP: Record<SoundPreset, any> = {
  "Chime (Default)": require("../assets/sounds/chime.mp3"),
  "Bell Tone": require("../assets/sounds/bell.mp3"),
  "Zen Gong": require("../assets/sounds/gong.mp3"),
  "Digital Alarm": require("../assets/sounds/alarm.mp3"),
};

// --- CORE UTILITY FUNCTIONS ---

// AUDIO PLAYBACK FUNCTION
const playCompletionSound = async (soundName: SoundPreset) => {
  try {
    const soundSource = SOUND_MAP[soundName];

    const { sound } = await Audio.Sound.createAsync(soundSource, {
      shouldPlay: true,
      isLooping: false,
    });

    await sound.playAsync();

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (error) {
    console.error(`Failed to play sound (${soundName}):`, error);
  }
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

// FIRESTORE: Update streak logic
const updateStreak = async (userId: string): Promise<number> => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newActiveTimestamp = serverTimestamp();

    if (!userSnap.exists()) {
      await setDoc(userRef, { streak: 1, lastActive: newActiveTimestamp });
      return 1;
    }

    const data = userSnap.data();
    const lastActive = data?.lastActive?.toDate
      ? data.lastActive.toDate()
      : null;
    let streak = data?.streak || 0;

    if (!lastActive) {
      await updateDoc(userRef, { streak: 1, lastActive: newActiveTimestamp });
      return 1;
    }

    const yesterday = new Date(today.getTime());
    yesterday.setDate(yesterday.getDate() - 1);
    const lastActiveDay = new Date(lastActive.getTime());
    lastActiveDay.setHours(0, 0, 0, 0);

    if (lastActiveDay.getTime() === today.getTime()) {
      // Case A: User already logged in TODAY.
    } else if (lastActiveDay.getTime() === yesterday.getTime()) {
      // Case B: User logged in YESTERDAY. Streak continues!
      streak += 1;
    } else {
      // Case C: User skipped at least one full day. Streak reset.
      streak = 1;
    }

    await updateDoc(userRef, { streak, lastActive: newActiveTimestamp });
    return streak;
  } catch (error) {
    console.error("Streak error:", error);
    return 0;
  }
};

// --- NOTIFICATION UTILITY FUNCTIONS ---

// Helper to format remaining time for notification body
const formatTimeForNotification = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

// Function to schedule/update the persistent timer notification
const scheduleTimerNotification = async (remainingSeconds: number, taskTitle?: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(
      PERSISTENT_NOTIFICATION_ID
    );

    if (remainingSeconds <= 0) return;

    const timeText = formatTimeForNotification(remainingSeconds);
    const taskText = taskTitle ? ` - ${taskTitle}` : '';
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🍅 Pomodoro Timer - ${timeText}`,
        body: `Keep focused! ${timeText} remaining${taskText}`,
        sound: undefined,
        priority: Notifications.AndroidNotificationPriority.LOW,
        sticky: true,
        categoryIdentifier: 'timer',
        data: {
          remainingSeconds,
          taskTitle: taskTitle || null,
        },
      },
      trigger: null,
      identifier: PERSISTENT_NOTIFICATION_ID,
    });
  } catch (error) {
    console.warn("⚠️ Notification scheduling failed (this is normal in Expo Go):", error);
    // Silently fail in Expo Go, notifications will work in development builds
  }
};

const cancelTimerNotification = async () => {
  try {
    await Notifications.cancelScheduledNotificationAsync(
      PERSISTENT_NOTIFICATION_ID
    );
  } catch (error) {
    console.warn("⚠️ Notification cancellation failed (this is normal in Expo Go):", error);
  }
};

// --- COMPONENT DEFINITIONS ---

// Nav Button
interface NavButtonProps {
  icon: string;
  label: ScreenName;
  active: boolean;
  onPress: (screen: ScreenName) => void;
}

const NavButton: React.FC<NavButtonProps> = ({
  icon,
  label,
  active,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.navItem, active && styles.navItemActive]}
    onPress={() => onPress(label)}
  >
    <Ionicons
      name={active ? (icon.replace("-outline", "") as any) : (icon as any)}
      size={24}
      color="white"
    />
    <Text style={styles.navText}>{label}</Text>
  </TouchableOpacity>
);

// Profile Modal
interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => Promise<void>;
  streak: number;
}
const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
  user,
  onLogout,
  streak,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.profileModalOverlay}>
        <View style={styles.profileModalContainer}>
          <View style={styles.profileModalHeader}>
            <Text style={styles.profileModalTitle}>User Profile</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileDetail}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#4F46E5"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.profileText}>
              Email: {user?.email || "N/A"}
            </Text>
          </View>

          <View style={styles.profileDetail}>
            <Ionicons
              name="person-outline"
              size={20}
              color="#4F46E5"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.profileText}>
              User ID: {user?.uid.substring(0, 10)}...
            </Text>
          </View>

          <View style={styles.profileDetail}>
            <Ionicons
              name="flame-outline"
              size={20}
              color="#FF6347"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.profileText}>Streak: {streak} days</Text>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <Ionicons
              name="log-out-outline"
              size={20}
              color="white"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Settings Modal
interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  initialMinutes: number;
  onSaveMinutes: (newMinutes: number) => void;
  isSoundOn: boolean;
  isVibrationOn: boolean;
  selectedSound: SoundPreset;
  onToggleSound: (value: boolean) => void;
  onToggleVibration: (value: boolean) => void;
  onSelectSound: (sound: SoundPreset) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  initialMinutes,
  onSaveMinutes,
  isSoundOn,
  isVibrationOn,
  selectedSound,
  onToggleSound,
  onToggleVibration,
  onSelectSound,
}) => {
  const [minutesInput, setMinutesInput] = useState(String(initialMinutes));
  const [showSoundOptions, setShowSoundOptions] = useState(false);

  useEffect(() => {
    setMinutesInput(String(initialMinutes));
  }, [initialMinutes]);

  const handleSave = () => {
    const newMinutes = parseInt(minutesInput, 10);
    if (isNaN(newMinutes) || newMinutes < 1 || newMinutes > 60) {
      Alert.alert(
        "Invalid Time",
        "Please enter a study duration between 1 and 60 minutes."
      );
      return;
    }
    onSaveMinutes(newMinutes);
    onClose();
  };

  const renderToggleButton = (
    active: boolean,
    color: string,
    activeIcon: string,
    inactiveIcon: string,
    onPress: () => void
  ) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.toggleBase, { backgroundColor: active ? color : "#ccc" }]}
    >
      <Ionicons
        name={active ? (activeIcon as any) : (inactiveIcon as any)}
        size={20}
        color="white"
      />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.profileModalOverlay}>
        <View style={styles.settingsModalContainer}>
          <View style={styles.profileModalHeader}>
            <Text style={styles.profileModalTitle}>Timer Settings</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={styles.settingsLabel}>
            Pomodoro Duration (1 - 60 minutes)
          </Text>
          <TextInput
            style={styles.settingsInput}
            value={minutesInput}
            onChangeText={(text) =>
              setMinutesInput(text.replace(/[^0-9]/g, ""))
            }
            keyboardType="number-pad"
            placeholder="e.g., 25"
            maxLength={2}
          />

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Turn on sound when time's up</Text>
            {renderToggleButton(
              isSoundOn,
              "#9333ea",
              "volume-medium",
              "volume-mute",
              () => onToggleSound(!isSoundOn)
            )}
          </View>

          {isSoundOn && (
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Sound Preset:</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowSoundOptions(true)}
              >
                <Text style={styles.pickerText}>{selectedSound}</Text>
                <Ionicons name="chevron-down" size={20} color="#333" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>
              Turn on vibration when time's up
            </Text>
            {renderToggleButton(
              isVibrationOn,
              "#0e7490",
              "phone-portrait",
              "phone-portrait-outline",
              () => onToggleVibration(!isVibrationOn)
            )}
          </View>

          <TouchableOpacity
            style={styles.settingsSaveButton}
            onPress={handleSave}
          >
            <Text style={styles.logoutButtonText}>Save & Apply</Text>
          </TouchableOpacity>

          <Modal
            visible={showSoundOptions}
            transparent
            animationType="slide"
            onRequestClose={() => setShowSoundOptions(false)}
          >
            <View style={styles.pickerModalOverlay}>
              <View style={styles.pickerModalContainer}>
                <Text style={styles.pickerModalTitle}>Select Sound</Text>
                {SOUND_PRESETS.map((sound) => (
                  <TouchableOpacity
                    key={sound}
                    style={getPickerOptionStyle(selectedSound === sound)}
                    onPress={() => {
                      onSelectSound(sound as SoundPreset);
                      setShowSoundOptions(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{sound}</Text>
                    {selectedSound === sound && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#9333ea"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
};

// Timer Content
interface TimerContentProps {
  formatTime: (sec: number) => string;
  seconds: number;
  handleStartPause: () => void;
  isActive: boolean;
  handleReset: () => void;
  isLoading: boolean;
  totalTime: number;
  progressPercentage: number;
  currentTask: Task | null;
  onEditTask: () => void;
}

const TimerContent: React.FC<TimerContentProps> = ({
  formatTime,
  seconds,
  handleStartPause,
  isActive,
  handleReset,
  isLoading,
  progressPercentage,
  currentTask,
  onEditTask,
}) => {
  const rotationAngle = (progressPercentage / 100) * 360;
  const isOverHalf = progressPercentage > 50;

  const rightHalfRotation = isOverHalf ? 180 : rotationAngle;
  const leftHalfRotation = rotationAngle - 180;

  return (
    <View style={styles.centerContent}>
      {currentTask && (
        <View style={styles.currentTaskContainer}>
          <View style={styles.currentTaskHeader}>
            <Text style={styles.currentTaskLabel}>Current Task:</Text>
            <TouchableOpacity onPress={onEditTask}>
              <Ionicons name="create-outline" size={18} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.currentTaskTitle}>{currentTask.title}</Text>
        </View>
      )}

      <View style={styles.timerCircleBase}>
        <View style={styles.timerProgressContainer}>
          <View
            style={[
              styles.timerCircleRight,
              { transform: [{ rotate: `${rightHalfRotation}deg` }] },
            ]}
          />

          {isOverHalf && (
            <View
              style={[
                styles.timerCircleLeft,
                { transform: [{ rotate: `${leftHalfRotation}deg` }] },
              ]}
            />
          )}
        </View>

        <View style={styles.timerCircleContent}>
          <Text style={styles.timerText}>{formatTime(seconds)}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", marginTop: 40 }}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartPause}
          disabled={isLoading}
        >
          <Text style={styles.startButtonText}>
            {isActive ? "Pause" : "Start"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
          disabled={isLoading}
        >
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const NotesContent: React.FC = () => (
  <View style={styles.centerContent}>
    <Ionicons name="document-text" size={64} color="rgba(255,255,255,0.4)" />
    <Text style={styles.placeholderText}>Notes Screen</Text>
    <Text style={styles.placeholderSubText}>Write down your ideas here.</Text>
  </View>
);

const FlashcardsContent: React.FC = () => (
  <View style={styles.centerContent}>
    <Ionicons name="flash" size={64} color="rgba(255,255,255,0.4)" />
    <Text style={styles.placeholderText}>Flashcards Screen</Text>
    <Text style={styles.placeholderSubText}>Study mode activated!</Text>
  </View>
);

// Task Input Modal
interface TaskInputModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (taskTitle: string) => void;
}

const TaskInputModal: React.FC<TaskInputModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const [taskTitle, setTaskTitle] = useState("");

  const handleSave = () => {
    if (taskTitle.trim()) {
      onSave(taskTitle.trim());
      setTaskTitle("");
    } else {
      Alert.alert("Error", "Please enter a task title");
    }
  };

  const handleSkip = () => {
    onSave("");
    setTaskTitle("");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.profileModalOverlay}>
        <View style={styles.taskInputModalContainer}>
          <View style={styles.profileModalHeader}>
            <Text style={styles.profileModalTitle}>Set Your Task</Text>
            <TouchableOpacity onPress={handleSkip} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={styles.taskInputLabel}>
            What will you focus on during this session?
          </Text>

          <TextInput
            style={styles.taskInput}
            placeholder="e.g., Study React Native, Read Chapter 5..."
            value={taskTitle}
            onChangeText={setTaskTitle}
            multiline
            maxLength={100}
            autoFocus
          />

          <View style={styles.taskInputButtons}>
            <TouchableOpacity
              style={styles.taskSkipButton}
              onPress={handleSkip}
            >
              <Text style={styles.taskSkipButtonText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.taskSaveButton}
              onPress={handleSave}
            >
              <Text style={styles.logoutButtonText}>Start Timer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Tasks Content Screen
interface TasksContentProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  currentTaskId: string | null;
}

const TasksContent: React.FC<TasksContentProps> = ({
  tasks,
  onEditTask,
  onDeleteTask,
  currentTaskId,
}) => {
  const sortedTasks = [...tasks].sort((a, b) => b.createdAt - a.createdAt);
  
  console.log("🎯 TasksContent received tasks:", tasks.length);
  console.log("🎯 Sorted tasks:", sortedTasks);

  return (
    <View style={styles.tasksContainer}>
      <Text style={styles.tasksTitle}>Your Tasks</Text>
      
      {/* Debug Info - Remove this after fixing */}
      {__DEV__ && (
        <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, marginBottom: 10, borderRadius: 8 }}>
          <Text style={{ color: 'white', fontSize: 12 }}>
            Debug: {tasks.length} tasks total, {sortedTasks.length} sorted
          </Text>
          <Text style={{ color: 'white', fontSize: 10 }}>
            Current Task ID: {currentTaskId || 'none'}
          </Text>
        </View>
      )}
      
      {sortedTasks.length === 0 ? (
        <View style={styles.emptyTasksContainer}>
          <Ionicons
            name="checkbox-outline"
            size={64}
            color="rgba(255,255,255,0.4)"
          />
          <Text style={styles.placeholderText}>No tasks yet</Text>
          <Text style={styles.placeholderSubText}>
            Start a timer to create your first task
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.tasksList}>
          {sortedTasks.map((task) => (
            <View
              key={task.id}
              style={[
                styles.taskCard,
                task.id === currentTaskId && styles.taskCardActive,
              ]}
            >
              <View style={styles.taskCardHeader}>
                <View style={styles.taskCardTitleRow}>
                  <Ionicons
                    name={
                      task.status === "completed"
                        ? "checkmark-circle"
                        : task.status === "active"
                        ? "timer"
                        : "ellipse-outline"
                    }
                    size={20}
                    color={
                      task.status === "completed"
                        ? "#10b981"
                        : task.status === "active"
                        ? "#9333ea"
                        : "#94a3b8"
                    }
                  />
                  <Text style={styles.taskCardTitle}>{task.title}</Text>
                </View>
                <TouchableOpacity onPress={() => onDeleteTask(task.id)}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
              <View style={styles.taskCardDetails}>
                <Text style={styles.taskCardDuration}>{task.duration} min</Text>
                <Text style={styles.taskCardStatus}>
                  {task.status === "completed"
                    ? "Completed"
                    : task.status === "active"
                    ? "In Progress"
                    : "Pending"}
                </Text>
              </View>
              <Text style={styles.taskCardDate}>
                {new Date(task.createdAt).toLocaleDateString()} at{" "}
                {new Date(task.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

// --- Main TimerScreen ---
export default function TimerScreen() {
  // --- Timer State ---
  const DEFAULT_MINUTES = 25;
  const [initialTime, setInitialTime] = useState(DEFAULT_MINUTES * 60);
  const [seconds, setSeconds] = useState(initialTime);
  const [isActive, setIsActive] = useState(false);

  // --- Settings State ---
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [isVibrationOn, setIsVibrationOn] = useState(true);
  const [selectedSound, setSelectedSound] = useState<SoundPreset>(
    SOUND_PRESETS[0]
  );

  // --- UI/Auth State ---
  const [user, setUser] = useState<User | null>(null);
  const [activeScreen, setActiveScreen] = useState<ScreenName>("Timer");
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTaskInputModal, setShowTaskInputModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [streak, setStreak] = useState(0);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // --- Task State (from Firestore) ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // AppState ref
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const scheduledNotificationId = useRef<string | null>(null);

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
          setSeconds(0);
          await handleTimerCompletion();
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
    const loadSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
        if (storedSettings) {
          const settings = JSON.parse(storedSettings);
          setInitialTime((settings.duration || DEFAULT_MINUTES) * 60);
          setIsSoundOn(settings.isSoundOn ?? true);
          setIsVibrationOn(settings.isVibrationOn ?? true);
          setSelectedSound(settings.selectedSound || SOUND_PRESETS[0]);
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    };
    loadSettings();

    // Request notification permissions and setup categories
    (async () => {
      try {
        const settings = await Notifications.getPermissionsAsync();
        if (settings.granted === false) {
          await Notifications.requestPermissionsAsync();
        }

        // Set up notification categories with actions (iOS)
        if (Platform.OS === 'ios') {
          await Notifications.setNotificationCategoryAsync('timer', [
            {
              identifier: 'pause',
              buttonTitle: 'Pause',
              options: {
                opensAppToForeground: false,
              },
            },
            {
              identifier: 'stop',
              buttonTitle: 'Stop',
              options: {
                opensAppToForeground: false,
                isDestructive: true,
              },
            },
          ]);
        }
      } catch (error) {
        console.warn("⚠️ Notification setup failed (this is normal in Expo Go):", error);
      }
    })();
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
      // Note: orderBy with where might require composite index
      // We'll sort in the client instead
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

        // Find active task
        const activeTask = fetchedTasks.find((t) => t.status === "active");
        if (activeTask) {
          setCurrentTask(activeTask);
        } else if (currentTask && !fetchedTasks.find(t => t.id === currentTask.id)) {
          setCurrentTask(null);
        }
      },
      (error) => {
        console.error("❌ Error listening to tasks:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const saveSettings = async () => {
    const settings = {
      duration: initialTime / 60,
      isSoundOn,
      isVibrationOn,
      selectedSound,
    };
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  };

  useEffect(() => {
    saveSettings();
  }, [initialTime, isSoundOn, isVibrationOn, selectedSound]);

  // --- Core Timer Functionality ---

  const handleTimerCompletion = async () => {
    if (isActive) setIsActive(false);
    AsyncStorage.removeItem(TIMER_END_TIME_KEY).catch(() => {});
    AsyncStorage.removeItem(TIMER_STATUS_KEY).catch(() => {});
    cancelTimerNotification();

    // Mark current task as completed in Firestore
    if (currentTask && user) {
      try {
        const taskRef = doc(db, "tasks", currentTask.id);
        await updateDoc(taskRef, {
          status: "completed",
          completedAt: Date.now(),
        });
        console.log("✅ Task marked as completed in Firestore");
        
        // Update local state immediately for better UX
        setCurrentTask(prev => prev ? { ...prev, status: "completed", completedAt: Date.now() } : null);
        
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
      Alert.alert("Timer Done!", `Playing sound: ${selectedSound}`);
    }
    if (isVibrationOn) {
      Vibration.vibrate([1000, 500, 1000, 500, 1000]);
    }

    // Update streak
    if (user) {
      const newStreak = await updateStreak(user.uid);
      setStreak(newStreak);
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
            
          if (shouldUpdateNotification) {
            scheduleTimerNotification(newSeconds, currentTask?.title);
          }
          
          return newSeconds;
        });
      }, 1000);

      // Initial notification
      scheduleTimerNotification(seconds, currentTask?.title);
    } else if (seconds === 0) {
      if (isActive) handleTimerCompletion();
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
      } else setShowAuthModal(true);
    });
    return () => unsubscribe();
  }, []);

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

  const performGoogleSignInMobile = async (): Promise<string> => {
    return "";
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const idToken = await performGoogleSignInMobile();
      if (!idToken) {
        throw new Error("Google Sign-In failed or ID Token not received.");
      }
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      await createInitialUserDocument(result.user.uid);
      Alert.alert("Success", "Google Login successful!");
    } catch (error) {
      if (
        (error as Error).message !==
        "Google Sign-In failed or ID Token not received."
      ) {
        Alert.alert("Error", (error as Error).message);
      } else {
        Alert.alert(
          "Error",
          "Google Sign-In requires local SDK setup (ID Token missing)."
        );
      }
    } finally {
      setIsLoading(false);
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

      // Update current task status to active in Firestore
      if (currentTask) {
        try {
          const taskRef = doc(db, "tasks", currentTask.id);
          await updateDoc(taskRef, { status: "active" });
          console.log("✅ Task status updated to active");
          
          // Update local state immediately for better UX
          setCurrentTask(prev => prev ? { ...prev, status: "active" } : null);
        } catch (error) {
          console.error("❌ Failed to update task status:", error);
        }
      }
    } else {
      await AsyncStorage.removeItem(TIMER_END_TIME_KEY);
      await AsyncStorage.setItem(TIMER_STATUS_KEY, "paused");
      cancelTimerNotification();

      // Update current task status to pending in Firestore
      if (currentTask) {
        try {
          const taskRef = doc(db, "tasks", currentTask.id);
          await updateDoc(taskRef, { status: "pending" });
          console.log("✅ Task status updated to pending");
          
          // Update local state immediately for better UX
          setCurrentTask(prev => prev ? { ...prev, status: "pending" } : null);
        } catch (error) {
          console.error("❌ Failed to update task status:", error);
        }
      }
    }
  };

  const handleTaskSave = async (taskTitle: string) => {
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

    // Create new task in Firestore
    const newTask: Omit<Task, "id"> = {
      title: taskTitle,
      duration: initialTime / 60,
      createdAt: Date.now(),
      status: "pending", // Start as pending, will become active when timer starts
      userId: user.uid,
    };

    try {
      const tasksRef = collection(db, "tasks");
      const docRef = doc(tasksRef);
      await setDoc(docRef, newTask);
      console.log("✅ Task saved to Firestore");

      // Create the full task object with the generated ID
      const fullTask: Task = {
        ...newTask,
        id: docRef.id,
      };

      // Set current task immediately for better UX
      setCurrentTask(fullTask);

      // Update task status to active and start timer
      try {
        await updateDoc(doc(db, "tasks", docRef.id), { status: "active" });
        console.log("✅ Task status updated to active");
        
        // Update local state immediately for better UX
        setCurrentTask(prev => prev ? { ...prev, status: "active" } : null);
      } catch (statusError) {
        console.error("❌ Failed to update task status:", statusError);
      }

      // Start timer
      setIsActive(true);
      const endTime = Date.now() + seconds * 1000;
      await AsyncStorage.setItem(TIMER_END_TIME_KEY, String(endTime));
      await AsyncStorage.setItem(TIMER_STATUS_KEY, "active");
    } catch (error) {
      console.error("❌ Failed to save task to Firestore:", error);
      Alert.alert("Error", "Failed to save task. Please try again.");
    }
  };

  const handleEditCurrentTask = () => {
    if (!currentTask || !user) return;

    Alert.prompt(
      "Edit Task",
      "Update your task title:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async (newTitle?: string) => {
            if (newTitle && newTitle.trim()) {
              try {
                const taskRef = doc(db, "tasks", currentTask.id);
                await updateDoc(taskRef, { title: newTitle.trim() });
                console.log("✅ Task updated in Firestore");
              } catch (error) {
                console.error("❌ Failed to update task:", error);
                Alert.alert("Error", "Failed to update task.");
              }
            }
          },
        },
      ],
      "plain-text",
      currentTask.title
    );
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
            setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
            
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

  const handleReset = async () => {
    setIsActive(false);
    setSeconds(initialTime);
    await AsyncStorage.removeItem(TIMER_END_TIME_KEY);
    await AsyncStorage.removeItem(TIMER_STATUS_KEY);
    cancelTimerNotification();

    // Update current task to pending in Firestore
    if (currentTask && user) {
      try {
        const taskRef = doc(db, "tasks", currentTask.id);
        await updateDoc(taskRef, { status: "pending" });
        console.log("✅ Task reset in Firestore");
        
        // Update local state immediately for better UX
        setCurrentTask(prev => prev ? { ...prev, status: "pending" } : null);
      } catch (error) {
        console.error("❌ Failed to reset task:", error);
      }
    } else {
      setCurrentTask(null);
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
          />
        );
      case "Notes":
        return <NotesContent />;
      case "Flashcards":
        return <FlashcardsContent />;
      case "Tasks":
        return (
          <TasksContent
            tasks={tasks}
            onEditTask={(task) => setEditingTask(task)}
            onDeleteTask={handleDeleteTask}
            currentTaskId={currentTask?.id || null}
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
          />
        );
    }
  };

  return (
    <LinearGradient colors={["#6A85B6", "#BAC8E0"]} style={{ flex: 1 }}>
      {/* Top Bar */}
      <>
        <View
          style={{
            position: "absolute",
            top: 48,
            left: 24,
            flexDirection: "row",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          <Ionicons name="flame" size={20} color="#FF6347" />
          <Text style={{ color: "white", fontWeight: "600", marginLeft: 8 }}>
            Streak: {streak} {streak === 1 ? "day" : "days"}
          </Text>
        </View>

        <View
          style={{
            position: "absolute",
            top: 48,
            right: 24,
            flexDirection: "row",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          {user && (
            <TouchableOpacity
              onPress={() => setShowProfileModal(true)}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="person-circle-outline" size={28} color="white" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowSettingsModal(true)}>
            <Ionicons name="settings-outline" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </>

      {/* Content */}
      <View style={styles.contentArea}>{renderContent()}</View>

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
            <Text
              style={{ textAlign: "center", color: "#666", marginBottom: 16 }}
            >
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

      {/* Settings Modal */}
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

      {/* Profile Modal */}
      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onLogout={handleLogout}
        streak={streak}
      />

      {/* Task Input Modal */}
      <TaskInputModal
        visible={showTaskInputModal}
        onClose={() => setShowTaskInputModal(false)}
        onSave={handleTaskSave}
      />
    </LinearGradient>
  );
}

// --- Styles ---
const TIMER_SIZE = 256;
const BORDER_WIDTH = 8;
const PROGRESS_BORDER_WIDTH = BORDER_WIDTH * 2;
const HALF_SIZE = TIMER_SIZE / 2;

const getPickerOptionStyle = (selected: boolean) => ({
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#f5f5f5",
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  alignItems: "center" as const,
  backgroundColor: selected ? "#f9f9ff" : "white",
});

const styles = StyleSheet.create({
  fullScreen: { flex: 1, width: "100%" },
  contentArea: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  placeholderText: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    marginTop: 10,
  },
  placeholderSubText: { fontSize: 16, color: "rgba(255,255,255,0.8)" },
  timerCircleBase: {
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    borderRadius: TIMER_SIZE / 2,
    borderWidth: BORDER_WIDTH,
    borderColor: "rgba(255, 255, 255, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  timerCircleContent: {
    position: "absolute",
    zIndex: 2,
    width: TIMER_SIZE - PROGRESS_BORDER_WIDTH,
    height: TIMER_SIZE - PROGRESS_BORDER_WIDTH,
    borderRadius: (TIMER_SIZE - PROGRESS_BORDER_WIDTH) / 2,
    backgroundColor: "#6A85B6",
    justifyContent: "center",
    alignItems: "center",
  },
  timerText: { fontSize: 48, fontWeight: "bold", color: "white" },
  timerProgressContainer: {
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    position: "absolute",
    top: 0,
    left: 0,
    borderRadius: TIMER_SIZE / 2,
  },
  timerCircleRight: {
    position: "absolute",
    top: 0,
    left: HALF_SIZE,
    width: HALF_SIZE,
    height: TIMER_SIZE,
    borderRadius: 0,
    backgroundColor: "transparent",
    borderWidth: PROGRESS_BORDER_WIDTH,
    borderColor: "#9333ea",
    borderTopRightRadius: HALF_SIZE,
    borderBottomRightRadius: HALF_SIZE,
    zIndex: 1,
  },
  timerCircleLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: HALF_SIZE,
    height: TIMER_SIZE,
    borderRadius: 0,
    backgroundColor: "transparent",
    borderWidth: PROGRESS_BORDER_WIDTH,
    borderColor: "#9333ea",
    borderTopLeftRadius: HALF_SIZE,
    borderBottomLeftRadius: HALF_SIZE,
    zIndex: 1,
  },
  startButton: {
    backgroundColor: "white",
    borderRadius: 9999,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginRight: 16,
  },
  startButtonText: { fontSize: 18, fontWeight: "600", color: "#4F46E5" },
  resetButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 9999,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  resetButtonText: { fontSize: 18, fontWeight: "600", color: "white" },
  bottomNav: {
    position: "absolute",
    bottom: 24,
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 24,
  },
  navItem: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  navItemActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  navText: { color: "white", marginTop: 4, fontWeight: "600" },
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
    marginBottom: 20,
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
  profileModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  profileModalContainer: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
  },
  profileModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  profileModalTitle: { fontSize: 22, fontWeight: "700", color: "#333" },
  profileDetail: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  profileText: { fontSize: 16, color: "#555", fontWeight: "500" },
  logoutButton: {
    backgroundColor: "#D9534F",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 25,
    flexDirection: "row",
    justifyContent: "center",
  },
  logoutButtonText: { color: "white", fontWeight: "700", fontSize: 16 },
  settingsModalContainer: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
  },
  settingsLabel: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
    fontWeight: "600",
  },
  settingsInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 20,
    textAlign: "center",
    fontWeight: "bold",
  },
  settingsSaveButton: {
    backgroundColor: "#4F46E5",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  toggleLabel: {
    fontSize: 16,
    color: "#333",
  },
  toggleBase: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 10,
  },
  pickerLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
  },
  pickerText: {
    fontSize: 16,
    color: "#333",
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  pickerModalContainer: {
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  pickerOptionText: {
    fontSize: 16,
    color: "#333",
  },
  taskInputModalContainer: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
  },
  taskInputLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 12,
    textAlign: "center",
  },
  taskInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    minHeight: 80,
    textAlignVertical: "top",
  },
  taskInputButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  taskSkipButton: {
    flex: 1,
    backgroundColor: "#e5e7eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  taskSkipButtonText: {
    color: "#6b7280",
    fontWeight: "600",
    fontSize: 16,
  },
  taskSaveButton: {
    flex: 1,
    backgroundColor: "#4F46E5",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  currentTaskContainer: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    width: "90%",
  },
  currentTaskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  currentTaskLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
  },
  currentTaskTitle: {
    fontSize: 16,
    color: "white",
    fontWeight: "700",
  },
  tasksContainer: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  tasksTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    marginBottom: 20,
  },
  emptyTasksContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tasksList: {
    flex: 1,
  },
  taskCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  taskCardActive: {
    borderWidth: 2,
    borderColor: "#9333ea",
  },
  taskCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  taskCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  taskCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  taskCardDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  taskCardDuration: {
    fontSize: 14,
    color: "#666",
  },
  taskCardStatus: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  taskCardDate: {
    fontSize: 12,
    color: "#999",
  },
});
