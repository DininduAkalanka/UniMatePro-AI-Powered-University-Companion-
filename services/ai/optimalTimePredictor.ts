/**
 * Optimal Time Predictor - Phase 3 ML Service
 * 
 * Uses on-device logistic regression to predict the best time to send notifications
 * Optimized for O(1) prediction time complexity using pre-computed hourly matrices
 * 
 * Algorithm: Logistic Regression
 * - Simple, fast, interpretable
 * - Works well with limited data
 * - O(1) prediction after training
 * - Low memory footprint (~50KB per user)
 * 
 * Features:
 * 1. Hour of day (0-23) - categorical
 * 2. Day of week (0-6) - categorical  
 * 3. Notification type - categorical
 * 4. User active state - categorical
 * 5. Recent activity (minutes) - numerical
 * 
 * Target: Responded within 1 hour (binary classification)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    HourlySuccessRate,
    NotificationAnalytics,
    NotificationPriority,
    NotificationType,
    OptimalTimeModel,
    TrainingDataPoint
} from '../../types/notification';

// Storage keys
const MODEL_STORAGE_KEY = '@optimal_time_model';
const TRAINING_DATA_KEY = '@training_data';
const HOURLY_MATRIX_KEY = '@hourly_success_matrix';

// Model configuration
const MODEL_CONFIG = {
  MIN_SAMPLES_FOR_TRAINING: 30, // Minimum data points to train
  RETRAIN_INTERVAL_DAYS: 7, // Retrain every 7 days
  MAX_TRAINING_SAMPLES: 500, // Keep last 500 samples
  LEARNING_RATE: 0.01,
  MAX_ITERATIONS: 100,
  CONVERGENCE_THRESHOLD: 0.001,
};

// ========================================
// DATA STRUCTURES (O(1) Operations)
// ========================================

/**
 * Hourly Success Matrix - O(1) lookup by hour
 * Uses Map for fast access without iteration
 */
class HourlySuccessMatrix {
  private matrix: Map<number, HourlySuccessRate>;
  
  constructor() {
    this.matrix = new Map();
    // Initialize all 24 hours with default values
    for (let hour = 0; hour < 24; hour++) {
      this.matrix.set(hour, {
        hour,
        totalSent: 0,
        totalOpened: 0,
        totalResponded: 0,
        successRate: 0,
        avgResponseTimeSeconds: 0,
        lastUpdated: new Date(),
      });
    }
  }
  
  /**
   * Update hour statistics - O(1)
   */
  update(hour: number, responded: boolean, responseTime?: number): void {
    const stats = this.matrix.get(hour)!;
    
    stats.totalSent++;
    if (responded) {
      stats.totalResponded++;
      stats.totalOpened++;
      
      // Update average response time (incremental formula)
      if (responseTime) {
        const n = stats.totalResponded;
        stats.avgResponseTimeSeconds = 
          ((n - 1) * stats.avgResponseTimeSeconds + responseTime) / n;
      }
    }
    
    // Recalculate success rate
    stats.successRate = stats.totalSent > 0 
      ? stats.totalResponded / stats.totalSent 
      : 0;
    
    stats.lastUpdated = new Date();
    this.matrix.set(hour, stats);
  }
  
  /**
   * Get success rate for hour - O(1)
   */
  getSuccessRate(hour: number): number {
    return this.matrix.get(hour)?.successRate || 0;
  }
  
  /**
   * Get best hours (top 3) - O(24) = O(1) since constant
   */
  getBestHours(): number[] {
    const hours = Array.from(this.matrix.entries())
      .filter(([_, stats]) => stats.totalSent >= 3) // Min 3 samples
      .sort((a, b) => b[1].successRate - a[1].successRate)
      .slice(0, 3)
      .map(([hour]) => hour);
    
    return hours;
  }
  
  /**
   * Get all statistics - O(1)
   */
  getAll(): Map<number, HourlySuccessRate> {
    return new Map(this.matrix);
  }
  
