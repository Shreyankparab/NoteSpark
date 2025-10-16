import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Task } from "../types";

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
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>
            Debug: {tasks.length} tasks total, {sortedTasks.length} sorted
          </Text>
          <Text style={styles.debugSubText}>
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

const styles = StyleSheet.create({
  tasksContainer: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  tasksTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    marginBottom: 20,
  },
  debugContainer: { 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    padding: 10, 
    marginBottom: 10, 
    borderRadius: 8 
  },
  debugText: { color: 'white', fontSize: 12 },
  debugSubText: { color: 'white', fontSize: 10 },
  emptyTasksContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    marginTop: 10,
  },
  placeholderSubText: { fontSize: 16, color: "rgba(255,255,255,0.8)" },
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

export default TasksContent;
