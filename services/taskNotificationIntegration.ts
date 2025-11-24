/**
 * Task Service Integration with Smart Notifications
 * Automatically trigger notification checks when tasks are created/updated
 */

import { runPhase1Checks } from './smartNotificationService';

/**
 * Trigger notification check after task operations
 * Call this after: createTask, updateTask, deleteTask
 */
export async function triggerNotificationCheck(userId: string): Promise<void> {
  try {
    console.log('\n🔍 [TASK INTEGRATION] Starting notification check...');
    console.log('👤 User ID:', userId);
    console.log('⏰ Time:', new Date().toLocaleString());
    
    // Run checks in background (don't await)
    runPhase1Checks(userId).catch(error => {
      console.error('[Task Integration] ❌ Notification check failed:', error);
    });
    
    console.log('✅ [TASK INTEGRATION] Notification check triggered (running in background)\n');
  } catch (error) {
    console.error('[Task Integration] ❌ Failed to trigger check:', error);
  }
}

/**
 * Send immediate notification for newly created high-risk task
 */
export async function checkNewTaskRisk(taskId: string, userId: string): Promise<void> {
  try {
    console.log('[Task Integration] Checking new task risk:', taskId);
    
    const { getTasks } = await import('./taskServiceFirestore');
    const { predictDeadlineRisk } = await import('./predictionService');
    const { notificationManager } = await import('./notificationManager');
    const { NotificationPriority, NotificationType } = await import('../types/notification');
    
    const tasks = await getTasks(userId);
    const newTask = tasks.find(t => t.id === taskId);
    
    if (!newTask) {
      console.log('[Task Integration] Task not found:', taskId);
      return;
    }
    
    console.log('[Task Integration] Predicting risk for task:', newTask.title);
    const prediction = await predictDeadlineRisk(newTask);
    console.log('[Task Integration] Prediction:', {
      riskLevel: prediction.riskLevel,
      daysRemaining: prediction.daysRemaining,
      recommendedHoursPerDay: prediction.recommendedHoursPerDay
    });
    
    // Notify for high risk tasks with ≤3 days OR medium risk with ≤1 day
    const shouldNotify = (
      (prediction.riskLevel === 'high' && prediction.daysRemaining <= 3) ||
      (prediction.riskLevel === 'medium' && prediction.daysRemaining <= 1 && prediction.recommendedHoursPerDay >= 6)
    );
    
    if (shouldNotify) {
      const isHighRisk = prediction.riskLevel === 'high';
      console.log(`\n${isHighRisk ? '🚨' : '⚠️'} [${isHighRisk ? 'HIGH' : 'MEDIUM'} RISK TASK DETECTED] ===================`);
      console.log('📝 Task:', newTask.title);
      console.log('⏰ Days Remaining:', prediction.daysRemaining);
      console.log('⚠️ Risk Level:', prediction.riskLevel.toUpperCase());
      console.log('📊 Recommended Hours/Day:', Math.ceil(prediction.recommendedHoursPerDay));
      console.log(`🔔 Sending ${isHighRisk ? 'HIGH' : 'MEDIUM'} RISK notification now...`);
      console.log('============================================\n');
      
      await notificationManager.sendSmart({
        userId,
        type: NotificationType.DEADLINE_ALERT,
        priority: isHighRisk ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
        title: isHighRisk 
          ? `⚠️ New High-Risk Task: ${newTask.title}`
          : `📚 Important Task: ${newTask.title}`,
        body: prediction.daysRemaining === 0
          ? `Due TODAY! Need ${Math.ceil(prediction.recommendedHoursPerDay)}h total.`
          : `Due in ${prediction.daysRemaining} day${prediction.daysRemaining > 1 ? 's' : ''}. ${Math.ceil(prediction.recommendedHoursPerDay)}h/day needed.`,
        emoji: isHighRisk ? '⚠️' : '📚',
        color: isHighRisk ? '#F59E0B' : '#3B82F6',
        action: 'OPEN_TASK',
        actionData: {
          taskId: newTask.id,
        },
        data: {
          prediction,
          isNewTask: true,
        },
      });
    } else {
      console.log('✓ [Task Integration] Task risk is low, no immediate notification needed');
      console.log('  Risk Level:', prediction.riskLevel, '| Days Remaining:', prediction.daysRemaining, '| Hours/day:', prediction.recommendedHoursPerDay.toFixed(1));
    }
  } catch (error) {
    console.error('[Task Integration] Failed to check new task risk:', error);
  }
}

export default {
  triggerNotificationCheck,
  checkNewTaskRisk,
};