  /**
   * Serialize for storage
   */
  toJSON(): any {
    return Array.from(this.matrix.entries());
  }
  
  /**
   * Deserialize from storage
   */
  static fromJSON(data: any): HourlySuccessMatrix {
    const matrix = new HourlySuccessMatrix();
    if (data && Array.isArray(data)) {
      data.forEach(([hour, stats]) => {
        matrix.matrix.set(hour, {
          ...stats,
          lastUpdated: new Date(stats.lastUpdated),
        });
      });
    }
    return matrix;
  }
}

// ========================================
// LOGISTIC REGRESSION MODEL
// ========================================

/**
 * On-device Logistic Regression for binary classification
 * Optimized for fast prediction (O(1) with pre-computed features)
 */
class LogisticRegressionModel {
  private weights: {
    hourOfDay: Map<number, number>;
    dayOfWeek: Map<number, number>;
    notificationType: Map<NotificationType, number>;
    userActiveState: Map<string, number>;
    recentActivity: number;
    intercept: number;
  };
  
  private featureStats: {
    recentActivityMean: number;
    recentActivityStd: number;
  };
  
  constructor() {
    this.weights = {
      hourOfDay: new Map(),
      dayOfWeek: new Map(),
      notificationType: new Map(),
      userActiveState: new Map(),
      recentActivity: 0,
      intercept: 0,
    };
    
    this.featureStats = {
      recentActivityMean: 0,
      recentActivityStd: 1,
    };
    
    this.initializeWeights();
  }
  
  /**
   * Initialize weights to small random values
   */
  private initializeWeights(): void {
    // Hour of day weights (24 hours)
    for (let h = 0; h < 24; h++) {
      this.weights.hourOfDay.set(h, this.randomWeight());
    }
    
    // Day of week weights (7 days)
    for (let d = 0; d < 7; d++) {
      this.weights.dayOfWeek.set(d, this.randomWeight());
    }
    
    // Notification type weights
    Object.values(NotificationType).forEach(type => {
      this.weights.notificationType.set(type, this.randomWeight());
    });
    
    // User state weights
    ['active', 'idle', 'studying', 'away'].forEach(state => {
      this.weights.userActiveState.set(state, this.randomWeight());
    });
    
    this.weights.recentActivity = this.randomWeight();
    this.weights.intercept = this.randomWeight();
  }
  
  private randomWeight(): number {
    return (Math.random() - 0.5) * 0.1; // Small random values
  }
  
