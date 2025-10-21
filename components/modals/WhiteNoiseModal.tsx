import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import {
  WhiteNoiseType,
  WHITE_NOISE_PRESETS,
  WHITE_NOISE_DESCRIPTIONS,
  WHITE_NOISE_ICONS,
  WHITE_NOISE_SOUND_MAP,
} from "../../constants";

const { width } = Dimensions.get("window");

interface WhiteNoiseModalProps {
  visible: boolean;
  onClose: () => void;
  selectedWhiteNoise: WhiteNoiseType;
  onSelectWhiteNoise: (whiteNoise: WhiteNoiseType) => void;
}

const WhiteNoiseModal: React.FC<WhiteNoiseModalProps> = ({
  visible,
  onClose,
  selectedWhiteNoise,
  onSelectWhiteNoise,
}) => {
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
  const [currentlyPreviewing, setCurrentlyPreviewing] = useState<WhiteNoiseType | null>(null);

  const playPreview = async (whiteNoise: WhiteNoiseType) => {
    if (whiteNoise === "None") return;

    try {
      // Stop current preview if playing
      if (previewSound) {
        await previewSound.stopAsync();
        await previewSound.unloadAsync();
        setPreviewSound(null);
        setCurrentlyPreviewing(null);
      }

      const soundFile = WHITE_NOISE_SOUND_MAP[whiteNoise];
      if (!soundFile) {
        console.log(`⚠️ No sound file found for: ${whiteNoise}`);
        return;
      }

      const { sound } = await Audio.Sound.createAsync(
        soundFile,
        {
          isLooping: false,
          volume: 0.5
        }
      );

      await sound.playAsync();
      setPreviewSound(sound);
      setCurrentlyPreviewing(whiteNoise);

      // Auto-stop after 10 seconds
      setTimeout(async () => {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
          setPreviewSound(null);
          setCurrentlyPreviewing(null);
        } catch (e) {
          console.log('Preview sound already stopped');
        }
      }, 10000);

      console.log(`🎵 Playing preview: ${whiteNoise}`);
    } catch (error) {
      console.error('❌ Failed to play preview:', error);
      setCurrentlyPreviewing(null);
    }
  };

  const handleSelectSound = (sound: WhiteNoiseType) => {
    onSelectWhiteNoise(sound);
    // Auto-close after selection for better UX
    setTimeout(() => {
      handleClose();
    }, 300);
  };

  const handleClose = async () => {
    // Stop any playing preview when modal closes
    if (previewSound) {
      try {
        await previewSound.stopAsync();
        await previewSound.unloadAsync();
        setPreviewSound(null);
        setCurrentlyPreviewing(null);
      } catch (e) {
        console.log('Preview sound already stopped');
      }
    }
    onClose();
  };

  const handlePreviewSound = (sound: WhiteNoiseType) => {
    if (sound === "None") return;
    playPreview(sound);
  };

  const renderSoundCard = (sound: WhiteNoiseType) => {
    const isSelected = selectedWhiteNoise === sound;
    const isPreview = currentlyPreviewing === sound;
    const iconName = WHITE_NOISE_ICONS[sound] as any;

    return (
      <TouchableOpacity
        key={sound}
        style={[
          styles.soundCard,
          isSelected && styles.soundCardSelected,
          isPreview && styles.soundCardPreview,
        ]}
        onPress={() => handleSelectSound(sound)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={
            isSelected
              ? ["#6366F1", "#8B5CF6"]
              : isPreview
              ? ["#10B981", "#059669"]
              : ["#F8FAFC", "#E2E8F0"]
          }
          style={styles.soundCardGradient}
        >
          <View style={styles.soundCardContent}>
            {/* Icon */}
            <View
              style={[
                styles.soundIconContainer,
                {
                  backgroundColor: isSelected || isPreview ? "rgba(255,255,255,0.2)" : "#6366F1",
                },
              ]}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={isSelected || isPreview ? "white" : "white"}
              />
            </View>

            {/* Sound Info */}
            <View style={styles.soundInfo}>
              <Text
                style={[
                  styles.soundName,
                  { color: isSelected || isPreview ? "white" : "#1E293B" },
                ]}
              >
                {sound}
              </Text>
              <Text
                style={[
                  styles.soundDescription,
                  { color: isSelected || isPreview ? "rgba(255,255,255,0.8)" : "#64748B" },
                ]}
              >
                {WHITE_NOISE_DESCRIPTIONS[sound]}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.soundActions}>
              {sound !== "None" && (
                <TouchableOpacity
                  style={[
                    styles.previewButton,
                    {
                      backgroundColor: isSelected || isPreview ? "rgba(255,255,255,0.2)" : "#E2E8F0",
                    },
                  ]}
                  onPress={() => handlePreviewSound(sound)}
                >
                  <Ionicons
                    name={isPreview ? "stop" : "play"}
                    size={16}
                    color={isSelected || isPreview ? "white" : "#64748B"}
                  />
                </TouchableOpacity>
              )}
              
              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="musical-notes" size={24} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.modalTitle}>White Noise</Text>
                <Text style={styles.modalSubtitle}>Choose your focus sound</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.soundGrid}>
              {WHITE_NOISE_PRESETS.map(sound => renderSoundCard(sound))}
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#6366F1" />
              <Text style={styles.infoText}>
                Selected white noise will play continuously during your active timer sessions to help you focus.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
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
  soundGrid: {
    gap: 12,
  },
  soundCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  soundCardSelected: {
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  soundCardPreview: {
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  soundCardGradient: {
    padding: 16,
  },
  soundCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  soundIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  soundInfo: {
    flex: 1,
    marginRight: 12,
  },
  soundName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  soundDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  soundActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#4338CA",
    marginLeft: 12,
    lineHeight: 20,
  },
});

export default WhiteNoiseModal;
