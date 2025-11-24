import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseint';
import { Course } from '../types';

const COURSES_COLLECTION = 'courses';
const CACHE_TTL = 30000; // 30 seconds cache
const MAX_CACHE_SIZE = 50;

// ✅ In-memory LRU cache to prevent race conditions
const courseCache = new Map<string, { data: Course[]; timestamp: number }>();

function getCachedCourses(userId: string): Course[] | null {
  const cached = courseCache.get(`courses_${userId}`);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    courseCache.delete(`courses_${userId}`);
    return null;
  }
  
  return cached.data;
}

function setCachedCourses(userId: string, courses: Course[]) {
  // LRU eviction
  if (courseCache.size >= MAX_CACHE_SIZE) {
    const firstKey = courseCache.keys().next().value;
    if (firstKey) courseCache.delete(firstKey);
  }
  
  courseCache.set(`courses_${userId}`, { data: courses, timestamp: Date.now() });
}

export function clearCourseCache(userId?: string) {
  if (userId) {
    courseCache.delete(`courses_${userId}`);
  } else {
    courseCache.clear();
  }
}

/**
 * Create a new course in Firestore
 */
export const createCourse = async (
  course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Course> => {
  const courseRef = doc(collection(db, COURSES_COLLECTION));
  const now = Timestamp.now();

  const newCourse: Course = {
    ...course,
    id: courseRef.id,
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
  };

  await setDoc(courseRef, {
    userId: newCourse.userId,
    code: newCourse.code,
    name: newCourse.name,
    credits: newCourse.credits || null,
    instructor: newCourse.instructor || null,
    color: newCourse.color || null,
    difficulty: newCourse.difficulty || null,
    createdAt: now,
    updatedAt: now,
  });

  // ✅ Clear cache so next fetch gets fresh data
  clearCourseCache(course.userId);
  console.log('[CourseService] Cache cleared after creating course:', newCourse.name);

  return newCourse;
};

/**
 * ✅ PERFORMANCE: Helper to fetch and cache courses
 */
async function fetchAndCacheCourses(userId: string): Promise<Course[]> {
  console.log('[CourseService] Fetching courses from Firestore for user:', userId);
  
  const q = query(
    collection(db, COURSES_COLLECTION),
    where('userId', '==', userId),
    orderBy('name', 'asc')
  );

  const querySnapshot = await getDocs(q);
  const courses: Course[] = [];

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    courses.push({
      id: docSnap.id,
      userId: data.userId,
      code: data.code,
      name: data.name,
      credits: data.credits,
      instructor: data.instructor,
      color: data.color,
      difficulty: data.difficulty as 1 | 2 | 3 | 4 | 5 | undefined,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    });
  });

  // Cache the results
  setCachedCourses(userId, courses);
  console.log('[CourseService] Cached', courses.length, 'courses');

  return courses;
}

/**
 * ✅ PERFORMANCE OPTIMIZED: Get all courses with stale-while-revalidate
 * Returns cached data immediately while fetching fresh data in background
 */
export const getCourses = async (userId: string, useCache: boolean = true): Promise<Course[]> => {
  if (useCache) {
    const cached = getCachedCourses(userId);
    
    if (cached) {
      console.log('[CourseService] ✅ Cache HIT - Returning', cached.length, 'cached courses');
      console.log('[CourseService] 🔄 Revalidating in background...');
      
      // ✅ STALE-WHILE-REVALIDATE: Return stale data immediately
      setTimeout(() => {
        fetchAndCacheCourses(userId).catch(err => {
          console.warn('[CourseService] Background revalidation failed:', err);
        });
      }, 0);
      
      return cached;
    }
    
    console.log('[CourseService] ❌ Cache MISS - Fetching from Firestore');
  }
  
  // No cache - fetch fresh data
  return fetchAndCacheCourses(userId);
};

/**
 * Get course by ID
 */
export const getCourseById = async (id: string): Promise<Course | null> => {
  const courseDoc = await getDoc(doc(db, COURSES_COLLECTION, id));

  if (!courseDoc.exists()) {
    return null;
  }

  const data = courseDoc.data();
  return {
    id: courseDoc.id,
    userId: data.userId,
    code: data.code,
    name: data.name,
    credits: data.credits,
    instructor: data.instructor,
    color: data.color,
    difficulty: data.difficulty as 1 | 2 | 3 | 4 | 5 | undefined,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  };
};

/**
 * Update course
 */
export const updateCourse = async (
  id: string,
  updates: Partial<Course>
): Promise<void> => {
  const courseRef = doc(db, COURSES_COLLECTION, id);
  const updateData: any = {
    ...updates,
    updatedAt: Timestamp.now(),
  };

  delete updateData.id;
  delete updateData.createdAt;

  await updateDoc(courseRef, updateData);
  
  // ✅ Clear cache for this user
  if (updates.userId) {
    clearCourseCache(updates.userId);
    console.log('[CourseService] Cache cleared after updating course:', id);
  }
};

/**
 * Delete course
 */
export const deleteCourse = async (id: string, userId?: string): Promise<void> => {
  await deleteDoc(doc(db, COURSES_COLLECTION, id));
  
  // ✅ Clear cache after deletion
  if (userId) {
    clearCourseCache(userId);
    console.log('[CourseService] Cache cleared after deleting course:', id);
  } else {
    // Clear all cache if userId not provided
    clearCourseCache();
  }
};

/**
 * Get course statistics
 */
export const getCourseStats = async (
  courseId: string
): Promise<{
  totalTasks: number;
  completedTasks: number;
  totalStudyHours: number;
  averageEffectiveness: number;
}> => {
  // Get tasks for this course
  const tasksQuery = query(
    collection(db, 'tasks'),
    where('courseId', '==', courseId)
  );
  const tasksSnapshot = await getDocs(tasksQuery);

  let totalTasks = 0;
  let completedTasks = 0;

  tasksSnapshot.forEach((doc) => {
    totalTasks++;
    if (doc.data().status === 'completed') {
      completedTasks++;
    }
  });

  // Get study sessions for this course
  const sessionsQuery = query(
    collection(db, 'study_sessions'),
    where('courseId', '==', courseId)
  );
  const sessionsSnapshot = await getDocs(sessionsQuery);

  let totalMinutes = 0;
  let totalEffectiveness = 0;
  let effectivenessCount = 0;

  sessionsSnapshot.forEach((doc) => {
    const data = doc.data();
    totalMinutes += data.duration || 0;
    if (data.effectiveness) {
      totalEffectiveness += data.effectiveness;
      effectivenessCount++;
    }
  });

  return {
    totalTasks,
    completedTasks,
    totalStudyHours: totalMinutes / 60,
    averageEffectiveness:
      effectivenessCount > 0 ? totalEffectiveness / effectivenessCount : 0,
  };
};

export default {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getCourseStats,
};
