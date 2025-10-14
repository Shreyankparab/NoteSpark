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
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.scrollContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>🎉 Pomodoro Complete!</Text>
              <Text style={styles.subtitle}>Add notes about this session</Text>
            </View>

            <View style={styles.sessionInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Task:</Text>
                <Text style={styles.infoValue}>{taskTitle}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Duration:</Text>
                <Text style={styles.infoValue}>{formatDuration(duration)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Completed:</Text>
                <Text style={styles.infoValue}>{formatDate(completedAt)}</Text>
              </View>
            </View>

            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Session Notes (Optional)</Text>
              <View style={styles.micRow}>
                <TouchableOpacity
                  style={[styles.micButton, isListening && styles.micActive]}
                  onPress={isListening ? stopListening : startListening}
                >
                  <Text style={styles.micText}>{isListening ? 'Stop' : 'Mic'}</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="What did you accomplish? Any insights or thoughts about this Pomodoro session?"
                placeholderTextColor="#999"
                multiline={true}
                numberOfLines={6}
                textAlignVertical="top"
              />
              
              {notes.trim().length > 0 && (
                <View style={styles.aiActions}>
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
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.skipButton]}
                onPress={handleSkip}
                disabled={isLoading}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveNotes}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Saving...' : 'Save Notes'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  scrollContainer: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  sessionInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  notesSection: {
    marginBottom: 24,
  },
  notesLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    minHeight: 120,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#6C63FF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  micRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
  micButton: { backgroundColor: '#f1f5ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  micActive: { backgroundColor: '#e0ecff' },
  micText: { color: '#4F46E5', fontWeight: '700' },
  aiActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  aiButton: {
    backgroundColor: '#4CAF50',
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
});

export default NotesModal;
