/**
 * App Initialization with Smart Notifications
 * Hook to initialize notification system on app start
 * Now with Firebase Auth state listener to prevent race conditions
 */

import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { auth } from '../firebase/firebaseint';
import { initializeBackgroundNotifications } from '../services/backgroundNotifications';
import { initializeNotifications } from '../services/smartNotificationService';

/**
 * Custom hook to initialize smart notifications
 */
export function useNotificationInitialization() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializingRef = useRef(false); // ✅ CRITICAL FIX: Prevent double initialization
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // ✅ CRITICAL FIX: Wait for auth state to be ready before initializing
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mountedRef.current || initializingRef.current) return;

      if (firebaseUser) {
        initializingRef.current = true;
        console.log('[App Init] ✅ User authenticated, initializing notifications...');
        await initializeSystem(firebaseUser.uid);
        initializingRef.current = false;
      } else {
        console.log('[App Init] No user authenticated');
        setInitialized(false);
      }
    });

    // Re-check when app comes to foreground
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      mountedRef.current = false;
      unsubscribeAuth();
      subscription.remove();
    };
  }, []);

  const initializeSystem = async (userId: string) => {
    try {
      // ✅ CRITICAL FIX: Double-check auth state before proceeding
      if (!auth.currentUser) {
        console.warn('[App Init] ⚠️ Auth state lost, aborting initialization');
        return;
      }

      console.log('[App Init] Initializing smart notification system for user:', userId);

      // Initialize foreground notifications
      const foregroundInit = await initializeNotifications(userId);
      if (!foregroundInit) {
        throw new Error('Failed to initialize foreground notifications');
      }

      // Initialize background notifications
      const backgroundInit = await initializeBackgroundNotifications(userId);
      if (!backgroundInit) {
        console.warn('[App Init] Background notifications initialization failed');
      }

      setInitialized(true);
      console.log('[App Init] ✅ Smart notifications initialized successfully');
    } catch (err) {
      console.error('[App Init] ❌ Initialization error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // ✅ CRITICAL FIX: Don't crash - gracefully degrade
      setInitialized(false);
    }
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && !initialized && auth.currentUser && !initializingRef.current) {
      // ✅ FIXED: Only retry if we have auth and not already initializing
      await initializeSystem(auth.currentUser.uid);
    }
  };

  return { initialized, error };
}

export default useNotificationInitialization;
