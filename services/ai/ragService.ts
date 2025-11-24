/**
 * RAG (Retrieval Augmented Generation) Service
 * Semantic search and context-aware AI responses using user's data
 * 
 * Features:
 * - Semantic search across notes, tasks, and course materials
 * - Vector embeddings using Hugging Face (FREE)
 * - Local vector storage with AsyncStorage
 * - Context-aware AI responses
 * - No paid APIs required
 */

import { HfInference } from '@huggingface/inference';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { errorTracker } from '../../utils/errorTracking';
import { generateAIResponse } from '../aiServiceEnhanced';

// Initialize Hugging Face
const HF_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_HUGGING_FACE_API_KEY || 
  process.env.EXPO_PUBLIC_HUGGING_FACE_API_KEY || '';
const hf = HF_API_KEY ? new HfInference(HF_API_KEY) : null;

// Storage keys
const STORAGE_KEYS = {
  VECTOR_STORE: '@rag_vector_store',
  LAST_INDEXED: '@rag_last_indexed',
};

/**
 * Vectorized content structure
 */
export interface VectorizedContent {
  id: string;
  content: string;
  embedding: number[];
  type: 'note' | 'task' | 'course_material' | 'study_session' | 'chat_history';
  metadata: {
    userId: string;
    courseId?: string;
    title?: string;
    date?: string;
    priority?: string;
    [key: string]: any;
  };
  timestamp: number;
}

/**
 * Search result with similarity score
 */
export interface SearchResult extends VectorizedContent {
  similarity: number;
  relevanceScore: number;
}

/**
 * Generate embeddings for text using Hugging Face
 * Model: sentence-transformers/all-MiniLM-L6-v2 (FREE, fast, 384 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    if (!hf) {
      // Fallback: Simple TF-IDF-like embedding
      return generateSimpleEmbedding(text);
    }

    // Use Hugging Face feature extraction
    const result = await hf.featureExtraction({
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      inputs: text,
    });

    // Handle different response formats
    let embedding: number[];
    if (Array.isArray(result)) {
      // If result is already an array
      if (Array.isArray(result[0])) {
        // If nested array, flatten or take first
        embedding = result[0] as number[];
      } else {
        embedding = result as number[];
      }
    } else {
      // Fallback to simple embedding
      embedding = generateSimpleEmbedding(text);
    }

    // Normalize embedding
    return normalizeVector(embedding);
  } catch (error) {
    console.error('Error generating embedding:', error);
    errorTracker.captureError(error as Error, {
      metadata: {
        context: 'generateEmbedding',
        textLength: text.length,
      }
    });
    // Fallback to simple embedding
    return generateSimpleEmbedding(text);
  }
}

/**
 * Simple embedding fallback (TF-IDF-like)
 * Creates a 384-dimensional vector for compatibility
 */
function generateSimpleEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(384).fill(0);
  
  // Hash words into embedding space
  words.forEach((word, idx) => {
    const hash = word.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    
    const position = Math.abs(hash) % 384;
    embedding[position] += 1 / (idx + 1); // TF-IDF-like weighting
  });
  
  return normalizeVector(embedding);
}

/**
 * Normalize vector to unit length
 */
function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map(val => val / magnitude);
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
  }
  
  return dotProduct; // Vectors are already normalized
}

/**
 * Add content to vector store
 */
export async function addToVectorStore(content: VectorizedContent): Promise<void> {
  try {
    // Get existing store
    const storeData = await AsyncStorage.getItem(STORAGE_KEYS.VECTOR_STORE);
    const store: VectorizedContent[] = storeData ? JSON.parse(storeData) : [];
    
    // Check if already exists (update instead)
    const existingIndex = store.findIndex(item => item.id === content.id);
    if (existingIndex >= 0) {
      store[existingIndex] = content;
    } else {
      store.push(content);
    }
    
    // Limit store size (keep last 1000 items)
    if (store.length > 1000) {
      store.sort((a, b) => b.timestamp - a.timestamp);
      store.splice(1000);
    }
    
    // Save back
    await AsyncStorage.setItem(STORAGE_KEYS.VECTOR_STORE, JSON.stringify(store));
    
    errorTracker.addBreadcrumb({
      category: 'rag',
      message: `Added ${content.type} to vector store`,
      level: 'info',
    });
  } catch (error) {
    console.error('Error adding to vector store:', error);
    errorTracker.captureError(error as Error, {
      metadata: {
        context: 'addToVectorStore',
        contentType: content.type,
      }
    });
  }
}

