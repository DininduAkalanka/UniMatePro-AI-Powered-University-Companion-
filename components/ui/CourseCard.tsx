import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS_V2, ELEVATION, RADIUS, SPACING, TYPOGRAPHY } from '../../constants/designSystem';

const { width } = Dimensions.get('window');

interface CourseCardProps {
  course: {
    id: string;
    code: string;
    name: string;
    color?: string;
    credits?: number;
    instructor?: string;
  };
  backgroundImage?: any;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  onPress?: () => void;
  onAddTask?: () => void;
  delay?: number;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  backgroundImage,
  totalTasks,
  completedTasks,
  pendingTasks,
  onPress,
  onAddTask,
  delay = 0,
}) => {
  const cardColor = course.color || COLORS_V2.primary[500];
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const handleAddTask = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAddTask?.();
  };

  return (
    <MotiView
      from={{ opacity: 0, translateX: 50, scale: 0.9 }}
      animate={{ opacity: 1, translateX: 0, scale: 1 }}
      transition={{
        type: 'spring',
        damping: 20,
        stiffness: 90,
        delay,
      }}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          ELEVATION.xl,
          { borderTopColor: cardColor },
          pressed && styles.pressed,
        ]}
      >
        {/* Header Section with Image */}
        <View style={styles.imageContainer}>
          {backgroundImage && (
            <Image
              source={backgroundImage}
              style={styles.backgroundImage}
              contentFit="cover"
            />
          )}
          
          <LinearGradient
            colors={[`${cardColor}ee`, `${cardColor}dd`, `${cardColor}cc`]}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.header}>
              <Text style={styles.courseCode}>{course.code}</Text>
              {course.credits && (
                <View style={styles.creditsBadge}>
                  <Text style={styles.creditsText}>{course.credits} CR</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.courseName} numberOfLines={2}>
              {course.name}
            </Text>
            
            {course.instructor && (
              <Text style={styles.instructor} numberOfLines={1}>
                👨‍🏫 {course.instructor}
              </Text>
            )}
          </LinearGradient>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <MotiView
              from={{ width: '0%' }}
              animate={{ width: `${completionRate}%` }}
              transition={{
                type: 'timing',
                duration: 800,
                delay: delay + 200,
              }}
              style={[styles.progressFill, { backgroundColor: cardColor }]}
            />
          </View>
          <Text style={styles.progressText}>{completionRate}% Complete</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalTasks}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS_V2.success[500] }]}>
              {completedTasks}
            </Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS_V2.warning[500] }]}>
              {pendingTasks}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Add Task Button */}
        <Pressable
          onPress={handleAddTask}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: cardColor },
            pressed && styles.addButtonPressed,
          ]}
        >
          <Text style={styles.addIcon}>+</Text>
          <Text style={styles.addText}>Add Task</Text>
        </Pressable>
      </Pressable>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  card: {
    width: width * 0.75,
    backgroundColor: COLORS_V2.surface.base,
    borderRadius: RADIUS.xl,
    marginRight: SPACING.lg,
    overflow: 'hidden',
    borderTopWidth: 4,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  imageContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: 200,
  },
  gradient: {
    padding: SPACING.xl,
    paddingBottom: SPACING.lg,
    minHeight: 200,
    justifyContent: 'flex-end',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  courseCode: {
    ...TYPOGRAPHY.titleMedium,
    color: COLORS_V2.text.inverse,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  creditsBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  creditsText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS_V2.text.inverse,
    fontWeight: '700',
  },
  courseName: {
    ...TYPOGRAPHY.titleLarge,
    color: COLORS_V2.text.inverse,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    lineHeight: 28,
  },
  instructor: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS_V2.text.inverse,
    opacity: 0.9,
  },
  progressContainer: {
    padding: SPACING.lg,
    backgroundColor: COLORS_V2.background.secondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS_V2.neutral[200],
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  progressText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS_V2.text.secondary,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS_V2.background.tertiary,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...TYPOGRAPHY.titleLarge,
    color: COLORS_V2.text.primary,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS_V2.text.secondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS_V2.border.light,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    margin: SPACING.md,
    borderRadius: RADIUS.md,
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  addIcon: {
    fontSize: 24,
    color: COLORS_V2.text.inverse,
    fontWeight: '700',
    marginRight: SPACING.sm,
  },
  addText: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS_V2.text.inverse,
    fontWeight: '600',
  },
});
