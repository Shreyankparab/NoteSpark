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
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/firebaseConfig';
import { PomodoroNote } from '../../types';
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

  const voiceRef = useRef<any>(null);

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

      if (subjectId) noteData.subjectId = subjectId;
      if (subSubjectId) noteData.subSubjectId = subSubjectId;

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
});

export default NotesModal;
