import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Animated,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase/firebaseConfig';
import { Subject, Task, SubSubject } from '../types';
import AddTasksToSubjectModal from '../components/modals/AddTasksToSubjectModal';

const SUBJECT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#F8B500', '#52B788', '#E63946', '#457B9D'
];

const SUBJECT_ICONS = [
  '📚', '🎨', '🔬', '💻', '🎵', '⚽',
  '🎭', '📊', '🌍', '🧮', '✍️', '🎯'
];

const SubjectsScreen: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(SUBJECT_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(SUBJECT_COLORS[0]);
  const [showAddTasksModal, setShowAddTasksModal] = useState(false);
  const [selectedSubjectForTasks, setSelectedSubjectForTasks] = useState<Subject | null>(null);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Sub-subject state
  const [subSubjects, setSubSubjects] = useState<SubSubject[]>([]);
  const [showSubSubjectModal, setShowSubSubjectModal] = useState(false);
  const [editingSubSubject, setEditingSubSubject] = useState<SubSubject | null>(null);
  const [subSubjectName, setSubSubjectName] = useState('');
  const [selectedSubjectForSubSubject, setSelectedSubjectForSubSubject] = useState<Subject | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Load subjects
    const subjectsRef = collection(db, 'subjects');
    const subjectsQuery = query(subjectsRef, where('userId', '==', auth.currentUser.uid));

    const unsubscribeSubjects = onSnapshot(subjectsQuery, (snapshot) => {
      const loadedSubjects: Subject[] = [];
      snapshot.forEach((doc) => {
        loadedSubjects.push({ id: doc.id, ...doc.data() } as Subject);
      });
      setSubjects(loadedSubjects.sort((a, b) => b.createdAt - a.createdAt));
    });

    // Load tasks
    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(tasksRef, where('userId', '==', auth.currentUser.uid));

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const loadedTasks: Task[] = [];
      snapshot.forEach((doc) => {
        loadedTasks.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(loadedTasks);
    });

    // Load sub-subjects
    const subSubjectsRef = collection(db, 'subSubjects');
    const subSubjectsQuery = query(subSubjectsRef, where('userId', '==', auth.currentUser.uid));

    const unsubscribeSubSubjects = onSnapshot(subSubjectsQuery, (snapshot) => {
      const loadedSubSubjects: SubSubject[] = [];
      snapshot.forEach((doc) => {
        loadedSubSubjects.push({ id: doc.id, ...doc.data() } as SubSubject);
      });
      setSubSubjects(loadedSubSubjects.sort((a, b) => a.createdAt - b.createdAt));
    });

    return () => {
      unsubscribeSubjects();
      unsubscribeTasks();
      unsubscribeSubSubjects();
    };
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const openAddModal = () => {
    setEditingSubject(null);
    setSubjectName('');
    setSelectedColor(SUBJECT_COLORS[0]);
    setSelectedIcon(SUBJECT_ICONS[0]);
    setShowAddModal(true);
  };

  const openEditModal = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectName(subject.name);
    setSelectedColor(subject.color);
    setSelectedIcon(subject.icon);
    setShowAddModal(true);
  };

  const handleSaveSubject = async () => {
    if (!subjectName.trim()) {
      Alert.alert('Error', 'Please enter a subject name');
      return;
    }

    if (!auth.currentUser) return;

    try {
      if (editingSubject) {
        // Update existing subject
        const subjectRef = doc(db, 'subjects', editingSubject.id);
        await updateDoc(subjectRef, {
          name: subjectName.trim(),
          color: selectedColor,
          icon: selectedIcon,
        });
      } else {
        // Create new subject
        await addDoc(collection(db, 'subjects'), {
          name: subjectName.trim(),
          color: selectedColor,
          icon: selectedIcon,
          createdAt: Date.now(),
          userId: auth.currentUser.uid,
        });
      }
      setShowAddModal(false);
    } catch (error) {
      console.error('Error saving subject:', error);
      Alert.alert('Error', 'Failed to save subject');
    }
  };

  const handleDeleteSubject = (subject: Subject) => {
    const tasksInSubject = tasks.filter(t => t.subjectId === subject.id);

    Alert.alert(
      'Delete Subject',
      tasksInSubject.length > 0
        ? `This subject has ${tasksInSubject.length} task(s). Tasks will be unassigned. Continue?`
        : 'Are you sure you want to delete this subject?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Unassign tasks from this subject
              for (const task of tasksInSubject) {
                const taskRef = doc(db, 'tasks', task.id);
                await updateDoc(taskRef, { subjectId: null });
              }

              // Delete subject
              await deleteDoc(doc(db, 'subjects', subject.id));
            } catch (error) {
              console.error('Error deleting subject:', error);
              Alert.alert('Error', 'Failed to delete subject');
            }
          },
        },
      ]
    );
  };

  const getTasksForSubject = (subjectId: string) => {
    return tasks.filter(t => t.subjectId === subjectId);
  };

  const getTasksForSubSubject = (subSubjectId: string) => {
    return tasks.filter(t => t.subSubjectId === subSubjectId);
  };

  const getTasksWithoutSubSubject = (subjectId: string) => {
    return tasks.filter(t => t.subjectId === subjectId && !t.subSubjectId);
  };

  const getUnassignedTasks = () => {
    return tasks.filter(t => !t.subjectId);
  };

  const toggleSubjectExpansion = (subjectId: string) => {
    setExpandedSubjectId(expandedSubjectId === subjectId ? null : subjectId);
  };

  // Sub-subject management functions
  const openAddSubSubjectModal = (subject: Subject) => {
    setSelectedSubjectForSubSubject(subject);
    setEditingSubSubject(null);
    setSubSubjectName('');
    setShowSubSubjectModal(true);
  };

  const openEditSubSubjectModal = (subSubject: SubSubject) => {
    const parentSubject = subjects.find(s => s.id === subSubject.subjectId);
    if (parentSubject) {
      setSelectedSubjectForSubSubject(parentSubject);
    }
    setEditingSubSubject(subSubject);
    setSubSubjectName(subSubject.name);
    setShowSubSubjectModal(true);
  };

  const handleSaveSubSubject = async () => {
    if (!subSubjectName.trim()) {
      Alert.alert('Error', 'Please enter a topic name');
      return;
    }

    if (!auth.currentUser) return;

    try {
      if (editingSubSubject) {
        // Update existing sub-subject
        const subSubjectRef = doc(db, 'subSubjects', editingSubSubject.id);
        await updateDoc(subSubjectRef, {
          name: subSubjectName.trim(),
        });
      } else {
        // Create new sub-subject
        if (!selectedSubjectForSubSubject) return;

        await addDoc(collection(db, 'subSubjects'), {
          name: subSubjectName.trim(),
          subjectId: selectedSubjectForSubSubject.id,
          userId: auth.currentUser.uid,
          createdAt: Date.now(),
        });
      }
      setShowSubSubjectModal(false);
      setSelectedSubjectForSubSubject(null);
      setSubSubjectName('');
      setEditingSubSubject(null);
    } catch (error) {
      console.error('Error saving sub-subject:', error);
      Alert.alert('Error', 'Failed to save topic');
    }
  };

  const handleDeleteSubSubject = (subSubject: SubSubject) => {
    const tasksInSubSubject = tasks.filter(t => t.subSubjectId === subSubject.id);

    Alert.alert(
      'Delete Topic',
      tasksInSubSubject.length > 0
        ? `This topic has ${tasksInSubSubject.length} task(s). Tasks will be unassigned from this topic. Continue?`
        : 'Are you sure you want to delete this topic?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Unassign tasks from this sub-subject
              for (const task of tasksInSubSubject) {
                const taskRef = doc(db, 'tasks', task.id);
                await updateDoc(taskRef, { subSubjectId: null });
              }

              // Delete sub-subject
              await deleteDoc(doc(db, 'subSubjects', subSubject.id));
            } catch (error) {
              console.error('Error deleting sub-subject:', error);
              Alert.alert('Error', 'Failed to delete topic');
            }
          },
        },
      ]
    );
  };

  const getSubSubjectsForSubject = (subjectId: string) => {
    return subSubjects.filter(ss => ss.subjectId === subjectId);
  };

  const renderSubjectCard = ({ item }: { item: Subject }) => {
    const subjectTasks = getTasksForSubject(item.id);
    const completedTasks = subjectTasks.filter(t => t.status === 'completed').length;
    const isExpanded = expandedSubjectId === item.id;

    return (
      <Animated.View style={[styles.subjectCard, { opacity: fadeAnim }]}>
        <TouchableOpacity
          onPress={() => toggleSubjectExpansion(item.id)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[item.color + '20', item.color + '10']}
            style={styles.subjectGradient}
          >
            <View style={styles.subjectHeader}>
              <View style={styles.subjectInfo}>
                <Text style={styles.subjectIcon}>{item.icon}</Text>
                <View style={styles.subjectTextContainer}>
                  <Text style={styles.subjectName}>{item.name}</Text>
                  <Text style={styles.subjectStats}>
                    {subjectTasks.length} task{subjectTasks.length !== 1 ? 's' : ''} • {completedTasks} completed
                  </Text>
                </View>
              </View>

              <View style={styles.subjectActions}>
                <TouchableOpacity
                  onPress={() => openEditModal(item)}
                  style={styles.actionButton}
                >
                  <Ionicons name="pencil" size={20} color={item.color} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteSubject(item)}
                  style={styles.actionButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                </TouchableOpacity>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color="#64748b"
                />
              </View>
            </View>

            {/* Progress bar */}
            {subjectTasks.length > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(completedTasks / subjectTasks.length) * 100}%`,
                        backgroundColor: item.color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.round((completedTasks / subjectTasks.length) * 100)}%
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Expanded content */}
        {isExpanded && (
          <View style={styles.tasksList}>
            {/* Sub-subjects (Topics) section */}
            <View style={styles.subSubjectsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📖 Topics</Text>
                <TouchableOpacity
                  onPress={() => openAddSubSubjectModal(item)}
                  style={[styles.addTopicButton, { borderColor: item.color }]}
                >
                  <Ionicons name="add" size={16} color={item.color} />
                  <Text style={[styles.addTopicText, { color: item.color }]}>Add Topic</Text>
                </TouchableOpacity>
              </View>

              {getSubSubjectsForSubject(item.id).length > 0 ? (
                getSubSubjectsForSubject(item.id).map((subSubject) => {
                  const topicTasks = getTasksForSubSubject(subSubject.id);
                  const completedTopicTasks = topicTasks.filter(t => t.status === 'completed').length;

                  return (
                    <View key={subSubject.id} style={styles.subSubjectCard}>
                      <View style={styles.subSubjectHeader}>
                        <View style={styles.subSubjectInfo}>
                          <Text style={styles.subSubjectIcon}>📖</Text>
                          <View style={styles.subSubjectTextContainer}>
                            <Text style={styles.subSubjectName}>{subSubject.name}</Text>
                            <Text style={styles.subSubjectStats}>
                              {topicTasks.length} task{topicTasks.length !== 1 ? 's' : ''} • {completedTopicTasks} completed
                            </Text>
                          </View>
                        </View>
                        <View style={styles.subSubjectActions}>
                          <TouchableOpacity
                            onPress={() => openEditSubSubjectModal(subSubject)}
                            style={styles.iconButton}
                          >
                            <Ionicons name="pencil" size={16} color="#64748b" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteSubSubject(subSubject)}
                            style={styles.iconButton}
                          >
                            <Ionicons name="trash-outline" size={16} color="#E74C3C" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Tasks for this topic */}
                      {topicTasks.length > 0 && (
                        <View style={styles.topicTasksList}>
                          {topicTasks.map((task) => (
                            <View key={task.id} style={styles.topicTaskItem}>
                              <Ionicons
                                name={task.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'}
                                size={18}
                                color={task.status === 'completed' ? '#10B981' : '#94A3B8'}
                              />
                              <Text
                                style={[
                                  styles.topicTaskTitle,
                                  task.status === 'completed' && styles.taskTitleCompleted,
                                ]}
                              >
                                {task.title}
                              </Text>
                              <Text style={styles.topicTaskDuration}>{task.duration}m</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptySubSubjectsText}>No topics yet. Add one to organize your tasks!</Text>
              )}
            </View>

            {/* Tasks section - Only tasks without sub-subjects */}
            <View style={styles.tasksSection}>
              <Text style={styles.sectionTitle}>✓ General Tasks</Text>
              {(() => {
                const generalTasks = getTasksWithoutSubSubject(item.id);
                return generalTasks.length > 0 ? (
                  <>
                    {generalTasks.map((task) => (
                      <View key={task.id} style={styles.taskItem}>
                        <Ionicons
                          name={task.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'}
                          size={20}
                          color={task.status === 'completed' ? '#10B981' : '#94A3B8'}
                        />
                        <Text
                          style={[
                            styles.taskTitle,
                            task.status === 'completed' && styles.taskTitleCompleted,
                          ]}
                        >
                          {task.title}
                        </Text>
                        <Text style={styles.taskDuration}>{task.duration}m</Text>
                      </View>
                    ))}
                  </>
                ) : (
                  <View style={styles.emptyTasksContainer}>
                    <Text style={styles.emptyTasksText}>No general tasks</Text>
                  </View>
                );
              })()}

              {/* Add Tasks Button */}
              <TouchableOpacity
                style={[styles.addTasksButton, { borderColor: item.color }]}
                onPress={() => {
                  setSelectedSubjectForTasks(item);
                  setShowAddTasksModal(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color={item.color} />
                <Text style={[styles.addTasksText, { color: item.color }]}>
                  Add Existing Tasks
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.header}>
        <Text style={styles.headerTitle}>My Subjects</Text>
        <Text style={styles.headerSubtitle}>
          Organize your tasks by subject
        </Text>
      </LinearGradient>

      {/* Subjects List */}
      <FlatList
        data={subjects}
        renderItem={renderSubjectCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>No subjects yet</Text>
            <Text style={styles.emptyText}>
              Create subjects to organize your tasks
            </Text>
          </View>
        }
        ListFooterComponent={
          getUnassignedTasks().length > 0 ? (
            <View style={styles.unassignedSection}>
              <Text style={styles.unassignedTitle}>
                📋 Unassigned Tasks ({getUnassignedTasks().length})
              </Text>
              <Text style={styles.unassignedHint}>
                Assign these tasks to a subject from the Tasks screen
              </Text>
            </View>
          ) : null
        }
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openAddModal}
        activeOpacity={0.8}
      >
        <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.fabGradient}>
          <Ionicons name="add" size={32} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Add/Edit Subject Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSubject ? 'Edit Subject' : 'New Subject'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Subject Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Subject Name</Text>
                <TextInput
                  style={styles.input}
                  value={subjectName}
                  onChangeText={setSubjectName}
                  placeholder="e.g., Mathematics, Physics, Art"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Icon Selection */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Choose Icon</Text>
                <View style={styles.iconGrid}>
                  {SUBJECT_ICONS.map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconOption,
                        selectedIcon === icon && styles.iconOptionSelected,
                      ]}
                      onPress={() => setSelectedIcon(icon)}
                    >
                      <Text style={styles.iconText}>{icon}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Color Selection */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Choose Color</Text>
                <View style={styles.colorGrid}>
                  {SUBJECT_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && styles.colorOptionSelected,
                      ]}
                      onPress={() => setSelectedColor(color)}
                    >
                      {selectedColor === color && (
                        <Ionicons name="checkmark" size={20} color="#FFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Preview */}
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>Preview</Text>
                <View style={[styles.previewCard, { borderColor: selectedColor }]}>
                  <Text style={styles.previewIcon}>{selectedIcon}</Text>
                  <Text style={styles.previewName}>{subjectName || 'Subject Name'}</Text>
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveSubject}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>
                    {editingSubject ? 'Update Subject' : 'Create Subject'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Sub-Subject (Topic) Modal */}
      <Modal
        visible={showSubSubjectModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSubSubjectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSubSubject ? 'Edit Topic' : 'New Topic'}
              </Text>
              <TouchableOpacity onPress={() => setShowSubSubjectModal(false)}>
                <Ionicons name="close" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {selectedSubjectForSubSubject && (
                <View style={styles.parentSubjectInfo}>
                  <Text style={styles.parentSubjectLabel}>Subject:</Text>
                  <View style={styles.parentSubjectBadge}>
                    <Text style={styles.parentSubjectIcon}>{selectedSubjectForSubSubject.icon}</Text>
                    <Text style={styles.parentSubjectName}>{selectedSubjectForSubSubject.name}</Text>
                  </View>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Topic Name</Text>
                <TextInput
                  style={styles.input}
                  value={subSubjectName}
                  onChangeText={setSubSubjectName}
                  placeholder="e.g., Chapter 1, Algebra, Introduction"
                  placeholderTextColor="#94A3B8"
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveSubSubject}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>
                    {editingSubSubject ? 'Update Topic' : 'Create Topic'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Tasks to Subject Modal */}
      <AddTasksToSubjectModal
        visible={showAddTasksModal}
        onClose={() => {
          setShowAddTasksModal(false);
          setSelectedSubjectForTasks(null);
        }}
        subject={selectedSubjectForTasks}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E0E7FF',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  subjectCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  subjectGradient: {
    padding: 16,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subjectIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  subjectTextContainer: {
    flex: 1,
  },
  subjectName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  subjectStats: {
    fontSize: 14,
    color: '#64748b',
  },
  subjectActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    minWidth: 40,
  },
  tasksList: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  taskTitle: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  taskDuration: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
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
    textAlign: 'center',
  },
  unassignedSection: {
    marginTop: 24,
    padding: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  unassignedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  unassignedHint: {
    fontSize: 14,
    color: '#78350F',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    borderRadius: 30,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    maxHeight: '90%',
  },
  modalScrollView: {
    paddingHorizontal: 24,
  },
  modalScrollContent: {
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconOption: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  iconText: {
    fontSize: 28,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  previewContainer: {
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 2,
  },
  previewIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyTasksContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyTasksText: {
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  addTasksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginTop: 12,
    gap: 8,
  },
  addTasksText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Sub-subjects (Topics) styles
  subSubjectsSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  addTopicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 6,
  },
  addTopicText: {
    fontSize: 13,
    fontWeight: '600',
  },
  subSubjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 8,
    gap: 10,
  },
  subSubjectIcon: {
    fontSize: 18,
  },
  subSubjectName: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  subSubjectActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 6,
  },
  emptySubSubjectsText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  tasksSection: {
    marginTop: 8,
  },
  // Sub-subject modal styles
  modalBody: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  parentSubjectInfo: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  parentSubjectLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '600',
  },
  parentSubjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  parentSubjectIcon: {
    fontSize: 24,
  },
  parentSubjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  // Topic task card styles
  subSubjectCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subSubjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subSubjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subSubjectTextContainer: {
    flex: 1,
  },
  subSubjectStats: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  topicTasksList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  topicTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  topicTaskTitle: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
  },
  topicTaskDuration: {
    fontSize: 13,
    color: '#64748b',
  },
});

export default SubjectsScreen;
