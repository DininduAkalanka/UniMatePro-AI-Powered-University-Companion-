import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ANIMATION, COLORS_V2, ELEVATION, RADIUS, SPACING, TYPOGRAPHY } from '../../constants/designSystem';

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    dueDate: Date;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
  courseName?: string;
  courseColor?: string;
  onPress?: () => void;
  delay?: number;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  courseName,
  courseColor = COLORS_V2.primary[500],
  onPress,
  delay = 0,
}) => {
  const daysUntil = Math.ceil((task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  const getDueDateText = () => {
    if (daysUntil < 0) return `${Math.abs(daysUntil)}d overdue`;
    if (daysUntil === 0) return 'Due today';
    if (daysUntil === 1) return 'Tomorrow';
    if (daysUntil <= 7) return `${daysUntil} days`;
    return task.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDueDateColor = () => {
    if (daysUntil < 0) return COLORS_V2.error[500];
    if (daysUntil === 0) return COLORS_V2.warning[500];
    if (daysUntil <= 2) return COLORS_V2.warning[400];
    return COLORS_V2.info[500];
  };

  const getUrgencyLevel = () => {
    if (daysUntil < 0) return 'overdue';
    if (daysUntil === 0) return 'today';
    if (daysUntil <= 2) return 'urgent';
    return 'normal';
  };

  const urgencyLevel = getUrgencyLevel();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        duration: ANIMATION.normal,
        delay,
      }}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          ELEVATION.md,
          pressed && styles.pressed,
        ]}
      >
        {/* Left Color Accent */}
        <View style={[styles.indicator, { backgroundColor: courseColor }]} />
        
        <View style={styles.content}>
          {/* Title Row */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {task.title}
            </Text>
            {/* Priority Indicator */}
            {task.priority && (task.priority === 'high' || task.priority === 'urgent') && (
              <View style={styles.priorityDot}>
                <View style={[styles.priorityInner, { backgroundColor: COLORS_V2.error[500] }]} />
              </View>
            )}
          </View>
          
          {/* Course Tag */}
          {courseName && (
            <View style={[styles.courseTag, { backgroundColor: `${courseColor}15` }]}>
              <View style={[styles.courseDot, { backgroundColor: courseColor }]} />
              <Text style={[styles.courseName, { color: courseColor }]} numberOfLines={1}>
                {courseName}
              </Text>
            </View>
          )}
          
          {/* Footer with Due Date */}
          <View style={styles.footer}>
            <View style={[
              styles.dueDateBadge, 
              { backgroundColor: `${getDueDateColor()}15` },
              urgencyLevel === 'overdue' && styles.overdueBadge,
              urgencyLevel === 'today' && styles.todayBadge,
            ]}>
              <Text style={[styles.dueDateIcon]}>
                {urgencyLevel === 'overdue' ? '⚠️' : urgencyLevel === 'today' ? '🔥' : '📅'}
              </Text>
              <Text style={[styles.dueDate, { color: getDueDateColor() }]}>
                {getDueDateText()}
              </Text>
            </View>
          </View>
        </View>

        {/* Chevron */}
        <View style={styles.chevron}>
          <Text style={styles.chevronIcon}>›</Text>
        </View>
      </Pressable>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS_V2.surface.base,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS_V2.background.secondary,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  indicator: {
    width: 5,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.titleMedium,
    color: COLORS_V2.text.primary,
    flex: 1,
    fontWeight: '700',
    lineHeight: 22,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS_V2.error[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  priorityInner: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
  },
  courseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    gap: 6,
    maxWidth: '75%',
  },
  courseDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
  },
  courseName: {
    ...TYPOGRAPHY.labelSmall,
    fontWeight: '700',
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  overdueBadge: {
    borderWidth: 1,
    borderColor: COLORS_V2.error[200],
  },
  todayBadge: {
    borderWidth: 1,
    borderColor: COLORS_V2.warning[200],
  },
  dueDateIcon: {
    fontSize: 12,
  },
  dueDate: {
    ...TYPOGRAPHY.labelSmall,
    fontWeight: '700',
    fontSize: 11,
  },
  chevron: {
    justifyContent: 'center',
    paddingRight: SPACING.md,
    paddingLeft: SPACING.xs,
  },
  chevronIcon: {
    fontSize: 24,
    color: COLORS_V2.text.tertiary,
    fontWeight: '300',
  },
});
