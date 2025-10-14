import { Audio } from "expo-av";
import { SoundPreset } from "../types";
import { SOUND_MAP } from "../constants";

// Track currently playing sound
let currentSound: Audio.Sound | null = null;

// AUDIO PLAYBACK FUNCTION
export const playCompletionSound = async (soundName: SoundPreset) => {
  try {
    // Stop and unload any currently playing sound
    if (currentSound) {
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      } catch (error) {
        console.log("Error stopping previous sound:", error);
      }
      currentSound = null;
    }

    const soundSource = SOUND_MAP[soundName];

    const { sound } = await Audio.Sound.createAsync(soundSource, {
      shouldPlay: true,
      isLooping: false,
    });

    // Store reference to current sound
    currentSound = sound;

    await sound.playAsync();

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        // Clear reference when sound finishes
        if (currentSound === sound) {
          currentSound = null;
        }
      }
    });
  } catch (error) {
    console.error(`Failed to play sound (${soundName}):`, error);
  }
};
