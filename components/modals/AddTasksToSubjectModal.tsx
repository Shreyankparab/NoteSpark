import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebaseConfig';
import { Task, Subject } from '../../types';

interface AddTasksToSubjectModalProps {
  visible: boolean;
  onClose: () => void;
  subject: Subject | null;
}

const AddTasksToSubjectModal: React.FC<AddTasksToSubjectModalProps> = ({
  visible,
  onClose,
  subject,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load all subjects to show which subject each task belongs to
  useEffect(() => {
    if (!auth.currentUser || !visible) return;

    const subjectsRef = collection(db, 'subjects');
    const subjectsQuery = query(subjectsRef, where('userId', '==', auth.currentUser.uid));

    const unsubscribe = onSnapshot(subjectsQuery, (snapshot) => {
      const loadedSubjects: Subject[] = [];
      snapshot.forEach((doc) => {
        loadedSubjects.push({ id: doc.id, ...doc.data() } as Subject);
      });
      setSubjects(loadedSubjects);
    });

    return () => unsubscribe();
  }, [visible]);

  useEffect(() => {
    if (!auth.currentUser || !visible) return;

    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(tasksRef, where('userId', '==', auth.currentUser.uid));

    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const loadedTasks: Task[] = [];
      snapshot.forEach((doc) => {
        const taskData = { id: doc.id, ...doc.data() } as Task;
        // Show all tasks - user can reassign from one subject to another
        loadedTasks.push(taskData);
      });
      setTasks(loadedTasks.sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => unsubscribe();
  }, [visible, subject]);

  const toggleTaskSelection = (taskId: string) => {
    const newSelection = new Set(selectedTaskIds);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTaskIds(newSelection);
  };

  const handleAssignTasks = async () => {
    if (selectedTaskIds.size === 0) {
      Alert.alert('No Tasks Selected', 'Please select at least one task to assign.');
      return;
    }

    if (!subject) return;

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      // Update tasks with subjectId
      const taskUpdatePromises = Array.from(selectedTaskIds).map((taskId) =>
        updateDoc(doc(db, 'tasks', taskId), { subjectId: subject.id })
      );

      await Promise.all(taskUpdatePromises);
      console.log(`✅ Updated ${selectedTaskIds.size} tasks with subjectId`);

      // Also update any existing notes that match these task titles
      // This ensures notes are also categorized by subject
      const selectedTasks = tasks.filter(t => selectedTaskIds.has(t.id));
      let notesUpdated = 0;

      for (const task of selectedTasks) {
        try {
          // Find notes with matching task title
          const notesQuery = query(
            collection(db, 'notes'),
            where('userId', '==', user.uid),
            where('taskTitle', '==', task.title)
          );
          
          const notesSnapshot = await getDocs(notesQuery);
          
          // Update each matching note with the subjectId
          const noteUpdatePromises = notesSnapshot.docs.map((noteDoc) => {
            // Only update if note doesn't have subjectId or has different subjectId
            const noteData = noteDoc.data();
            if (!noteData.subjectId || noteData.subjectId !== subject.id) {
              notesUpdated++;
              return updateDoc(doc(db, 'notes', noteDoc.id), { 
                subjectId: subject.id 
              });
            }
            return Promise.resolve();
          });

          await Promise.all(noteUpdatePromises);
        } catch (error) {
          console.error(`Error updating notes for task "${task.title}":`, error);
        }
      }

      console.log(`✅ Updated ${notesUpdated} notes with subjectId`);

      const message = notesUpdated > 0
        ? `${selectedTaskIds.size} task(s) and ${notesUpdated} note(s) assigned to ${subject.name}!`
        : `${selectedTaskIds.size} task(s) assigned to ${subject.name}!`;

      Alert.alert('Success', message);
      setSelectedTaskIds(new Set());
      onClose();
    } catch (error) {
      console.error('Error assigning tasks:', error);
      Alert.alert('Error', 'Failed to assign tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => {
    const isSelected = selectedTaskIds.has(item.id);
    const isAlreadyAssigned = item.subjectId === subject?.id;
    
    // Find which subject this task is assigned to
    const assignedSubject = item.subjectId 
      ? subjects.find(s => s.id === item.subjectId)
      : null;
    
    const isAssignedToOtherSubject = assignedSubject && assignedSubject.id !== subject?.id;

    return (
      <TouchableOpacity
        style={[
          styles.taskItem, 
          isSelected && styles.taskItemSelected,
          isAlreadyAssigned && styles.taskItemAlreadyAssigned
        ]}
        onPress={() => toggleTaskSelection(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.taskItemLeft}>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={18} color="#FFF" />}
          </View>
          <View style={styles.taskInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={styles.taskTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {isAlreadyAssigned && (
                <View style={styles.assignedBadge}>
                  <Text style={styles.assignedBadgeText}>✓ Current Subject</Text>
                </View>
              )}
              {isAssignedToOtherSubject && (
                <View style={styles.otherSubjectBadge}>
                  <Text style={styles.otherSubjectBadgeText}>
                    {assignedSubject.icon} {assignedSubject.name}
                  </Text>
                </View>
              )}
              {!item.subjectId && (
                <View style={styles.unassignedBadge}>
                  <Text style={styles.unassignedBadgeText}>No Subject</Text>
                </View>
              )}
            </View>
            <View style={styles.taskMeta}>
              <Ionicons name="time-outline" size={14} color="#64748b" />
              <Text style={styles.taskDuration}>{item.duration}m</Text>
              <View style={[styles.statusBadge, styles[`status${item.status}`]]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!subject) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Add Tasks</Text>
              <Text style={styles.subtitle}>
                Assign tasks to {subject.icon} {subject.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Task List */}
          <View style={styles.listContainer}>
            {tasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkbox-outline" size={64} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Tasks Available</Text>
                <Text style={styles.emptyText}>
                  All your tasks are already assigned to subjects or you haven't created any tasks yet.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.instruction}>
                  Select tasks to assign to this subject
                </Text>
                <FlatList
                  data={tasks}
                  renderItem={renderTaskItem}
                  keyExtractor={(item) => item.id}
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={true}
                />
              </>
            )}
          </View>

          {/* Footer */}
          {tasks.length > 0 && (
            <View style={styles.footer}>
              <Text style={styles.selectedCount}>
                {selectedTaskIds.size} task(s) selected
              </Text>
              <TouchableOpacity
                style={[
                  styles.assignButton,
                  (selectedTaskIds.size === 0 || loading) && styles.assignButtonDisabled,
                ]}
                onPress={handleAssignTasks}
                disabled={selectedTaskIds.size === 0 || loading}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.assignButtonText}>
                  {loading ? 'Assigning...' : 'Assign Tasks'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '70%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  closeButton: {
    padding: 4,
  },
  instruction: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  listContainer: {
    flex: 1,
    minHeight: 200,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  taskItemSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  taskItemAlreadyAssigned: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  taskItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  assignedBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  assignedBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  otherSubjectBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  otherSubjectBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  unassignedBadge: {
    backgroundColor: '#94A3B8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  unassignedBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskDuration: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  statuspending: {
    backgroundColor: '#FEF3C7',
  },
  statusactive: {
    backgroundColor: '#DBEAFE',
  },
  statuscompleted: {
    backgroundColor: '#D1FAE5',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
    textTransform: 'capitalize',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  assignButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  assignButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default AddTasksToSubjectModal;
