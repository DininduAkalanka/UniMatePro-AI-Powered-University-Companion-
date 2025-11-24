/**
 * Peak Time Analyzer
 * Analyzes study patterns to identify user's most productive hours
 * Part of Phase 2: Smart Notification Enhancements
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStudySessions } from './studyServiceFirestore';

const STORAGE_KEY = '@peak_time_analysis';

export interface PeakTimeAnalysis {
  userId: string;
  peakHours: number[]; // Top 3 hours (0-23)
  hourlyProductivity: HourlyProductivityScore[];
  totalSessions: number;
  averageEffectiveness: number;
  lastAnalyzed: Date;
  confidence: 'low' | 'medium' | 'high'; // Based on data quantity
}

export interface HourlyProductivityScore {
  hour: number;
  sessionCount: number;
  avgEffectiveness: number;
  avgDuration: number;
  productivityScore: number; // 0-100
}

export interface PeakTimeRecommendation {
  shouldSendReminder: boolean;
  nextPeakHour: number | null;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Analyze user's study patterns to identify peak productivity hours
 */
export async function analyzePeakTimes(userId: string): Promise<PeakTimeAnalysis> {
  console.log('\n🔍 [PEAK TIME ANALYZER] Starting analysis for user:', userId);
  
  try {
    // Get last 30 days of study sessions
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const sessions = await getStudySessions(userId, startDate, endDate);
    console.log('📊 Analyzing', sessions.length, 'study sessions from last 30 days');
    
    if (sessions.length < 5) {
      console.log('⚠️ Insufficient data (need at least 5 sessions)');
      return {
        userId,
        peakHours: [],
        hourlyProductivity: [],
        totalSessions: sessions.length,
        averageEffectiveness: 0,
        lastAnalyzed: new Date(),
        confidence: 'low',
      };
    }
    
    // Group sessions by hour
    const hourlyData = new Map<number, {
      count: number;
      totalEffectiveness: number;
      totalDuration: number;
      effectivenessCount: number;
    }>();
    
    // Initialize all hours
    for (let hour = 0; hour < 24; hour++) {
      hourlyData.set(hour, {
        count: 0,
        totalEffectiveness: 0,
        totalDuration: 0,
        effectivenessCount: 0,
      });
    }
    
    // Aggregate data by hour
    let totalEffectiveness = 0;
    let effectivenessCount = 0;
    
    sessions.forEach(session => {
      const hour = session.date.getHours();
      const data = hourlyData.get(hour)!;
      
      data.count++;
      data.totalDuration += session.duration;
      
      if (session.effectiveness) {
        data.totalEffectiveness += session.effectiveness;
        data.effectivenessCount++;
        totalEffectiveness += session.effectiveness;
        effectivenessCount++;
      }
    });
    
    // Calculate productivity scores for each hour
    const hourlyProductivity: HourlyProductivityScore[] = [];
    const avgOverallEffectiveness = effectivenessCount > 0 ? totalEffectiveness / effectivenessCount : 3;
    
    for (let hour = 0; hour < 24; hour++) {
      const data = hourlyData.get(hour)!;
      
      if (data.count === 0) {
        hourlyProductivity.push({
          hour,
          sessionCount: 0,
          avgEffectiveness: 0,
          avgDuration: 0,
          productivityScore: 0,
        });
        continue;
      }
      
      const avgEffectiveness = data.effectivenessCount > 0 
        ? data.totalEffectiveness / data.effectivenessCount 
        : avgOverallEffectiveness;
      
      const avgDuration = data.totalDuration / data.count;
      
      // Productivity score formula:
      // - Effectiveness weight: 60%
      // - Session frequency weight: 25%
      // - Average duration weight: 15%
      const effectivenessScore = (avgEffectiveness / 5) * 100;
      const frequencyScore = Math.min(100, (data.count / sessions.length) * 100 * 4);
      const durationScore = Math.min(100, (avgDuration / 90) * 100); // 90 min = ideal
      
      const productivityScore = 
        (effectivenessScore * 0.6) +
        (frequencyScore * 0.25) +
        (durationScore * 0.15);
      
      hourlyProductivity.push({
        hour,
        sessionCount: data.count,
        avgEffectiveness,
        avgDuration,
        productivityScore,
      });
    }
    
    // Sort by productivity score and get top 3
    const topHours = [...hourlyProductivity]
      .filter(h => h.sessionCount > 0)
      .sort((a, b) => b.productivityScore - a.productivityScore)
      .slice(0, 3);
    
    const peakHours = topHours.map(h => h.hour);
    
    // Determine confidence based on data quantity
    let confidence: 'low' | 'medium' | 'high' = 'low';
    if (sessions.length >= 20 && effectivenessCount >= 15) {
      confidence = 'high';
    } else if (sessions.length >= 10 && effectivenessCount >= 8) {
      confidence = 'medium';
    }
    
    const analysis: PeakTimeAnalysis = {
      userId,
      peakHours,
      hourlyProductivity,
      totalSessions: sessions.length,
      averageEffectiveness: avgOverallEffectiveness,
      lastAnalyzed: new Date(),
      confidence,
    };
    
    // Cache the analysis
    await AsyncStorage.setItem(
      `${STORAGE_KEY}_${userId}`,
      JSON.stringify(analysis)
    );
    
    console.log('✅ Peak hours identified:', peakHours.map(h => `${h}:00`).join(', '));
    console.log('📊 Confidence level:', confidence.toUpperCase());
    console.log('🎯 Top 3 productivity scores:', topHours.map(h => h.productivityScore.toFixed(1)).join(', '));
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Peak time analysis failed:', error);
    throw error;
  }
}

