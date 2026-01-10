import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Task } from "../types";
import { Theme } from "../constants/themes";

interface TasksContentProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onPlayTask: (task: Task) => void;
  onPlayAgain: (task: Task) => void;
  onAbandonTask: (taskId: string) => void;
  onAddCustomTask: () => void;
  currentTaskId: string | null;
  theme?: Theme;
  // Pagination props
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

const TasksContent: React.FC<TasksContentProps> = ({
  tasks,
  onEditTask,
  onDeleteTask,
  onPlayTask,
  onPlayAgain,
  onAbandonTask,
  onAddCustomTask,
  currentTaskId,
  theme,
  onLoadMore,
  hasMore = true,
  loadingMore = false,
}) => {
  // Tasks are already sorted by createdAt desc from the query
  const sortedTasks = [...tasks].sort((a, b) => b.createdAt - a.createdAt);

  console.log("🎯 TasksContent received tasks:", tasks.length);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10b981";
      case "active":
        return "#9333ea";
      case "abandoned":
        return "#ef4444";
      case "pending":
      default:
        return "#f59e0b";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "checkmark-circle";
      case "active":
        return "timer";
      case "abandoned":
        return "close-circle";
      case "pending":
      default:
        return "time-outline";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "active":
        return "In Progress";
      case "abandoned":
        return "Abandoned";
      case "pending":
      default:
        return "Pending";
    }
  };

  const handleLoadMore = useCallback(() => {
    if (onLoadMore && hasMore && !loadingMore) {
      console.log("🔄 Triggering load more...");
      onLoadMore();
    }
  }, [onLoadMore, hasMore, loadingMore]);

  const renderTask = useCallback(({ item: task }: { item: Task }) => (
    <View
      style={[
        styles.taskCard,
        task.id === currentTaskId && styles.taskCardActive,
      ]}
    >
      <View style={styles.taskCardHeader}>
        <View style={styles.taskCardTitleRow}>
          <Ionicons
            name={getStatusIcon(task.status) as any}
            size={22}
            color={getStatusColor(task.status)}
          />
          <View style={styles.taskInfo}>
            <Text style={styles.taskCardTitle}>{task.title}</Text>
            <View style={styles.taskMeta}>
              <Text style={styles.taskCardDuration}>
                <Ionicons name="time-outline" size={12} color="#64748b" />
                {" "}{task.duration} min
              </Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(task.status) + "20" }
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  { color: getStatusColor(task.status) }
                ]}>
                  {getStatusText(task.status)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Pending Tasks: Play & Abandon Buttons */}
          {task.status === "pending" && (
            <>
              <TouchableOpacity
                style={styles.abandonButton}
                onPress={() => onAbandonTask(task.id)}
              >
                <Ionicons name="close" size={18} color="#ef4444" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => onPlayTask(task)}
              >
                <Ionicons name="play" size={20} color="#fff" />
              </TouchableOpacity>
            </>
          )}

          {/* Completed Tasks: Play Again only (edit option in dialog) */}
          {task.status === "completed" && (
            <TouchableOpacity
              style={styles.playAgainButton}
              onPress={() => onPlayAgain(task)}
            >
              <Ionicons name="refresh" size={18} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Active Tasks: No actions */}
          {task.status === "active" && (
            <View style={styles.activeIndicator}>
              <Text style={styles.activeText}>Running</Text>
            </View>
          )}

          {/* Abandoned Tasks: Delete only */}
          {task.status === "abandoned" && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDeleteTask(task.id)}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.taskCardDate}>
        {new Date(task.createdAt).toLocaleDateString()} at{" "}
        {new Date(task.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </View>
  ), [currentTaskId, onAbandonTask, onPlayTask, onPlayAgain, onDeleteTask]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;

    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#9333ea" />
        <Text style={styles.loadingText}>Loading more tasks...</Text>
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyTasksContainer}>
      <Ionicons
        name="checkbox-outline"
        size={64}
        color="rgba(255,255,255,0.4)"
      />
      <Text style={styles.placeholderText}>No tasks yet</Text>
      <Text style={styles.placeholderSubText}>
        Tap the + button to add your first task
      </Text>
    </View>
  ), []);

  const keyExtractor = useCallback((item: Task) => item.id, []);

  return (
    <View style={styles.tasksContainer}>
      <Text style={styles.tasksTitle}>Your Tasks</Text>

      <FlatList
        data={sortedTasks}
        renderItem={renderTask}
        keyExtractor={keyExtractor}
        style={styles.tasksList}
        contentContainerStyle={sortedTasks.length === 0 ? styles.emptyContainer : undefined}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: theme?.accentColor || "#9333ea" }
        ]}
        onPress={onAddCustomTask}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tasksContainer: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  tasksTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
  },
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
    alignItems: "flex-start",
    flex: 1,
    gap: 10,
  },
  taskInfo: {
    flex: 1,
  },
  taskCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 6,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  taskCardDuration: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playButton: {
    backgroundColor: "#10b981",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  playAgainButton: {
    backgroundColor: "#9333ea",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#9333ea",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  editButton: {
    backgroundColor: "#f1f5f9",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    backgroundColor: "#fee2e2",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  abandonButton: {
    backgroundColor: "#fee2e2",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  activeIndicator: {
    backgroundColor: "#ede9fe",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9333ea",
  },
  taskCardDate: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 8,
  },
  loadingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#9333ea",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
});

export default TasksContent;
