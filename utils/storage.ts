import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserSettings } from "../types";
import { SETTINGS_KEY, SOUND_PRESETS } from "../constants";

const DEFAULT_MINUTES = 25;

export const loadSettings = async (): Promise<Partial<UserSettings>> => {
  try {
    const storedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
    if (storedSettings) {
      const settings = JSON.parse(storedSettings);
      return {
        duration: settings.duration || DEFAULT_MINUTES,
        isSoundOn: settings.isSoundOn ?? true,
        isVibrationOn: settings.isVibrationOn ?? true,
        selectedSound: settings.selectedSound || SOUND_PRESETS[0],
      };
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
  
  return {
    duration: DEFAULT_MINUTES,
    isSoundOn: true,
    isVibrationOn: true,
    selectedSound: SOUND_PRESETS[0],
  };
};

export const saveSettings = async (settings: UserSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
};
