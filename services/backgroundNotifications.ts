/**
 * Background Notification Scheduler
 * Runs periodic checks for deadline risks and workload alerts
 * Note: Full background support requires development build (not Expo Go)
 */

import * as BackgroundFetch from 'expo-background-fetch';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { getCurrentUser } from './authService';
import { runPhase1Checks, sendMorningBriefing } from './smartNotificationService';

// Task identifiers
const PREDICTION_CHECK_TASK = 'PREDICTION_CHECK_TASK';
const MORNING_BRIEFING_TASK = 'MORNING_BRIEFING_TASK';

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Define background task for prediction checks
 */
TaskManager.defineTask(PREDICTION_CHECK_TASK, async () => {
  try {
    console.log('[Background] Running prediction check task...');
    
    const user = await getCurrentUser();
    if (!user) {
      console.log('[Background] No user logged in');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Run all Phase 1 checks
    await runPhase1Checks(user.id);
    
    console.log('[Background] Prediction check complete');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[Background] Prediction check failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Define background task for morning briefing
 */
TaskManager.defineTask(MORNING_BRIEFING_TASK, async () => {
  try {
    console.log('[Background] Running morning briefing task...');
    
    const user = await getCurrentUser();
    if (!user) {
      console.log('[Background] No user logged in');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Send morning briefing
    await sendMorningBriefing(user.id);
    
    console.log('[Background] Morning briefing sent');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[Background] Morning briefing failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register background tasks
 * Note: Background tasks have limited support in Expo Go
 */
export async function registerBackgroundTasks(): Promise<boolean> {
  try {
    // Skip background task registration in Expo Go
    if (isExpoGo) {
      console.log('[Background] Running in Expo Go - background tasks limited');
      console.log('[Background] Local notifications and scheduled notifications will still work');
      return true;
    }

    console.log('[Background] Registering background tasks...');

    // Check if tasks are already registered
    const isRegisteredPrediction = await TaskManager.isTaskRegisteredAsync(PREDICTION_CHECK_TASK);
    const isRegisteredBriefing = await TaskManager.isTaskRegisteredAsync(MORNING_BRIEFING_TASK);

    // Register prediction check task (runs every 4 hours)
    if (!isRegisteredPrediction) {
      await BackgroundFetch.registerTaskAsync(PREDICTION_CHECK_TASK, {
        minimumInterval: 60 * 60 * 4, // 4 hours in seconds
        stopOnTerminate: false,        // Continue after app termination
        startOnBoot: true,             // Start on device boot
      });
      console.log('[Background] Prediction check task registered');
    }

    // Register morning briefing (runs once daily)
    // Note: For daily scheduling, we'll use Notifications.scheduleNotificationAsync instead
    // BackgroundFetch is more suitable for periodic checks
    
    console.log('[Background] Background tasks registered successfully');
    return true;
  } catch (error) {
    console.error('[Background] Failed to register background tasks:', error);
    console.log('[Background] Continuing with local notifications only');
    return false;
  }
}

/**
 * Unregister background tasks
 */
export async function unregisterBackgroundTasks(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(PREDICTION_CHECK_TASK);
    await BackgroundFetch.unregisterTaskAsync(MORNING_BRIEFING_TASK);
    console.log('[Background] Background tasks unregistered');
  } catch (error) {
    console.error('[Background] Failed to unregister background tasks:', error);
  }
}

/**
 * Schedule daily morning briefing at specific time
 * Uses DAILY trigger for Android/iOS compatibility
 */
export async function scheduleMorningBriefing(userId: string, time: string = '08:00'): Promise<void> {
  try {
    // Cancel existing morning briefing notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.category === 'briefing') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }

    // Parse time
    const [hours, minutes] = time.split(':').map(Number);
    
    // Calculate next occurrence
    const now = new Date();
    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);
    
    // If time already passed today, schedule for tomorrow
    if (scheduledDate <= now) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }
    
    // Schedule with DAILY trigger (works on Android)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '☀️ Daily Briefing',
        body: 'Tap to view your tasks and predictions for today',
        data: {
          category: 'briefing',
          userId: userId,
          action: 'OPEN_TASKS',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });

    console.log(`[Background] Morning briefing scheduled for ${time} daily`);
  } catch (error) {
    console.error('[Background] Failed to schedule morning briefing:', error);
  }
}

/**
 * Schedule periodic reminder for high-risk tasks
 * Uses DAILY trigger for Android/iOS compatibility
 */
export async function scheduleHighRiskReminders(userId: string): Promise<void> {
  try {
    // Schedule reminders at key times during the day
    const reminderTimes = [
      { hour: 9, minute: 0 },   // 9 AM
      { hour: 14, minute: 0 },  // 2 PM
      { hour: 19, minute: 0 },  // 7 PM
    ];

    for (const time of reminderTimes) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Task Check',
          body: 'Time to check your high-priority tasks',
          data: {
            category: 'reminder',
            userId: userId,
            action: 'OPEN_TASKS',
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: time.hour,
          minute: time.minute,
        },
      });
    }

    console.log('[Background] High-risk reminders scheduled');
  } catch (error) {
    console.error('[Background] Failed to schedule high-risk reminders:', error);
  }
}

/**
 * Get background fetch status
 */
export async function getBackgroundFetchStatus(): Promise<BackgroundFetch.BackgroundFetchStatus | null> {
  return await BackgroundFetch.getStatusAsync();
}

/**
 * Check if background tasks are registered
 */
export async function areBackgroundTasksRegistered(): Promise<{
  predictionCheck: boolean;
  morningBriefing: boolean;
}> {
  const predictionCheck = await TaskManager.isTaskRegisteredAsync(PREDICTION_CHECK_TASK);
  const morningBriefing = await TaskManager.isTaskRegisteredAsync(MORNING_BRIEFING_TASK);
  
  return {
    predictionCheck,
    morningBriefing,
  };
}

/**
 * Setup notification response listener
 */
export function setupNotificationResponseListener(): void {
  Notifications.addNotificationResponseReceivedListener(response => {
    console.log('[Notification] User tapped notification:', response);
    
    const { action, taskId, screen, params } = response.notification.request.content.data || {};
    
    // Handle navigation based on action
    // This will be implemented in the app navigation layer
    if (action && typeof (global as any).notificationNavigationHandler === 'function') {
      (global as any).notificationNavigationHandler({
        action,
        taskId,
        screen,
        params,
      });
    }
  });
}

/**
 * Initialize background notification system
 */
export async function initializeBackgroundNotifications(userId: string): Promise<boolean> {
  try {
    console.log('[Background] Initializing background notifications...');

    // Register background tasks
    const registered = await registerBackgroundTasks();
    if (!registered) {
      console.warn('[Background] Failed to register tasks');
      return false;
    }

    // Schedule morning briefing
    await scheduleMorningBriefing(userId, '08:00');

    // Setup notification response listener
    setupNotificationResponseListener();

    console.log('[Background] Background notifications initialized successfully');
    return true;
  } catch (error) {
    console.error('[Background] Initialization failed:', error);
    return false;
  }
}

export default {
  registerBackgroundTasks,
  unregisterBackgroundTasks,
  scheduleMorningBriefing,
  scheduleHighRiskReminders,
  getBackgroundFetchStatus,
  areBackgroundTasksRegistered,
  setupNotificationResponseListener,
  initializeBackgroundNotifications,
};
