/**
 * Enhanced AI Service - Hugging Face Integration
 * Provides dynamic AI responses using multiple models
 * Supports text generation, summarization, and conversation
 */

import { HfInference } from '@huggingface/inference';
import Constants from 'expo-constants';
import { errorTracker } from '../utils/errorTracking';
import { chatRateLimiter } from '../utils/rateLimiter';

// Configuration - Load from environment variables
const HF_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_HUGGING_FACE_API_KEY || 
  process.env.EXPO_PUBLIC_HUGGING_FACE_API_KEY || 
  '';
const USE_FREE_TIER = true; // Set to true to use free inference API

// Initialize Hugging Face client ONLY if API key exists
const hf = HF_API_KEY ? new HfInference(HF_API_KEY) : null;

// Offline mode flag - true when no API key available
const isOfflineMode = !HF_API_KEY;

console.log(isOfflineMode ? '⚠️ Running in OFFLINE mode (no API key)' : '✅ AI mode enabled with API key');

/**
 * Model configurations for different tasks
 * Using models that are GUARANTEED to work on Hugging Face Inference API
 * These are serverless inference API models that don't require manual setup
 */
const MODELS = {
  // Chat completion model (works without manual setup)
  conversation: 'meta-llama/Llama-3.2-1B-Instruct',
  
  // Good for summarization
  summarization: 'facebook/bart-large-cnn',
  
  // Fallback models if primary doesn't work
  fallbacks: {
    conversation: [
      'HuggingFaceH4/zephyr-7b-beta',
      'microsoft/DialoGPT-medium',
      'facebook/blenderbot-400M-distill',
    ],
    summarization: [
      'sshleifer/distilbart-cnn-12-6',
      'google/pegasus-xsum',
    ],
  }
};

/**
 * Conversation context manager
 */
interface ConversationContext {
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  systemPrompt: string;
}

const conversationContext: ConversationContext = {
  history: [],
  systemPrompt: `You are UniMate, a helpful and friendly AI study assistant for university students in Sri Lanka.

Your role is to:
- Help students understand complex concepts in simple terms
- Provide study strategies and time management tips
- Offer exam preparation guidance
- Give motivation and emotional support
- Explain topics clearly with examples
- Be encouraging and positive

Guidelines:
- Keep responses concise but informative (2-4 paragraphs max)
- Use emojis sparingly to make responses friendly
- Break down complex topics into digestible parts
- Provide actionable advice
- Be empathetic to student stress and challenges
- Focus on Sri Lankan university context when relevant`,
};

/**
 * Generate AI response using Hugging Face Inference API
 * With automatic fallback to alternative models and offline mode
 * Includes rate limiting protection
 */
