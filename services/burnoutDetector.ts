/**
 * Burnout Detector
 * Monitors study patterns to detect burnout risk and prevent academic exhaustion
 * Part of Phase 2: Smart Notification Enhancements
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskStatus } from '../types';
import { getStudySessions } from './studyServiceFirestore';
import { getTasks } from './taskServiceFirestore';

const STORAGE_KEY = '@burnout_analysis';

export interface BurnoutAnalysis {
  userId: string;
  riskLevel: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number; // 0-100
  indicators: BurnoutIndicator[];
  recommendations: string[];
  lastAnalyzed: Date;
  needsIntervention: boolean;
}

export interface BurnoutIndicator {
  type: 'effectiveness_drop' | 'excessive_hours' | 'declining_completion' | 'no_breaks' | 'overdue_tasks';
  severity: 'low' | 'moderate' | 'high';
  description: string;
  value: number;
  threshold: number;
}

export interface StudyTrend {
  period: 'today' | 'last_3_days' | 'last_7_days';
  totalHours: number;
  avgEffectiveness: number;
  sessionCount: number;
  completionRate: number;
}

/**
 * Analyze burnout risk based on multiple indicators
 */
export async function analyzeBurnoutRisk(userId: string): Promise<BurnoutAnalysis> {
  console.log('\n🔥 [BURNOUT DETECTOR] Starting analysis for user:', userId);
  
  try {
    const now = new Date();
    const indicators: BurnoutIndicator[] = [];
    
    // Get data for analysis periods
    const trends = await getStudyTrends(userId);
    const tasks = await getTasks(userId);
    
    console.log('📊 Analyzing study patterns...');
    console.log('   Last 7 days: ' + trends.last_7_days.totalHours.toFixed(1) + ' hours, ' + trends.last_7_days.sessionCount + ' sessions');
    console.log('   Avg effectiveness: ' + trends.last_7_days.avgEffectiveness.toFixed(1) + '/5');
    
    // 1. Check for declining effectiveness trend
    const effectivenessIndicator = checkEffectivenessTrend(trends);
    if (effectivenessIndicator) {
      indicators.push(effectivenessIndicator);
      console.log('⚠️ Detected: ' + effectivenessIndicator.description);
    }
    
    // 2. Check for excessive study hours
    const excessiveHoursIndicator = checkExcessiveHours(trends);
    if (excessiveHoursIndicator) {
      indicators.push(excessiveHoursIndicator);
      console.log('⚠️ Detected: ' + excessiveHoursIndicator.description);
    }
    
    // 3. Check for declining task completion rate
    const completionIndicator = checkCompletionRate(tasks, trends);
    if (completionIndicator) {
      indicators.push(completionIndicator);
      console.log('⚠️ Detected: ' + completionIndicator.description);
    }
    
    // 4. Check for insufficient breaks
    const breaksIndicator = await checkBreakPattern(userId);
    if (breaksIndicator) {
      indicators.push(breaksIndicator);
      console.log('⚠️ Detected: ' + breaksIndicator.description);
    }
    
    // 5. Check for accumulating overdue tasks
    const overdueIndicator = checkOverdueTasks(tasks);
    if (overdueIndicator) {
      indicators.push(overdueIndicator);
      console.log('⚠️ Detected: ' + overdueIndicator.description);
    }
    
    // Calculate overall risk score
    const riskScore = calculateRiskScore(indicators);
    const riskLevel = getRiskLevel(riskScore);
    const needsIntervention = riskLevel === 'high' || riskLevel === 'critical';
    
    // Generate recommendations
    const recommendations = generateRecommendations(indicators, riskLevel);
    
    const analysis: BurnoutAnalysis = {
      userId,
      riskLevel,
      riskScore,
      indicators,
      recommendations,
      lastAnalyzed: now,
      needsIntervention,
    };
    
    // Cache the analysis
    await AsyncStorage.setItem(
      `${STORAGE_KEY}_${userId}`,
      JSON.stringify(analysis)
    );
    
    console.log('✅ Burnout analysis complete');
    console.log('🔥 Risk Level:', riskLevel.toUpperCase());
    console.log('📊 Risk Score:', riskScore + '/100');
    console.log('⚠️ Indicators:', indicators.length);
    console.log('🚨 Needs Intervention:', needsIntervention ? 'YES' : 'NO');
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Burnout analysis failed:', error);
    throw error;
  }
}

/**
 * Get study trends for different time periods
 */
async function getStudyTrends(userId: string): Promise<{
  today: StudyTrend;
  last_3_days: StudyTrend;
  last_7_days: StudyTrend;
}> {
  const now = new Date();
  
  // Get sessions for last 7 days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const allSessions = await getStudySessions(userId, startDate, now);
  
  const calculateTrend = (days: number): StudyTrend => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const sessions = allSessions.filter(s => s.date >= cutoff);
    
    const totalHours = sessions.reduce((sum, s) => sum + s.duration, 0) / 60;
    const withEffectiveness = sessions.filter(s => s.effectiveness);
    const avgEffectiveness = withEffectiveness.length > 0
      ? withEffectiveness.reduce((sum, s) => sum + (s.effectiveness || 0), 0) / withEffectiveness.length
      : 0;
    
    return {
      period: days === 0 ? 'today' : days === 3 ? 'last_3_days' : 'last_7_days',
      totalHours,
      avgEffectiveness,
      sessionCount: sessions.length,
      completionRate: 0, // Calculated separately
    };
  };
  
  return {
    today: calculateTrend(0),
    last_3_days: calculateTrend(3),
    last_7_days: calculateTrend(7),
  };
}

