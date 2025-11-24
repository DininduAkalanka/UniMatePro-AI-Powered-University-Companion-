/**
 * Rate Limiting Utility
 * Implements client-side and server-side rate limiting
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseint';

const RATE_LIMIT_PREFIX = '@rate_limit_';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Client-side rate limiter using AsyncStorage
 */
export class ClientRateLimiter {
  private config: RateLimitConfig;
  
  constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      keyPrefix: config.keyPrefix || 'default',
    };
  }
  
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = `${RATE_LIMIT_PREFIX}${this.config.keyPrefix}_${identifier}`;
    const now = Date.now();
    
    try {
      const storedData = await AsyncStorage.getItem(key);
      
      if (!storedData) {
        // First request
        await this.recordRequest(key, now);
        return {
          allowed: true,
          remainingRequests: this.config.maxRequests - 1,
          resetTime: now + this.config.windowMs,
        };
      }
      
      const { count, windowStart } = JSON.parse(storedData);
      
      // Check if window has expired
      if (now - windowStart >= this.config.windowMs) {
        // Reset window
        await this.recordRequest(key, now);
        return {
          allowed: true,
          remainingRequests: this.config.maxRequests - 1,
          resetTime: now + this.config.windowMs,
        };
      }
      
      // Check if limit exceeded
      if (count >= this.config.maxRequests) {
        const resetTime = windowStart + this.config.windowMs;
        return {
          allowed: false,
          remainingRequests: 0,
          resetTime,
          retryAfter: Math.ceil((resetTime - now) / 1000),
        };
      }
      
      // Increment count
      await AsyncStorage.setItem(
        key,
        JSON.stringify({
          count: count + 1,
          windowStart,
        })
      );
      
      return {
        allowed: true,
        remainingRequests: this.config.maxRequests - count - 1,
        resetTime: windowStart + this.config.windowMs,
      };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // On error, allow the request
      return {
        allowed: true,
        remainingRequests: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
      };
    }
  }
  
  private async recordRequest(key: string, timestamp: number): Promise<void> {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({
        count: 1,
        windowStart: timestamp,
      })
    );
  }
  
  async reset(identifier: string): Promise<void> {
    const key = `${RATE_LIMIT_PREFIX}${this.config.keyPrefix}_${identifier}`;
    await AsyncStorage.removeItem(key);
  }
}

/**
 * Firestore-based rate limiter for server-side validation
 */
export class FirestoreRateLimiter {
  private config: RateLimitConfig;
  
  constructor(config: RateLimitConfig) {
    this.config = config;
  }
  
  async checkLimit(userId: string, action: string): Promise<RateLimitResult> {
    const rateLimitRef = doc(db, `users/${userId}/rateLimits`, action);
    const now = Date.now();
    
    try {
      const rateLimitDoc = await getDoc(rateLimitRef);
      
      if (!rateLimitDoc.exists()) {
        // First request
        await setDoc(rateLimitRef, {
          count: 1,
          windowStart: Timestamp.now(),
          lastRequest: Timestamp.now(),
        });
        
        return {
          allowed: true,
          remainingRequests: this.config.maxRequests - 1,
          resetTime: now + this.config.windowMs,
        };
      }
      
      const data = rateLimitDoc.data();
      const windowStart = data.windowStart.toMillis();
      const count = data.count;
      
      // Check if window has expired
      if (now - windowStart >= this.config.windowMs) {
        // Reset window
        await setDoc(rateLimitRef, {
          count: 1,
          windowStart: Timestamp.now(),
          lastRequest: Timestamp.now(),
        });
        
        return {
          allowed: true,
          remainingRequests: this.config.maxRequests - 1,
          resetTime: now + this.config.windowMs,
        };
      }
      
      // Check if limit exceeded
      if (count >= this.config.maxRequests) {
        const resetTime = windowStart + this.config.windowMs;
        return {
          allowed: false,
          remainingRequests: 0,
          resetTime,
          retryAfter: Math.ceil((resetTime - now) / 1000),
        };
      }
      
      // Increment count
      await setDoc(rateLimitRef, {
        count: count + 1,
        windowStart: Timestamp.fromMillis(windowStart),
        lastRequest: Timestamp.now(),
      });
      
      return {
        allowed: true,
        remainingRequests: this.config.maxRequests - count - 1,
        resetTime: windowStart + this.config.windowMs,
      };
    } catch (error) {
      console.error('Firestore rate limiter error:', error);
      // On error, allow the request but log it
      return {
        allowed: true,
        remainingRequests: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
      };
    }
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */

// AI Chat messages - 30 per minute
export const chatRateLimiter = new ClientRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000,
  keyPrefix: 'chat',
});

// API requests - 100 per minute
export const apiRateLimiter = new ClientRateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000,
  keyPrefix: 'api',
});

// Task creation - 50 per hour
export const taskCreationRateLimiter = new ClientRateLimiter({
  maxRequests: 50,
  windowMs: 60 * 60 * 1000,
  keyPrefix: 'task_create',
});

// Course creation - 20 per hour
export const courseCreationRateLimiter = new ClientRateLimiter({
  maxRequests: 20,
  windowMs: 60 * 60 * 1000,
  keyPrefix: 'course_create',
});

// Auth attempts - 5 per 15 minutes
export const authRateLimiter = new ClientRateLimiter({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
  keyPrefix: 'auth',
});

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
  public retryAfter: number;
  public resetTime: number;
  
  constructor(message: string, retryAfter: number, resetTime: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.resetTime = resetTime;
  }
}

/**
 * Higher-order function to add rate limiting to any async function
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  limiter: ClientRateLimiter,
  identifier: string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const result = await limiter.checkLimit(identifier);
    
    if (!result.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
        result.retryAfter!,
        result.resetTime
      );
    }
    
    return fn(...args);
  }) as T;
}
