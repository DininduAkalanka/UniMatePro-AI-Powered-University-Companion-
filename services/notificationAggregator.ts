/**
 * Smart Notification Aggregator Service
 * Aggregates all AI predictions and insights for Dashboard display
 * Production-ready with caching, error handling, and priority management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, TaskStatus } from '../types';
import { NotificationPriority, NotificationType } from '../types/notification';
import { analyzeBurnoutRisk, BurnoutAnalysis } from './burnoutDetector';
import { analyzePeakTimes, getPeakTimeRecommendation } from './peakTimeAnalyzer';
import { analyzeWorkload, generateStudyRecommendation, predictDeadlineRisks } from './predictionService';
import { getTasks } from './taskServiceFirestore';

const CACHE_KEY = '@dashboard_alerts';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface SmartAlert {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  category: 'deadline' | 'burnout' | 'workload' | 'motivation' | 'peak_time' | 'achievement';
  
  // Display properties
  title: string;
  message: string;
  emoji: string;
  color: string;
  
  // Action properties
  actionable: boolean;
  actionLabel?: string;
  actionRoute?: string;
  actionParams?: any;
  
  // Metadata
  timestamp: Date;
  expiresAt?: Date;
  dismissible: boolean;
  read: boolean;
  
  // Additional context
  data?: any;
}

export interface DashboardAlerts {
  alerts: SmartAlert[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  lastUpdated: Date;
  cached: boolean;
}

/**
 * Main aggregation function - pulls all predictions and creates prioritized alerts
 */
export async function aggregateDashboardAlerts(userId: string): Promise<DashboardAlerts> {
  try {
    console.log('🔄 [Alert Aggregator] Starting aggregation for user:', userId);
    
    // Check cache first
    const cached = await getCachedAlerts(userId);
    if (cached) {
      console.log('✅ [Alert Aggregator] Returning cached alerts');
      return cached;
    }
    
    const alerts: SmartAlert[] = [];
    
    // Fetch all data in parallel
    const [tasks, burnoutAnalysis] = await Promise.all([
      getTasks(userId),
      analyzeBurnoutRisk(userId).catch(err => {
        console.warn('Failed to analyze burnout:', err);
        return null;
      }),
    ]);
    
    // 1. CRITICAL: Burnout Alerts
    if (burnoutAnalysis && (burnoutAnalysis.riskLevel === 'critical' || burnoutAnalysis.riskLevel === 'high')) {
      alerts.push(createBurnoutAlert(burnoutAnalysis));
    }
    
    // 2. CRITICAL/HIGH: Deadline Risk Alerts
    const incompleteTasks = tasks.filter(t => t.status !== TaskStatus.COMPLETED);
    let predictions: any[] = [];
    
    if (incompleteTasks.length > 0) {
      predictions = await predictDeadlineRisks(incompleteTasks);
      
      // Critical deadlines (due today/tomorrow + high risk)
      const criticalDeadlines = predictions.filter(p => 
        p.riskLevel === 'high' && p.daysRemaining <= 1
      );
      if (criticalDeadlines.length > 0) {
        alerts.push(createDeadlineAlert(criticalDeadlines, tasks, 'critical'));
      }
      
      // High priority deadlines (high risk, 2-5 days)
      const highPriorityDeadlines = predictions.filter(p =>
        p.riskLevel === 'high' && p.daysRemaining > 1 && p.daysRemaining <= 5
      );
      if (highPriorityDeadlines.length > 0) {
        alerts.push(createDeadlineAlert(highPriorityDeadlines, tasks, 'high'));
      }
    }
    
    // 3. HIGH: Workload Overload
    const workload = await analyzeWorkload(tasks, userId);
    if (workload.isOverloaded || workload.averageHoursPerDay > 10) {
      alerts.push(createWorkloadAlert(workload, tasks));
    }
    
    // 4. MEDIUM: Peak Time Recommendations
    const peakTimeRec = await getPeakTimeRecommendation(userId, incompleteTasks.length > 0);
    if (peakTimeRec.shouldSendReminder && peakTimeRec.confidence !== 'low') {
      alerts.push(createPeakTimeAlert(peakTimeRec));
    }
    
    // 5. MEDIUM: Moderate Burnout Warning
    if (burnoutAnalysis && burnoutAnalysis.riskLevel === 'moderate') {
      alerts.push(createBurnoutAlert(burnoutAnalysis));
    }
    
    // 6. MEDIUM: Study Pattern Analysis (NEW)
    const peakTimeAnalysis = await analyzePeakTimes(userId).catch(err => {
      console.warn('Failed to analyze peak times:', err);
      return null;
    });
    if (peakTimeAnalysis && peakTimeAnalysis.confidence === 'high') {
      alerts.push(createStudyPatternAlert(peakTimeAnalysis));
    }
    
    // 7. MEDIUM: AI Study Recommendations (NEW)
    if (incompleteTasks.length > 0 && predictions.length > 0) {
      const firstTask = tasks.find(t => t.id === predictions[0].taskId);
      if (firstTask) {
        const studyRec = await generateStudyRecommendation(predictions[0], firstTask).catch(err => {
          console.warn('Failed to generate study recommendation:', err);
          return null;
        });
        if (studyRec) {
          alerts.push(createStudyRecommendationAlert(studyRec, firstTask));
        }
      }
    }
    
    // 8. LOW: Motivational/Achievement Alerts
    const motivationalAlert = createMotivationalAlert(tasks, workload);
    if (motivationalAlert) {
      alerts.push(motivationalAlert);
    }
    
    // Sort by priority
    const priorityOrder = {
      [NotificationPriority.CRITICAL]: 4,
      [NotificationPriority.HIGH]: 3,
      [NotificationPriority.MEDIUM]: 2,
      [NotificationPriority.LOW]: 1,
    };
    alerts.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    
    // Calculate summary
    const summary = {
      critical: alerts.filter(a => a.priority === NotificationPriority.CRITICAL).length,
      high: alerts.filter(a => a.priority === NotificationPriority.HIGH).length,
      medium: alerts.filter(a => a.priority === NotificationPriority.MEDIUM).length,
      low: alerts.filter(a => a.priority === NotificationPriority.LOW).length,
      total: alerts.length,
    };
    
    const result: DashboardAlerts = {
      alerts,
      summary,
      lastUpdated: new Date(),
      cached: false,
    };
    
    // Cache the result
    await cacheAlerts(userId, result);
    
    console.log('✅ [Alert Aggregator] Aggregation complete:', summary);
    return result;
    
  } catch (error) {
    console.error('❌ [Alert Aggregator] Error aggregating alerts:', error);
    return {
      alerts: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
      lastUpdated: new Date(),
      cached: false,
    };
  }
}