  /**
   * Sigmoid activation function
   */
  private sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-z));
  }
  
  /**
   * Predict probability - O(1) time complexity
   * Uses pre-computed weights for instant prediction
   */
  predict(dataPoint: TrainingDataPoint): number {
    // Compute linear combination z = w^T * x + b
    let z = this.weights.intercept;
    
    // Categorical features (O(1) Map lookup)
    z += this.weights.hourOfDay.get(dataPoint.hourOfDay) || 0;
    z += this.weights.dayOfWeek.get(dataPoint.dayOfWeek) || 0;
    z += this.weights.notificationType.get(dataPoint.notificationType) || 0;
    z += this.weights.userActiveState.get(dataPoint.userActiveState) || 0;
    
    // Numerical feature (normalized)
    const normalizedActivity = this.normalizeActivity(dataPoint.recentActivityMinutes);
    z += this.weights.recentActivity * normalizedActivity;
    
    // Apply sigmoid to get probability
    return this.sigmoid(z);
  }
  
  /**
   * Normalize activity using z-score normalization
   */
  private normalizeActivity(activity: number): number {
    if (this.featureStats.recentActivityStd === 0) return 0;
    return (activity - this.featureStats.recentActivityMean) / this.featureStats.recentActivityStd;
  }
  
  /**
   * Train model using gradient descent
   * Time complexity: O(n * m * k) where:
   * - n = number of samples
   * - m = number of features (constant ~35)
   * - k = number of iterations (max 100)
   */
  train(trainingData: TrainingDataPoint[]): {loss: number; iterations: number} {
    console.log(`\n🤖 [ML TRAINING] Starting with ${trainingData.length} samples...`);
    
    if (trainingData.length < MODEL_CONFIG.MIN_SAMPLES_FOR_TRAINING) {
      console.log('⚠️ Insufficient training data');
      return { loss: -1, iterations: 0 };
    }
    
    // Compute feature statistics for normalization
    this.computeFeatureStats(trainingData);
    
    let prevLoss = Infinity;
    let iterations = 0;
    
    // Gradient descent
    for (let iter = 0; iter < MODEL_CONFIG.MAX_ITERATIONS; iter++) {
      iterations++;
      
      // Initialize gradients
      const gradients = {
        hourOfDay: new Map<number, number>(),
        dayOfWeek: new Map<number, number>(),
        notificationType: new Map<NotificationType, number>(),
        userActiveState: new Map<string, number>(),
        recentActivity: 0,
        intercept: 0,
      };
      
      let totalLoss = 0;
      
      // Compute gradients
      trainingData.forEach(dataPoint => {
        const prediction = this.predict(dataPoint);
        const error = prediction - (dataPoint.respondedWithinHour ? 1 : 0);
        
        // Binary cross-entropy loss
        const y = dataPoint.respondedWithinHour ? 1 : 0;
        totalLoss += -(y * Math.log(prediction + 1e-15) + (1 - y) * Math.log(1 - prediction + 1e-15));
        
        // Update gradients
        gradients.hourOfDay.set(
          dataPoint.hourOfDay, 
          (gradients.hourOfDay.get(dataPoint.hourOfDay) || 0) + error
        );
        
        gradients.dayOfWeek.set(
          dataPoint.dayOfWeek,
          (gradients.dayOfWeek.get(dataPoint.dayOfWeek) || 0) + error
        );
        
        gradients.notificationType.set(
          dataPoint.notificationType,
          (gradients.notificationType.get(dataPoint.notificationType) || 0) + error
        );
        
        gradients.userActiveState.set(
          dataPoint.userActiveState,
          (gradients.userActiveState.get(dataPoint.userActiveState) || 0) + error
        );
        
        const normalizedActivity = this.normalizeActivity(dataPoint.recentActivityMinutes);
        gradients.recentActivity += error * normalizedActivity;
        gradients.intercept += error;
      });
      
      // Average loss
      const avgLoss = totalLoss / trainingData.length;
      
      // Update weights using gradient descent
      const lr = MODEL_CONFIG.LEARNING_RATE;
      const n = trainingData.length;
      
      gradients.hourOfDay.forEach((grad, hour) => {
        this.weights.hourOfDay.set(hour, (this.weights.hourOfDay.get(hour) || 0) - lr * grad / n);
      });
      
      gradients.dayOfWeek.forEach((grad, day) => {
        this.weights.dayOfWeek.set(day, (this.weights.dayOfWeek.get(day) || 0) - lr * grad / n);
      });
      
      gradients.notificationType.forEach((grad, type) => {
        this.weights.notificationType.set(type, (this.weights.notificationType.get(type) || 0) - lr * grad / n);
      });
      
      gradients.userActiveState.forEach((grad, state) => {
        this.weights.userActiveState.set(state, (this.weights.userActiveState.get(state) || 0) - lr * grad / n);
      });
      
      this.weights.recentActivity -= lr * gradients.recentActivity / n;
      this.weights.intercept -= lr * gradients.intercept / n;
      
      // Check convergence
      if (Math.abs(prevLoss - avgLoss) < MODEL_CONFIG.CONVERGENCE_THRESHOLD) {
        console.log(`✅ Converged at iteration ${iter + 1}, loss: ${avgLoss.toFixed(4)}`);
        break;
      }
      
      prevLoss = avgLoss;
      
      if ((iter + 1) % 20 === 0) {
        console.log(`📊 Iteration ${iter + 1}, Loss: ${avgLoss.toFixed(4)}`);
      }
    }
    
    console.log(`✅ Training complete: ${iterations} iterations`);
    return { loss: prevLoss, iterations };
  }
  
  /**
   * Compute feature statistics for normalization
   */
  private computeFeatureStats(data: TrainingDataPoint[]): void {
    const activities = data.map(d => d.recentActivityMinutes);
    
    // Mean
    this.featureStats.recentActivityMean = 
      activities.reduce((sum, val) => sum + val, 0) / activities.length;
    
    // Standard deviation
    const variance = activities.reduce((sum, val) => 
      sum + Math.pow(val - this.featureStats.recentActivityMean, 2), 0
    ) / activities.length;
    
    this.featureStats.recentActivityStd = Math.sqrt(variance);
  }
  
  /**
   * Serialize model for storage
   */
  toJSON(): any {
    return {
      weights: {
        hourOfDay: Array.from(this.weights.hourOfDay.entries()),
        dayOfWeek: Array.from(this.weights.dayOfWeek.entries()),
        notificationType: Array.from(this.weights.notificationType.entries()),
        userActiveState: Array.from(this.weights.userActiveState.entries()),
        recentActivity: this.weights.recentActivity,
        intercept: this.weights.intercept,
      },
      featureStats: this.featureStats,
    };
  }
  
  /**
   * Deserialize model from storage
   */
  static fromJSON(data: any): LogisticRegressionModel {
    const model = new LogisticRegressionModel();
    
    if (data && data.weights) {
      model.weights.hourOfDay = new Map(data.weights.hourOfDay);
      model.weights.dayOfWeek = new Map(data.weights.dayOfWeek);
      model.weights.notificationType = new Map(data.weights.notificationType);
      model.weights.userActiveState = new Map(data.weights.userActiveState);
      model.weights.recentActivity = data.weights.recentActivity;
      model.weights.intercept = data.weights.intercept;
    }
    
    if (data && data.featureStats) {
      model.featureStats = data.featureStats;
    }
    
    return model;
  }
}

