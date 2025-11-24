/**
 * QuickActions Component
 * Suggested prompts and quick action chips
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/config';

export interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  prompt: string;
}

export interface QuickActionsProps {
  actions: QuickAction[];
  onActionPress: (prompt: string) => void;
}

const defaultActions: QuickAction[] = [
  {
    id: '1',
    label: 'Study Tips',
    icon: 'bulb-outline',
    prompt: 'What are the best study techniques for effective learning?',
  },
  {
    id: '2',
    label: 'Exam Prep',
    icon: 'star-outline',
    prompt: 'Help me prepare for my upcoming exams',
  },
  {
    id: '3',
    label: 'Time Management',
    icon: 'time-outline',
    prompt: 'How can I manage my time better as a student?',
  },
  {
    id: '4',
    label: 'Note Taking',
    icon: 'document-text-outline',
    prompt: 'What are effective note-taking methods?',
  },
  {
    id: '5',
    label: 'Motivation',
    icon: 'fitness-outline',
    prompt: "I'm feeling overwhelmed with my studies. Can you help?",
  },
  {
    id: '6',
    label: 'Focus Help',
    icon: 'eye-outline',
    prompt: 'How to improve my focus and concentration?',
  },
];

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions = defaultActions,
  onActionPress,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionChip}
            onPress={() => onActionPress(action.prompt)}
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel={action.label}
            accessibilityRole="button"
            accessibilityHint={`Sends prompt: ${action.prompt}`}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={action.icon} size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
    marginHorizontal: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    marginRight: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
});
