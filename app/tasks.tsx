import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../constants/config';
import { ILLUSTRATIONS } from '../constants/illustrations';
import { getCurrentUser } from '../services/authService';
import { getCourses } from '../services/courseServiceFirestore';
import { deleteTask, getTasks, updateTask } from '../services/taskServiceFirestore';
import { Course, Task, TaskPriority, TaskStatus } from '../types';

export default function TasksScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/');
        return;
      }
      setUserId(user.id);
      await loadData(user.id);
    } catch (error) {
      console.error('Initialization error:', error);
      Alert.alert('Error', 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (uid: string) => {
    try {
      const [tasksData, coursesData] = await Promise.all([
        getTasks(uid),
        getCourses(uid),
      ]);
      setTasks(tasksData);
      setCourses(coursesData);
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    if (userId) {
      setRefreshing(true);
      loadData(userId);
    }
  }, [userId]);

  const handleCompleteTask = async (task: Task) => {
    if (!userId) return;
    
    try {
      await updateTask(task.id, {
        status: task.status === TaskStatus.COMPLETED ? TaskStatus.TODO : TaskStatus.COMPLETED,
        completedHours: task.status === TaskStatus.COMPLETED ? undefined : task.estimatedHours,
      });
      await loadData(userId);
    } catch (error) {
      console.error('Complete task error:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(task.id);
              if (userId) await loadData(userId);
            } catch (error) {
              console.error('Delete task error:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const filteredTasks = useMemo(() => {
    switch (filter) {
      case 'pending':
        return tasks.filter(t => t.status !== TaskStatus.COMPLETED);
      case 'completed':
        return tasks.filter(t => t.status === TaskStatus.COMPLETED);
      default:
        return tasks;
    }
  }, [tasks, filter]);

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return COLORS.error;
      case TaskPriority.MEDIUM:
        return COLORS.warning;
      default:
        return COLORS.success;
    }
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const days = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
  };

  const renderTask = useCallback(({ item }: { item: Task }) => {
    const course = courses.find(c => c.id === item.courseId);
    const isCompleted = item.status === TaskStatus.COMPLETED;
    const isOverdue = item.dueDate < new Date() && !isCompleted;

    return (
      <TouchableOpacity
        style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}
        onPress={() => router.push(`/tasks/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.taskHeader}>
          <TouchableOpacity
            style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}
            onPress={(e) => {
              e.stopPropagation();
              handleCompleteTask(item);
            }}
            activeOpacity={0.7}
          >
            {isCompleted && <Ionicons name="checkmark" size={18} color="#fff" />}
          </TouchableOpacity>
          
          <View style={styles.taskInfo}>
            <Text style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]}>
              {item.title}
            </Text>
            <Text style={styles.taskCourse}>{course?.name || 'Unknown Course'}</Text>
          </View>

          <View
            style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}
          >
            <Text style={styles.priorityText}>{item.priority}</Text>
          </View>
        </View>

        <View style={styles.taskFooter}>
          <View style={[styles.dueDateBadge, isOverdue && styles.overdueBadge]}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={isOverdue ? COLORS.error : COLORS.textSecondary}
            />
            <Text style={[styles.dueDateText, isOverdue && styles.overdueText]}>
              {getDaysUntilDue(item.dueDate)}
            </Text>
          </View>

          {item.estimatedHours && (
            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.timeText}>{item.estimatedHours}h</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteTask(item);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [courses, router]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
      );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.headerWrapper}>
        <Image 
          source={ILLUSTRATIONS.heroStudy4}
          style={styles.headerBackgroundImage}
          contentFit="cover"
        />
        <LinearGradient 
          colors={['rgba(88,86,214,0.90)', 'rgba(108,99,255,0.90)']} 
          style={styles.header}
        >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Tasks</Text>
          <TouchableOpacity
            onPress={() => router.push('/tasks/add' as any)}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All ({tasks.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
            onPress={() => setFilter('pending')}
          >
            <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
              Pending ({tasks.filter(t => t.status !== TaskStatus.COMPLETED).length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
            onPress={() => setFilter('completed')}
          >
            <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
              Done ({tasks.filter(t => t.status === TaskStatus.COMPLETED).length})
            </Text>
          </TouchableOpacity>
        </View>
        </LinearGradient>
      </View>

      {filteredTasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Image 
            source={filter === 'completed' ? ILLUSTRATIONS.taskComplete : ILLUSTRATIONS.addTask}
            style={styles.emptyImage}
            contentFit="contain"
          />
          <Text style={styles.emptyText}>
            {filter === 'completed' ? 'No completed tasks yet' : 'No tasks yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {filter === 'completed' 
              ? 'Complete tasks to see them here' 
              : 'Start adding tasks to get organized'}
          </Text>
          <TouchableOpacity
            style={styles.addTaskButton}
            onPress={() => router.push('/tasks/add' as any)}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.addTaskGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="add" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.addTaskButtonText}>Add Your First Task</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTask}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={10}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerWrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  headerBackgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterButtonActive: {
    backgroundColor: '#fff',
  },
  filterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  filterTextActive: {
    color: COLORS.primary,
  },
  listContent: {
    padding: 16,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskCardCompleted: {
    opacity: 0.6,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  taskCourse: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overdueBadge: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dueDateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  overdueText: {
    color: COLORS.error,
    fontWeight: '600',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  deleteButton: {
    marginLeft: 'auto',
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyImage: {
    width: 200,
    height: 200,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  addTaskButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addTaskGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  addTaskButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
