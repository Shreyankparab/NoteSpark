import React, { useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert,
  ScrollView,
  StyleSheet 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SoundPreset } from "../../types";
import { playCompletionSound } from "../../utils/audio";

interface TaskInputModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (taskTitle: string) => void;
  isSoundOn: boolean;
  isVibrationOn: boolean;
  selectedSound: SoundPreset;
  onToggleSound: (value: boolean) => void;
  onToggleVibration: (value: boolean) => void;
  onSelectSound: (sound: SoundPreset) => void;
  soundPresets: SoundPreset[];
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
}) => {
  const [taskTitle, setTaskTitle] = useState("");

  const handleSave = () => {
    if (taskTitle.trim()) {
      onSave(taskTitle.trim());
      setTaskTitle("");
    } else {
      Alert.alert("Error", "Please enter a task title");
    }
  };

  const handleSkip = () => {
    onSave("");
    setTaskTitle("");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.profileModalOverlay}>
        <View style={styles.taskInputModalContainer}>
          <View style={styles.profileModalHeader}>
            <Text style={styles.profileModalTitle}>Start Session</Text>
            <TouchableOpacity onPress={handleSkip} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.taskInputLabel}>
              What will you focus on during this session?
            </Text>

            <TextInput
              style={styles.taskInput}
              placeholder="e.g., Study React Native, Read Chapter 5..."
              value={taskTitle}
              onChangeText={setTaskTitle}
              multiline
              maxLength={100}
              autoFocus
            />

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

          <View style={styles.taskInputButtons}>
            <TouchableOpacity
              style={styles.taskSkipButton}
              onPress={handleSkip}
            >
              <Text style={styles.taskSkipButtonText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.taskSaveButton}
              onPress={handleSave}
            >
              <Text style={styles.logoutButtonText}>Start Timer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  profileModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  taskInputModalContainer: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
  },
  profileModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  profileModalTitle: { fontSize: 22, fontWeight: "700", color: "#333" },
  taskInputLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 12,
    textAlign: "center",
  },
  taskInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    minHeight: 80,
    textAlignVertical: "top",
  },
  taskInputButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  taskSkipButton: {
    flex: 1,
    backgroundColor: "#e5e7eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  taskSkipButtonText: {
    color: "#6b7280",
    fontWeight: "600",
    fontSize: 16,
  },
  taskSaveButton: {
    flex: 1,
    backgroundColor: "#4F46E5",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutButtonText: { color: "white", fontWeight: "700", fontSize: 16 },
  settingsSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4F46E5",
  },
});

export default TaskInputModal;
