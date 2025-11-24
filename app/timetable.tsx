import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { COLORS } from '../constants/config';
import { ILLUSTRATIONS } from '../constants/illustrations';
import { getCurrentUser } from '../services/authService';
import { getCourses } from '../services/courseServiceFirestore';
import {
  createTimetableEntry,
  deleteTimetableEntry,
  getTimetableEntries,
  updateTimetableEntry,
} from '../services/timetableServiceFirestore';
import { Course } from '../types';

interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  courseId: string;
  location?: string;
  type: 'lecture' | 'lab' | 'tutorial' | 'other';
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

export default function TimetableScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);

  // Form state
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [startHour, setStartHour] = useState('09');
  const [startMinute, setStartMinute] = useState('00');
  const [endHour, setEndHour] = useState('10');
  const [endMinute, setEndMinute] = useState('00');
  const [location, setLocation] = useState('');
  const [classType, setClassType] = useState<'lecture' | 'lab' | 'tutorial' | 'other'>('lecture');

  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        loadTimetableData();
      }
    }, [userId])
  );

  const loadTimetableData = async () => {
    if (!userId) return;
    try {
      const entries = await getTimetableEntries(userId);
      const slots: TimeSlot[] = entries.map(entry => ({
        id: entry.id,
        day: getDayName(entry.dayOfWeek),
        startTime: entry.startTime,
        endTime: entry.endTime,
        courseId: entry.courseId,
        location: entry.location,
        type: entry.type || 'lecture',
      }));
      setTimeSlots(slots);
    } catch (error) {
      console.error('Error loading timetable:', error);
    }
  };

  const getDayName = (dayOfWeek: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Monday';
  };

  const getDayNumber = (dayName: string): number => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days.indexOf(dayName);
  };

  const loadData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/');
        return;
      }

      setUserId(user.id);

      const fetchedCourses = await getCourses(user.id);
      setCourses(fetchedCourses);

      // Load timetable from Firestore
      const entries = await getTimetableEntries(user.id);
      const slots: TimeSlot[] = entries.map(entry => ({
        id: entry.id,
        day: getDayName(entry.dayOfWeek),
        startTime: entry.startTime,
        endTime: entry.endTime,
        courseId: entry.courseId,
        location: entry.location,
        type: entry.type || 'lecture',
      }));
      setTimeSlots(slots);
    } catch (error) {
      console.error('Load data error:', error);
      Alert.alert('Error', 'Failed to load timetable data');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        Alert.alert(
          'Image Selected',
          'OCR feature coming soon! For now, please add classes manually using the + button.'
        );
      }
    } catch (error) {
      console.error('Image pick error:', error);
    }
  };

  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
      });

      if (result.assets && result.assets[0]) {
        Alert.alert(
          'Document Selected',
          'PDF parsing coming soon! For now, please add classes manually using the + button.'
        );
      }
    } catch (error) {
      console.error('Document pick error:', error);
    }
  };

  const formatTime = (hour: string, minute: string): string => {
    return `${hour}:${minute}`;
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const openAddModal = () => {
    setEditingSlot(null);
    setSelectedDay('Monday');
    setSelectedCourse(courses[0]?.id || '');
    setStartHour('09');
    setStartMinute('00');
    setEndHour('10');
    setEndMinute('00');
    setLocation('');
    setClassType('lecture');
    setShowAddModal(true);
  };

  const openEditModal = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setSelectedDay(slot.day);
    setSelectedCourse(slot.courseId);
    
    const [startH, startM] = slot.startTime.split(':');
    setStartHour(startH);
    setStartMinute(startM);
    
    const [endH, endM] = slot.endTime.split(':');
    setEndHour(endH);
    setEndMinute(endM);
    
    setLocation(slot.location || '');
    setClassType(slot.type);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!userId) return;

    if (!selectedCourse) {
      Alert.alert('Error', 'Please select a course');
      return;
    }

    const startTimeNum = parseInt(startHour) * 60 + parseInt(startMinute);
    const endTimeNum = parseInt(endHour) * 60 + parseInt(endMinute);

    if (startTimeNum >= endTimeNum) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      const entryData: any = {
        userId,
        courseId: selectedCourse,
        dayOfWeek: getDayNumber(selectedDay),
        startTime: formatTime(startHour, startMinute),
        endTime: formatTime(endHour, endMinute),
        type: classType,
      };
      
      // Only add location if it has a value
      if (location && location.trim()) {
        entryData.location = location.trim();
      }

      if (editingSlot) {
        // Update existing entry - only include location if it exists
        const updateData: any = {
          courseId: entryData.courseId,
          dayOfWeek: entryData.dayOfWeek,
          startTime: entryData.startTime,
          endTime: entryData.endTime,
          type: entryData.type,
        };
        if (entryData.location) {
          updateData.location = entryData.location;
        }
        await updateTimetableEntry(editingSlot.id, updateData);
      } else {
        // Create new entry
        await createTimetableEntry(entryData);
      }

      // Reload data from Firestore
      await loadTimetableData();
      setShowAddModal(false);
      Alert.alert('Success', `Class ${editingSlot ? 'updated' : 'added'} successfully`);
    } catch (error) {
      console.error('Error saving timetable entry:', error);
      Alert.alert('Error', 'Failed to save timetable entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (slotId: string) => {
    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(slotId);
            try {
              await deleteTimetableEntry(slotId);
              await loadTimetableData();
              Alert.alert('Success', 'Class deleted successfully');
            } catch (error) {
              console.error('Error deleting timetable entry:', error);
              Alert.alert('Error', 'Failed to delete class');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const getSlotForDayAndTime = (day: string, time: string): TimeSlot | null => {
    return timeSlots.find(slot => {
      if (slot.day !== day) return false;
      const slotStart = slot.startTime;
      const slotEnd = slot.endTime;
      return time >= slotStart && time < slotEnd;
    }) || null;
  };

  const getCourseForSlot = (slot: TimeSlot): Course | undefined => {
    return courses.find(c => c.id === slot.courseId);
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'lecture': return '📚';
      case 'lab': return '🔬';
      case 'tutorial': return '✏️';
      default: return '📖';
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
          source={ILLUSTRATIONS.heroStudy6}
          style={styles.headerBackgroundImage}
          contentFit="cover"
        />
        <LinearGradient 
          colors={['rgba(88,86,214,0.89)', 'rgba(108,99,255,0.89)']} 
          style={styles.header}
        >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.headerText}>My Timetable</Text>
            <Text style={styles.headerSubtext}>Weekly Class Schedule</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* Upload Options */}
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>📸 Import Timetable</Text>
          <View style={styles.uploadButtons}>
            <TouchableOpacity style={styles.uploadButton} onPress={handleImagePick}>
              <Ionicons name="image-outline" size={24} color={COLORS.primary} />
              <Text style={styles.uploadText}>Upload Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadButton} onPress={handleDocumentPick}>
              <Ionicons name="document-outline" size={24} color={COLORS.primary} />
              <Text style={styles.uploadText}>Upload PDF</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.uploadHint}>
            Coming soon: Auto-extract classes from images and PDFs!
          </Text>
        </View>

        {/* Timetable Grid */}
        <View style={styles.timetableSection}>
          <Text style={styles.sectionTitle}>📅 Weekly Schedule</Text>
          
          {timeSlots.length === 0 ? (
            <View style={styles.emptyState}>
              <Image 
                source={ILLUSTRATIONS.schedule}
                style={styles.emptyStateImage}
                contentFit="contain"
              />
              <Text style={styles.emptyStateText}>No classes scheduled yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the + button to add your first class
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Header Row */}
                <View style={styles.gridHeader}>
                  <View style={styles.timeColumn}>
                    <Text style={styles.headerCell}>Time</Text>
                  </View>
                  {DAYS.map(day => (
                    <View key={day} style={styles.dayColumn}>
                      <Text style={styles.headerCell}>{day.substring(0, 3)}</Text>
                    </View>
                  ))}
                </View>

                {/* Time Slots */}
                <ScrollView style={styles.gridBody}>
                  {TIME_SLOTS.map(time => (
                    <View key={time} style={styles.gridRow}>
                      <View style={styles.timeColumn}>
                        <Text style={styles.timeCell}>{time}</Text>
                      </View>
                      {DAYS.map(day => {
                        const slot = getSlotForDayAndTime(day, time);
                        const course = slot ? getCourseForSlot(slot) : null;
                        
                        const isDeleting = slot && deleting === slot.id;
                        
                        return (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.dayColumn,
                              slot && styles.slotFilled,
                              { 
                                backgroundColor: course?.color || '#f5f5f5',
                                opacity: isDeleting ? 0.5 : 1,
                              },
                            ]}
                            onPress={() => slot && !isDeleting && openEditModal(slot)}
                            onLongPress={() => slot && !isDeleting && handleDelete(slot.id)}
                            disabled={!!isDeleting}
                          >
                            {isDeleting ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : slot && course ? (
                              <View style={styles.slotContent}>
                                <Text style={styles.slotType}>{getTypeIcon(slot.type)}</Text>
                                <Text style={styles.slotCourse} numberOfLines={2}>
                                  {course.name}
                                </Text>
                                {slot.location && (
                                  <Text style={styles.slotLocation} numberOfLines={1}>
                                    📍 {slot.location}
                                  </Text>
                                )}
                              </View>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
          )}
        </View>

        {/* Class List */}
        {timeSlots.length > 0 && (
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>📚 All Classes</Text>
            {DAYS.map(day => {
              const daySlots = timeSlots
                .filter(slot => slot.day === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
              
              if (daySlots.length === 0) return null;
              
              return (
                <View key={day} style={styles.daySection}>
                  <Text style={styles.dayTitle}>{day}</Text>
                  {daySlots.map((slot, index) => {
                    const course = getCourseForSlot(slot);
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.classCard, { borderLeftColor: course?.color || COLORS.primary }]}
                        onPress={() => openEditModal(slot)}
                      >
                        <View style={styles.classInfo}>
                          <Text style={styles.classTime}>
                            {slot.startTime} - {slot.endTime}
                          </Text>
                          <Text style={styles.className}>
                            {getTypeIcon(slot.type)} {course?.name || 'Unknown Course'}
                          </Text>
                          {slot.location && (
                            <Text style={styles.classLocation}>📍 {slot.location}</Text>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDelete(slot.id)}
                          style={styles.deleteIcon}
                        >
                          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSlot ? 'Edit Class' : 'Add Class'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {/* Day Picker */}
              <Text style={styles.inputLabel}>Day</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedDay}
                  onValueChange={setSelectedDay}
                  style={styles.picker}
                  mode="dropdown"
                >
                  {DAYS.map(day => (
                    <Picker.Item key={day} label={day} value={day} />
                  ))}
                </Picker>
              </View>

              {/* Course Picker */}
              <Text style={styles.inputLabel}>Course</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedCourse}
                  onValueChange={setSelectedCourse}
                  style={styles.picker}
                  mode="dropdown"
                >
                  {courses.map(course => (
                    <Picker.Item key={course.id} label={course.name} value={course.id} />
                  ))}
                </Picker>
              </View>

              {/* Start Time */}
              <Text style={styles.inputLabel}>Start Time</Text>
              <View style={styles.timePickerRow}>
                <View style={[styles.pickerContainer, { flex: 1 }]}>
                  <Picker
                    selectedValue={startHour}
                    onValueChange={setStartHour}
                    style={styles.picker}
                    mode="dropdown"
                  >
                    {hours.map(hour => (
                      <Picker.Item key={hour} label={hour} value={hour} />
                    ))}
                  </Picker>
                </View>
                <Text style={styles.timeSeparator}>:</Text>
                <View style={[styles.pickerContainer, { flex: 1 }]}>
                  <Picker
                    selectedValue={startMinute}
                    onValueChange={setStartMinute}
                    style={styles.picker}
                    mode="dropdown"
                  >
                    {minutes.map(minute => (
                      <Picker.Item key={minute} label={minute} value={minute} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* End Time */}
              <Text style={styles.inputLabel}>End Time</Text>
              <View style={styles.timePickerRow}>
                <View style={[styles.pickerContainer, { flex: 1 }]}>
                  <Picker
                    selectedValue={endHour}
                    onValueChange={setEndHour}
                    style={styles.picker}
                    mode="dropdown"
                  >
                    {hours.map(hour => (
                      <Picker.Item key={hour} label={hour} value={hour} />
                    ))}
                  </Picker>
                </View>
                <Text style={styles.timeSeparator}>:</Text>
                <View style={[styles.pickerContainer, { flex: 1 }]}>
                  <Picker
                    selectedValue={endMinute}
                    onValueChange={setEndMinute}
                    style={styles.picker}
                    mode="dropdown"
                  >
                    {minutes.map(minute => (
                      <Picker.Item key={minute} label={minute} value={minute} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Type */}
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeButtons}>
                {(['lecture', 'lab', 'tutorial', 'other'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      classType === type && styles.typeButtonActive,
                    ]}
                    onPress={() => setClassType(type)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        classType === type && styles.typeButtonTextActive,
                      ]}
                    >
                      {getTypeIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Location */}
              <Text style={styles.inputLabel}>Location (Optional)</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g., Room 301, Building A"
                placeholderTextColor={COLORS.textSecondary}
              />

              {/* Save Button */}
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <LinearGradient
                  colors={saving ? ['#ccc', '#aaa'] : [COLORS.primary, COLORS.secondary]}
                  style={styles.saveButton}
                >
                  {saving ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.saveButtonText}>Saving...</Text>
                    </View>
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingSlot ? 'Update Class' : 'Add Class'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  uploadSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  uploadHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  timetableSection: {
    padding: 16,
  },
  gridHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timeColumn: {
    width: 70,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  dayColumn: {
    width: 120,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    minHeight: 60,
  },
  headerCell: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  timeCell: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  slotFilled: {
    opacity: 0.9,
  },
  slotContent: {
    alignItems: 'center',
  },
  slotType: {
    fontSize: 20,
    marginBottom: 4,
  },
  slotCourse: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  slotLocation: {
    fontSize: 9,
    color: '#fff',
    marginTop: 2,
  },
  gridBody: {
    maxHeight: 800,
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 48,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateImage: {
    width: 180,
    height: 180,
    marginBottom: 16,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
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
  listSection: {
    padding: 16,
  },
  daySection: {
    marginBottom: 24,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  classCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classInfo: {
    flex: 1,
  },
  classTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  className: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 4,
  },
  classLocation: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  deleteIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  timeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
  },
  timeButtonText: {
    fontSize: 16,
    color: COLORS.text,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: '#fff',
  },
  saveButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
