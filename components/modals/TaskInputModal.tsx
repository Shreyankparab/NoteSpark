import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert,
  ScrollView,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { SoundPreset, Subject } from "../../types";
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebaseConfig';
import { playCompletionSound } from "../../utils/audio";

interface TaskInputModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (taskTitle: string, subjectId?: string) => void;
  isSoundOn: boolean;
  isVibrationOn: boolean;
  selectedSound: SoundPreset;
  onToggleSound: (value: boolean) => void;
  onToggleVibration: (value: boolean) => void;
  onSelectSound: (sound: SoundPreset) => void;
  soundPresets: SoundPreset[];
  isFlipDeviceOn?: boolean;
  onToggleFlipDevice?: (value: boolean) => void;
}

const TaskInputModal: React.FC<TaskInputModalProps> = ({
  visible,
  onClose,
  onSave,
  isSoundOn,
  isVibrationOn,
  selectedSound,
  onToggleSound,
  onToggleVibration,
  onSelectSound,
  soundPresets,
  isFlipDeviceOn = false,
  onToggleFlipDevice,
}) => {
  const [taskTitle, setTaskTitle] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectIcon, setNewSubjectIcon] = useState("📚");
  const [newSubjectColor, setNewSubjectColor] = useState("#6366F1");
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);

  const QUICK_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];
  const QUICK_ICONS = ['📚', '🎨', '💻', '🔬', '🎵', '⚽'];

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

  const handleSave = () => {
    if (taskTitle.trim()) {
      onSave(taskTitle.trim(), selectedSubjectId || undefined);
      setTaskTitle("");
      setSelectedSubjectId(null);
    } else {
      Alert.alert("Error", "Please enter a task title");
    }
  };

  const handleSkip = () => {
    onSave("", undefined);
    setTaskTitle("");
    setSelectedSubjectId(null);
  };

  const getSelectedSubject = () => {
    return subjects.find(s => s.id === selectedSubjectId);
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) {
      Alert.alert('Error', 'Please enter a subject name');
      return;
    }

    if (!auth.currentUser) return;

    setIsCreatingSubject(true);
    try {
      const subjectData = {
        name: newSubjectName.trim(),
        icon: newSubjectIcon,
        color: newSubjectColor,
        createdAt: Date.now(),
        userId: auth.currentUser.uid,
      };

      const docRef = await addDoc(collection(db, 'subjects'), subjectData);
      setSelectedSubjectId(docRef.id);
      setShowCreateSubject(false);
      setNewSubjectName('');
      Alert.alert('Success', `Subject "${subjectData.name}" created!`);
    } catch (error) {
      console.error('Error creating subject:', error);
      Alert.alert('Error', 'Failed to create subject. Please try again.');
    } finally {
      setIsCreatingSubject(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleSkip}
    >
      <View style={styles.fullScreenContainer}>
        <View style={styles.taskInputModalContainer}>
          {/* Gradient Header */}
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientHeader}
          >
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.headerTitle}>🎯 Start Session</Text>
                <Text style={styles.headerSubtitle}>Focus on what matters</Text>
              </View>
              <TouchableOpacity onPress={handleSkip} style={styles.closeButton}>
                <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
          >
            {/* Task Input Card */}
            <View style={styles.inputCard}>
              <View style={styles.inputHeader}>
                <Ionicons name="create-outline" size={20} color="#6366F1" />
                <Text style={styles.inputCardTitle}>What's your focus?</Text>
              </View>
              <TextInput
                style={styles.taskInput}
                placeholder="e.g., Study React Native, Read Chapter 5..."
                placeholderTextColor="#94A3B8"
                value={taskTitle}
                onChangeText={setTaskTitle}
                multiline
                maxLength={100}
                autoFocus
              />
              <Text style={styles.charCount}>{taskTitle.length}/100</Text>
            </View>

            {/* Subject Selection */}
            <View style={styles.subjectSection}>
              <Text style={styles.sectionTitle}>📚 Subject (Optional)</Text>
              
              {getSelectedSubject() ? (
                <TouchableOpacity
                  style={[styles.selectedSubjectCard, { borderColor: getSelectedSubject()!.color }]}
                  onPress={() => setShowSubjectPicker(true)}
                >
                  <View style={styles.subjectCardContent}>
                    <Text style={styles.subjectIcon}>{getSelectedSubject()!.icon}</Text>
                    <Text style={[styles.subjectName, { color: getSelectedSubject()!.color }]}>
                      {getSelectedSubject()!.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedSubjectId(null)}
                    style={styles.removeSubjectButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ) : (
                <View style={styles.subjectButtons}>
                  <TouchableOpacity
                    style={styles.selectSubjectButton}
                    onPress={() => setShowSubjectPicker(true)}
                  >
                    <Ionicons name="folder-outline" size={20} color="#6366F1" />
                    <Text style={styles.selectSubjectText}>Select Subject</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.createSubjectButton}
                    onPress={() => setShowCreateSubject(true)}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#10B981" />
                    <Text style={styles.createSubjectText}>Create New</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Subject Picker Dropdown */}
              {showSubjectPicker && (
                <View style={styles.subjectPicker}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Choose Subject</Text>
                    <TouchableOpacity onPress={() => setShowSubjectPicker(false)}>
                      <Ionicons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView style={styles.subjectList} nestedScrollEnabled>
                    <TouchableOpacity
                      style={[
                        styles.subjectOption,
                        !selectedSubjectId && styles.subjectOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedSubjectId(null);
                        setShowSubjectPicker(false);
                      }}
                    >
                      <Text style={styles.noSubjectIcon}>📋</Text>
                      <Text style={styles.subjectOptionText}>No Subject</Text>
                      {!selectedSubjectId && (
                        <Ionicons name="checkmark" size={20} color="#6366F1" />
                      )}
                    </TouchableOpacity>
                    
                    {subjects.map((subject) => (
                      <TouchableOpacity
                        key={subject.id}
                        style={[
                          styles.subjectOption,
                          selectedSubjectId === subject.id && styles.subjectOptionSelected
                        ]}
                        onPress={() => {
                          setSelectedSubjectId(subject.id);
                          setShowSubjectPicker(false);
                        }}
                      >
                        <Text style={styles.subjectIcon}>{subject.icon}</Text>
                        <Text style={[styles.subjectOptionText, { color: subject.color }]}>
                          {subject.name}
                        </Text>
                        {selectedSubjectId === subject.id && (
                          <Ionicons name="checkmark" size={20} color={subject.color} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Sound Settings */}
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Session Settings</Text>
              
              {/* Sound Toggle */}
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => onToggleSound(!isSoundOn)}
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name={isSoundOn ? "volume-high" : "volume-mute"}
                    size={22}
                    color="#4F46E5"
                  />
                  <Text style={styles.settingLabel}>Completion Sound</Text>
                </View>
                <View
                  style={[
                    styles.toggle,
                    isSoundOn ? styles.toggleActive : styles.toggleInactive,
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      isSoundOn ? styles.toggleThumbActive : styles.toggleThumbInactive,
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {/* Vibration Toggle */}
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => onToggleVibration(!isVibrationOn)}
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name={isVibrationOn ? "phone-portrait" : "phone-portrait-outline"}
                    size={22}
                    color="#4F46E5"
                  />
                  <Text style={styles.settingLabel}>Vibration</Text>
                </View>
                <View
                  style={[
                    styles.toggle,
                    isVibrationOn ? styles.toggleActive : styles.toggleInactive,
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      isVibrationOn ? styles.toggleThumbActive : styles.toggleThumbInactive,
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {/* Flip Device Toggle */}
              {onToggleFlipDevice && (
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => onToggleFlipDevice(!isFlipDeviceOn)}
                >
                  <View style={styles.settingLeft}>
                    <Ionicons
                      name={isFlipDeviceOn ? "phone-landscape" : "phone-landscape-outline"}
                      size={22}
                      color="#4F46E5"
                    />
                    <View>
                      <Text style={styles.settingLabel}>Flip Device Mode</Text>
                      <Text style={styles.settingDescription}>Flip phone face down to focus</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.toggle,
                      isFlipDeviceOn ? styles.toggleActive : styles.toggleInactive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        isFlipDeviceOn ? styles.toggleThumbActive : styles.toggleThumbInactive,
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              )}

              {/* Sound Selection */}
              {isSoundOn && (
                <View style={styles.soundSelection}>
                  <Text style={styles.soundSelectionLabel}>Select Completion Sound</Text>
                  {soundPresets.map((sound) => (
                    <TouchableOpacity
                      key={sound}
                      style={[
                        styles.soundOption,
                        selectedSound === sound && styles.soundOptionSelected,
                      ]}
                      onPress={() => {
                        onSelectSound(sound);
                        playCompletionSound(sound);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.soundOptionLeft}>
                        <View style={[
                          styles.radioButton,
                          selectedSound === sound && styles.radioButtonSelected
                        ]}>
                          {selectedSound === sound && (
                            <View style={styles.radioButtonInner} />
                          )}
                        </View>
                        <View style={styles.soundTextContainer}>
                          <Text
                            style={[
                              styles.soundOptionText,
                              selectedSound === sound && styles.soundOptionTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {sound}
                          </Text>
                        </View>
                      </View>
                      <Ionicons 
                        name="play-circle-outline" 
                        size={24} 
                        color={selectedSound === sound ? "#4F46E5" : "#999"} 
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.taskSkipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Ionicons name="close-outline" size={20} color="#64748b" />
              <Text style={styles.taskSkipButtonText}>Skip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.startButtonWrapper}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.taskSaveButton}
              >
                <Ionicons name="play-circle" size={22} color="#FFF" />
                <Text style={styles.startButtonText}>Start Timer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Quick Create Subject Modal */}
      <Modal
        visible={showCreateSubject}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateSubject(false)}
      >
        <View style={styles.quickCreateOverlay}>
          <View style={styles.quickCreateContainer}>
            <View style={styles.quickCreateHeader}>
              <Text style={styles.quickCreateTitle}>Quick Create Subject</Text>
              <TouchableOpacity onPress={() => setShowCreateSubject(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.quickCreateInput}
              placeholder="Subject name (e.g., Mathematics)"
              placeholderTextColor="#94A3B8"
              value={newSubjectName}
              onChangeText={setNewSubjectName}
              autoFocus
            />

            <Text style={styles.quickCreateLabel}>Choose Icon</Text>
            <View style={styles.quickIconGrid}>
              {QUICK_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.quickIconOption,
                    newSubjectIcon === icon && styles.quickIconSelected
                  ]}
                  onPress={() => setNewSubjectIcon(icon)}
                >
                  <Text style={styles.quickIconText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.quickCreateLabel}>Choose Color</Text>
            <View style={styles.quickColorGrid}>
              {QUICK_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.quickColorOption,
                    { backgroundColor: color },
                    newSubjectColor === color && styles.quickColorSelected
                  ]}
                  onPress={() => setNewSubjectColor(color)}
                >
                  {newSubjectColor === color && (
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.quickCreateButton,
                isCreatingSubject && styles.quickCreateButtonDisabled
              ]}
              onPress={handleCreateSubject}
              disabled={isCreatingSubject}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.quickCreateGradient}
              >
                <Ionicons name="add-circle" size={20} color="#FFF" />
                <Text style={styles.quickCreateButtonText}>
                  {isCreatingSubject ? 'Creating...' : 'Create Subject'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  profileModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  taskInputModalContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    overflow: 'hidden',
  },
  gradientHeader: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContentContainer: {
    padding: 20,
    paddingBottom: 20,
  },
  inputCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  inputCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  taskInput: {
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlignVertical: "top",
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 8,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    paddingTop: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  taskSkipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#F1F5F9",
    padding: 16,
    borderRadius: 14,
    gap: 6,
  },
  taskSkipButtonText: {
    color: "#64748b",
    fontWeight: "700",
    fontSize: 16,
  },
  startButtonWrapper: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  taskSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  startButtonText: { 
    color: "white", 
    fontWeight: "800", 
    fontSize: 17,
    letterSpacing: 0.5,
  },
  settingsSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  settingDescription: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "400",
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: "#4F46E5",
    alignItems: "flex-end",
  },
  toggleInactive: {
    backgroundColor: "#d1d5db",
    alignItems: "flex-start",
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "white",
  },
  toggleThumbActive: {
    marginRight: 0,
  },
  toggleThumbInactive: {
    marginLeft: 0,
  },
  soundSelection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  soundSelectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  soundOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  soundOptionSelected: {
    backgroundColor: "#eef2ff",
    borderWidth: 2,
    borderColor: "#4F46E5",
  },
  soundOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  soundTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  soundOptionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  soundOptionTextSelected: {
    color: "#4F46E5",
    fontWeight: "700",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },
  radioButtonSelected: {
    borderColor: "#4F46E5",
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4F46E5",
  },
  subjectSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedSubjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  subjectCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subjectIcon: {
    fontSize: 24,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
  },
  removeSubjectButton: {
    padding: 4,
  },
  subjectButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  selectSubjectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    gap: 8,
  },
  selectSubjectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  createSubjectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    gap: 8,
  },
  createSubjectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  subjectPicker: {
    marginTop: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 250,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  subjectList: {
    maxHeight: 180,
  },
  subjectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  subjectOptionSelected: {
    backgroundColor: '#F8FAFC',
  },
  noSubjectIcon: {
    fontSize: 20,
  },
  subjectOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
  },
  quickCreateOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  quickCreateContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  quickCreateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  quickCreateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  quickCreateInput: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 20,
  },
  quickCreateLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 12,
  },
  quickIconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  quickIconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickIconSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  quickIconText: {
    fontSize: 24,
  },
  quickColorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  quickColorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  quickColorSelected: {
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  quickCreateButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickCreateButtonDisabled: {
    opacity: 0.5,
  },
  quickCreateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  quickCreateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default TaskInputModal;
