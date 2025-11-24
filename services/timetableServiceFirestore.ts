import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseint';
import { TimetableEntry } from '../types';

const COLLECTION_NAME = 'timetable';

/**
 * Get all timetable entries for a user
 */
export const getTimetableEntries = async (userId: string): Promise<TimetableEntry[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const entries: TimetableEntry[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      entries.push({
        id: doc.id,
        userId: data.userId,
        courseId: data.courseId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        type: data.type,
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    });

    return entries;
  } catch (error) {
    console.error('Error getting timetable entries:', error);
    throw error;
  }
};

/**
 * Create a new timetable entry
 */
export const createTimetableEntry = async (
  entry: Omit<TimetableEntry, 'id' | 'createdAt'>
): Promise<string> => {
  try {
    // Remove undefined fields before saving to Firestore
    const cleanEntry: any = {
      userId: entry.userId,
      courseId: entry.courseId,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      createdAt: new Date(),
    };
    
    // Only add optional fields if they have values
    if (entry.location) cleanEntry.location = entry.location;
    if (entry.type) cleanEntry.type = entry.type;

    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanEntry);
    return docRef.id;
  } catch (error) {
    console.error('Error creating timetable entry:', error);
    throw error;
  }
};

/**
 * Update an existing timetable entry
 */
export const updateTimetableEntry = async (
  entryId: string,
  updates: Partial<Omit<TimetableEntry, 'id' | 'userId' | 'createdAt'>>
): Promise<void> => {
  try {
    // Remove undefined fields before updating
    const cleanUpdates: any = {};
    if (updates.courseId !== undefined) cleanUpdates.courseId = updates.courseId;
    if (updates.dayOfWeek !== undefined) cleanUpdates.dayOfWeek = updates.dayOfWeek;
    if (updates.startTime !== undefined) cleanUpdates.startTime = updates.startTime;
    if (updates.endTime !== undefined) cleanUpdates.endTime = updates.endTime;
    if (updates.location !== undefined) cleanUpdates.location = updates.location;
    if (updates.type !== undefined) cleanUpdates.type = updates.type;

    const docRef = doc(db, COLLECTION_NAME, entryId);
    await updateDoc(docRef, cleanUpdates);
  } catch (error) {
    console.error('Error updating timetable entry:', error);
    throw error;
  }
};

/**
 * Delete a timetable entry
 */
export const deleteTimetableEntry = async (entryId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, entryId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting timetable entry:', error);
    throw error;
  }
};
