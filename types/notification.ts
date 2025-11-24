/**
 * Notification System Types
 * Smart AI-powered notification interfaces
 */

export enum NotificationPriority {
  CRITICAL = 'critical',    // Send immediately, bypass quiet hours
  HIGH = 'high',           // Send within 1 hour
  MEDIUM = 'medium',       // Send at next scheduled check
  LOW = 'low'              // Can be batched, no urgency
}

export enum NotificationType {
  DEADLINE_ALERT = 'deadline_alert',
  OVERLOAD_WARNING = 'overload_warning',
  PRODUCTIVITY_TIP = 'productivity_tip',
  ACHIEVEMENT = 'achievement',
  BURNOUT_WARNING = 'burnout_warning',
  PEAK_TIME_REMINDER = 'peak_time_reminder',
  STUDY_REMINDER = 'study_reminder',
  BREAK_REMINDER = 'break_reminder',
  WEEKLY_SUMMARY = 'weekly_summary'
}

export interface NotificationPayload {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  timestamp: Date;
  scheduledFor?: Date;
  
  // Visual properties
  emoji?: string;
  color?: string;
  badge?: string;
  
  // Sound and haptics
  sound?: 'default' | 'urgent' | 'subtle' | 'gentle' | null;
  vibration?: number[] | null;
  
  // Action properties
  action?: 'OPEN_TASK' | 'OPEN_PLANNER' | 'OPEN_TASKS' | 'VIEW_ANALYTICS' | 'VIEW_STATS' | 'VIEW_RECOMMENDATIONS' | 'NONE';
  actionData?: {
    taskId?: string;
    courseId?: string;
    screen?: string;
    params?: Record<string, any>;
  };
  
  // Metadata
  data?: Record<string, any>;
  category?: string;
  read?: boolean;
  dismissed?: boolean;
}

export interface NotificationSettings {
  userId: string;
  enabled: boolean;
  
  // Type-specific settings
  deadlineAlerts: boolean;
  overloadWarnings: boolean;
  productivityTips: boolean;
  achievements: boolean;
  burnoutWarnings: boolean;
  peakTimeReminders: boolean;
  studyReminders: boolean;
  breakReminders: boolean;
  weeklySummary: boolean;
  
  // Timing preferences
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string;   // "07:00"
  
  // Frequency preferences
  maxNotificationsPerDay: number;
  minTimeBetweenNotifications: number; // minutes
  
  // Sound preferences
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface NotificationAnalytics {
  notificationId: string;
  type: NotificationType;
  priority: NotificationPriority;
  sentAt: Date;
  opened: boolean;
  openedAt?: Date;
  actionTaken: boolean;
  actionType?: string;
  responseTimeSeconds?: number;
  dismissed: boolean;
  dismissedAt?: Date;
  
  // ML Features for Phase 3
  hourOfDay: number; // 0-23
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  userActiveState?: 'active' | 'idle' | 'studying' | 'away'; // User state when notification sent
  deviceState?: 'unlocked' | 'locked'; // Device state when sent
  contextualData?: {
    recentActivityMinutes?: number; // Minutes since last app activity
    currentSessionActive?: boolean; // Is user in a study session?
    tasksOverdue?: number; // Number of overdue tasks
    studyStreak?: number; // Current study streak days
  };
  
  // ML Training Labels
  respondedWithinHour: boolean; // Target variable for ML
  engagementScore?: number; // 0-1 score based on response time and action
}

export interface NotificationSchedule {
  id: string;
  type: NotificationType;
  recurring: boolean;
  frequency?: 'daily' | 'weekly' | 'custom';
  time?: string; // "09:00"
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  enabled: boolean;
  lastSent?: Date;
  nextScheduled?: Date;
}

export interface RateLimitInfo {
  key: string;
  lastSent: number;
  dailyCount: number;
  dailyDate: string;
}

export interface NotificationBatch {
  id: string;
  notifications: NotificationPayload[];
  scheduledFor: Date;
  sent: boolean;
}

// ========================================
// PHASE 3: ML-POWERED FEATURES
// ========================================

/**
 * ML Model for predicting optimal notification send time
 */
export interface OptimalTimeModel {
  userId: string;
  version: string;
  trainedAt: Date;
  sampleCount: number;
  accuracy?: number;
  
  // Logistic regression coefficients (O(1) prediction)
  weights: {
    hourOfDay: number[];      // 24 coefficients (one per hour)
    dayOfWeek: number[];      // 7 coefficients (one per day)
    notificationType: number[]; // Coefficients per notification type
    userActiveState: number[]; // Coefficients per state
    recentActivity: number;    // Single coefficient for recent activity
    intercept: number;         // Bias term
  };
  
  // Hourly success rates (O(1) lookup)
  hourlySuccessMatrix: Map<number, HourlySuccessRate>; // hour -> success rate
  
  // Feature normalization parameters
  featureStats: {
    recentActivityMean: number;
    recentActivityStd: number;
  };
}

/**
 * Hourly success rate data structure (O(1) operations)
 */
export interface HourlySuccessRate {
  hour: number;
  totalSent: number;
  totalOpened: number;
  totalResponded: number;
  successRate: number; // Percentage responded within 1 hour
  avgResponseTimeSeconds: number;
  lastUpdated: Date;
}

/**
 * Notification queue item with predicted optimal time
 */
export interface QueuedNotification {
  id: string;
  notification: NotificationPayload;
  
  // ML Predictions
  predictedOptimalHour: number; // 0-23
  predictedSuccessRate: number; // 0-1
  alternativeHours?: Array<{hour: number; successRate: number}>; // Top 3 alternatives
  
  // Scheduling
  createdAt: Date;
  scheduledFor: Date;
  expiresAt?: Date; // Don't send after this time
  sent: boolean;
  sentAt?: Date;
  
  // Queue management
  priority: NotificationPriority;
  canDelay: boolean; // Can this notification be delayed for better timing?
  maxDelayHours?: number; // Maximum hours to delay
}

/**
 * ML Training data point
 */
export interface TrainingDataPoint {
  // Features (X)
  hourOfDay: number;
  dayOfWeek: number;
  notificationType: NotificationType;
  priority: NotificationPriority;
  userActiveState: 'active' | 'idle' | 'studying' | 'away';
  recentActivityMinutes: number;
  currentSessionActive: boolean;
  tasksOverdue: number;
  studyStreak: number;
  
  // Label (Y)
  respondedWithinHour: boolean; // 1 or 0
  
  // Metadata
  timestamp: Date;
  engagementScore: number;
}

/**
 * A/B Testing configuration for ML vs Fixed-time
 */
export interface ABTestConfig {
  enabled: boolean;
  userId: string;
  group: 'control' | 'treatment'; // control = fixed time, treatment = ML
  startDate: Date;
  endDate: Date;
  
  // Metrics
  metrics: {
    totalNotifications: number;
    responseRate: number;
    avgResponseTime: number;
    engagementScore: number;
  };
}
