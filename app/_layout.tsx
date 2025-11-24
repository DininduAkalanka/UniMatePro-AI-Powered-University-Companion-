import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNotificationInitialization } from "../hooks/useNotificationInitialization";
import { errorTracker, setupGlobalErrorHandler } from "../utils/errorTracking";

// ✅ CRITICAL FIX: Error Boundary to prevent app crashes
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🔴 ErrorBoundary caught:', error, errorInfo);
    // Log to error tracker (will be sent to Sentry/Crashlytics when configured)
    errorTracker.captureError(error, {
      screen: 'RootLayout',
      metadata: { errorInfo: JSON.stringify(errorInfo) },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.emoji}>😕</Text>
          <Text style={errorStyles.title}>Oops! Something went wrong</Text>
          <Text style={errorStyles.message}>
            {this.state.error?.message || 'Unknown error occurred'}
          </Text>
          <TouchableOpacity
            style={errorStyles.button}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={errorStyles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

function RootLayoutContent() {
  // Initialize error tracking on app start
  useEffect(() => {
    errorTracker.initialize();
    setupGlobalErrorHandler();
  }, []);

  // Initialize notification system
  const { initialized, error } = useNotificationInitialization();

  useEffect(() => {
    if (error) {
      console.error('Notification initialization error:', error);
    } else if (initialized) {
      console.log('Notifications initialized successfully');
    }
  }, [initialized, error]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="forgot-password" 
        options={{ 
          headerShown: false,
          gestureEnabled: true,
        }} 
      />
      <Stack.Screen 
        name="notification-settings" 
        options={{ 
          headerShown: false,
          gestureEnabled: true,
        }} 
      />
      <Stack.Screen 
        name="study-session" 
        options={{ 
          headerShown: false,
          gestureEnabled: true,
        }} 
      />
    </Stack>
  );
}

// ✅ CRITICAL FIX: Wrap entire app in Error Boundary
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <RootLayoutContent />
    </ErrorBoundary>
  );
}
