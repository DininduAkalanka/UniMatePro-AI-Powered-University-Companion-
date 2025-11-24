/**
 * Notification Testing Helper
 * Quick functions to manually test notification system
 * Includes Phase 3 ML testing utilities
 */

import { getCurrentUser } from './authService';
import { analyzeBurnoutRisk, getBurnoutSummary } from './burnoutDetector';
import { analyzePeakTimes, getCachedPeakTimeAnalysis } from './peakTimeAnalyzer';
import { checkBurnoutRisk, checkPeakTimeReminder, runPhase1Checks, runPhase2Checks } from './smartNotificationService';
import { getStudySessions } from './studyServiceFirestore';
import { getTasks } from './taskServiceFirestore';

// Phase 3: ML imports
import { NotificationPriority, NotificationType } from '../types/notification';
import {
    getBatchReadyNotifications,
    getQueueStats
} from './ai/notificationQueue';
import {
    forceModelTraining,
    getOptimalTimeStats,
    predictOptimalSendTime
} from './ai/optimalTimePredictor';
import {
    getCollectionStats,
    getContextualFeatures
} from './ai/trainingDataCollector';
import { notificationManager } from './notificationManager';

/**
 * Manually trigger notification checks
 * Run this from console or button press to test notifications
 */
export async function manualNotificationTest(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  🧪 MANUAL NOTIFICATION TEST STARTED             ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');
  
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ No user logged in!');
      return;
    }
    
    console.log('✅ User authenticated:', user.id);
    console.log('');
    
    // Get tasks
    const tasks = await getTasks(user.id);
    console.log('📋 Found', tasks.length, 'total tasks');
    
    const incompleteTasks = tasks.filter(t => t.status !== 'completed');
    console.log('📌 Incomplete tasks:', incompleteTasks.length);
    
    if (incompleteTasks.length > 0) {
      console.log('\n📝 Task List:');
      incompleteTasks.forEach((task, i) => {
        const daysUntil = Math.ceil((task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        console.log(`   ${i + 1}. ${task.title}`);
        console.log(`      Due: ${task.dueDate.toLocaleDateString()} (${daysUntil} days)`);
        console.log(`      Hours: ${task.estimatedHours || 'Not set'}`);
        console.log(`      Priority: ${task.priority}`);
      });
    } else {
      console.log('\n⚠️ No incomplete tasks found!');
      console.log('   Create some tasks to test notifications.');
    }
    
    console.log('\n🚀 Running Phase 1 checks (Deadline Risks + Workload)...\n');
    
    // Run notification checks
    await runPhase1Checks(user.id);
    
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║  ✅ MANUAL NOTIFICATION TEST COMPLETE            ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 Check logs above for:');
    console.log('   • Deadline Risk Check logs');
    console.log('   • Workload Check logs');
    console.log('   • Notification Trigger logs (if any sent)');
    console.log('   • Notification Received logs (if any delivered)');
    console.log('');
    console.log('💡 Tips:');
    console.log('   • Look for "CRITICAL", "HIGH", "MEDIUM" risk tasks');
    console.log('   • Check for rate limiting messages');
    console.log('   • Verify notification content matches expectations');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

/**
 * Quick status check - shows notification system state
 */
export async function notificationStatus(): Promise<void> {
  console.log('\n📊 NOTIFICATION SYSTEM STATUS');
  console.log('═'.repeat(50));
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('❌ Not logged in');
      return;
    }
    
    console.log('✅ User:', user.id);
    
    const tasks = await getTasks(user.id);
    const incomplete = tasks.filter(t => t.status !== 'completed');
    
    console.log('📋 Tasks:', tasks.length, 'total,', incomplete.length, 'incomplete');
    
    if (incomplete.length > 0) {
      const dueToday = incomplete.filter(t => {
        const days = Math.ceil((t.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days === 0;
      });
      
      const dueThisWeek = incomplete.filter(t => {
        const days = Math.ceil((t.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days > 0 && days <= 7;
      });
      
      const overdue = incomplete.filter(t => t.dueDate.getTime() < Date.now());
      
      console.log('⏰ Due today:', dueToday.length);
      console.log('📅 Due this week:', dueThisWeek.length);
      console.log('🚨 Overdue:', overdue.length);
      
      if (overdue.length > 0) {
        console.log('\n🚨 Overdue Tasks:');
        overdue.forEach(t => {
          console.log(`   • ${t.title} (${Math.abs(Math.ceil((t.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days ago)`);
        });
      }
      
      if (dueToday.length > 0) {
        console.log('\n⏰ Due Today:');
        dueToday.forEach(t => {
          console.log(`   • ${t.title}`);
        });
      }
    }
    
    console.log('\n💡 Run manualNotificationTest() to trigger notification checks');
    console.log('═'.repeat(50) + '\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Create a test task with high risk (for testing)
 * Creates a task due tomorrow with 10 hours of work
 */
export async function createTestHighRiskTask(): Promise<void> {
  console.log('\n🧪 Creating test high-risk task...\n');
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ Not logged in');
      return;
    }
    
    const { createTask } = await import('./taskServiceFirestore');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    
    const { TaskType, TaskPriority, TaskStatus } = await import('../types');
    const { getCourses } = await import('./courseServiceFirestore');
    
    // Get first course or use a placeholder ID
    const courses = await getCourses(user.id);
    const courseId = courses.length > 0 ? courses[0].id : 'test-course-id';
    
    if (courses.length === 0) {
      console.log('⚠️ No courses found, using placeholder courseId');
      console.log('   Consider creating a course first for more realistic testing');
    }
    
    await createTask({
      userId: user.id,
      title: `[TEST] High Risk Task - ${new Date().toLocaleTimeString()}`,
      description: 'This is a test task with high estimated hours and close deadline to trigger high-risk notification',
      type: TaskType.ASSIGNMENT,
      priority: TaskPriority.HIGH,
      status: TaskStatus.TODO,
      dueDate: tomorrow,
      estimatedHours: 10, // 10 hours for tomorrow = very high risk
      completedHours: 0,
      courseId: courseId,
      reminderDate: undefined,
    });
    
    console.log('✅ Test task created!');
    console.log('📝 Title: [TEST] High Risk Task');
    console.log('⏰ Due: Tomorrow');
    console.log('📊 Estimated Hours: 10 (should trigger HIGH RISK alert)');
    console.log('\nWatch console for:');
    console.log('   1. [Task Integration] notification check trigger');
    console.log('   2. [HIGH RISK TASK DETECTED] alert');
    console.log('   3. Notification trigger and delivery logs\n');
    
  } catch (error) {
    console.error('❌ Failed to create test task:', error);
  }
}

/**
 * Test Peak Time Reminders
 * Shows your peak hours and tests the reminder system
 */
export async function testPeakTimeReminder(): Promise<void> {
  console.log('\n🕐 [PEAK TIME TEST] Starting...\n');
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ Not logged in');
      return;
    }
    
    console.log('✅ User:', user.id);
    console.log('⏰ Current time:', new Date().toLocaleString());
    console.log('⏰ Current hour:', new Date().getHours() + ':00');
    console.log('');
    
    // Check existing analysis
    console.log('📊 Checking for existing analysis...');
    let analysis = await getCachedPeakTimeAnalysis(user.id);
    
    if (analysis) {
      console.log('✅ Found cached analysis (last updated:', new Date(analysis.lastAnalyzed).toLocaleDateString() + ')');
    } else {
      console.log('⚠️ No cached analysis found, analyzing now...');
      
      // Check if user has enough data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const sessions = await getStudySessions(user.id, startDate, endDate);
      
      console.log('📚 Study sessions (last 30 days):', sessions.length);
      
      if (sessions.length < 5) {
        console.log('\n❌ INSUFFICIENT DATA');
        console.log('   You need at least 5 study sessions to use peak time reminders.');
        console.log('   Current: ' + sessions.length + ' sessions');
        console.log('\n💡 Quick tip: Complete more study sessions with effectiveness ratings!');
        return;
      }
      
      analysis = await analyzePeakTimes(user.id);
    }
    
    // Display results
    console.log('\n═══════════════════════════════════════');
    console.log('📈 PEAK TIME ANALYSIS RESULTS');
    console.log('═══════════════════════════════════════');
    console.log('📊 Data analyzed:', analysis.totalSessions, 'sessions');
    console.log('⭐ Average effectiveness:', analysis.averageEffectiveness.toFixed(1) + '/5');
    console.log('🎯 Confidence:', analysis.confidence.toUpperCase());
    console.log('');
    
    if (analysis.peakHours.length === 0) {
      console.log('⚠️ No clear peak hours identified yet');
      console.log('   Keep studying and rating your sessions!');
    } else {
      console.log('🌟 YOUR PEAK HOURS:');
      analysis.peakHours.forEach((hour, i) => {
        const hourData = analysis.hourlyProductivity.find(h => h.hour === hour);
        const timeLabel = hour === 0 ? '12 AM' : 
                         hour < 12 ? `${hour} AM` : 
                         hour === 12 ? '12 PM' : 
                         `${hour - 12} PM`;
        
        console.log(`   ${i + 1}. ${timeLabel}`);
        console.log(`      Sessions: ${hourData?.sessionCount || 0}`);
        console.log(`      Avg Effectiveness: ${hourData?.avgEffectiveness.toFixed(1) || 0}/5`);
        console.log(`      Productivity Score: ${hourData?.productivityScore.toFixed(0) || 0}/100`);
      });
    }
    
    console.log('═══════════════════════════════════════\n');
    
    // Check if we should send reminder now
    console.log('🔔 Testing reminder system...');
    const currentHour = new Date().getHours();
    const isPeakHour = analysis.peakHours.includes(currentHour);
    
    console.log('⏰ Current hour:', currentHour + ':00');
    console.log('🎯 Is peak hour?', isPeakHour ? 'YES ✅' : 'NO ❌');
    
    if (isPeakHour) {
      console.log('\n🌟 YOU ARE IN A PEAK HOUR RIGHT NOW!');
      console.log('   Testing notification send...\n');
      
      await checkPeakTimeReminder(user.id);
      
      console.log('\n✅ Notification test complete!');
      console.log('   Check your notification tray if you have pending tasks.');
    } else {
      const nextPeak = analysis.peakHours.find(h => h > currentHour);
      if (nextPeak) {
        const timeLabel = nextPeak === 0 ? '12 AM' : 
                         nextPeak < 12 ? `${nextPeak} AM` : 
                         nextPeak === 12 ? '12 PM' : 
                         `${nextPeak - 12} PM`;
        console.log('\n⏰ Next peak hour:', timeLabel);
        console.log('   You\'ll get a reminder then if you have pending tasks.');
      } else {
        const tomorrowPeak = analysis.peakHours[0];
        const timeLabel = tomorrowPeak === 0 ? '12 AM' : 
                         tomorrowPeak < 12 ? `${tomorrowPeak} AM` : 
                         tomorrowPeak === 12 ? '12 PM' : 
                         `${tomorrowPeak - 12} PM`;
        console.log('\n⏰ Next peak hour:', timeLabel, '(tomorrow)');
      }
    }
    
    console.log('\n🕐 [PEAK TIME TEST] Complete!\n');
    
  } catch (error) {
    console.error('❌ Peak time test failed:', error);
  }
}

/**
 * Show detailed hourly breakdown
 */
export async function showHourlyBreakdown(): Promise<void> {
  console.log('\n📊 [HOURLY BREAKDOWN] Loading...\n');
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ Not logged in');
      return;
    }
    
    let analysis = await getCachedPeakTimeAnalysis(user.id);
    if (!analysis) {
      console.log('Running fresh analysis...');
      analysis = await analyzePeakTimes(user.id);
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📈 YOUR PRODUCTIVITY BY HOUR (Last 30 Days)');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Group by time of day
    const morning = analysis.hourlyProductivity.filter(h => h.hour >= 6 && h.hour < 12);
    const afternoon = analysis.hourlyProductivity.filter(h => h.hour >= 12 && h.hour < 18);
    const evening = analysis.hourlyProductivity.filter(h => h.hour >= 18 && h.hour < 24);
    const night = analysis.hourlyProductivity.filter(h => h.hour >= 0 && h.hour < 6);
    
    const printHourGroup = (title: string, hours: typeof morning) => {
      console.log(`${title}:`);
      hours.forEach(h => {
        if (h.sessionCount === 0) return;
        
        const timeLabel = h.hour === 0 ? '12 AM' : 
                         h.hour < 12 ? `${h.hour} AM `.padEnd(6) : 
                         h.hour === 12 ? '12 PM' : 
                         `${h.hour - 12} PM `.padEnd(6);
        
        const bar = '█'.repeat(Math.round(h.productivityScore / 10));
        const isPeak = analysis!.peakHours.includes(h.hour) ? ' ⭐ PEAK' : '';
        
        console.log(`  ${timeLabel} ${bar.padEnd(10)} ${h.productivityScore.toFixed(0).padStart(3)}/100  (${h.sessionCount} sessions)${isPeak}`);
      });
      console.log('');
    };
    
    printHourGroup('🌅 MORNING (6 AM - 12 PM)', morning);
    printHourGroup('☀️ AFTERNOON (12 PM - 6 PM)', afternoon);
    printHourGroup('🌆 EVENING (6 PM - 12 AM)', evening);
    if (night.some(h => h.sessionCount > 0)) {
      printHourGroup('🌙 NIGHT (12 AM - 6 AM)', night);
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('💡 Tip: Focus on your peak hours (⭐) for best results!\n');
    
  } catch (error) {
    console.error('❌ Failed to show breakdown:', error);
  }
}

/**
 * Test burnout detection and analysis
 */
export async function testBurnoutDetection(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     😰 BURNOUT DETECTION TEST                            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ Not logged in');
      return;
    }
    
    console.log('🔍 Analyzing burnout risk for user...\n');
    
    // Get detailed burnout analysis
    const analysis = await analyzeBurnoutRisk(user.id);
    
    // Display risk level
    const riskEmoji = {
      none: '✅',
      low: '🟡',
      moderate: '🟠',
      high: '🔴',
      critical: '🚨'
    };
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`${riskEmoji[analysis.riskLevel]} RISK LEVEL: ${analysis.riskLevel.toUpperCase()}`);
    console.log(`📊 Risk Score: ${analysis.riskScore}/100`);
    console.log(`⚠️  Needs Intervention: ${analysis.needsIntervention ? 'YES' : 'NO'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Display indicators
    if (analysis.indicators.length > 0) {
      console.log('🔍 DETECTED INDICATORS:');
      analysis.indicators.forEach((indicator, index) => {
        const severityColor = {
          low: '🟡',
          moderate: '🟠',
          high: '🔴'
        };
        console.log(`  ${index + 1}. ${severityColor[indicator.severity]} ${indicator.type}`);
        console.log(`     Severity: ${indicator.severity.toUpperCase()}`);
        console.log(`     Description: ${indicator.description}`);
        console.log(`     Value: ${indicator.value} (threshold: ${indicator.threshold})`);
        console.log('');
      });
    } else {
      console.log('✅ No burnout indicators detected - you\'re doing great!\n');
    }
    
    // Display recommendations
    if (analysis.recommendations.length > 0) {
      console.log('💡 RECOMMENDATIONS:');
      analysis.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
      console.log('');
    }
    
    // Get study data for context
    const sessions = await getStudySessions(user.id);
    const recentSessions = sessions
      .filter(s => new Date(s.date).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 STUDY DATA (Last 7 Days):');
    console.log(`  Total Sessions: ${recentSessions.length}`);
    
    if (recentSessions.length > 0) {
      const totalMinutes = recentSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      const avgEffectiveness = recentSessions.reduce((sum, s) => sum + (s.effectiveness || 0), 0) / recentSessions.length;
      
      console.log(`  Total Hours: ${(totalMinutes / 60).toFixed(1)}h`);
      console.log(`  Avg Daily: ${(totalMinutes / 60 / 7).toFixed(1)}h/day`);
      console.log(`  Avg Effectiveness: ${avgEffectiveness.toFixed(1)}/5 ⭐`);
      
      // Show recent sessions
      console.log('\n  Recent Sessions:');
      recentSessions.slice(0, 5).forEach(session => {
        const date = new Date(session.date);
        const stars = '⭐'.repeat(session.effectiveness || 0);
        console.log(`    ${date.toLocaleDateString()} - ${(session.duration || 0)}min ${stars}`);
      });
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Test notification
    console.log('📬 Testing burnout notification...\n');
    await checkBurnoutRisk(user.id);
    
    console.log('\n✅ Burnout detection test complete!\n');
    console.log('💡 TIP: Check your notifications to see if burnout alert was sent.\n');
    
  } catch (error) {
    console.error('❌ Burnout test failed:', error);
  }
}

/**
 * Show burnout summary (lightweight version)
 */
export async function showBurnoutSummary(): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ Not logged in');
      return;
    }
    
    const analysis = await analyzeBurnoutRisk(user.id);
    const summary = getBurnoutSummary(analysis);
    console.log('\n📊 Burnout Summary:');
    console.log(summary);
    console.log('');
    
  } catch (error) {
    console.error('❌ Failed to show summary:', error);
  }
}

/**
 * Test Phase 2 features
 */
export async function testPhase2(): Promise<void> {
  console.log('\n🚀 [PHASE 2 TEST] Starting Phase 2 notification checks...\n');
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ Not logged in');
      return;
    }
    
    await runPhase2Checks(user.id);
    
    console.log('\n✅ [PHASE 2 TEST] Complete!\n');
    
  } catch (error) {
    console.error('❌ Phase 2 test failed:', error);
  }
}

// ========================================
// PHASE 3: ML TESTING UTILITIES
// ========================================

/**
 * Test ML-powered optimal time prediction
 */
export async function testMLPrediction(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     🤖 ML OPTIMAL TIME PREDICTION TEST                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ Not logged in');
      return;
    }
    
    console.log('🎯 Testing ML prediction for different notification types...\n');
    
    // Test different notification types
    const types = [
      NotificationType.DEADLINE_ALERT,
      NotificationType.STUDY_REMINDER,
      NotificationType.PRODUCTIVITY_TIP,
      NotificationType.ACHIEVEMENT,
    ];
    
    for (const type of types) {
      console.log(`📊 Predicting optimal time for: ${type}`);
      
      const prediction = await predictOptimalSendTime(
        type,
        NotificationPriority.MEDIUM,
        'idle',
        0
      );
      
      const currentHour = new Date().getHours();
      const delay = prediction.optimalHour - currentHour;
      
      console.log(`   ✅ Optimal Hour: ${prediction.optimalHour}:00 (${delay > 0 ? '+' : ''}${delay}h from now)`);
      console.log(`   📈 Success Rate: ${(prediction.successRate * 100).toFixed(1)}%`);
      console.log(`   🤖 Using ML: ${prediction.usingML ? 'Yes' : 'No (fallback)'}`);
      
      if (prediction.alternativeHours.length > 0) {
        console.log(`   🔄 Alternative Hours:`);
        prediction.alternativeHours.slice(0, 2).forEach(alt => {
          console.log(`      - ${alt.hour}:00 (${(alt.successRate * 100).toFixed(1)}%)`);
        });
      }
      
      console.log('');
    }
    
    // Get model stats
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ML MODEL STATISTICS:');
    const stats = await getOptimalTimeStats();
    
    if (stats.hasModel) {
      console.log(`   ✅ Model Trained: Yes`);
      console.log(`   🎯 Accuracy: ${(stats.modelAccuracy * 100).toFixed(1)}%`);
      console.log(`   📚 Training Samples: ${stats.trainingSamples}`);
      console.log(`   ⭐ Best Hours: ${stats.bestHours.join(', ')}`);
    } else {
      console.log(`   ⚠️ Model Trained: No`);
      console.log(`   📚 Training Samples: ${stats.trainingSamples}/30 (minimum required)`);
      console.log(`   💡 Tip: Need ${30 - stats.trainingSamples} more interactions to train model`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('✅ ML prediction test complete!\n');
    
  } catch (error) {
    console.error('❌ ML prediction test failed:', error);
  }
}

/**
 * Test notification queue system
 */
export async function testQueue(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     📬 NOTIFICATION QUEUE TEST                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ Not logged in');
      return;
    }
    
    // Get queue statistics
    const stats = getQueueStats();
    
    console.log('📊 QUEUE STATISTICS:');
    console.log(`   Total Queued: ${stats.total}`);
    console.log(`   Ready to Send: ${stats.ready}`);
    console.log('');
    console.log('📋 BY PRIORITY:');
    console.log(`   🚨 Critical: ${stats.critical}`);
    console.log(`   🔥 High: ${stats.high}`);
    console.log(`   🟡 Medium: ${stats.medium}`);
    console.log(`   🟢 Low: ${stats.low}`);
    console.log('');
    
    // Get ready notifications
    const ready = getBatchReadyNotifications(5);
    
    if (ready.length > 0) {
      console.log('✅ READY TO SEND:');
      ready.forEach((notif, i) => {
        console.log(`   ${i + 1}. ${notif.notification.type}`);
        console.log(`      Priority: ${notif.priority}`);
        console.log(`      Scheduled: ${notif.scheduledFor.toLocaleString()}`);
        console.log(`      Predicted Hour: ${notif.predictedOptimalHour}:00`);
        console.log(`      Success Rate: ${(notif.predictedSuccessRate * 100).toFixed(1)}%`);
      });
    } else {
      console.log('⏰ No notifications ready yet');
      if (stats.total > 0) {
        console.log(`   ${stats.total} notifications scheduled for later`);
      }
    }
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 QUEUE CONFIGURATION:');
    console.log(`   Max Queue Size: ${stats.config.MAX_QUEUE_SIZE}`);
    console.log(`   Max Delay: ${stats.config.DEFAULT_MAX_DELAY_HOURS} hours`);
    console.log(`   Batch Size: ${stats.config.BATCH_SIZE}`);
    console.log(`   Critical Bypass: ${stats.config.CRITICAL_SEND_IMMEDIATELY ? 'Yes' : 'No'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('✅ Queue test complete!\n');
    
  } catch (error) {
    console.error('❌ Queue test failed:', error);
  }
}

/**
 * Test training data collection
 */
export async function testDataCollection(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     📊 ML TRAINING DATA COLLECTION TEST                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ Not logged in');
      return;
    }
    
    // Get collection stats
    const stats = await getCollectionStats();
    
    console.log('📈 COLLECTION STATISTICS:');
    console.log(`   Total Samples: ${stats.totalSamples}`);
    console.log(`   Response Rate: ${(stats.responseRate * 100).toFixed(1)}%`);
    console.log(`   Avg Response Time: ${(stats.avgResponseTime / 60).toFixed(1)} minutes`);
    console.log(`   Avg Engagement: ${(stats.avgEngagementScore * 100).toFixed(0)}%`);
    console.log('');
    
    // Get contextual features
    const features = getContextualFeatures();
    
    console.log('🎯 CURRENT CONTEXT:');
    console.log(`   User State: ${features.userActiveState}`);
    console.log(`   Last Activity: ${features.recentActivityMinutes} minutes ago`);
    console.log(`   Study Session: ${features.currentSessionActive ? 'Active' : 'Inactive'}`);
    console.log('');
    
    // Hourly distribution
    if (Object.keys(stats.hourlyDistribution).length > 0) {
      console.log('📊 HOURLY DISTRIBUTION:');
      
      // Find top 5 hours
      const sortedHours = Object.entries(stats.hourlyDistribution)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5);
      
      sortedHours.forEach(([hour, count]) => {
        const numCount = count as number;
        const bar = '█'.repeat(Math.ceil(numCount / 2));
        console.log(`   ${hour.padStart(2, '0')}:00 │${bar} ${numCount}`);
      });
      
      console.log('');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 TRAINING STATUS:');
    
    if (stats.totalSamples >= 30) {
      console.log(`   ✅ Sufficient data for training (${stats.totalSamples}/30)`);
      console.log(`   🎓 Model can be trained with current data`);
    } else {
      console.log(`   ⚠️ Need more data: ${stats.totalSamples}/30`);
      console.log(`   📚 Collect ${30 - stats.totalSamples} more interactions to train model`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('✅ Data collection test complete!\n');
    
  } catch (error) {
    console.error('❌ Data collection test failed:', error);
  }
}

/**
 * Send test notification using ML
 */
export async function sendMLTestNotification(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     🧪 ML TEST NOTIFICATION                              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ Not logged in');
      return;
    }
    
    console.log('📤 Sending test notification with ML optimization...\n');
    
    // Initialize notification manager with ML
    await notificationManager.initialize(user.id);
    
    // Send test notification
    const result = await notificationManager.sendSmartML({
      userId: user.id,
      type: NotificationType.PRODUCTIVITY_TIP,
      priority: NotificationPriority.MEDIUM,
      title: '🤖 ML Test Notification',
      body: 'This notification was optimized by machine learning!',
      emoji: '🤖',
      sound: 'default',
    }, {
      canDelay: true,
      maxDelayHours: 3,
    });
    
    if (result.notificationId) {
      console.log('✅ Notification processed successfully!');
      console.log(`   ID: ${result.notificationId}`);
      console.log(`   Queued: ${result.queued ? 'Yes' : 'No (sent immediately)'}`);
      
      if (result.queued && result.scheduledFor) {
        console.log(`   📅 Scheduled For: ${result.scheduledFor.toLocaleString()}`);
      }
      
      if (result.prediction) {
        console.log(`\n🎯 ML PREDICTION:`);
        console.log(`   Optimal Hour: ${result.prediction.optimalHour}:00`);
        console.log(`   Success Rate: ${(result.prediction.successRate * 100).toFixed(1)}%`);
        console.log(`   Using ML: ${result.prediction.usingML ? 'Yes' : 'No'}`);
      }
    } else {
      console.log('⚠️ Notification was not sent (possibly blocked by settings)');
    }
    
    console.log('');
    console.log('💡 Check your device for the notification!');
    console.log('💡 Open it to generate training data for the ML model\n');
    
  } catch (error) {
    console.error('❌ ML test notification failed:', error);
  }
}