/**
 * Index content (generate embedding and store)
 */
export async function indexContent(
  id: string,
  content: string,
  type: VectorizedContent['type'],
  metadata: VectorizedContent['metadata']
): Promise<void> {
  try {
    // Generate embedding
    const embedding = await generateEmbedding(content);
    
    // Create vectorized content
    const vectorizedContent: VectorizedContent = {
      id,
      content,
      embedding,
      type,
      metadata,
      timestamp: Date.now(),
    };
    
    // Add to store
    await addToVectorStore(vectorizedContent);
  } catch (error) {
    console.error('Error indexing content:', error);
    throw error;
  }
}

/**
 * Batch index multiple items
 */
export async function batchIndexContent(
  items: Array<{
    id: string;
    content: string;
    type: VectorizedContent['type'];
    metadata: VectorizedContent['metadata'];
  }>
): Promise<void> {
  try {
    for (const item of items) {
      await indexContent(item.id, item.content, item.type, item.metadata);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_INDEXED, Date.now().toString());
  } catch (error) {
    console.error('Error batch indexing:', error);
    throw error;
  }
}

/**
 * Semantic search across vector store
 */
export async function semanticSearch(
  query: string,
  userId: string,
  options: {
    limit?: number;
    types?: VectorizedContent['type'][];
    courseId?: string;
    minSimilarity?: number;
    statusFilter?: string[];  // NEW: Filter by task status
    priorityFilter?: string[];  // NEW: Filter by priority
  } = {}
): Promise<SearchResult[]> {
  try {
    const { limit = 5, types, courseId, minSimilarity = 0.3, statusFilter, priorityFilter } = options;
    
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    
    // Load vector store
    const storeData = await AsyncStorage.getItem(STORAGE_KEYS.VECTOR_STORE);
    if (!storeData) return [];
    
    const store: VectorizedContent[] = JSON.parse(storeData);
    
    // Filter by userId and optional filters
    let filtered = store.filter(item => item.metadata.userId === userId);
    
    if (types && types.length > 0) {
      filtered = filtered.filter(item => types.includes(item.type));
    }
    
    if (courseId) {
      filtered = filtered.filter(item => item.metadata.courseId === courseId);
    }
    
    // NEW: Filter by task status (e.g., only 'todo', exclude 'completed')
    if (statusFilter && statusFilter.length > 0) {
      filtered = filtered.filter(item => 
        item.type === 'task' && 
        item.metadata.status && 
        statusFilter.includes(item.metadata.status)
      );
    }
    
    // NEW: Filter by priority
    if (priorityFilter && priorityFilter.length > 0) {
      filtered = filtered.filter(item => 
        item.metadata.priority && 
        priorityFilter.includes(item.metadata.priority)
      );
    }
    
    // Calculate similarities
    const results: SearchResult[] = filtered.map(item => {
      const similarity = cosineSimilarity(queryEmbedding, item.embedding);
      
      // Calculate relevance score (similarity + recency + type boost)
      const recencyScore = Math.max(0, 1 - (Date.now() - item.timestamp) / (30 * 24 * 60 * 60 * 1000)); // Decay over 30 days
      const typeBoost = getTypeBoost(item.type, query);
      const relevanceScore = (similarity * 0.7) + (recencyScore * 0.2) + (typeBoost * 0.1);
      
      return {
        ...item,
        similarity,
        relevanceScore,
      };
    });
    
    // Filter by minimum similarity
    const filtered_results = results.filter(r => r.similarity >= minSimilarity);
    
    // Sort by relevance score
    filtered_results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Return top results
    return filtered_results.slice(0, limit);
  } catch (error) {
    console.error('Error in semantic search:', error);
    errorTracker.captureError(error as Error, {
      metadata: {
        context: 'semanticSearch',
        query,
      }
    });
    return [];
  }
}

