import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { Achievement } from "../types";

/**
 * Migrate old achievement documents to use composite IDs
 * This function should be run once to fix existing achievements in the database
 * 
 * @param userId User ID to migrate achievements for
 * @returns Object with migration results
 */
export const migrateUserAchievements = async (userId: string) => {
  try {
    console.log(`🔄 Starting achievement migration for user ${userId}`);
    
    const achievementsRef = collection(db, "achievements");
    const q = query(achievementsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    // Group achievements by achievement ID to handle duplicates
    const achievementGroups = new Map<string, any[]>();
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Achievement;
      const achievementId = data.id;
      
      if (!achievementGroups.has(achievementId)) {
        achievementGroups.set(achievementId, []);
      }
      
      achievementGroups.get(achievementId)!.push({
        docId: docSnap.id,
        data: data,
        unlockedAt: data.unlockedAt?.toMillis?.() || 0,
      });
    });

    // Process each achievement group
    for (const [achievementId, docs] of achievementGroups.entries()) {
      const compositeId = `${userId}_${achievementId}`;
      
      // Check if document already uses composite ID
      const hasCompositeId = docs.some(d => d.docId === compositeId);
      
      if (hasCompositeId) {
        console.log(`✅ Achievement ${achievementId} already uses composite ID`);
        
        // Delete any old random-ID documents
        for (const oldDoc of docs) {
          if (oldDoc.docId !== compositeId) {
            try {
              await deleteDoc(doc(achievementsRef, oldDoc.docId));
              console.log(`🗑️ Deleted old document ${oldDoc.docId}`);
            } catch (error) {
              console.error(`❌ Failed to delete old document ${oldDoc.docId}:`, error);
              errors++;
            }
          }
        }
        skipped++;
        continue;
      }
      
      // Sort by unlock time to keep the earliest
      docs.sort((a, b) => a.unlockedAt - b.unlockedAt);
      const earliest = docs[0];
      
      try {
        // Create new document with composite ID
        const newDocRef = doc(achievementsRef, compositeId);
        await setDoc(newDocRef, earliest.data);
        console.log(`✅ Migrated ${achievementId} to composite ID: ${compositeId}`);
        
        // Delete all old documents
        for (const oldDoc of docs) {
          try {
            await deleteDoc(doc(achievementsRef, oldDoc.docId));
            console.log(`🗑️ Deleted old document ${oldDoc.docId}`);
          } catch (error) {
            console.error(`❌ Failed to delete old document ${oldDoc.docId}:`, error);
          }
        }
        
        migrated++;
      } catch (error) {
        console.error(`❌ Failed to migrate achievement ${achievementId}:`, error);
        errors++;
      }
    }

    const result = {
      migrated,
      skipped,
      errors,
      total: achievementGroups.size,
    };

    console.log(`✅ Migration complete:`, result);
    return result;
  } catch (error) {
    console.error(`❌ Migration failed for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Check if user needs achievement migration
 * @param userId User ID to check
 * @returns True if migration is needed
 */
export const needsMigration = async (userId: string): Promise<boolean> => {
  try {
    const achievementsRef = collection(db, "achievements");
    const q = query(achievementsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    // Check if any documents don't use composite ID format
    let hasOldFormat = false;
    querySnapshot.forEach((docSnap) => {
      const expectedCompositeId = `${userId}_${docSnap.data().id}`;
      if (docSnap.id !== expectedCompositeId) {
        hasOldFormat = true;
      }
    });

    return hasOldFormat;
  } catch (error) {
    console.error(`Failed to check migration status for user ${userId}:`, error);
    return false;
  }
};
