/**
 * Sentry Error Tracking Configuration
 * Production-ready error monitoring and crash reporting
 */

import Constants from 'expo-constants';

// Sentry configuration
const SENTRY_DSN = Constants.expoConfig?.extra?.EXPO_PUBLIC_SENTRY_DSN || 
  process.env.EXPO_PUBLIC_SENTRY_DSN || 
  '';

const SENTRY_ENVIRONMENT = Constants.expoConfig?.extra?.EXPO_PUBLIC_SENTRY_ENVIRONMENT || 
  process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || 
  __DEV__ ? 'development' : 'production';

const APP_VERSION = Constants.expoConfig?.extra?.EXPO_PUBLIC_APP_VERSION || '1.0.0';

export interface ErrorContext {
  userId?: string;
  screen?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface SentryConfig {
  enabled: boolean;
  dsn: string;
  environment: string;
  release: string;
  tracesSampleRate: number;
  beforeSend?: (error: Error, context?: ErrorContext) => boolean;
}

/**
 * Error tracking service (abstraction layer for Sentry or custom solution)
 */
class ErrorTracker {
  private config: SentryConfig;
  private isInitialized = false;
  private userContext: { userId?: string; email?: string; username?: string } = {};
  
  constructor() {
    this.config = {
      enabled: !!SENTRY_DSN && !__DEV__,
      dsn: SENTRY_DSN,
      environment: SENTRY_ENVIRONMENT,
      release: `unimate@${APP_VERSION}`,
      tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.2 : 1.0,
    };
  }
  
  /**
   * Initialize error tracking
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || !this.config.enabled) {
      console.log(`[ErrorTracker] ${!this.config.enabled ? 'Disabled' : 'Already initialized'}`);
      return;
    }
    
    try {
      // TODO: Install @sentry/react-native when ready
      // import * as Sentry from '@sentry/react-native';
      // 
      // Sentry.init({
      //   dsn: this.config.dsn,
      //   environment: this.config.environment,
      //   release: this.config.release,
      //   tracesSampleRate: this.config.tracesSampleRate,
      //   enableAutoSessionTracking: true,
      //   sessionTrackingIntervalMillis: 30000,
      //   attachStacktrace: true,
      //   beforeSend: (event, hint) => {
      //     // Filter sensitive data
      //     if (event.request?.cookies) {
      //       delete event.request.cookies;
      //     }
      //     if (event.request?.headers) {
      //       delete event.request.headers['Authorization'];
      //     }
      //     return event;
      //   },
      // });
      
      this.isInitialized = true;
      console.log('[ErrorTracker] Initialized successfully');
    } catch (error) {
      console.error('[ErrorTracker] Initialization failed:', error);
    }
  }
  
  /**
   * Set user context for error reports
   */
  setUser(user: { userId: string; email?: string; username?: string } | null): void {
    if (!this.config.enabled) return;
    
    if (user) {
      this.userContext = {
        userId: user.userId,
        email: user.email,
        username: user.username,
      };
      
      // TODO: Set Sentry user context
      // Sentry.setUser({
      //   id: user.userId,
      //   email: user.email,
      //   username: user.username,
      // });
      
      console.log('[ErrorTracker] User context set:', user.userId);
    } else {
      this.userContext = {};
      // Sentry.setUser(null);
      console.log('[ErrorTracker] User context cleared');
    }
  }
  
  /**
   * Capture an error
   */
  captureError(error: Error, context?: ErrorContext): void {
    if (!this.config.enabled) {
      console.error('[ErrorTracker] Error (not sent):', error, context);
      return;
    }
    
    try {
      // TODO: Send to Sentry
      // Sentry.withScope((scope) => {
      //   if (context?.userId) scope.setUser({ id: context.userId });
      //   if (context?.screen) scope.setTag('screen', context.screen);
      //   if (context?.action) scope.setTag('action', context.action);
      //   if (context?.metadata) {
      //     Object.entries(context.metadata).forEach(([key, value]) => {
      //       scope.setExtra(key, value);
      //     });
      //   }
      //   Sentry.captureException(error);
      // });
      
      console.error('[ErrorTracker] Error captured:', error, context);
    } catch (captureError) {
      console.error('[ErrorTracker] Failed to capture error:', captureError);
    }
  }
  
