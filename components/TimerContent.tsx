import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { Task } from "../types";
import { TIMER_SIZE, BORDER_WIDTH, PROGRESS_BORDER_WIDTH } from "../constants";
import { Theme } from "../constants/themes";

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
  onAbandonTask: () => void;
  onAddOneMinute: () => void;
  theme: Theme;
  areControlsHidden?: boolean;
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
  onAbandonTask,
  onAddOneMinute,
  theme,
  areControlsHidden = false,
}) => {
  const [showAddMinute, setShowAddMinute] = useState(false);
  // Show automatically in the final 30 seconds of the countdown
  const shouldAlwaysShowAdd = isActive && seconds <= 30;

  // SVG Circle Progress Calculation
  const radius = (TIMER_SIZE - PROGRESS_BORDER_WIDTH * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  // Helper function to determine if a color is light
  const isLightColor = (color: string): boolean => {
    // Simple check for white or light colors
    const lightColors = ['#FFFFFF', '#FFF', 'white', 'rgba(255, 255, 255'];
    return lightColors.some(light => color.toUpperCase().includes(light.toUpperCase()));
  };

  // Determine button text color based on button background
  const startButtonTextColor = isLightColor(theme.timerCircleColor)
    ? theme.accentColor // Use accent color for text on light backgrounds
    : theme.textColor; // Use theme text color for dark backgrounds

  return (
    <View style={styles.centerContent}>
      {currentTask && (
        <View style={[
          styles.currentTaskContainer,
          { backgroundColor: theme.buttonColor }
        ]}>
          <View style={styles.currentTaskHeader}>
            <Text style={[
              styles.currentTaskLabel,
              { color: theme.secondaryTextColor }
            ]}>Current Task:</Text>
            <View style={styles.taskActions}>
              <TouchableOpacity
                onPress={onAbandonTask}
                style={styles.actionButton}
                activeOpacity={0.6}
              >
                <Ionicons name="close-circle-outline" size={20} color={theme.secondaryTextColor || "rgba(255,255,255,0.6)"} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onEditTask}
                style={styles.actionButton}
                activeOpacity={0.6}
              >
                <Ionicons name="create-outline" size={20} color={theme.textColor} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[
            styles.currentTaskTitle,
            { color: theme.textColor }
          ]}>{currentTask.title}</Text>
        </View>
      )}

      <View style={styles.timerContainer}>
        {/* SVG Progress Ring */}
        <Svg
          width={TIMER_SIZE}
          height={TIMER_SIZE}
          style={styles.progressSvg}
        >
          {/* Background Circle */}
          <Circle
            cx={TIMER_SIZE / 2}
            cy={TIMER_SIZE / 2}
            r={radius}
            stroke={theme.timerCircleColor}
            strokeWidth={PROGRESS_BORDER_WIDTH}
            fill="none"
            opacity={0.3}
          />
          {/* Progress Circle */}
          <Circle
            cx={TIMER_SIZE / 2}
            cy={TIMER_SIZE / 2}
            r={radius}
            stroke={theme.accentColor}
            strokeWidth={PROGRESS_BORDER_WIDTH}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${TIMER_SIZE / 2}, ${TIMER_SIZE / 2}`}
          />
        </Svg>

        {/* Inner circle - stays fixed */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (isActive) setShowAddMinute((prev) => !prev);
          }}
          style={[
            styles.timerCircleContent,
            { backgroundColor: theme.buttonColor }
          ]}
        >
          <Text style={[styles.timerText, { color: theme.textColor }]}>{formatTime(seconds)}</Text>
          {(shouldAlwaysShowAdd || (isActive && showAddMinute)) && (
            <TouchableOpacity
              style={styles.addMinuteButton}
              onPress={() => {
                onAddOneMinute();
                setShowAddMinute(false);
              }}
            >
              <Ionicons name="add" size={16} color="#4F46E5" />
              <Text style={styles.addMinuteText}>+1 min</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {!areControlsHidden && (
        <View style={{ flexDirection: "row", marginTop: 40 }}>
          <TouchableOpacity
            style={[
              styles.startButton,
              { backgroundColor: theme.timerCircleColor }
            ]}
            onPress={handleStartPause}
            disabled={isLoading}
          >
            <Text style={[
              styles.startButtonText,
              { color: startButtonTextColor }
            ]}>
              {isActive ? "Pause" : "Start"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.resetButton,
              { backgroundColor: theme.accentColor }
            ]}
            onPress={handleReset}
            disabled={isLoading}
          >
            <Text style={[
              styles.resetButtonText,
              { color: theme.timerCircleColor }
            ]}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const HALF_SIZE = TIMER_SIZE / 2;

const styles = StyleSheet.create({
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  currentTaskContainer: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: "90%",
  },
  taskActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  timerContainer: {
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  progressSvg: {
    position: "absolute",
    top: 0,
    left: 0,
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
  timerCircleContent: {
    position: "absolute",
    zIndex: 10,
    width: TIMER_SIZE - PROGRESS_BORDER_WIDTH * 4,
    height: TIMER_SIZE - PROGRESS_BORDER_WIDTH * 4,
    borderRadius: (TIMER_SIZE - PROGRESS_BORDER_WIDTH * 4) / 2,
    backgroundColor: "#6A85B6",
    justifyContent: "center",
    alignItems: "center",
  },
  timerText: { fontSize: 48, fontWeight: "bold", color: "white" },
  addMinuteButton: {
    position: "absolute",
    bottom: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  addMinuteText: {
    marginLeft: 6,
    color: "#4F46E5",
    fontWeight: "700",
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
});

export default TimerContent;
