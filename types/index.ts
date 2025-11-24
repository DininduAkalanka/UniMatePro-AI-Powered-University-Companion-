// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  studentId?: string;
  university?: string;
  department?: string;
  year?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Course Types
export interface Course {
  id: string;
  userId: string;
  code: string;
  name: string;
  credits?: number;
  instructor?: string;
  color?: string;
  difficulty?: 1 | 2 | 3 | 4 | 5; // 1=Easy, 5=Hard
  createdAt: Date;
  updatedAt: Date;
}

// Task Types
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue'
}

export enum TaskType {
  ASSIGNMENT = 'assignment',
  EXAM = 'exam',
  QUIZ = 'quiz',
  PROJECT = 'project',
  STUDY = 'study',
  OTHER = 'other'
}

export interface Task {
  id: string;
  userId: string;
  courseId: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date;
  estimatedHours?: number;
  completedHours?: number;
  reminderDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Timetable Types
export interface TimetableEntry {
  id: string;
  userId: string;
  courseId: string;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  startTime: string; // HH:MM format
  endTime: string;
  location?: string;
  type?: 'lecture' | 'lab' | 'tutorial';
  createdAt: Date;
}

// Study Session Types
export interface StudySession {
  id: string;
  userId: string;
  courseId: string;
  taskId?: string;
  topic?: string;
  duration: number; // minutes
  notes?: string;
  effectiveness?: 1 | 2 | 3 | 4 | 5; // self-rated
  date: Date;
  createdAt: Date;
}

// Study Plan Types
export interface StudyPlan {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  aiGenerated: boolean;
}

export interface StudyPlanEntry {
  id: string;
  planId: string;
  courseId: string;
  taskId?: string;
  topic: string;
  date: Date;
  startTime: string;
  duration: number; // minutes
  priority: TaskPriority;
  completed: boolean;
}

// Chat Types
export interface ChatMessage {
  id: string;
  userId: string;
  text: string;
  isUserMessage: boolean;
  aiModel?: 'summarization' | 'qa' | 'chat';
  attachmentUrl?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

// AI Service Types
export interface AIRequest {
  text: string;
  model: 'summarization' | 'qa' | 'chat';
  context?: string;
  maxLength?: number;
}

export interface AIResponse {
  text: string;
  confidence?: number;
  model: string;
  processingTime?: number;
}

// Notification Types
export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'deadline' | 'study_reminder' | 'achievement' | 'warning';
  relatedId?: string; // taskId, courseId, etc.
  read: boolean;
  scheduledFor?: Date;
  createdAt: Date;
}

// Analytics Types
export interface StudyAnalytics {
  userId: string;
  courseId?: string;
  totalStudyHours: number;
  totalSessions: number;
  averageSessionDuration: number;
  mostStudiedCourse?: string;
  studyStreak: number; // consecutive days
  tasksCompleted: number;
  tasksOverdue: number;
  period: 'day' | 'week' | 'month' | 'semester';
}

// Deadline Prediction Types
export interface DeadlinePrediction {
  taskId: string;
  isAtRisk: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedHoursPerDay: number;
  daysRemaining: number;
  completionPercentage: number;
  prediction: string;
}

// Settings Types
export interface UserSettings {
  userId: string;
  notifications: {
    enabled: boolean;
    deadlineReminder: boolean;
    studyReminder: boolean;
    achievements: boolean;
  };
  studyPreferences: {
    dailyStudyGoal: number; // hours
    preferredStudyTime: 'morning' | 'afternoon' | 'evening' | 'night';
    breakInterval: number; // minutes
  };
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'si';
}

// API Response Types
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// Sync Types
export interface SyncStatus {
  lastSyncAt?: Date;
  pendingChanges: number;
  isSyncing: boolean;
}
