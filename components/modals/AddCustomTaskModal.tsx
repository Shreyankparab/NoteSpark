import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { Subject, SubSubject } from "../../types";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
} from 'firebase/firestore';
import { db, auth } from '../../firebase/firebaseConfig';

interface AddCustomTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, duration: number, subjectId?: string, subSubjectId?: string) => void;
  subjects: Subject[];
}

const AddCustomTaskModal: React.FC<AddCustomTaskModalProps> = ({
  visible,
  onClose,
  onSave,
  subjects,
}) => {
  const [taskTitle, setTaskTitle] = useState("");
  const [duration, setDuration] = useState("25");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>(undefined);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  // Sub-Subject State
  const [subSubjects, setSubSubjects] = useState<SubSubject[]>([]);
  const [selectedSubSubjectId, setSelectedSubSubjectId] = useState<string | null>(null);
  const [showSubSubjectPicker, setShowSubSubjectPicker] = useState(false);
  const [showCreateSubSubject, setShowCreateSubSubject] = useState(false);
  const [newSubSubjectName, setNewSubSubjectName] = useState("");
  const [isCreatingSubSubject, setIsCreatingSubSubject] = useState(false);

  // Load sub-subjects when subject changes
  React.useEffect(() => {
    if (!auth.currentUser || !selectedSubjectId) {
      setSubSubjects([]);
      setSelectedSubSubjectId(null);
      return;
    }

    const subSubjectsRef = collection(db, 'subSubjects');
    const subSubjectsQuery = query(
      subSubjectsRef,
      where('userId', '==', auth.currentUser.uid),
      where('subjectId', '==', selectedSubjectId)
    );

    const unsubscribe = onSnapshot(subSubjectsQuery, (snapshot) => {
      const loadedSubSubjects: SubSubject[] = [];
      snapshot.forEach((doc) => {
        loadedSubSubjects.push({ id: doc.id, ...doc.data() } as SubSubject);
      });
      setSubSubjects(loadedSubSubjects.sort((a, b) => a.name.localeCompare(b.name)));
    });

    return () => unsubscribe();
  }, [selectedSubjectId]);

  const handleCreateSubSubject = async () => {
    if (!newSubSubjectName.trim()) {
      Alert.alert('Error', 'Please enter a topic name');
      return;
    }

    if (!auth.currentUser || !selectedSubjectId) return;

    setIsCreatingSubSubject(true);
    try {
      const subSubjectData = {
        name: newSubSubjectName.trim(),
        subjectId: selectedSubjectId,
        createdAt: Date.now(),
        userId: auth.currentUser.uid,
      };

      const docRef = await addDoc(collection(db, 'subSubjects'), subSubjectData);
      setSelectedSubSubjectId(docRef.id);
      setShowCreateSubSubject(false);
      setNewSubSubjectName('');
      Alert.alert('Success', `Topic "${subSubjectData.name}" created!`);
    } catch (error) {
      console.error('Error creating topic:', error);
      Alert.alert('Error', 'Failed to create topic. Please try again.');
    } finally {
      setIsCreatingSubSubject(false);
    }
  };

  const handleSave = () => {
    if (!taskTitle.trim()) {
      return;
    }

    const durationNum = parseInt(duration) || 25;

    if (durationNum < 1) {
      return;
    }

    onSave(taskTitle.trim(), durationNum, selectedSubjectId, selectedSubSubjectId || undefined);

    handleClose();
  };

  const handleClose = () => {
    setTaskTitle("");
    setDuration("25");
    setSelectedSubjectId(undefined);
    setSelectedSubSubjectId(null);
    setShowSubjectPicker(false);
    setShowSubSubjectPicker(false);
    onClose();
  };

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const selectedSubSubject = subSubjects.find(s => s.id === selectedSubSubjectId);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add Custom Task</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Task Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Task Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter task name..."
                placeholderTextColor="#94a3b8"
                value={taskTitle}
                onChangeText={setTaskTitle}
                autoFocus
              />
            </View>

            {/* Duration Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Duration (1-120 minutes)</Text>
              <TextInput
                style={styles.input}
                placeholder="25"
                placeholderTextColor="#94a3b8"
                value={duration}
                onChangeText={(text) => {
                  // Only allow numbers
                  const numericValue = text.replace(/[^0-9]/g, '');
                  // Limit to 120
                  const num = parseInt(numericValue) || 0;
                  if (num <= 120) {
                    setDuration(numericValue);
                  }
                }}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>

            {/* Subject Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Subject (Optional)</Text>
              <TouchableOpacity
                style={styles.subjectSelector}
                onPress={() => setShowSubjectPicker(!showSubjectPicker)}
              >
                {selectedSubject ? (
                  <View style={styles.selectedSubjectContainer}>
                    <Text style={styles.subjectIcon}>{selectedSubject.icon}</Text>
                    <Text style={styles.selectedSubjectText}>{selectedSubject.name}</Text>
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Select a subject</Text>
                )}
                <Ionicons
                  name={showSubjectPicker ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>

              {/* Subject Picker Dropdown */}
              {showSubjectPicker && (
                <ScrollView style={styles.subjectDropdown} nestedScrollEnabled>
                  <TouchableOpacity
                    style={styles.subjectOption}
                    onPress={() => {
                      setSelectedSubjectId(undefined);
                      setShowSubjectPicker(false);
                    }}
                  >
                    <Text style={styles.subjectOptionText}>No Subject</Text>
                  </TouchableOpacity>
                  {subjects.map((subject) => (
                    <TouchableOpacity
                      key={subject.id}
                      style={[
                        styles.subjectOption,
                        selectedSubjectId === subject.id && styles.subjectOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedSubjectId(subject.id);
                        setShowSubjectPicker(false);
                      }}
                    >
                      <Text style={styles.subjectIcon}>{subject.icon}</Text>
                      <Text style={styles.subjectOptionText}>{subject.name}</Text>
                      <View
                        style={[
                          styles.colorIndicator,
                          { backgroundColor: subject.color },
                        ]}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Sub-Subject Selection */}
            {selectedSubjectId && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Topic (Optional)</Text>
                <TouchableOpacity
                  style={styles.subjectSelector}
                  onPress={() => setShowSubSubjectPicker(!showSubSubjectPicker)}
                >
                  {selectedSubSubject ? (
                    <View style={styles.selectedSubjectContainer}>
                      <Text style={styles.subjectIcon}></Text>
                      <Text style={[styles.selectedSubjectText, { color: selectedSubject?.color }]}>{selectedSubSubject.name}</Text>
                    </View>
                  ) : (
                    <Text style={styles.placeholderText}>Select a topic</Text>
                  )}
                  <Ionicons
                    name={showSubSubjectPicker ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#64748b"
                  />
                </TouchableOpacity>

                {/* Sub-Subject Picker Dropdown */}
                {showSubSubjectPicker && (
                  <View>
                    <ScrollView style={styles.subjectDropdown} nestedScrollEnabled>
                      <TouchableOpacity
                        style={styles.subjectOption}
                        onPress={() => {
                          setSelectedSubSubjectId(null);
                          setShowSubSubjectPicker(false);
                        }}
                      >
                        <Text style={styles.subjectOptionText}>No Topic</Text>
                      </TouchableOpacity>
                      {subSubjects.map((sub) => (
                        <TouchableOpacity
                          key={sub.id}
                          style={[
                            styles.subjectOption,
                            selectedSubSubjectId === sub.id && styles.subjectOptionSelected,
                          ]}
                          onPress={() => {
                            setSelectedSubSubjectId(sub.id);
                            setShowSubSubjectPicker(false);
                          }}
                        >
                          <Text style={[styles.subjectOptionText, { color: selectedSubject?.color }]}>{sub.name}</Text>
                          {selectedSubSubjectId === sub.id && (
                            <Ionicons name="checkmark" size={16} color={selectedSubject?.color} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Create New Topic Button */}
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        backgroundColor: '#F8FAFC',
                        borderBottomLeftRadius: 12,
                        borderBottomRightRadius: 12,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        borderTopWidth: 0,
                      }}
                      onPress={() => {
                        setShowSubSubjectPicker(false);
                        setShowCreateSubSubject(true);
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="#6366F1" />
                      <Text style={{ marginLeft: 8, color: '#6366F1', fontWeight: '600' }}>
                        Create new topic
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Info Text */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <Text style={styles.infoText}>
                Task will be created with "Pending" status. Use the play button to start it.
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!taskTitle.trim() || parseInt(duration) < 1) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!taskTitle.trim() || parseInt(duration) < 1}
            >
              <Text style={styles.saveButtonText}>Add Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Quick Create Sub-Subject Modal */}
      <Modal
        visible={showCreateSubSubject}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateSubSubject(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.container, { maxHeight: 'auto', paddingBottom: 24 }]}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>New Topic</Text>
              <TouchableOpacity onPress={() => setShowCreateSubSubject(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <Text style={{ marginBottom: 16, color: '#64748B' }}>
                Adding topic to: <Text style={{ fontWeight: '700', color: selectedSubject?.color }}>{selectedSubject?.name}</Text>
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Topic name (e.g., Algebra)"
                placeholderTextColor="#94A3B8"
                value={newSubSubjectName}
                onChangeText={setNewSubSubjectName}
                autoFocus
              />

              <TouchableOpacity
                style={{
                  borderRadius: 12,
                  marginTop: 16,
                  overflow: 'hidden'
                }}
                onPress={handleCreateSubSubject}
                disabled={isCreatingSubSubject}
              >
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16,
                    gap: 8,
                    opacity: isCreatingSubSubject ? 0.7 : 1
                  }}
                >
                  <Ionicons name="add-circle" size={20} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>
                    {isCreatingSubSubject ? 'Creating...' : 'Create Topic'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1e293b",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#1e40af",
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#9333ea",
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#cbd5e1",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  subjectSelector: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedSubjectContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subjectIcon: {
    fontSize: 20,
  },
  selectedSubjectText: {
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "500",
  },
  placeholderText: {
    fontSize: 16,
    color: "#94a3b8",
  },
  subjectDropdown: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
    maxHeight: 200,
  },
  subjectOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  subjectOptionSelected: {
    backgroundColor: "#f0f9ff",
  },
  subjectOptionText: {
    flex: 1,
    fontSize: 15,
    color: "#1e293b",
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});

export default AddCustomTaskModal;
