import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebaseConfig';
import { Subject, Task } from '../../types';

interface AssignSubjectModalProps {
  visible: boolean;
  onClose: () => void;
  task: Task | null;
}

const AssignSubjectModal: React.FC<AssignSubjectModalProps> = ({
  visible,
  onClose,
  task,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (!auth.currentUser || !visible) return;

    const subjectsRef = collection(db, 'subjects');
    const subjectsQuery = query(subjectsRef, where('userId', '==', auth.currentUser.uid));
    
    const unsubscribe = onSnapshot(subjectsQuery, (snapshot) => {
      const loadedSubjects: Subject[] = [];
      snapshot.forEach((doc) => {
        loadedSubjects.push({ id: doc.id, ...doc.data() } as Subject);
      });
      setSubjects(loadedSubjects.sort((a, b) => a.name.localeCompare(b.name)));
    });

    return () => unsubscribe();
  }, [visible]);

  useEffect(() => {
    if (task) {
      setSelectedSubjectId(task.subjectId || null);
    }
  }, [task]);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleAssignSubject = async (subjectId: string | null) => {
    if (!task) return;

    try {
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, {
        subjectId: subjectId || null,
      });
      setSelectedSubjectId(subjectId);
      
      // Close modal after a short delay to show selection
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (error) {
      console.error('Error assigning subject:', error);
    }
  };

  const renderSubjectItem = ({ item }: { item: Subject }) => {
    const isSelected = selectedSubjectId === item.id;

    return (
      <TouchableOpacity
        onPress={() => handleAssignSubject(item.id)}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.subjectItem,
            isSelected && styles.subjectItemSelected,
            { opacity: fadeAnim },
          ]}
        >
          <LinearGradient
            colors={isSelected ? [item.color + '30', item.color + '20'] : ['#F8FAFC', '#F8FAFC']}
            style={styles.subjectGradient}
          >
            <View style={styles.subjectContent}>
              <View style={styles.subjectInfo}>
                <Text style={styles.subjectIcon}>{item.icon}</Text>
                <Text style={[styles.subjectName, isSelected && { color: item.color }]}>
                  {item.name}
                </Text>
              </View>
              {isSelected && (
                <View style={[styles.checkmark, { backgroundColor: item.color }]}>
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                </View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalContent, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Assign to Subject</Text>
              <Text style={styles.taskTitle}>{task?.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* No Subject Option */}
          <TouchableOpacity
            onPress={() => handleAssignSubject(null)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.noSubjectItem,
                selectedSubjectId === null && styles.noSubjectItemSelected,
              ]}
            >
              <View style={styles.subjectContent}>
                <View style={styles.subjectInfo}>
                  <Text style={styles.noSubjectIcon}>📋</Text>
                  <Text style={styles.noSubjectText}>No Subject</Text>
                </View>
                {selectedSubjectId === null && (
                  <View style={styles.checkmarkGray}>
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* Subjects List */}
          {subjects.length > 0 ? (
            <FlatList
              data={subjects}
              renderItem={renderSubjectItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyText}>No subjects yet</Text>
              <Text style={styles.emptyHint}>
                Create subjects in the Subjects screen
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
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
  taskTitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  noSubjectItem: {
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  noSubjectItemSelected: {
    borderColor: '#64748b',
    backgroundColor: '#F1F5F9',
  },
  noSubjectIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  noSubjectText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  listContent: {
    padding: 24,
    paddingTop: 8,
  },
  subjectItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  subjectItemSelected: {
    borderColor: '#6366F1',
  },
  subjectGradient: {
    padding: 16,
  },
  subjectContent: {
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
    fontSize: 28,
    marginRight: 12,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkGray: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#64748b',
  },
});

export default AssignSubjectModal;
