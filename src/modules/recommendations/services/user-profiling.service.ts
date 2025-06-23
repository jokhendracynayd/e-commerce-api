import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { Cron } from '@nestjs/schedule';
import { UserActivityType } from '@prisma/client';

// Interfaces for user profiling
interface UserProfile {
  userId: string;
  behavioralSegment: 'browser' | 'buyer' | 'researcher' | 'impulse_buyer' | 'loyal_customer' | 'price_sensitive';
  preferenceVector: {
    categories: Record<string, number>;
    brands: Record<string, number>;
    priceRanges: Record<string, number>;
    timePatterns: Record<string, number>; // when they shop
    devicePreferences: Record<string, number>;
  };
  engagementScore: number; // 0-1
  lifetimeValue: number;
  churnRisk: number; // 0-1, 1 = high risk
  purchaseFrequency: number; // purchases per month
  averageOrderValue: number;
  sessionMetrics: {
    averageSessionDuration: number;
    pagesPerSession: number;
    bounceRate: number;
  };
  nextBestActions: string[];
  lastUpdated: Date;
}

interface UserSegment {
  segmentId: string;
  name: string;
  description: string;
  criteria: any;
  userCount: number;
  characteristics: string[];
  recommendationStrategies: string[];
}

interface BehavioralPattern {
  userId: string;
  pattern: 'weekend_shopper' | 'weekday_browser' | 'evening_buyer' | 'mobile_first' | 'deal_hunter';
  strength: number; // 0-1
  evidence: string[];
}

@Injectable()
export class UserProfilingService {
  private readonly logger = new Logger(UserProfilingService.name);
  
  // Cache for user profiles
  private profileCache = new Map<string, UserProfile>();
  private segmentCache = new Map<string, UserSegment>();
  
  constructor(private readonly prismaService: PrismaService) {}

  // =====================================
  // PHASE 2.2: USER SEGMENTATION & PROFILING
  // =====================================

  /**
   * Update user profiles with advanced behavioral analysis
   * Runs every 2 hours to update user profiles
   */
  @Cron('0 */2 * * *', { name: 'user-profiling' })
  async updateUserProfiles(): Promise<void> {
    this.logger.log('Starting user profile updates');
    
    try {
      // 1. Get active users for profiling
      const activeUsers = await this.getActiveUsersForProfiling();
      
      // 2. Update profiles in batches
      const batchSize = 100;
      for (let i = 0; i < activeUsers.length; i += batchSize) {
        const batch = activeUsers.slice(i, i + batchSize);
        await this.processBatchProfiles(batch);
      }
      
      // 3. Update segments
      await this.updateUserSegments();
      
      // 4. Generate recommendations strategies
      await this.generateRecommendationStrategies();
      
      this.logger.log(`Updated profiles for ${activeUsers.length} users`);
    } catch (error) {
      this.logger.error(`Error in user profiling: ${error.message}`, error.stack);
    }
  }

  /**
   * Process a batch of user profiles
   */
  private async processBatchProfiles(users: { id: string }[]): Promise<void> {
    const promises = users.map(user => this.updateUserProfile(user.id));
    await Promise.all(promises);
  }

