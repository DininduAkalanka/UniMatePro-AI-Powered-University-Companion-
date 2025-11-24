import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS_V2, RADIUS, SPACING } from '../../constants/designSystem';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = RADIUS.sm,
  style,
}) => {
  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      <MotiView
        from={{ opacity: 0.3 }}
        animate={{ opacity: 1 }}
        transition={{
          type: 'timing',
          duration: 1000,
          loop: true,
        }}
        style={styles.shimmer}
      />
    </View>
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <View style={styles.card}>
      <Skeleton height={180} borderRadius={RADIUS.lg} />
      <View style={styles.cardContent}>
        <Skeleton width="60%" height={16} />
        <View style={{ height: SPACING.sm }} />
        <Skeleton width="90%" height={14} />
        <View style={{ height: SPACING.sm }} />
        <Skeleton width="70%" height={14} />
      </View>
    </View>
  );
};

export const SkeletonStatCard: React.FC = () => {
  return (
    <View style={styles.statCard}>
      <Skeleton width={48} height={48} borderRadius={RADIUS.full} />
      <View style={{ height: SPACING.md }} />
      <Skeleton width={40} height={32} />
      <View style={{ height: SPACING.xs }} />
      <Skeleton width={60} height={12} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS_V2.neutral[200],
    overflow: 'hidden',
  },
  shimmer: {
    flex: 1,
    backgroundColor: COLORS_V2.neutral[300],
  },
  card: {
    backgroundColor: COLORS_V2.surface.base,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  cardContent: {
    padding: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS_V2.surface.base,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
});
