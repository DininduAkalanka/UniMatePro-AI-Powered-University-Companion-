/**
 * Smart Notification Banner Component
 * Production-ready AI-powered notification banner for Dashboard
 * 
 * Features:
 * - Multi-alert carousel with auto-rotation
 * - Priority-based visual hierarchy
 * - Smooth animations and transitions
 * - Actionable buttons
 * - Expandable details
 * - Dismissible alerts
 * 
 * UX/UI Best Practices Applied:
 * ✅ Modern pagination dots (no intrusive arrows)
 * ✅ Dynamic swipe gestures with immediate response
 * ✅ Low threshold (15% / 10px) for instant swiping
 * ✅ Velocity-aware gesture detection
 * ✅ Clean, minimal interface
 * ✅ Tappable dots for direct navigation
 * ✅ Follows industry standards (Instagram, Spotify, etc.)
 * ✅ Improved hit areas for better touch targets
 * 
 * Versions included:
 * 1. SmartNotificationBanner - Standard production version
 * 2. MinimalNotificationBanner - Lightweight minimal version
 * 3. PremiumNotificationBanner - Premium animated version
 * 4. CompactNotificationBanner - Compact inline version
 */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Dimensions,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { COLORS_V2, ELEVATION, RADIUS, SPACING, TYPOGRAPHY } from '../constants/designSystem';
import { SmartAlert } from '../services/notificationAggregator';

const { width } = Dimensions.get('window');

interface SmartNotificationBannerProps {
  alerts: SmartAlert[];
  onDismiss?: (alertId: string) => void;
  onRefresh?: () => void;
  autoRotate?: boolean;
  autoRotateInterval?: number;
}

// ========================================
// VERSION 1: STANDARD PRODUCTION VERSION
// ========================================

