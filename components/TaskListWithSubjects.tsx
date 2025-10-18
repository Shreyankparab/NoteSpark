import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase/firebaseConfig';
import { Task, Subject } from '../types';
import AssignSubjectModal from './modals/AssignSubjectModal';

interface TaskListWithSubjectsProps {
  onTaskSelect?: (task: Task) => void;
}

const TaskListWithSubjects: React.FC<TaskListWithSubjectsProps> = ({ onTaskSelect }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (!auth.currentUser) return;

    // Load tasks
    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(tasksRef, where('userId', '==', auth.currentUser.uid));
    
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const loadedTasks: Task[] = [];
      snapshot.forEach((doc) => {
        loadedTasks.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(loadedTasks.sort((a, b) => b.createdAt - a.createdAt));
    });

    // Load subjects
    const subjectsRef = collection(db, 'subjects');
    const subjectsQuery = query(subjectsRef, where('userId', '==', auth.currentUser.uid));
    
    const unsubscribeSubjects = onSnapshot(subjectsQuery, (snapshot) => {
      const loadedSubjects: Subject[] = [];
      snapshot.forEach((doc) => {
        loadedSubjects.push({ id: doc.id, ...doc.data() } as Subject);
      });
      setSubjects(loadedSubjects);
    });

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    return () => {
      unsubscribeTasks();
      unsubscribeSubjects();
    };
  }, []);

  const getSubjectForTask = (task: Task): Subject | undefined => {
    return subjects.find(s => s.id === task.subjectId);
  };

  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'tasks', task.id));
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const handleAssignSubject = (task: Task) => {
    setSelectedTask(task);
    setShowAssignModal(true);
  };

  const renderTaskItem = ({ item }: { item: Task }) => {
    const subject = getSubjectForTask(item);
    const isCompleted = item.status === 'completed';
    const isActive = item.status === 'active';

    return (
      <Animated.View style={[styles.taskCard, { opacity: fadeAnim }]}>
        <TouchableOpacity
          onPress={() => onTaskSelect?.(item)}
          activeOpacity={0.7}
        >
          <View style={styles.taskContent}>
            {/* Status Indicator */}
            <View style={styles.statusContainer}>
              {isCompleted ? (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                </View>
              ) : isActive ? (
                <View style={styles.activeBadge}>
                  <View style={styles.activePulse} />
                </View>
              ) : (
                <View style={styles.pendingBadge}>
                  <Ionicons name="ellipse-outline" size={24} color="#94A3B8" />
                </View>
              )}
            </View>

            {/* Task Info */}
            <View style={styles.taskInfo}>
              <Text
                style={[
                  styles.taskTitle,
                  isCompleted && styles.taskTitleCompleted,
                ]}
              >
                {item.title}
              </Text>
              
              <View style={styles.taskMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color="#64748b" />
                  <Text style={styles.metaText}>{item.duration}m</Text>
                </View>
                
                {subject && (
                  <TouchableOpacity
                    onPress={() => handleAssignSubject(item)}
                    style={[styles.subjectBadge, { backgroundColor: subject.color + '20' }]}
                  >
                    <Text style={styles.subjectIcon}>{subject.icon}</Text>
                    <Text style={[styles.subjectName, { color: subject.color }]}>
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {!subject && (
                <TouchableOpacity
                  onPress={() => handleAssignSubject(item)}
                  style={styles.actionButton}
                >
                  <Ionicons name="folder-outline" size={20} color="#6366F1" />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                onPress={() => handleDeleteTask(item)}
                style={styles.actionButton}
              >
                <Ionicons name="trash-outline" size={20} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Active Indicator */}
          {isActive && (
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.activeIndicator}
            >
              <Text style={styles.activeText}>ACTIVE</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Group tasks by status
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const activeTasks = tasks.filter(t => t.status === 'active');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <View style={styles.container}>
      <FlatList
        data={[...activeTasks, ...pendingTasks, ...completedTasks]}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptyText}>
              Create a task to get started
            </Text>
          </View>
        }
        ListHeaderComponent={
          tasks.length > 0 ? (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{pendingTasks.length}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={[styles.statCard, styles.statCardActive]}>
                <Text style={[styles.statNumber, styles.statNumberActive]}>
                  {activeTasks.length}
                </Text>
                <Text style={[styles.statLabel, styles.statLabelActive]}>Active</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{completedTasks.length}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>
          ) : null
        }
      />

      <AssignSubjectModal
        visible={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        task={selectedTask}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statCardActive: {
    backgroundColor: '#EEF2FF',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  statNumberActive: {
    color: '#6366F1',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  statLabelActive: {
    color: '#6366F1',
  },
  taskCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  taskContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  statusContainer: {
    marginRight: 12,
  },
  completedBadge: {},
  activeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
  },
  pendingBadge: {},
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  subjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  subjectIcon: {
    fontSize: 14,
  },
  subjectName: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  activeIndicator: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  activeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
});

export default TaskListWithSubjects;
