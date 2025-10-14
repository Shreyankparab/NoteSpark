# Firestore Setup Guide for NoteSpark Tasks

## Overview
This guide will help you set up the Firestore database structure for the NoteSpark task management feature. Your `users` collection is already set up for streak counting, so we'll add a new `tasks` collection.

---

## 🔥 Firestore Database Structure

### Collection: `tasks`
This is a **root-level collection** (not a subcollection under users).

#### Document Structure
Each task document should have the following fields:

```javascript
{
  id: string,              // Document ID (auto-generated or timestamp-based)
  title: string,           // Task title/description
  duration: number,        // Duration in minutes (e.g., 25)
  createdAt: number,       // Timestamp in milliseconds (Date.now())
  completedAt: number,     // Timestamp when completed (optional)
  status: string,          // "active" | "completed" | "pending"
  userId: string           // Reference to the user who owns this task
}
```

---

## 📋 Setup Steps

### Step 1: Create the Collection (Automatic)
The collection will be **automatically created** when the first task is saved. No manual setup needed!

### Step 2: Set Up Firestore Security Rules

Go to your Firebase Console → Firestore Database → Rules and add these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Existing users collection rules (keep your current rules)
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // NEW: Tasks collection rules
    match /tasks/{taskId} {
      // Users can only read their own tasks
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
      
      // Users can only create tasks for themselves
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
      
      // Users can only update/delete their own tasks
      allow update, delete: if request.auth != null && 
                               resource.data.userId == request.auth.uid;
    }
    
    // NEW: Notes collection rules (for Pomodoro session notes)
    match /notes/{noteId} {
      // Users can only read their own notes
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
      
      // Users can only create notes for themselves
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
      
      // Users can only update/delete their own notes
      allow update, delete: if request.auth != null && 
                               resource.data.userId == request.auth.uid;
    }
  }
}
```

### Step 3: Create Firestore Indexes (Required for Queries)

The app uses a compound query to fetch tasks. You need to create an index:

#### Option A: Automatic (Recommended)
1. Run your app and try to create a task
2. Check the console logs - Firebase will show an error with a **direct link** to create the index
3. Click the link and Firebase will auto-create the index for you

#### Option B: Manual Setup
1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Set up the following composite index:

```
Collection ID: tasks
Fields to index:
  - userId (Ascending)
  - createdAt (Descending)
Query scope: Collection
```

---

## 🎯 How It Works

### Real-time Sync
The app uses Firestore's `onSnapshot` listener to automatically sync tasks in real-time:
- When you create a task → instantly appears in the Tasks screen
- When you update a task → changes reflect immediately
- When you delete a task → removed from all devices
- Works across multiple devices logged in with the same account

### Data Flow
```
User creates task → Firestore (tasks collection) → Real-time listener updates UI
                                                 ↓
                                    All devices with same user logged in
```

---

## 🧪 Testing Your Setup

### Test 1: Create a Task
1. Log in to your app
2. Start the timer
3. Enter a task title (e.g., "Study React Native")
4. Check Firestore Console → you should see a new document in the `tasks` collection

### Test 2: View Tasks
1. Navigate to the "Tasks" tab
2. You should see your created task
3. Check the status icon (timer icon = active, checkmark = completed)

### Test 3: Real-time Sync
1. Open Firestore Console
2. Manually change a task's `title` field
3. Watch the app update automatically without refresh!

### Test 4: Security Rules
1. Try to access another user's tasks (should fail)
2. Try to create a task with a different userId (should fail)

---

## 📊 Firestore Console View

Your Firestore structure should look like this:

```
📁 Firestore Database
├── 📂 users (existing)
│   ├── 📄 {userId1}
│   │   ├── streak: 5
│   │   └── lastActive: Timestamp
│   └── 📄 {userId2}
│       ├── streak: 3
│       └── lastActive: Timestamp
│
└── 📂 tasks (new)
    ├── 📄 {taskId1}
    │   ├── id: "1234567890"
    │   ├── title: "Study React Native"
    │   ├── duration: 25
    │   ├── createdAt: 1234567890000
    │   ├── status: "completed"
    │   ├── completedAt: 1234567890000
    │   └── userId: "abc123xyz"
    │
    └── 📄 {taskId2}
        ├── id: "0987654321"
        ├── title: "Read Chapter 5"
        ├── duration: 30
        ├── createdAt: 1234567890000
        ├── status: "active"
        ��── userId: "abc123xyz"
```

---

## 🔍 Troubleshooting

### Issue: "Missing or insufficient permissions"
**Solution:** Check your Firestore security rules. Make sure the rules above are correctly applied.

### Issue: "The query requires an index"
**Solution:** 
1. Check the console error message
2. Click the provided link to auto-create the index
3. Wait 1-2 minutes for the index to build

### Issue: Tasks not appearing
**Solution:**
1. Check console logs for errors
2. Verify user is logged in (`user` object exists)
3. Check Firestore Console to see if documents are being created
4. Verify the `userId` field matches the logged-in user's UID

### Issue: Real-time updates not working
**Solution:**
1. Check internet connection
2. Verify Firestore listener is set up (check console for "🔥 Setting up Firestore listener")
3. Check for any console errors

---

## 💡 Best Practices

### 1. Data Validation
The app validates:
- Task title is not empty
- User is authenticated before creating tasks
- Only task owner can modify/delete tasks

### 2. Offline Support
Firestore automatically handles offline mode:
- Tasks are cached locally
- Changes sync when connection is restored
- No additional code needed!

### 3. Cost Optimization
Current setup is optimized for free tier:
- Uses real-time listeners (1 read per document change)
- Queries are indexed for fast performance
- No unnecessary reads

### 4. Scalability
The structure supports:
- Unlimited tasks per user
- Fast queries with proper indexing
- Easy to add new fields (e.g., tags, priority, notes)

---

## 🚀 Future Enhancements

You can easily extend this setup:

### Add Task Categories
```javascript
{
  ...existingFields,
  category: "work" | "study" | "personal"
}
```

### Add Task Priority
```javascript
{
  ...existingFields,
  priority: "high" | "medium" | "low"
}
```

### Add Task Notes
```javascript
{
  ...existingFields,
  notes: "Additional details about the task"
}
```

### Add Recurring Tasks
```javascript
{
  ...existingFields,
  recurring: {
    enabled: true,
    frequency: "daily" | "weekly" | "monthly"
  }
}
```

---

## 📞 Support

If you encounter any issues:
1. Check the console logs (look for ✅ success or ❌ error messages)
2. Verify your Firebase configuration in `firebaseConfig.ts`
3. Ensure you have the latest Firebase SDK installed
4. Check Firestore security rules are correctly set

---

## ✅ Checklist

- [ ] Firestore security rules updated
- [ ] Composite index created (userId + createdAt)
- [ ] Tested task creation
- [ ] Tested task viewing in Tasks screen
- [ ] Tested real-time sync
- [ ] Tested task deletion
- [ ] Verified security rules work (can't access other users' tasks)

---

**That's it! Your Firestore setup is complete. Tasks will now sync in real-time across all devices! 🎉**