/**
 * Get cached peak time analysis
 */
export async function getCachedPeakTimeAnalysis(userId: string): Promise<PeakTimeAnalysis | null> {
  try {
    const cached = await AsyncStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (!cached) return null;
    
    const analysis = JSON.parse(cached);
    
    // Check if analysis is stale (older than 7 days)
    const lastAnalyzed = new Date(analysis.lastAnalyzed);
    const daysSinceAnalysis = (Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceAnalysis > 7) {
      console.log('⚠️ Peak time analysis is stale (>7 days), needs refresh');
      return null;
    }
    
    return analysis;
  } catch (error) {
    console.error('Failed to get cached analysis:', error);
    return null;
  }
}

/**
 * Get current peak time recommendation
 */
export async function getPeakTimeRecommendation(
  userId: string,
  hasPendingTasks: boolean
): Promise<PeakTimeRecommendation> {
  try {
    // Get or analyze peak times
    let analysis = await getCachedPeakTimeAnalysis(userId);
    
    if (!analysis) {
      console.log('🔄 No cached analysis, running fresh analysis...');
      analysis = await analyzePeakTimes(userId);
    }
    
    // If insufficient data or low confidence, don't recommend
    if (analysis.confidence === 'low' || analysis.peakHours.length === 0) {
      return {
        shouldSendReminder: false,
        nextPeakHour: null,
        reason: 'Insufficient data to determine peak times',
        confidence: 'low',
      };
    }
    
    // If no pending tasks, don't send reminder
    if (!hasPendingTasks) {
      return {
        shouldSendReminder: false,
        nextPeakHour: null,
        reason: 'No pending tasks to work on',
        confidence: analysis.confidence,
      };
    }
    
    const currentHour = new Date().getHours();
    
    // Check if we're currently in a peak hour
    if (analysis.peakHours.includes(currentHour)) {
      return {
        shouldSendReminder: true,
        nextPeakHour: currentHour,
        reason: `Currently in your peak productivity hour (${currentHour}:00)`,
        confidence: analysis.confidence,
      };
    }
    
    // Find next peak hour
    const upcomingPeakHours = analysis.peakHours
      .filter(hour => hour > currentHour)
      .sort((a, b) => a - b);
    
    const nextPeakHour = upcomingPeakHours.length > 0 
      ? upcomingPeakHours[0]
      : analysis.peakHours[0]; // Wrap to tomorrow
    
    return {
      shouldSendReminder: false,
      nextPeakHour,
      reason: `Next peak hour: ${nextPeakHour}:00`,
      confidence: analysis.confidence,
    };
    
  } catch (error) {
    console.error('Failed to get peak time recommendation:', error);
    return {
      shouldSendReminder: false,
      nextPeakHour: null,
      reason: 'Analysis error',
      confidence: 'low',
    };
  }
}

/**
 * Get human-readable peak time summary
 */
export function getPeakTimeSummary(analysis: PeakTimeAnalysis): string {
  if (analysis.peakHours.length === 0) {
    return 'Keep studying to discover your peak productivity hours!';
  }
  
  const timeLabels = analysis.peakHours.map(hour => {
    if (hour < 12) return `${hour === 0 ? 12 : hour}AM`;
    return `${hour === 12 ? 12 : hour - 12}PM`;
  });
  
  const confidenceEmoji = {
    low: '📊',
    medium: '📈',
    high: '🎯',
  };
  
  return `${confidenceEmoji[analysis.confidence]} Your peak hours: ${timeLabels.join(', ')} (based on ${analysis.totalSessions} sessions)`;
}

/**
 * Clear cached analysis (for testing or reset)
 */
export async function clearPeakTimeAnalysis(userId: string): Promise<void> {
  await AsyncStorage.removeItem(`${STORAGE_KEY}_${userId}`);
  console.log('🗑️ Peak time analysis cleared');
}

export default {
  analyzePeakTimes,
  getCachedPeakTimeAnalysis,
  getPeakTimeRecommendation,
  getPeakTimeSummary,
  clearPeakTimeAnalysis,
};
