import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Task } from "../types";
import { TIMER_SIZE, BORDER_WIDTH, PROGRESS_BORDER_WIDTH } from "../constants";

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
  onAddOneMinute: () => void;
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
  onAddOneMinute,
}) => {
  const [showAddMinute, setShowAddMinute] = useState(false);
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

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          if (isActive) setShowAddMinute((prev) => !prev);
        }}
        style={styles.timerCircleBase}
      >
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
          {isActive && showAddMinute && (
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
        </View>
      </TouchableOpacity>

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

const HALF_SIZE = TIMER_SIZE / 2;

const styles = StyleSheet.create({
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
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
});

export default TimerContent;
