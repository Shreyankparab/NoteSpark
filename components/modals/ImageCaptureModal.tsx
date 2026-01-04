import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { uploadToFirebaseStorage } from "../../utils/imageStorage";
import { auth } from "../../firebase/firebaseConfig";

import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import StorageWarningModal from "./StorageWarningModal";
import { isStorageFull, DEFAULT_STORAGE_LIMIT } from "../../utils/storageTracker";

interface ImageCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (imageUrl?: string) => void;
  taskTitle?: string;
  duration?: number;
  completedAt?: number;
}

const ImageCaptureModal = ({
  visible,
  onClose,
  onComplete,
  taskTitle = "Pomodoro Session",
  duration = 0,
  completedAt = Date.now(),
}: ImageCaptureModalProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [image, setImage] = useState<
    string | { base64: string; mimeType?: string } | null
  >(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Reset image when modal opens
  React.useEffect(() => {
    if (visible) {
      setImage(null);
    }
  }, [visible]);

  // Storage Warning State
  const [showStorageWarning, setShowStorageWarning] = useState(false);
  const [currentUsage, setCurrentUsage] = useState(0);
  const [limit, setLimit] = useState(DEFAULT_STORAGE_LIMIT);

  const pickImage = async () => {
    setIsCapturing(true);
    try {
      // Request permission
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        alert("Sorry, we need camera roll permissions to make this work!");
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.95,
        base64: true,
      });

      if (!result.canceled) {
        const asset: any = result.assets[0];
        const contentType = asset?.mimeType || "image/jpeg";
        if (asset?.base64) {
          setImage({ base64: asset.base64, mimeType: contentType });
        } else if (asset?.uri) {
          // Fallback to data URL prefix; actual upload requires base64, so this will render preview only
          setImage(`data:${contentType};base64,`);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      alert("Failed to pick image");
    } finally {
      setIsCapturing(false);
    }
  };

  const takePhoto = async () => {
    setIsCapturing(true);
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        alert("Sorry, we need camera permissions to make this work!");
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.95,
        base64: true,
      });

      if (!result.canceled) {
        const asset: any = result.assets[0];
        const contentType = asset?.mimeType || "image/jpeg";
        if (asset?.base64) {
          setImage({ base64: asset.base64, mimeType: contentType });
        } else if (asset?.uri) {
          setImage(`data:${contentType};base64,`);
        }
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      alert("Failed to take photo");
    } finally {
      setIsCapturing(false);
    }
  };

  const performUpload = async () => {
    setIsSaving(true);
    try {
      // If we have an actual image, upload it to Firebase Storage
      let uploadedUrl: string | undefined;
      if (image) {
        let base64: string | null = null;
        let mimeType: string = "image/jpeg";

        if (typeof image === "string") {
          // data URL case
          const match = image.match(/^data:([^;]+);base64,(.*)$/);
          if (match) {
            mimeType = match[1] || "image/jpeg";
            base64 = match[2] || null;
          }
        } else if (typeof image === "object" && image.base64) {
          base64 = image.base64;
          if (image.mimeType) mimeType = image.mimeType;
        }

        if (!base64) {
          throw new Error("No base64 image data available for upload");
        }

        // Upload to Firebase Storage
        const folder = auth.currentUser?.uid
          ? `images/${auth.currentUser.uid}/notes`
          : "images/notes";
        const url = await uploadToFirebaseStorage(base64, mimeType, {
          folder,
        });
        uploadedUrl = url;
        console.log("✅ Firebase Storage upload URL:", url);
      }

      // Call onComplete to proceed to notes modal
      onComplete(uploadedUrl);
    } catch (error) {
      console.error("Failed to save image:", error);
      Alert.alert("Error", "Failed to save session data. Please try again.");
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  const handleSaveImage = async () => {
    // Check if user is logged in
    if (!auth.currentUser) {
      Alert.alert(
        "Login Required",
        "You need to be logged in to save images. Please log in and try again.",
        [{ text: "OK", onPress: onClose }]
      );
      return;
    }

    if (!image) {
      // No image selected, just proceed
      onComplete();
      onClose();
      return;
    }

    // Check Storage Limit
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userDoc.data();
      const usage = userData?.storageUsed || 0;
      const userLimit = userData?.storageLimit || DEFAULT_STORAGE_LIMIT;

      setCurrentUsage(usage);
      setLimit(userLimit);

      if (isStorageFull(usage, userLimit)) {
        setShowStorageWarning(true);
        return;
      }

      // If not full, proceed
      performUpload();

    } catch (e) {
      console.error("Failed to check storage:", e);
      // On error, let them pass? Or block? Let's block to be safe or pass.
      // For MVP, if check fails, maybe just try upload.
      performUpload();
    }
  };

  const handleWatchAd = () => {
    setShowStorageWarning(false);
    performUpload();
  };

  const handleSkip = () => {
    onClose();
    onComplete();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.modalTitle}>Save Session</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {image ? (
              <Image
                source={{
                  uri:
                    typeof image === "string"
                      ? image
                      : `data:${image.mimeType || "image/jpeg"};base64,${image.base64
                      }`,
                }}
                style={styles.previewImage}
              />
            ) : (
              <Ionicons
                name="image-outline"
                size={80}
                color="#fff"
                style={styles.icon}
              />
            )}

            <Text style={styles.description}>
              {image
                ? "Image selected! Ready to save?"
                : "Capture or select an image for your completed session"}
            </Text>

            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={20} color="#fff" />
                <Text style={styles.detailText}>
                  Duration: {duration} minutes
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.detailText}>
                  Task: {taskTitle || "Pomodoro Session"}
                </Text>
              </View>
            </View>
          </View>

          {!image ? (
            <View style={styles.imageButtonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.imageButton]}
                onPress={takePhoto}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="camera-outline"
                      size={24}
                      color="#fff"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.buttonText}>Take Photo</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.imageButton]}
                onPress={pickImage}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="images-outline"
                      size={24}
                      color="#fff"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.buttonText}>Choose Image</Text>
                  </>
                )}
              </TouchableOpacity>
              {/* Optional crop button after selection to avoid forced cropping */}
              {image && typeof image === "object" && (image as any).base64 ? (
                <TouchableOpacity
                  style={[styles.button, styles.imageButton]}
                  onPress={() => {
                    /* Hook in a future cropper here */
                  }}
                  disabled={true}
                >
                  <Text style={styles.buttonText}>Crop (coming soon)</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.skipButton]}
                onPress={() => setImage(null)}
                disabled={isSaving}
              >
                <Text style={styles.buttonText}>Change Image</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveImage}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.skipContainer}>
            <TouchableOpacity
              onPress={handleSkip}
              disabled={isSaving || isCapturing}
            >
              <Text style={styles.skipText}>Skip image capture</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <StorageWarningModal
        visible={showStorageWarning}
        onClose={() => setShowStorageWarning(false)}
        onWatchAd={handleWatchAd}
        currentUsage={currentUsage}
        limit={limit}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: "90%",
    backgroundColor: "#546bab",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 5,
  },
  content: {
    alignItems: "center",
    marginBottom: 20,
  },
  icon: {
    marginBottom: 15,
  },
  description: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  detailsContainer: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    padding: 15,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  detailText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  imageButtonContainer: {
    flexDirection: "column",
    gap: 10,
    marginBottom: 15,
  },
  button: {
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    minWidth: "45%",
    alignItems: "center",
  },
  imageButton: {
    backgroundColor: "#3498db",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 15,
  },
  skipButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  buttonIcon: {
    marginRight: 8,
  },
  skipContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  skipText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 15,
  },
});

export default ImageCaptureModal;