/**
 * Create burnout alert
 */
function createBurnoutAlert(analysis: BurnoutAnalysis): SmartAlert {
  const isPriorityIcon = {
    critical: '🚨',
    high: '🔥',
    moderate: '😰',
    low: '😐',
    none: '✅',
  };
  
  const priorityMap = {
    critical: NotificationPriority.CRITICAL,
    high: NotificationPriority.HIGH,
    moderate: NotificationPriority.MEDIUM,
    low: NotificationPriority.LOW,
    none: NotificationPriority.LOW,
  };
  
  const colorMap = {
    critical: '#EF4444',
    high: '#F59E0B',
    moderate: '#F59E0B',
    low: '#3B82F6',
    none: '#10B981',
  };
  
  const title = analysis.riskLevel === 'critical' 
    ? 'Critical Burnout Risk!' 
    : analysis.riskLevel === 'high'
    ? 'High Burnout Risk'
    : 'Burnout Warning Signs';
  
  const message = analysis.riskLevel === 'critical'
    ? 'You need immediate rest! Take a 24-48 hour break.'
    : analysis.indicators.length > 0
    ? analysis.indicators[0].description
    : 'Monitor your study balance to prevent burnout.';
  
  return {
    id: `burnout_${Date.now()}`,
    type: NotificationType.BURNOUT_WARNING,
    priority: priorityMap[analysis.riskLevel],
    category: 'burnout',
    title,
    message,
    emoji: isPriorityIcon[analysis.riskLevel],
    color: colorMap[analysis.riskLevel],
    actionable: true,
    actionLabel: 'View Tips',
    actionRoute: '/notification-settings',
    timestamp: new Date(),
    dismissible: analysis.riskLevel !== 'critical',
    read: false,
    data: { analysis },
  };
}

/**
 * Create deadline alert with completion probability (ENHANCED)
 */
