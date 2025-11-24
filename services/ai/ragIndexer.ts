/**
 * RAG Auto-Indexing Service
 * Automatically indexes user content into vector store
 */

import { Task } from '../../types';
import { getCourses } from '../courseServiceFirestore';
import { getStudySessionsByCourse } from '../studyServiceFirestore';
import { getTasks } from '../taskServiceFirestore';
import {
    indexContent
} from './ragService';

/**
 * Index a task into vector store
 */
export async function indexTask(task: Task): Promise<void> {
  try {
    // Build searchable content
    const content = `
Task: ${task.title}
Type: ${task.type}
Priority: ${task.priority}
Status: ${task.status}
Due Date: ${task.dueDate.toLocaleDateString()}
${task.description ? `Description: ${task.description}` : ''}
${task.estimatedHours ? `Estimated Hours: ${task.estimatedHours}` : ''}
    `.trim();

    await indexContent(
      `task_${task.id}`,
      content,
      'task',
      {
        userId: task.userId,
        courseId: task.courseId,
        title: task.title || 'Untitled Task',
        date: task.dueDate.toISOString(),
        priority: task.priority,
        status: task.status,
        type: task.type,
        taskType: task.type, // Store as separate field to avoid confusion
      }
    );
  } catch (error) {
    console.error('Error indexing task:', error);
    // Log but don't throw - indexing failures shouldn't break task creation
  }
}

/**
 * Index course materials into vector store
 */
export async function indexCourse(course: any): Promise<void> {
  try {
    const content = `
Course: ${course.code} - ${course.name}
${course.instructor ? `Instructor: ${course.instructor}` : ''}
${course.credits ? `Credits: ${course.credits}` : ''}
${course.difficulty ? `Difficulty: ${course.difficulty}/5` : ''}
    `.trim();

    await indexContent(
      `course_${course.id}`,
      content,
      'course_material',
      {
        userId: course.userId,
        courseId: course.id,
        title: `${course.code} - ${course.name}`,
        date: course.createdAt?.toISOString(),
      }
    );
  } catch (error) {
    console.error('Error indexing course:', error);
    // Log but don't throw - indexing failures shouldn't break course creation
  }
}

/**
 * Index study session into vector store
 */
export async function indexStudySession(session: any): Promise<void> {
  try {
    const content = `
Study Session
Date: ${session.date.toLocaleDateString()}
Duration: ${session.duration} minutes
${session.topic ? `Topic: ${session.topic}` : ''}
${session.notes ? `Notes: ${session.notes}` : ''}
${session.effectiveness ? `Effectiveness: ${session.effectiveness}/5` : ''}
    `.trim();

    await indexContent(
      `study_${session.id}`,
      content,
      'study_session',
      {
        userId: session.userId,
        courseId: session.courseId,
        title: session.topic || 'Study Session',
        date: session.date.toISOString(),
        duration: session.duration,
        effectiveness: session.effectiveness,
      }
    );
  } catch (error) {
    console.error('Error indexing study session:', error);
  }
}

/**
 * Index chat message into vector store
 */
export async function indexChatMessage(
  message: string,
  userId: string,
  metadata: {
    messageId: string;
    timestamp: Date;
    context?: string;
  }
): Promise<void> {
  try {
    await indexContent(
      `chat_${metadata.messageId}`,
      message,
      'chat_history',
      {
        userId,
        title: message.substring(0, 50),
        date: metadata.timestamp.toISOString(),
        context: metadata.context,
      }
    );
  } catch (error) {
    console.error('Error indexing chat message:', error);
  }
}

/**
 * Index all user data (initial setup or refresh)
 */
export async function indexAllUserData(userId: string): Promise<{
  success: boolean;
  indexed: {
    tasks: number;
    courses: number;
    sessions: number;
  };
  errors: string[];
}> {
  const result = {
    success: true,
    indexed: {
      tasks: 0,
      courses: 0,
      sessions: 0,
    },
    errors: [] as string[],
  };

  try {
    console.log('Starting full user data indexing...');

    // Index all tasks
    try {
      const tasks = await getTasks(userId);
      for (const task of tasks) {
        await indexTask(task);
        result.indexed.tasks++;
      }
    } catch (error) {
      result.errors.push(`Tasks: ${error}`);
    }

    // Index all courses
    try {
      const courses = await getCourses(userId);
      for (const course of courses) {
        await indexCourse(course);
        result.indexed.courses++;
      }

      // Index study sessions for each course
      for (const course of courses) {
        try {
          const sessions = await getStudySessionsByCourse(course.id);
          for (const session of sessions) {
            await indexStudySession(session);
            result.indexed.sessions++;
          }
        } catch (error) {
          result.errors.push(`Sessions for ${course.code}: ${error}`);
        }
      }
    } catch (error) {
      result.errors.push(`Courses: ${error}`);
    }

    console.log('Indexing complete:', result.indexed);
    return result;
  } catch (error) {
    console.error('Error indexing all user data:', error);
    result.success = false;
    result.errors.push(`General: ${error}`);
    return result;
  }
}

/**
 * Auto-index when data changes (call these after CRUD operations)
 */
export const RAGIndexingHooks = {
  onTaskCreated: indexTask,
  onTaskUpdated: indexTask,
  onCourseCreated: indexCourse,
  onCourseUpdated: indexCourse,
  onStudySessionCreated: indexStudySession,
  onChatMessage: indexChatMessage,
};
