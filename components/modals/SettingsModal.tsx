import React, { useState, useEffect } from "react";
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
import { SOUND_PRESETS } from "../../constants";
import { playCompletionSound } from "../../utils/audio";
import { aiService, AIProvider } from "../../utils/aiService";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  initialMinutes: number;
  onSaveMinutes: (newMinutes: number) => void;
  isSoundOn: boolean;
  isVibrationOn: boolean;
  selectedSound: SoundPreset;
  onToggleSound: (value: boolean) => void;
  onToggleVibration: (value: boolean) => void;
  onSelectSound: (sound: SoundPreset) => void;
  selectedAIProvider?: AIProvider;
  onSelectAIProvider?: (provider: AIProvider) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  initialMinutes,
  onSaveMinutes,
  isSoundOn,
  isVibrationOn,
  selectedSound,
  onToggleSound,
  onToggleVibration,
  onSelectSound,
}) => {
  const [minutesInput, setMinutesInput] = useState(String(initialMinutes));
  const [showSoundOptions, setShowSoundOptions] = useState(false);
  const [showAIOptions, setShowAIOptions] = useState(false);
  const [selectedAIProvider, setSelectedAIProvider] = useState<AIProvider>(aiService.getCurrentProvider());

  useEffect(() => {
    setMinutesInput(String(initialMinutes));
  }, [initialMinutes]);

  const handleSave = () => {
    const newMinutes = parseInt(minutesInput, 10);
    if (isNaN(newMinutes) || newMinutes < 1 || newMinutes > 60) {
      Alert.alert(
        "Invalid Time",
        "Please enter a study duration between 1 and 60 minutes."
      );
      return;
    }
    onSaveMinutes(newMinutes);
    // Save AI provider selection
    aiService.setProvider(selectedAIProvider);
    onClose();
  };
  
  const handleSelectAIProvider = (provider: AIProvider) => {
    setSelectedAIProvider(provider);
    setShowAIOptions(false);
  };

  const renderToggleButton = (
    active: boolean,
    color: string,
    activeIcon: string,
    inactiveIcon: string,
    onPress: () => void
  ) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.toggleBase, { backgroundColor: active ? color : "#ccc" }]}
    >
      <Ionicons
        name={active ? (activeIcon as any) : (inactiveIcon as any)}
        size={20}
        color="white"
      />
    </TouchableOpacity>
  );

  const getPickerOptionStyle = (selected: boolean) => ({
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    backgroundColor: selected ? "#f9f9ff" : "white",
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.profileModalOverlay}>
        <View style={styles.settingsModalContainer}>
          <View style={styles.profileModalHeader}>
            <Text style={styles.profileModalTitle}>Timer Settings</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={styles.settingsLabel}>
            Pomodoro Duration (1 - 60 minutes)
          </Text>
          <TextInput
            style={styles.settingsInput}
            value={minutesInput}
            onChangeText={(text) =>
              setMinutesInput(text.replace(/[^0-9]/g, ""))
            }
            keyboardType="number-pad"
            placeholder="e.g., 25"
            maxLength={2}
          />

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Turn on sound when time's up</Text>
            {renderToggleButton(
              isSoundOn,
              "#9333ea",
              "volume-medium",
              "volume-mute",
              () => onToggleSound(!isSoundOn)
            )}
          </View>

          {isSoundOn && (
            <View style={styles.soundSelection}>
              <Text style={styles.soundSelectionLabel}>Select Completion Sound</Text>
              {SOUND_PRESETS.map((sound) => (
                <TouchableOpacity
                  key={sound}
                  style={[
                    styles.soundOption,
                    selectedSound === sound && styles.soundOptionSelected,
                  ]}
                  onPress={() => {
                    onSelectSound(sound as SoundPreset);
                    playCompletionSound(sound as SoundPreset);
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
          
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>AI Provider</Text>
            <TouchableOpacity
              style={styles.aiProviderSelector}
              onPress={() => setShowAIOptions(!showAIOptions)}
            >
              <Text style={styles.aiProviderText}>
                {selectedAIProvider === 'openai' ? 'OpenAI' : 'Gemini'}
              </Text>
              <Ionicons
                name={showAIOptions ? "chevron-up" : "chevron-down"}
                size={20}
                color="#4F46E5"
              />
            </TouchableOpacity>
          </View>
          
          {showAIOptions && (
            <View style={styles.soundSelection}>
              <TouchableOpacity
                style={getPickerOptionStyle(selectedAIProvider === 'openai')}
                onPress={() => handleSelectAIProvider('openai')}
              >
                <Text style={styles.soundOptionText}>OpenAI</Text>
                {selectedAIProvider === 'openai' && (
                  <Ionicons name="checkmark" size={20} color="#4F46E5" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={getPickerOptionStyle(selectedAIProvider === 'gemini')}
                onPress={() => handleSelectAIProvider('gemini')}
              >
                <Text style={styles.soundOptionText}>Gemini</Text>
                {selectedAIProvider === 'gemini' && (
                  <Ionicons name="checkmark" size={20} color="#4F46E5" />
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>
              Turn on vibration when time's up
            </Text>
            {renderToggleButton(
              isVibrationOn,
              "#0e7490",
              "phone-portrait",
              "phone-portrait-outline",
              () => onToggleVibration(!isVibrationOn)
            )}
          </View>

          <TouchableOpacity
            style={styles.settingsSaveButton}
            onPress={handleSave}
          >
            <Text style={styles.logoutButtonText}>Save & Apply</Text>
          </TouchableOpacity>
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
  aiProviderSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f0f0f7",
    minWidth: 120,
  },
  aiProviderText: {
    fontSize: 14,
    marginRight: 8,
    color: "#333",
  },
  aiCreditsText: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    fontStyle: "italic",
  },
  settingsModalContainer: {
    width: "85%",
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
  settingsLabel: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
    fontWeight: "600",
  },
  settingsInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 20,
    textAlign: "center",
    fontWeight: "bold",
  },
  settingsSaveButton: {
    backgroundColor: "#4F46E5",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  toggleLabel: {
    fontSize: 16,
    color: "#333",
  },
  toggleBase: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  soundSelection: {
    marginTop: 12,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
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
  logoutButtonText: { color: "white", fontWeight: "700", fontSize: 16 },
});

export default SettingsModal;
