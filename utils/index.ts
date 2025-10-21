import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { SoundPreset, UserSettings } from '../types';
import { SOUND_MAP, SETTINGS_KEY } from '../constants';

// Settings utilities
export const loadSettings = async (): Promise<UserSettings | null> => {
  try {
    const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
    return settingsJson ? JSON.parse(settingsJson) : null;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return null;
  }
};

export const saveSettings = async (settings: UserSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

// Audio utilities
export const playCompletionSound = async (soundPreset: SoundPreset): Promise<void> => {
  try {
    const soundFile = SOUND_MAP[soundPreset];
    if (soundFile) {
      const { sound } = await Audio.Sound.createAsync(soundFile);
      await sound.playAsync();
      // Unload after playing to free memory
      setTimeout(async () => {
        try {
          await sound.unloadAsync();
        } catch (e) {
          console.log('Sound already unloaded');
        }
      }, 3000);
    }
  } catch (error) {
    console.error('Failed to play completion sound:', error);
  }
};
