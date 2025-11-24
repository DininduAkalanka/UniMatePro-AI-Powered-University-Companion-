import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Dashboard from '../../components/Dashboard.premium';
import { getCurrentUser, signOutUser } from '../../services/authService';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const mountedRef = React.useRef(true); // ✅ CRITICAL FIX: Prevent setState on unmounted

  useEffect(() => {
    mountedRef.current = true;
    initialize();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Auto-refresh dashboard when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (userId && mountedRef.current) {
        setRefreshKey(prev => prev + 1);
      }
    }, [userId])
  );

  const initialize = async () => {
    try {
      const user = await getCurrentUser();
      
      if (!user) {
        if (mountedRef.current) {
          router.replace('/');
        }
        return;
      }
      
      if (mountedRef.current) {
        setUserId(user.id);
        setLoading(false);
      }
    } catch (error) {
      console.error('Initialization error:', error);
      if (mountedRef.current) {
        Alert.alert('Error', 'Failed to initialize the app');
        setLoading(false);
      }
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOutUser();
              router.replace('/');
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Please sign in to continue</Text>
        <TouchableOpacity 
          style={styles.signInButton}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.signInButtonText}>Go to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <StatusBar style="dark" />
        
        <View style={styles.header}>
        <Text style={styles.headerTitle}>UniMate</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => router.push('/study-session')} 
            style={styles.notificationButton}
          >
            <Ionicons name="book-outline" size={24} color="#6366F1" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push('/notification-settings')} 
            style={styles.notificationButton}
          >
            <Ionicons name="notifications-outline" size={24} color="#6366F1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Dashboard key={refreshKey} userId={userId} bannerStyle="standard" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  signInButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  signOutButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
});
