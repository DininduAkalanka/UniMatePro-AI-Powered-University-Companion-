import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS_V2, ELEVATION, RADIUS, SPACING, TYPOGRAPHY } from '../../../constants/designSystem';
import { ILLUSTRATIONS } from '../../../constants/illustrations';
import { getCurrentUser } from '../../../services/authService';
import { deleteCourse, getCourses } from '../../../services/courseServiceFirestore';
import { getTasks } from '../../../services/taskServiceFirestore';
import { Course, Task, TaskStatus } from '../../../types';

export default function AllCoursesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // ✅ PERFORMANCE: Prevent setState on unmounted component
  const mountedRef = React.useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Auto-refresh when screen comes into focus (e.g., after adding/deleting course)
  useFocusEffect(
    useCallback(() => {
      if (mountedRef.current) {
        loadData();
      }
    }, [])
  );

  // ✅ PERFORMANCE: Memoize loadData
  const loadData = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.error('No user found');
        if (mountedRef.current) {
          router.replace('/');
        }
        return;
      }

      const [coursesData, tasksData] = await Promise.all([
        getCourses(user.id),
        getTasks(user.id),
      ]);

      if (mountedRef.current) {
        setCourses(coursesData);
        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [router]);

  // ✅ PERFORMANCE: Memoize onRefresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleDeleteCourse = (course: Course) => {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete "${course.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCourse(course.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadData();
            } catch (error) {
              console.error('Error deleting course:', error);
              Alert.alert('Error', 'Failed to delete course');
            }
          },
        },
      ]
    );
  };

  // ✅ PERFORMANCE: Memoize renderCourseCard with useCallback
  const renderCourseCard = useCallback(({ item: course }: { item: Course }) => {
    const courseTasks = tasks.filter(t => t.courseId === course.id);
    const completedTasks = courseTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const pendingTasks = courseTasks.length - completedTasks;
    const completionRate = courseTasks.length > 0 
      ? Math.round((completedTasks / courseTasks.length) * 100) 
      : 0;

    return (
      <TouchableOpacity
        style={styles.courseCard}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/tasks?courseId=${course.id}` as any);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.courseColorBar, { backgroundColor: course.color || COLORS_V2.primary[500] }]} />
        
        <View style={styles.courseContent}>
          <View style={styles.courseHeader}>
            <View style={styles.courseInfo}>
              <Text style={styles.courseCode}>{course.code}</Text>
              {course.credits && (
                <View style={[styles.creditsBadge, { backgroundColor: course.color || COLORS_V2.primary[500] }]}>
                  <Text style={styles.creditsText}>{course.credits} CR</Text>
                </View>
              )}
            </View>
            <View style={styles.courseHeaderActions}>
              {course.difficulty && (
                <View style={styles.difficultyContainer}>
                  {[...Array(5)].map((_, index) => (
                    <Text
                      key={index}
                      style={[
                        styles.difficultyStar,
                        { opacity: index < course.difficulty! ? 1 : 0.3 }
                      ]}
                    >
                      ⭐
                    </Text>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteCourse(course);
                }}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS_V2.error[500]} />
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={styles.courseName} numberOfLines={2}>
            {course.name}
          </Text>
          
          {course.instructor && (
            <Text style={styles.courseInstructor} numberOfLines={1}>
              👨‍🏫 {course.instructor}
            </Text>
          )}

          <View style={styles.courseStats}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{courseTasks.length}</Text>
              <Text style={styles.statLabel}>Tasks</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: COLORS_V2.success[500] }]}>
                {completedTasks}
              </Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: COLORS_V2.warning[500] }]}>
                {pendingTasks}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: COLORS_V2.primary[500] }]}>
                {completionRate}%
              </Text>
              <Text style={styles.statLabel}>Rate</Text>
            </View>
          </View>

          <View style={styles.courseActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: course.color || COLORS_V2.primary[500] }]}
              onPress={(e) => {
                e.stopPropagation();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push(`/tasks/add?courseId=${course.id}` as any);
              }}
            >
              <Text style={styles.actionText}>+ Add Task</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={(e) => {
                e.stopPropagation();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/tasks?courseId=${course.id}` as any);
              }}
            >
              <Text style={[styles.actionText, { color: COLORS_V2.primary[500] }]}>
                View Tasks
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [tasks, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS_V2.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Courses</Text>
        <TouchableOpacity
          onPress={() => router.push('/courses/add' as any)}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={COLORS_V2.primary[600]} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        renderItem={renderCourseCard}
        contentContainerStyle={styles.listContent}
        // ✅ PERFORMANCE: FlatList optimizations for 60fps scrolling
        getItemLayout={(data, index) => ({
          length: 200, // Approximate course card height
          offset: 200 * index,
          index,
        })}
        windowSize={5}
        maxToRenderPerBatch={8}
        initialNumToRender={8}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Image 
              source={ILLUSTRATIONS.emptyCourses}
              style={styles.emptyImage}
              contentFit="contain"
            />
            <Text style={styles.emptyTitle}>No courses yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first course to get started
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/courses/add' as any)}
            >
              <Text style={styles.emptyButtonText}>+ Add Course</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS_V2.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS_V2.surface.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS_V2.border.light,
    ...ELEVATION.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.headlineSmall,
    color: COLORS_V2.text.primary,
    fontWeight: '700',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.lg,
  },
  courseCard: {
    backgroundColor: COLORS_V2.surface.base,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...ELEVATION.md,
  },
  courseColorBar: {
    height: 6,
    width: '100%',
  },
  courseContent: {
    padding: SPACING.lg,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  courseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS_V2.error[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseCode: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS_V2.text.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginRight: SPACING.sm,
  },
  creditsBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  creditsText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS_V2.text.inverse,
    fontWeight: '700',
  },
  difficultyContainer: {
    flexDirection: 'row',
  },
  difficultyStar: {
    fontSize: 12,
    marginHorizontal: 1,
  },
  courseName: {
    ...TYPOGRAPHY.titleMedium,
    color: COLORS_V2.text.primary,
    marginBottom: SPACING.xs,
    lineHeight: 22,
  },
  courseInstructor: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS_V2.text.secondary,
    marginBottom: SPACING.md,
  },
  courseStats: {
    flexDirection: 'row',
    backgroundColor: COLORS_V2.background.tertiary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...TYPOGRAPHY.titleMedium,
    color: COLORS_V2.text.primary,
    fontWeight: '700',
    marginBottom: SPACING.xs / 2,
  },
  statLabel: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS_V2.text.secondary,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  courseActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: COLORS_V2.background.tertiary,
  },
  actionText: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS_V2.text.inverse,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.massive,
    paddingHorizontal: SPACING.xl,
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: SPACING.xl,
  },
  emptyTitle: {
    ...TYPOGRAPHY.headlineSmall,
    color: COLORS_V2.text.primary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS_V2.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  emptyButton: {
    backgroundColor: COLORS_V2.primary[500],
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    ...ELEVATION.md,
  },
  emptyButtonText: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS_V2.text.inverse,
    fontWeight: '700',
  },
});
