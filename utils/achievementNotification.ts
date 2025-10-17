import { Alert } from 'react-native';
import { Achievement } from '../types';

// Global state to track toast visibility and queue
let toastQueue: Achievement[] = [];
let isToastVisible = false;
let toastListeners: ((achievement: Achievement | null, visible: boolean) => void)[] = [];

/**
 * Register a listener for toast events
 * @param listener Function to call when toast state changes
 * @returns Function to unregister the listener
 */
export const registerToastListener = (
  listener: (achievement: Achievement | null, visible: boolean) => void
) => {
  toastListeners.push(listener);
  return () => {
    toastListeners = toastListeners.filter(l => l !== listener);
  };
};

/**
 * Show the next achievement in the queue
 */
const showNextAchievement = () => {
  if (toastQueue.length === 0) {
    isToastVisible = false;
    toastListeners.forEach(listener => listener(null, false));
    return;
  }

  const nextAchievement = toastQueue.shift();
  isToastVisible = true;
  
  console.log(`🏆 Showing achievement toast for: ${nextAchievement?.name}`);
  toastListeners.forEach(listener => listener(nextAchievement || null, true));
};

/**
 * Handle toast close event
 */
export const handleToastClose = () => {
  // Show next achievement in queue or hide toast
  setTimeout(() => {
    showNextAchievement();
  }, 300);
};

/**
 * Displays a notification for newly unlocked achievements
 * @param achievement The achievement that was unlocked
 */
export const showAchievementNotification = (achievement: Achievement) => {
  if (!achievement) return;
  
  console.log(`🏆 Queueing achievement notification for: ${achievement.name}`);
  
  // Add to queue
  toastQueue.push(achievement);
  
  // If no toast is currently visible, show this one
  if (!isToastVisible) {
    showNextAchievement();
  }
};

/**
 * Displays notifications for multiple achievements
 * @param achievements Array of achievements to display notifications for
 */
export const showMultipleAchievementNotifications = (achievements: Achievement[]) => {
  if (!achievements || achievements.length === 0) return;
  
  console.log(`🏆 Queueing ${achievements.length} achievement notifications`);
  
  // Add all achievements to the queue
  toastQueue = [...toastQueue, ...achievements];
  
  // If no toast is currently visible, start showing them
  if (!isToastVisible) {
    showNextAchievement();
  }
};