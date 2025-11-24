/**
 * PERFORMANCE OPTIMIZATION: Custom hook for data caching and memoization
 * Prevents redundant Firestore queries and expensive computations
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Course, Task, TaskStatus } from '../types';

// In-memory cache with TTL (Time To Live)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // milliseconds
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 100; // ✅ FIXED: Maximum cache entries to prevent memory leaks

  set<T>(key: string, data: T, expiresIn: number = 60000) {
    // ✅ FIXED: Implement LRU eviction when cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        console.log('[GlobalCache] Evicted oldest entry:', firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.expiresIn;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    // ✅ LRU: Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data as T;
  }

  clear() {
    this.cache.clear();
  }

  invalidate(pattern: string) {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  // ✅ NEW: Get cache size for monitoring
  getSize(): number {
    return this.cache.size;
  }
}

export const globalCache = new DataCache();

/**
 * Hook for optimized task/course data with normalized structure
 */
export function useOptimizedData(tasks: Task[], courses: Course[]) {
  // Create lookup maps for O(1) access instead of O(n) with .find()
  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach(course => map.set(course.id, course));
    return map;
  }, [courses]);

  // Pre-calculate task stats by course (expensive operation done ONCE)
  const taskStatsByCourse = useMemo(() => {
    const stats = new Map<string, {
      total: number;
      completed: number;
      pending: number;
      overdue: number;
    }>();

    const now = Date.now();
    
    tasks.forEach(task => {
      const existing = stats.get(task.courseId) || {
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
      };

      existing.total++;
      
      if (task.status === TaskStatus.COMPLETED) {
        existing.completed++;
      } else {
        existing.pending++;
        if (task.dueDate.getTime() < now) {
          existing.overdue++;
        }
      }

      stats.set(task.courseId, existing);
    });

    return stats;
  }, [tasks]);

  // Memoized filtered lists
  const tasksByStatus = useMemo(() => {
    const now = Date.now();
    
    return {
      all: tasks,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED),
      pending: tasks.filter(t => t.status !== TaskStatus.COMPLETED),
      overdue: tasks.filter(t => 
        t.status !== TaskStatus.COMPLETED && 
        t.dueDate.getTime() < now
      ),
      upcoming: tasks
        .filter(t => t.status !== TaskStatus.COMPLETED)
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
        .slice(0, 5),
    };
  }, [tasks]);

  // Global task stats (calculated once)
  const globalStats = useMemo(() => {
    const now = Date.now();
    const nextWeek = now + (7 * 24 * 60 * 60 * 1000);

    return {
      total: tasks.length,
      completed: tasksByStatus.completed.length,
      inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      overdue: tasksByStatus.overdue.length,
      upcoming: tasks.filter(t => {
        const time = t.dueDate.getTime();
        return time >= now && time <= nextWeek && t.status !== TaskStatus.COMPLETED;
      }).length,
    };
  }, [tasks, tasksByStatus]);

  return {
    courseMap,
    taskStatsByCourse,
    tasksByStatus,
    globalStats,
  };
}

/**
 * Hook for debounced data fetching with cache
 */
export function useCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  deps: any[] = [],
  cacheTime: number = 60000
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      // Check cache first
      const cached = globalCache.get<T>(key);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await fetchFn();
        
        if (mounted && isMountedRef.current) {
          setData(result);
          globalCache.set(key, result, cacheTime);
          setError(null);
        }
      } catch (err) {
        if (mounted && isMountedRef.current) {
          setError(err as Error);
        }
      } finally {
        if (mounted && isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, deps);

  const invalidate = () => {
    globalCache.invalidate(key);
  };

  return { data, loading, error, invalidate };
}

/**
 * Hook for optimized list rendering with virtualization hints
 */
export function useListOptimization<T>(
  data: T[],
  options: {
    keyExtractor: (item: T, index: number) => string;
    windowSize?: number;
    maxToRenderPerBatch?: number;
  }
) {
  const getItemLayout = useMemo(() => {
    // Pre-calculate item positions for better scroll performance
    return (data: any, index: number) => ({
      length: options.windowSize || 10,
      offset: (options.windowSize || 10) * index,
      index,
    });
  }, [options.windowSize]);

  return {
    getItemLayout,
    removeClippedSubviews: true,
    maxToRenderPerBatch: options.maxToRenderPerBatch || 10,
    updateCellsBatchingPeriod: 50,
    windowSize: 21,
    initialNumToRender: 10,
  };
}
