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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Subject } from "../../types";

interface AddCustomTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, duration: number, subjectId?: string) => void;
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

  const handleSave = () => {
    if (!taskTitle.trim()) {
      return;
    }

    const durationNum = parseInt(duration) || 25;
    
    // Validate duration is at least 1 minute
    if (durationNum < 1) {
      return;
    }

    onSave(taskTitle.trim(), durationNum, selectedSubjectId);
    
    // Reset form
    setTaskTitle("");
    setDuration("25");
    setSelectedSubjectId(undefined);
    onClose();
  };

  const handleClose = () => {
    setTaskTitle("");
    setDuration("25");
    setSelectedSubjectId(undefined);
    setShowSubjectPicker(false);
    onClose();
  };

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

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
