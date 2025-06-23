import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { UserActivity, UserActivityType, RecommendationType } from '@prisma/client';

// Interfaces for real-time analytics
interface UserPreferenceVector {
  userId: string;
  categories: Record<string, number>;
  brands: Record<string, number>;
  priceRanges: Record<string, number>;
  lastUpdated: Date;
}

interface TrendingMetrics {
  productId: string;
  views: number;
  purchases: number;
  velocity: number;
  score: number;
  timeWindow: string;
}

interface AnomalyDetection {
  type: 'spike' | 'drop' | 'unusual_pattern';
  entityId: string;
  entityType: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp: Date;
}

@Injectable()
export class RealTimeAnalyticsService {
  private readonly logger = new Logger(RealTimeAnalyticsService.name);
  
  // In-memory cache for hot data (should be replaced with Redis in production)
  private userPreferenceCache = new Map<string, UserPreferenceVector>();
  private trendingCache = new Map<string, TrendingMetrics>();
  
  constructor(
    private readonly prismaService: PrismaService,
    @InjectQueue('recommendation-jobs') private readonly jobQueue: Queue,
  ) {}

  // =====================================
  // PHASE 2.2: REAL-TIME ANALYTICS PIPELINE
  // =====================================

  /**
   * Process user activity in real-time and trigger immediate updates
   */
  async processUserActivity(activity: UserActivity): Promise<void> {
    this.logger.debug(`Processing real-time activity: ${activity.activityType} for user ${activity.userId || activity.sessionId}`);
    
    try {
      // 1. Update user preference vectors in real-time
      await this.updateUserPreferenceVector(activity);
      
      // 2. Update trending product scores
      await this.updateTrendingScores(activity);
      
      // 3. Trigger hot recommendation updates for high-value activities
      await this.triggerHotRecommendationUpdates(activity);
      
      // 4. Detect anomalies and opportunities
      await this.detectAnomaliesAndOpportunities(activity);
      
      // 5. Update real-time personalization
      await this.updateRealTimePersonalization(activity);
      
    } catch (error) {
      this.logger.error(`Error processing user activity: ${error.message}`, error.stack);
    }
  }

  /**
   * Update user preference vectors based on real-time activity
   */
  private async updateUserPreferenceVector(activity: UserActivity): Promise<void> {
    if (!activity.userId) return;

    try {
      // Get current preference vector from cache or database
      let preferences = this.userPreferenceCache.get(activity.userId);
      
      if (!preferences) {
        preferences = await this.loadUserPreferences(activity.userId);
      }

      // Update preferences based on activity type
      const weightings = this.getActivityWeightings(activity.activityType);
      
      if (activity.entityType === 'product' && activity.entityId) {
        const product = await this.getProductWithDetails(activity.entityId);
        if (product) {
          // Update category preferences
          if (product.categoryId) {
            preferences.categories[product.categoryId] = 
              (preferences.categories[product.categoryId] || 0) + weightings.category;
          }
          
          // Update brand preferences
          if (product.brandId) {
            preferences.brands[product.brandId] = 
              (preferences.brands[product.brandId] || 0) + weightings.brand;
          }
          
          // Update price range preferences
          const priceRange = this.getPriceRange(product.price);
          preferences.priceRanges[priceRange] = 
            (preferences.priceRanges[priceRange] || 0) + weightings.price;
        }
      }

      preferences.lastUpdated = new Date();
      
      // Cache the updated preferences
      this.userPreferenceCache.set(activity.userId, preferences);
      
      // Persist to database every few updates (batch optimization)
      if (Math.random() < 0.3) { // 30% chance to persist
        await this.persistUserPreferences(preferences);
      }
      
    } catch (error) {
      this.logger.error(`Error updating user preferences: ${error.message}`);
    }
  }

  /**
   * Update trending product scores in real-time
   */
  private async updateTrendingScores(activity: UserActivity): Promise<void> {
    if (activity.entityType !== 'product' || !activity.entityId) return;

    try {
      const productId = activity.entityId;
      let trending = this.trendingCache.get(productId);
      
      if (!trending) {
        trending = {
          productId,
          views: 0,
          purchases: 0,
          velocity: 0,
          score: 0,
          timeWindow: '1h',
        };
      }

      // Update metrics based on activity type
      switch (activity.activityType) {
        case UserActivityType.PRODUCT_VIEW:
          trending.views += 1;
          break;
        case UserActivityType.CHECKOUT_COMPLETE:
          trending.purchases += 1;
          break;
      }

      // Calculate velocity (change rate)
      const timeWeight = this.getTimeWeight(activity.timestamp);
      trending.velocity += timeWeight;
      
      // Calculate trending score
      trending.score = this.calculateTrendingScore(trending);
      
      // Cache the updated trending data
      this.trendingCache.set(productId, trending);
      
      // If score is high enough, trigger trending recommendations update
      if (trending.score > 0.8) {
        await this.triggerTrendingUpdate(productId, trending.score);
      }
      
    } catch (error) {
      this.logger.error(`Error updating trending scores: ${error.message}`);
    }
  }

