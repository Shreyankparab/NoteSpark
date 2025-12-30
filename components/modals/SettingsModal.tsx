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
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SoundPreset } from "../../types";
import { SOUND_PRESETS } from "../../constants";
import { playCompletionSound } from "../../utils/audio";
import { aiService, AIProvider } from "../../utils/aiService";
import { THEMES, Theme } from "../../constants/themes";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

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
  currentTheme: Theme;
  onThemeChange: (themeId: string) => void;
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
  currentTheme,
  onThemeChange,
}) => {
  const [minutesInput, setMinutesInput] = useState(String(initialMinutes));
  const [showSoundOptions, setShowSoundOptions] = useState(false);
  const [showAIOptions, setShowAIOptions] = useState(false);
  const [showAppearanceOptions, setShowAppearanceOptions] = useState(false);
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

  const handleThemeSelect = async (themeId: string) => {
    try {
      await AsyncStorage.setItem('selectedTheme', themeId);
      onThemeChange(themeId);
      console.log(`✅ Theme changed to: ${themeId}`);
    } catch (error) {
      console.error('❌ Failed to save theme:', error);
      Alert.alert('Error', 'Failed to save theme preference');
    }
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
      style={[styles.toggleBase, { backgroundColor: active ? color : "#E2E8F0" }]}
    >
      <Ionicons
        name={active ? (activeIcon as any) : (inactiveIcon as any)}
        size={20}
        color={active ? "white" : "#64748B"}
      />
    </TouchableOpacity>
  );

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle: string,
    rightComponent: React.ReactNode,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon as any} size={20} color="#6366F1" />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightComponent}
      </View>
    </TouchableOpacity>
  );

  const renderThemePreview = (theme: Theme) => {
    const isSelected = currentTheme.id === theme.id;
    return (
      <TouchableOpacity
        key={theme.id}
        style={[
          styles.themePreview,
          isSelected && styles.themePreviewSelected,
        ]}
        onPress={() => handleThemeSelect(theme.id)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={theme.colors as any}
          start={theme.gradientStart || { x: 0, y: 0 }}
          end={theme.gradientEnd || { x: 1, y: 1 }}
          style={styles.themeGradient}
        >
          {isSelected && (
            <View style={styles.themeSelectedOverlay}>
              <Ionicons name="checkmark-circle" size={16} color="white" />
            </View>
          )}
        </LinearGradient>
        <Text style={styles.themeName}>{theme.name}</Text>
      </TouchableOpacity>
    );
  };

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
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="settings" size={24} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Settings</Text>
                <Text style={styles.modalSubtitle}>Customize your experience</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Timer Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Timer</Text>

              {renderSettingItem(
                "timer",
                "Pomodoro Duration",
                "Set your focus session length",
                <View style={styles.durationInputContainer}>
                  <TextInput
                    style={styles.durationInput}
                    value={minutesInput}
                    onChangeText={(text) =>
                      setMinutesInput(text.replace(/[^0-9]/g, ""))
                    }
                    keyboardType="number-pad"
                    placeholder="25"
                    maxLength={2}
                  />
                  <Text style={styles.durationUnit}>min</Text>
                </View>
              )}
            </View>

            {/* Audio Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Audio</Text>

              {renderSettingItem(
                "volume-high",
                "Completion Sound",
                "Play sound when timer ends",
                renderToggleButton(
                  isSoundOn,
                  "#10B981",
                  "volume-high",
                  "volume-mute",
                  () => onToggleSound(!isSoundOn)
                ),
                () => setShowSoundOptions(!showSoundOptions)
              )}

              {isSoundOn && showSoundOptions && (
                <View style={styles.subSection}>
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
                      <TouchableOpacity
                        onPress={() => playCompletionSound(sound as SoundPreset)}
                        style={styles.playButton}
                      >
                        <Ionicons
                          name="play-circle-outline"
                          size={20}
                          color={selectedSound === sound ? "#6366F1" : "#64748B"}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {renderSettingItem(
                "phone-portrait",
                "Vibration",
                "Vibrate when timer ends",
                renderToggleButton(
                  isVibrationOn,
                  "#F59E0B",
                  "phone-portrait",
                  "phone-portrait-outline",
                  () => onToggleVibration(!isVibrationOn)
                )
              )}
            </View>
            {/* Appearance Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Appearance</Text>

              {renderSettingItem(
                "color-palette",
                "Theme",
                "Choose your preferred theme",
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() => setShowAppearanceOptions(!showAppearanceOptions)}
                >
                  <Ionicons
                    name={showAppearanceOptions ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#6366F1"
                  />
                </TouchableOpacity>,
                () => setShowAppearanceOptions(!showAppearanceOptions)
              )}

              {showAppearanceOptions && (
                <View style={styles.themeGrid}>
                  {THEMES.map(theme => renderThemePreview(theme))}
                </View>
              )}
            </View>

            {/* AI Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AI Assistant</Text>

              {renderSettingItem(
                "brain",
                "AI Provider",
                "Choose your AI service",
                <TouchableOpacity
                  style={styles.aiProviderSelector}
                  onPress={() => setShowAIOptions(!showAIOptions)}
                >
                  <Text style={styles.aiProviderText}>
                    {selectedAIProvider === 'openai' ? 'OpenAI' : 'Gemini'}
                  </Text>
                  <Ionicons
                    name={showAIOptions ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#6366F1"
                  />
                </TouchableOpacity>,
                () => setShowAIOptions(!showAIOptions)
              )}

              {showAIOptions && (
                <View style={styles.subSection}>
                  <TouchableOpacity
                    style={[
                      styles.aiOption,
                      selectedAIProvider === 'openai' && styles.aiOptionSelected
                    ]}
                    onPress={() => handleSelectAIProvider('openai')}
                  >
                    <Text style={styles.aiOptionText}>OpenAI</Text>
                    {selectedAIProvider === 'openai' && (
                      <Ionicons name="checkmark" size={20} color="#6366F1" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.aiOption,
                      selectedAIProvider === 'gemini' && styles.aiOptionSelected
                    ]}
                    onPress={() => handleSelectAIProvider('gemini')}
                  >
                    <Text style={styles.aiOptionText}>Gemini</Text>
                    {selectedAIProvider === 'gemini' && (
                      <Ionicons name="checkmark" size={20} color="#6366F1" />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* About & Support Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About & Support</Text>

              {renderSettingItem(
                "shield-checkmark",
                "Privacy Policy",
                "Read our privacy policy",
                <Ionicons name="open-outline" size={20} color="#94A3B8" />,
                () => Linking.openURL("https://github.com/Shreyankparab/")
              )}

              {renderSettingItem(
                "document-text",
                "Terms of Service",
                "Read our terms of service",
                <Ionicons name="open-outline" size={20} color="#94A3B8" />,
                () => Linking.openURL("https://github.com/Shreyankparab/")
              )}

              {renderSettingItem(
                "mail",
                "Contact Support",
                "Need help? Contact us",
                <Ionicons name="open-outline" size={20} color="#94A3B8" />,
                () => Linking.openURL("https://github.com/Shreyankparab/")
              )}

              {renderSettingItem(
                "information-circle",
                "About NoteSpark",
                "Version 1.0.0",
                <View />,
                () => Alert.alert("NoteSpark", "Version 1.0.0\n\nDeveloped by Shreyank Parab\n\nFocus. Capture. Grow.")
              )}
            </View>
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Floating Save Button Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>Save & Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748B",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: "#64748B",
  },
  settingRight: {
    marginLeft: 12,
  },
  toggleBase: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  durationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
  },
  durationInput: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
    minWidth: 40,
    paddingVertical: 8,
  },
  durationUnit: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 4,
  },
  subSection: {
    marginTop: 8,
    marginLeft: 52,
    gap: 4,
  },
  soundOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  soundOptionSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: "#6366F1",
  },
  soundOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioButtonSelected: {
    borderColor: "#6366F1",
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6366F1",
  },
  soundOptionText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  soundOptionTextSelected: {
    color: "#6366F1",
    fontWeight: "600",
  },
  playButton: {
    padding: 4,
  },
  expandButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
    marginLeft: 52,
  },
  themePreview: {
    width: (width - 120) / 4,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  themePreviewSelected: {
    borderColor: "#10B981",
  },
  themeGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  themeSelectedOverlay: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    padding: 2,
  },
  themeName: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },
  aiProviderSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
  },
  aiProviderText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
    marginRight: 8,
  },
  aiOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  aiOptionSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: "#6366F1",
  },
  aiOptionText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    padding: 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
});

export default SettingsModal;
