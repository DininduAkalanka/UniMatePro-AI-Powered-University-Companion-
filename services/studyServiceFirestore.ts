import {
    collection,
    doc,
    getDocs,
    orderBy,
    query,
    setDoc,
    Timestamp,
    where,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseint';
import { StudySession } from '../types';

const STUDY_SESSIONS_COLLECTION = 'studySessions';

/**
 * Create a new study session
 */
export const createStudySession = async (
  session: Omit<StudySession, 'id' | 'createdAt'>
): Promise<StudySession> => {
  const sessionRef = doc(collection(db, STUDY_SESSIONS_COLLECTION));
  const now = Timestamp.now();

  const newSession: StudySession = {
    ...session,
    id: sessionRef.id,
    createdAt: now.toDate(),
  };

  await setDoc(sessionRef, {
    userId: newSession.userId,
    courseId: newSession.courseId,
    taskId: newSession.taskId || null,
    topic: newSession.topic || null,
    duration: newSession.duration,
    notes: newSession.notes || null,
    effectiveness: newSession.effectiveness || null,
    date: Timestamp.fromDate(session.date),
    createdAt: now,
  });

  return newSession;
};

/**
 * Get study sessions for a user
 */
export const getStudySessions = async (
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<StudySession[]> => {
  let q;

  if (startDate && endDate) {
    q = query(
      collection(db, STUDY_SESSIONS_COLLECTION),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
  } else {
    q = query(
      collection(db, STUDY_SESSIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
  }

  const querySnapshot = await getDocs(q);
  const sessions: StudySession[] = [];

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    sessions.push({
      id: docSnap.id,
      userId: data.userId,
      courseId: data.courseId,
      taskId: data.taskId,
      topic: data.topic,
      duration: data.duration,
      notes: data.notes,
      effectiveness: data.effectiveness as 1 | 2 | 3 | 4 | 5 | undefined,
      date: data.date.toDate(),
      createdAt: data.createdAt.toDate(),
    });
  });

  return sessions;
};

/**
 * Get study sessions by course
 */
export const getStudySessionsByCourse = async (
  courseId: string
): Promise<StudySession[]> => {
  const q = query(
    collection(db, STUDY_SESSIONS_COLLECTION),
    where('courseId', '==', courseId),
    orderBy('date', 'desc')
  );

  const querySnapshot = await getDocs(q);
  const sessions: StudySession[]  = [];

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    sessions.push({
      id: docSnap.id,
      userId: data.userId,
      courseId: data.courseId,
      taskId: data.taskId,
      topic: data.topic,
      duration: data.duration,
      notes: data.notes,
      effectiveness: data.effectiveness as 1 | 2 | 3 | 4 | 5 | undefined,
      date: data.date.toDate(),
      createdAt: data.createdAt.toDate(),
    });
  });

  return sessions;
};

/**
 * Get total study hours for a period
 */
export const getTotalStudyHours = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<number> => {
  const sessions = await getStudySessions(userId, startDate, endDate);
  const totalMinutes = sessions.reduce((sum, session) => sum + session.duration, 0);
  return totalMinutes / 60;
};

/**
 * Get study statistics
 */
export const getStudyStats = async (
  userId: string,
  days: number = 7
): Promise<{
  totalHours: number;
  totalSessions: number;
  averageSessionDuration: number;
  mostStudiedCourse: string | null;
  studyStreak: number;
}> => {
  console.log('[StudyService] getStudyStats called for userId:', userId, 'days:', days);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  console.log('[StudyService] Date range:', startDate.toISOString(), 'to', new Date().toISOString());

  const sessions = await getStudySessions(userId, startDate, new Date());
  console.log('[StudyService] Retrieved', sessions.length, 'study sessions');

  const totalMinutes = sessions.reduce((sum, session) => sum + session.duration, 0);
  const averageDuration = sessions.length > 0 ? totalMinutes / sessions.length : 0;

  // Find most studied course
  const courseMinutes: Record<string, number> = {};
  sessions.forEach((session) => {
    courseMinutes[session.courseId] = (courseMinutes[session.courseId] || 0) + session.duration;
  });

  let mostStudiedCourse: string | null = null;
  let maxMinutes = 0;
  Object.entries(courseMinutes).forEach(([courseId, minutes]) => {
    if (minutes > maxMinutes) {
      maxMinutes = minutes;
      mostStudiedCourse = courseId;
    }
  });

  // Calculate study streak
  const streak = await calculateStudyStreak(userId);

  return {
    totalHours: totalMinutes / 60,
    totalSessions: sessions.length,
    averageSessionDuration: averageDuration,
    mostStudiedCourse,
    studyStreak: streak,
  };
};

/**
 * Calculate consecutive study days (streak)
 */
const calculateStudyStreak = async (userId: string): Promise<number> => {
  const q = query(
    collection(db, STUDY_SESSIONS_COLLECTION),
    where('userId', '==', userId),
    orderBy('date', 'desc')
  );

  const querySnapshot = await getDocs(q);

  // Get unique dates
  const uniqueDates = new Set<string>();
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const date = data.date.toDate();
    uniqueDates.add(date.toISOString().split('T')[0]);
  });

  const sortedDates = Array.from(uniqueDates).sort().reverse();

  if (sortedDates.length === 0) return 0;

  let streak = 1;
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const currentDate = new Date(sortedDates[i]);
    const nextDate = new Date(sortedDates[i + 1]);

    const diffDays = Math.floor(
      (currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

/**
 * Get study hours per day for chart
 */
export const getStudyHoursPerDay = async (
  userId: string,
  days: number = 7
): Promise<{ date: string; hours: number }[]> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sessions = await getStudySessions(userId, startDate, new Date());

  // Group by date
  const dateHours: Record<string, number> = {};
  sessions.forEach((session) => {
    const dateKey = session.date.toISOString().split('T')[0];
    dateHours[dateKey] = (dateHours[dateKey] || 0) + session.duration / 60;
  });

  return Object.entries(dateHours)
    .map(([date, hours]) => ({ date, hours }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export default {
  createStudySession,
  getStudySessions,
  getStudySessionsByCourse,
  getTotalStudyHours,
  getStudyStats,
  getStudyHoursPerDay,
};
