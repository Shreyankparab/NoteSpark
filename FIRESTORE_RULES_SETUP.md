# Firestore Security Rules Setup Guide

## 🚨 IMPORTANT: Fix Required for Achievements

The achievement system is currently failing due to missing Firestore security rules. Follow these steps to fix it:

## Step 1: Deploy Firestore Rules

### Option A: Using Firebase CLI (Recommended)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase in your project** (if not already done):
   ```bash
   firebase init firestore
   ```

4. **Deploy the rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Option B: Using Firebase Console (Manual)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `notespark-new`
3. Navigate to **Firestore Database** → **Rules**
4. Replace the existing rules with the content from `firestore.rules` file
5. Click **Publish**

## Step 2: Verify Rules Are Applied

After deploying, the rules should allow:
- ✅ Users to read/write their own user documents
- ✅ Users to read/write their own tasks
- ✅ Users to read/write their own notes  
- ✅ Users to read/write their own achievements

## Step 3: Test the Achievement System

1. **Login with a user who has a 3-day streak**
2. **Check console logs** for:
   ```
   🎯 Checking streak achievements for user [userId] with streak 3
   🎯 Eligible achievements: ["3-Day Streak (threshold: 3)"]
   🏆 Successfully unlocked achievement streak_3 for user [userId]
   🏆 Showing 1 achievement notifications
   ```

3. **Verify achievement appears** in the profile modal

## Current Rules (firestore.rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read and write their own tasks
    match /tasks/{taskId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
    
    // Users can read and write their own notes
    match /notes/{noteId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
    
    // Users can read and write their own achievements
    match /achievements/{achievementId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## Troubleshooting

### If you still get permission errors:

1. **Check Firebase project**: Make sure you're using the correct project (`notespark-new`)
2. **Verify authentication**: Ensure the user is properly authenticated
3. **Check console logs**: Look for detailed error messages
4. **Test in Firebase Console**: Try creating an achievement document manually

### Common Issues:

- **Wrong project**: Make sure you're in the `notespark-new` project
- **Rules not deployed**: Verify rules are published in Firebase Console
- **Authentication issues**: Ensure user is logged in before checking achievements

## Next Steps

After fixing the rules:
1. Test with a 3-day streak user
2. Verify achievement notification appears
3. Check that achievement shows in profile
4. Test with other achievement types (7-day, 30-day, focus time)

The achievement system should now work correctly! 🎉
