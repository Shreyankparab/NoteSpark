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
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// Import types and constants
import { ScreenName, SoundPreset, Task, UserSettings } from "../types";
import { AUTH_MODAL_HEIGHT, TIMER_END_TIME_KEY, TIMER_STATUS_KEY, SOUND_PRESETS } from "../constants";

// Import utilities
import { playCompletionSound } from "../utils/audio";
import { scheduleTimerNotification, cancelTimerNotification, setupNotifications } from "../utils/notifications";
import { loadSettings, saveSettings } from "../utils/storage";

// Import components
import NavButton from "../components/NavButton";
import TimerContent from "../components/TimerContent";
import TasksContent from "../components/TasksContent";
import PlaceholderContent from "../components/PlaceholderContent";
import ProfileModal from "../components/modals/ProfileModal";
import SettingsModal from "../components/modals/SettingsModal";
import TaskInputModal from "../components/modals/TaskInputModal";

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

export default function TimerScreen() {
  // --- Timer State ---
  const DEFAULT_MINUTES = 25;
  const [initialTime, setInitialTime] = useState(DEFAULT_MINUTES * 60);
  const [seconds, setSeconds] = useState(initialTime);
  const [isActive, setIsActive] = useState(false);

  // --- Settings State ---
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [isVibrationOn, setIsVibrationOn] = useState(true);
  const [selectedSound, setSelectedSound] = useState<SoundPreset>(SOUND_PRESETS[0]);

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
    const initializeSettings = async () => {
      const settings = await loadSettings();
      setInitialTime((settings.duration || DEFAULT_MINUTES) * 60);
      setIsSoundOn(settings.isSoundOn ?? true);
      setIsVibrationOn(settings.isVibrationOn ?? true);
      setSelectedSound(settings.selectedSound || SOUND_PRESETS[0]);
    };
    
    initializeSettings();
    setupNotifications();
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

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // This would need proper Google Sign-In implementation
      Alert.alert(
        "Error",
        "Google Sign-In requires local SDK setup (ID Token missing)."
      );
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
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
        return (
          <PlaceholderContent
            icon="document-text"
            title="Notes Screen"
            subtitle="Write down your ideas here."
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
            onEditTask={(task) => console.log("Edit task:", task)}
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
      <View style={styles.topBar}>
        <View style={styles.streakContainer}>
          <Ionicons name="flame" size={20} color="#FF6347" />
          <Text style={styles.streakText}>
            Streak: {streak} {streak === 1 ? "day" : "days"}
          </Text>
        </View>

        <View style={styles.topRightButtons}>
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
      </View>

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
      />

      <TaskInputModal
        visible={showTaskInputModal}
        onClose={() => setShowTaskInputModal(false)}
        onSave={handleTaskSave}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
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
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  streakText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 8,
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
});