// ========================================
// OPTIMAL TIME PREDICTOR SERVICE
// ========================================

/**
 * Main service for predicting optimal notification send times
 */
class OptimalTimePredictor {
  private model: LogisticRegressionModel | null = null;
  private hourlyMatrix: HourlySuccessMatrix;
  private userId: string | null = null;
  private initialized: boolean = false;
  
  constructor() {
    this.hourlyMatrix = new HourlySuccessMatrix();
  }
  
  /**
   * Initialize predictor for user - O(1)
   */
  async initialize(userId: string): Promise<void> {
    if (this.initialized && this.userId === userId) return;
    
    console.log(`\n🚀 [OPTIMAL TIME] Initializing for user: ${userId}`);
    
    this.userId = userId;
    
    // Load existing model
    await this.loadModel(userId);
    
    // Load hourly matrix
    await this.loadHourlyMatrix(userId);
    
    this.initialized = true;
    console.log('✅ Optimal time predictor initialized');
  }
  
  /**
   * Predict optimal send time for notification - O(1)
   * Returns hour (0-23) with highest predicted success rate
   */
  async predictOptimalHour(
    notificationType: NotificationType,
    priority: NotificationPriority,
    currentHour: number,
    userActiveState: 'active' | 'idle' | 'studying' | 'away' = 'idle',
    recentActivityMinutes: number = 0
  ): Promise<{
    optimalHour: number;
    successRate: number;
    alternativeHours: Array<{hour: number; successRate: number}>;
    usingML: boolean;
  }> {
    if (!this.initialized || !this.userId) {
      throw new Error('Predictor not initialized');
    }
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // If we have trained model, use ML prediction
    if (this.model) {
      return this.predictUsingML(
        notificationType,
        priority,
        currentHour,
        dayOfWeek,
        userActiveState,
        recentActivityMinutes
      );
    }
    
    // Fallback to hourly matrix (simpler heuristic)
    return this.predictUsingMatrix(currentHour);
  }
  
