/**
 * Safe AsyncStorage Wrapper
 * Provides error handling, logging, and user feedback for AsyncStorage operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { errorTracker } from './errorTracking';

export interface StorageResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Safely set item in AsyncStorage with error handling
 */
export const safeSetItem = async (
  key: string, 
  value: string,
  options?: {
    showErrorAlert?: boolean;
    criticalData?: boolean;
  }
): Promise<StorageResult> => {
  try {
    await AsyncStorage.setItem(key, value);
    console.log(`[AsyncStorage] ✅ Saved: ${key}`);
    return { success: true };
  } catch (error) {
    const err = error as Error;
    console.error(`[AsyncStorage] ❌ Failed to save ${key}:`, err);
    
    // Log to error tracking
    errorTracker.captureError(err, { 
      metadata: {
        key, 
        operation: 'setItem',
        valueSize: value.length,
        isCritical: options?.criticalData
      }
    });
    
    // Show alert for critical data
    if (options?.showErrorAlert || options?.criticalData) {
      Alert.alert(
        'Save Error',
        'Failed to save data locally. Please try again or contact support if this persists.',
        [{ text: 'OK' }]
      );
    }
    
    return { success: false, error: err };
  }
};

/**
 * Safely get item from AsyncStorage with error handling
 */
export const safeGetItem = async <T = any>(
  key: string,
  options?: {
    parseJSON?: boolean;
    defaultValue?: T;
  }
): Promise<StorageResult<T>> => {
  try {
    const value = await AsyncStorage.getItem(key);
    
    if (value === null) {
      console.log(`[AsyncStorage] ℹ️  No data found for: ${key}`);
      return { 
        success: true, 
        data: options?.defaultValue as T 
      };
    }
    
    const data = options?.parseJSON ? JSON.parse(value) : value;
    console.log(`[AsyncStorage] ✅ Retrieved: ${key}`);
    
    return { success: true, data: data as T };
  } catch (error) {
    const err = error as Error;
    console.error(`[AsyncStorage] ❌ Failed to retrieve ${key}:`, err);
    
    errorTracker.captureError(err, { 
      metadata: {
        key, 
        operation: 'getItem'
      }
    });
    
    return { 
      success: false, 
      error: err,
      data: options?.defaultValue as T
    };
  }
};

/**
 * Safely remove item from AsyncStorage
 */
export const safeRemoveItem = async (
  key: string
): Promise<StorageResult> => {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`[AsyncStorage] ✅ Removed: ${key}`);
    return { success: true };
  } catch (error) {
    const err = error as Error;
    console.error(`[AsyncStorage] ❌ Failed to remove ${key}:`, err);
    
    errorTracker.captureError(err, { 
      metadata: {
        key, 
        operation: 'removeItem'
      }
    });
    
    return { success: false, error: err };
  }
};

/**
 * Check AsyncStorage size and warn if approaching limit
 * Android has ~6MB limit, iOS has ~10MB limit
 */
export const checkStorageSize = async (): Promise<{
  totalSizeMB: number;
  isNearLimit: boolean;
  keys: string[];
}> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const items = await AsyncStorage.multiGet(keys);
    
    const totalSize = items.reduce((acc, [_, value]) => {
      return acc + (value?.length || 0);
    }, 0);
    
    const totalSizeMB = totalSize / (1024 * 1024);
    const isNearLimit = totalSizeMB > 5; // Warn at 5MB
    
    console.log(`[AsyncStorage] 📊 Size: ${totalSizeMB.toFixed(2)}MB`);
    
    if (isNearLimit) {
      console.warn(`[AsyncStorage] ⚠️  Approaching storage limit!`);
      errorTracker.captureMessage('AsyncStorage near limit', 'warning', {
        metadata: {
          sizeMB: totalSizeMB,
          keyCount: keys.length
        }
      });
    }
    
    return {
      totalSizeMB,
      isNearLimit,
      keys: [...keys]
    };
  } catch (error) {
    console.error('[AsyncStorage] Failed to check size:', error);
    return {
      totalSizeMB: 0,
      isNearLimit: false,
      keys: []
    };
  }
};

/**
 * Clear old/expired data from AsyncStorage
 */
export const cleanupOldData = async (
  keysToClean: string[] = []
): Promise<number> => {
  try {
    if (keysToClean.length === 0) {
      // If no specific keys, look for cache keys to clean
      const allKeys = await AsyncStorage.getAllKeys();
      keysToClean = allKeys.filter(key => 
        key.includes('cache_') || 
        key.includes('temp_') ||
        key.includes('_expired')
      );
    }
    
    if (keysToClean.length > 0) {
      await AsyncStorage.multiRemove(keysToClean);
      console.log(`[AsyncStorage] 🧹 Cleaned ${keysToClean.length} items`);
    }
    
    return keysToClean.length;
  } catch (error) {
    console.error('[AsyncStorage] Failed to cleanup:', error);
    return 0;
  }
};

/**
 * Safely merge data into existing storage
 */
export const safeMergeItem = async (
  key: string,
  newData: Record<string, any>
): Promise<StorageResult> => {
  try {
    const existing = await safeGetItem(key, { parseJSON: true });
    
    const merged = {
      ...(existing.data || {}),
      ...newData,
      updatedAt: new Date().toISOString()
    };
    
    return await safeSetItem(key, JSON.stringify(merged));
  } catch (error) {
    const err = error as Error;
    console.error(`[AsyncStorage] ❌ Failed to merge ${key}:`, err);
    return { success: false, error: err };
  }
};
