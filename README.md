# NoteSpark

<div align="center">
  <img src="./assets/icon.png" alt="NoteSpark Logo" width="120" height="120">
</div>

## 📱 Overview

NoteSpark is a comprehensive productivity application built with React Native and Expo that combines a Pomodoro timer with note-taking, task management, and flashcard functionality. The app helps users stay focused, organized, and productive by providing tools for time management, note capture (including images), task tracking, and learning through flashcards.

## ✨ Features

### 🕒 Pomodoro Timer
- Customizable work and break intervals
- Session tracking and statistics
- Streak counting for consistent usage
- Sound notifications for interval changes

### 📝 Notes
- Create, edit, and organize notes
- Attach images to notes
- View full-size images within the app
- Categorize notes by date
- Rich text formatting

### ✅ Tasks
- Create and manage to-do lists
- Set task priorities
- Mark tasks as complete
- Track task completion statistics

### 🔄 Flashcards
- Create study flashcards
- Review flashcards for effective learning
- Track learning progress

### 🔐 User Authentication
- Google Sign-In integration
- User profile management
- Secure data storage

### 🔄 Cloud Sync
- Firebase integration for data synchronization
- Access your data across multiple devices

## 🚀 Installation

### Prerequisites
- Node.js (v14 or later)
- npm or yarn
- Expo CLI
- Firebase account

### Setup Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/Shreyankparab/NoteSpark.git
   cd NoteSpark
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Firebase Setup:
   - Create a Firebase project
   - Enable Authentication (Google Sign-In)
   - Set up Firestore Database
   - Configure Storage for images
   - Follow the instructions in FIRESTORE_SETUP_GUIDE.md

4. Google Sign-In Setup:
   - Follow the instructions in GOOGLE_SIGNIN_SETUP.md

5. Start the development server:
   ```bash
   npx expo start
   ```

## 📱 Usage

### Timer Screen
The main screen features a Pomodoro timer that helps you work in focused intervals:
- Start/pause the timer
- Track your current streak
- View session statistics

### Notes Screen
Capture and organize your thoughts:
- Create new notes with title and content
- Attach images to your notes
- View notes organized by date
- Tap on notes to view details or edit

### Tasks Screen
Manage your to-do list:
- Add new tasks
- Set priorities
- Mark tasks as complete
- View completion statistics

### Flashcards Screen
Create and review study materials:
- Add new flashcards with questions and answers
- Review flashcards to reinforce learning
- Track your learning progress

## 🛠️ Technical Details

### Architecture
- React Native with Expo for cross-platform mobile development
- Firebase for backend services (Authentication, Firestore, Storage)
- Context API for state management

### Key Technologies
- React Native
- Expo
- Firebase (Authentication, Firestore, Storage)
- React Navigation
- Expo Notifications

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

Developed by Shreyank Parab

---

For any issues or feature requests, please open an issue on the [GitHub repository](https://github.com/Shreyankparab/NoteSpark).