export const SmartNotificationBanner = memo(({
  alerts,
  onDismiss,
  onRefresh,
  autoRotate = true,
  autoRotateInterval = 5000,
}: SmartNotificationBannerProps) => {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [isSwipeing, setIsSwipeing] = useState(false);
  const autoRotateTimerRef = useRef<any>(null);
  const swipeXRef = useRef(0);
  
  const currentAlert = alerts[currentIndex];
  
  // Reset auto-rotate timer
  const resetAutoRotateTimer = useCallback(() => {
    if (autoRotateTimerRef.current) {
      clearInterval(autoRotateTimerRef.current);
    }
    if (autoRotate && alerts.length > 1 && !expanded) {
      autoRotateTimerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % alerts.length);
      }, autoRotateInterval);
    }
  }, [autoRotate, alerts.length, autoRotateInterval, expanded]);
  
  // Auto-rotate through alerts
  useEffect(() => {
    resetAutoRotateTimer();
    return () => {
      if (autoRotateTimerRef.current) {
        clearInterval(autoRotateTimerRef.current);
      }
    };
  }, [resetAutoRotateTimer]);
  
  // Dynamic swipe handler with immediate response
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => alerts.length > 1,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Lower threshold for faster response
          return Math.abs(gestureState.dx) > 10 && alerts.length > 1;
        },
        onPanResponderGrant: () => {
          // User started touching
          setIsSwipeing(true);
        },
        onPanResponderMove: (_, gestureState) => {
          // Track swipe position for potential visual feedback
          swipeXRef.current = gestureState.dx;
        },
        onPanResponderRelease: (_, gestureState) => {
          setIsSwipeing(false);
          swipeXRef.current = 0;
          
          const threshold = width * 0.15; // 15% swipe threshold (easier)
          const velocity = Math.abs(gestureState.vx);
          
          // Swipe left = next, Swipe right = previous
          if ((Math.abs(gestureState.dx) > threshold || velocity > 0.5) && alerts.length > 1) {
            const direction = gestureState.dx > 0 ? -1 : 1;
            
            setCurrentIndex((prev) => {
              const newIndex = prev + direction;
              if (newIndex < 0) return alerts.length - 1;
              if (newIndex >= alerts.length) return 0;
              return newIndex;
            });
            
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            resetAutoRotateTimer();
          }
        },
        onPanResponderTerminate: () => {
          // Handle gesture cancellation
          setIsSwipeing(false);
          swipeXRef.current = 0;
        },
      }),
    [alerts.length, resetAutoRotateTimer]
  );
  
  const handleAction = useCallback(() => {
    if (!currentAlert) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (currentAlert.actionable && currentAlert.actionRoute) {
      router.push(currentAlert.actionRoute as any);
    }
  }, [currentAlert, router]);
  
  const handleDismiss = useCallback(() => {
    if (!currentAlert || !onDismiss) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss(currentAlert.id);
  }, [currentAlert, onDismiss]);
  
  const toggleExpanded = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  }, [expanded]);
  
  if (!currentAlert) {
    return (
      <View style={styles.container}>
        <View style={[styles.banner, styles.successBanner]}>
          <Text style={styles.emoji}>✨</Text>
          <View style={styles.content}>
            <Text style={styles.title}>All Clear!</Text>
            <Text style={styles.message}>No urgent alerts. Keep up the great work!</Text>
          </View>
        </View>
      </View>
    );
  }
  
  const priorityStyles = getPriorityStyles(currentAlert.priority);
  
  return (
    <View style={styles.container} key={currentAlert.id}>
      {/* Swipeable Banner - Modern UX without arrows */}
      <View {...panResponder.panHandlers}>
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={currentAlert.actionable ? handleAction : toggleExpanded}
        >
          <View style={[styles.banner, { borderLeftColor: currentAlert.color }]}>
            {/* Icon/Emoji */}
            <View style={[styles.iconContainer, { backgroundColor: `${currentAlert.color}15` }]}>
              <Text style={styles.emoji}>{currentAlert.emoji}</Text>
            </View>
            
            {/* Content */}
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title} numberOfLines={1}>
                  {currentAlert.title}
                </Text>
                {alerts.length > 1 && (
                  <View style={styles.indicator}>
                    <Text style={styles.indicatorText}>
                      {currentIndex + 1}/{alerts.length}
                    </Text>
                  </View>
                )}
              </View>
              
              <Text
                style={styles.message}
                numberOfLines={expanded ? undefined : 2}
              >
                {currentAlert.message}
              </Text>
              
              {/* Action Button */}
              {currentAlert.actionable && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: `${currentAlert.color}15` }]}
                  onPress={handleAction}
                >
                  <Text style={[styles.actionText, { color: currentAlert.color }]}>
                    {currentAlert.actionLabel || 'Take Action'}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={currentAlert.color}
                  />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Dismiss Button */}
            {currentAlert.dismissible && onDismiss && (
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={handleDismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={18} color={COLORS_V2.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Modern Pagination Dots - Professional UX */}
      {alerts.length > 1 && (
        <View style={styles.paginationContainer}>
          <View style={styles.pagination}>
            {alerts.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCurrentIndex(index);
                  resetAutoRotateTimer();
                }}
                style={[
                  styles.dot,
                  index === currentIndex && styles.activeDot,
                  { backgroundColor: index === currentIndex ? currentAlert.color : COLORS_V2.text.tertiary },
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
});

// ========================================
// VERSION 2: MINIMAL LIGHTWEIGHT VERSION
// ========================================

export const MinimalNotificationBanner = memo(({
  alerts,
  onDismiss,
}: Pick<SmartNotificationBannerProps, 'alerts' | 'onDismiss'>) => {
  const router = useRouter();
  const alert = alerts[0]; // Show only first alert
  
  if (!alert) return null;
  
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        if (alert.actionable && alert.actionRoute) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(alert.actionRoute as any);
        }
      }}
      style={[styles.minimalBanner, { borderLeftColor: alert.color }]}
    >
      <Text style={styles.minimalEmoji}>{alert.emoji}</Text>
      <View style={styles.minimalContent}>
        <Text style={styles.minimalTitle} numberOfLines={1}>
          {alert.title}
        </Text>
        <Text style={styles.minimalMessage} numberOfLines={1}>
          {alert.message}
        </Text>
      </View>
      {alert.dismissible && onDismiss && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onDismiss(alert.id);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={20} color={COLORS_V2.text.tertiary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

// ========================================
// VERSION 3: PREMIUM ANIMATED VERSION
// ========================================

export const PremiumNotificationBanner = memo(({
  alerts,
  onDismiss,
  onRefresh,
}: SmartNotificationBannerProps) => {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const pulseScale = useSharedValue(1);
  
  const currentAlert = alerts[currentIndex];
  
  // Pulse animation for critical alerts
  useEffect(() => {
    if (currentAlert?.priority === 'critical') {
      pulseScale.value = withSpring(1.02, {
        damping: 2,
        stiffness: 100,
      });
      const interval = setInterval(() => {
        pulseScale.value = withSpring(1.02);
        setTimeout(() => {
          pulseScale.value = withSpring(1);
        }, 600);
      }, 1200);
      return () => clearInterval(interval);
    } else {
      pulseScale.value = withSpring(1);
    }
  }, [currentAlert?.priority]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
  
  if (!currentAlert) {
    return (
      <MotiView
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        style={styles.container}
      >
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.premiumBanner}
        >
          <Text style={styles.premiumEmoji}>✨</Text>
          <View style={styles.premiumContent}>
            <Text style={styles.premiumTitle}>All Systems Green!</Text>
            <Text style={styles.premiumMessage}>No urgent items. You're in control! 🎉</Text>
          </View>
        </LinearGradient>
      </MotiView>
    );
  }
  
  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <MotiView
        from={{ opacity: 0, translateX: 50 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        key={currentAlert.id}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (currentAlert.actionable && currentAlert.actionRoute) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(currentAlert.actionRoute as any);
            }
          }}
        >
          <LinearGradient
            colors={[`${currentAlert.color}`, `${currentAlert.color}DD`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumBanner}
          >
            <View style={styles.premiumIconContainer}>
              <Text style={styles.premiumEmoji}>{currentAlert.emoji}</Text>
            </View>
            
            <View style={styles.premiumContent}>
              <View style={styles.premiumHeader}>
                <Text style={styles.premiumTitle} numberOfLines={1}>
                  {currentAlert.title}
                </Text>
                {currentAlert.priority === 'critical' && (
                  <MotiView
                    from={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      type: 'timing',
                      duration: 500,
                      loop: true,
                    }}
                  >
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentText}>URGENT</Text>
                    </View>
                  </MotiView>
                )}
              </View>
              
              <Text style={styles.premiumMessage} numberOfLines={2}>
                {currentAlert.message}
              </Text>
              
              {currentAlert.actionable && (
                <View style={styles.premiumActionButton}>
                  <Text style={styles.premiumActionText}>
                    {currentAlert.actionLabel || 'Take Action'}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </View>
              )}
            </View>
            
            {currentAlert.dismissible && onDismiss && (
              <TouchableOpacity
                style={styles.premiumDismiss}
                onPress={(e) => {
                  e.stopPropagation();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onDismiss(currentAlert.id);
                }}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        {alerts.length > 1 && (
          <View style={styles.premiumPagination}>
            {alerts.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setCurrentIndex(index)}
                style={[
                  styles.premiumDot,
                  index === currentIndex && styles.premiumActiveDot,
                ]}
              />
            ))}
          </View>
        )}
      </MotiView>
    </Animated.View>
  );
});

// ========================================
// VERSION 4: COMPACT INLINE VERSION
// ========================================

export const CompactNotificationBanner = memo(({
  alerts,
  onDismiss,
}: Pick<SmartNotificationBannerProps, 'alerts' | 'onDismiss'>) => {
  const router = useRouter();
  const topAlert = alerts.slice(0, 3); // Show top 3 alerts only
  
  if (topAlert.length === 0) {
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.compactBanner, styles.compactSuccess]}>
          <Text style={styles.compactEmoji}>✅</Text>
          <Text style={styles.compactText}>All clear! Great work!</Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.compactContainer}>
      {topAlert.map((alert, index) => (
        <MotiView
          key={alert.id}
          from={{ opacity: 0, translateX: -20 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 200, delay: index * 100 }}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (alert.actionable && alert.actionRoute) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(alert.actionRoute as any);
              }
            }}
            style={[styles.compactBanner, { borderLeftColor: alert.color }]}
          >
            <Text style={styles.compactEmoji}>{alert.emoji}</Text>
            <View style={styles.compactContent}>
              <Text style={styles.compactTitle} numberOfLines={1}>
                {alert.title}
              </Text>
              <Text style={styles.compactMessage} numberOfLines={1}>
                {alert.message}
              </Text>
            </View>
            {alert.dismissible && onDismiss && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onDismiss(alert.id);
                }}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Ionicons name="close" size={16} color={COLORS_V2.text.tertiary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </MotiView>
      ))}
      
      {alerts.length > 3 && (
        <TouchableOpacity
          style={styles.compactMore}
          onPress={() => router.push('/notification-settings' as any)}
        >
          <Text style={styles.compactMoreText}>
            +{alerts.length - 3} more alerts
          </Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS_V2.primary[600]} />
        </TouchableOpacity>
      )}
    </View>
  );
});

