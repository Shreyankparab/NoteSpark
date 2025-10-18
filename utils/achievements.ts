import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { Achievement, AchievementType } from "../types";

// Define all available achievements
export const ACHIEVEMENTS = [
  // Streak achievements
  {
    id: "streak_3",
    type: AchievementType.STREAK,
    name: "3-Day Streak",
    description: "Completed focus sessions for 3 consecutive days",
    imageFile: require("../assets/three-days-streak.jpg"),
    threshold: 3,
  },
  {
    id: "streak_7",
    type: AchievementType.STREAK,
    name: "7-Day Streak",
    description: "Completed focus sessions for 7 consecutive days",
    imageFile: require("../assets/seven-days-streak.jpg"),
    threshold: 7,
  },
  {
    id: "streak_30",
    type: AchievementType.STREAK,
    name: "30-Day Streak",
    description: "Completed focus sessions for 30 consecutive days",
    imageFile: require("../assets/thirty-days-streak.jpg"),
    threshold: 30,
  },

  // Focus time achievements
  {
    id: "focus_60",
    type: AchievementType.FOCUS_TIME,
    name: "1 Hour Focus",
    description: "Accumulated 60 minutes of focus time",
    imageFile: require("../assets/one-hr-focus-time.jpg"),
    threshold: 60,
  },
  {
    id: "focus_300",
    type: AchievementType.FOCUS_TIME,
    name: "5 Hour Focus",
    description: "Accumulated 300 minutes of focus time",
    imageFile: require("../assets/five-hour-focus.jpg"),
    threshold: 300,
  },
  {
    id: "focus_1000",
    type: AchievementType.FOCUS_TIME,
    name: "1000 Minute Focus",
    description: "Accumulated 1000 minutes of focus time",
    imageFile: require("../assets/one-thousand-minutes.jpg"),
    threshold: 1000,
  },

  // Task completion achievements
  {
    id: "tasks_10",
    type: AchievementType.TASKS_COMPLETED,
    name: "Task Starter",
    description: "Completed 10 tasks",
    imageFile: require("../assets/ten-tasks-completed.jpg"),
    threshold: 10,
  },
  {
    id: "tasks_25",
    type: AchievementType.TASKS_COMPLETED,
    name: "Task Champion",
    description: "Completed 25 tasks",
    imageFile: require("../assets/twenty-five-tasks-completed.jpg"),
    threshold: 25,
  },
  {
    id: "tasks_50",
    type: AchievementType.TASKS_COMPLETED,
    name: "Task Master",
    description: "Completed 50 tasks",
    imageFile: require("../assets/fifty-tasks-completed.jpg"),
    threshold: 50,
  },
];

/**
 * Check if user has unlocked any streak-based achievements
 * @param userId User ID
 * @param currentStreak Current streak count
 * @returns Array of newly unlocked achievements
 */
export const checkStreakAchievements = async (
  userId: string,
  currentStreak: number
): Promise<Achievement[]> => {
  try {
    const unlockedAchievements: Achievement[] = [];

    // Get streak achievements that match the current streak
    const eligibleAchievements = ACHIEVEMENTS.filter(
      (achievement) =>
        achievement.type === AchievementType.STREAK &&
        achievement.threshold <= currentStreak
    );

    console.log(
      `🎯 Checking streak achievements for user ${userId} with streak ${currentStreak}`
    );
    console.log(
      `🎯 Eligible achievements:`,
      eligibleAchievements.map((a) => `${a.name} (threshold: ${a.threshold})`)
    );

    // Check each eligible achievement
    for (const achievement of eligibleAchievements) {
      const unlockedAchievement = await unlockAchievement(
        userId,
        achievement.id
      );
      if (unlockedAchievement) {
        console.log(
          `🏆 Newly unlocked achievement: ${unlockedAchievement.name}`
        );
        unlockedAchievements.push(unlockedAchievement);
      }
    }

    return unlockedAchievements;
  } catch (error) {
    console.error(
      `❌ Failed to check streak achievements for user ${userId}:`,
      error
    );
    return [];
  }
};

/**
 * Check if user has unlocked any focus time achievements
 * @param userId User ID
 * @param totalFocusMinutes Total focus minutes
 * @returns Array of newly unlocked achievements
 */
export const checkFocusTimeAchievements = async (
  userId: string,
  totalFocusMinutes: number
): Promise<Achievement[]> => {
  try {
    const unlockedAchievements: Achievement[] = [];

    // Get focus time achievements that match the current total
    const eligibleAchievements = ACHIEVEMENTS.filter(
      (achievement) =>
        achievement.type === AchievementType.FOCUS_TIME &&
        achievement.threshold <= totalFocusMinutes
    );

    console.log(
      `🎯 Checking focus time achievements for user ${userId} with ${totalFocusMinutes} minutes`
    );
    console.log(
      `🎯 Eligible achievements:`,
      eligibleAchievements.map((a) => `${a.name} (threshold: ${a.threshold})`)
    );

    // Check each eligible achievement
    for (const achievement of eligibleAchievements) {
      const unlockedAchievement = await unlockAchievement(
        userId,
        achievement.id
      );
      if (unlockedAchievement) {
        console.log(
          `🏆 Newly unlocked achievement: ${unlockedAchievement.name}`
        );
        unlockedAchievements.push(unlockedAchievement);
      }
    }

    return unlockedAchievements;
  } catch (error) {
    console.error(
      `❌ Failed to check focus time achievements for user ${userId}:`,
      error
    );
    return [];
  }
};

/**
 * Check if user has unlocked any task completion achievements
 * @param userId User ID
 * @param totalTasksCompleted Total number of completed tasks
 * @returns Array of newly unlocked achievements
 */