  /**
   * ML-based prediction - O(24) = O(1) constant time
   */
  private predictUsingML(
    notificationType: NotificationType,
    priority: NotificationPriority,
    currentHour: number,
    dayOfWeek: number,
    userActiveState: 'active' | 'idle' | 'studying' | 'away',
    recentActivityMinutes: number
  ): {
    optimalHour: number;
    successRate: number;
    alternativeHours: Array<{hour: number; successRate: number}>;
    usingML: boolean;
  } {
    // Predict success rate for each hour (24 iterations = constant)
    const hourPredictions: Array<{hour: number; successRate: number}> = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const dataPoint: TrainingDataPoint = {
        hourOfDay: hour,
        dayOfWeek,
        notificationType,
        priority,
        userActiveState,
        recentActivityMinutes,
        currentSessionActive: userActiveState === 'studying',
        tasksOverdue: 0,
        studyStreak: 0,
        respondedWithinHour: false, // Not used for prediction
        timestamp: new Date(),
        engagementScore: 0,
      };
      
      const successRate = this.model!.predict(dataPoint);
      hourPredictions.push({ hour, successRate });
    }
    
    // Sort by success rate (descending)
    hourPredictions.sort((a, b) => b.successRate - a.successRate);
    
    return {
      optimalHour: hourPredictions[0].hour,
      successRate: hourPredictions[0].successRate,
      alternativeHours: hourPredictions.slice(1, 4), // Top 3 alternatives
      usingML: true,
    };
  }
  
  /**
   * Matrix-based prediction (fallback) - O(1)
   */
  private predictUsingMatrix(currentHour: number): {
    optimalHour: number;
    successRate: number;
    alternativeHours: Array<{hour: number; successRate: number}>;
    usingML: boolean;
  } {
    const bestHours = this.hourlyMatrix.getBestHours();
    
    // If no data, use current hour
    if (bestHours.length === 0) {
      return {
        optimalHour: currentHour,
        successRate: 0.5, // Default estimate
        alternativeHours: [],
        usingML: false,
      };
    }
    
    const alternatives = bestHours.slice(1, 4).map(hour => ({
      hour,
      successRate: this.hourlyMatrix.getSuccessRate(hour),
    }));
    
    return {
      optimalHour: bestHours[0],
      successRate: this.hourlyMatrix.getSuccessRate(bestHours[0]),
      alternativeHours: alternatives,
      usingML: false,
    };
  }
  
  /**
   * Record notification analytics for training - O(1)
   */
  async recordAnalytics(analytics: NotificationAnalytics): Promise<void> {
    if (!this.userId) return;
    
    // Update hourly matrix - O(1)
    const responseTime = analytics.responseTimeSeconds;
    this.hourlyMatrix.update(
      analytics.hourOfDay,
      analytics.respondedWithinHour,
      responseTime
    );
    
    // Save updated matrix
    await this.saveHourlyMatrix();
    
    // Add to training data
    await this.addTrainingData(analytics);
    
    // Check if we should retrain
    await this.checkAndRetrain();
  }
  
  /**
   * Add training data point
   */
  private async addTrainingData(analytics: NotificationAnalytics): Promise<void> {
    if (!this.userId) return;
    
    const dataPoint: TrainingDataPoint = {
      hourOfDay: analytics.hourOfDay,
      dayOfWeek: analytics.dayOfWeek,
      notificationType: analytics.type,
      priority: analytics.priority,
      userActiveState: analytics.userActiveState || 'idle',
      recentActivityMinutes: analytics.contextualData?.recentActivityMinutes || 0,
      currentSessionActive: analytics.contextualData?.currentSessionActive || false,
      tasksOverdue: analytics.contextualData?.tasksOverdue || 0,
      studyStreak: analytics.contextualData?.studyStreak || 0,
      respondedWithinHour: analytics.respondedWithinHour,
      timestamp: analytics.sentAt,
      engagementScore: analytics.engagementScore || 0,
    };
    
    // Load existing training data
    const key = `${TRAINING_DATA_KEY}_${this.userId}`;
    const stored = await AsyncStorage.getItem(key);
    const trainingData: TrainingDataPoint[] = stored ? JSON.parse(stored) : [];
    
    // Add new data point
    trainingData.push(dataPoint);
    
    // Keep only recent data
    if (trainingData.length > MODEL_CONFIG.MAX_TRAINING_SAMPLES) {
      trainingData.shift(); // Remove oldest
    }
    
    // Save
    await AsyncStorage.setItem(key, JSON.stringify(trainingData));
  }
  
  /**
   * Check if model should be retrained
   */
  async checkAndRetrain(): Promise<void> {
    if (!this.userId) return;
    
    // Load training data
    const key = `${TRAINING_DATA_KEY}_${this.userId}`;
    const stored = await AsyncStorage.getItem(key);
    const trainingData: TrainingDataPoint[] = stored ? JSON.parse(stored) : [];
    
    // Check if we have enough data
    if (trainingData.length < MODEL_CONFIG.MIN_SAMPLES_FOR_TRAINING) {
      console.log(`📊 Need more data: ${trainingData.length}/${MODEL_CONFIG.MIN_SAMPLES_FOR_TRAINING}`);
      return;
    }
    
    // Check if model needs retraining
    const modelKey = `${MODEL_STORAGE_KEY}_${this.userId}`;
    const modelData = await AsyncStorage.getItem(modelKey);
    
    let shouldRetrain = false;
    
    if (!modelData) {
      shouldRetrain = true; // No model exists
    } else {
      const stored: OptimalTimeModel = JSON.parse(modelData);
      const daysSinceTraining = (Date.now() - new Date(stored.trainedAt).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceTraining >= MODEL_CONFIG.RETRAIN_INTERVAL_DAYS) {
        shouldRetrain = true;
      }
    }
    
    if (shouldRetrain) {
      console.log('🔄 Retraining model...');
      await this.trainModel(trainingData);
    }
  }
  
  /**
   * Train ML model
   */
  async trainModel(trainingData: TrainingDataPoint[]): Promise<void> {
    if (!this.userId) return;
    
    console.log(`\n🎓 [ML TRAINING] Starting model training...`);
    console.log(`📊 Training samples: ${trainingData.length}`);
    
    // Create new model
    this.model = new LogisticRegressionModel();
    
    // Train
    const result = this.model.train(trainingData);
    
    // Calculate accuracy
    let correct = 0;
    trainingData.forEach(dataPoint => {
      const prediction = this.model!.predict(dataPoint);
      const predicted = prediction >= 0.5;
      if (predicted === dataPoint.respondedWithinHour) {
        correct++;
      }
    });
    
    const accuracy = correct / trainingData.length;
    console.log(`✅ Training accuracy: ${(accuracy * 100).toFixed(1)}%`);
    
    // Save model
    await this.saveModel(accuracy, trainingData.length);
  }
  
  /**
   * Save model to storage
   */
  private async saveModel(accuracy: number, sampleCount: number): Promise<void> {
    if (!this.userId || !this.model) return;
    
    const modelData: OptimalTimeModel = {
      userId: this.userId,
      version: '1.0.0',
      trainedAt: new Date(),
      sampleCount,
      accuracy,
      weights: {
        hourOfDay: [],
        dayOfWeek: [],
        notificationType: [],
        userActiveState: [],
        recentActivity: 0,
        intercept: 0,
      },
      hourlySuccessMatrix: new Map(),
      featureStats: {
        recentActivityMean: 0,
        recentActivityStd: 0,
      },
    };
    
    const serialized = this.model.toJSON();
    
    const key = `${MODEL_STORAGE_KEY}_${this.userId}`;
    await AsyncStorage.setItem(key, JSON.stringify({
      ...modelData,
      serializedModel: serialized,
    }));
    
    console.log('💾 Model saved successfully');
  }
  
  /**
   * Load model from storage
   */
  private async loadModel(userId: string): Promise<void> {
    const key = `${MODEL_STORAGE_KEY}_${userId}`;
    const stored = await AsyncStorage.getItem(key);
    
    if (stored) {
      const data = JSON.parse(stored);
      if (data.serializedModel) {
        this.model = LogisticRegressionModel.fromJSON(data.serializedModel);
        console.log(`✅ Loaded model (accuracy: ${(data.accuracy * 100).toFixed(1)}%, samples: ${data.sampleCount})`);
      }
    } else {
      console.log('📊 No existing model found - will use heuristics until trained');
    }
  }
  
  /**
   * Save hourly matrix
   */
  private async saveHourlyMatrix(): Promise<void> {
    if (!this.userId) return;
    
    const key = `${HOURLY_MATRIX_KEY}_${this.userId}`;
    const serialized = this.hourlyMatrix.toJSON();
    await AsyncStorage.setItem(key, JSON.stringify(serialized));
  }
  
  /**
   * Load hourly matrix
   */
  private async loadHourlyMatrix(userId: string): Promise<void> {
    const key = `${HOURLY_MATRIX_KEY}_${userId}`;
    const stored = await AsyncStorage.getItem(key);
    
    if (stored) {
      const data = JSON.parse(stored);
      this.hourlyMatrix = HourlySuccessMatrix.fromJSON(data);
      console.log('✅ Loaded hourly success matrix');
    }
  }
  
  /**
   * Get model statistics
   */
  async getModelStats(): Promise<any> {
    if (!this.userId) return null;
    
    const modelKey = `${MODEL_STORAGE_KEY}_${this.userId}`;
    const modelData = await AsyncStorage.getItem(modelKey);
    
    const trainingKey = `${TRAINING_DATA_KEY}_${this.userId}`;
    const trainingData = await AsyncStorage.getItem(trainingKey);
    
    const bestHours = this.hourlyMatrix.getBestHours();
    
    return {
      hasModel: !!this.model,
      modelAccuracy: modelData ? JSON.parse(modelData).accuracy : null,
      trainingSamples: trainingData ? JSON.parse(trainingData).length : 0,
      bestHours,
      hourlyStats: Array.from(this.hourlyMatrix.getAll().entries()).map(([hour, stats]) => ({
        hour,
        sent: stats.totalSent,
        responded: stats.totalResponded,
        rate: (stats.successRate * 100).toFixed(1) + '%',
      })),
    };
  }
}

