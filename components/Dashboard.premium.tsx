
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS_V2, ELEVATION, RADIUS, SPACING, TYPOGRAPHY } from '../constants/designSystem';
import { ILLUSTRATIONS } from '../constants/illustrations';
import { globalCache, useOptimizedData } from '../hooks/useOptimizedData';
import { getCourses } from '../services/courseServiceFirestore';
import {
  aggregateDashboardAlerts,
  clearAlertsCache,
  SmartAlert,
} from '../services/notificationAggregator';
import { predictDeadlineRisks } from '../services/predictionService';
import { getStudyStats } from '../services/studyServiceFirestore';
import { getTasks } from '../services/taskServiceFirestore';
import { Course, DeadlinePrediction, Task, TaskStatus } from '../types';
import {
  CompactNotificationBanner,
  MinimalNotificationBanner,
  PremiumNotificationBanner,
  SmartNotificationBanner,
} from './SmartNotificationBanner';
import { CourseCard } from './ui/CourseCard';
import { Skeleton, SkeletonCard, SkeletonStatCard } from './ui/Skeleton';
import { StatCard } from './ui/StatCard';
import { TaskCard } from './ui/TaskCard';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - SPACING.xl * 2;

interface DashboardProps {
  userId: string;
  bannerStyle?: 'standard' | 'minimal' | 'premium' | 'compact';
}

// Memoized components
const MemoizedStatCard = memo(StatCard);
const MemoizedTaskCard = memo(TaskCard);
const MemoizedCourseCard = memo(CourseCard);

// ✅ SMART TIME-BASED GREETING
function getTimeBasedGreeting(): { emoji: string; greeting: string; message: string } {
  const hour = new Date().getHours();
  
  if (hour < 5) {
    return { 
      emoji: '🌙', 
      greeting: 'Burning the midnight oil?', 
      message: "Don't forget to rest!" 
    };
  } else if (hour < 12) {
    return { 
      emoji: '☀️', 
      greeting: 'Good morning!', 
      message: "Let's make today count" 
    };
  } else if (hour < 17) {
    return { 
      emoji: '🌤️', 
      greeting: 'Good afternoon!', 
      message: "You're doing great" 
    };
  } else if (hour < 22) {
    return { 
      emoji: '🌆', 
      greeting: 'Good evening!', 
      message: "Almost there, keep going" 
    };
  } else {
    return { 
      emoji: '🌃', 
      greeting: 'Working late?', 
      message: "Rest is important too" 
    };
  }
}

// ✅ PROGRESS RING COMPONENT
const ProgressRing = memo(({ 
  percentage, 
  size = 56,
}: { 
  percentage: number;
  size?: number;
}) => {
  return (
    <View style={[styles.progressRingContainer, { width: size, height: size }]}>
      <View style={styles.progressRingBackground}>
        <View 
          style={[
            styles.progressRingFill,
            { 
              height: `${percentage}%`,
            }
          ]} 
        />
      </View>
      <View style={styles.progressRingCenter}>
        <Text style={styles.progressRingText}>{percentage}%</Text>
      </View>
    </View>
  );
});

// ✅ COMPACT QUICK ACTION CHIP
const QuickActionChip = memo(({ 
  icon, 
  label, 
  onPress,
  color = COLORS_V2.primary[500],
}: { 
  icon: string; 
  label: string; 
  onPress: () => void;
  color?: string;
}) => (
  <TouchableOpacity
    style={styles.quickChip}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }}
    activeOpacity={0.7}
  >
    <View style={[styles.quickChipIconContainer, { backgroundColor: `${color}15` }]}>
      <Text style={styles.quickChipIcon}>{icon}</Text>
    </View>
    <Text style={styles.quickChipLabel} numberOfLines={1}>{label}</Text>
    <Ionicons name="chevron-forward" size={16} color={COLORS_V2.text.tertiary} />
  </TouchableOpacity>
));