  /**
   * Trigger hot recommendation updates for high-value activities
   */
  private async triggerHotRecommendationUpdates(activity: UserActivity): Promise<void> {
    const highValueActivities: UserActivityType[] = [
      UserActivityType.PRODUCT_VIEW,
      UserActivityType.ADD_TO_CART,
      UserActivityType.CHECKOUT_START,
      UserActivityType.ADD_TO_WISHLIST,
    ];

    if (!highValueActivities.includes(activity.activityType)) return;

    try {
      // Determine priority based on activity type
      let priority: 'high' | 'medium' | 'low' = 'medium';
      
      if (activity.activityType === UserActivityType.ADD_TO_CART) {
        priority = 'high';
      } else if (activity.activityType === UserActivityType.PRODUCT_VIEW) {
        priority = 'medium';
      }

      // Queue real-time recommendation update
      await this.jobQueue.add('real-time-update', {
        userId: activity.userId,
        sessionId: activity.sessionId,
        activityType: activity.activityType,
        entityId: activity.entityId,
        priority,
      }, {
        priority: priority === 'high' ? 10 : priority === 'medium' ? 5 : 1,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
      
    } catch (error) {
      this.logger.error(`Error triggering hot updates: ${error.message}`);
    }
  }

  /**
   * Detect anomalies and opportunities in real-time
   */
  private async detectAnomaliesAndOpportunities(activity: UserActivity): Promise<void> {
    try {
      const anomalies: AnomalyDetection[] = [];

      // Detect unusual spikes in product views
      if (activity.activityType === UserActivityType.PRODUCT_VIEW && activity.entityId) {
        const recentViews = await this.getRecentProductViews(activity.entityId, 60); // Last 60 minutes
        const avgViews = await this.getAverageProductViews(activity.entityId);
        
        if (recentViews > avgViews * 3) { // 3x spike
          anomalies.push({
            type: 'spike',
            entityId: activity.entityId,
            entityType: 'product',
            severity: recentViews > avgViews * 5 ? 'high' : 'medium',
            description: `Product views spike: ${recentViews} vs avg ${avgViews}`,
            timestamp: new Date(),
          });
        }
      }

      // Detect cart abandonment patterns
      if (activity.activityType === UserActivityType.ADD_TO_CART && activity.userId) {
        const cartAbandonmentRisk = await this.calculateCartAbandonmentRisk(activity.userId);
        
        if (cartAbandonmentRisk > 0.7) {
          anomalies.push({
            type: 'unusual_pattern',
            entityId: activity.userId,
            entityType: 'user',
            severity: 'medium',
            description: `High cart abandonment risk: ${cartAbandonmentRisk}`,
            timestamp: new Date(),
          });
        }
      }

      // Process detected anomalies
      for (const anomaly of anomalies) {
        await this.processAnomaly(anomaly);
      }
      
    } catch (error) {
      this.logger.error(`Error in anomaly detection: ${error.message}`);
    }
  }

  /**
   * Update real-time personalization data
   */
  private async updateRealTimePersonalization(activity: UserActivity): Promise<void> {
    if (!activity.userId) return;

    try {
      // Update user engagement score
      await this.updateUserEngagementScore(activity.userId, activity.activityType);
      
      // Update session-based preferences
      await this.updateSessionPreferences(activity);
      
      // Update real-time recommendation weights
      await this.updateRecommendationWeights(activity.userId, activity);
      
    } catch (error) {
      this.logger.error(`Error updating real-time personalization: ${error.message}`);
    }
  }

  // =====================================
  // HELPER METHODS
  // =====================================

  private async loadUserPreferences(userId: string): Promise<UserPreferenceVector> {
    // Load from database or create default
    return {
      userId,
      categories: {},
      brands: {},
      priceRanges: {},
      lastUpdated: new Date(),
    };
  }

  private getActivityWeightings(activityType: UserActivityType): { category: number; brand: number; price: number } {
    const weightings = {
      [UserActivityType.PRODUCT_VIEW]: { category: 1, brand: 1, price: 0.5 },
      [UserActivityType.ADD_TO_CART]: { category: 3, brand: 2, price: 2 },
      [UserActivityType.ADD_TO_WISHLIST]: { category: 2, brand: 2, price: 1 },
      [UserActivityType.CHECKOUT_COMPLETE]: { category: 5, brand: 3, price: 3 },
      [UserActivityType.SEARCH]: { category: 0.5, brand: 0.5, price: 0.2 },
    };
    
    return weightings[activityType] || { category: 0.1, brand: 0.1, price: 0.1 };
  }

  private async getProductWithDetails(productId: string): Promise<any> {
    return this.prismaService.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        categoryId: true,
        brandId: true,
        price: true,
      },
    });
  }

  private getPriceRange(price: number): string {
    if (price < 50) return 'low';
    if (price < 200) return 'medium';
    if (price < 500) return 'high';
    return 'premium';
  }

  private async persistUserPreferences(preferences: UserPreferenceVector): Promise<void> {
    // Persist preferences to database
    this.logger.debug(`Persisting preferences for user ${preferences.userId}`);
  }

  private getTimeWeight(timestamp: Date): number {
    const now = new Date();
    const diffMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);
    return Math.max(0, 1 - diffMinutes / 60); // Weight decreases over 1 hour
  }

  private calculateTrendingScore(trending: TrendingMetrics): number {
    // Simple scoring algorithm - can be enhanced
    const viewScore = Math.min(trending.views / 100, 1);
    const purchaseScore = Math.min(trending.purchases / 10, 1);
    const velocityScore = Math.min(trending.velocity, 1);
    
    return (viewScore * 0.4 + purchaseScore * 0.4 + velocityScore * 0.2);
  }

  private async triggerTrendingUpdate(productId: string, score: number): Promise<void> {
    this.logger.log(`Triggering trending update for product ${productId} with score ${score}`);
    // Could trigger immediate trending recommendations update
  }

  private async getRecentProductViews(productId: string, minutes: number): Promise<number> {
    const timeThreshold = new Date(Date.now() - minutes * 60 * 1000);
    
    const count = await this.prismaService.userActivity.count({
      where: {
        entityId: productId,
        activityType: UserActivityType.PRODUCT_VIEW,
        createdAt: { gte: timeThreshold },
      },
    });
    
    return count;
  }

  private async getAverageProductViews(productId: string): Promise<number> {
    // Calculate average views over the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const count = await this.prismaService.userActivity.count({
      where: {
        entityId: productId,
        activityType: UserActivityType.PRODUCT_VIEW,
        createdAt: { gte: sevenDaysAgo },
      },
    });
    
    return count / 7; // Daily average
  }

  private async calculateCartAbandonmentRisk(userId: string): Promise<number> {
    // Simple cart abandonment risk calculation
    const recentCartAdds = await this.prismaService.userActivity.count({
      where: {
        userId,
        activityType: UserActivityType.ADD_TO_CART,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    
    const recentPurchases = await this.prismaService.userActivity.count({
      where: {
        userId,
        activityType: UserActivityType.CHECKOUT_COMPLETE,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    
    if (recentCartAdds === 0) return 0;
    return Math.max(0, 1 - recentPurchases / recentCartAdds);
  }

  private async processAnomaly(anomaly: AnomalyDetection): Promise<void> {
    this.logger.warn(`Anomaly detected: ${anomaly.type} - ${anomaly.description}`);
    
    // Could trigger alerts, special promotions, or inventory checks
    if (anomaly.severity === 'high') {
      // Send alert to admin
      // Trigger special handling
    }
  }

  private async updateUserEngagementScore(userId: string, activityType: UserActivityType): Promise<void> {
    // Update user engagement metrics
    this.logger.debug(`Updating engagement score for user ${userId} - ${activityType}`);
  }

  private async updateSessionPreferences(activity: UserActivity): Promise<void> {
    // Update session-based preference learning
    this.logger.debug(`Updating session preferences for session ${activity.sessionId}`);
  }

  private async updateRecommendationWeights(userId: string, activity: UserActivity): Promise<void> {
    // Update recommendation algorithm weights based on user behavior
    this.logger.debug(`Updating recommendation weights for user ${userId}`);
  }

  // =====================================
  // PUBLIC API METHODS
  // =====================================

  /**
   * Get real-time user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferenceVector | null> {
    return this.userPreferenceCache.get(userId) || await this.loadUserPreferences(userId);
  }

  /**
   * Get real-time trending products
   */
  async getTrendingProducts(limit = 10): Promise<TrendingMetrics[]> {
    const trending = Array.from(this.trendingCache.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return trending;
  }

  /**
   * Force preference cache refresh for user
   */
  async refreshUserPreferences(userId: string): Promise<void> {
    this.userPreferenceCache.delete(userId);
    await this.loadUserPreferences(userId);
  }

  /**
   * Get analytics metrics for monitoring
   */
  async getAnalyticsMetrics(): Promise<any> {
    return {
      cachedUsers: this.userPreferenceCache.size,
      trendingProducts: this.trendingCache.size,
      lastUpdate: new Date(),
    };
  }
} 