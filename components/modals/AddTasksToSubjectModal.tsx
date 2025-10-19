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

interface Note {
  id: string;
  taskTitle: string;
  notes?: string;
  completedAt: number;
  userId: string;
  subjectId?: string;
  duration?: number;
}

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
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
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

  // Load tasks and notes together
  useEffect(() => {
    if (!auth.currentUser || !visible) return;

    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(tasksRef, where('userId', '==', auth.currentUser.uid));

    const notesRef = collection(db, 'notes');
    const notesQuery = query(notesRef, where('userId', '==', auth.currentUser.uid));

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const loadedTasks: Task[] = [];
      snapshot.forEach((doc) => {
        const taskData = { id: doc.id, ...doc.data() } as Task;
        loadedTasks.push(taskData);
      });
      setTasks(loadedTasks.sort((a, b) => b.createdAt - a.createdAt));
    });

    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      const loadedNotes: Note[] = [];
      snapshot.forEach((doc) => {
        const noteData = { id: doc.id, ...doc.data() } as Note;
        loadedNotes.push(noteData);
      });
      setNotes(loadedNotes.sort((a, b) => b.completedAt - a.completedAt));
    });

    return () => {
      unsubscribeTasks();
      unsubscribeNotes();
    };
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

  const toggleNoteSelection = (noteId: string) => {
    const newSelection = new Set(selectedNoteIds);
    if (newSelection.has(noteId)) {
      newSelection.delete(noteId);
    } else {
      newSelection.add(noteId);
    }
    setSelectedNoteIds(newSelection);
  };

  const handleAssignTasks = async () => {
    if (selectedTaskIds.size === 0 && selectedNoteIds.size === 0) {
      Alert.alert('Nothing Selected', 'Please select at least one task or note to assign.');
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

      // Update notes with subjectId
      const noteUpdatePromises = Array.from(selectedNoteIds).map((noteId) =>
        updateDoc(doc(db, 'notes', noteId), { subjectId: subject.id })
      );

      await Promise.all([...taskUpdatePromises, ...noteUpdatePromises]);
      console.log(`✅ Updated ${selectedTaskIds.size} tasks and ${selectedNoteIds.size} notes with subjectId`);

      // Also update any existing notes that match these task titles
      const selectedTasks = tasks.filter(t => selectedTaskIds.has(t.id));
      let autoNotesUpdated = 0;

      for (const task of selectedTasks) {
        try {
          const notesQuery = query(
            collection(db, 'notes'),
            where('userId', '==', user.uid),
            where('taskTitle', '==', task.title)
          );
          
          const notesSnapshot = await getDocs(notesQuery);
          
          const noteUpdatePromises = notesSnapshot.docs.map((noteDoc) => {
            const noteData = noteDoc.data();
            if (!noteData.subjectId || noteData.subjectId !== subject.id) {
              autoNotesUpdated++;
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

      const totalNotes = selectedNoteIds.size + autoNotesUpdated;
      let message = '';
      if (selectedTaskIds.size > 0 && totalNotes > 0) {
        message = `${selectedTaskIds.size} task(s) and ${totalNotes} note(s) assigned to ${subject.name}!`;
      } else if (selectedTaskIds.size > 0) {
        message = `${selectedTaskIds.size} task(s) assigned to ${subject.name}!`;
      } else {
        message = `${totalNotes} note(s) assigned to ${subject.name}!`;
      }

      Alert.alert('Success', message);
      setSelectedTaskIds(new Set());
      setSelectedNoteIds(new Set());
      onClose();
    } catch (error) {
      console.error('Error assigning tasks:', error);
      Alert.alert('Error', 'Failed to assign. Please try again.');
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

    // Find matching note for this task
    const matchingNote = notes.find(note => note.taskTitle === item.title);

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
            
            {/* Show note content if exists */}
            {matchingNote?.notes && (
              <Text style={styles.notePreview} numberOfLines={1} ellipsizeMode="tail">
                {matchingNote.notes}
              </Text>
            )}
            
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

  const renderNoteItem = ({ item }: { item: Note }) => {
    const isSelected = selectedNoteIds.has(item.id);
    const isAlreadyAssigned = item.subjectId === subject?.id;
    
    // Find which subject this note is assigned to
    const assignedSubject = item.subjectId 
      ? subjects.find(s => s.id === item.subjectId)
      : null;
    
    const isAssignedToOtherSubject = assignedSubject && assignedSubject.id !== subject?.id;

    return (
      <TouchableOpacity
        style={[
          styles.taskItem,
          isSelected && styles.taskItemSelected,
          isAlreadyAssigned && styles.taskItemAlreadyAssigned,
        ]}
        onPress={() => toggleNoteSelection(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.taskItemLeft}>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={18} color="#FFF" />}
          </View>
          <View style={styles.taskInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Ionicons name="document-text" size={16} color="#6366F1" style={{ marginRight: 4 }} />
              <Text style={styles.taskTitle} numberOfLines={2}>
                {item.taskTitle || 'Untitled Note'}
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
            {item.notes && (
              <Text style={styles.notePreview} numberOfLines={1}>
                {item.notes}
              </Text>
            )}
            <View style={styles.taskMeta}>
              <Ionicons name="calendar-outline" size={14} color="#64748b" />
              <Text style={styles.taskDuration}>
                {new Date(item.completedAt).toLocaleDateString()}
              </Text>
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
              <Text style={styles.title}>Add Tasks & Notes</Text>
              <Text style={styles.subtitle}>
                Assign to {subject.icon} {subject.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Combined List */}
          <View style={styles.listContainer}>
            {tasks.length === 0 && notes.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={64} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Nothing to Assign</Text>
                <Text style={styles.emptyText}>
                  You haven't created any tasks or notes yet.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.instruction}>
                  Select tasks and notes to assign to this subject
                </Text>
                <FlatList
                  data={[
                    // All tasks (will show their notes inline)
                    ...tasks.map(t => ({ ...t, type: 'task' })),
                    // Only standalone notes (notes without matching tasks)
                    ...notes
                      .filter(note => !tasks.some(task => task.title === note.taskTitle))
                      .map(n => ({ ...n, type: 'note' }))
                  ]}
                  renderItem={({ item }) => 
                    item.type === 'task' 
                      ? renderTaskItem({ item: item as Task })
                      : renderNoteItem({ item: item as Note })
                  }
                  keyExtractor={(item) => `${item.type}-${item.id}`}
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={true}
                />
              </>
            )}
          </View>

          {/* Footer */}
          {(tasks.length > 0 || notes.length > 0) && (
            <View style={styles.footer}>
              <Text style={styles.selectedCount}>
                {selectedTaskIds.size + selectedNoteIds.size} item(s) selected
              </Text>
              <TouchableOpacity
                style={[
                  styles.assignButton,
                  ((selectedTaskIds.size === 0 && selectedNoteIds.size === 0) || loading) && styles.assignButtonDisabled,
                ]}
                onPress={handleAssignTasks}
                disabled={(selectedTaskIds.size === 0 && selectedNoteIds.size === 0) || loading}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.assignButtonText}>
                  {loading ? 'Assigning...' : 'Assign Items'}
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
  notePreview: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6,
    marginTop: 2,
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
  statusabandoned: {
    backgroundColor: '#FEE2E2',
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