// ========================================
// EXPORTS
// ========================================

// Singleton instance
const predictor = new OptimalTimePredictor();

export async function initializeOptimalTimePredictor(userId: string): Promise<void> {
  await predictor.initialize(userId);
}

export async function predictOptimalSendTime(
  notificationType: NotificationType,
  priority: NotificationPriority,
  userActiveState?: 'active' | 'idle' | 'studying' | 'away',
  recentActivityMinutes?: number
): Promise<{
  optimalHour: number;
  successRate: number;
  alternativeHours: Array<{hour: number; successRate: number}>;
  usingML: boolean;
}> {
  const currentHour = new Date().getHours();
  return predictor.predictOptimalHour(
    notificationType,
    priority,
    currentHour,
    userActiveState,
    recentActivityMinutes
  );
}

export async function recordNotificationAnalytics(analytics: NotificationAnalytics): Promise<void> {
  await predictor.recordAnalytics(analytics);
}

export async function forceModelTraining(): Promise<void> {
  // Get training data and force retrain
  const stats = await predictor.getModelStats();
  console.log('🔄 Forcing model retraining with', stats.trainingSamples, 'samples');
  await predictor.checkAndRetrain();
}

export async function getOptimalTimeStats(): Promise<any> {
  return predictor.getModelStats();
}

export default {
  initializeOptimalTimePredictor,
  predictOptimalSendTime,
  recordNotificationAnalytics,
  forceModelTraining,
  getOptimalTimeStats,
};
