import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
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
    imageFile: require("../assets/adaptive-icon.png"),
    threshold: 30,
  },

  // Focus time achievements
  {
    id: "focus_60",
    type: AchievementType.FOCUS_TIME,
    name: "1 Hour Focus",
    description: "Accumulated 60 minutes of focus time",
    imageFile: require("../assets/one-hour-focus.jpg"),
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
    imageFile: require("../assets/adaptive-icon.png"), // Using adaptive-icon.png as placeholder since focus_1000.png doesn't exist
    threshold: 1000,
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
    // Check if achievement is already unlocked
    const achievementsRef = collection(db, "achievements");
    const q = query(
      achievementsRef,
      where("userId", "==", userId),
      where("id", "==", achievementId)
    );

    const querySnapshot = await getDocs(q);

    // If achievement already unlocked, return null
    if (!querySnapshot.empty) {
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

    // Save to Firestore
    const achievementDocRef = doc(achievementsRef);
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