export const checkTasksCompletedAchievements = async (
  userId: string,
  totalTasksCompleted: number
): Promise<Achievement[]> => {
  try {
    const unlockedAchievements: Achievement[] = [];

    // Get task completion achievements that match the current total
    const eligibleAchievements = ACHIEVEMENTS.filter(
      (achievement) =>
        achievement.type === AchievementType.TASKS_COMPLETED &&
        achievement.threshold <= totalTasksCompleted
    );

    console.log(
      `🎯 Checking task completion achievements for user ${userId} with ${totalTasksCompleted} tasks`
    );
    console.log(
      `🎯 Eligible achievements:`,
      eligibleAchievements.map((a) => `${a.name} (threshold: ${a.threshold})`)
    );

    // Check each eligible achievement
    for (const achievement of eligibleAchievements) {
      const unlockedAchievement = await unlockAchievement(
        userId,
        achievement.id
      );
      if (unlockedAchievement) {
        console.log(
          `🏆 Newly unlocked achievement: ${unlockedAchievement.name}`
        );
        unlockedAchievements.push(unlockedAchievement);
      }
    }

    return unlockedAchievements;
  } catch (error) {
    console.error(
      `❌ Failed to check task completion achievements for user ${userId}:`,
      error
    );
    return [];
  }
};

/**
 * Unlock an achievement for a user if not already unlocked
 * @param userId User ID
 * @param achievementId Achievement ID to unlock
 * @returns The unlocked achievement or null if already unlocked
 */
export const unlockAchievement = async (
  userId: string,
  achievementId: string
): Promise<Achievement | null> => {
  try {
    // Use composite key to ensure uniqueness: userId_achievementId
    const compositeId = `${userId}_${achievementId}`;
    const achievementsRef = collection(db, "achievements");
    const achievementDocRef = doc(achievementsRef, compositeId);

    // Check if achievement is already unlocked using the composite ID
    const docSnap = await getDoc(achievementDocRef);

    // If achievement already unlocked, return null
    if (docSnap.exists()) {
      console.log(
        `🏆 Achievement ${achievementId} already unlocked for user ${userId}`
      );
      return null;
    }

    // Get achievement details
    const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!achievement) {
      console.error(`Achievement ${achievementId} not found in definitions`);
      return null;
    }

    // Create a copy with user ID and unlock timestamp
    const unlockedAchievement: Achievement = {
      ...achievement,
      userId,
      unlockedAt: serverTimestamp(),
    };

    // Save to Firestore with composite ID (prevents duplicates)
    await setDoc(achievementDocRef, unlockedAchievement);

    console.log(
      `🏆 Successfully unlocked achievement ${achievementId} for user ${userId}`
    );
    return unlockedAchievement;
  } catch (error) {
    console.error(
      `❌ Failed to unlock achievement ${achievementId} for user ${userId}:`,
      error
    );
    return null;
  }
};

/**
 * Get all achievements for a user
 * @param userId User ID
 * @returns Array of user achievements
 */
export const getUserAchievements = async (
  userId: string
): Promise<Achievement[]> => {
  try {
    const achievementsRef = collection(db, "achievements");
    const q = query(achievementsRef, where("userId", "==", userId));

    const querySnapshot = await getDocs(q);
    const achievements: Achievement[] = [];

    querySnapshot.forEach((doc) => {
      achievements.push(doc.data() as Achievement);
    });

    console.log(
      `📋 Loaded ${achievements.length} achievements for user ${userId}`
    );
    return achievements;
  } catch (error) {
    console.error(`❌ Failed to load achievements for user ${userId}:`, error);
    return [];
  }
};

/**
 * Clean up duplicate achievements for a user
 * This function removes duplicate achievement entries and keeps only one per achievement type
 * @param userId User ID
 * @returns Number of duplicates removed
 */
export const cleanupDuplicateAchievements = async (
  userId: string
): Promise<number> => {
  try {
    console.log(`🧹 Starting duplicate achievement cleanup for user ${userId}`);
    
    const achievementsRef = collection(db, "achievements");
    const q = query(achievementsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    // Group achievements by achievement ID
    const achievementGroups = new Map<string, any[]>();
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const achievementId = data.id;
      
      if (!achievementGroups.has(achievementId)) {
        achievementGroups.set(achievementId, []);
      }
      
      achievementGroups.get(achievementId)!.push({
        docId: doc.id,
        data: data,
        unlockedAt: data.unlockedAt?.toMillis?.() || 0,
      });
    });

    let duplicatesRemoved = 0;

    // For each achievement type, keep only the earliest one and delete the rest
    for (const [achievementId, docs] of achievementGroups.entries()) {
      if (docs.length > 1) {
        console.log(`🔍 Found ${docs.length} duplicates for achievement ${achievementId}`);
        
        // Sort by unlock time (keep the earliest)
        docs.sort((a, b) => a.unlockedAt - b.unlockedAt);
        
        // Keep the first one, delete the rest
        const toKeep = docs[0];
        const toDelete = docs.slice(1);
        
        console.log(`✅ Keeping document ${toKeep.docId} (unlocked at ${new Date(toKeep.unlockedAt).toISOString()})`);
        
        // Delete duplicates
        for (const duplicate of toDelete) {
          try {
            await deleteDoc(doc(achievementsRef, duplicate.docId));
            console.log(`🗑️ Deleted duplicate ${duplicate.docId}`);
            duplicatesRemoved++;
          } catch (error) {
            console.error(`❌ Failed to delete duplicate ${duplicate.docId}:`, error);
          }
        }
      }
    }

    console.log(`✅ Cleanup complete: Removed ${duplicatesRemoved} duplicate achievements`);
    return duplicatesRemoved;
  } catch (error) {
    console.error(`❌ Failed to cleanup duplicate achievements for user ${userId}:`, error);
    return 0;
  }
};