/**
 * Check for declining effectiveness trend
 */
function checkEffectivenessTrend(trends: ReturnType<typeof getStudyTrends> extends Promise<infer T> ? T : never): BurnoutIndicator | null {
  const recent = trends.last_3_days.avgEffectiveness;
  const baseline = trends.last_7_days.avgEffectiveness;
  
  if (baseline === 0 || recent === 0) return null;
  
  const drop = ((baseline - recent) / baseline) * 100;
  
  // Alert if effectiveness dropped by more than 20%
  if (drop >= 30) {
    return {
      type: 'effectiveness_drop',
      severity: 'high',
      description: `Study effectiveness dropped ${drop.toFixed(0)}% (from ${baseline.toFixed(1)} to ${recent.toFixed(1)})`,
      value: drop,
      threshold: 30,
    };
  } else if (drop >= 20) {
    return {
      type: 'effectiveness_drop',
      severity: 'moderate',
      description: `Study effectiveness dropped ${drop.toFixed(0)}% (from ${baseline.toFixed(1)} to ${recent.toFixed(1)})`,
      value: drop,
      threshold: 20,
    };
  }
  
  return null;
}

/**
 * Check for excessive study hours
 */
function checkExcessiveHours(trends: ReturnType<typeof getStudyTrends> extends Promise<infer T> ? T : never): BurnoutIndicator | null {
  const avgHoursPerDay = trends.last_3_days.totalHours / 3;
  
  // Critical: >12 hours/day for 3+ days
  if (avgHoursPerDay > 12) {
    return {
      type: 'excessive_hours',
      severity: 'high',
      description: `Studying ${avgHoursPerDay.toFixed(1)} hours/day (above sustainable 12h limit)`,
      value: avgHoursPerDay,
      threshold: 12,
    };
  }
  
  // Warning: >10 hours/day for 3+ days
  if (avgHoursPerDay > 10) {
    return {
      type: 'excessive_hours',
      severity: 'moderate',
      description: `Studying ${avgHoursPerDay.toFixed(1)} hours/day (approaching burnout threshold)`,
      value: avgHoursPerDay,
      threshold: 10,
    };
  }
  
  return null;
}

/**
 * Check task completion rate
 */
function checkCompletionRate(tasks: any[], trends: ReturnType<typeof getStudyTrends> extends Promise<infer T> ? T : never): BurnoutIndicator | null {
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  
  const recentTasks = tasks.filter(t => new Date(t.createdAt) >= last7Days);
  const completedRecent = recentTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
  const completionRate = recentTasks.length > 0 ? (completedRecent / recentTasks.length) * 100 : 100;
  
  // Low completion rate despite high study hours = potential burnout
  if (trends.last_7_days.totalHours > 20 && completionRate < 40) {
    return {
      type: 'declining_completion',
      severity: 'high',
      description: `Low task completion (${completionRate.toFixed(0)}%) despite ${trends.last_7_days.totalHours.toFixed(0)}h of study`,
      value: completionRate,
      threshold: 40,
    };
  } else if (trends.last_7_days.totalHours > 15 && completionRate < 50) {
    return {
      type: 'declining_completion',
      severity: 'moderate',
      description: `Task completion rate at ${completionRate.toFixed(0)}% despite consistent study`,
      value: completionRate,
      threshold: 50,
    };
  }
  
  return null;
}

/**
 * Check break patterns
 */
async function checkBreakPattern(userId: string): Promise<BurnoutIndicator | null> {
  const last3Days = new Date();
  last3Days.setDate(last3Days.getDate() - 3);
  
  const sessions = await getStudySessions(userId, last3Days, new Date());
  
  // Check for consecutive long sessions without breaks
  const longSessions = sessions.filter(s => s.duration >= 120); // 2+ hours
  
  if (longSessions.length >= 3) {
    return {
      type: 'no_breaks',
      severity: 'moderate',
      description: `${longSessions.length} sessions >2 hours without adequate breaks`,
      value: longSessions.length,
      threshold: 3,
    };
  }
  
  return null;
}

/**
 * Check overdue tasks accumulation
 */
function checkOverdueTasks(tasks: any[]): BurnoutIndicator | null {
  const now = new Date();
  const overdueTasks = tasks.filter(t => 
    t.status !== TaskStatus.COMPLETED && 
    new Date(t.dueDate) < now
  );
  
  if (overdueTasks.length >= 5) {
    return {
      type: 'overdue_tasks',
      severity: 'high',
      description: `${overdueTasks.length} overdue tasks accumulating (stress indicator)`,
      value: overdueTasks.length,
      threshold: 5,
    };
  } else if (overdueTasks.length >= 3) {
    return {
      type: 'overdue_tasks',
      severity: 'moderate',
      description: `${overdueTasks.length} overdue tasks pending`,
      value: overdueTasks.length,
      threshold: 3,
    };
  }
  
  return null;
}

