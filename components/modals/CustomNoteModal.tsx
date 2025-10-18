import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";

interface CustomNoteModalProps {
  visible: boolean;
  onClose: () => void;
  initialImageUrl?: string;
}

const CustomNoteModal: React.FC<CustomNoteModalProps> = ({
  visible,
  onClose,
  initialImageUrl,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [isListening, setIsListening] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
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
      if (voiceRef.current?.destroy) {
        voiceRef.current.destroy().catch(() => {});
      }
    };
  }, []);

  // Removed ensureVoice - using direct import in startListening

  // Initialize image from props when opened
  React.useEffect(() => {
    if (visible) {
      setImageUrl(initialImageUrl);
    }
  }, [visible, initialImageUrl]);

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
            setContent((prev) => {
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

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in to save a note.");
      return;
    }
    
    if (!title.trim() && !content.trim()) {
      Alert.alert("Empty Note", "Please add a title or content before saving.");
      return;
    }
    
    setIsSaving(true);
    try {
      await addDoc(collection(db, "notes"), {
        taskTitle: title.trim() || "Custom Note",
        duration: 0,
        notes: content.trim(),
        completedAt: Date.now(),
        userId: user.uid,
        createdAt: serverTimestamp(),
        imageUrl: imageUrl || "",
      });
      setTitle("");
      setContent("");
      setImageUrl(undefined);
      Alert.alert("Success", "Note saved successfully!");
      onClose();
    } catch (e) {
      console.error('Error saving note:', e);
      Alert.alert("Error", "Failed to save note. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>✨ New Note</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {imageUrl ? (
                <View style={styles.imageContainer}>
                  <Text style={styles.label}>📷 Attached Image</Text>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.attachedImage}
                    resizeMode="cover"
                  />
                </View>
              ) : null}
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter note title..."
                  placeholderTextColor="#9ca3af"
                  value={title}
                  onChangeText={setTitle}
                  editable={!isSaving}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <View style={styles.editorHeader}>
                  <Text style={styles.label}>Content</Text>
                  <TouchableOpacity
                    style={[styles.micButton, isListening && styles.micActive]}
                    onPress={isListening ? stopListening : startListening}
                    disabled={isSaving}
                  >
                    <Ionicons 
                      name={isListening ? "mic" : "mic-outline"} 
                      size={18} 
                      color="white" 
                    />
                    <Text style={styles.micText}>
                      {isListening ? "Listening..." : "Mic"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Write your note..."
                  placeholderTextColor="#9ca3af"
                  value={content}
                  onChangeText={setContent}
                  multiline
                  textAlignVertical="top"
                  editable={!isSaving}
                />
              </View>
            </ScrollView>
            
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.cancel]}
                onPress={onClose}
                disabled={isSaving}
              >
                <Text style={styles.buttonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.save]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="white" />
                    <Text style={styles.buttonTextSave}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "92%",
    maxHeight: "90%",
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 8,
  },
  imageContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  attachedImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  textarea: { 
    height: 160, 
    textAlignVertical: "top",
    minHeight: 160,
  },
  editorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  micButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
  },
  micActive: { 
    backgroundColor: "#ef4444",
  },
  micText: { 
    color: "white", 
    fontWeight: "600",
    fontSize: 13,
  },
  actions: { 
    flexDirection: "row", 
    justifyContent: "flex-end", 
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  button: { 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 10,
    gap: 6,
    minWidth: 100,
  },
  cancel: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  save: { 
    backgroundColor: "#2196F3",
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonTextCancel: { 
    color: "#374151", 
    fontWeight: "600",
    fontSize: 15,
  },
  buttonTextSave: { 
    color: "white", 
    fontWeight: "700",
    fontSize: 15,
  },
});

export default CustomNoteModal;