  /**
   * Update comprehensive user profile with behavioral analysis
   */
  async updateUserProfile(userId: string): Promise<UserProfile> {
    this.logger.debug(`Updating profile for user ${userId}`);
    
    try {
      // 1. Get user activity data
      const activityData = await this.getUserActivityData(userId);
      
      // 2. Calculate behavioral segment
      const behavioralSegment = await this.calculateBehavioralSegment(userId, activityData);
      
      // 3. Build preference vector
      const preferenceVector = await this.buildPreferenceVector(userId, activityData);
      
      // 4. Calculate engagement metrics
      const engagementScore = this.calculateEngagementScore(activityData);
      
      // 5. Predict lifetime value
      const lifetimeValue = await this.predictLifetimeValue(userId, activityData);
      
      // 6. Assess churn risk
      const churnRisk = await this.assessChurnRisk(userId, activityData);
      
      // 7. Calculate purchase patterns
      const purchaseMetrics = await this.calculatePurchaseMetrics(userId);
      
      // 8. Analyze session patterns
      const sessionMetrics = await this.analyzeSessionMetrics(userId, activityData);
      
      // 9. Generate next best actions
      const nextBestActions = await this.generateNextBestActions(userId, behavioralSegment, churnRisk);
      
      const profile: UserProfile = {
        userId,
        behavioralSegment,
        preferenceVector,
        engagementScore,
        lifetimeValue,
        churnRisk,
        purchaseFrequency: purchaseMetrics.frequency,
        averageOrderValue: purchaseMetrics.avgOrderValue,
        sessionMetrics,
        nextBestActions,
        lastUpdated: new Date(),
      };
      
      // Cache the profile
      this.profileCache.set(userId, profile);
      
      return profile;
    } catch (error) {
      this.logger.error(`Error updating profile for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate behavioral segment based on user activity patterns
   */
  private async calculateBehavioralSegment(
    userId: string,
    activityData: any[],
  ): Promise<UserProfile['behavioralSegment']> {
    const patterns = await this.analyzeBehavioralPatterns(userId, activityData);
    
    // Get purchase history
    const purchases = await this.getUserPurchases(userId);
    const views = activityData.filter(a => a.activityType === UserActivityType.PRODUCT_VIEW);
    const cartAdds = activityData.filter(a => a.activityType === UserActivityType.ADD_TO_CART);
    
    // Calculate ratios
    const purchaseToViewRatio = views.length > 0 ? purchases.length / views.length : 0;
    const cartToViewRatio = views.length > 0 ? cartAdds.length / views.length : 0;
    const avgSessionDuration = this.calculateAverageSessionDuration(activityData);
    
    // Segment logic
    if (purchases.length === 0 && views.length > 20) {
      return 'browser';
    } else if (purchaseToViewRatio > 0.1 && avgSessionDuration < 300) { // 5 minutes
      return 'impulse_buyer';
    } else if (avgSessionDuration > 1800 && cartToViewRatio < 0.1) { // 30 minutes
      return 'researcher';
    } else if (purchases.length >= 3 && this.isRepeatCustomer(purchases)) {
      return 'loyal_customer';
    } else if (this.isPriceSensitive(purchases, activityData)) {
      return 'price_sensitive';
    } else if (purchases.length > 0) {
      return 'buyer';
    }
    
    return 'browser';
  }

  /**
   * Build user preference vector from activity data
   */
  private async buildPreferenceVector(userId: string, activityData: any[]): Promise<UserProfile['preferenceVector']> {
    const categories: Record<string, number> = {};
    const brands: Record<string, number> = {};
    const priceRanges: Record<string, number> = {};
    const timePatterns: Record<string, number> = {};
    const devicePreferences: Record<string, number> = {};
    
    // Analyze product interactions
    for (const activity of activityData) {
      if (activity.entityType === 'product' && activity.entityId) {
        const product = await this.getProductDetails(activity.entityId);
        if (product) {
          // Weight activities differently
          const weight = this.getActivityWeight(activity.activityType);
          
          // Category preferences
          if (product.categoryId) {
            categories[product.categoryId] = (categories[product.categoryId] || 0) + weight;
          }
          
          // Brand preferences
          if (product.brandId) {
            brands[product.brandId] = (brands[product.brandId] || 0) + weight;
          }
          
          // Price range preferences
          const priceRange = this.getPriceRange(product.price);
          priceRanges[priceRange] = (priceRanges[priceRange] || 0) + weight;
        }
      }
      
      // Time pattern analysis
      const hour = activity.createdAt.getHours();
      const timeSlot = this.getTimeSlot(hour);
      timePatterns[timeSlot] = (timePatterns[timeSlot] || 0) + 1;
      
      // Device preferences
      if (activity.deviceType) {
        devicePreferences[activity.deviceType] = (devicePreferences[activity.deviceType] || 0) + 1;
      }
    }
    
    // Normalize the vectors
    this.normalizeVector(categories);
    this.normalizeVector(brands);
    this.normalizeVector(priceRanges);
    this.normalizeVector(timePatterns);
    this.normalizeVector(devicePreferences);
    
    return {
      categories,
      brands,
      priceRanges,
      timePatterns,
      devicePreferences,
    };
  }

  /**
   * Calculate user engagement score
   */
  private calculateEngagementScore(activityData: any[]): number {
    if (activityData.length === 0) return 0;
    
    const totalActivities = activityData.length;
    const uniqueDays = new Set(activityData.map(a => a.createdAt.toDateString())).size;
    const highValueActivities = activityData.filter(a => 
      [UserActivityType.ADD_TO_CART, UserActivityType.ADD_TO_WISHLIST, UserActivityType.CHECKOUT_START].includes(a.activityType)
    ).length;
    
    // Calculate various engagement metrics
    const activityFrequency = totalActivities / Math.max(uniqueDays, 1);
    const highValueRatio = highValueActivities / totalActivities;
    const recency = this.calculateRecencyScore(activityData);
    
    // Combine metrics (weighted average)
    const engagementScore = (
      activityFrequency * 0.3 +
      highValueRatio * 0.4 +
      recency * 0.3
    );
    
    return Math.min(1, engagementScore / 10); // Normalize to 0-1
  }

  /**
   * Predict user lifetime value using simple heuristics
   */
  private async predictLifetimeValue(userId: string, activityData: any[]): Promise<number> {
    const purchases = await this.getUserPurchases(userId);
    
    if (purchases.length === 0) {
      // For new users, predict based on engagement
      const engagementScore = this.calculateEngagementScore(activityData);
      return engagementScore * 500; // Base prediction
    }
    
    // Calculate historical metrics
    const totalSpent = purchases.reduce((sum, p) => sum + Number(p.total), 0);
    const avgOrderValue = totalSpent / purchases.length;
    const daysSinceFirstPurchase = Math.max(1, (Date.now() - purchases[0].createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const purchaseFrequency = purchases.length / (daysSinceFirstPurchase / 30); // per month
    
    // Simple LTV prediction: AOV * Purchase Frequency * Predicted Months
    const predictedMonths = Math.min(24, daysSinceFirstPurchase / 30 * 2); // Conservative growth
    return avgOrderValue * purchaseFrequency * predictedMonths;
  }

  /**
   * Assess churn risk based on activity patterns
   */
  private async assessChurnRisk(userId: string, activityData: any[]): Promise<number> {
    if (activityData.length === 0) return 1; // High risk if no activity
    
    const lastActivity = Math.max(...activityData.map(a => a.createdAt.getTime()));
    const daysSinceLastActivity = (Date.now() - lastActivity) / (1000 * 60 * 60 * 24);
    
    // Risk factors
    let riskScore = 0;
    
    // Recency risk
    if (daysSinceLastActivity > 30) riskScore += 0.4;
    else if (daysSinceLastActivity > 14) riskScore += 0.2;
    
    // Activity decline risk
    const recentActivity = activityData.filter(a => 
      (Date.now() - a.createdAt.getTime()) < (7 * 24 * 60 * 60 * 1000)
    ).length;
    const olderActivity = activityData.filter(a => {
      const days = (Date.now() - a.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return days >= 7 && days < 14;
    }).length;
    
    if (olderActivity > 0 && recentActivity < olderActivity * 0.5) {
      riskScore += 0.3; // 50% activity decline
    }
    
    // Purchase behavior risk
    const purchases = await this.getUserPurchases(userId);
    if (purchases.length > 0) {
      const daysSinceLastPurchase = (Date.now() - Math.max(...purchases.map(p => p.createdAt.getTime()))) / (1000 * 60 * 60 * 24);
      if (daysSinceLastPurchase > 60) riskScore += 0.3;
    }
    
    return Math.min(1, riskScore);
  }

  /**
   * Update user segments based on current profiles
   */
  private async updateUserSegments(): Promise<void> {
    this.logger.debug('Updating user segments');
    
    const segments: UserSegment[] = [
      {
        segmentId: 'high-value-customers',
        name: 'High Value Customers',
        description: 'Customers with high lifetime value and low churn risk',
        criteria: { lifetimeValue: { gt: 1000 }, churnRisk: { lt: 0.3 } },
        userCount: 0,
        characteristics: ['High spending', 'Loyal', 'Regular purchases'],
        recommendationStrategies: ['Premium products', 'Exclusive offers', 'VIP treatment'],
      },
      {
        segmentId: 'at-risk-customers',
        name: 'At Risk Customers',
        description: 'Previously active customers showing signs of churn',
        criteria: { churnRisk: { gt: 0.7 }, lifetimeValue: { gt: 100 } },
        userCount: 0,
        characteristics: ['Declining activity', 'High churn risk', 'Previous value'],
        recommendationStrategies: ['Win-back campaigns', 'Special discounts', 'Re-engagement'],
      },
      {
        segmentId: 'new-prospects',
        name: 'New Prospects',
        description: 'New users with high engagement but no purchases yet',
        criteria: { purchaseFrequency: { eq: 0 }, engagementScore: { gt: 0.5 } },
        userCount: 0,
        characteristics: ['High engagement', 'No purchases', 'Active browsing'],
        recommendationStrategies: ['First-time buyer incentives', 'Popular products', 'Trust building'],
      },
      {
        segmentId: 'price-sensitive',
        name: 'Price Sensitive Shoppers',
        description: 'Users who respond well to discounts and deals',
        criteria: { behavioralSegment: 'price_sensitive' },
        userCount: 0,
        characteristics: ['Deal hunters', 'Price conscious', 'Discount responsive'],
        recommendationStrategies: ['Sale items', 'Bulk discounts', 'Limited time offers'],
      },
    ];
    
    // Count users in each segment
    for (const segment of segments) {
      segment.userCount = this.countUsersInSegment(segment.criteria);
      this.segmentCache.set(segment.segmentId, segment);
    }
  }

  // =====================================
  // HELPER METHODS
  // =====================================

  private async getActiveUsersForProfiling(): Promise<{ id: string }[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    return this.prismaService.user.findMany({
      where: {
        activities: {
          some: {
            createdAt: { gte: thirtyDaysAgo },
          },
        },
      },
      select: { id: true },
      take: 1000, // Limit for performance
    });
  }

  private async getUserActivityData(userId: string): Promise<any[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    return this.prismaService.userActivity.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limit recent activities
    });
  }

  private async getUserPurchases(userId: string): Promise<any[]> {
    return this.prismaService.order.findMany({
      where: { 
        userId,
        status: 'DELIVERED',
      },
      orderBy: { placedAt: 'desc' },
      select: {
        id: true,
        total: true,
        placedAt: true,
      },
    });
  }

  private async getProductDetails(productId: string): Promise<any> {
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

  private getActivityWeight(activityType: UserActivityType): number {
    const weights = {
      [UserActivityType.PRODUCT_VIEW]: 1,
      [UserActivityType.ADD_TO_CART]: 3,
      [UserActivityType.ADD_TO_WISHLIST]: 2,
      [UserActivityType.CHECKOUT_COMPLETE]: 5,
      [UserActivityType.SEARCH]: 0.5,
      [UserActivityType.CATEGORY_VIEW]: 0.3,
    };
    
    return weights[activityType] || 0.1;
  }

  private getPriceRange(price: number): string {
    if (price < 50) return 'budget';
    if (price < 200) return 'mid-range';
    if (price < 500) return 'premium';
    return 'luxury';
  }

  private getTimeSlot(hour: number): string {
    if (hour < 6) return 'late-night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  private normalizeVector(vector: Record<string, number>): void {
    const total = Object.values(vector).reduce((sum, val) => sum + val, 0);
    if (total > 0) {
      Object.keys(vector).forEach(key => {
        vector[key] = vector[key] / total;
      });
    }
  }

  private calculateRecencyScore(activityData: any[]): number {
    const lastActivity = Math.max(...activityData.map(a => new Date(a.createdAt || a.timestamp).getTime()));
    const daysSince = (Date.now() - lastActivity) / (1000 * 60 * 60 * 24);
    
    // Score decreases with time
    return Math.max(0, 1 - (daysSince / 30));
  }

  private calculateAverageSessionDuration(activityData: any[]): number {
    // Group activities by session (simplified)
    const sessions = new Map<string, any[]>();
    
    activityData.forEach(activity => {
      const timestamp = new Date(activity.createdAt || activity.timestamp);
      const sessionKey = activity.sessionId || `${activity.userId}_${timestamp.toDateString()}`;
      if (!sessions.has(sessionKey)) {
        sessions.set(sessionKey, []);
      }
      sessions.get(sessionKey)!.push(activity);
    });
    
    let totalDuration = 0;
    let sessionCount = 0;
    
    sessions.forEach(sessionActivities => {
      if (sessionActivities.length > 1) {
        const start = Math.min(...sessionActivities.map(a => new Date(a.createdAt || a.timestamp).getTime()));
        const end = Math.max(...sessionActivities.map(a => new Date(a.createdAt || a.timestamp).getTime()));
        totalDuration += (end - start) / 1000; // in seconds
        sessionCount++;
      }
    });
    
    return sessionCount > 0 ? totalDuration / sessionCount : 0;
  }

  private isRepeatCustomer(purchases: any[]): boolean {
    if (purchases.length < 2) return false;
    
    const sortedPurchases = purchases.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const daysBetween = (Date.now() - sortedPurchases[0].createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysBetween > 30 && purchases.length >= 2; // At least 2 purchases over 30 days
  }

  private isPriceSensitive(purchases: any[], activityData: any[]): boolean {
    // Look for patterns indicating price sensitivity
    const couponUsage = activityData.filter(a => a.entityType === 'coupon').length;
    const dealViews = activityData.filter(a => a.entityType === 'deal').length;
    
    return couponUsage > 0 || dealViews > purchases.length;
  }

  private async analyzeBehavioralPatterns(userId: string, activityData: any[]): Promise<BehavioralPattern[]> {
    const patterns: BehavioralPattern[] = [];
    
    // Weekend shopping pattern
    const weekendActivities = activityData.filter(a => [0, 6].includes(a.createdAt.getDay()));
    if (weekendActivities.length > activityData.length * 0.6) {
      patterns.push({
        userId,
        pattern: 'weekend_shopper',
        strength: weekendActivities.length / activityData.length,
        evidence: ['High weekend activity ratio'],
      });
    }
    
    // Mobile-first pattern
    const mobileActivities = activityData.filter(a => a.deviceType === 'mobile');
    if (mobileActivities.length > activityData.length * 0.7) {
      patterns.push({
        userId,
        pattern: 'mobile_first',
        strength: mobileActivities.length / activityData.length,
        evidence: ['Primarily uses mobile device'],
      });
    }
    
    return patterns;
  }

  private async calculatePurchaseMetrics(userId: string): Promise<{ frequency: number; avgOrderValue: number }> {
    const purchases = await this.getUserPurchases(userId);
    
    if (purchases.length === 0) {
      return { frequency: 0, avgOrderValue: 0 };
    }
    
    const totalSpent = purchases.reduce((sum, p) => sum + Number(p.total), 0);
    const avgOrderValue = totalSpent / purchases.length;
    
    const daysSinceFirst = Math.max(1, (Date.now() - purchases[0].createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const frequency = purchases.length / (daysSinceFirst / 30); // per month
    
    return { frequency, avgOrderValue };
  }

  private async analyzeSessionMetrics(userId: string, activityData: any[]): Promise<UserProfile['sessionMetrics']> {
    const averageSessionDuration = this.calculateAverageSessionDuration(activityData);
    
    // Calculate pages per session (simplified)
    const sessions = new Map<string, number>();
    activityData.forEach(activity => {
      const sessionKey = activity.sessionId || `${activity.userId}_${activity.createdAt.toDateString()}`;
      sessions.set(sessionKey, (sessions.get(sessionKey) || 0) + 1);
    });
    
    const pagesPerSession = sessions.size > 0 
      ? Array.from(sessions.values()).reduce((sum, count) => sum + count, 0) / sessions.size
      : 0;
    
    // Calculate bounce rate (sessions with only 1 page view)
    const singlePageSessions = Array.from(sessions.values()).filter(count => count === 1).length;
    const bounceRate = sessions.size > 0 ? singlePageSessions / sessions.size : 0;
    
    return {
      averageSessionDuration,
      pagesPerSession,
      bounceRate,
    };
  }

  private async generateNextBestActions(
    userId: string,
    segment: UserProfile['behavioralSegment'],
    churnRisk: number,
  ): Promise<string[]> {
    const actions: string[] = [];
    
    if (churnRisk > 0.7) {
      actions.push('send_winback_email', 'offer_discount', 'recommend_popular_products');
    } else if (segment === 'browser') {
      actions.push('send_first_purchase_incentive', 'show_social_proof', 'recommend_trending');
    } else if (segment === 'loyal_customer') {
      actions.push('offer_exclusive_preview', 'recommend_premium_products', 'invite_to_vip_program');
    } else if (segment === 'price_sensitive') {
      actions.push('send_sale_notifications', 'recommend_deal_products', 'offer_bulk_discount');
    }
    
    return actions;
  }

  private async generateRecommendationStrategies(): Promise<void> {
    this.logger.debug('Generating recommendation strategies');
    // Implementation for recommendation strategy generation
  }

  private countUsersInSegment(criteria: any): number {
    // Count users matching segment criteria from cached profiles
    let count = 0;
    this.profileCache.forEach(profile => {
      if (this.matchesCriteria(profile, criteria)) {
        count++;
      }
    });
    return count;
  }

  private matchesCriteria(profile: UserProfile, criteria: any): boolean {
    // Simple criteria matching logic
    for (const [field, condition] of Object.entries(criteria)) {
      const value = (profile as any)[field];
      if (typeof condition === 'object') {
        for (const [operator, threshold] of Object.entries(condition as any)) {
          switch (operator) {
            case 'gt':
              if (!(value > Number(threshold))) return false;
              break;
            case 'lt':
              if (!(value < Number(threshold))) return false;
              break;
            case 'eq':
              if (!(value === threshold)) return false;
              break;
          }
        }
      } else {
        if (value !== condition) return false;
      }
    }
    return true;
  }

  // =====================================
  // PUBLIC API METHODS
  // =====================================

  /**
   * Get user profile with all behavioral insights
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    let profile = this.profileCache.get(userId);
    
    if (!profile) {
      // Generate profile if not cached
      profile = await this.updateUserProfile(userId);
    }
    
    return profile;
  }

  /**
   * Get all available user segments
   */
  async getUserSegments(): Promise<UserSegment[]> {
    return Array.from(this.segmentCache.values());
  }

  /**
   * Get users in a specific segment
   */
  async getUsersInSegment(segmentId: string): Promise<UserProfile[]> {
    const segment = this.segmentCache.get(segmentId);
    if (!segment) return [];
    
    const users: UserProfile[] = [];
    this.profileCache.forEach(profile => {
      if (this.matchesCriteria(profile, segment.criteria)) {
        users.push(profile);
      }
    });
    
    return users;
  }

  /**
   * Force profile recalculation for user
   */
  async refreshUserProfile(userId: string): Promise<UserProfile> {
    this.profileCache.delete(userId);
    return this.updateUserProfile(userId);
  }

  /**
   * Get profiling analytics
   */
  async getProfilingAnalytics(): Promise<any> {
    const segmentDistribution: Record<string, number> = {};
    const churnRiskDistribution = { low: 0, medium: 0, high: 0 };
    
    this.profileCache.forEach(profile => {
      segmentDistribution[profile.behavioralSegment] = 
        (segmentDistribution[profile.behavioralSegment] || 0) + 1;
      
      if (profile.churnRisk < 0.3) churnRiskDistribution.low++;
      else if (profile.churnRisk < 0.7) churnRiskDistribution.medium++;
      else churnRiskDistribution.high++;
    });
    
    return {
      totalProfiles: this.profileCache.size,
      segmentDistribution,
      churnRiskDistribution,
      averageEngagement: Array.from(this.profileCache.values())
        .reduce((sum, p) => sum + p.engagementScore, 0) / this.profileCache.size,
      lastUpdate: new Date(),
    };
  }
} 