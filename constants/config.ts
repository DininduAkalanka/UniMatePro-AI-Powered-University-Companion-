import Constants from 'expo-constants';

// Helper function to safely get environment variables
const getEnvVar = (key: string): string => {
  return Constants.expoConfig?.extra?.[key] || 
         process.env[key] || 
         '';
};

// App Configuration
export const APP_CONFIG = {
  name: 'UniMate',
  version: '1.0.0',
  apiTimeout: 30000, // 30 seconds
  maxRetries: 3,
};

// Hugging Face API Configuration
export const HUGGING_FACE_API = {
  baseUrl: 'https://api-inference.huggingface.co/models',
  // API key loaded from environment variables for security
  apiKey: getEnvVar('EXPO_PUBLIC_HUGGING_FACE_API_KEY'),
  models: {
    // Updated to current working models (as of Nov 2025)
    // Using text generation models that are actively maintained
    summarization: 'facebook/bart-large-cnn', // Summarization - works
    qa: 'deepset/roberta-base-squad2', // Q&A - works
    chat: 'gpt2', // Lightweight, always available
    chatFallback: 'distilgpt2', // Even lighter fallback
    chatAdvanced: 'EleutherAI/gpt-neo-125M', // Better responses if available
  },
  maxTokens: {
    summarization: 150,
    qa: 200,
    chat: 100,
  },
};

// Database Configuration
export const DB_CONFIG = {
  name: 'unimate.db',
  version: 1,
};

// Study Configuration
export const STUDY_CONFIG = {
  defaultSessionDuration: 60, // minutes
  defaultBreakDuration: 15, // minutes
  minStudyHoursPerDay: 2,
  maxStudyHoursPerDay: 10,
  difficultyMultipliers: {
    1: 0.8, // Easy
    2: 1.0, // Normal
    3: 1.2, // Medium
    4: 1.5, // Hard
    5: 2.0, // Very Hard
  },
};

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  deadlineWarningDays: [7, 3, 1], // Days before deadline to send reminders
  studyReminderInterval: 4, // hours
  achievementNotifications: true,
};

// Colors for UI
export const COLORS = {
  primary: '#6366F1', // Indigo
  secondary: '#8B5CF6', // Purple
  accent: '#EC4899', // Pink
  success: '#10B981', // Green
  warning: '#F59E0B', // Amber
  error: '#EF4444', // Red
  info: '#3B82F6', // Blue
  
  // Task priorities
  priorityLow: '#10B981',
  priorityMedium: '#F59E0B',
  priorityHigh: '#EF4444',
  priorityUrgent: '#DC2626',
  
  // Course colors (for calendar)
  courseColors: [
    '#EF4444', '#F97316', '#F59E0B', '#84CC16',
    '#10B981', '#14B8A6', '#06B6D4', '#3B82F6',
    '#6366F1', '#8B5CF6', '#A855F7', '#EC4899',
  ],
  
  // Backgrounds
  background: '#FFFFFF',
  backgroundDark: '#1F2937',
  surface: '#F9FAFB',
  surfaceDark: '#374151',
  
  // Text
  text: '#111827',
  textSecondary: '#6B7280',
  textDark: '#F9FAFB',
  textSecondaryDark: '#D1D5DB',
};

// Date/Time Configuration
export const DATE_FORMATS = {
  display: 'MMM dd, yyyy',
  displayWithTime: 'MMM dd, yyyy HH:mm',
  time: 'HH:mm',
  database: "yyyy-MM-dd'T'HH:mm:ss",
};

// AI Prompts
export const AI_PROMPTS = {
  studyPlanGeneration: `You are an AI study planner. Generate a realistic study schedule based on the following information:
- Available time per day
- Upcoming deadlines
- Course difficulty levels
- Student's progress

Provide a day-by-day breakdown with specific topics and time allocations.`,

  summarization: 'Please provide a concise summary of the following academic content, highlighting key concepts and important points:',
  
  examPreparation: `Based on the course content and timeline, suggest:
1. Key topics to focus on
2. Recommended study order
3. Time allocation for each topic
4. Practice recommendations`,
};

// Validation Rules
export const VALIDATION = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: {
    minLength: 6,
    requireUppercase: false,
    requireNumber: false,
    requireSpecial: false,
  },
  taskTitle: {
    minLength: 3,
    maxLength: 100,
  },
  courseName: {
    minLength: 2,
    maxLength: 100,
  },
};
