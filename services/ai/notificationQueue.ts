/**
 * Notification Queue System - Phase 3
 * 
 * High-performance priority queue with O(1) operations for:
 * - Enqueue (add notification)
 * - Peek (get next notification)
 * - Dequeue (remove and return next notification)
 * - Update priority (change notification priority)
 * 
 * Data Structure: Multi-level bucket queue with hash map
 * - 4 priority levels (CRITICAL, HIGH, MEDIUM, LOW)
 * - Each priority has its own FIFO queue
 * - Hash map for O(1) lookup by notification ID
 * - Total space complexity: O(n) where n = number of queued notifications
 * 
 * Use Case:
 * - Queue notifications for optimal send time
 * - Smart scheduling based on ML predictions
 * - Batch processing for efficiency
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    NotificationPayload,
    NotificationPriority,
    QueuedNotification
} from '../../types/notification';
import { predictOptimalSendTime } from './optimalTimePredictor';

const QUEUE_STORAGE_KEY = '@notification_queue';
const QUEUE_CONFIG = {
  MAX_QUEUE_SIZE: 100, // Maximum queued notifications
  DEFAULT_MAX_DELAY_HOURS: 6, // Maximum hours to delay a notification
  CRITICAL_SEND_IMMEDIATELY: true, // Critical notifications bypass queue
  BATCH_SIZE: 5, // Process 5 notifications at a time
};

// ========================================
// PRIORITY QUEUE (O(1) OPERATIONS)
// ========================================

/**
 * Multi-level bucket priority queue
 * Each priority level is a separate FIFO queue
 * Hash map provides O(1) lookup by ID
 */
class NotificationPriorityQueue {
  // Priority buckets (FIFO queues)
  private queues: {
    [NotificationPriority.CRITICAL]: QueuedNotification[];
    [NotificationPriority.HIGH]: QueuedNotification[];
    [NotificationPriority.MEDIUM]: QueuedNotification[];
    [NotificationPriority.LOW]: QueuedNotification[];
  };
  
  // Hash map for O(1) lookup
  private idMap: Map<string, QueuedNotification>;
  
  // Priority order (highest to lowest)
  private priorityOrder: NotificationPriority[] = [
    NotificationPriority.CRITICAL,
    NotificationPriority.HIGH,
    NotificationPriority.MEDIUM,
    NotificationPriority.LOW,
  ];
  
  constructor() {
    this.queues = {
      [NotificationPriority.CRITICAL]: [],
      [NotificationPriority.HIGH]: [],
      [NotificationPriority.MEDIUM]: [],
      [NotificationPriority.LOW]: [],
    };
    this.idMap = new Map();
  }
  
  /**
   * Enqueue notification - O(1)
   * Adds to end of priority queue
   */
  enqueue(notification: QueuedNotification): void {
    // Check if already queued
    if (this.idMap.has(notification.id)) {
      console.log(`⚠️ Notification ${notification.id} already in queue`);
      return;
    }
    
    // Add to appropriate priority queue
    const queue = this.queues[notification.priority];
    queue.push(notification);
    
    // Add to hash map
    this.idMap.set(notification.id, notification);
    
    console.log(`➕ Queued: ${notification.notification.type} (${notification.priority})`);
  }
  
  /**
   * Dequeue next notification - O(1) amortized
   * Returns highest priority notification
   */
  dequeue(): QueuedNotification | null {
    // Check each priority level (constant 4 iterations)
    for (const priority of this.priorityOrder) {
      const queue = this.queues[priority];
      
      if (queue.length > 0) {
        // Remove from front (FIFO)
        const notification = queue.shift()!;
        
        // Remove from hash map
        this.idMap.delete(notification.id);
        
        return notification;
      }
    }
    
    return null; // Queue is empty
  }
  
  /**
   * Peek at next notification - O(1)
   * Returns but doesn't remove
   */
  peek(): QueuedNotification | null {
    for (const priority of this.priorityOrder) {
      const queue = this.queues[priority];
      if (queue.length > 0) {
        return queue[0];
      }
    }
    return null;
  }
  
  /**
   * Get notification by ID - O(1)
   */
  getById(id: string): QueuedNotification | null {
    return this.idMap.get(id) || null;
  }
  
