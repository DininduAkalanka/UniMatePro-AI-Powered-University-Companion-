/**
 * EmptyState Component - Modern AI Chat Welcome Screen
 * Inspired by ChatGPT, Claude, Gemini welcome interfaces
 * Optimized for university students
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

export interface EmptyStateProps {
  userName?: string;
  onSuggestedPrompt?: (prompt: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  userName = 'Student',
  onSuggestedPrompt 
}) => {
  const suggestedPrompts = [
    {
      icon: 'book-outline',
      title: 'Study Help',
      prompt: 'Help me create an effective study plan for my upcoming exams',
      color: '#8B5CF6',
    },
    {
      icon: 'bulb-outline',
      title: 'Explain Concepts',
      prompt: 'Explain [concept] in simple terms with examples',
      color: '#F59E0B',
    },
    {
      icon: 'document-text-outline',
      title: 'Summarize',
      prompt: 'Summarize this chapter/article for me',
      color: '#10B981',
    },
    {
      icon: 'checkmark-circle-outline',
      title: 'Exam Prep',
      prompt: 'Create practice questions for my upcoming test',
      color: '#3B82F6',
    },
  ];

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <View style={styles.hero}>
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          style={styles.iconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="sparkles" size={40} color="#FFFFFF" />
        </LinearGradient>
        
        <Text style={styles.greeting}>Hello, {userName}! 👋</Text>
        <Text style={styles.title}>How can I help you study today?</Text>
        <Text style={styles.subtitle}>
          I'm UniMate AI, your intelligent study assistant. I can help with understanding concepts, 
          creating study plans, exam preparation, and more.
        </Text>
      </View>

      {/* Suggested Prompts */}
      <View style={styles.promptsSection}>
        <Text style={styles.sectionTitle}>Try asking me:</Text>
        <View style={styles.promptsGrid}>
          {suggestedPrompts.map((item, index) => (
            <View key={index} style={styles.promptCard}>
              <View style={[styles.promptIcon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={styles.promptTitle}>{item.title}</Text>
              <Text style={styles.promptText} numberOfLines={2}>
                {item.prompt}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Capabilities */}
      <View style={styles.capabilitiesSection}>
        <Text style={styles.sectionTitle}>What I can do:</Text>
        <Capability 
          icon="school-outline" 
          title="Study Strategies" 
          description="Personalized learning techniques and study methods"
        />
        <Capability 
          icon="time-outline" 
          title="Time Management" 
          description="Help organize your schedule and prioritize tasks"
        />
        <Capability 
          icon="calculator-outline" 
          title="Problem Solving" 
          description="Step-by-step explanations for complex problems"
        />
        <Capability 
          icon="create-outline" 
          title="Writing & Research" 
          description="Improve essays, reports, and research papers"
        />
      </View>

      {/* Footer tip */}
      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
        <Text style={styles.footerText}>
          I provide educational assistance. Always verify important information with your instructors.
        </Text>
      </View>
    </ScrollView>
  );
};

const Capability: React.FC<{ icon: string; title: string; description: string }> = ({
  icon,
  title,
  description,
}) => (
  <View style={styles.capability}>
    <View style={styles.capabilityIcon}>
      <Ionicons name={icon as any} size={20} color="#8B5CF6" />
    </View>
    <View style={styles.capabilityContent}>
      <Text style={styles.capabilityTitle}>{title}</Text>
      <Text style={styles.capabilityDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 120,
  },

  // Hero section
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 10,
  },

  // Prompts section
  promptsSection: {
    marginBottom: 36,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  promptsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  promptCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  promptIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  promptTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  promptText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6B7280',
  },

  // Capabilities section
  capabilitiesSection: {
    marginBottom: 24,
  },
  capability: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  capabilityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  capabilityContent: {
    flex: 1,
    paddingTop: 2,
  },
  capabilityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  capabilityDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },
});
