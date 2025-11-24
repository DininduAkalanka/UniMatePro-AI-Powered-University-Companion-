import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS_V2, ELEVATION, RADIUS, SPACING, TYPOGRAPHY } from '../../constants/designSystem';

interface StatCardProps {
  icon: string;
  value: number | string;
  label: string;
  backgroundImage?: any;
  gradientColors?: string[];
  onPress?: () => void;
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  backgroundImage,
  gradientColors = [COLORS_V2.primary[400], COLORS_V2.primary[600]],
  onPress,
  delay = 0,
}) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.8, translateY: 30 }}
      animate={{ opacity: 1, scale: 1, translateY: 0 }}
      transition={{
        type: 'spring',
        damping: 15,
        stiffness: 100,
        delay,
      }}
      style={styles.container}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          ELEVATION.lg,
          pressed && styles.pressed,
        ]}
        disabled={!onPress}
      >
        {backgroundImage && (
          <Image
            source={backgroundImage}
            style={styles.backgroundImage}
            contentFit="cover"
          />
        )}
        
        <LinearGradient
          colors={[gradientColors[0], gradientColors[1], `${gradientColors[1]}dd`] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
          
          <MotiView
            from={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              delay: delay + 100,
            }}
          >
            <Text style={styles.value}>{value}</Text>
          </MotiView>
          
          <Text style={styles.label}>{label}</Text>
        </LinearGradient>
      </Pressable>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    height: 160,
    marginHorizontal: SPACING.xs,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  gradient: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  icon: {
    fontSize: 28,
  },
  value: {
    ...TYPOGRAPHY.displaySmall,
    color: COLORS_V2.text.inverse,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  label: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS_V2.text.inverse,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
});
