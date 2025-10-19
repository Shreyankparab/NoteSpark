/**
 * Sync Manager
 * Handles synchronization between local storage and Firestore
 */

import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import {
  getSyncQueue,
  removeFromSyncQueue,
  incrementRetryCount,
  updateLastSyncTime,
  SyncOperation,
  saveTasksLocally,
  saveNotesLocally,
  saveSubjectsLocally,
} from './offlineStorage';
import { checkIsOnline } from './networkManager';

const MAX_RETRY_COUNT = 3;

/**
 * Process sync queue
 */
export async function processSyncQueue(): Promise<{
  success: number;
  failed: number;
  total: number;
}> {
  const isOnline = await checkIsOnline();
  
  if (!isOnline) {
    console.log('📡 Offline - skipping sync');
    return { success: 0, failed: 0, total: 0 };
  }

  const queue = await getSyncQueue();
  console.log(`🔄 Processing sync queue: ${queue.length} operations`);

  let success = 0;
  let failed = 0;

  for (const operation of queue) {
    try {
      await processOperation(operation);
      await removeFromSyncQueue(operation.id);
      success++;
      console.log(`✅ Synced operation: ${operation.type} ${operation.collection}`);
    } catch (error) {
      console.error(`❌ Failed to sync operation:`, error);
      
      if (operation.retryCount < MAX_RETRY_COUNT) {
        await incrementRetryCount(operation.id);
        console.log(`🔄 Will retry operation (attempt ${operation.retryCount + 1}/${MAX_RETRY_COUNT})`);
      } else {
        console.error(`❌ Max retries reached for operation, removing from queue`);
        await removeFromSyncQueue(operation.id);
      }
      
      failed++;
    }
  }

  if (success > 0) {
    await updateLastSyncTime();
  }

  console.log(`✅ Sync complete: ${success} success, ${failed} failed, ${queue.length} total`);
  
  return { success, failed, total: queue.length };
}

/**
 * Process a single sync operation
 */
async function processOperation(operation: SyncOperation): Promise<void> {
  const { type, collection: collectionName, data } = operation;

  switch (type) {
    case 'create':
      await addDoc(collection(db, collectionName), data);
      break;

    case 'update':
      if (!data.id) throw new Error('Update operation requires id');
      const { id, ...updateData } = data;
      await updateDoc(doc(db, collectionName, id), updateData);
      break;

    case 'delete':
      if (!data.id) throw new Error('Delete operation requires id');
      await deleteDoc(doc(db, collectionName, data.id));
      break;

    default:
      throw new Error(`Unknown operation type: ${type}`);
  }
}

/**
 * Sync all data from Firestore to local storage
 */
export async function syncFromFirestore(userId: string): Promise<void> {
  const isOnline = await checkIsOnline();
  
  if (!isOnline) {
    console.log('📡 Offline - using local data');
    return;
  }

  console.log('⬇️ Syncing data from Firestore...');

  try {
    // Sync tasks
    const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
    const tasksSnapshot = await getDocs(tasksQuery);
    const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    await saveTasksLocally(tasks);
    console.log(`✅ Synced ${tasks.length} tasks from Firestore`);

    // Sync notes
    const notesQuery = query(collection(db, 'notes'), where('userId', '==', userId));
    const notesSnapshot = await getDocs(notesQuery);
    const notes = notesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    await saveNotesLocally(notes);
    console.log(`✅ Synced ${notes.length} notes from Firestore`);

    // Sync subjects
    const subjectsQuery = query(collection(db, 'subjects'), where('userId', '==', userId));
    const subjectsSnapshot = await getDocs(subjectsQuery);
    const subjects = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    await saveSubjectsLocally(subjects);
    console.log(`✅ Synced ${subjects.length} subjects from Firestore`);

    await updateLastSyncTime();
    console.log('✅ Full sync from Firestore complete');
  } catch (error) {
    console.error('❌ Error syncing from Firestore:', error);
    throw error;
  }
}

/**
 * Auto-sync when coming online
 */
export async function autoSync(userId: string): Promise<void> {
  console.log('🔄 Auto-sync triggered');
  
  try {
    // First, sync pending operations to Firestore
    await processSyncQueue();
    
    // Then, sync latest data from Firestore
    await syncFromFirestore(userId);
    
    console.log('✅ Auto-sync complete');
  } catch (error) {
    console.error('❌ Auto-sync failed:', error);
  }
}
