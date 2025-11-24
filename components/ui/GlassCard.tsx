import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import React from 'react';
import { Platform, StyleSheet, ViewStyle } from 'react-native';
import { ANIMATION, GLASS, RADIUS, SPACING } from '../../constants/designSystem';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: 'light' | 'medium' | 'dark';
  delay?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 'medium',
  delay = 0,
}) => {
  const glassStyle = GLASS[intensity];

  // For Android/Web, use fallback with semi-transparent background
  if (Platform.OS !== 'ios') {
    return (
      <MotiView
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: 'timing',
          duration: ANIMATION.normal,
          delay,
        }}
        style={[styles.container, glassStyle, style]}
      >
        {children}
      </MotiView>
    );
  }

  // iOS BlurView
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'timing',
        duration: ANIMATION.normal,
        delay,
      }}
      style={[styles.container, style]}
    >
      <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill}>
        {children}
      </BlurView>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
});
