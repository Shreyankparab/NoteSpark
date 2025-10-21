# White Noise Audio Files Setup

## Current Status
The white noise feature is implemented but uses placeholder audio files from the existing `assets/sounds/` folder.

## To Add Real White Noise Files:

1. **Download or create white noise audio files** (MP3 format recommended):
   - `rain.mp3` - Gentle rainfall sounds
   - `ocean-waves.mp3` - Calming ocean waves
   - `forest.mp3` - Birds and nature sounds
   - `coffee-shop.mp3` - Ambient cafe atmosphere
   - `fireplace.mp3` - Crackling fire sounds
   - `brown-noise.mp3` - Deep, low-frequency noise
   - `pink-noise.mp3` - Balanced frequency noise
   - `white-noise.mp3` - Classic white noise

2. **Place the files in**: `assets/sounds/whitenoise/`

3. **Update the WHITE_NOISE_SOUND_MAP in** `constants/index.ts`:
   ```typescript
   export const WHITE_NOISE_SOUND_MAP: Record<WhiteNoiseType, any> = {
     "None": null,
     "Rain": require("../assets/sounds/whitenoise/rain.mp3"),
     "Ocean Waves": require("../assets/sounds/whitenoise/ocean-waves.mp3"),
     "Forest": require("../assets/sounds/whitenoise/forest.mp3"),
     "Coffee Shop": require("../assets/sounds/whitenoise/coffee-shop.mp3"),
     "Fireplace": require("../assets/sounds/whitenoise/fireplace.mp3"),
     "Brown Noise": require("../assets/sounds/whitenoise/brown-noise.mp3"),
     "Pink Noise": require("../assets/sounds/whitenoise/pink-noise.mp3"),
     "White Noise": require("../assets/sounds/whitenoise/white-noise.mp3"),
   };
   ```

## Recommended Sources for White Noise Files:
- **Free**: Freesound.org, Zapsplat.com (with free account)
- **Paid**: AudioJungle, Pond5
- **Generate**: Audacity (free software) can generate white/pink/brown noise

## File Requirements:
- Format: MP3 or WAV
- Duration: 10-60 seconds (will loop automatically)
- Quality: 128kbps or higher
- Size: Keep under 1MB per file for app performance

## Current Placeholder Behavior:
- All white noise options currently play existing sound effects
- The functionality works correctly, just needs real audio files
- Preview and looping features are fully implemented