/**
 * Force model training with current data
 */
export async function trainMLModel(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     🎓 FORCE ML MODEL TRAINING                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ Not logged in');
      return;
    }
    
    const stats = await getCollectionStats();
    
    if (stats.totalSamples < 30) {
      console.log('⚠️ WARNING: Less than 30 samples available');
      console.log(`   Current: ${stats.totalSamples}/30`);
      console.log('   Model training may not produce accurate results\n');
      console.log('Continue anyway? (Model will use available data)\n');
    }
    
    console.log('🎓 Starting model training...\n');
    
    await forceModelTraining();
    
    console.log('\n✅ Model training complete!');
    console.log('💡 New predictions will use the trained model\n');
    
  } catch (error) {
    console.error('❌ Model training failed:', error);
  }
}

/**
 * Process notification queue manually
 */
export async function processQueue(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     🔄 MANUAL QUEUE PROCESSING                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ Not logged in');
      return;
    }
    
    console.log('🔄 Processing queued notifications...\n');
    
    const result = await notificationManager.processQueue();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 PROCESSING RESULTS:');
    console.log(`   ✅ Sent: ${result.sent}`);
    console.log(`   ❌ Failed: ${result.failed}`);
    console.log(`   ⏰ Remaining: ${result.remaining}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (result.sent > 0) {
      console.log('💡 Check your device for sent notifications!\n');
    }
    
    if (result.remaining > 0) {
      console.log(`⏰ ${result.remaining} notifications still scheduled for later\n`);
    }
    
  } catch (error) {
    console.error('❌ Queue processing failed:', error);
  }
}

/**
 * Test all Phase 3 features
 */
export async function testPhase3(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     🚀 PHASE 3 COMPREHENSIVE TEST                        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  console.log('Running all Phase 3 tests...\n');
  
  // Test 1: ML Prediction
  console.log('1️⃣ Testing ML Prediction...');
  await testMLPrediction();
  
  // Test 2: Queue System
  console.log('2️⃣ Testing Queue System...');
  await testQueue();
  
  // Test 3: Data Collection
  console.log('3️⃣ Testing Data Collection...');
  await testDataCollection();
  
  console.log('\n✅ All Phase 3 tests complete!\n');
}

// Make functions available globally for easy testing
if (typeof global !== 'undefined') {
  // Phase 1 & 2 tests
  (global as any).testNotifications = manualNotificationTest;
  (global as any).notificationStatus = notificationStatus;
  (global as any).createTestHighRiskTask = createTestHighRiskTask;
  (global as any).testPeakTime = testPeakTimeReminder;
  (global as any).showHourlyBreakdown = showHourlyBreakdown;
  (global as any).testBurnout = testBurnoutDetection;
  (global as any).burnoutSummary = showBurnoutSummary;
  (global as any).testPhase2 = testPhase2;
  
  // Phase 3 ML tests
  (global as any).testML = testMLPrediction;
  (global as any).testQueue = testQueue;
  (global as any).testDataCollection = testDataCollection;
  (global as any).sendMLTest = sendMLTestNotification;
  (global as any).trainModel = trainMLModel;
  (global as any).processQueue = processQueue;
  (global as any).testPhase3 = testPhase3;
}

export default {
  // Phase 1 & 2
  manualNotificationTest,
  notificationStatus,
  createTestHighRiskTask,
  testPeakTimeReminder,
  showHourlyBreakdown,
  testBurnoutDetection,
  showBurnoutSummary,
  testPhase2,
  
  // Phase 3 ML
  testMLPrediction,
  testQueue,
  testDataCollection,
  sendMLTestNotification,
  trainMLModel,
  processQueue,
  testPhase3,
};
