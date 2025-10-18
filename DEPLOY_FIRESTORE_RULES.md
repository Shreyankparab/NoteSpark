# Deploy Updated Firestore Rules

## What Changed
Updated Firestore security rules to support the new composite achievement ID format (`userId_achievementId`).

## Why This Is Needed
The duplicate achievement fix uses composite document IDs like:
- `LysoAJGl7zQpiynuDB9st6JhF5t1_streak_3`
- `LysoAJGl7zQpiynuDB9st6JhF5t1_streak_7`

The old rules didn't properly handle these composite IDs, causing permission errors.

## Deploy Rules to Firebase

### Option 1: Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **notespark-new**
3. Click **Firestore Database** in the left menu
4. Click the **Rules** tab
5. Copy the contents of `firestore.rules` file
6. Paste into the editor
7. Click **Publish**

### Option 2: Firebase CLI

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not done)
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

## Updated Rules Summary

### Before:
```javascript
match /achievements/{achievementId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == resource.data.userId;
  allow create: if request.auth != null && 
    request.auth.uid == request.resource.data.userId;
}
```

**Problem:** Doesn't work with composite IDs, `resource.data` is null on create

### After:
```javascript
match /achievements/{achievementId} {
  // Allow read if authenticated user's ID is in the document ID
  allow read: if request.auth != null && 
    achievementId.matches(request.auth.uid + '_.*');
  
  // Allow create if the document ID starts with user's ID
  allow create: if request.auth != null && 
    achievementId.matches(request.auth.uid + '_.*') &&
    request.resource.data.userId == request.auth.uid;
  
  // Allow update/delete if user owns the achievement
  allow update, delete: if request.auth != null && 
    achievementId.matches(request.auth.uid + '_.*') &&
    resource.data.userId == request.auth.uid;
}
```

**Benefits:**
- ✅ Works with composite IDs
- ✅ Validates document ID format
- ✅ Allows cleanup function to delete duplicates
- ✅ Prevents users from accessing other users' achievements

## Verify Deployment

After deploying, check the Firebase Console:
1. Go to **Firestore Database** → **Rules**
2. You should see the updated rules
3. The "Last updated" timestamp should be recent

## Test the Fix

1. **Restart the Expo app**
   ```bash
   # Stop the current server (Ctrl+C)
   npx expo start -c
   ```

2. **Login to the app**
   - You should see: `🧹 Removed X duplicate achievement(s) on login`
   - No more permission errors

3. **Check achievements**
   - Profile should show unique badges only
   - No duplicates!

## Troubleshooting

### Still getting permission errors?
- Make sure rules are deployed (check Firebase Console)
- Clear app cache: `npx expo start -c`
- Check that user is logged in

### Rules not updating?
- Wait 1-2 minutes for Firebase to propagate changes
- Hard refresh Firebase Console (Ctrl+Shift+R)
- Try deploying again

## Next Steps

After deploying the rules:
1. ✅ Restart the app
2. ✅ Login with a user account
3. ✅ Duplicates will be automatically cleaned
4. ✅ New achievements won't create duplicates
5. ✅ Everything works perfectly!