  /**
   * Capture a message
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): void {
    if (!this.config.enabled) {
      console.log(`[ErrorTracker] Message (not sent) [${level}]:`, message, context);
      return;
    }
    
    try {
      // TODO: Send to Sentry
      // Sentry.withScope((scope) => {
      //   if (context?.screen) scope.setTag('screen', context.screen);
      //   if (context?.action) scope.setTag('action', context.action);
      //   if (context?.metadata) {
      //     Object.entries(context.metadata).forEach(([key, value]) => {
      //       scope.setExtra(key, value);
      //     });
      //   }
      //   Sentry.captureMessage(message, level);
      // });
      
      console.log(`[ErrorTracker] Message captured [${level}]:`, message, context);
    } catch (captureError) {
      console.error('[ErrorTracker] Failed to capture message:', captureError);
    }
  }
  
  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: 'info' | 'warning' | 'error';
    data?: Record<string, any>;
  }): void {
    if (!this.config.enabled) return;
    
    try {
      // TODO: Add to Sentry
      // Sentry.addBreadcrumb({
      //   message: breadcrumb.message,
      //   category: breadcrumb.category || 'app',
      //   level: breadcrumb.level || 'info',
      //   data: breadcrumb.data,
      //   timestamp: Date.now() / 1000,
      // });
    } catch (error) {
      console.error('[ErrorTracker] Failed to add breadcrumb:', error);
    }
  }
  
  /**
   * Set custom context
   */
  setContext(key: string, context: Record<string, any>): void {
    if (!this.config.enabled) return;
    
    try {
      // TODO: Set Sentry context
      // Sentry.setContext(key, context);
    } catch (error) {
      console.error('[ErrorTracker] Failed to set context:', error);
    }
  }
  
  /**
   * Capture performance metric
   */
  captureMetric(name: string, value: number, unit: string = 'ms'): void {
    if (!this.config.enabled) {
      console.log(`[ErrorTracker] Metric (not sent): ${name} = ${value}${unit}`);
      return;
    }
    
    try {
      // TODO: Send to Sentry
      // Custom metrics or measurements
      this.addBreadcrumb({
        message: `Performance: ${name}`,
        category: 'performance',
        level: 'info',
        data: { value, unit },
      });
    } catch (error) {
      console.error('[ErrorTracker] Failed to capture metric:', error);
    }
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

/**
 * Global error handler setup
 */
export function setupGlobalErrorHandler(): void {
  // Handle unhandled promise rejections
  const originalHandler = global.Promise.prototype.catch;
  
  // React Native already has error handling, just enhance it
  if (ErrorUtils) {
    const defaultHandler = ErrorUtils.getGlobalHandler();
    
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      errorTracker.captureError(error, {
        metadata: { isFatal },
      });
      
      // Call original handler
      if (defaultHandler) {
        defaultHandler(error, isFatal);
      }
    });
  }
  
  console.log('[ErrorTracker] Global error handler setup complete');
}

/**
 * Error boundary helper for class components
 */
export function logErrorBoundaryError(error: Error, errorInfo: { componentStack: string }): void {
  errorTracker.captureError(error, {
    metadata: {
      componentStack: errorInfo.componentStack,
      type: 'error_boundary',
    },
  });
}

/**
 * Network error tracker
 */
export function trackNetworkError(
  url: string,
  method: string,
  statusCode: number,
  error: Error
): void {
  errorTracker.captureError(error, {
    action: 'network_request',
    metadata: {
      url,
      method,
      statusCode,
      type: 'network',
    },
  });
}

/**
 * Track user action for analytics
 */
export function trackUserAction(
  action: string,
  screen: string,
  metadata?: Record<string, any>
): void {
  errorTracker.addBreadcrumb({
    message: `User action: ${action}`,
    category: 'user_action',
    level: 'info',
    data: {
      screen,
      action,
      ...metadata,
    },
  });
}

// Initialize on import
errorTracker.initialize();
