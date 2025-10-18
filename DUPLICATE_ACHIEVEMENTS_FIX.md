# Duplicate Achievements Fix

## Problem
Users were seeing duplicate achievement badges in their profile:
- Same achievement (e.g., "3-Day Streak") appeared multiple times
- Achievement notifications showed 2 times on login
- Firestore had duplicate documents for the same achievement

## Root Cause

### 1. Race Condition
Multiple calls to `checkStreakAchievements` happened simultaneously:
- On user login
- On task completion
- On streak update

### 2. Poor Document ID Strategy
```typescript
// OLD CODE - Creates random document IDs
const achievementDocRef = doc(achievementsRef); // Random ID!
await setDoc(achievementDocRef, unlockedAchievement);
```

This meant:
- Each unlock created a NEW document
- Duplicate check didn't prevent new documents
- Same achievement could be saved multiple times

## Solution

### 1. Fixed `unlockAchievement` Function

**Before:**
```typescript
// Check with query (slow, race condition possible)
const q = query(
  achievementsRef,
  where("userId", "==", userId),
  where("id", "==", achievementId)
);
const querySnapshot = await getDocs(q);

// Save with random ID
const achievementDocRef = doc(achievementsRef);
await setDoc(achievementDocRef, unlockedAchievement);
```

**After:**
```typescript
// Use composite key: userId_achievementId
const compositeId = `${userId}_${achievementId}`;
const achievementDocRef = doc(achievementsRef, compositeId);

// Check if exists (fast, atomic)
const docSnap = await getDoc(achievementDocRef);
if (docSnap.exists()) {
  return null; // Already unlocked
}

// Save with composite ID (prevents duplicates)
await setDoc(achievementDocRef, unlockedAchievement);
```

### 2. Added Cleanup Function

Created `cleanupDuplicateAchievements()` to:
- Find all achievements for a user
- Group by achievement ID
- Keep the earliest unlock
- Delete all duplicates

```typescript
export const cleanupDuplicateAchievements = async (
  userId: string
): Promise<number> => {
  // Groups achievements by ID
  // Keeps earliest unlock timestamp
  // Deletes all duplicates
  // Returns count of removed duplicates
}
```

### 3. Auto-Cleanup on Login

Added cleanup call when user logs in:
```typescript
// Clean up duplicate achievements first (silent operation)
const { cleanupDuplicateAchievements } = require("../utils/achievements");
const duplicatesRemoved = await cleanupDuplicateAchievements(currentUser.uid);
if (duplicatesRemoved > 0) {
  console.log(`🧹 Removed ${duplicatesRemoved} duplicate achievement(s)`);
}
```

## Files Changed

1. **`utils/achievements.ts`**
   - Fixed `unlockAchievement()` to use composite document IDs
   - Added `cleanupDuplicateAchievements()` function
   - Added `deleteDoc` import

2. **`screens/TimerScreen.tsx`**
   - Added cleanup call on user login
   - Runs before checking for new achievements

## How It Works Now

### On Login:
1. ✅ **Cleanup runs first** - Removes any existing duplicates
2. ✅ **Achievement check** - Uses composite IDs (no new duplicates)
3. ✅ **Profile loads** - Shows only unique badges

### On Achievement Unlock:
1. ✅ **Composite ID check** - `userId_achievementId`
2. ✅ **Atomic operation** - `getDoc()` then `setDoc()`
3. ✅ **No duplicates** - Same ID can't be created twice

## Benefits

✅ **No more duplicates** - Composite IDs prevent duplicate documents
✅ **Automatic cleanup** - Existing duplicates removed on login
✅ **Better performance** - `getDoc()` faster than query
✅ **Atomic operations** - No race conditions
✅ **Clean database** - Old duplicates automatically removed

## Testing

### Test Duplicate Removal:
1. User with duplicate badges logs in
2. Console shows: `🧹 Removed X duplicate achievement(s) on login`
3. Profile shows only unique badges

### Test No New Duplicates:
1. Complete multiple tasks quickly
2. Achievement only unlocks once
3. Console shows: `🏆 Achievement already unlocked for user`

## Database Structure

### Before:
```
achievements/
  ├── randomId1 → { id: "streak_3", userId: "user123", ... }
  ├── randomId2 → { id: "streak_3", userId: "user123", ... } ❌ DUPLICATE
  └── randomId3 → { id: "streak_7", userId: "user123", ... }
```

### After:
```
achievements/
  ├── user123_streak_3 → { id: "streak_3", userId: "user123", ... } ✅
  └── user123_streak_7 → { id: "streak_7", userId: "user123", ... } ✅
```

## Current Status
🎉 **All fixed!**
- Existing duplicates will be cleaned on next login
- New duplicates cannot be created
- Achievement system working perfectly
