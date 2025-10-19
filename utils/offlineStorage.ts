/**
 * Offline Storage Manager
 * Handles local data storage and sync queue for offline functionality
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const KEYS = {
  TASKS: 'offline_tasks',
  NOTES: 'offline_notes',
  SUBJECTS: 'offline_subjects',
  SYNC_QUEUE: 'sync_queue',
  LAST_SYNC: 'last_sync_time',
};

// Types
export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: 'tasks' | 'notes' | 'subjects';
  data: any;
  timestamp: number;
  retryCount: number;
}

/**
 * Save data locally
 */
export async function saveLocalData(key: string, data: any): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
    console.log(`💾 Saved ${key} locally`);
  } catch (error) {
    console.error(`❌ Error saving ${key} locally:`, error);
    throw error;
  }
}

/**
 * Get data from local storage
 */
export async function getLocalData<T>(key: string): Promise<T | null> {
  try {
    const data = await AsyncStorage.getItem(key);
    if (data) {
      return JSON.parse(data) as T;
    }
    return null;
  } catch (error) {
    console.error(`❌ Error getting ${key} from local storage:`, error);
    return null;
  }
}

/**
 * Save tasks locally
 */
export async function saveTasksLocally(tasks: any[]): Promise<void> {
  await saveLocalData(KEYS.TASKS, tasks);
}

/**
 * Get tasks from local storage
 */
export async function getLocalTasks(): Promise<any[]> {
  const tasks = await getLocalData<any[]>(KEYS.TASKS);
  return tasks || [];
}

/**
 * Save notes locally
 */
export async function saveNotesLocally(notes: any[]): Promise<void> {
  await saveLocalData(KEYS.NOTES, notes);
}

/**
 * Get notes from local storage
 */
export async function getLocalNotes(): Promise<any[]> {
  const notes = await getLocalData<any[]>(KEYS.NOTES);
  return notes || [];
}

/**
 * Save subjects locally
 */
export async function saveSubjectsLocally(subjects: any[]): Promise<void> {
  await saveLocalData(KEYS.SUBJECTS, subjects);
}

/**
 * Get subjects from local storage
 */
export async function getLocalSubjects(): Promise<any[]> {
  const subjects = await getLocalData<any[]>(KEYS.SUBJECTS);
  return subjects || [];
}

/**
 * Add operation to sync queue
 */
export async function addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
  try {
    const queue = await getSyncQueue();
    const newOperation: SyncOperation = {
      ...operation,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    queue.push(newOperation);
    await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
    console.log(`📤 Added operation to sync queue:`, newOperation.type, newOperation.collection);
  } catch (error) {
    console.error('❌ Error adding to sync queue:', error);
    throw error;
  }
}

/**
 * Get sync queue
 */
export async function getSyncQueue(): Promise<SyncOperation[]> {
  const queue = await getLocalData<SyncOperation[]>(KEYS.SYNC_QUEUE);
  return queue || [];
}

/**
 * Clear sync queue
 */
export async function clearSyncQueue(): Promise<void> {
  await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify([]));
  console.log('🗑️ Sync queue cleared');
}

/**
 * Remove operation from sync queue
 */
export async function removeFromSyncQueue(operationId: string): Promise<void> {
  try {
    const queue = await getSyncQueue();
    const updatedQueue = queue.filter(op => op.id !== operationId);
    await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(updatedQueue));
    console.log(`✅ Removed operation ${operationId} from sync queue`);
  } catch (error) {
    console.error('❌ Error removing from sync queue:', error);
  }
}

/**
 * Update operation retry count
 */
export async function incrementRetryCount(operationId: string): Promise<void> {
  try {
    const queue = await getSyncQueue();
    const operation = queue.find(op => op.id === operationId);
    if (operation) {
      operation.retryCount += 1;
      await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
    }
  } catch (error) {
    console.error('❌ Error incrementing retry count:', error);
  }
}

/**
 * Get last sync time
 */
export async function getLastSyncTime(): Promise<number | null> {
  const time = await getLocalData<number>(KEYS.LAST_SYNC);
  return time;
}

/**
 * Update last sync time
 */
export async function updateLastSyncTime(): Promise<void> {
  await saveLocalData(KEYS.LAST_SYNC, Date.now());
}

/**
 * Clear all offline data
 */
export async function clearAllOfflineData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      KEYS.TASKS,
      KEYS.NOTES,
      KEYS.SUBJECTS,
      KEYS.SYNC_QUEUE,
      KEYS.LAST_SYNC,
    ]);
    console.log('🗑️ All offline data cleared');
  } catch (error) {
    console.error('❌ Error clearing offline data:', error);
  }
}

/**
 * Get sync queue size
 */
export async function getSyncQueueSize(): Promise<number> {
  const queue = await getSyncQueue();
  return queue.length;
}

/**
 * Check if there are pending syncs
 */
export async function hasPendingSyncs(): Promise<boolean> {
  const size = await getSyncQueueSize();
  return size > 0;
}
