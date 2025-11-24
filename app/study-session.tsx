import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getCurrentUser } from '../services/authService';
import { getCourses } from '../services/courseServiceFirestore';
import { createStudySession } from '../services/studyServiceFirestore';
import { getTasks } from '../services/taskServiceFirestore';

// Helper function to get user-specific storage key
const getStudySessionKey = (userId: string) => `@study_session_state_${userId}`;

const COLORS = {
  background: '#0A0E27',
  card: '#1A1F3A',
  primary: '#667EEA',
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  border: '#2D3250',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
};

export default function StudySessionScreen() {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [targetDuration, setTargetDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [effectiveness, setEffectiveness] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  
  // Timer states
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [targetSeconds, setTargetSeconds] = useState(0);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const isManualActionRef = useRef(false); // Track manual pause/resume to prevent restoration conflicts

  useEffect(() => {
    loadCourses();
    loadTasks();
    checkForActiveSession();
  }, []);

  const checkForActiveSession = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setHasActiveSession(false);
        return;
      }

      const storageKey = getStudySessionKey(user.id);
      const savedState = await AsyncStorage.getItem(storageKey);
      
      if (savedState) {
        const state = JSON.parse(savedState);
        // Validate that the session belongs to current user
        if (state.userId === user.id) {
          const hasSession = true;
          console.log('[Study Session] Checking for active session:', hasSession);
          
          // Only show active session card if timer is not currently running
          if (hasSession && !isTimerRunning) {
            setHasActiveSession(true);
          } else {
            setHasActiveSession(false);
          }
        } else {
          console.log('[Study Session] Session belongs to different user, clearing...');
          await AsyncStorage.removeItem(storageKey);
          setHasActiveSession(false);
        }
      } else {
        setHasActiveSession(false);
      }
    } catch (error) {
      console.error('Failed to check for active session:', error);
      setHasActiveSession(false);
    }
  };

  const loadCourses = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      
      const coursesData = await getCourses(user.id);
      setCourses(coursesData);
      
      if (coursesData.length > 0) {
        setSelectedCourse(coursesData[0].id);
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      
      const tasksData = await getTasks(user.id);
      // Filter to only incomplete tasks
      const incompleteTasks = tasksData.filter(task => task.status !== 'completed');
      setTasks(incompleteTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  // Save state to AsyncStorage
  const saveState = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log('[Study Session] Cannot save - no user logged in');
        return;
      }

      // Save if: timer running, timer paused, or has elapsed time
      const shouldSave = isTimerRunning || isPaused || elapsedSeconds > 0;
      
      if (!shouldSave) {
        console.log('[Study Session] No active session to save (no timer, no elapsed time)');
        return;
      }
      
      const state = {
        userId: user.id, // Store user ID for validation
        selectedCourse,
        selectedTask,
        topic,
        targetDuration,
        notes,
        effectiveness,
        isTimerRunning,
        isPaused,
        elapsedSeconds,
        targetSeconds,
        startTime: startTimeRef.current?.toISOString(),
        savedAt: new Date().toISOString(), // Track when state was saved
      };
      
      console.log('[Study Session] 💾 Saving state for user:', user.id, { 
        isTimerRunning, 
        isPaused, 
        elapsedSeconds,
        course: selectedCourse,
        savedAt: state.savedAt 
      });
      
      const storageKey = getStudySessionKey(user.id);
      await AsyncStorage.setItem(storageKey, JSON.stringify(state));
      setHasActiveSession(true);
      
      console.log('[Study Session] ✅ State saved successfully');
    } catch (error) {
      console.error('[Study Session] ❌ Failed to save session state:', error);
    }
  };

  // Restore state from AsyncStorage
  const restoreState = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log('[Study Session] Cannot restore - no user logged in');
        return;
      }

      // Skip restoration if user just clicked pause/resume to prevent conflicts
      if (isManualActionRef.current) {
        console.log('[Study Session] ⚠️  Skipping restore - manual action in progress');
        return;
      }
      
      const storageKey = getStudySessionKey(user.id);
      const savedState = await AsyncStorage.getItem(storageKey);
      console.log('[Study Session] 🔍 Checking for saved state:', !!savedState);
      
      if (!savedState) {
        console.log('[Study Session] ℹ️  No saved state found');
        return;
      }

      const state = JSON.parse(savedState);
      
      // CRITICAL: Validate that the session belongs to current user
      if (state.userId !== user.id) {
        console.log('[Study Session] ⚠️  Session belongs to different user, clearing...');
        await AsyncStorage.removeItem(storageKey);
        return;
      }

      const savedAt = state.savedAt ? new Date(state.savedAt).toLocaleTimeString() : 'unknown';
      
      console.log('[Study Session] 📦 Restoring state from:', savedAt);
      console.log('[Study Session] 📊 State details:', {
        isTimerRunning: state.isTimerRunning,
        isPaused: state.isPaused,
        elapsedSeconds: state.elapsedSeconds,
        course: state.selectedCourse,
        task: state.selectedTask,
        topic: state.topic
      });
      
      // Restore form data first
      setSelectedCourse(state.selectedCourse || '');
      setSelectedTask(state.selectedTask || null);
      setTopic(state.topic || '');
      setTargetDuration(state.targetDuration || '');
      setNotes(state.notes || '');
      setEffectiveness(state.effectiveness || null);
      setTargetSeconds(state.targetSeconds || 0);
      
      // Restore timer state
      if (state.isTimerRunning) {
        if (!state.isPaused) {
          // Calculate elapsed time since we left (for running timer)
          const savedStartTime = state.startTime ? new Date(state.startTime) : new Date();
          const now = new Date();
          const elapsedSinceStart = Math.floor((now.getTime() - savedStartTime.getTime()) / 1000);
          
          console.log('[Study Session] ▶️  Resuming RUNNING timer');
          console.log('[Study Session] ⏱️  Time calculation:', {
            savedStart: savedStartTime.toISOString(),
            now: now.toISOString(),
            elapsed: elapsedSinceStart,
            formatted: formatTime(elapsedSinceStart)
          });
          
          setElapsedSeconds(elapsedSinceStart);
          startTimeRef.current = savedStartTime;
          setIsTimerRunning(true);
          setIsPaused(false);
          
          // Resume timer interval
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          timerRef.current = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
          }, 1000) as any;
          
          console.log('[Study Session] ✅ Running timer restored successfully');
        } else {
          // Restore paused state (use saved elapsed time)
          console.log('[Study Session] ⏸️  Restoring PAUSED timer');
          console.log('[Study Session] ⏱️  Elapsed time:', state.elapsedSeconds, '=', formatTime(state.elapsedSeconds));
          
          setElapsedSeconds(state.elapsedSeconds);
          startTimeRef.current = state.startTime ? new Date(state.startTime) : null;
          setIsTimerRunning(true);
          setIsPaused(true);
          
          console.log('[Study Session] ✅ Paused timer restored successfully');
        }
        
        // Hide the active session card since we're restoring directly to timer
        setHasActiveSession(false);
      } else {
        console.log('[Study Session] ⚠️  Timer was not running when saved');
      }
    } catch (error) {
      console.error('[Study Session] ❌ Failed to restore session state:', error);
    }
  };

  // Clear saved state
  const clearSavedState = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        const storageKey = getStudySessionKey(user.id);
        await AsyncStorage.removeItem(storageKey);
      }
      setHasActiveSession(false);
    } catch (error) {
      console.error('Failed to clear session state:', error);
    }
  };

  const resumeActiveSession = async () => {
    console.log('[Study Session] 🔄 Manual resume requested via button...');
    
    // Use centralized restoration logic (DRY principle)
    await restoreState();
    
    // Hide the active session card after resuming
    setHasActiveSession(false);
    
    console.log('[Study Session] ✅ Manual resume complete');
  };

  const discardActiveSession = () => {
    Alert.alert(
      'Discard Study Session?',
      'This will permanently delete your current study session. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Discard', 
          style: 'destructive',
          onPress: async () => {
            console.log('[Study Session] Discarding session...');
            
            // Clear timer first
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            
            // Clear AsyncStorage
            await clearSavedState();
            
            // Reset all state
            setIsTimerRunning(false);
            setIsPaused(false);
            setElapsedSeconds(0);
            setTargetSeconds(0);
            startTimeRef.current = null;
            setSelectedCourse(courses.length > 0 ? courses[0].id : '');
            setSelectedTask(null);
            setTopic('');
            setTargetDuration('');
            setNotes('');
            setEffectiveness(null);
            setHasActiveSession(false);
            
            console.log('[Study Session] Session discarded successfully');
          }
        }
      ]
    );
  };

  // Restore state when screen focuses
  // Use ref to prevent infinite loop from state changes during restoration
  const isRestoringRef = useRef(false);
  
  useFocusEffect(
    useCallback(() => {
      console.log('[Study Session] Screen focused');
      
      // Only restore if not already restoring
      if (!isRestoringRef.current) {
        isRestoringRef.current = true;
        restoreState().finally(() => {
          isRestoringRef.current = false;
        });
      }
      
      return () => {
        console.log('[Study Session] Screen unfocused, saving state...');
        // Save state on blur (will check inside saveState if there's anything to save)
        saveState();
      };
    }, []) // EMPTY DEPS - only run on focus/blur, not on state changes
  );

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        saveState();
      } else if (nextAppState === 'active') {
        restoreState();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRemainingSeconds = () => {
    if (targetSeconds === 0) return 0;
    return Math.max(0, targetSeconds - elapsedSeconds);
  };

  const startTimer = () => {
    if (!selectedCourse) {
      Alert.alert('Error', 'Please select a course first');
      return;
    }

    const target = targetDuration ? parseInt(targetDuration) * 60 : 0;
    setTargetSeconds(target);
    setIsTimerRunning(true);
    setIsPaused(false);
    startTimeRef.current = new Date();

    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000) as any;
  };

  const pauseTimer = async () => {
    console.log('[Study Session] ⏸️  User clicked PAUSE button');
    
    // Mark as manual action to prevent restoration conflicts
    isManualActionRef.current = true;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsPaused(true);
    
    // Save state immediately after pausing
    setTimeout(async () => {
      await saveState();
      isManualActionRef.current = false;
      console.log('[Study Session] ✅ Paused and saved');
    }, 100);
  };

  const resumeTimer = () => {
    console.log('[Study Session] ▶️  User clicked RESUME button');
    
    // Mark as manual action
    isManualActionRef.current = true;
    
    setIsPaused(false);
    
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000) as any;
    
    // Save state after resuming
    setTimeout(async () => {
      await saveState();
      isManualActionRef.current = false;
      console.log('[Study Session] ✅ Resumed and saved');
    }, 100);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (elapsedSeconds < 60) {
      Alert.alert('Too Short', 'Please study for at least 1 minute before logging.');
      return;
    }

    // Show effectiveness rating before saving
    Alert.alert(
      'Study Session Complete',
      `Total time: ${formatTime(elapsedSeconds)}`,
      [
        { text: 'Cancel', style: 'cancel', onPress: resetTimer },
        { text: 'Save Session', onPress: () => handleSaveSession() }
      ]
    );
  };

  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTimerRunning(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setTargetSeconds(0);
    startTimeRef.current = null;
    clearSavedState();
  };

  const handleSaveSession = async () => {
    if (!selectedCourse) {
      Alert.alert('Error', 'Please select a course');
      return;
    }

    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'Please log in first');
        return;
      }

      const durationMinutes = Math.round(elapsedSeconds / 60);

      await createStudySession({
        userId: user.id,
        courseId: selectedCourse,
        taskId: selectedTask || undefined,
        topic: topic || undefined,
        duration: durationMinutes,
        notes: notes || undefined,
        effectiveness: effectiveness || undefined,
        date: startTimeRef.current || new Date(),
      });

      await clearSavedState();
      
      Alert.alert('Success', `Study session logged! (${durationMinutes} minutes)`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
      
      resetTimer();
    } catch (error) {
      console.error('Failed to create study session:', error);
      Alert.alert('Error', 'Failed to log study session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Log Study Session</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Session Card */}
        {hasActiveSession && !isTimerRunning && (
          <View style={styles.activeSessionCard}>
            <View style={styles.activeSessionHeader}>
              <View style={styles.activeSessionBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.activeSessionBadgeText}>In Progress</Text>
              </View>
              <TouchableOpacity 
                onPress={discardActiveSession}
                style={styles.discardButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.activeSessionContent}>
              <Ionicons name="time-outline" size={32} color={COLORS.primary} />
              <View style={styles.activeSessionTextContainer}>
                <Text style={styles.activeSessionTitle}>Active Study Session</Text>
                <Text style={styles.activeSessionSubtitle}>
                  Your timer is paused. Resume to continue tracking your study time.
                </Text>
              </View>
            </View>
            
            <View style={styles.activeSessionActions}>
              <TouchableOpacity 
                style={styles.resumeMainButton} 
                onPress={resumeActiveSession}
                activeOpacity={0.8}
              >
                <Ionicons name="play-circle" size={24} color={COLORS.text} />
                <Text style={styles.resumeButtonText}>Resume Session</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.discardTextButton} 
                onPress={discardActiveSession}
                activeOpacity={0.7}
              >
                <Text style={styles.discardTextButtonText}>Start New Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Course Selection */}
        {!isTimerRunning && (
          <View style={styles.section}>
            <Text style={styles.label}>Course *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courseList}>
              {courses.map((course) => (
                <TouchableOpacity
                  key={course.id}
                  style={[
                    styles.courseChip,
                    selectedCourse === course.id && styles.courseChipSelected
                  ]}
                  onPress={() => setSelectedCourse(course.id)}
                >
                  <Text style={[
                    styles.courseChipText,
                    selectedCourse === course.id && styles.courseChipTextSelected
                  ]}>
                    {course.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Task Selection (Optional) */}
        {!isTimerRunning && (
          <View style={styles.section}>
            <Text style={styles.label}>Related Task (Optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courseList}>
            <TouchableOpacity
              style={[
                styles.courseChip,
                selectedTask === null && styles.courseChipSelected
              ]}
              onPress={() => setSelectedTask(null)}
            >
              <Text style={[
                styles.courseChipText,
                selectedTask === null && styles.courseChipTextSelected
              ]}>
                No Task
              </Text>
            </TouchableOpacity>
            {tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[
                  styles.courseChip,
                  selectedTask === task.id && styles.courseChipSelected
                ]}
                onPress={() => setSelectedTask(task.id)}
              >
                <Text style={[
                  styles.courseChipText,
                  selectedTask === task.id && styles.courseChipTextSelected
                ]}>
                  {task.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          </View>
        )}

        {/* Topic */}
        {!isTimerRunning && (
          <View style={styles.section}>
            <Text style={styles.label}>Topic (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="What did you study?"
              placeholderTextColor={COLORS.textSecondary}
              value={topic}
              onChangeText={setTopic}
            />
          </View>
        )}

        {/* Timer Display */}
        {!isTimerRunning ? (
          <View style={styles.section}>
            <Text style={styles.label}>Target Duration (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 60 minutes"
              placeholderTextColor={COLORS.textSecondary}
              value={targetDuration}
              onChangeText={setTargetDuration}
              keyboardType="number-pad"
              editable={!isTimerRunning}
            />
            <Text style={styles.hint}>Leave empty for open-ended session</Text>
          </View>
        ) : (
          <View style={styles.timerSection}>
            <View style={styles.timerDisplay}>
              {targetSeconds > 0 ? (
                <>
                  <Text style={styles.timerLabel}>
                    {getRemainingSeconds() > 0 ? 'Time Remaining' : 'Extra Time'}
                  </Text>
                  <Text style={[
                    styles.timerText,
                    getRemainingSeconds() === 0 && styles.timerComplete
                  ]}>
                    {getRemainingSeconds() > 0 
                      ? formatTime(getRemainingSeconds())
                      : formatTime(elapsedSeconds - targetSeconds)
                    }
                  </Text>
                  <View style={styles.progressContainer}>
                    <View 
                      style={[
                        styles.progressBar, 
                        { width: `${Math.min((elapsedSeconds / targetSeconds) * 100, 100)}%` },
                        elapsedSeconds >= targetSeconds && styles.progressBarComplete
                      ]} 
                    />
                  </View>
                  <Text style={styles.targetText}>
                    Elapsed: {formatTime(elapsedSeconds)} / {formatTime(targetSeconds)}
                    {elapsedSeconds >= targetSeconds && ' ✅ Goal Reached!'}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.timerLabel}>Study Time</Text>
                  <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
                  <Text style={styles.targetText}>No time limit set</Text>
                </>
              )}
            </View>

            {/* Timer Controls */}
            <View style={styles.timerControls}>
              {!isPaused ? (
                <TouchableOpacity style={styles.pauseButton} onPress={pauseTimer}>
                  <Ionicons name="pause" size={32} color={COLORS.text} />
                  <Text style={styles.controlButtonText}>Pause</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.resumeButton} onPress={resumeTimer}>
                  <Ionicons name="play" size={32} color={COLORS.text} />
                  <Text style={styles.controlButtonText}>Resume</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.stopButton} onPress={stopTimer}>
                <Ionicons name="stop" size={32} color={COLORS.text} />
                <Text style={styles.controlButtonText}>Finish</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Effectiveness */}
        <View style={styles.section}>
          <Text style={styles.label}>How effective was this session?</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.ratingButton,
                  effectiveness === rating && styles.ratingButtonSelected
                ]}
                onPress={() => setEffectiveness(rating as 1 | 2 | 3 | 4 | 5)}
              >
                <Text style={[
                  styles.ratingText,
                  effectiveness === rating && styles.ratingTextSelected
                ]}>
                  {rating}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingHint}>1 = Not effective, 5 = Very effective</Text>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any notes about this session..."
            placeholderTextColor={COLORS.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Start Timer Button */}
        {!isTimerRunning && (
          <TouchableOpacity
            style={[styles.startButton, loading && styles.saveButtonDisabled]}
            onPress={startTimer}
            disabled={loading || !selectedCourse}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <>
                <Ionicons name="play-circle" size={28} color={COLORS.text} />
                <Text style={styles.saveButtonText}>Start Study Session</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 100,
  },
  courseList: {
    flexDirection: 'row',
  },
  courseChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  courseChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  courseChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  courseChipTextSelected: {
    color: COLORS.text,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ratingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  ratingButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  ratingTextSelected: {
    color: COLORS.text,
  },
  ratingHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  timerSection: {
    marginBottom: 24,
  },
  timerDisplay: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  timerLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timerText: {
    fontSize: 56,
    fontWeight: '700',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'],
  },
  timerComplete: {
    color: COLORS.success,
  },
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    marginTop: 20,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  progressBarComplete: {
    backgroundColor: COLORS.warning,
  },
  targetText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  timerControls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    justifyContent: 'center',
  },
  pauseButton: {
    flex: 1,
    backgroundColor: COLORS.warning,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  resumeButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stopButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  startButton: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
    marginBottom: 40,
  },
  saveButton: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  activeSessionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  activeSessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  activeSessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  activeSessionBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  discardButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSessionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
    borderRadius: 12,
  },
  activeSessionTextContainer: {
    flex: 1,
  },
  activeSessionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  activeSessionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  activeSessionActions: {
    gap: 12,
  },
  resumeMainButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  resumeButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  discardTextButton: {
    backgroundColor: 'transparent',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  discardTextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