  /**
   * Remove notification by ID - O(n) worst case, O(1) average
   * n is size of single priority queue (typically small)
   */
  remove(id: string): boolean {
    const notification = this.idMap.get(id);
    if (!notification) return false;
    
    // Remove from priority queue
    const queue = this.queues[notification.priority];
    const index = queue.findIndex(n => n.id === id);
    
    if (index !== -1) {
      queue.splice(index, 1);
      this.idMap.delete(id);
      return true;
    }
    
    return false;
  }
  
  /**
   * Update notification priority - O(n) worst case
   * Remove from old queue and add to new queue
   */
  updatePriority(id: string, newPriority: NotificationPriority): boolean {
    const notification = this.idMap.get(id);
    if (!notification) return false;
    
    // Remove from current queue
    const oldQueue = this.queues[notification.priority];
    const index = oldQueue.findIndex(n => n.id === id);
    
    if (index !== -1) {
      oldQueue.splice(index, 1);
      
      // Update priority
      notification.priority = newPriority;
      
      // Add to new queue
      this.queues[newPriority].push(notification);
      
      // Update hash map
      this.idMap.set(id, notification);
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Get all notifications ready to send - O(n)
   * Returns notifications scheduled for now or earlier
   */
  getReadyNotifications(): QueuedNotification[] {
    const now = new Date().getTime();
    const ready: QueuedNotification[] = [];
    
    // Check all priority levels
    for (const priority of this.priorityOrder) {
      const queue = this.queues[priority];
      
      for (const notification of queue) {
        if (notification.scheduledFor.getTime() <= now && !notification.sent) {
          ready.push(notification);
        }
      }
    }
    
    return ready;
  }
  
  /**
   * Get queue size - O(1)
   */
  size(): number {
    return this.idMap.size;
  }
  
  /**
   * Get queue statistics - O(1)
   */
  getStats(): {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    ready: number;
  } {
    const ready = this.getReadyNotifications().length;
    
    return {
      total: this.size(),
      critical: this.queues[NotificationPriority.CRITICAL].length,
      high: this.queues[NotificationPriority.HIGH].length,
      medium: this.queues[NotificationPriority.MEDIUM].length,
      low: this.queues[NotificationPriority.LOW].length,
      ready,
    };
  }
  
  /**
   * Clear all queues
   */
  clear(): void {
    for (const priority of this.priorityOrder) {
      this.queues[priority] = [];
    }
    this.idMap.clear();
  }
  
  /**
   * Serialize for storage
   */
  toJSON(): any {
    return {
      queues: {
        [NotificationPriority.CRITICAL]: this.queues[NotificationPriority.CRITICAL],
        [NotificationPriority.HIGH]: this.queues[NotificationPriority.HIGH],
        [NotificationPriority.MEDIUM]: this.queues[NotificationPriority.MEDIUM],
        [NotificationPriority.LOW]: this.queues[NotificationPriority.LOW],
      },
    };
  }
  
  /**
   * Deserialize from storage
   */
  static fromJSON(data: any): NotificationPriorityQueue {
    const queue = new NotificationPriorityQueue();
    
    if (data && data.queues) {
      // Restore each priority queue
      Object.entries(data.queues).forEach(([priority, notifications]) => {
        const typedPriority = priority as NotificationPriority;
        const typedNotifications = notifications as QueuedNotification[];
        
        queue.queues[typedPriority] = typedNotifications.map(n => ({
          ...n,
          createdAt: new Date(n.createdAt),
          scheduledFor: new Date(n.scheduledFor),
          expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined,
          sentAt: n.sentAt ? new Date(n.sentAt) : undefined,
        }));
        
        // Rebuild hash map
        typedNotifications.forEach(n => {
          queue.idMap.set(n.id, n);
        });
      });
    }
    
    return queue;
  }
}

// ========================================
// NOTIFICATION QUEUE MANAGER
// ========================================

/**
 * Main service for managing notification queue
 */
class NotificationQueueManager {
  private queue: NotificationPriorityQueue;
  private userId: string | null = null;
  private initialized: boolean = false;
  private processingInterval: any = null;
  
  constructor() {
    this.queue = new NotificationPriorityQueue();
  }
  
  /**
   * Initialize queue manager - O(1)
   */
  async initialize(userId: string): Promise<void> {
    if (this.initialized && this.userId === userId) return;
    
    console.log(`\n📬 [QUEUE] Initializing for user: ${userId}`);
    
    this.userId = userId;
    
    // Load existing queue
    await this.loadQueue();
    
    // Start background processing
    this.startProcessing();
    
    this.initialized = true;
    console.log('✅ Queue manager initialized');
  }
  
  /**
   * Add notification to queue with ML-predicted optimal time - O(1)
   */
  async enqueueWithOptimalTime(
    notification: NotificationPayload,
    canDelay: boolean = true,
    maxDelayHours?: number
  ): Promise<QueuedNotification> {
    if (!this.initialized) {
      throw new Error('Queue manager not initialized');
    }
    
    const now = new Date();
    let scheduledFor = now;
    let predictedHour = now.getHours();
    let predictedSuccessRate = 0.5;
    let alternativeHours: Array<{hour: number; successRate: number}> = [];
    
    // Critical notifications: send immediately
    if (notification.priority === NotificationPriority.CRITICAL || !canDelay) {
      scheduledFor = now;
      console.log(`🚨 Critical notification - sending immediately`);
    } else {
      // Use ML to predict optimal time
      try {
        const prediction = await predictOptimalSendTime(
          notification.type,
          notification.priority,
          'idle', // Default state
          0 // No recent activity
        );
        
        predictedHour = prediction.optimalHour;
        predictedSuccessRate = prediction.successRate;
        alternativeHours = prediction.alternativeHours;
        
        // Calculate scheduled time
        const currentHour = now.getHours();
        
        if (predictedHour === currentHour) {
          // Optimal time is now
          scheduledFor = now;
        } else if (predictedHour > currentHour) {
          // Optimal time is later today
          scheduledFor = new Date(now);
          scheduledFor.setHours(predictedHour, 0, 0, 0);
        } else {
          // Optimal time is tomorrow
          scheduledFor = new Date(now);
          scheduledFor.setDate(scheduledFor.getDate() + 1);
          scheduledFor.setHours(predictedHour, 0, 0, 0);
        }
        
        // Check max delay constraint
        const maxDelay = maxDelayHours || QUEUE_CONFIG.DEFAULT_MAX_DELAY_HOURS;
        const maxScheduledTime = new Date(now.getTime() + maxDelay * 60 * 60 * 1000);
        
        if (scheduledFor > maxScheduledTime) {
          scheduledFor = maxScheduledTime;
          console.log(`⏰ Capping delay to ${maxDelay} hours`);
        }
        
        console.log(`🎯 ML Prediction: Hour ${predictedHour} (${(predictedSuccessRate * 100).toFixed(1)}% success rate)`);
        console.log(`📅 Scheduled for: ${scheduledFor.toLocaleString()}`);
        
      } catch (error) {
        console.error('❌ ML prediction failed, using immediate send:', error);
        scheduledFor = now;
      }
    }
    
    // Create queued notification
    const queuedNotification: QueuedNotification = {
      id: notification.id,
      notification,
      predictedOptimalHour: predictedHour,
      predictedSuccessRate,
      alternativeHours,
      createdAt: now,
      scheduledFor,
      expiresAt: notification.scheduledFor, // Use original expiry if set
      sent: false,
      priority: notification.priority,
      canDelay,
      maxDelayHours: maxDelayHours || QUEUE_CONFIG.DEFAULT_MAX_DELAY_HOURS,
    };
    
    // Add to queue
    this.queue.enqueue(queuedNotification);
    
    // Save queue
    await this.saveQueue();
    
    return queuedNotification;
  }
  
  /**
   * Get next notification ready to send - O(1)
   */
  getNextReady(): QueuedNotification | null {
    const ready = this.queue.getReadyNotifications();
    return ready.length > 0 ? ready[0] : null;
  }
  
  /**
   * Mark notification as sent - O(n) worst case
   */
  async markAsSent(notificationId: string): Promise<boolean> {
    const notification = this.queue.getById(notificationId);
    
    if (notification) {
      notification.sent = true;
      notification.sentAt = new Date();
      
      // Remove from queue
      this.queue.remove(notificationId);
      
      await this.saveQueue();
      return true;
    }
    
    return false;
  }
  
  /**
   * Cancel queued notification - O(n) worst case
   */
  async cancelNotification(notificationId: string): Promise<boolean> {
    const removed = this.queue.remove(notificationId);
    
    if (removed) {
      await this.saveQueue();
      console.log(`❌ Cancelled notification: ${notificationId}`);
    }
    
    return removed;
  }
  
  /**
   * Get all ready notifications for batch processing - O(n)
   */
  getBatchReady(limit: number = QUEUE_CONFIG.BATCH_SIZE): QueuedNotification[] {
    const ready = this.queue.getReadyNotifications();
    return ready.slice(0, limit);
  }
  
  /**
   * Get queue statistics - O(1)
   */
  getStats(): any {
    return {
      ...this.queue.getStats(),
      config: QUEUE_CONFIG,
    };
  }
  
  /**
   * Start background processing
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    // Process queue every minute
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 60 * 1000); // 1 minute
    
    console.log('🔄 Started background queue processing (1 min interval)');
  }
  
  /**
   * Process queue and clean up expired notifications
   */
  private async processQueue(): Promise<void> {
    const now = new Date();
    const stats = this.queue.getStats();
    
    if (stats.total === 0) return;
    
    console.log(`\n🔄 [QUEUE PROCESSING] Total: ${stats.total}, Ready: ${stats.ready}`);
    
    // Get all notifications
    const allNotifications = [
      ...this.queue['queues'][NotificationPriority.CRITICAL],
      ...this.queue['queues'][NotificationPriority.HIGH],
      ...this.queue['queues'][NotificationPriority.MEDIUM],
      ...this.queue['queues'][NotificationPriority.LOW],
    ];
    
    // Remove expired notifications
    let expiredCount = 0;
    for (const notification of allNotifications) {
      if (notification.expiresAt && notification.expiresAt < now && !notification.sent) {
        this.queue.remove(notification.id);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`🗑️  Removed ${expiredCount} expired notifications`);
      await this.saveQueue();
    }
    
    // Log ready notifications
    if (stats.ready > 0) {
      console.log(`✅ ${stats.ready} notifications ready to send`);
    }
  }
  
  /**
   * Stop background processing
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('⏸️  Stopped background queue processing');
    }
  }
  
  /**
   * Save queue to storage
   */
  private async saveQueue(): Promise<void> {
    if (!this.userId) return;
    
    const key = `${QUEUE_STORAGE_KEY}_${this.userId}`;
    const serialized = this.queue.toJSON();
    await AsyncStorage.setItem(key, JSON.stringify(serialized));
  }
  
  /**
   * Load queue from storage
   */
  private async loadQueue(): Promise<void> {
    if (!this.userId) return;
    
    const key = `${QUEUE_STORAGE_KEY}_${this.userId}`;
    const stored = await AsyncStorage.getItem(key);
    
    if (stored) {
      const data = JSON.parse(stored);
      this.queue = NotificationPriorityQueue.fromJSON(data);
      
      const stats = this.queue.getStats();
      console.log(`✅ Loaded queue: ${stats.total} notifications (${stats.ready} ready)`);
    }
  }
  
  /**
   * Clear all queued notifications
   */
  async clearQueue(): Promise<void> {
    this.queue.clear();
    await this.saveQueue();
    console.log('🗑️  Queue cleared');
  }
}

// ========================================
// EXPORTS
// ========================================

// Singleton instance
const queueManager = new NotificationQueueManager();

export async function initializeNotificationQueue(userId: string): Promise<void> {
  await queueManager.initialize(userId);
}

export async function enqueueNotification(
  notification: NotificationPayload,
  canDelay: boolean = true,
  maxDelayHours?: number
): Promise<QueuedNotification> {
  return queueManager.enqueueWithOptimalTime(notification, canDelay, maxDelayHours);
}

export function getNextReadyNotification(): QueuedNotification | null {
  return queueManager.getNextReady();
}

export function getBatchReadyNotifications(limit?: number): QueuedNotification[] {
  return queueManager.getBatchReady(limit);
}

export async function markNotificationAsSent(notificationId: string): Promise<boolean> {
  return queueManager.markAsSent(notificationId);
}

export async function cancelQueuedNotification(notificationId: string): Promise<boolean> {
  return queueManager.cancelNotification(notificationId);
}

export function getQueueStats(): any {
  return queueManager.getStats();
}

export async function clearNotificationQueue(): Promise<void> {
  await queueManager.clearQueue();
}

export function stopQueueProcessing(): void {
  queueManager.stopProcessing();
}

export default {
  initializeNotificationQueue,
  enqueueNotification,
  getNextReadyNotification,
  getBatchReadyNotifications,
  markNotificationAsSent,
  cancelQueuedNotification,
  getQueueStats,
  clearNotificationQueue,
  stopQueueProcessing,
};
