// utils/recalculateStreaks.ts
import { db } from "../firebase/firebaseConfig";
import { collection, getDocs, writeBatch, doc, serverTimestamp } from "firebase/firestore";

/**
 * Recalculates the streak for all users based on their activeDays array.
 * activeDays should be an array of strings in YYYY-MM-DD format.
 * The streak is the count of consecutive days ending today.
 */
export async function recalculateAllStreaks() {
    const usersCol = collection(db, "users");
    const snapshot = await getDocs(usersCol);
    const batch = writeBatch(db);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    snapshot.forEach((userDoc) => {
        const data = userDoc.data() as any;
        const activeDays: string[] = (data?.activeDays || []).sort();
        // Remove duplicates
        const uniqueDays = Array.from(new Set(activeDays));
        // Compute streak ending today (or yesterday if today not present)
        let streak = 0;
        let streakStartDate = "";
        // Start from today and go backwards
        let cursor = new Date(today);
        while (true) {
            const cursorStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
            if (uniqueDays.includes(cursorStr)) {
                streak++;
                if (streak === 1) {
                    streakStartDate = cursorStr; // will be overwritten later to earliest day
                }
                // move back one day
                cursor.setDate(cursor.getDate() - 1);
            } else {
                break;
            }
        }
        // If streak > 0, find the earliest day in the consecutive block
        if (streak > 0) {
            const start = new Date(today);
            start.setDate(start.getDate() - (streak - 1));
            streakStartDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
        }
        // Update user document
        const userRef = doc(db, "users", userDoc.id);
        batch.update(userRef, {
            streak,
            streakStartDate,
            activeDays: uniqueDays,
            lastActive: serverTimestamp(),
        });
    });

    await batch.commit();
    console.log("✅ Recalculated streaks for all users");
}

// Run the migration when this file is executed directly
if (require.main === module) {
    recalculateAllStreaks().catch(console.error);
}
