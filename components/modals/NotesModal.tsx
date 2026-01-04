import React, { useRef, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { collection, addDoc, updateDoc, doc, getDoc, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase/firebaseConfig';
import { PomodoroNote, Subject, SubSubject } from '../../types';
import { LinearGradient } from 'expo-linear-gradient';
import { aiService } from '../../utils/aiService';
import { Ionicons } from '@expo/vector-icons';
import StorageWarningModal from './StorageWarningModal';
import { isStorageFull, DEFAULT_STORAGE_LIMIT } from '../../utils/storageTracker';

interface NotesModalProps {
  visible: boolean;
  onClose: () => void;
  taskTitle: string;
  duration: number; // in minutes
  completedAt: number;
  imageUrl?: string;
  subjectId?: string;
  subSubjectId?: string;
  breakDuration?: number;
}

const NotesModal: React.FC<NotesModalProps> = ({
  visible,
  onClose,
  taskTitle,
  duration,
  completedAt,
  imageUrl,
  subjectId,
  subSubjectId,
  breakDuration = 0,
}) => {
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [processingAI, setProcessingAI] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Storage Warning State
  const [showStorageWarning, setShowStorageWarning] = useState(false);
  const [currentStorageUsage, setCurrentStorageUsage] = useState(0);
  const [storageLimit, setStorageLimit] = useState(DEFAULT_STORAGE_LIMIT);

  // Subject/Topic State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subSubjects, setSubSubjects] = useState<SubSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(subjectId || null);
  const [selectedSubSubjectId, setSelectedSubSubjectId] = useState<string | null>(subSubjectId || null);

  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [showSubSubjectPicker, setShowSubSubjectPicker] = useState(false);

  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectIcon, setNewSubjectIcon] = useState('📚');
  const [newSubjectColor, setNewSubjectColor] = useState('#6366F1');
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);

  const [showCreateSubSubject, setShowCreateSubSubject] = useState(false);
  const [newSubSubjectName, setNewSubSubjectName] = useState('');
  const [isCreatingSubSubject, setIsCreatingSubSubject] = useState(false);

  const QUICK_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];
  const QUICK_ICONS = ['📚', '🎨', '💻', '🔬', '🎵', '⚽'];

  const voiceRef = useRef<any>(null);

  // Sync state with props when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedSubjectId(subjectId || null);
      setSelectedSubSubjectId(subSubjectId || null);
    }
  }, [visible, subjectId, subSubjectId]);

  // Fetch Subjects
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

  // Fetch SubSubjects
  useEffect(() => {
    if (!auth.currentUser || !visible || !selectedSubjectId) {
      setSubSubjects([]);
      if (selectedSubjectId !== subjectId) {
        // Only reset subSubject if we switched subjects (not on initial load if matching)
        // Actually, simpler: if the selected Subject changed, reset subSubject unless it matches the prop?
        // Let's just reset if it doesn't match the list.
        // For now, if selectedSubjectId is null, clear subSubjects.
        setSelectedSubSubjectId(null);
      }
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
  }, [visible, selectedSubjectId]);

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
    } catch (e) {
      Alert.alert('Error', 'Failed to create subject');
    } finally {
      setIsCreatingSubject(false);
    }
  };

  const handleCreateSubSubject = async () => {
    if (!newSubSubjectName.trim()) {
      Alert.alert('Error', 'Topic name required');
      return;
    }
    if (!auth.currentUser || !selectedSubjectId) return;

    setIsCreatingSubSubject(true);
    try {
      const data = {
        name: newSubSubjectName.trim(),
        subjectId: selectedSubjectId,
        createdAt: Date.now(),
        userId: auth.currentUser.uid,
      };
      const docRef = await addDoc(collection(db, 'subSubjects'), data);
      setSelectedSubSubjectId(docRef.id);
      setShowCreateSubSubject(false);
      setNewSubSubjectName('');
    } catch (e) {
      Alert.alert('Error', 'Failed to create topic');
    } finally {
      setIsCreatingSubSubject(false);
    }
  };

  const getSelectedSubject = () => subjects.find(s => s.id === selectedSubjectId);
  const getSelectedSubSubject = () => subSubjects.find(s => s.id === selectedSubSubjectId);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
      // Cleanup voice on unmount
      if (voiceRef.current?.destroy) {
        voiceRef.current.destroy().catch(() => { });
      }
    };
  }, []);

  const saveNoteToFirestore = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setIsLoading(true);
    try {
      const noteData: any = {
        taskTitle,
        duration,
        notes: notes.trim(),
        completedAt,
        userId: user.uid,
        imageUrl: imageUrl || '',
        breakDuration: breakDuration,
      };

      if (selectedSubjectId) noteData.subjectId = selectedSubjectId;
      if (selectedSubSubjectId) noteData.subSubjectId = selectedSubSubjectId;

      await addDoc(collection(db, 'notes'), noteData);

      console.log('✅ Note saved successfully');
      Alert.alert('Success', 'Your Pomodoro notes have been saved!');

      setNotes('');
      onClose();
    } catch (error) {
      console.error('❌ Error saving note:', error);
      Alert.alert('Error', 'Failed to save notes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save notes.');
      return;
    }

    // Check Storage Limit if there is an image
    if (imageUrl) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const usage = userData?.storageUsed || 0;
        const limit = userData?.storageLimit || DEFAULT_STORAGE_LIMIT;

        setCurrentStorageUsage(usage);
        setStorageLimit(limit);

        if (isStorageFull(usage, limit)) {
          // Determine image size (rough estimate or fetch) to be accurate?
          // For now, simpler: checking if *already* full. 
          // Strict check: usage + newImageSize > limit.
          // But for mvp, simply checking if current usage is already at/over limit.
          setShowStorageWarning(true);
          return;
        }
      } catch (e) {
        console.error("Failed to check storage:", e);
      }
    }

    await saveNoteToFirestore();
  };

  const handleWatchAd = () => {
    // Logic for watching ad success
    setShowStorageWarning(false);
    // Proceed to save
    saveNoteToFirestore();
  };

  const handleSkip = () => {
    onClose();
  };



  const startListening = async () => {
    try {
      // Import and create voice recognition instance
      const { default: VoiceRecognition } = await import('../../utils/voiceRecognition');

      if (!VoiceRecognition.isAvailable()) {
        Alert.alert(
          'Speech Recognition Unavailable',
          'Speech-to-text is only available on web browsers. Please type your notes or use the web version.'
        );
        return;
      }

      if (!voiceRef.current) {
        voiceRef.current = new VoiceRecognition();
      }

      const voice = voiceRef.current;

      // Set up event handlers
      voice.setCallbacks({
        onStart: () => {
          console.log('🎤 Speech recognition started');
          setIsListening(true);
        },
        onEnd: () => {
          console.log('🎤 Speech recognition ended');
          setIsListening(false);
        },
        onResults: (results: string[]) => {
          const text = results[0];
          console.log('🎤 Speech results:', text);
          if (text) {
            setNotes((prev) => {
              const separator = prev && !prev.endsWith(' ') ? ' ' : '';
              return prev + separator + text;
            });
          }
        },
        onError: (error: any) => {
          console.error('🎤 Speech error:', error);
          setIsListening(false);
          Alert.alert('Speech Error', 'Failed to recognize speech. Please try again.');
        },
      });

      await voice.start();
    } catch (error) {
      console.error('🎤 Failed to start voice recognition:', error);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      if (voiceRef.current) {
        await voiceRef.current.stop();
        console.log('🎤 Voice recognition stopped');
      }
    } catch (error) {
      console.error('🎤 Error stopping voice:', error);
    }
    setIsListening(false);
  };

  const handleAISummarize = async () => {
    if (!notes.trim()) return;

    setProcessingAI(true);
    try {
      // Process with AI service (will use OpenAI or fallback to Gemini)
      const summarizedNotes = await aiService.processText({
        content: notes,
        type: 'summarize'
      });

      setNotes(summarizedNotes);

      Alert.alert('Success', `Your notes have been summarized using ${aiService.getCurrentProvider()}!`);
    } catch (error) {
      console.error('Error summarizing notes:', error);
      Alert.alert('Error', 'Failed to summarize notes. Please try again.');
    } finally {
      setProcessingAI(false);
    }
  };

  const handleAIEnhance = async () => {
    if (!notes.trim()) return;

    setProcessingAI(true);
    try {
      // Process with AI service (will use OpenAI or fallback to Gemini)
      const enhancedNotes = await aiService.processText({
        content: notes,
        type: 'enhance'
      });

      setNotes(enhancedNotes);

      Alert.alert('Success', `Your notes have been enhanced using ${aiService.getCurrentProvider()}!`);
    } catch (error) {
      console.error('Error enhancing notes:', error);
      Alert.alert('Error', 'Failed to enhance notes. Please try again.');
    } finally {
      setProcessingAI(false);
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.modalContainer}>
          <View style={styles.sessionCompleteHeader}>
            <Text style={styles.sessionCompleteTitle}>🎉 Session Complete!</Text>
            <Text style={styles.sessionCompleteSubtitle}>Capture your insights</Text>
          </View>

          {/* Task info */}
          <View style={styles.taskInfoContainer}>
            <Text style={styles.taskInfoText}>📝 {taskTitle}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.durationText}>🔥 {formatDuration(duration)}</Text>
              {breakDuration > 0 && (
                <Text style={[styles.durationText, { color: '#8B5CF6' }]}>☕ {formatDuration(breakDuration)}</Text>
              )}
            </View>
          </View>

          {/* Subject/Topic Selection UI */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16, flexDirection: 'row', gap: 12 }}>
            {/* Subject Picker Trigger */}
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: 'white',
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: getSelectedSubject() ? getSelectedSubject()?.color : '#E2E8F0',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              onPress={() => setShowSubjectPicker(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>{getSelectedSubject()?.icon || '📚'}</Text>
                <Text style={{ fontWeight: '600', color: '#1E293B', flex: 1 }} numberOfLines={1}>
                  {getSelectedSubject()?.name || 'Select Subject'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Topic Picker Trigger - Only if subject selected */}
            {selectedSubjectId && (
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: 'white',
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onPress={() => setShowSubSubjectPicker(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons name="book-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                  <Text style={{ fontWeight: '600', color: '#1E293B', flex: 1 }} numberOfLines={1}>
                    {getSelectedSubSubject()?.name || 'Select Topic'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Scrollable content area */}
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.notesInputContainer}>
              <View style={styles.inputHeader}>
                <Text style={styles.inputLabel}>Your Notes</Text>
                <TouchableOpacity
                  style={[styles.micButton, isListening && styles.micButtonActive]}
                  onPress={isListening ? stopListening : startListening}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={isListening ? "mic" : "mic-outline"}
                    size={20}
                    color="white"
                  />
                  <Text style={styles.micButtonText}>
                    {isListening ? 'Listening...' : 'Mic'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.notesInputFullScreen}
                value={notes}
                onChangeText={setNotes}
                placeholder="Jot down your key takeaways, brilliant ideas, or anything else on your mind..."
                placeholderTextColor="#999"
                multiline={true}
                textAlignVertical="top"
                editable={!isLoading}
              />
            </View>

            {/* AI Buttons - Temporarily Disabled */}
            {notes.trim().length > 0 && !keyboardVisible && false && (
              <View style={styles.aiButtonsRow}>
                {processingAI ? (
                  <View style={styles.aiButton}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.aiButtonText}>Processing...</Text>
                  </View>
                ) : (
                  <>
                    {notes.length > 100 ? (
                      <TouchableOpacity
                        style={styles.aiButton}
                        onPress={handleAISummarize}
                      >
                        <Ionicons name="sparkles" size={16} color="#fff" />
                        <Text style={styles.aiButtonText}>AI Summarize</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.aiButton}
                        onPress={handleAIEnhance}
                      >
                        <Ionicons name="sparkles" size={16} color="#fff" />
                        <Text style={styles.aiButtonText}>AI Enhance</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            )}

          </ScrollView>

          {/* Fixed bottom buttons */}
          <View style={styles.bottomButtonsContainer}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isLoading}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>


            <TouchableOpacity
              style={styles.saveNotesButton}
              onPress={handleSaveNotes}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.saveNotesButtonText}>Save Notes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Subject Picker Modal */}
      <Modal visible={showSubjectPicker} transparent animationType="slide" onRequestClose={() => setShowSubjectPicker(false)}>
        <View style={styles.overlay}>
          <View style={[styles.container, { height: '60%' }]}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Select Subject</Text>
              <TouchableOpacity onPress={() => setShowSubjectPicker(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity style={styles.subjectOption} onPress={() => { setSelectedSubjectId(null); setShowSubjectPicker(false); }}>
                <Text style={styles.subjectOptionText}>No Subject</Text>
              </TouchableOpacity>
              {subjects.map(s => (
                <TouchableOpacity key={s.id} style={styles.subjectOption} onPress={() => { setSelectedSubjectId(s.id); setShowSubjectPicker(false); }}>
                  <Text style={{ fontSize: 20 }}>{s.icon}</Text>
                  <Text style={[styles.subjectOptionText, { color: s.color }]}>{s.name}</Text>
                  {selectedSubjectId === s.id && <Ionicons name="checkmark" size={20} color={s.color} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateSubject(true)}>
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Create New Subject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Topic Picker Modal */}
      <Modal visible={showSubSubjectPicker} transparent animationType="slide" onRequestClose={() => setShowSubSubjectPicker(false)}>
        <View style={styles.overlay}>
          <View style={[styles.container, { height: '60%' }]}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Select Topic</Text>
              <TouchableOpacity onPress={() => setShowSubSubjectPicker(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity style={styles.subjectOption} onPress={() => { setSelectedSubSubjectId(null); setShowSubSubjectPicker(false); }}>
                <Text style={styles.subjectOptionText}>No Topic</Text>
              </TouchableOpacity>
              {subSubjects.map(s => (
                <TouchableOpacity key={s.id} style={styles.subjectOption} onPress={() => { setSelectedSubSubjectId(s.id); setShowSubSubjectPicker(false); }}>
                  <Text style={[styles.subjectOptionText, { color: getSelectedSubject()?.color }]}>{s.name}</Text>
                  {selectedSubSubjectId === s.id && <Ionicons name="checkmark" size={20} color={getSelectedSubject()?.color} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateSubSubject(true)}>
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Create New Topic</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Subject Modal */}
      <Modal visible={showCreateSubject} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>New Subject</Text>
              <TouchableOpacity onPress={() => setShowCreateSubject(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Subject Name" value={newSubjectName} onChangeText={setNewSubjectName} />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 }}>
              {QUICK_ICONS.map(icon => (
                <TouchableOpacity key={icon} onPress={() => setNewSubjectIcon(icon)} style={{ padding: 8, backgroundColor: newSubjectIcon === icon ? '#E0E7FF' : '#F3F4F6', borderRadius: 8 }}>
                  <Text style={{ fontSize: 24 }}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {QUICK_COLORS.map(color => (
                <TouchableOpacity key={color} onPress={() => setNewSubjectColor(color)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color, borderWidth: newSubjectColor === color ? 2 : 0, borderColor: '#000' }} />
              ))}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleCreateSubject}>
              <Text style={styles.saveButtonText}>Create Subject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Topic Modal */}
      <Modal visible={showCreateSubSubject} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>New Topic</Text>
              <TouchableOpacity onPress={() => setShowCreateSubSubject(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <Text style={{ marginBottom: 8, color: '#666' }}>Adding to: {getSelectedSubject()?.name}</Text>
            <TextInput style={styles.input} placeholder="Topic Name" value={newSubSubjectName} onChangeText={setNewSubSubjectName} autoFocus />
            <TouchableOpacity style={styles.saveButton} onPress={handleCreateSubSubject}>
              <Text style={styles.saveButtonText}>Create Topic</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <StorageWarningModal
        visible={showStorageWarning}
        onClose={() => setShowStorageWarning(false)}
        onWatchAd={handleWatchAd}
        currentUsage={currentStorageUsage}
        limit={storageLimit}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  sessionCompleteHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sessionCompleteTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  sessionCompleteSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
  taskInfoContainer: {
    padding: 16,
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  taskInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 12,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  notesInputContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  notesInputFullScreen: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
    minHeight: 200,
    maxHeight: 400,
    textAlignVertical: 'top',
  },
  micButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  micButtonActive: {
    backgroundColor: '#ef4444',
  },
  micButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  aiButtonsRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  aiButton: {
    flexDirection: 'row',
    backgroundColor: '#9c27b0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#9c27b0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  aiButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomButtonsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  doodleButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  doodleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  doodleButtonActive: {
    backgroundColor: '#E55A2B',
  },
  doodleIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#10B981',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  saveNotesButton: {
    flex: 2,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  saveNotesButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subjectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  subjectOptionText: {
    fontSize: 16,
    color: '#334155',
    flex: 1,
  },
  createButton: {
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  saveButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default NotesModal;
