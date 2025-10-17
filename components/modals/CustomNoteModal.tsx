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
} from "react-native";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase/firebaseConfig";

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
  const voiceRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (voiceRef.current?.destroy) {
        voiceRef.current.destroy().catch(() => {});
      }
    };
  }, []);

  const ensureVoice = async () => {
    if (voiceRef.current) return voiceRef.current;
    try {
      // const voice = (await import('react-native-voice')).default;
      // voiceRef.current = voice;
      // return voice;
    } catch (e) {
      Alert.alert(
        "Speech Unavailable",
        "Speech-to-text is not available on this device."
      );
      throw e;
    }
  };

  // Initialize image from props when opened
  React.useEffect(() => {
    if (visible) {
      setImageUrl(initialImageUrl);
    }
  }, [visible, initialImageUrl]);

  const startListening = async () => {
    try {
      const Voice = await ensureVoice();
      Voice.onSpeechResults = (e: any) => {
        const text: string | undefined = e.value?.[0];
        if (text) setContent((prev) => (prev ? prev + " " : "") + text);
      };
      await Voice.start("en-US");
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

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in to save a note.");
      return;
    }
    try {
      await addDoc(collection(db, "notes"), {
        taskTitle: title || "Custom Note",
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
      onClose();
      Alert.alert("Saved", "Note saved successfully.");
    } catch (e) {
      Alert.alert("Error", "Failed to save note.");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>New Note</Text>
          {imageUrl ? (
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <Text style={styles.label}>Image</Text>
              <Image
                source={{ uri: imageUrl }}
                style={{
                  width: 180,
                  height: 140,
                  borderRadius: 12,
                  marginTop: 6,
                }}
              />
            </View>
          ) : null}
          <TextInput
            style={styles.input}
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
          />
          <View style={styles.editorHeader}>
            <Text style={styles.label}>Content</Text>
            <TouchableOpacity
              style={[styles.micButton, isListening && styles.micActive]}
              onPress={isListening ? stopListening : startListening}
            >
              <Text style={styles.micText}>{isListening ? "Stop" : "Mic"}</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Write your note..."
            value={content}
            onChangeText={setContent}
            multiline
          />
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancel]}
              onPress={onClose}
            >
              <Text style={styles.buttonTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.save]}
              onPress={handleSave}
            >
              <Text style={styles.buttonTextSave}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#333", marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "600", color: "#555" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  textarea: { height: 140, textAlignVertical: "top" },
  editorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  micButton: {
    backgroundColor: "#f1f5ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  micActive: { backgroundColor: "#e0ecff" },
  micText: { color: "#4F46E5", fontWeight: "700" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  cancel: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  save: { backgroundColor: "#4F46E5" },
  buttonTextCancel: { color: "#333", fontWeight: "700" },
  buttonTextSave: { color: "white", fontWeight: "700" },
});

export default CustomNoteModal;
