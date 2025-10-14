# NoteSpark

NoteSpark is a productivity application built with React Native and Expo that combines a Pomodoro timer with note-taking and task management capabilities. The app helps users stay focused, track their productivity, and capture their thoughts during work sessions.

## Features

- **Pomodoro Timer**: Focus timer with customizable work and break durations
- **Task Management**: Create, track, and complete tasks
- **Note Taking**: Add notes to completed sessions
- **Image Capture**: Take photos or select images from your gallery to attach to completed sessions
- **Session History**: View past sessions with associated notes and images
- **Streak Tracking**: Monitor your daily productivity streaks
- **Firebase Integration**: User authentication and cloud data storage
- **Customizable Settings**: Personalize timer durations, sounds, and notifications

## Technology Stack

- **Frontend**: React Native, Expo
- **State Management**: React Hooks
- **Backend/Database**: Firebase (Authentication, Firestore)
- **Storage**: AsyncStorage (local), Firebase Storage (cloud)
- **UI Components**: React Native components, Expo LinearGradient
- **Media**: Expo Image Picker, Audio

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/Shreyankparab/NoteSpark.git
   ```

2. Install dependencies:
   ```
   cd NoteSpark
   npm install
   ```

3. Set up Firebase:
   - Create a Firebase project
   - Enable Authentication (Email/Password and Google Sign-In)
   - Set up Firestore Database
   - Follow the instructions in FIRESTORE_SETUP_GUIDE.md

4. Start the development server:
   ```
   npx expo start
   ```

## Usage

1. **Sign In/Sign Up**: Create an account or sign in with existing credentials
2. **Set Timer**: Configure your work session duration
3. **Start Timer**: Begin your focus session
4. **Complete Session**: When the timer ends, capture an image (optional) and add notes
5. **View History**: Check your past sessions and productivity stats

## Project Structure

- `/assets`: App icons, images, and sound files
- `/components`: Reusable UI components
  - `/modals`: Modal components for various app features
- `/constants`: App-wide constants and configuration
- `/firebase`: Firebase configuration
- `/screens`: Main application screens
- `/types`: TypeScript type definitions
- `/utils`: Utility functions for storage, authentication, etc.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.