function createDeadlineAlert(
  predictions: any[],
  tasks: Task[],
  severity: 'critical' | 'high'
): SmartAlert {
  const count = predictions.length;
  const firstPrediction = predictions[0];
  const task = tasks.find(t => t.id === firstPrediction.taskId);
  
  const isCritical = severity === 'critical';
  
  // Get completion probability for single task
  const completionProb = firstPrediction.completionPercentage || null;
  
  const title = isCritical
    ? count === 1
      ? '🚨 URGENT Deadline!'
      : `🚨 ${count} URGENT Deadlines!`
    : count === 1
    ? '⚠️ Important Deadline'
    : `⚠️ ${count} Important Deadlines`;
  
  const message = isCritical
    ? count === 1
      ? `"${task?.title}" is due ${firstPrediction.daysRemaining === 0 ? 'TODAY' : 'tomorrow'}!${completionProb ? ` ${Math.round(completionProb)}% complete.` : ''} Tap to complete now.`
      : `${count} tasks due today/tomorrow! Need immediate attention.`
    : count === 1
    ? `"${task?.title}" needs ${firstPrediction.recommendedHoursPerDay.toFixed(1)}h/day.${completionProb ? ` ${Math.round(completionProb)}% complete.` : ''} Tap to open.`
    : `${count} high-risk tasks approaching deadline.`;
  
  return {
    id: `deadline_${severity}_${Date.now()}`,
    type: NotificationType.DEADLINE_ALERT,
    priority: isCritical ? NotificationPriority.CRITICAL : NotificationPriority.HIGH,
    category: 'deadline',
    title,
    message,
    emoji: isCritical ? '🚨' : '⚠️',
    color: isCritical ? '#EF4444' : '#F59E0B',
    actionable: true,
    actionLabel: count === 1 ? 'Complete Now' : 'View All Tasks',
    actionRoute: count === 1 ? `/tasks/${firstPrediction.taskId}` : '/tasks',
    actionParams: count === 1 ? { taskId: firstPrediction.taskId, autoFocus: true } : { filter: 'urgent' },
    timestamp: new Date(),
    dismissible: !isCritical,
    read: false,
    data: { predictions, count, completionProb, taskId: count === 1 ? firstPrediction.taskId : null },
  };
}

/**
 * Create workload alert
 */
function createWorkloadAlert(workload: any, tasks: Task[]): SmartAlert {
  const isCritical = workload.averageHoursPerDay > 12;
  
  // Get the most urgent incomplete task
  const urgentTask = tasks
    .filter(t => t.status !== TaskStatus.COMPLETED)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  
  const title = isCritical
    ? '🚨 Critical Workload!'
    : '⚠️ Heavy Workload Ahead';
  
  const message = isCritical
    ? urgentTask
      ? `${workload.averageHoursPerDay.toFixed(1)}h/day - Start with "${urgentTask.title}". Tap to complete.`
      : `You need ${workload.averageHoursPerDay.toFixed(1)}h/day - unsustainable! Request extensions.`
    : urgentTask
    ? `${workload.averageHoursPerDay.toFixed(1)}h/day - Begin with "${urgentTask.title}". Tap to open.`
    : `${workload.averageHoursPerDay.toFixed(1)}h/day required. Plan your week carefully.`;
  
  return {
    id: `workload_${Date.now()}`,
    type: NotificationType.OVERLOAD_WARNING,
    priority: isCritical ? NotificationPriority.CRITICAL : NotificationPriority.HIGH,
    category: 'workload',
    title,
    message,
    emoji: isCritical ? '🚨' : '📚',
    color: isCritical ? '#EF4444' : '#F59E0B',
    actionable: true,
    actionLabel: urgentTask ? 'Complete Now' : 'Open Planner',
    actionRoute: urgentTask ? `/tasks/${urgentTask.id}` : '/planner',
    actionParams: urgentTask ? { taskId: urgentTask.id, autoFocus: true } : undefined,
    timestamp: new Date(),
    dismissible: false,
    read: false,
    data: { workload, taskId: urgentTask?.id },
  };
}

/**
 * Create peak time alert
 */
function createPeakTimeAlert(recommendation: any): SmartAlert {
  return {
    id: `peak_time_${Date.now()}`,
    type: NotificationType.PEAK_TIME_REMINDER,
    priority: NotificationPriority.MEDIUM,
    category: 'peak_time',
    title: '🌟 Your Peak Time is Now!',
    message: recommendation.reason,
    emoji: '🌟',
    color: '#10B981',
    actionable: true,
    actionLabel: 'Start Session',
    actionRoute: '/study-session',
    timestamp: new Date(),
    dismissible: true,
    read: false,
    data: { recommendation },
  };
}

/**
 * Create study pattern alert (NEW)
 */