// ========================================
// HELPER FUNCTIONS
// ========================================

function getPriorityStyles(priority: string) {
  switch (priority) {
    case 'critical':
      return {
        borderColor: '#EF4444',
        backgroundColor: '#FEE2E2',
      };
    case 'high':
      return {
        borderColor: '#F59E0B',
        backgroundColor: '#FEF3C7',
      };
    case 'medium':
      return {
        borderColor: '#3B82F6',
        backgroundColor: '#DBEAFE',
      };
    default:
      return {
        borderColor: '#10B981',
        backgroundColor: '#D1FAE5',
      };
  }
}

// ========================================
// STYLES
// ========================================

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  
  // Standard Banner
  banner: {
    flexDirection: 'row',
    backgroundColor: COLORS_V2.surface.base,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    ...ELEVATION.md,
    minHeight: 80,
  },
  successBanner: {
    borderLeftColor: COLORS_V2.success[500],
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  emoji: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.titleMedium,
    color: COLORS_V2.text.primary,
    fontWeight: '700',
    flex: 1,
  },
  message: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS_V2.text.secondary,
    marginBottom: SPACING.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
  },
  actionText: {
    ...TYPOGRAPHY.labelMedium,
    fontWeight: '600',
    marginRight: SPACING.xs,
  },
  dismissButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  indicator: {
    backgroundColor: COLORS_V2.background.tertiary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.sm,
  },
  indicatorText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS_V2.text.tertiary,
    fontWeight: '600',
  },
  
  // Modern Pagination - Professional UX (No arrows, dots only)
  paginationContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.3,
  },
  activeDot: {
    width: 24,
    height: 8,
    borderRadius: 4,
    opacity: 1,
  },
  
  // Minimal Banner
  minimalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS_V2.surface.base,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 3,
    ...ELEVATION.sm,
  },
  minimalEmoji: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  minimalContent: {
    flex: 1,
  },
  minimalTitle: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS_V2.text.primary,
    fontWeight: '700',
    marginBottom: 2,
  },
  minimalMessage: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS_V2.text.secondary,
  },
  
  // Premium Banner
  premiumBanner: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 90,
    ...ELEVATION.lg,
  },
  premiumIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  premiumEmoji: {
    fontSize: 28,
  },
  premiumContent: {
    flex: 1,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  premiumTitle: {
    ...TYPOGRAPHY.titleMedium,
    color: '#fff',
    fontWeight: '700',
    flex: 1,
  },
  premiumMessage: {
    ...TYPOGRAPHY.bodyMedium,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: SPACING.sm,
  },
  premiumActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
  },
  premiumActionText: {
    ...TYPOGRAPHY.labelMedium,
    color: '#fff',
    fontWeight: '700',
    marginRight: SPACING.xs,
  },
  premiumDismiss: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  urgentBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.sm,
  },
  urgentText: {
    ...TYPOGRAPHY.labelSmall,
    color: '#fff',
    fontWeight: '700',
  },
  premiumPagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  premiumDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  premiumActiveDot: {
    width: 20,
    backgroundColor: '#fff',
  },
  
  // Compact Banner
  compactContainer: {
    gap: SPACING.sm,
  },
  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS_V2.surface.base,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderLeftWidth: 3,
    ...ELEVATION.sm,
  },
  compactSuccess: {
    borderLeftColor: COLORS_V2.success[500],
  },
  compactEmoji: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS_V2.text.primary,
    fontWeight: '700',
  },
  compactMessage: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS_V2.text.secondary,
  },
  compactText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS_V2.text.secondary,
    flex: 1,
  },
  compactMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS_V2.background.secondary,
    borderRadius: RADIUS.md,
  },
  compactMoreText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS_V2.primary[600],
    fontWeight: '600',
    marginRight: SPACING.xs,
  },
});

export default SmartNotificationBanner;
