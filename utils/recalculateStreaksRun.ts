import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc, serverTimestamp } from "firebase/firestore";

// Firebase config from firebaseConfig.ts
const firebaseConfig = {
    apiKey: "AIzaSyDS3nKSjG9S46vzTayEZz1fbda8AFtAAPc",
    authDomain: "notespark-new.firebaseapp.com",
    projectId: "notespark-new",
    storageBucket: "notespark-new.firebasestorage.app",
    messagingSenderId: "189308470391",
    appId: "1:189308470391:web:cb678aec406cce9abf7272",
};

// Initialize Firebase locally
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Recalculates the streak for all users based on their activeDays array.
 */
async function recalculateAllStreaks() {
    console.log("Starting streak recalculation...");
    const usersCol = collection(db, "users");
    const snapshot = await getDocs(usersCol);

    if (snapshot.empty) {
        console.log("No users found.");
        return;
    }

    const batch = writeBatch(db);
    let updateCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    snapshot.forEach((userDoc) => {
        const data = userDoc.data() as any;
        const activeDays: string[] = (data?.activeDays || []).sort();

        // Remove duplicates
        const uniqueDays = Array.from(new Set(activeDays));

        // Compute streak ending today (or yesterday if today not present)
        let streak = 0;
        let streakStartDate = "";

        // Check backwards from today
        let cursor = new Date(today);
        let consecutive = true;

        // Safe-guard to prevent infinite loops (e.g. max 365 days check)
        for (let i = 0; i < 365; i++) {
            const cursorStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;

            if (uniqueDays.includes(cursorStr)) {
                streak++;
                // Update start date to current cursor (earliest date so far)
                streakStartDate = cursorStr;
                // Move back one day
                cursor.setDate(cursor.getDate() - 1);
            } else {
                // If we haven't started counting yet (today not active), check if yesterday was active?
                // But valid streak means consecutive ending today.
                // If user was active yesterday but not today, streak is technically still valid until end of today?
                // However, our app logic (TimerScreen) says: 
                // "if lastActiveDay < yesterday -> streak broken".
                // So if they missed today, but have yesterday, streak = active days ending yesterday?
                // Wait, if today is NOT in activeDays, then streak should be what it was yesterday?
                // BUT, if I run this script, I am recalculating based on RECORDED active days.

                // If I haven't found any active day yet (i.e. today is missing), 
                // check if the VERY first day checked (today) was missed.
                if (streak === 0 && i === 0) {
                    // Today is missing. Check yesterday.
                    cursor.setDate(cursor.getDate() - 1);
                    continue;
                    // We act as if we are checking from yesterday.
                    // If yesterday is present, streak startss counting from 1 (for yesterday).
                    // So if user was active [26,27,28,29] and today is 30 (inactive),
                    // loop i=0 (30): misses. cursor->29.
                    // loop i=1 (29): hits. streak=1. cursor->28.
                    // ... streak=4.
                    // This seems correct logic for "current streak".
                } else {
                    // Gap found after streak started
                    break;
                }
            }
        }

        // Logic Verification:
        // If activeDays=[29], Today=30.
        // i=0 (30): not in set. Streak=0. Cursor->29. Continue.
        // i=1 (29): in set. Streak=1. Cursor->28.
        // i=2 (28): not in set. Break.
        // Result: Streak=1. Correct.

        // If activeDays=[29, 30], Today=30.
        // i=0 (30): in set. Streak=1. Cursor->29.
        // i=1 (29): in set. Streak=2. Cursor->28.
        // ...
        // Result: Streak=2. Correct.

        console.log(`User ${userDoc.id}: Calculated streak ${streak} (was ${data.streak})`);

        const userRef = doc(db, "users", userDoc.id);
        batch.update(userRef, {
            streak,
            streakStartDate,
            activeDays: uniqueDays,
            // We don't touch lastActive as that's timestamp of last action
        });
        updateCount++;
    });

    if (updateCount > 0) {
        await batch.commit();
        console.log(`✅ Recalculated streaks for ${updateCount} users.`);
    } else {
        console.log("No users needed updates.");
    }
}

recalculateAllStreaks().catch(console.error);