export async function generateAIResponse(
  userMessage: string,
  options: {
    maxTokens?: number;
    temperature?: number;
    useContext?: boolean;
    userId?: string;
  } = {}
): Promise<{ text: string; success: boolean; error?: string }> {
  try {
    const {
      maxTokens = 500,
      temperature = 0.7,
      useContext = true,
      userId = 'anonymous',
    } = options;

    // Check rate limit
    const rateLimitResult = await chatRateLimiter.checkLimit(userId);
    if (!rateLimitResult.allowed) {
      errorTracker.captureMessage(
        `Rate limit exceeded for user ${userId}`,
        'warning',
        { action: 'ai_chat', metadata: { retryAfter: rateLimitResult.retryAfter } }
      );
      
      return {
        text: `⚠️ You're sending messages too quickly. Please wait ${rateLimitResult.retryAfter} seconds before trying again.\n\nThis helps us ensure fair usage for all students.`,
        success: false,
        error: 'rate_limit_exceeded',
      };
    }

    // If offline mode, use intelligent fallback immediately
    if (isOfflineMode) {
      console.log('🔌 Offline mode: Using intelligent fallback');
      const fallbackText = getEnhancedFallback(userMessage);
      return {
        text: fallbackText,
        success: true,
      };
    }

    // Add user message to context
    if (useContext) {
      conversationContext.history.push({
        role: 'user',
        content: userMessage,
      });

      // Keep only last 6 messages to manage token limits
      if (conversationContext.history.length > 6) {
        conversationContext.history = conversationContext.history.slice(-6);
      }
    }

    // Build conversation prompt
    const conversationHistory = useContext
      ? conversationContext.history
          .map((msg) => `${msg.role === 'user' ? 'Student' : 'UniMate'}: ${msg.content}`)
          .join('\n\n')
      : '';

    const fullPrompt = useContext
      ? `${conversationContext.systemPrompt}\n\n${conversationHistory}\n\nUniMate:`
      : `${conversationContext.systemPrompt}\n\nStudent: ${userMessage}\n\nUniMate:`;

    // Try primary model, then fallbacks
    const modelsToTry = [MODELS.conversation, ...MODELS.fallbacks.conversation];
    
    for (let i = 0; i < modelsToTry.length; i++) {
      try {
        const model = modelsToTry[i];
        console.log(`🔍 Trying model: ${model}`);
        
        // Build messages array for chat completion
        const messages: Array<{ role: string; content: string }> = [
          { role: 'system', content: conversationContext.systemPrompt }
        ];
        
        // Add conversation history if context is enabled
        if (useContext && conversationContext.history.length > 0) {
          // Add last 6 messages for context
          conversationContext.history.slice(-6).forEach(msg => {
            messages.push({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content
            });
          });
        }
        
        // Add current user message
        messages.push({ role: 'user', content: userMessage });
        
        // Use Chat Completion API for conversational models
        const response = await hf!.chatCompletion({
          model: model,
          messages: messages,
          max_tokens: maxTokens,
          temperature: temperature,
        });

        let aiText = response.choices[0]?.message?.content || '';
        aiText = aiText.trim();

        // Clean up response
        aiText = cleanAIResponse(aiText);

        // Add to context
        if (useContext) {
          conversationContext.history.push({
            role: 'assistant',
            content: aiText,
          });
        }

        console.log(`✅ Success with model: ${model}`);
        return {
          text: aiText,
          success: true,
        };
      } catch (modelError: any) {
        console.log(`❌ Model ${modelsToTry[i]} failed:`, modelError.message);
        
        // If this is the last model, throw error
        if (i === modelsToTry.length - 1) {
          throw modelError;
        }
        
        // Otherwise, continue to next model
        continue;
      }
    }

    // If all models fail, use fallback
    throw new Error('All models failed');
    
  } catch (error: any) {
    console.error('AI generation error:', error);
    
    // Track error
    errorTracker.captureError(error, {
      action: 'ai_generation',
      metadata: {
        userMessage: userMessage.substring(0, 100), // Only first 100 chars for privacy
        options,
      },
    });
    
    // Return enhanced fallback
    return {
      text: getEnhancedFallback(userMessage),
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Summarize text using Hugging Face
 * With automatic fallback to alternative models
 */
export async function summarizeText(
  text: string,
  maxLength: number = 150
): Promise<{ text: string; success: boolean }> {
  try {
    if (!text || text.length < 100) {
      return {
        text: "Please provide at least 100 characters of text to summarize.",
        success: false,
      };
    }

    // If offline mode, use manual summarization
    if (isOfflineMode) {
      console.log('🔌 Offline mode: Using manual summarization');
      return {
        text: createManualSummary(text, maxLength),
        success: true,
      };
    }

    // Try primary model, then fallbacks
    const modelsToTry = [MODELS.summarization, ...MODELS.fallbacks.summarization];
    
    for (let i = 0; i < modelsToTry.length; i++) {
      try {
        const model = modelsToTry[i];
        console.log(`🔍 Trying summarization model: ${model}`);
        
        const response = await hf!.summarization({
          model: model,
          inputs: text,
          parameters: {
            max_length: maxLength,
            min_length: 30,
          },
        });

        console.log(`✅ Summarization success with: ${model}`);
        return {
          text: response.summary_text,
          success: true,
        };
      } catch (modelError: any) {
        console.log(`❌ Summarization model ${modelsToTry[i]} failed:`, modelError.message);
        
        // If this is the last model, throw error
        if (i === modelsToTry.length - 1) {
          throw modelError;
        }
        
        // Otherwise, continue to next model
        continue;
      }
    }

    throw new Error('All summarization models failed');
    
  } catch (error: any) {
    console.error('Summarization error:', error);
    
    // Fallback: Use manual summarization
    return {
      text: createManualSummary(text, maxLength),
      success: false,
    };
  }
}

/**
 * Manual text summarization fallback
 */
function createManualSummary(text: string, maxLength: number): string {
  // Simple extractive summarization
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  if (sentences.length <= 3) {
    return text;
  }
  
  // Take first, middle, and last sentences
  const summary = [
    sentences[0],
    sentences[Math.floor(sentences.length / 2)],
    sentences[sentences.length - 1],
  ].join(' ');
  
  return `📝 **Quick Summary:**\n\n${summary.trim()}\n\n💡 This is a basic summary. For AI-powered summaries, please configure your API key.`;
}

/**
 * Explain a concept in simple terms
 */
export async function explainConcept(
  concept: string,
  level: 'simple' | 'detailed' = 'simple'
): Promise<{ text: string; success: boolean }> {
  const prompt =
    level === 'simple'
      ? `Explain "${concept}" in simple terms that a university student can understand. Use an example.`
      : `Provide a detailed explanation of "${concept}" for a university student, including key points and examples.`;

  return generateAIResponse(prompt, {
    maxTokens: level === 'simple' ? 300 : 500,
    useContext: false,
  });
}

/**
 * Get study tips for a specific topic
 */
export async function getStudyTips(
  topic: string
): Promise<{ text: string; success: boolean }> {
  const prompt = `Give me effective study tips and strategies for learning "${topic}". Include specific techniques I can use.`;

  return generateAIResponse(prompt, {
    maxTokens: 400,
    useContext: false,
  });
}

/**
 * Create a study plan
 */
export async function createStudyPlan(
  subject: string,
  days: number,
  hoursPerDay: number
): Promise<{ text: string; success: boolean }> {
  const prompt = `Create a ${days}-day study plan for "${subject}" with ${hoursPerDay} hours per day. Make it practical and structured.`;

  return generateAIResponse(prompt, {
    maxTokens: 600,
    useContext: false,
  });
}

/**
 * Answer a specific question
 */
export async function answerQuestion(
  question: string
): Promise<{ text: string; success: boolean }> {
  return generateAIResponse(question, {
    maxTokens: 400,
    temperature: 0.6, // Lower temperature for more factual answers
  });
}

/**
 * Clean and format AI response
 */
function cleanAIResponse(text: string): string {
  // Remove incomplete sentences at the end
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 0) {
    text = sentences.join(' ');
  }

  // Remove any system-like prefixes
  text = text.replace(/^(Assistant|AI|UniMate):\s*/i, '');
  
  // Remove repetitive phrases
  const lines = text.split('\n');
  const uniqueLines = Array.from(new Set(lines));
  text = uniqueLines.join('\n');

  // Ensure response isn't too short
  if (text.length < 20) {
    return "I understand your question. Could you provide a bit more detail so I can give you a more helpful answer?";
  }

  return text.trim();
}

/**
 * Enhanced fallback responses with intelligence
 */
function getEnhancedFallback(userInput: string): string {
  const input = userInput.toLowerCase();

  // Greetings
  if (input.match(/\b(hi|hello|hey|greetings)\b/)) {
    return "Hi there! 👋 I'm UniMate, your AI study assistant. I can help you with:\n\n• Understanding difficult concepts\n• Creating study plans\n• Time management strategies\n• Exam preparation\n• Motivation and support\n\nWhat would you like help with today?";
  }

  // Study techniques
  if (input.match(/study|learn|technique|method/)) {
    return "Here are evidence-based study techniques that work:\n\n🎯 **Active Recall**: Test yourself frequently without looking at notes\n\n⏱️ **Spaced Repetition**: Review material at increasing intervals (1 day, 3 days, 1 week, etc.)\n\n🍅 **Pomodoro Method**: 25 min focus + 5 min break\n\n✍️ **Feynman Technique**: Explain concepts in simple terms\n\n📝 **Elaborative Interrogation**: Ask yourself 'why' and 'how'\n\nWhich technique would you like to explore further?";
  }

  // Exams
  if (input.match(/exam|test|quiz/)) {
    return "🎯 **Effective Exam Preparation**\n\n**2 Weeks Before:**\n• Create a study schedule\n• Gather all materials\n• Identify weak areas\n\n**1 Week Before:**\n• Practice with past papers\n• Review difficult topics\n• Join study groups\n\n**Day Before:**\n• Light review only\n• Prepare materials\n• Sleep 7-8 hours\n\n**Exam Day:**\n• Read all questions first\n• Start with easy ones\n• Manage your time\n\nWhen is your exam? I can help create a specific plan!";
  }

  // Motivation
  if (input.match(/motivat|stress|anxiety|overwhelm|tired|give up/)) {
    return "💪 I understand studying can be challenging!\n\n**Quick Motivation Boost:**\n\n🌟 Break big tasks into 15-min chunks\n🎉 Celebrate small wins\n🚶 Take movement breaks\n🧘 Practice 4-7-8 breathing\n📊 Track your progress visually\n\n**Remember:** Struggle = Growth!\n\nEvery expert was once a beginner. You're making progress even when it feels hard.\n\nWhat specific challenge are you facing? Let's tackle it together!";
  }

  // Time management
  if (input.match(/time|schedule|manage|plan|organize/)) {
    return "⏰ **Time Management for Students**\n\n**Eisenhower Matrix:**\n• Urgent + Important → Do now\n• Important only → Schedule\n• Urgent only → Minimize\n• Neither → Eliminate\n\n**Daily Planning:**\n1. List 3 must-do tasks\n2. Estimate time (+ 30% buffer)\n3. Time-block your day\n4. Review end of day\n\n**Avoid:**\n❌ Multitasking\n❌ Perfectionism paralysis\n❌ Social media during study\n\nNeed help creating your schedule?";
  }

  // General response
  return "I'm here to help you succeed! 🎓\n\n**I can assist with:**\n• Explaining concepts\n• Study techniques\n• Creating study plans\n• Time management\n• Exam preparation\n• Motivation & support\n\n💡 Try asking:\n• \"Explain [topic] simply\"\n• \"Study tips for [subject]\"\n• \"Create a study plan for [exam]\"\n• \"I need motivation\"\n\nWhat would you like help with?";
}

/**
 * Reset conversation context
 */
export function resetConversation(): void {
  conversationContext.history = [];
}

/**
 * Get conversation history
 */
export function getConversationHistory() {
  return conversationContext.history;
}

/**
 * Test API connection with multiple models
 */
export async function testConnection(): Promise<boolean> {
  try {
    // Test if API key is configured
    if (!HF_API_KEY || HF_API_KEY.trim() === '') {
      console.log('⚠️ No API key configured - running in offline mode');
      return false;
    }

    console.log('🔍 Testing AI connection...');
    
    // Try primary model
    const modelsToTest = [MODELS.conversation, ...MODELS.fallbacks.conversation];
    
    for (const model of modelsToTest) {
      try {
        console.log(`Testing model: ${model}`);
        
        const response = await hf!.chatCompletion({
          model: model,
          messages: [
            { role: 'user', content: 'Hello' }
          ],
          max_tokens: 10,
        });
        
        console.log(`✅ Connection successful with model: ${model}`);
        return true;
      } catch (error: any) {
        console.log(`❌ Model ${model} not available:`, error.message);
        continue;
      }
    }
    
    console.log('⚠️ All models unavailable - using offline mode');
    return false;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}