/**
 * Analyze query to determine intent and filters
 */
function analyzeQueryIntent(query: string): {
  statusFilter?: string[];
  priorityFilter?: string[];
  typeFilter?: VectorizedContent['type'][];
  excludeCompleted: boolean;
} {
  const lowerQuery = query.toLowerCase();
  
  // Detect if asking about pending/incomplete/todo tasks
  const isPendingQuery = /\b(pending|incomplete|todo|need to|should|must|upcoming|unfinished)\b/i.test(lowerQuery);
  
  // Detect if asking about completed tasks
  const isCompletedQuery = /\b(completed|finished|done|accomplished)\b/i.test(lowerQuery);
  
  // Detect priority mentions
  const highPriorityQuery = /\b(high priority|urgent|important|critical)\b/i.test(lowerQuery);
  const lowPriorityQuery = /\b(low priority|later|optional)\b/i.test(lowerQuery);
  
  return {
    statusFilter: isCompletedQuery 
      ? ['completed'] 
      : isPendingQuery 
        ? ['todo', 'in_progress'] 
        : undefined,
    priorityFilter: highPriorityQuery 
      ? ['high'] 
      : lowPriorityQuery 
        ? ['low'] 
        : undefined,
    typeFilter: /\b(task|assignment|homework|project)\b/i.test(lowerQuery) 
      ? ['task'] 
      : /\b(course|class|subject)\b/i.test(lowerQuery) 
        ? ['course_material'] 
        : undefined,
    excludeCompleted: isPendingQuery && !isCompletedQuery,
  };
}

/**
 * Get type-specific boost for relevance scoring
 */
function getTypeBoost(type: VectorizedContent['type'], query: string): number {
  const lowerQuery = query.toLowerCase();
  
  // Boost tasks if query is about deadlines, todos
  if (type === 'task' && /\b(deadline|due|todo|task|complete|pending)\b/i.test(lowerQuery)) {
    return 0.3;
  }
  
  // Boost notes if query is about concepts, topics
  if (type === 'note' && /\b(explain|what is|how|concept|topic)\b/i.test(lowerQuery)) {
    return 0.3;
  }
  
  // Boost study sessions if query is about studying, learning
  if (type === 'study_session' && /\b(study|learn|practice|review)\b/i.test(lowerQuery)) {
    return 0.3;
  }
  
  return 0;
}

/**
 * Answer question with context from user's data
 */