// ✅ FLOATING ACTION BUTTON
const FloatingActionButton = memo(({ onPress }: { onPress: () => void }) => (
  <MotiView
    from={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', delay: 400, damping: 15 }}
    style={styles.fab}
  >
    <TouchableOpacity
      style={styles.fabButton}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#8B5CF6', '#6366F1']}
        style={styles.fabGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="sparkles" size={26} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>
  </MotiView>
));

export default function DashboardPremium({ 
  userId,
  bannerStyle = 'standard' 
}: DashboardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [studyStats, setStudyStats] = useState<any>(null);
  const [predictions, setPredictions] = useState<DeadlinePrediction[]>([]);
  
  // ✅ NEW: Smart Alerts State
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  
  // ✅ PERFORMANCE: Prevent setState on unmounted component
  const mountedRef = React.useRef(true);

  const { courseMap, taskStatsByCourse, tasksByStatus, globalStats } = useOptimizedData(tasks, courses);

  useEffect(() => {
    mountedRef.current = true;
    loadDashboardData();
    loadSmartAlerts();
    
    return () => {
      mountedRef.current = false;
    };
  }, [userId]);

  // ✅ PERFORMANCE: Memoize loadDashboardData to prevent recreation
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('[Dashboard.premium] Loading tasks...');
      const tasksData = await getTasks(userId);
      console.log('[Dashboard.premium] Tasks loaded:', tasksData.length);
      
      console.log('[Dashboard.premium] Loading courses...');
      const coursesData = await getCourses(userId);
      console.log('[Dashboard.premium] Courses loaded:', coursesData.length);
      
      console.log('[Dashboard.premium] Loading study stats...');
      let studyData = null;
      try {
        studyData = await getStudyStats(userId, 7);
        console.log('[Dashboard.premium] Study stats loaded');
      } catch (studyStatsError) {
        console.warn('[Dashboard.premium] Failed to load study stats:', studyStatsError);
        studyData = {
          totalHours: 0,
          totalSessions: 0,
          averageSessionDuration: 0,
          mostStudiedCourse: null,
          studyStreak: 0,
        };
      }

      // ✅ PERFORMANCE: Check mounted before setState
      if (!mountedRef.current) return;
      
      setTasks(tasksData);
      setCourses(coursesData);
      setStudyStats(studyData);

      console.log('[Dashboard.premium] Filtering upcoming tasks...');
      const upcomingTasks = tasksData
        .filter(t => t.status !== TaskStatus.COMPLETED && t.dueDate > new Date())
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
        .slice(0, 5);
      
      if (upcomingTasks.length > 0) {
        console.log('[Dashboard.premium] Loading predictions for', upcomingTasks.length, 'tasks...');
        const predictionsData = await predictDeadlineRisks(upcomingTasks);
        console.log('[Dashboard.premium] Predictions loaded:', predictionsData.length);
        
        if (mountedRef.current) {
          setPredictions(predictionsData.slice(0, 3));
        }
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [userId]);

  // ✅ PERFORMANCE: Memoize loadSmartAlerts
  const loadSmartAlerts = useCallback(async () => {
    try {
      setAlertsLoading(true);
      console.log('[Dashboard.premium] Loading smart alerts...');
      const alertsData = await aggregateDashboardAlerts(userId);
      
      if (mountedRef.current) {
        setSmartAlerts(alertsData.alerts);
        console.log('[Dashboard.premium] Smart alerts loaded:', alertsData.summary);
      }
    } catch (error) {
      console.error('Error loading smart alerts:', error);
      if (mountedRef.current) {
        setSmartAlerts([]);
      }
    } finally {
      if (mountedRef.current) {
        setAlertsLoading(false);
      }
    }
  }, [userId]);

  // ✅ NEW: Handle Alert Dismissal
  const handleDismissAlert = useCallback((alertId: string) => {
    setSmartAlerts(prev => prev.filter(a => a.id !== alertId));
    // Optionally: Save dismissal to AsyncStorage/Firestore
  }, []);

  // ✅ PERFORMANCE: Optimized refresh with debounce
  const lastRefreshRef = React.useRef(0);
  const onRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 1000) return; // Debounce
    
    lastRefreshRef.current = now;
    setRefreshing(true);
    globalCache.clear();
    clearAlertsCache(userId);
    
    Promise.all([
      loadDashboardData(),
      loadSmartAlerts(),
    ]).finally(() => {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    });
  }, [userId, loadDashboardData, loadSmartAlerts]);

  const upcomingTasks = useMemo(() => 
    tasksByStatus.upcoming,
    [tasksByStatus.upcoming]
  );

  const greeting = useMemo(() => getTimeBasedGreeting(), []);

  const completionPercentage = useMemo(() => {
    if (globalStats.total === 0) return 0;
    return Math.round((globalStats.completed / globalStats.total) * 100);
  }, [globalStats]);

  // ✅ NEW: Render Banner Based on Style
  const renderNotificationBanner = () => {
    if (alertsLoading && smartAlerts.length === 0) {
      return (
        <View style={styles.bannerContainer}>
          <Skeleton height={80} borderRadius={RADIUS.lg} />
        </View>
      );
    }

    switch (bannerStyle) {
      case 'minimal':
        return (
          <View style={styles.bannerContainer}>
            <MinimalNotificationBanner
              alerts={smartAlerts}
              onDismiss={handleDismissAlert}
            />
          </View>
        );
      
      case 'premium':
        return (
          <View style={styles.bannerContainer}>
            <PremiumNotificationBanner
              alerts={smartAlerts}
              onDismiss={handleDismissAlert}
              onRefresh={loadSmartAlerts}
            />
          </View>
        );
      
      case 'compact':
        return (
          <View style={styles.bannerContainer}>
            <CompactNotificationBanner
              alerts={smartAlerts}
              onDismiss={handleDismissAlert}
            />
          </View>
        );
      
      default:
        return (
          <View style={styles.bannerContainer}>
            <SmartNotificationBanner
              alerts={smartAlerts}
              onDismiss={handleDismissAlert}
              onRefresh={loadSmartAlerts}
              autoRotate={true}
              autoRotateInterval={5000}
            />
          </View>
        );
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.header}>
            <Skeleton height={160} borderRadius={0} />
          </View>
          
          <View style={styles.statsSection}>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </View>
          
          <View style={styles.section}>
            <Skeleton width={200} height={24} style={{ marginBottom: SPACING.md }} />
            <SkeletonCard />
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ✅ ENHANCED HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.greetingEmoji}>{greeting.emoji}</Text>
              <View>
                <Text style={styles.greetingText}>{greeting.greeting}</Text>
                <Text style={styles.greetingSubtext}>{greeting.message}</Text>
              </View>
            </View>
            
            <ProgressRing 
              percentage={completionPercentage}
              size={56}
            />
          </View>
          
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>

        {/* ✅ SMART NOTIFICATION BANNER - REPLACES OLD INSIGHT BANNER */}
        {renderNotificationBanner()}

        {/* ✅ COMPACT STATS */}
        <View style={styles.statsSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScroll}
          >
            <MemoizedStatCard
              icon="📋"
              value={globalStats.total}
              label="Total"
              backgroundImage={undefined}
              gradientColors={[COLORS_V2.primary[400], COLORS_V2.primary[600]]}
              delay={0}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/tasks' as any);
              }}
            />
            
            <MemoizedStatCard
              icon="✓"
              value={globalStats.completed}
              label="Done"
              backgroundImage={undefined}
              gradientColors={[COLORS_V2.success[400], COLORS_V2.success[600]]}
              delay={50}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/tasks?filter=completed' as any);
              }}
            />
            
            <MemoizedStatCard
              icon="⚠️"
              value={globalStats.overdue}
              label="Overdue"
              backgroundImage={undefined}
              gradientColors={[COLORS_V2.error[400], COLORS_V2.error[600]]}
              delay={100}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/tasks?filter=overdue' as any);
              }}
            />

            {studyStats && studyStats.totalHours > 0 && (
              <MemoizedStatCard
                icon="📚"
                value={Math.round(studyStats.totalHours)}
                label="Study Hours"
                backgroundImage={undefined}
                gradientColors={[COLORS_V2.info[400], COLORS_V2.info[600]]}
                delay={150}
              />
            )}
          </ScrollView>
        </View>

        {/* ✅ QUICK ACTIONS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            <QuickActionChip
              icon="⏱️"
              label="Study Session"
              onPress={() => router.push('/study-session')}
              color="#10B981"
            />
            <QuickActionChip
              icon="➕"
              label="Add Task"
              onPress={() => router.push('/tasks/add' as any)}
              color={COLORS_V2.primary[500]}
            />
            <QuickActionChip
              icon="📚"
              label="Add Course"
              onPress={() => router.push('/courses/add' as any)}
              color={COLORS_V2.secondary[500]}
            />
            <QuickActionChip
              icon="📅"
              label="Study Planner"
              onPress={() => router.push('/planner' as any)}
              color={COLORS_V2.info[500]}
            />
            <QuickActionChip
              icon="🕐"
              label="Timetable"
              onPress={() => router.push('/timetable' as any)}
              color={COLORS_V2.warning[500]}
            />
          </View>
        </View>

        {/* ✅ MY COURSES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📚 My Courses</Text>
            {courses.length > 3 && (
              <TouchableOpacity onPress={() => router.push('/courses' as any)}>
                <Text style={styles.seeAllButton}>See All ({courses.length}) →</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {courses.length === 0 ? (
            <TouchableOpacity 
              style={styles.emptyState}
              onPress={() => router.push('/courses/add' as any)}
            >
              <Image 
                source={ILLUSTRATIONS.emptyCourses}
                style={styles.emptyImage}
                contentFit="contain"
              />
              <Text style={styles.emptyTitle}>No courses yet</Text>
              <Text style={styles.emptySubtitle}>Tap to add your first course</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.coursesScroll}
            >
              {courses.slice(0, 3).map((course, index) => {
                const courseStats = taskStatsByCourse.get(course.id) || { total: 0, completed: 0, pending: 0 };
                
                return (
                  <MemoizedCourseCard
                    key={course.id}
                    course={course}
                    backgroundImage={ILLUSTRATIONS[`heroStudy${(index % 7) + 1}` as keyof typeof ILLUSTRATIONS]}
                    totalTasks={courseStats.total}
                    completedTasks={courseStats.completed}
                    pendingTasks={courseStats.pending}
                    onPress={() => router.push(`/tasks?courseId=${course.id}` as any)}
                    onAddTask={() => router.push(`/tasks/add?courseId=${course.id}` as any)}
                    delay={0}
                  />
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ✅ AT-RISK TASKS */}
        {predictions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="alert-circle" size={20} color={COLORS_V2.error[500]} />
                <Text style={styles.sectionTitle}>Needs Attention</Text>
              </View>
            </View>
            
            {predictions.map((prediction, index) => {
              const task = tasks.find(t => t.id === prediction.taskId);
              if (!task) return null;
              
              const riskColor = 
                prediction.riskLevel === 'high' ? COLORS_V2.error[500] :
                prediction.riskLevel === 'medium' ? COLORS_V2.warning[500] :
                COLORS_V2.success[500];

              return (
                <TouchableOpacity
                  key={prediction.taskId}
                  style={[styles.atRiskCard, { borderLeftColor: riskColor }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/tasks/${task.id}` as any);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.atRiskHeader}>
                    <Text style={styles.atRiskTitle} numberOfLines={1}>{task.title}</Text>
                    <View style={[styles.riskBadge, { backgroundColor: `${riskColor}20` }]}>
                      <Text style={[styles.riskBadgeText, { color: riskColor }]}>
                        {prediction.riskLevel.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.atRiskPrediction} numberOfLines={2}>
                    {prediction.prediction}
                  </Text>
                  <View style={styles.atRiskFooter}>
                    <Text style={styles.atRiskDays}>{prediction.daysRemaining} days left</Text>
                    <Text style={styles.atRiskHours}>
                      {prediction.recommendedHoursPerDay.toFixed(1)}h/day needed
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ✅ UPCOMING TASKS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
            <TouchableOpacity onPress={() => router.push('/tasks' as any)}>
              <Text style={styles.seeAllButton}>See All →</Text>
            </TouchableOpacity>
          </View>
          
          {upcomingTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Image 
                source={ILLUSTRATIONS.taskComplete}
                style={styles.emptyImage}
                contentFit="contain"
              />
              <Text style={styles.emptyTitle}>All clear! 🎉</Text>
              <Text style={styles.emptySubtitle}>No upcoming tasks. Time to relax!</Text>
            </View>
          ) : (
            <>
              {upcomingTasks.slice(0, showAllTasks ? undefined : 3).map((task, index) => {
                const course = courseMap.get(task.courseId);
                
                return (
                  <MemoizedTaskCard
                    key={task.id}
                    task={task}
                    courseName={course?.name}
                    courseColor={course?.color}
                    onPress={() => router.push(`/tasks/${task.id}` as any)}
                    delay={index * 50}
                  />
                );
              })}
              
              {upcomingTasks.length > 3 && !showAllTasks && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => setShowAllTasks(true)}
                >
                  <Text style={styles.showMoreText}>
                    Show {upcomingTasks.length - 3} more tasks
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={COLORS_V2.primary[500]} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ✅ FLOATING ACTION BUTTON */}
      <FloatingActionButton 
        onPress={() => router.push('/chat')}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS_V2.background.primary,
  },
  loadingContainer: {
    flex: 1,
  },
  
  // Header
  header: {
    padding: SPACING.xl,
    paddingTop: Platform.OS === 'ios' ? SPACING.massive : SPACING.xl,
    backgroundColor: COLORS_V2.surface.base,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  greetingEmoji: {
    fontSize: 40,
    marginRight: SPACING.md,
  },
  greetingText: {
    ...TYPOGRAPHY.headlineSmall,
    color: COLORS_V2.text.primary,
    marginBottom: 2,
  },
  greetingSubtext: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS_V2.text.secondary,
  },
  dateText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS_V2.text.secondary,
    marginTop: SPACING.xs,
  },
  
  // Progress Ring
  progressRingContainer: {
    borderRadius: 100,
    overflow: 'hidden',
    backgroundColor: COLORS_V2.background.tertiary,
    ...ELEVATION.sm,
  },
  progressRingBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  progressRingFill: {
    backgroundColor: COLORS_V2.primary[500],
    width: '100%',
    borderRadius: 100,
  },
  progressRingCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingText: {
    ...TYPOGRAPHY.labelSmall,
    fontWeight: '700',
    color: COLORS_V2.text.primary,
  },
  
  // ✅ NEW: Banner Container
  bannerContainer: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
  },
  
  // Stats
  statsSection: {
    marginTop: SPACING.lg,
  },
  statsScroll: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  
  // Courses
  coursesScroll: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  
  // Section
  section: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sectionTitle: {
    ...TYPOGRAPHY.titleLarge,
    color: COLORS_V2.text.primary,
    fontWeight: '700',
  },
  seeAllButton: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS_V2.primary[600],
    fontWeight: '600',
  },
  
  // Quick Actions
  quickActionsContainer: {
    gap: SPACING.sm,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS_V2.surface.base,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...ELEVATION.sm,
    minHeight: 56,
  },
  quickChipIconContainer: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  quickChipIcon: {
    fontSize: 20,
  },
  quickChipLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS_V2.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  
  // At-Risk Cards
  atRiskCard: {
    backgroundColor: COLORS_V2.surface.base,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    ...ELEVATION.md,
  },
  atRiskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  atRiskTitle: {
    ...TYPOGRAPHY.titleMedium,
    color: COLORS_V2.text.primary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  riskBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  riskBadgeText: {
    ...TYPOGRAPHY.labelSmall,
    fontWeight: '700',
  },
  atRiskPrediction: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS_V2.text.secondary,
    marginBottom: SPACING.sm,
  },
  atRiskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  atRiskDays: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS_V2.text.tertiary,
  },
  atRiskHours: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS_V2.primary[600],
    fontWeight: '600',
  },
  
  // Show More
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS_V2.background.secondary,
    borderRadius: RADIUS.md,
  },
  showMoreText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS_V2.primary[600],
    marginRight: SPACING.xs,
    fontWeight: '600',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xxl,
    backgroundColor: COLORS_V2.surface.base,
    borderRadius: RADIUS.xl,
    ...ELEVATION.sm,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    ...TYPOGRAPHY.titleMedium,
    color: COLORS_V2.text.primary,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS_V2.text.secondary,
    textAlign: 'center',
  },
  
  // FAB
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 110 : 90,
    right: 24,
    zIndex: 999,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    ...ELEVATION.xl,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
