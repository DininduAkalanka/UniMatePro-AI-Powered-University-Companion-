import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { COLORS } from '../../constants/config';
import { ILLUSTRATIONS } from '../../constants/illustrations';
import { getCurrentUser } from '../../services/authService';
import { getCourses } from '../../services/courseServiceFirestore';
import { getTasks } from '../../services/taskServiceFirestore';
import { Course, Task } from '../../types';

interface StudySession {
  id: string;
  date: string;
  course: string;
  duration: number;
  topic: string;
  color: string;
}

interface DayStudyPlan {
  tasks: Task[];
  recommendedHours: number;
  courses: string[];
}

export default function PlannerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [dayPlan, setDayPlan] = useState<DayStudyPlan | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (tasks.length > 0 && courses.length > 0) {
      generateMarkedDates();
      generateDayPlan(selectedDate);
    }
  }, [tasks, courses, selectedDate]);

  const loadData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/');
        return;
      }

      const [fetchedTasks, fetchedCourses] = await Promise.all([
        getTasks(user.id),
        getCourses(user.id),
      ]);

      setTasks(fetchedTasks);
      setCourses(fetchedCourses);
    } catch (error) {
      console.error('Load data error:', error);
      Alert.alert('Error', 'Failed to load planner data');
    } finally {
      setLoading(false);
    }
  };

  const generateMarkedDates = () => {
    const marked: any = {};

    // Mark task due dates
    tasks.forEach(task => {
      const dateStr = task.dueDate.toISOString().split('T')[0];
      const course = courses.find(c => c.id === task.courseId);
      
      if (!marked[dateStr]) {
        marked[dateStr] = { dots: [] };
      }
      
      marked[dateStr].dots.push({
        color: course?.color || COLORS.primary,
        selectedDotColor: '#fff',
      });
    });

    // Highlight selected date
    if (marked[selectedDate]) {
      marked[selectedDate].selected = true;
      marked[selectedDate].selectedColor = COLORS.primary;
    } else {
      marked[selectedDate] = {
        selected: true,
        selectedColor: COLORS.primary,
        dots: [],
      };
    }

    setMarkedDates(marked);
  };

  const generateDayPlan = (dateStr: string) => {
    const selectedDateObj = new Date(dateStr);
    
    // Get tasks for this date and upcoming days
    const dayTasks = tasks.filter(task => {
      const taskDate = task.dueDate.toISOString().split('T')[0];
      return taskDate === dateStr || (task.dueDate >= selectedDateObj && task.status !== 'completed');
    });

    // Calculate recommended study hours based on upcoming deadlines
    const urgentTasks = dayTasks.filter(task => {
      const daysUntil = Math.ceil((task.dueDate.getTime() - selectedDateObj.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7;
    });

    const recommendedHours = Math.min(urgentTasks.length * 1.5, 8);

    // Get unique courses for this day
    const coursesForDay = Array.from(new Set(
      dayTasks.map(task => {
        const course = courses.find(c => c.id === task.courseId);
        return course?.name || 'Unknown';
      })
    ));

    setDayPlan({
      tasks: dayTasks.slice(0, 5), // Show top 5 tasks
      recommendedHours,
      courses: coursesForDay,
    });
  };

  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const getDayInfo = () => {
    const today = new Date().toISOString().split('T')[0];
    const selected = new Date(selectedDate);
    const todayDate = new Date(today);

    if (selectedDate === today) {
      return 'Today';
    } else if (selectedDate === new Date(todayDate.getTime() + 86400000).toISOString().split('T')[0]) {
      return 'Tomorrow';
    } else {
      return selected.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
  };

  const getMotivationalMessage = () => {
    if (!dayPlan) return '';
    
    const hours = dayPlan.recommendedHours;
    if (hours === 0) {
      return '🎉 Free day! Take a break or review previous material.';
    } else if (hours <= 2) {
      return '✨ Light study day ahead. Perfect for review!';
    } else if (hours <= 4) {
      return '💪 Moderate workload. You can handle this!';
    } else if (hours <= 6) {
      return '🔥 Busy day ahead. Stay focused and take breaks!';
    } else {
      return '⚡ Heavy workload. Break it into chunks and pace yourself!';
    }
  };

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
      
      {/* Header */}
      <View style={styles.headerWrapper}>
        <Image 
          source={ILLUSTRATIONS.heroStudy2}
          style={styles.headerBackgroundImage}
          contentFit="cover"
        />
        <LinearGradient 
          colors={['rgba(88,86,214,0.88)', 'rgba(108,99,255,0.88)']} 
          style={styles.header}
        >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.headerText}>Study Planner</Text>
            <Text style={styles.headerSubtext}>AI-Powered Schedule</Text>
          </View>
          <TouchableOpacity style={styles.aiButton} onPress={() => router.push('/chat' as any)}>
            <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        </LinearGradient>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <View style={styles.calendarCard}>
          <Calendar
            current={selectedDate}
            onDayPress={onDayPress}
            markedDates={markedDates}
            markingType={'multi-dot'}
            theme={{
              backgroundColor: '#fff',
              calendarBackground: '#fff',
              textSectionTitleColor: COLORS.textSecondary,
              selectedDayBackgroundColor: COLORS.primary,
              selectedDayTextColor: '#fff',
              todayTextColor: COLORS.primary,
              dayTextColor: COLORS.text,
              textDisabledColor: '#d9d9d9',
              dotColor: COLORS.primary,
              selectedDotColor: '#fff',
              monthTextColor: COLORS.text,
              textMonthFontWeight: 'bold',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
          />
        </View>

        {/* Day Overview */}
        {dayPlan && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📅 {getDayInfo()}</Text>
              
              {/* Motivational Message */}
              <View style={styles.motivationCard}>
                <Text style={styles.motivationText}>{getMotivationalMessage()}</Text>
              </View>

              {/* Study Hours Recommendation */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Ionicons name="time-outline" size={32} color={COLORS.primary} />
                  <Text style={styles.statValue}>{dayPlan.recommendedHours.toFixed(1)}h</Text>
                  <Text style={styles.statLabel}>Recommended Study</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="list-outline" size={32} color={COLORS.secondary} />
                  <Text style={styles.statValue}>{dayPlan.tasks.length}</Text>
                  <Text style={styles.statLabel}>Tasks to Focus On</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="book-outline" size={32} color={COLORS.accent} />
                  <Text style={styles.statValue}>{dayPlan.courses.length}</Text>
                  <Text style={styles.statLabel}>Courses</Text>
                </View>
              </View>

              {/* Course Focus */}
              {dayPlan.courses.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>📚 Courses to Focus On</Text>
                  <View style={styles.courseChips}>
                    {dayPlan.courses.map((courseName, index) => (
                      <View key={index} style={styles.courseChip}>
                        <Text style={styles.courseChipText}>{courseName}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Tasks for the Day */}
              {dayPlan.tasks.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>✅ Priority Tasks</Text>
                  {dayPlan.tasks.map((task, index) => {
                    const course = courses.find(c => c.id === task.courseId);
                    const daysUntil = Math.ceil((task.dueDate.getTime() - new Date(selectedDate).getTime()) / (1000 * 60 * 60 * 24));
                    const isOverdue = daysUntil < 0;
                    const isDueToday = daysUntil === 0;

                    return (
                      <View key={index} style={styles.taskItem}>
                        <View style={[styles.taskIndicator, { backgroundColor: course?.color || COLORS.primary }]} />
                        <View style={styles.taskContent}>
                          <Text style={styles.taskTitle}>{task.title}</Text>
                          <Text style={styles.taskMeta}>
                            {course?.name} • {task.priority} priority
                          </Text>
                          <Text style={[
                            styles.taskDue,
                            isOverdue && styles.taskOverdue,
                            isDueToday && styles.taskDueToday,
                          ]}>
                            {isOverdue ? `⚠️ Overdue by ${Math.abs(daysUntil)} days` :
                             isDueToday ? '🔴 Due today' :
                             daysUntil === 1 ? '📍 Due tomorrow' :
                             `📅 Due in ${daysUntil} days`}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Image 
                    source={ILLUSTRATIONS.planner}
                    style={styles.emptyStateImage}
                    contentFit="contain"
                  />
                  <Text style={styles.emptyStateText}>No tasks scheduled for this day!</Text>
                  <Text style={styles.emptyStateSubtext}>Enjoy your free time or review previous material</Text>
                </View>
              )}

              {/* AI Study Recommendations */}
              <View style={styles.recommendationsCard}>
                <Text style={styles.cardTitle}>💡 AI Study Tips</Text>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.tipText}>
                    Start with the highest priority tasks first
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.tipText}>
                    Take a 5-10 minute break every hour
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.tipText}>
                    Use the Pomodoro technique for focused work
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.tipText}>
                    Review material before starting new topics
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/tasks/add' as any)}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                style={styles.actionGradient}
              >
                <Ionicons name="add" size={24} color="#fff" />
                <Text style={styles.actionText}>Add Task</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/chat' as any)}
            >
              <LinearGradient
                colors={[COLORS.secondary, COLORS.accent]}
                style={styles.actionGradient}
              >
                <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
                <Text style={styles.actionText}>Ask AI</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    position: 'relative' as const,
    overflow: 'hidden',
  },
  headerBackgroundImage: {
    position: 'absolute' as const,
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  aiButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  calendarCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  motivationCard: {
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  motivationText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  courseChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  courseChip: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  courseChipText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  taskItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  taskIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  taskMeta: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  taskDue: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  taskOverdue: {
    color: COLORS.error,
    fontWeight: '600',
  },
  taskDueToday: {
    color: COLORS.warning,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateImage: {
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  recommendationsCard: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
