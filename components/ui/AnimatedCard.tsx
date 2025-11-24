import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { ANIMATION, ELEVATION, RADIUS, SPACING } from '../../constants/designSystem';

interface AnimatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  delay?: number;
  enableHaptics?: boolean;
  elevation?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  onPress,
  style,
  delay = 0,
  enableHaptics = true,
  elevation = 'md',
}) => {
  const handlePress = () => {
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9, translateY: 20 }}
      animate={{ opacity: 1, scale: 1, translateY: 0 }}
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
          ELEVATION[elevation],
          style,
          pressed && styles.pressed,
        ]}
        disabled={!onPress}
      >
        {children}
      </Pressable>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
