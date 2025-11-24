/**
 * Notification Settings Screen
 * Modern UI for managing smart notification preferences
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../constants/config';
import { getCurrentUser } from '../services/authService';
import { notificationManager } from '../services/notificationManager';
import { sendTestNotification } from '../services/smartNotificationService';
import { NotificationSettings } from '../types/notification';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/');
        return;
      }

      setUserId(user.id);
      const userSettings = await notificationManager.getSettings(user.id);
      setSettings(userSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      Alert.alert('Error', 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await notificationManager.updateSettings(settings);
      Alert.alert('Success', 'Notification settings saved!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification(userId);
      Alert.alert('Test Sent!', 'Check your notifications 📱');
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  if (loading || !settings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={['rgba(88,86,214,0.95)', 'rgba(108,99,255,0.95)']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.headerText}>Notification Settings</Text>
            <Text style={styles.headerSubtext}>Smart AI-powered alerts</Text>
          </View>
          <TouchableOpacity
            onPress={saveSettings}
            style={styles.saveButton}
            disabled={saving}
            accessibilityLabel="Save settings"
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Master Toggle */}
        <View style={styles.section}>
          <View style={styles.masterToggleCard}>
            <View style={styles.masterToggleIcon}>
              <Ionicons name="notifications" size={28} color={COLORS.primary} />
            </View>
            <View style={styles.masterToggleContent}>
              <Text style={styles.masterToggleTitle}>Enable Notifications</Text>
              <Text style={styles.masterToggleSubtext}>
                Receive smart alerts based on AI predictions
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(value) => updateSetting('enabled', value)}
              trackColor={{ false: '#D1D5DB', true: COLORS.primary + '40' }}
              thumbColor={settings.enabled ? COLORS.primary : '#F3F4F6'}
              ios_backgroundColor="#D1D5DB"
            />
          </View>
        </View>

        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Prediction Alerts</Text>
          <Text style={styles.sectionDescription}>
            AI-powered notifications based on task analysis
          </Text>

          <View style={styles.card}>
            <SettingItem
              icon="alert-circle"
              iconColor="#EF4444"
              title="Deadline Alerts"
              description="High-risk task warnings before deadlines"
              value={settings.deadlineAlerts}
              onChange={(value) => updateSetting('deadlineAlerts', value)}
              disabled={!settings.enabled}
            />
            
            <View style={styles.divider} />
            
            <SettingItem
              icon="bar-chart"
              iconColor="#F59E0B"
              title="Workload Warnings"
              description="Alerts when you're overloaded"
              value={settings.overloadWarnings}
              onChange={(value) => updateSetting('overloadWarnings', value)}
              disabled={!settings.enabled}
            />
            
            <View style={styles.divider} />
            
            <SettingItem
              icon="fitness"
              iconColor="#EF4444"
              title="Burnout Detection"
              description="Alerts when performance drops significantly"
              value={settings.burnoutWarnings}
              onChange={(value) => updateSetting('burnoutWarnings', value)}
              disabled={!settings.enabled}
            />
          </View>
        </View>

        {/* Productivity Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Productivity Tips</Text>
          <Text style={styles.sectionDescription}>
            Helpful reminders and suggestions
          </Text>

          <View style={styles.card}>
            <SettingItem
              icon="bulb"
              iconColor="#F59E0B"
              title="Productivity Tips"
              description="Smart suggestions for better focus"
              value={settings.productivityTips}
              onChange={(value) => updateSetting('productivityTips', value)}
              disabled={!settings.enabled}
            />
            
            <View style={styles.divider} />
            
            <SettingItem
              icon="time"
              iconColor="#3B82F6"
              title="Peak Time Reminders"
              description="ML-powered alerts during your most productive hours"
              badge="ML"
              value={settings.peakTimeReminders}
              onChange={(value) => updateSetting('peakTimeReminders', value)}
              disabled={!settings.enabled}
            />
            
            <View style={styles.divider} />
            
            <SettingItem
              icon="book"
              iconColor="#8B5CF6"
              title="Study Reminders"
              description="Scheduled study session reminders"
              value={settings.studyReminders}
              onChange={(value) => updateSetting('studyReminders', value)}
              disabled={!settings.enabled}
            />
          </View>
        </View>

        {/* Motivation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎉 Motivation</Text>
          <Text style={styles.sectionDescription}>
            Celebrate your achievements
          </Text>

          <View style={styles.card}>
            <SettingItem
              icon="trophy"
              iconColor="#10B981"
              title="Achievements"
              description="Celebrate streaks and milestones"
              value={settings.achievements}
              onChange={(value) => updateSetting('achievements', value)}
              disabled={!settings.enabled}
            />
            
            <View style={styles.divider} />
            
            <SettingItem
              icon="stats-chart"
              iconColor="#3B82F6"
              title="Weekly Summary"
              description="Performance trends every Sunday"
              value={settings.weeklySummary}
              onChange={(value) => updateSetting('weeklySummary', value)}
              disabled={!settings.enabled}
            />
          </View>
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌙 Quiet Hours</Text>
          <Text style={styles.sectionDescription}>
            Don't disturb during these hours (critical alerts only)
          </Text>

          <View style={styles.card}>
            <SettingItem
              icon="moon"
              iconColor="#6366F1"
              title="Enable Quiet Hours"
              description={`${settings.quietHoursStart} - ${settings.quietHoursEnd}`}
              value={settings.quietHoursEnabled}
              onChange={(value) => updateSetting('quietHoursEnabled', value)}
              disabled={!settings.enabled}
            />
          </View>
        </View>

        {/* Rate Limiting */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Advanced Settings</Text>

          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="speedometer" size={20} color="#3B82F6" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Max Notifications/Day</Text>
                  <Text style={styles.settingDescription}>Currently: {settings.maxNotificationsPerDay}</Text>
                </View>
              </View>
              <Text style={styles.settingValue}>{settings.maxNotificationsPerDay}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="timer" size={20} color="#F59E0B" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Min Time Between</Text>
                  <Text style={styles.settingDescription}>
                    Currently: {settings.minTimeBetweenNotifications} minutes
                  </Text>
                </View>
              </View>
              <Text style={styles.settingValue}>{settings.minTimeBetweenNotifications}m</Text>
            </View>
          </View>
        </View>

        {/* Sound & Haptics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔊 Sound & Haptics</Text>

          <View style={styles.card}>
            <SettingItem
              icon="volume-high"
              iconColor="#8B5CF6"
              title="Sound"
              description="Play notification sounds"
              value={settings.soundEnabled}
              onChange={(value) => updateSetting('soundEnabled', value)}
              disabled={!settings.enabled}
            />
            
            <View style={styles.divider} />
            
            <SettingItem
              icon="phone-portrait"
              iconColor="#EC4899"
              title="Vibration"
              description="Vibrate for notifications"
              value={settings.vibrationEnabled}
              onChange={(value) => updateSetting('vibrationEnabled', value)}
              disabled={!settings.enabled}
            />
          </View>
        </View>

        {/* Test Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestNotification}
            disabled={!settings.enabled}
            activeOpacity={0.7}
          >
            <Ionicons name="flask" size={20} color="#fff" style={styles.testButtonIcon} />
            <Text style={styles.testButtonText}>Send Test Notification</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  badge?: string;
}

function SettingItem({
  icon,
  iconColor,
  title,
  description,
  value,
  onChange,
  disabled = false,
  badge,
}: SettingItemProps) {
  return (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.settingText}>
          <View style={styles.settingTitleRow}>
            <Text style={[styles.settingTitle, disabled && styles.disabledText]}>{title}</Text>
            {badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.settingDescription, disabled && styles.disabledText]}>
            {description}
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: '#D1D5DB', true: COLORS.primary + '40' }}
        thumbColor={value ? COLORS.primary : '#F3F4F6'}
        ios_backgroundColor="#D1D5DB"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  headerSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  masterToggleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  masterToggleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  masterToggleContent: {
    flex: 1,
    marginLeft: 16,
  },
  masterToggleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  masterToggleSubtext: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    minHeight: 68,
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  badge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3B82F6',
  },
  disabledText: {
    opacity: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 64,
  },
  testButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  testButtonIcon: {
    marginRight: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  bottomSpacer: {
    height: 40,
  },
});