export async function answerWithContext(
  question: string,
  userId: string,
  options: {
    includeTypes?: VectorizedContent['type'][];
    courseId?: string;
    maxContextLength?: number;
  } = {}
): Promise<{
  answer: string;
  sources: SearchResult[];
  confidence: number;
}> {
  try {
    const { includeTypes, courseId, maxContextLength = 2000 } = options;
    
    // Analyze query to determine intent
    const intent = analyzeQueryIntent(question);
    
    // Find relevant content with smart filtering
    const relevantDocs = await semanticSearch(question, userId, {
      limit: 5,
      types: includeTypes || intent.typeFilter,
      courseId,
      minSimilarity: 0.4,
      statusFilter: intent.statusFilter,
      priorityFilter: intent.priorityFilter,
    });
    
    if (relevantDocs.length === 0) {
      // Check if user asked about pending tasks but all are completed
      const allTasksQuery = await semanticSearch(question, userId, {
        limit: 1,
        types: ['task'],
        minSimilarity: 0.3,
        statusFilter: ['completed'],  // Check for completed tasks
      });
      
      if (allTasksQuery.length > 0 && intent.excludeCompleted) {
        // User asked about pending tasks but all are completed!
        return {
          answer: "🎉 **Great news!** All your tasks are completed!\n\nThere are no pending tasks at the moment. You're all caught up!\n\n💡 **Suggestions:**\n• Add new tasks in the Planner tab if you have upcoming work\n• Review your completed tasks to track your progress\n• Plan ahead for next week's assignments\n\nKeep up the excellent work! 👏",
          sources: allTasksQuery,
          confidence: 95,
        };
      }
      
      return {
        answer: "I couldn't find relevant information in your indexed data to answer this question.\n\n💡 **Tips:**\n• Tap the 🔄 button to index your latest tasks and courses\n• Make sure you have tasks or courses added in the Planner tab\n• Try asking about specific tasks, deadlines, or courses you've created\n\nOr switch to Normal AI mode (tap 🤖) for general questions!",
        sources: [],
        confidence: 0,
      };
    }
    
    // Build context from relevant docs
    let context = '';
    let usedDocs: SearchResult[] = [];
    
    for (const doc of relevantDocs) {
      // Format doc type label
      const typeLabel = {
        'task': 'TASK',
        'course_material': 'COURSE',
        'study_session': 'STUDY SESSION',
        'note': 'NOTE',
        'chat_history': 'CHAT'
      }[doc.type] || doc.type.toUpperCase();
      
      const title = doc.metadata.title || 'Untitled';
      const similarity = ((doc.similarity || 0) * 100).toFixed(0);
      
      const docContext = `[${typeLabel}] ${title} (${similarity}% match)\n${doc.content}\n\n`;
      
      if (context.length + docContext.length <= maxContextLength) {
        context += docContext;
        usedDocs.push(doc);
      } else {
        break;
      }
    }
    
    // Calculate confidence based on similarity scores
    const avgSimilarity = usedDocs.reduce((sum, doc) => sum + doc.similarity, 0) / usedDocs.length;
    const confidence = Math.min(avgSimilarity * 100, 95); // Cap at 95%
    
    // Detect query type for better prompt
    const queryIntent = analyzeQueryIntent(question);
    const contextNote = queryIntent.excludeCompleted 
      ? '\n**IMPORTANT:** User is asking about PENDING/INCOMPLETE tasks ONLY. Do NOT mention completed tasks.'
      : '';
    
    // Build prompt with context
    const prompt = `You are UniMate, an AI study assistant. Answer the user's question based ONLY on their personal data provided below.

**Critical Rules:**
- ONLY use information from the context below
- Be concise and direct (2-3 paragraphs max)
- Pay attention to task STATUS (todo, in_progress, completed)
- If asked about "pending" or "should do", ONLY mention incomplete tasks
- Reference specific tasks with their status, priority, and due dates
- If context shows all tasks are completed, say "All tasks are completed!"
- Do NOT make up information or use general knowledge
- Prioritize higher-match sources (they're more relevant)${contextNote}

**User's Personal Data:**
${context}

**Question:** ${question}

**Answer (be specific about task status and dates):**`;

    // Get AI response
    const aiResponse = await generateAIResponse(prompt, {
      maxTokens: 500,
      temperature: 0.7,
      useContext: false,
      userId,
    });
    
    return {
      answer: aiResponse.text,
      sources: usedDocs,
      confidence: Math.round(confidence),
    };
  } catch (error) {
    console.error('Error answering with context:', error);
    errorTracker.captureError(error as Error, {
      metadata: {
        context: 'answerWithContext',
        question,
      }
    });
    
    return {
      answer: "I encountered an error while searching your data. Please try again.",
      sources: [],
      confidence: 0,
    };
  }
}

/**
 * Get similar content (recommendations)
 */
