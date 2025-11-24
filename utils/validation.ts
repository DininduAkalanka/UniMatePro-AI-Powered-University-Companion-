/**
 * Input Validation Utilities
 * Provides comprehensive validation for all user inputs
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface StudySessionInput {
  courseId: string;
  taskId?: string | null;
  topic?: string;
  duration: number; // in minutes
  notes?: string;
  effectiveness?: 1 | 2 | 3 | 4 | 5 | null;
}

export interface TaskInput {
  title: string;
  description?: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  courseId: string;
}

export interface CourseInput {
  name: string;
  code: string;
  color: string;
}

/**
 * Validate study session data before saving
 */
export const validateStudySession = (data: StudySessionInput): ValidationResult => {
  const errors: string[] = [];
  
  // Required field: courseId
  if (!data.courseId || data.courseId.trim() === '') {
    errors.push('Course is required');
  }
  
  // Duration validation
  if (typeof data.duration !== 'number' || isNaN(data.duration)) {
    errors.push('Duration must be a valid number');
  } else if (data.duration < 1) {
    errors.push('Duration must be at least 1 minute');
  } else if (data.duration > 480) {
    errors.push('Duration cannot exceed 8 hours (480 minutes)');
  }
  
  // Topic validation (optional but limited)
  if (data.topic && data.topic.length > 200) {
    errors.push('Topic cannot exceed 200 characters');
  }
  
  // Notes validation (optional but limited)
  if (data.notes && data.notes.length > 2000) {
    errors.push('Notes cannot exceed 2000 characters');
  }
  
  // Effectiveness validation (optional but must be 1-5)
  if (data.effectiveness !== null && 
      data.effectiveness !== undefined && 
      (data.effectiveness < 1 || data.effectiveness > 5)) {
    errors.push('Effectiveness must be between 1 and 5');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate task data before saving
 */
export const validateTask = (data: TaskInput): ValidationResult => {
  const errors: string[] = [];
  
  // Title validation
  if (!data.title || data.title.trim() === '') {
    errors.push('Task title is required');
  } else if (data.title.length > 200) {
    errors.push('Task title cannot exceed 200 characters');
  }
  
  // Description validation (optional)
  if (data.description && data.description.length > 2000) {
    errors.push('Task description cannot exceed 2000 characters');
  }
  
  // Due date validation
  if (!data.dueDate || !(data.dueDate instanceof Date)) {
    errors.push('Valid due date is required');
  } else if (data.dueDate < new Date()) {
    errors.push('Due date cannot be in the past');
  }
  
  // Priority validation
  if (!['low', 'medium', 'high'].includes(data.priority)) {
    errors.push('Priority must be low, medium, or high');
  }
  
  // Course ID validation
  if (!data.courseId || data.courseId.trim() === '') {
    errors.push('Course is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate course data before saving
 */
export const validateCourse = (data: CourseInput): ValidationResult => {
  const errors: string[] = [];
  
  // Name validation
  if (!data.name || data.name.trim() === '') {
    errors.push('Course name is required');
  } else if (data.name.length > 100) {
    errors.push('Course name cannot exceed 100 characters');
  }
  
  // Code validation
  if (!data.code || data.code.trim() === '') {
    errors.push('Course code is required');
  } else if (data.code.length > 20) {
    errors.push('Course code cannot exceed 20 characters');
  }
  
  // Color validation (must be valid hex color)
  const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;
  if (!data.color || !hexColorRegex.test(data.color)) {
    errors.push('Valid hex color is required (e.g., #FF5733)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize text input (remove dangerous characters, XSS prevention)
 */
export const sanitizeText = (text: string, maxLength?: number): string => {
  if (!text) return '';
  
  // Remove null bytes and control characters
  let sanitized = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Apply max length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate date is within reasonable range
 */
export const validateDateRange = (
  date: Date,
  minDate?: Date,
  maxDate?: Date
): ValidationResult => {
  const errors: string[] = [];
  
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    errors.push('Invalid date');
    return { valid: false, errors };
  }
  
  if (minDate && date < minDate) {
    errors.push(`Date cannot be before ${minDate.toLocaleDateString()}`);
  }
  
  if (maxDate && date > maxDate) {
    errors.push(`Date cannot be after ${maxDate.toLocaleDateString()}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate number is within range
 */
export const validateNumberRange = (
  value: number,
  min: number,
  max: number,
  fieldName: string = 'Value'
): ValidationResult => {
  const errors: string[] = [];
  
  if (typeof value !== 'number' || isNaN(value)) {
    errors.push(`${fieldName} must be a valid number`);
  } else if (value < min) {
    errors.push(`${fieldName} must be at least ${min}`);
  } else if (value > max) {
    errors.push(`${fieldName} cannot exceed ${max}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};
