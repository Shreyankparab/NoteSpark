# Flip Device Feature Implementation

## Overview
Implemented flip device functionality in the main timer screen that prompts users to flip their phone face down during focus sessions. The Task Input Modal (Start Session screen) is now full-screen for better immersion.

## Features Implemented

### 1. Full-Screen Task Input Modal
- **Location**: `components/modals/TaskInputModal.tsx`
- **Changes**:
  - Changed from centered modal to full-screen presentation
  - Uses `presentationStyle="fullScreen"`
  - Adjusted header padding for status bar
  - Provides immersive experience when starting a session

### 2. Flip Device Detection Overlay
- **Location**: `components/FlipDeviceOverlay.tsx`
- **Technology**: Uses `expo-sensors` Accelerometer API
- **Functionality**:
  - Detects when device is flipped face down (z-axis < -0.7)
  - Detects when device is flipped back up (z-axis > 0.7)
  - Real-time monitoring during active timer sessions
  - Overlays on top of main timer screen

### 3. 10-Second Flip Timeout System
- **Warning Phase**:
  - When timer starts with flip mode enabled, user has **10 seconds** to flip device
  - Visual banner shows countdown: "Flip Device! X seconds remaining"
  - **Vibrates every second** (200ms vibration) if device is not flipped
  - Large countdown circle shows remaining time
  
- **Success State**:
  - Green banner displays: "Device flipped! Keep it face down"
  - Haptic feedback on successful flip (iOS)
  - Vibration stops immediately
  - Countdown resets to 10 seconds if device is flipped back up
  
- **Timeout Consequence**:
  - If 10 seconds elapse without flipping:
    - **Timer stops immediately**
    - Task status changes from "active" → **"abandoned"**
    - `abandonedAt` timestamp is recorded in Firestore
    - User sees alert: "Session Abandoned - You didn't flip your device in time"
    - Current task is cleared from state

### 4. User Interface

#### Task Input Modal (Start Session Screen)
- **Full-Screen Presentation**: Modal now takes entire screen
- **Flip Device Toggle**: Located in Session Settings section
- **Description**: "Flip phone face down to focus"
- **Icon**: Phone landscape icon
- **Position**: Below vibration toggle

#### Timer Screen Integration
- **Overlay Component**: `FlipDeviceOverlay` renders on top of timer
- **Warning Banner**: Red banner at top when countdown is active
- **Success Banner**: Green banner at top when device is flipped
- **Status Indicator**: Bottom indicator shows "Flip Mode: Active/Inactive"

### 5. Task Status Management

#### New Task Status: "abandoned"
- Added to Task type in `types/index.ts`
- Includes `abandonedAt` timestamp field
- Tasks can have status: "pending" | "active" | "completed" | **"abandoned"**

#### Abandonment Logic
```typescript
// When flip timeout occurs:
1. Stop timer immediately
2. Clear timer state and notifications
3. Update task in Firestore:
   - status: "abandoned"
   - abandonedAt: Date.now()
4. Clear current task from local state
5. Show alert to user
```

## Technical Implementation

### Dependencies
- `expo-sensors` - Accelerometer for device orientation
- `expo-haptics` - Haptic feedback (iOS)

### Key Components

#### FlipDeviceOverlay.tsx
- **Props**:
  - `isActive`: Whether timer is running
  - `flipDeviceEnabled`: Whether flip mode is enabled
  - `onTimeout`: Callback when 10 seconds elapse
  
- **State Management**:
  - `isFlipped`: Current flip state
  - `flipCountdown`: Seconds remaining (10 → 0)
  - `showWarning`: Whether to show warning banner
  
- **Accelerometer Logic**:
  ```typescript
  const isFaceDown = data.z < -0.7;
  const isFaceUp = data.z > 0.7;
  ```
  
- **Countdown Timer**:
  - Updates every 1 second
  - Calls `onTimeout()` when reaching 0
  - Resets to 10 when device is flipped back up

#### TimerScreen.tsx
- **New Handler**: `handleFlipTimeout()`
  - Stops timer
  - Marks task as abandoned
  - Shows alert
  - Clears task state
  
- **Overlay Integration**:
  ```tsx
  {activeScreen === "Timer" && (
    <FlipDeviceOverlay
      isActive={isActive}
      flipDeviceEnabled={isFlipDeviceOn}
      onTimeout={handleFlipTimeout}
    />
  )}
  ```

### Vibration Pattern
- **Frequency**: Every 1 second during countdown
- **Duration**: 200ms per vibration
- **Stops**: When device is flipped or timeout occurs

## User Flow

1. **Start Session**: User opens Task Input Modal (now full-screen)
2. **Enable Flip Mode**: User toggles "Flip Device Mode" in Session Settings
3. **Enter Task**: User enters task details and taps "Start Timer"
4. **Timer Starts**: Timer begins, flip countdown starts immediately
5. **Warning Phase**: 
   - Red banner appears: "Flip Device! 10 seconds remaining"
   - Phone vibrates every second
   - Countdown circle shows remaining time
6. **Two Outcomes**:
   
   **A. User Flips Device (Success)**
   - Green banner: "Device flipped! Keep it face down"
   - Vibration stops
   - Timer continues normally
   - If user flips back → countdown restarts
   
   **B. Timeout (Failure)**
   - Timer stops
   - Task marked as "abandoned"
   - Alert shown
   - Session ends

## Benefits

### For Users
- **Accountability**: 10-second deadline creates urgency
- **Reduced Distractions**: Phone face down prevents notifications
- **Better Focus**: Physical commitment to focus session
- **Clear Consequences**: Abandoned status motivates compliance

### For App
- **Engagement**: Interactive feature increases commitment
- **Data Insights**: Track abandonment rate vs completion rate
- **Differentiation**: Unique accountability feature
- **Gamification**: Creates ritual around focus sessions

## Files Modified

1. ✨ **New**: `components/FlipDeviceOverlay.tsx` - Flip detection overlay
2. ✏️ **Updated**: `components/modals/TaskInputModal.tsx` - Full-screen modal
3. ✏️ **Updated**: `screens/TimerScreen.tsx` - Flip timeout handler & overlay integration
4. ✏️ **Updated**: `types/index.ts` - Added "abandoned" status
5. ❌ **Removed**: `components/modals/FullScreenTimerModal.tsx` - No longer needed

## Testing Recommendations

1. **Physical Device Required**: Accelerometer doesn't work in simulator
2. **Test Scenarios**:
   - Start timer with flip mode → flip within 10s → verify success
   - Start timer with flip mode → don't flip → verify abandonment
   - Flip device → flip back → verify countdown restarts
   - Verify vibration pattern (every 1 second)
   - Test on both iOS and Android
3. **Edge Cases**:
   - Rapid flipping
   - Partial flips (z-axis between -0.7 and 0.7)
   - App backgrounding during countdown
   - Timer completion while flipped

## Future Enhancements

- [ ] Customizable timeout duration (5s, 10s, 15s, 20s)
- [ ] Option to disable vibration but keep visual countdown
- [ ] Statistics: abandonment rate, average flip time
- [ ] Achievements for maintaining flip throughout session
- [ ] Option to auto-pause instead of abandon
- [ ] Grace period: 1 warning before abandonment
- [ ] Sound alert in addition to vibration

## Notes

- Accelerometer requires physical device for testing
- Haptic feedback is iOS-specific (vibration works on both platforms)
- All timers and subscriptions properly cleaned up on unmount
- Task abandonment is permanent (status cannot be changed back)
- Abandoned tasks are stored in Firestore for analytics
