import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants/config';
import { getCurrentUser } from '../../../services/authService';
import { getCourses } from '../../../services/courseServiceFirestore';
import { deleteTask, getTaskById, updateTask } from '../../../services/taskServiceFirestore';
import { Course, Task, TaskPriority, TaskStatus, TaskType } from '../../../types';

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [type, setType] = useState<TaskType>(TaskType.ASSIGNMENT);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [dueDate, setDueDate] = useState(new Date());
  const [estimatedHours, setEstimatedHours] = useState('');
  const [completedHours, setCompletedHours] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    initialize();
  }, [id]);

  const initialize = async () => {
    try {
      // Validate task ID
      if (!id || typeof id !== 'string') {
        Alert.alert('Error', 'Invalid task ID');
        router.back();
        return;
      }

      const user = await getCurrentUser();
      if (!user) {
        router.replace('/');
        return;
      }
      setUserId(user.id);

      const [taskData, coursesData] = await Promise.all([
        getTaskById(id),
        getCourses(user.id),
      ]);

      if (!taskData) {
        Alert.alert('Error', 'Task not found');
        router.back();
        return;
      }

      setTask(taskData);
      setCourses(coursesData);

      // Populate form fields
      setTitle(taskData.title);
      setDescription(taskData.description || '');
      setCourseId(taskData.courseId);
      setType(taskData.type);
      setPriority(taskData.priority);
      setStatus(taskData.status);
      setDueDate(taskData.dueDate);
      setEstimatedHours(taskData.estimatedHours?.toString() || '');
      setCompletedHours(taskData.completedHours?.toString() || '');
    } catch (error) {
      console.error('Initialization error:', error);
      Alert.alert('Error', 'Failed to load task');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId || !task) return;

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    if (!courseId) {
      Alert.alert('Error', 'Please select a course');
      return;
    }

    setSaving(true);
    try {
      const updates: any = {
        title: title.trim(),
        courseId,
        type,
        priority,
        status,
        dueDate,
      };

      // Only add optional fields if they have values
      if (description.trim()) {
        updates.description = description.trim();
      }
      if (estimatedHours) {
        updates.estimatedHours = parseFloat(estimatedHours);
      }
      if (completedHours) {
        updates.completedHours = parseFloat(completedHours);
      }

      await updateTask(task.id, updates);

      Alert.alert('Success', 'Task updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Update task error:', error);
      Alert.alert('Error', 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!task) return;

    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(task.id);
              Alert.alert('Success', 'Task deleted successfully');
              router.back();
            } catch (error) {
              console.error('Delete task error:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const handleToggleComplete = async () => {
    if (!task) return;

    const newStatus = status === TaskStatus.COMPLETED ? TaskStatus.TODO : TaskStatus.COMPLETED;
    setStatus(newStatus);

    try {
      const updates: any = {
        status: newStatus,
      };
      
      // Only include completedHours if it has a value
      if (newStatus === TaskStatus.COMPLETED && estimatedHours) {
        updates.completedHours = parseFloat(estimatedHours);
      } else if (newStatus === TaskStatus.COMPLETED && completedHours) {
        updates.completedHours = parseFloat(completedHours);
      }
      
      await updateTask(task.id, updates);
    } catch (error) {
      console.error('Toggle complete error:', error);
      setStatus(status); // Revert on error
      Alert.alert('Error', 'Failed to update task status');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!task) {
    return null;
  }

  const course = courses.find(c => c.id === courseId);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <StatusBar style="light" />
        
        <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Task Details</Text>
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {/* Status Toggle */}
          <TouchableOpacity 
            style={[styles.statusCard, status === TaskStatus.COMPLETED && styles.statusCardCompleted]}
            onPress={handleToggleComplete}
            activeOpacity={0.7}
          >
            <View style={styles.statusContent}>
              <Ionicons 
                name={status === TaskStatus.COMPLETED ? "checkmark-circle" : "ellipse-outline"} 
                size={32} 
                color={status === TaskStatus.COMPLETED ? COLORS.success : COLORS.textSecondary} 
              />
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusTitle}>
                  {status === TaskStatus.COMPLETED ? 'Completed' : 'Mark as Complete'}
                </Text>
                <Text style={styles.statusSubtitle}>
                  {status === TaskStatus.COMPLETED ? 'Tap to mark incomplete' : 'Tap to mark as done'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Math Assignment 1"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
              editable={!saving}
              autoCapitalize="sentences"
            />
          </View>

          {/* Course */}
          <View style={styles.section}>
            <Text style={styles.label}>Course *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={courseId}
                onValueChange={(value) => setCourseId(value)}
                enabled={!saving}
                style={styles.picker}
                itemStyle={Platform.OS === 'ios' ? { height: 120 } : undefined}
                mode="dropdown"
              >
                {courses.map(course => (
                  <Picker.Item
                    key={course.id}
                    label={`${course.code} - ${course.name}`}
                    value={course.id}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Type */}
          <View style={styles.section}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={type}
                onValueChange={(itemValue) => setType(itemValue as TaskType)}
                enabled={!saving}
                style={styles.picker}
                itemStyle={Platform.OS === 'ios' ? { height: 120 } : undefined}
                mode="dropdown"
              >
                <Picker.Item label="Assignment" value={TaskType.ASSIGNMENT} />
                <Picker.Item label="Exam" value={TaskType.EXAM} />
                <Picker.Item label="Quiz" value={TaskType.QUIZ} />
                <Picker.Item label="Project" value={TaskType.PROJECT} />
                <Picker.Item label="Study" value={TaskType.STUDY} />
                <Picker.Item label="Other" value={TaskType.OTHER} />
              </Picker>
            </View>
          </View>

          {/* Priority */}
          <View style={styles.section}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityButtons}>
              {[TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityButton,
                    priority === p && styles.priorityButtonActive,
                    { borderColor: p === TaskPriority.HIGH ? COLORS.error : p === TaskPriority.MEDIUM ? COLORS.warning : COLORS.success }
                  ]}
                  onPress={() => setPriority(p)}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.priorityButtonText,
                    priority === p && styles.priorityButtonTextActive
                  ]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Due Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Due Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              <Text style={styles.dateText}>
                {dueDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) setDueDate(selectedDate);
                }}
                minimumDate={new Date()}
              />
            )}
          </View>

          {/* Estimated Hours */}
          <View style={styles.section}>
            <Text style={styles.label}>Estimated Hours</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 5"
              value={estimatedHours}
              onChangeText={setEstimatedHours}
              keyboardType="numeric"
              editable={!saving}
            />
          </View>

          {/* Completed Hours (if completed) */}
          {status === TaskStatus.COMPLETED && (
            <View style={styles.section}>
              <Text style={styles.label}>Completed Hours</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 4.5"
                value={completedHours}
                onChangeText={setCompletedHours}
                keyboardType="numeric"
                editable={!saving}
              />
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add notes or details about this task..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!saving}
              autoCapitalize="sentences"
            />
          </View>

          {/* Task Info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Task Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Created:</Text>
              <Text style={styles.infoValue}>
                {task.createdAt.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Updated:</Text>
              <Text style={styles.infoValue}>
                {task.updatedAt.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </Text>
            </View>
            {course && (
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Course:</Text>
                <View style={[styles.courseBadge, { backgroundColor: course.color }]}>
                  <Text style={styles.courseBadgeText}>{course.code}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={saving ? [COLORS.textSecondary, COLORS.textSecondary] : [COLORS.primary, COLORS.secondary]}
              style={styles.saveButtonGradient}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 20,
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
  deleteButton: {
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
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusCardCompleted: {
    borderColor: COLORS.success,
    backgroundColor: '#f0fdf4',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: COLORS.text,
  },
  textArea: {
    height: 120,
    paddingTop: 16,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: Platform.OS === 'android' ? 'visible' : 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? 180 : 50,
    width: '100%',
    color: COLORS.text,
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  priorityButtonTextActive: {
    color: '#fff',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    color: COLORS.text,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoKey: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  courseBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  courseBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  saveButton: {
    marginBottom: 40,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
