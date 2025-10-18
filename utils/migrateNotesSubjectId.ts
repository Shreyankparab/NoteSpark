/**
 * Migration utility to add subjectId to existing notes
 * Run this once to fix notes that were created before the subjectId feature
 */

import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export async function migrateNotesWithSubjectId(userId: string): Promise<{
  total: number;
  updated: number;
  failed: number;
}> {
  console.log('🔄 Starting migration: Adding subjectId to existing notes...');
  
  let total = 0;
  let updated = 0;
  let failed = 0;

  try {
    // Get all notes for this user
    const notesQuery = query(
      collection(db, 'notes'),
      where('userId', '==', userId)
    );
    
    const notesSnapshot = await getDocs(notesQuery);
    total = notesSnapshot.size;
    
    console.log(`📝 Found ${total} notes to check`);

    // Get all tasks for this user to match by title
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', userId)
    );
    
    const tasksSnapshot = await getDocs(tasksQuery);
    const tasksMap = new Map();
    
    tasksSnapshot.forEach((taskDoc) => {
      const taskData = taskDoc.data();
      tasksMap.set(taskData.title, {
        id: taskDoc.id,
        subjectId: taskData.subjectId,
        title: taskData.title
      });
    });
    
    console.log(`📋 Found ${tasksMap.size} tasks with potential subjects`);

    // Process each note
    for (const noteDoc of notesSnapshot.docs) {
      const noteData = noteDoc.data();
      const noteId = noteDoc.id;
      
      // Skip if note already has subjectId
      if (noteData.subjectId) {
        console.log(`✅ Note "${noteData.taskTitle}" already has subjectId`);
        continue;
      }

      // Try to find matching task by title
      const taskTitle = noteData.taskTitle;
      const matchingTask = tasksMap.get(taskTitle);

      if (matchingTask && matchingTask.subjectId) {
        try {
          // Update note with subjectId from task
          const noteRef = doc(db, 'notes', noteId);
          await updateDoc(noteRef, {
            subjectId: matchingTask.subjectId
          });
          
          console.log(`✅ Updated note "${taskTitle}" with subjectId: ${matchingTask.subjectId}`);
          updated++;
        } catch (error) {
          console.error(`❌ Failed to update note "${taskTitle}":`, error);
          failed++;
        }
      } else {
        console.log(`⚠️  No matching task with subject found for note "${taskTitle}"`);
      }
    }

    console.log('🎉 Migration complete!');
    console.log(`   Total notes: ${total}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Skipped: ${total - updated - failed}`);

    return { total, updated, failed };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Alternative: Update a specific note's subjectId manually
 */
export async function updateNoteSubjectId(
  noteId: string,
  subjectId: string
): Promise<void> {
  try {
    const noteRef = doc(db, 'notes', noteId);
    await updateDoc(noteRef, { subjectId });
    console.log(`✅ Updated note ${noteId} with subjectId: ${subjectId}`);
  } catch (error) {
    console.error(`❌ Failed to update note ${noteId}:`, error);
    throw error;
  }
}

/**
 * Get notes without subjectId for a user
 */
export async function getNotesWithoutSubjectId(userId: string): Promise<Array<{
  id: string;
  taskTitle: string;
  completedAt: number;
  [key: string]: any;
}>> {
  const notesQuery = query(
    collection(db, 'notes'),
    where('userId', '==', userId)
  );
  
  const snapshot = await getDocs(notesQuery);
  const notesWithoutSubject: Array<{
    id: string;
    taskTitle: string;
    completedAt: number;
    [key: string]: any;
  }> = [];
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.subjectId) {
      notesWithoutSubject.push({
        id: doc.id,
        taskTitle: data.taskTitle,
        completedAt: data.completedAt,
        ...data
      });
    }
  });
  
  return notesWithoutSubject;
}
