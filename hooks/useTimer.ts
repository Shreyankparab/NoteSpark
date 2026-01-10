import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    TIMER_END_TIME_KEY,
    TIMER_STATUS_KEY
} from '../constants';
import {
    scheduleTimerNotification,
    cancelTimerNotification,
    scheduleTimerCompletionNotification,
    cancelTimerCompletionNotification
} from '../utils/notifications';

interface UseTimerProps {
    onTimerComplete: () => void;
    taskTitle?: string;
}

export const useTimer = ({ onTimerComplete, taskTitle }: UseTimerProps) => {
    const DEFAULT_MINUTES = 25;
    const [initialTime, setInitialTime] = useState(DEFAULT_MINUTES * 60);
    const [seconds, setSeconds] = useState(initialTime);
    const [isActive, setIsActive] = useState(false);
    const [timerMode, setTimerMode] = useState<"focus" | "break" | "idle">("idle");
    const [completionNotificationId, setCompletionNotificationId] = useState<string | null>(null);

    const appState = useRef<AppStateStatus>(AppState.currentState);

    // Check and Restore Timer from Background
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

                    console.log("⏰ Timer completed in background, triggering completion...");
                    // We call the callback logic here
                    onTimerComplete();

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

    // Lifecycle: AppState listener
    useEffect(() => {
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
    }, []); // Run once

    // Lifecycle: Interval
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        let notificationUpdateCounter = 0;

        if (isActive && seconds > 0) {
            interval = setInterval(() => {
                setSeconds((prev) => {
                    const newSeconds = prev - 1;

                    // Update notification logic
                    notificationUpdateCounter++;
                    const shouldUpdateNotification =
                        notificationUpdateCounter % 10 === 0 ||
                        newSeconds % 60 === 59 ||
                        newSeconds <= 60;

                    if (shouldUpdateNotification && newSeconds > 0) {
                        scheduleTimerNotification(newSeconds, taskTitle);
                    }

                    if (newSeconds <= 0) {
                        onTimerComplete();
                        return 0;
                    }

                    return newSeconds;
                });
            }, 1000);

            // Initial notification
            scheduleTimerNotification(seconds, taskTitle);
        } else if (seconds <= 0 && isActive) {
            onTimerComplete();
            cancelTimerNotification();
        } else {
            cancelTimerNotification();
        }

        return () => interval && clearInterval(interval);
    }, [isActive, seconds, taskTitle]); // Dependencies: if title changes, notification updates? Maybe.

    // Public Methods
    const start = async () => {
        setIsActive(true);
        const endTime = Date.now() + seconds * 1000;
        await AsyncStorage.setItem(TIMER_END_TIME_KEY, String(endTime));
        await AsyncStorage.setItem(TIMER_STATUS_KEY, "active");

        const notificationId = await scheduleTimerCompletionNotification(
            seconds,
            (timerMode === "break" ? "Break Time" : (taskTitle || "Focus Session"))
        );
        setCompletionNotificationId(notificationId);
    };

    const pause = async () => {
        setIsActive(false);
        await AsyncStorage.removeItem(TIMER_END_TIME_KEY);
        await AsyncStorage.setItem(TIMER_STATUS_KEY, "paused");
        cancelTimerNotification();
        if (completionNotificationId) {
            await cancelTimerCompletionNotification(completionNotificationId);
            setCompletionNotificationId(null);
        }
    };

    const stop = async () => {
        setIsActive(false);
        setSeconds(initialTime);
        await AsyncStorage.removeItem(TIMER_END_TIME_KEY);
        await AsyncStorage.removeItem(TIMER_STATUS_KEY);
        cancelTimerNotification();
        if (completionNotificationId) {
            await cancelTimerCompletionNotification(completionNotificationId);
            setCompletionNotificationId(null);
        }
    };

    const reset = async () => {
        setIsActive(false);
        setTimerMode("idle");
        setSeconds(initialTime);
        await AsyncStorage.removeItem(TIMER_END_TIME_KEY);
        await AsyncStorage.removeItem(TIMER_STATUS_KEY);
        cancelTimerNotification();
        if (completionNotificationId) {
            await cancelTimerCompletionNotification(completionNotificationId);
            setCompletionNotificationId(null);
        }
    };

    const startSession = async (duration: number, mode: "focus" | "break" | "idle", title?: string) => {
        setInitialTime(duration);
        setSeconds(duration);
        setTimerMode(mode);
        setIsActive(true);

        const endTime = Date.now() + duration * 1000;
        await AsyncStorage.setItem(TIMER_END_TIME_KEY, String(endTime));
        await AsyncStorage.setItem(TIMER_STATUS_KEY, "active");

        const notificationTitle = mode === "break" ? "Break Time" : (title || taskTitle || "Focus Session");
        const notificationId = await scheduleTimerCompletionNotification(duration, notificationTitle);
        setCompletionNotificationId(notificationId);
    };

    return {
        initialTime, setInitialTime,
        seconds, setSeconds,
        isActive, setIsActive,
        timerMode, setTimerMode,
        start, pause, stop, reset,
        checkAndRestoreTimer,
        startSession
    };
};

