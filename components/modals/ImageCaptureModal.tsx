import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { saveImage } from '../../utils/imageStorage';

interface ImageCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
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
  completedAt = Date.now()
}: ImageCaptureModalProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const pickImage = async () => {
    setIsCapturing(true);
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Failed to pick image');
    } finally {
      setIsCapturing(false);
    }
  };

  const takePhoto = async () => {
    setIsCapturing(true);
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera permissions to make this work!');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      alert('Failed to take photo');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSaveImage = async () => {
    try {
      setIsSaving(true);
      
      // Create a JSON string with timer completion data
      const timerData = JSON.stringify({
        taskTitle,
        duration,
        completedAt,
        timestamp: Date.now(),
        type: 'timer_completion',
        imageUri: image
      });
      
      // Save the timer data as an "image"
      await saveImage(timerData, taskTitle);
      
      // Call onComplete to proceed to notes modal
      onComplete();
    } catch (error) {
      console.error('Failed to save image:', error);
      alert('Failed to save session data');
    } finally {
      setIsSaving(false);
      onClose();
    }
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
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <Ionicons name="image-outline" size={80} color="#fff" style={styles.icon} />
            )}
            
            <Text style={styles.description}>
              {image ? "Image selected! Ready to save?" : "Capture or select an image for your completed session"}
            </Text>
            
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={20} color="#fff" />
                <Text style={styles.detailText}>
                  Duration: {Math.floor(duration / 60)} minutes
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
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
                    <Ionicons name="camera-outline" size={24} color="#fff" style={styles.buttonIcon} />
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
                    <Ionicons name="images-outline" size={24} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Choose Image</Text>
                  </>
                )}
              </TouchableOpacity>
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    backgroundColor: '#546bab',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    marginBottom: 15,
  },
  description: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  imageButtonContainer: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 15,
  },
  button: {
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    minWidth: '45%',
    alignItems: 'center',
  },
  imageButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
  },
  skipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  skipContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 15,
  },
});

export default ImageCaptureModal;