/**
 * Calculate overall risk score
 */
function calculateRiskScore(indicators: BurnoutIndicator[]): number {
  if (indicators.length === 0) return 0;
  
  const weights = {
    effectiveness_drop: 30,
    excessive_hours: 25,
    declining_completion: 20,
    no_breaks: 15,
    overdue_tasks: 10,
  };
  
  const severityMultipliers = {
    low: 0.5,
    moderate: 1.0,
    high: 1.5,
  };
  
  let totalScore = 0;
  
  indicators.forEach(indicator => {
    const weight = weights[indicator.type];
    const multiplier = severityMultipliers[indicator.severity];
    totalScore += weight * multiplier;
  });
  
  return Math.min(100, Math.round(totalScore));
}

/**
 * Determine risk level from score
 */
function getRiskLevel(score: number): BurnoutAnalysis['riskLevel'] {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'low';
  return 'none';
}

/**
 * Generate personalized recommendations
 */
function generateRecommendations(indicators: BurnoutIndicator[], riskLevel: BurnoutAnalysis['riskLevel']): string[] {
  const recommendations: string[] = [];
  
  if (riskLevel === 'critical' || riskLevel === 'high') {
    recommendations.push('🚨 URGENT: Take a 24-48 hour break from studying');
    recommendations.push('💆 Focus on rest, sleep, and self-care');
  }
  
  indicators.forEach(indicator => {
    switch (indicator.type) {
      case 'effectiveness_drop':
        recommendations.push('📉 Your study quality is declining - prioritize rest over quantity');
        recommendations.push('💤 Ensure 7-8 hours of sleep per night');
        break;
        
      case 'excessive_hours':
        recommendations.push('⏰ Reduce daily study hours to max 8-10 hours');
        recommendations.push('🎯 Focus on quality over quantity - take strategic breaks');
        break;
        
      case 'declining_completion':
        recommendations.push('📋 Break large tasks into smaller, achievable chunks');
        recommendations.push('✅ Celebrate small wins to maintain motivation');
        break;
        
      case 'no_breaks':
        recommendations.push('☕ Take 15-min breaks every hour');
        recommendations.push('🚶 Use Pomodoro technique (25 min work, 5 min break)');
        break;
        
      case 'overdue_tasks':
        recommendations.push('📅 Request deadline extensions from professors');
        recommendations.push('🤝 Seek help from tutors or study groups');
        break;
    }
  });
  
  // General recommendations
  if (riskLevel !== 'none') {
    recommendations.push('🧘 Practice stress-reduction techniques (meditation, exercise)');
    recommendations.push('💬 Talk to someone - counselor, friend, or family');
  }
  
  // Remove duplicates
  return [...new Set(recommendations)];
}

/**
 * Get cached burnout analysis
 */
export async function getCachedBurnoutAnalysis(userId: string): Promise<BurnoutAnalysis | null> {
  try {
    const cached = await AsyncStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (!cached) return null;
    
    const analysis = JSON.parse(cached);
    
    // Check if analysis is stale (older than 1 day)
    const lastAnalyzed = new Date(analysis.lastAnalyzed);
    const hoursSinceAnalysis = (Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceAnalysis > 24) {
      console.log('⚠️ Burnout analysis is stale (>24 hours), needs refresh');
      return null;
    }
    
    return analysis;
  } catch (error) {
    console.error('Failed to get cached burnout analysis:', error);
    return null;
  }
}

/**
 * Get human-readable burnout summary
 */
export function getBurnoutSummary(analysis: BurnoutAnalysis): string {
  const emoji = {
    none: '✅',
    low: '😊',
    moderate: '😐',
    high: '😰',
    critical: '🚨',
  };
  
  const statusText = {
    none: 'Healthy Balance',
    low: 'Slight Concern',
    moderate: 'Warning Signs',
    high: 'High Risk',
    critical: 'CRITICAL - Immediate Action Needed',
  };
  
  return `${emoji[analysis.riskLevel]} ${statusText[analysis.riskLevel]} (${analysis.riskScore}/100)`;
}

/**
 * Check if intervention is needed
 */
export function shouldSendBurnoutAlert(analysis: BurnoutAnalysis): boolean {
  return analysis.needsIntervention && analysis.indicators.length > 0;
}

/**
 * Clear cached analysis
 */
export async function clearBurnoutAnalysis(userId: string): Promise<void> {
  await AsyncStorage.removeItem(`${STORAGE_KEY}_${userId}`);
  console.log('🗑️ Burnout analysis cleared');
}

export default {
  analyzeBurnoutRisk,
  getCachedBurnoutAnalysis,
  getBurnoutSummary,
  shouldSendBurnoutAlert,
  clearBurnoutAnalysis,
};
