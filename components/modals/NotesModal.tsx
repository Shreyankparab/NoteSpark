import React, { useRef, useState } from 'react';
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
} from 'react-native';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../firebase/firebaseConfig';
import { PomodoroNote } from '../../types';
import { aiService } from '../../utils/aiService';

interface NotesModalProps {
  visible: boolean;
  onClose: () => void;
  taskTitle: string;
  duration: number; // in minutes
  completedAt: number;
  imageUrl?: string;
}

const NotesModal: React.FC<NotesModalProps> = ({
  visible,
  onClose,
  taskTitle,
  duration,
  completedAt,
  imageUrl,
}) => {
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [processingAI, setProcessingAI] = useState(false);
  const voiceRef = useRef<any>(null);

  const handleSaveNotes = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save notes.');
      return;
    }

    setIsLoading(true);
    try {
      const noteData: Omit<PomodoroNote, 'id'> = {
        taskTitle,
        duration,
        notes: notes.trim(),
        completedAt,
        userId: user.uid,
        imageUrl: imageUrl || '',
      };

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

  const handleSkip = () => {
    setNotes('');
    onClose();
  };

  const ensureVoice = async () => {
    if (voiceRef.current) return voiceRef.current;
    try {
      // Using @react-native-community/voice instead of react-native-voice
      const voice = (await import('@react-native-community/voice')).default;
      voiceRef.current = voice;
      return voice;
    } catch (e) {
      Alert.alert('Speech Unavailable', 'Speech-to-text is not available on this device.');
      throw e;
    }
  };

  const startListening = async () => {
    try {
      const Voice = await ensureVoice();
      Voice.onSpeechResults = (e: any) => {
        const text: string | undefined = e.value?.[0];
        if (text) setNotes((prev) => (prev ? prev + ' ' : '') + text);
      };
      await Voice.start('en-US');
      setIsListening(true);
    } catch {}
  };

  const stopListening = async () => {
    try {
      const Voice = await ensureVoice();
      await Voice.stop();
    } catch {}
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
      <View style={styles.modalContainer}>
          <View style={styles.sessionCompleteHeader}>
            <Text style={styles.sessionCompleteTitle}>Session Complete!</Text>
            <Text style={styles.sessionCompleteSubtitle}>Write your notes.</Text>
          </View>
          
          {/* Task info at the top */}
          <View style={styles.taskInfoContainer}>
            <Text style={styles.taskInfoText}>Task: {taskTitle}</Text>
          </View>
          
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}>
            <View style={styles.notesInputContainer}>
              <TextInput
                style={styles.notesInputFullScreen}
                value={notes}
                onChangeText={setNotes}
                placeholder="Jot down your key takeaways, brilliant ideas, or anything else on your mind..."
                placeholderTextColor="#999"
                multiline={true}
                textAlignVertical="top"
              />
            </View>
          </KeyboardAvoidingView>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.saveNotesButton}
              onPress={handleSaveNotes}
              disabled={isLoading}
            >
              <Text style={styles.saveNotesButtonText}>
                {isLoading ? 'Saving...' : 'Save Notes'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.aiButtonsContainer}>
            {notes.trim().length > 0 && (
              <View style={styles.aiButtonRow}>
                {processingAI ? (
                  <View style={styles.aiButton}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                ) : (
                  <>
                    {notes.length > 100 ? (
                      <TouchableOpacity
                        style={styles.aiButton}
                        onPress={handleAISummarize}
                      >
                        <Text style={styles.aiButtonText}>AI Summarize</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.aiButton}
                        onPress={handleAIEnhance}
                      >
                        <Text style={styles.aiButtonText}>AI Enhance</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            )}
            
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isLoading}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  sessionCompleteHeader: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sessionCompleteTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  sessionCompleteSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  taskInfoContainer: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    margin: 15,
  },
  taskInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  notesInputContainer: {
    padding: 15,
    flex: 1,
    position: 'relative',
  },
  notesInputFullScreen: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    minHeight: 150,
    height: '100%',
    textAlignVertical: 'top',
  },
  buttonRow: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveNotesButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveNotesButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  aiButtonsContainer: {
    padding: 15,
    paddingTop: 0,
  },
  aiButtonRow: {
    marginBottom: 15,
  },
  skipButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  aiButton: {
    backgroundColor: '#9c27b0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
  },
  aiButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  micButton: {
    position: 'absolute',
    right: 30,
    bottom: 30,
    backgroundColor: '#2196F3',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIcon: {
    color: 'white',
  },
});

export default NotesModal;
