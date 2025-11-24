/**
 * RAG-Powered Chat Component
 * Context-aware AI chat using user's personal data
 */

import { Ionicons } from '@expo/vector-icons';
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
import { COLORS_V2, SPACING, TYPOGRAPHY } from '../constants/designSystem';
import { indexAllUserData } from '../services/ai/ragIndexer';
import {
    answerWithContext,
    getVectorStoreStats,
    SearchResult,
} from '../services/ai/ragService';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  sources?: SearchResult[];
  confidence?: number;
  timestamp: Date;
}

interface RAGChatProps {
  userId: string;
}

export default function RAGChat({ userId }: RAGChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const scrollViewRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    loadStats();
    
    // Welcome message
    setMessages([{
      id: '0',
      type: 'assistant',
      content: "👋 Hi! I'm your RAG-powered AI assistant. I can answer questions based on YOUR personal notes, tasks, and course materials. Ask me anything about your studies!",
      timestamp: new Date(),
    }]);
  }, []);

  const loadStats = async () => {
    const statsData = await getVectorStoreStats();
    setStats(statsData);
  };

  const handleIndexData = async () => {
    Alert.alert(
      'Index Your Data',
      'This will index all your tasks, courses, and study sessions for semantic search. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Index',
          onPress: async () => {
            setIndexing(true);
            try {
              const result = await indexAllUserData(userId);
              await loadStats();
              
              Alert.alert(
                'Indexing Complete! 🎉',
                `Indexed:\n• ${result.indexed.tasks} tasks\n• ${result.indexed.courses} courses\n• ${result.indexed.sessions} study sessions\n\nYou can now ask questions about your data!`
              );
              
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                type: 'assistant',
                content: `✅ Your data has been indexed! I now have access to ${result.indexed.tasks} tasks, ${result.indexed.courses} courses, and ${result.indexed.sessions} study sessions. Ask me anything!`,
                timestamp: new Date(),
              }]);
            } catch (error) {
              Alert.alert('Error', 'Failed to index data');
            } finally {
              setIndexing(false);
            }
          },
        },
      ]
    );
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Get context-aware answer
      const response = await answerWithContext(userMessage.content, userId, {
        maxContextLength: 2000,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.answer,
        sources: response.sources,
        confidence: response.confidence,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error getting answer:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View>
          <Text style={styles.statsTitle}>📚 RAG Knowledge Base</Text>
          {stats && (
            <Text style={styles.statsText}>
              {stats.totalItems} items indexed • {Object.keys(stats.byType).length} types
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.indexButton}
          onPress={handleIndexData}
          disabled={indexing}
        >
          {indexing ? (
            <ActivityIndicator color={COLORS_V2.primary[600]} size="small" />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color={COLORS_V2.primary[600]} />
              <Text style={styles.indexButtonText}>Index Data</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {loading && (
          <View style={styles.loadingBubble}>
            <ActivityIndicator color={COLORS_V2.primary[500]} />
            <Text style={styles.loadingText}>Searching your data...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask about your tasks, notes, courses..."
          placeholderTextColor={COLORS_V2.neutral[400]}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          editable={!loading}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Example Questions */}
      {messages.length === 1 && (
        <View style={styles.examplesContainer}>
          <Text style={styles.examplesTitle}>Try asking:</Text>
          <TouchableOpacity
            style={styles.exampleChip}
            onPress={() => setInput("What tasks are due this week?")}
          >
            <Text style={styles.exampleText}>What tasks are due this week?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exampleChip}
            onPress={() => setInput("Which courses need more study time?")}
          >
            <Text style={styles.exampleText}>Which courses need more study time?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exampleChip}
            onPress={() => setInput("Summarize my progress this month")}
          >
            <Text style={styles.exampleText}>Summarize my progress this month</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.type === 'user';

  return (
    <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
      <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
        {message.content}
      </Text>
      
      {message.confidence !== undefined && message.confidence > 0 && (
        <View style={styles.confidenceBadge}>
          <Ionicons 
            name={message.confidence > 70 ? "checkmark-circle" : "alert-circle"} 
            size={14} 
            color={message.confidence > 70 ? COLORS_V2.success[500] : COLORS_V2.warning[500]} 
          />
          <Text style={styles.confidenceText}>{message.confidence}% confident</Text>
        </View>
      )}
      
      {message.sources && message.sources.length > 0 && (
        <View style={styles.sourcesContainer}>
          <Text style={styles.sourcesTitle}>📎 Sources ({message.sources.length}):</Text>
          {message.sources.map((source, idx) => (
            <View key={idx} style={styles.sourceItem}>
              <Ionicons 
                name={getSourceIcon(source.type)} 
                size={14} 
                color={COLORS_V2.neutral[600]} 
              />
              <Text style={styles.sourceText} numberOfLines={1}>
                {source.metadata.title || source.type}
              </Text>
              <Text style={styles.similarityText}>
                {Math.round(source.similarity * 100)}%
              </Text>
            </View>
          ))}
        </View>
      )}
      
      <Text style={styles.timestamp}>
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

function getSourceIcon(type: string): any {
  switch (type) {
    case 'task': return 'checkmark-circle-outline';
    case 'course_material': return 'book-outline';
    case 'study_session': return 'time-outline';
    case 'note': return 'document-text-outline';
    default: return 'file-tray-outline';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS_V2.neutral[50],
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS_V2.neutral[200],
  },
  statsTitle: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS_V2.neutral[900],
  },
  statsText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS_V2.neutral[600],
    marginTop: 2,
  },
  indexButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS_V2.primary[50],
    borderRadius: 20,
  },
  indexButtonText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS_V2.primary[600],
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: SPACING.md,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: SPACING.md,
    borderRadius: 16,
    marginBottom: SPACING.md,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS_V2.primary[500],
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    ...TYPOGRAPHY.bodyMedium,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: COLORS_V2.neutral[900],
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS_V2.neutral[200],
  },
  confidenceText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS_V2.neutral[600],
  },
  sourcesContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS_V2.neutral[200],
  },
  sourcesTitle: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS_V2.neutral[700],
    marginBottom: SPACING.xs,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 4,
  },
  sourceText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS_V2.neutral[600],
    flex: 1,
  },
  similarityText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS_V2.success[600],
    fontWeight: '600',
  },
  timestamp: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS_V2.neutral[500],
    marginTop: SPACING.xs,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    padding: SPACING.md,
    borderRadius: 16,
    marginBottom: SPACING.md,
  },
  loadingText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS_V2.neutral[600],
  },
  inputContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: COLORS_V2.neutral[200],
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.bodyMedium,
    backgroundColor: COLORS_V2.neutral[50],
    borderRadius: 24,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxHeight: 100,
    color: COLORS_V2.neutral[900],
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS_V2.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  examplesContainer: {
    padding: SPACING.md,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: COLORS_V2.neutral[200],
  },
  examplesTitle: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS_V2.neutral[700],
    marginBottom: SPACING.sm,
  },
  exampleChip: {
    backgroundColor: COLORS_V2.primary[50],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS_V2.primary[200],
  },
  exampleText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS_V2.primary[700],
  },
});