function createStudyPatternAlert(analysis: any): SmartAlert {
  const bestTime = analysis.bestStudyTimes?.[0];
  const timeOfDay: string = bestTime?.timeOfDay || 'morning';
  
  const timeEmojis: Record<string, string> = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌆',
    night: '🌙',
  };
  
  const timeMessages: Record<string, string> = {
    morning: 'You\'re most productive in the morning! Schedule important tasks early.',
    afternoon: 'Afternoons are your peak time! Plan your hardest work then.',
    evening: 'Evenings work best for you! Focus your study sessions at night.',
    night: 'You\'re a night owl! Late study sessions suit you best.',
  };
  
  return {
    id: `study_pattern_${Date.now()}`,
    type: NotificationType.PRODUCTIVITY_TIP,
    priority: NotificationPriority.MEDIUM,
    category: 'peak_time',
    title: `${timeEmojis[timeOfDay] || '📊'} Your Best Study Time`,
    message: timeMessages[timeOfDay] || 'AI analyzing your study patterns for optimal scheduling.',
    emoji: timeEmojis[timeOfDay] || '📊',
    color: '#8B5CF6',
    actionable: true,
    actionLabel: 'View Pattern',
    actionRoute: '/planner',
    timestamp: new Date(),
    dismissible: true,
    read: false,
    data: { analysis },
  };
}

/**
 * Create AI study recommendation alert (NEW)
 */
function createStudyRecommendationAlert(recommendation: string, task: Task): SmartAlert {
  // Extract first line or first 100 chars from recommendation
  const shortMessage = recommendation.split('\n')[0].substring(0, 100);
  
  return {
    id: `study_rec_${Date.now()}`,
    type: NotificationType.PRODUCTIVITY_TIP,
    priority: NotificationPriority.MEDIUM,
    category: 'motivation',
    title: '💡 AI Study Strategy',
    message: shortMessage.replace(/[🚨⚠️✅]/g, '').trim(),
    emoji: '💡',
    color: '#3B82F6',
    actionable: true,
    actionLabel: 'View Task',
    actionRoute: '/tasks',
    actionParams: { taskId: task.id },
    timestamp: new Date(),
    dismissible: true,
    read: false,
    data: { recommendation, taskId: task.id },
  };
}

/**
 * Create motivational alert
 */
function createMotivationalAlert(tasks: Task[], workload: any): SmartAlert | null {
  const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
  
  // All tasks completed
  if (completedTasks.length === totalTasks && totalTasks > 0) {
    return {
      id: `motivation_complete_${Date.now()}`,
      type: NotificationType.ACHIEVEMENT,
      priority: NotificationPriority.LOW,
      category: 'achievement',
      title: '🎉 All Tasks Complete!',
      message: "You're amazing! Time to celebrate your achievement.",
      emoji: '🎉',
      color: '#10B981',
      actionable: false,
      timestamp: new Date(),
      dismissible: true,
      read: false,
    };
  }
  
  // High completion rate
  if (completionRate >= 80 && totalTasks >= 3) {
    return {
      id: `motivation_progress_${Date.now()}`,
      type: NotificationType.ACHIEVEMENT,
      priority: NotificationPriority.LOW,
      category: 'motivation',
      title: '💪 Great Progress!',
      message: `${Math.round(completionRate)}% complete! You're crushing it!`,
      emoji: '💪',
      color: '#10B981',
      actionable: false,
      timestamp: new Date(),
      dismissible: true,
      read: false,
    };
  }
  
  // Light workload encouragement
  if (workload && !workload.isOverloaded && workload.averageHoursPerDay < 4 && totalTasks > 0) {
    return {
      id: `motivation_control_${Date.now()}`,
      type: NotificationType.PRODUCTIVITY_TIP,
      priority: NotificationPriority.LOW,
      category: 'motivation',
      title: '✅ You\'re In Control!',
      message: `Light workload: ${workload.averageHoursPerDay.toFixed(1)}h/day. Great organization!`,
      emoji: '✅',
      color: '#10B981',
      actionable: false,
      timestamp: new Date(),
      dismissible: true,
      read: false,
    };
  }
  
  return null;
}

/**
 * Cache alerts
 */
async function cacheAlerts(userId: string, alerts: DashboardAlerts): Promise<void> {
  try {
    const cacheData = {
      ...alerts,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to cache alerts:', error);
  }
}

/**
 * Get cached alerts
 */
async function getCachedAlerts(userId: string): Promise<DashboardAlerts | null> {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_KEY}_${userId}`);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const age = Date.now() - data.cachedAt;
    
    if (age > CACHE_TTL) {
      console.log('Cache expired, age:', age, 'TTL:', CACHE_TTL);
      return null;
    }
    
    return {
      ...data,
      cached: true,
    };
  } catch (error) {
    console.warn('Failed to get cached alerts:', error);
    return null;
  }
}

/**
 * Clear cache
 */
export async function clearAlertsCache(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${CACHE_KEY}_${userId}`);
    console.log('✅ Alerts cache cleared');
  } catch (error) {
    console.warn('Failed to clear alerts cache:', error);
  }
}

export default {
  aggregateDashboardAlerts,
  clearAlertsCache,
};
