import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS_V2, ELEVATION, RADIUS, SPACING, TYPOGRAPHY } from '../../../constants/designSystem';
import { ILLUSTRATIONS } from '../../../constants/illustrations';
import { getCurrentUser } from '../../../services/authService';
import { getCourses } from '../../../services/courseServiceFirestore';
import { getTasks } from '../../../services/taskServiceFirestore';
import { Course, Task, TaskStatus } from '../../../types';

export default function TasksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  
  // ✅ PERFORMANCE: Prevent setState on unmounted component
  const mountedRef = React.useRef(true);
  
  // Get courseId from URL params if navigating from a specific course
  const selectedCourseId = params.courseId as string | undefined;

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    // Set filter from URL parameter
    if (params.filter) {
      setFilter(params.filter as 'all' | 'pending' | 'completed' | 'overdue');
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [params.filter, params.courseId]);

  // Auto-refresh when screen comes into focus (after add/delete)
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
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        if (mountedRef.current) {
          router.replace('/');
        }
        return;
      }

      const [tasksData, coursesData] = await Promise.all([
        getTasks(user.id),
        getCourses(user.id),
      ]);

      if (mountedRef.current) {
        setTasks(tasksData);
        setCourses(coursesData);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [router]);

  // ✅ PERFORMANCE: Memoize filtered tasks to prevent unnecessary recalculations
  const filteredTasks = useMemo(() => {
    // Filter by courseId first if specified
    const courseFiltered = selectedCourseId
      ? tasks.filter((task) => task.courseId === selectedCourseId)
      : tasks;

    // Filter by status
    const statusFiltered = courseFiltered.filter((task) => {
      if (filter === 'pending') return task.status !== TaskStatus.COMPLETED;
      if (filter === 'completed') return task.status === TaskStatus.COMPLETED;
      if (filter === 'overdue') {
        const isOverdue = new Date(task.dueDate) < new Date() && task.status !== TaskStatus.COMPLETED;
        return isOverdue;
      }
      return true;
    });
    
    // Sort
    return statusFiltered.sort((a, b) => {
      // When viewing specific course tasks, sort by creation date (newest first)
      if (selectedCourseId) {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Newest first
      }
      
      // For all tasks view, sort by status and due date
      if (filter === 'completed') {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      }
      // For other filters in all tasks view, sort by due date (earliest first)
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks, filter, selectedCourseId]);

  const getCourseById = (courseId: string) => {
    return courses.find((c) => c.id === courseId);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS_V2.primary[600]} />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Get selected course info for header
  const selectedCourse = selectedCourseId ? getCourseById(selectedCourseId) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS_V2.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {selectedCourse ? selectedCourse.name : 'All Tasks'}
            </Text>
            {selectedCourse && (
              <Text style={styles.headerSubtitle}>{selectedCourse.code}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push(selectedCourseId ? `/tasks/add?courseId=${selectedCourseId}` : '/tasks/add')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
        style={styles.filterScrollView}
      >
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilter('all');
          }}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({(selectedCourseId ? tasks.filter((t: Task) => t.courseId === selectedCourseId) : tasks).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilter('pending');
          }}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending ({(selectedCourseId ? tasks.filter((t: Task) => t.courseId === selectedCourseId) : tasks).filter((t: Task) => t.status !== TaskStatus.COMPLETED).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilter('completed');
          }}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Completed ({(selectedCourseId ? tasks.filter((t: Task) => t.courseId === selectedCourseId) : tasks).filter((t: Task) => t.status === TaskStatus.COMPLETED).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'overdue' && styles.filterTabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilter('overdue');
          }}
        >
          <Text style={[styles.filterText, filter === 'overdue' && styles.filterTextActive]}>
            Overdue ({(selectedCourseId ? tasks.filter((t: Task) => t.courseId === selectedCourseId) : tasks).filter((t: Task) => new Date(t.dueDate) < new Date() && t.status !== TaskStatus.COMPLETED).length})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Image
            source={ILLUSTRATIONS.taskPending}
            style={styles.emptyImage}
            contentFit="contain"
          />
          <Text style={styles.emptyTitle}>No tasks found</Text>
          <Text style={styles.emptySubtitle}>
            {filter === 'completed'
              ? 'No completed tasks yet'
              : 'Tap + to add your first task'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          // ✅ PERFORMANCE: FlatList optimizations for 60fps scrolling
          getItemLayout={(data, index) => ({
            length: 120, // Approximate task card height
            offset: 120 * index,
            index,
          })}
          windowSize={5} // Render 5 screen heights (2 above, 2 below, 1 visible)
          maxToRenderPerBatch={10} // Items per render batch
          initialNumToRender={10} // Initial items to render
          removeClippedSubviews={true} // Unmount off-screen views (Android)
          updateCellsBatchingPeriod={50} // Batch updates every 50ms
          renderItem={({ item: task }) => {
            const course = getCourseById(task.courseId);
            const isOverdue = task.dueDate < new Date() && task.status !== TaskStatus.COMPLETED;

            return (
              <TouchableOpacity
                style={styles.taskCard}
                onPress={() => router.push(`/tasks/${task.id}`)}
                activeOpacity={0.7}
              >
                {/* Left Color Accent */}
                {course && (
                  <View style={[styles.colorAccent, { backgroundColor: course.color }]} />
                )}

                <View style={styles.taskContent}>
                  {/* Header Row */}
                  <View style={styles.taskHeader}>
                    <View style={styles.taskTitleContainer}>
                      <Text style={styles.taskTitle} numberOfLines={2}>
                        {task.title}
                      </Text>
                      {/* Priority Badge */}
                      {task.priority === 'high' && (
                        <View style={styles.priorityBadge}>
                          <Ionicons name="flag" size={12} color={COLORS_V2.error[600]} />
                          <Text style={styles.priorityText}>High</Text>
                        </View>
                      )}
                      {task.priority === 'medium' && (
                        <View style={[styles.priorityBadge, styles.mediumPriority]}>
                          <Ionicons name="flag" size={12} color={COLORS_V2.warning[600]} />
                          <Text style={[styles.priorityText, styles.mediumPriorityText]}>Medium</Text>
                        </View>
                      )}
                    </View>
                    {/* Status Icon */}
                    {task.status === TaskStatus.COMPLETED ? (
                      <View style={styles.statusIconCompleted}>
                        <Ionicons name="checkmark-circle" size={28} color={COLORS_V2.success[500]} />
                      </View>
                    ) : (
                      <View style={styles.statusIcon}>
                        <Ionicons name="ellipse-outline" size={28} color={COLORS_V2.text.tertiary} />
                      </View>
                    )}
                  </View>

                  {/* Description */}
                  {task.description && (
                    <Text style={styles.taskDescription} numberOfLines={2}>
                      {task.description}
                    </Text>
                  )}

                  {/* Footer Info */}
                  <View style={styles.taskFooter}>
                    {/* Course Tag */}
                    {course && (
                      <View style={[styles.courseTag, { backgroundColor: `${course.color}15` }]}>
                        <View style={[styles.courseIndicator, { backgroundColor: course.color }]} />
                        <Text style={[styles.courseTagText, { color: course.color }]} numberOfLines={1}>
                          {course.code || course.name}
                        </Text>
                      </View>
                    )}

                    {/* Due Date Badge */}
                    <View style={[
                      styles.dueDateBadge,
                      isOverdue && styles.dueDateOverdue,
                      task.status === TaskStatus.COMPLETED && styles.dueDateCompleted
                    ]}>
                      <Ionicons 
                        name={isOverdue ? 'alert-circle' : task.status === TaskStatus.COMPLETED ? 'checkmark-circle' : 'time-outline'} 
                        size={14} 
                        color={isOverdue ? COLORS_V2.error[600] : task.status === TaskStatus.COMPLETED ? COLORS_V2.success[600] : COLORS_V2.text.secondary}
                      />
                      <Text style={[
                        styles.dueDateText,
                        isOverdue && styles.dueDateTextOverdue,
                        task.status === TaskStatus.COMPLETED && styles.dueDateTextCompleted
                      ]}>
                        {task.dueDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: task.dueDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                        })}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Chevron Icon */}
                <View style={styles.chevronContainer}>
                  <Ionicons name="chevron-forward" size={20} color={COLORS_V2.text.tertiary} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS_V2.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS_V2.text.secondary,
    marginTop: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
   paddingVertical: SPACING.lg,
  //  paddingVertical:2,
    backgroundColor: COLORS_V2.surface.base,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS_V2.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...TYPOGRAPHY.headlineMedium,
    color: COLORS_V2.text.primary,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS_V2.text.secondary,
    marginTop: 2,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS_V2.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    ...ELEVATION.md,
  },
  filterScrollView: {
    backgroundColor: COLORS_V2.surface.base,
  },
  filterContainer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  filterTab: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS_V2.background.secondary,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: COLORS_V2.primary[600],
    ...ELEVATION.sm,
  },
  filterText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS_V2.text.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  listContent: {
    padding: SPACING.xl,
    paddingBottom: 100,
    paddingBlock: SPACING.lg,},
  taskCard: {
    backgroundColor: COLORS_V2.surface.base,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...ELEVATION.md,
    borderWidth: 1,
    borderColor: COLORS_V2.background.secondary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorAccent: {
    width: 5,
    alignSelf: 'stretch',
  },
  taskContent: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  taskTitleContainer: {
    flex: 1,
    gap: SPACING.xs,
  },
  taskTitle: {
    ...TYPOGRAPHY.titleMedium,
    color: COLORS_V2.text.primary,
    fontWeight: '700',
    lineHeight: 22,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS_V2.error[50],
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    gap: 4,
  },
  mediumPriority: {
    backgroundColor: COLORS_V2.warning[50],
  },
  priorityText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS_V2.error[600],
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mediumPriorityText: {
    color: COLORS_V2.warning[600],
  },
  statusIcon: {
    opacity: 0.3,
  },
  statusIconCompleted: {
    opacity: 1,
  },
  taskDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS_V2.text.secondary,
    lineHeight: 18,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  courseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: RADIUS.sm,
    gap: 6,
    maxWidth: '60%',
  },
  courseIndicator: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
  },
  courseTagText: {
    ...TYPOGRAPHY.labelSmall,
    fontWeight: '700',
    fontSize: 11,
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS_V2.background.secondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  dueDateOverdue: {
    backgroundColor: COLORS_V2.error[50],
  },
  dueDateCompleted: {
    backgroundColor: COLORS_V2.success[50],
  },
  dueDateText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS_V2.text.secondary,
    fontWeight: '600',
    fontSize: 11,
  },
  dueDateTextOverdue: {
    color: COLORS_V2.error[600],
  },
  dueDateTextCompleted: {
    color: COLORS_V2.success[600],
  },
  chevronContainer: {
    paddingRight: SPACING.md,
    paddingLeft: SPACING.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: SPACING.xl,
  },
  emptyTitle: {
    ...TYPOGRAPHY.titleLarge,
    color: COLORS_V2.text.primary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS_V2.text.secondary,
    textAlign: 'center',
  },
});
