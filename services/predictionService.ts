import { STUDY_CONFIG } from '../constants/config';
import { DeadlinePrediction, Task, TaskStatus } from '../types';
import { getStudySessionsByCourse } from './studyServiceFirestore';

/**
 * Predict if a task is at risk of missing deadline
 */
export const predictDeadlineRisk = async (task: Task): Promise<DeadlinePrediction> => {
  const now = new Date();
  const daysRemaining = Math.ceil((task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining < 0) {
    return {
      taskId: task.id,
      isAtRisk: true,
      riskLevel: 'high',
      recommendedHoursPerDay: 0,
      daysRemaining: 0,
      completionPercentage: 0,
      prediction: 'This task is already overdue!',
    };
  }

  const estimatedHours = task.estimatedHours || 0;
  const completedHours = task.completedHours || 0;
  const remainingHours = estimatedHours - completedHours;
  const completionPercentage = estimatedHours > 0 ? (completedHours / estimatedHours) * 100 : 0;

  if (daysRemaining === 0) {
    return {
      taskId: task.id,
      isAtRisk: remainingHours > STUDY_CONFIG.maxStudyHoursPerDay,
      riskLevel: remainingHours > STUDY_CONFIG.maxStudyHoursPerDay ? 'high' : 'medium',
      recommendedHoursPerDay: remainingHours,
      daysRemaining: 0,
      completionPercentage,
      prediction: `You have less than 24 hours left! Need ${remainingHours.toFixed(1)} more hours.`,
    };
  }

  const hoursPerDay = remainingHours / daysRemaining;
  
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  let isAtRisk = false;

  if (hoursPerDay > STUDY_CONFIG.maxStudyHoursPerDay) {
    riskLevel = 'high';
    isAtRisk = true;
  } else if (hoursPerDay > STUDY_CONFIG.maxStudyHoursPerDay * 0.7) {
    riskLevel = 'medium';
    isAtRisk = true;
  }

  let prediction = '';
  if (isAtRisk) {
    prediction = `Warning: You need ${hoursPerDay.toFixed(1)} hours per day for ${daysRemaining} days. Consider extending your study time or asking for help.`;
  } else {
    prediction = `On track! Study ${hoursPerDay.toFixed(1)} hours per day to complete on time.`;
  }

  return {
    taskId: task.id,
    isAtRisk,
    riskLevel,
    recommendedHoursPerDay: hoursPerDay,
    daysRemaining,
    completionPercentage,
    prediction,
  };
};

/**
 * Predict deadline risk for multiple tasks
 */
export const predictDeadlineRisks = async (tasks: Task[]): Promise<DeadlinePrediction[]> => {
  const predictions = await Promise.all(
    tasks.map(task => predictDeadlineRisk(task))
  );
  
  return predictions.sort((a, b) => {
    // Sort by risk level: high > medium > low
    const riskOrder = { high: 3, medium: 2, low: 1 };
    return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
  });
};

/**
 * Calculate completion probability based on historical data
 */
export const calculateCompletionProbability = async (
  task: Task,
  userId: string
): Promise<number> => {
  const now = new Date();
  const daysRemaining = Math.ceil((task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining <= 0) return 0;

  const estimatedHours = task.estimatedHours || 0;
  const completedHours = task.completedHours || 0;
  const remainingHours = estimatedHours - completedHours;

  // Get historical study data for this course
  const sessions = await getStudySessionsByCourse(task.courseId);
  
  if (sessions.length === 0) {
    // No historical data, use default calculation
    const hoursPerDay = remainingHours / daysRemaining;
    return hoursPerDay <= STUDY_CONFIG.maxStudyHoursPerDay ? 75 : 50;
  }

  // Calculate average study hours per day from history
  const totalMinutes = sessions.reduce((sum, session) => sum + session.duration, 0);
  const avgHoursPerDay = (totalMinutes / 60) / sessions.length;

  // Project based on historical average
  const projectedHours = avgHoursPerDay * daysRemaining;
  const probability = Math.min(100, (projectedHours / remainingHours) * 100);

  return Math.round(probability);
};

/**
 * Generate study recommendation based on risk
 */
export const generateStudyRecommendation = async (
  prediction: DeadlinePrediction,
  task: Task
): Promise<string> => {
  const { riskLevel, recommendedHoursPerDay, daysRemaining } = prediction;

  if (riskLevel === 'high') {
    return `🚨 High Priority: This task requires immediate attention! Break it into smaller chunks and dedicate ${Math.ceil(recommendedHoursPerDay)} hours daily. Consider:
- Starting study sessions early in the day
- Using Pomodoro technique (25-min focus sessions)
- Eliminating distractions
- Seeking help from classmates or instructors if stuck`;
  }

  if (riskLevel === 'medium') {
    return `⚠️ Medium Priority: Stay focused to complete on time. Plan ${Math.ceil(recommendedHoursPerDay)} hours of study per day for the next ${daysRemaining} days. Tips:
- Create a detailed study schedule
- Take regular breaks (15 min every hour)
- Review notes before each session
- Track your progress daily`;
  }

  return `✅ Low Priority: You're on track! Maintain ${Math.ceil(recommendedHoursPerDay)} hours daily. Keep up the good work:
- Continue with consistent study habits
- Use extra time for practice problems
- Create summary notes for quick revision
- Stay organized and prepared`;
};

/**
 * Analyze overall workload and provide insights
 */
export const analyzeWorkload = async (
  tasks: Task[],
  userId: string
): Promise<{
  totalHoursNeeded: number;
  averageHoursPerDay: number;
  isOverloaded: boolean;
  recommendation: string;
}> => {
  const incompleteTasks = tasks.filter(t => t.status !== TaskStatus.COMPLETED);
  
  let totalHoursNeeded = 0;
  let earliestDeadline = new Date();
  earliestDeadline.setFullYear(earliestDeadline.getFullYear() + 1); // Far future

  for (const task of incompleteTasks) {
    const remaining = (task.estimatedHours || 0) - (task.completedHours || 0);
    totalHoursNeeded += remaining;
    
    if (task.dueDate < earliestDeadline) {
      earliestDeadline = task.dueDate;
    }
  }

  const now = new Date();
  const daysUntilEarliestDeadline = Math.max(1, Math.ceil((earliestDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  
  const averageHoursPerDay = totalHoursNeeded / daysUntilEarliestDeadline;
  const isOverloaded = averageHoursPerDay > STUDY_CONFIG.maxStudyHoursPerDay;

  let recommendation = '';
  if (isOverloaded) {
    recommendation = `⚠️ You're overloaded! You have ${totalHoursNeeded.toFixed(1)} hours of work spread across ${incompleteTasks.length} tasks. This requires ${averageHoursPerDay.toFixed(1)} hours/day, which exceeds the recommended ${STUDY_CONFIG.maxStudyHoursPerDay} hours.

Recommendations:
1. Prioritize tasks by deadline and importance
2. Consider requesting deadline extensions if possible
3. Seek help from study groups or tutors
4. Focus on high-impact tasks first
5. Eliminate non-essential commitments temporarily`;
  } else if (averageHoursPerDay > STUDY_CONFIG.minStudyHoursPerDay * 2) {
    recommendation = `📚 Moderate workload: You need ${averageHoursPerDay.toFixed(1)} hours/day. It's manageable with good planning:
1. Create a detailed daily schedule
2. Start with the most challenging tasks
3. Use time-blocking techniques
4. Take regular breaks to maintain focus`;
  } else {
    recommendation = `✅ Light workload: You need ${averageHoursPerDay.toFixed(1)} hours/day. You have good control:
1. Maintain consistent study habits
2. Use extra time for deep learning
3. Help peers or join study groups
4. Prepare for future assignments early`;
  }

  return {
    totalHoursNeeded,
    averageHoursPerDay,
    isOverloaded,
    recommendation,
  };
};

export default {
  predictDeadlineRisk,
  predictDeadlineRisks,
  calculateCompletionProbability,
  generateStudyRecommendation,
  analyzeWorkload,
};
