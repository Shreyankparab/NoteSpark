import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { PERSISTENT_NOTIFICATION_ID } from "../constants";

// Check if we're running in Expo Go
const isExpoGo = Constants.appOwnership === "expo";

// Check if notifications are available
export const areNotificationsAvailable = (): boolean => {
  return !isExpoGo;
};

// Helper to format remaining time for notification body
export const formatTimeForNotification = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

// Function to schedule/update the persistent timer notification
export const scheduleTimerNotification = async (remainingSeconds: number, taskTitle?: string) => {
  // Skip notifications entirely in Expo Go
  if (isExpoGo) {
    return;
  }

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
    console.warn("⚠️ Notification scheduling failed:", error);
  }
};

export const cancelTimerNotification = async () => {
  // Skip notifications entirely in Expo Go
  if (isExpoGo) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(
      PERSISTENT_NOTIFICATION_ID
    );
  } catch (error) {
    console.warn("⚠️ Notification cancellation failed:", error);
  }
};

// Schedule a notification for when the timer completes
export const scheduleTimerCompletionNotification = async (
  durationInSeconds: number,
  taskTitle?: string
) => {
  // Skip notifications entirely in Expo Go (except we might want to allow web fallback even in Expo Go if running on web?)
  if (isExpoGo && Platform.OS !== 'web') {
    console.log("📱 Expo Go - completion notification skipped");
    return null;
  }

  try {
    const taskText = taskTitle ? ` - ${taskTitle}` : '';

    // WEB FALLBACK: Use native Browser Notification API if Expo Notifications might struggle without SW
    if (Platform.OS === 'web') {
      console.log("Here (Web) - Trying Browser Notification");
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification("⏰ Timer Complete!", {
            body: `Great work! Your focus session is complete${taskText}`,
            icon: '/pwa-192x192.png', // Fallback icon path if available
          });
          return 'web-notification-id';
        } else if (Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            new Notification("⏰ Timer Complete!", {
              body: `Great work! Your focus session is complete${taskText}`
            });
            return 'web-notification-id';
          }
        }
      }
      return null;
    }

    // NATIVE / MOBILE
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ Timer Complete!",
        body: `Great work! Your focus session is complete${taskText}`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
        categoryIdentifier: 'timer_complete',
        data: {
          type: 'timer_complete',
          taskTitle: taskTitle || null,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: durationInSeconds,
      },
    });

    console.log(`🔔 Scheduled completion notification for ${durationInSeconds}s - ID: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.warn("⚠️ Failed to schedule completion notification:", error);
    return null;
  }
};

// Cancel timer completion notification
export const cancelTimerCompletionNotification = async (notificationId: string | null) => {
  if (isExpoGo || !notificationId) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`🔕 Cancelled completion notification: ${notificationId}`);
  } catch (error) {
    console.warn("⚠️ Failed to cancel completion notification:", error);
  }
};

// Setup notification permissions and categories
export const setupNotifications = async () => {
  // Skip notifications entirely in Expo Go
  if (isExpoGo) {
    console.log("📱 Running in Expo Go - notifications disabled");
    return;
  }

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

    console.log("🔔 Notifications setup completed successfully");
  } catch (error) {
    console.warn("⚠️ Notification setup failed:", error);
  }
};