export async function getSimilarContent(
  contentId: string,
  userId: string,
  limit: number = 5
): Promise<SearchResult[]> {
  try {
    // Load vector store
    const storeData = await AsyncStorage.getItem(STORAGE_KEYS.VECTOR_STORE);
    if (!storeData) return [];
    
    const store: VectorizedContent[] = JSON.parse(storeData);
    
    // Find the source content
    const sourceContent = store.find(item => item.id === contentId);
    if (!sourceContent) return [];
    
    // Find similar items
    const results: SearchResult[] = store
      .filter(item => 
        item.id !== contentId && 
        item.metadata.userId === userId
      )
      .map(item => ({
        ...item,
        similarity: cosineSimilarity(sourceContent.embedding, item.embedding),
        relevanceScore: cosineSimilarity(sourceContent.embedding, item.embedding),
      }))
      .filter(item => item.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    
    return results;
  } catch (error) {
    console.error('Error getting similar content:', error);
    return [];
  }
}

/**
 * Clear vector store (for testing or reset)
 */
export async function clearVectorStore(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.VECTOR_STORE);
    await AsyncStorage.removeItem(STORAGE_KEYS.LAST_INDEXED);
    
    errorTracker.addBreadcrumb({
      category: 'rag',
      message: 'Vector store cleared',
      level: 'info',
    });
  } catch (error) {
    console.error('Error clearing vector store:', error);
  }
}

/**
 * Get vector store stats
 */
export async function getVectorStoreStats(): Promise<{
  totalItems: number;
  byType: Record<string, number>;
  lastIndexed: string | null;
  storageSize: number;
}> {
  try {
    const storeData = await AsyncStorage.getItem(STORAGE_KEYS.VECTOR_STORE);
    const lastIndexed = await AsyncStorage.getItem(STORAGE_KEYS.LAST_INDEXED);
    
    if (!storeData) {
      return {
        totalItems: 0,
        byType: {},
        lastIndexed: null,
        storageSize: 0,
      };
    }
    
    const store: VectorizedContent[] = JSON.parse(storeData);
    
    // Count by type
    const byType: Record<string, number> = {};
    store.forEach(item => {
      byType[item.type] = (byType[item.type] || 0) + 1;
    });
    
    return {
      totalItems: store.length,
      byType,
      lastIndexed: lastIndexed ? new Date(parseInt(lastIndexed)).toISOString() : null,
      storageSize: new Blob([storeData]).size,
    };
  } catch (error) {
    console.error('Error getting vector store stats:', error);
    return {
      totalItems: 0,
      byType: {},
      lastIndexed: null,
      storageSize: 0,
    };
  }
}

/**
 * Hybrid search (semantic + keyword)
 */
export async function hybridSearch(
  query: string,
  userId: string,
  options: {
    limit?: number;
    types?: VectorizedContent['type'][];
    courseId?: string;
  } = {}
): Promise<SearchResult[]> {
  try {
    // Perform semantic search
    const semanticResults = await semanticSearch(query, userId, options);
    
    // Perform keyword search
    const keywords = query.toLowerCase().split(/\s+/);
    const storeData = await AsyncStorage.getItem(STORAGE_KEYS.VECTOR_STORE);
    if (!storeData) return semanticResults;
    
    const store: VectorizedContent[] = JSON.parse(storeData);
    
    const keywordResults = store
      .filter(item => item.metadata.userId === userId)
      .map(item => {
        const contentLower = item.content.toLowerCase();
        const titleLower = (item.metadata.title || '').toLowerCase();
        
        // Count keyword matches
        const matches = keywords.filter(kw => 
          contentLower.includes(kw) || titleLower.includes(kw)
        ).length;
        
        const keywordScore = matches / keywords.length;
        
        return {
          ...item,
          similarity: keywordScore,
          relevanceScore: keywordScore,
        } as SearchResult;
      })
      .filter(item => item.similarity > 0);
    
    // Merge results (deduplicate and combine scores)
    const mergedMap = new Map<string, SearchResult>();
    
    semanticResults.forEach(result => {
      mergedMap.set(result.id, result);
    });
    
    keywordResults.forEach(result => {
      const existing = mergedMap.get(result.id);
      if (existing) {
        // Combine scores
        existing.relevanceScore = (existing.relevanceScore * 0.7) + (result.relevanceScore * 0.3);
      } else {
        mergedMap.set(result.id, result);
      }
    });
    
    // Convert to array and sort
    const merged = Array.from(mergedMap.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, options.limit || 5);
    
    return merged;
  } catch (error) {
    console.error('Error in hybrid search:', error);
    return [];
  }
}
