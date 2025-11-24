/**
 * RAG Demo Screen
 * Showcases Retrieval Augmented Generation features
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RAGChat from '../components/RAGChat';
import { COLORS_V2, SPACING, TYPOGRAPHY } from '../constants/designSystem';
import { getCurrentUser } from '../services/authService';

export default function RAGDemoScreen() {
  const router = useRouter();
  const [showChat, setShowChat] = useState(false);
  const [userId, setUserId] = useState<string>('');

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const user = await getCurrentUser();
    if (user) setUserId(user.id);
  };

  const features = [
    {
      icon: 'search',
      title: 'Semantic Search',
      description: 'AI understands meaning, not just keywords. Find information even if you don\'t remember exact words.',
      color: COLORS_V2.primary[500],
      example: 'Search "urgent work" finds tasks marked urgent or high priority',
    },
    {
      icon: 'brain',
      title: 'Context-Aware Answers',
      description: 'AI answers based on YOUR personal data - notes, tasks, courses, and study sessions.',
      color: COLORS_V2.success[500],
      example: '"What\'s my progress this week?" uses your actual completion data',
    },
    {
      icon: 'shield-checkmark',
      title: 'No Hallucinations',
      description: 'Responses are grounded in your data. If info isn\'t available, AI tells you clearly.',
      color: COLORS_V2.info[500],
      example: 'Won\'t make up facts about courses you haven\'t added',
    },
    {
      icon: 'link',
      title: 'Source Citations',
      description: 'Every answer shows which tasks, notes, or courses were used with confidence scores.',
      color: COLORS_V2.warning[500],
      example: 'See exactly which 3 tasks contributed to the answer (85% confidence)',
    },
    {
      icon: 'flash',
      title: 'Smart Recommendations',
      description: 'Find similar content automatically. Discover related tasks, courses, and notes.',
      color: COLORS_V2.secondary[500],
      example: 'Reading about "algorithms" suggests related data structures tasks',
    },
    {
      icon: 'lock-closed',
      title: '100% Private & Free',
      description: 'All embeddings stored locally. Uses free Hugging Face models. No data sent to third parties.',
      color: COLORS_V2.error[500],
      example: 'Your 384-dimensional vectors stay on your device',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS_V2.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RAG System</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🧠</Text>
          <Text style={styles.heroTitle}>Retrieval Augmented Generation</Text>
          <Text style={styles.heroSubtitle}>
            AI that knows YOUR data. Ask questions, get answers grounded in your actual notes, tasks, and courses.
          </Text>
        </View>

        <View style={styles.techBadges}>
          <View style={styles.techBadge}>
            <Text style={styles.techBadgeText}>🤗 Hugging Face</Text>
          </View>
          <View style={styles.techBadge}>
            <Text style={styles.techBadgeText}>📊 Vector Search</Text>
          </View>
          <View style={styles.techBadge}>
            <Text style={styles.techBadgeText}>🔒 Local Storage</Text>
          </View>
          <View style={styles.techBadge}>
            <Text style={styles.techBadgeText}>🆓 100% Free</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          
          <View style={styles.flowStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>📥 Index Your Data</Text>
              <Text style={styles.stepDescription}>
                Convert tasks, notes, and courses into 384-dimensional vector embeddings using sentence-transformers model
              </Text>
            </View>
          </View>

          <View style={styles.flowStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>🔍 Semantic Search</Text>
              <Text style={styles.stepDescription}>
                Your question is embedded and compared using cosine similarity to find most relevant content
              </Text>
            </View>
          </View>

          <View style={styles.flowStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>🎯 Build Context</Text>
              <Text style={styles.stepDescription}>
                Top matches are assembled into context (up to 2000 chars) with relevance scores
              </Text>
            </View>
          </View>

          <View style={styles.flowStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>💬 Generate Answer</Text>
              <Text style={styles.stepDescription}>
                LLM answers using ONLY your context. Citations and confidence scores included
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Features</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={[styles.iconContainer, { backgroundColor: `${feature.color}20` }]}>
                <Ionicons name={feature.icon as any} size={24} color={feature.color} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
                <View style={styles.exampleContainer}>
                  <Text style={styles.exampleLabel}>Example:</Text>
                  <Text style={styles.exampleText}>{feature.example}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎓 Use Cases</Text>
          
          <View style={styles.useCaseCard}>
            <Text style={styles.useCaseTitle}>📚 Study Assistant</Text>
            <Text style={styles.useCaseText}>
              "What topics did I cover in my data structures course?"
            </Text>
            <Text style={styles.useCaseResult}>
              → Searches study sessions and tasks for that course
            </Text>
          </View>

          <View style={styles.useCaseCard}>
            <Text style={styles.useCaseTitle}>⏰ Deadline Manager</Text>
            <Text style={styles.useCaseText}>
              "What's due this week and how much time will it take?"
            </Text>
            <Text style={styles.useCaseResult}>
              → Aggregates tasks with due dates and estimated hours
            </Text>
          </View>

          <View style={styles.useCaseCard}>
            <Text style={styles.useCaseTitle}>📊 Progress Tracker</Text>
            <Text style={styles.useCaseText}>
              "Summarize my achievements this month"
            </Text>
            <Text style={styles.useCaseResult}>
              → Analyzes completed tasks and study sessions
            </Text>
          </View>

          <View style={styles.useCaseCard}>
            <Text style={styles.useCaseTitle}>🔗 Content Discovery</Text>
            <Text style={styles.useCaseText}>
              "Show me everything related to algorithms"
            </Text>
            <Text style={styles.useCaseResult}>
              → Finds semantically similar tasks, notes, and courses
            </Text>
          </View>
        </View>

        <View style={styles.techSection}>
          <Text style={styles.sectionTitle}>⚙️ Technical Details</Text>
          
          <View style={styles.techDetail}>
            <Text style={styles.techDetailTitle}>🔢 Embedding Model</Text>
            <Text style={styles.techDetailText}>
              sentence-transformers/all-MiniLM-L6-v2{'\n'}
              • 384 dimensions{'\n'}
              • Fast inference (~100ms){'\n'}
              • Optimized for semantic similarity
            </Text>
          </View>

          <View style={styles.techDetail}>
            <Text style={styles.techDetailTitle}>📊 Similarity Algorithm</Text>
            <Text style={styles.techDetailText}>
              Cosine Similarity with Multi-Factor Scoring{'\n'}
              • Semantic match (70%){'\n'}
              • Recency boost (20%){'\n'}
              • Type relevance (10%)
            </Text>
          </View>

          <View style={styles.techDetail}>
            <Text style={styles.techDetailTitle}>💾 Storage</Text>
            <Text style={styles.techDetailText}>
              AsyncStorage Vector Database{'\n'}
              • Stores up to 1000 items{'\n'}
              • Auto-pruning by recency{'\n'}
              • ~2-5MB storage typical
            </Text>
          </View>

          <View style={styles.techDetail}>
            <Text style={styles.techDetailTitle}>🚀 Performance</Text>
            <Text style={styles.techDetailText}>
              Indexing: ~200ms per item{'\n'}
              Search: {'<'}500ms for 1000 items{'\n'}
              Answer Generation: 2-5 seconds{'\n'}
              Offline: Fully functional
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.tryButton}
          onPress={() => setShowChat(true)}
        >
          <Ionicons name="chatbubbles" size={24} color="#fff" />
          <Text style={styles.tryButtonText}>Try RAG Chat</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>

      <Modal
        visible={showChat}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowChat(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>RAG-Powered Chat</Text>
            <TouchableOpacity onPress={() => setShowChat(false)}>
              <Ionicons name="close" size={24} color={COLORS_V2.neutral[900]} />
            </TouchableOpacity>
          </View>
          {userId && <RAGChat userId={userId} />}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS_V2.neutral[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS_V2.neutral[200],
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    ...TYPOGRAPHY.titleLarge,
    color: COLORS_V2.neutral[900],
  },
  content: {
    flex: 1,
  },
  hero: {
    padding: SPACING.xl,
    backgroundColor: COLORS_V2.primary[500],
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  heroTitle: {
    ...TYPOGRAPHY.headlineMedium,
    color: '#fff',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    ...TYPOGRAPHY.bodyLarge,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  techBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    padding: SPACING.lg,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  techBadge: {
    backgroundColor: COLORS_V2.primary[50],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS_V2.primary[200],
  },
  techBadgeText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS_V2.primary[700],
  },
  section: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.titleLarge,
    color: COLORS_V2.neutral[900],
    marginBottom: SPACING.md,
  },
  flowStep: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS_V2.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  stepNumberText: {
    ...TYPOGRAPHY.titleMedium,
    color: '#fff',
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS_V2.neutral[900],
    marginBottom: SPACING.xs,
  },
  stepDescription: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS_V2.neutral[600],
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS_V2.neutral[900],
    marginBottom: SPACING.xs,
  },
  featureDescription: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS_V2.neutral[600],
    marginBottom: SPACING.sm,
  },
  exampleContainer: {
    backgroundColor: COLORS_V2.neutral[50],
    padding: SPACING.sm,
    borderRadius: 8,
    borderLeftWidth: 2,
    borderLeftColor: COLORS_V2.primary[500],
  },
  exampleLabel: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS_V2.neutral[600],
    marginBottom: 2,
  },
  exampleText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS_V2.neutral[700],
    fontStyle: 'italic',
  },
  useCaseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS_V2.primary[500],
  },
  useCaseTitle: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS_V2.neutral[900],
    marginBottom: SPACING.xs,
  },
  useCaseText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS_V2.neutral[700],
    fontStyle: 'italic',
    marginBottom: SPACING.xs,
  },
  useCaseResult: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS_V2.primary[600],
  },
  techSection: {
    padding: SPACING.lg,
    backgroundColor: COLORS_V2.neutral[100],
  },
  techDetail: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  techDetailTitle: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS_V2.neutral[900],
    marginBottom: SPACING.xs,
  },
  techDetailText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS_V2.neutral[600],
    lineHeight: 20,
  },
  tryButton: {
    flexDirection: 'row',
    backgroundColor: COLORS_V2.primary[600],
    marginHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    shadowColor: COLORS_V2.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tryButtonText: {
    ...TYPOGRAPHY.titleMedium,
    color: '#fff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS_V2.neutral[50],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS_V2.neutral[200],
  },
  modalTitle: {
    ...TYPOGRAPHY.titleLarge,
    color: COLORS_V2.neutral[900],
  },
});
