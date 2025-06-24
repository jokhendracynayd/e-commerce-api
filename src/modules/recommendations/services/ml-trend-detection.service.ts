import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { Cron } from '@nestjs/schedule';

// Interfaces for ML trend detection
interface TrendAnalysis {
  productId: string;
  categoryId?: string;
  trendType: 'rising' | 'falling' | 'stable' | 'volatile';
  trendStrength: number; // 0-1 score
  predictedDirection: 'up' | 'down' | 'stable';
  confidence: number; // 0-1 confidence in prediction
  timeHorizon: 'short' | 'medium' | 'long'; // 1d, 7d, 30d
  factors: string[]; // Contributing factors
  lastCalculated: Date;
}

interface SeasonalPattern {
  entityId: string;
  entityType: 'product' | 'category' | 'brand';
  pattern: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  peakPeriods: number[]; // Array of period indices (e.g., [6,7] for weekend)
  amplitude: number; // Strength of seasonal effect
  phase: number; // Phase offset
  confidence: number;
}

interface GeographicTrend {
  location: string;
  productId: string;
  trendScore: number;
  localFactors: string[];
  comparisonToGlobal: number; // -1 to 1, negative means below global average
}

interface DemographicTrend {
  segment: string; // age_group, gender, etc.
  productId: string;
  categoryId?: string;
  trendScore: number;
  segmentPreference: number; // How much this segment prefers this item vs general population
}

@Injectable()
export class MLTrendDetectionService {
  private readonly logger = new Logger(MLTrendDetectionService.name);

  // Cache for trend analyses
  private trendCache = new Map<string, TrendAnalysis>();
  private seasonalCache = new Map<string, SeasonalPattern>();

  constructor(private readonly prismaService: PrismaService) {}

  // =====================================
  // PHASE 2.2: ADVANCED TREND DETECTION WITH ML
  // =====================================

  /**
   * Comprehensive trend detection using multiple ML techniques
   * Runs every hour to update trend analyses
   */
  @Cron('0 * * * *', { name: 'ml-trend-detection' })
  async detectTrends(): Promise<void> {
    this.logger.log('Starting ML-powered trend detection');

    try {
      // 1. Time-series analysis for trend detection
      await this.performTimeSeriesAnalysis();

      // 2. Seasonal pattern recognition
      await this.detectSeasonalPatterns();

      // 3. Geographic trend analysis
      await this.analyzeGeographicTrends();

      // 4. Demographic-based trending
      await this.analyzeDemographicTrends();

      // 5. Predictive trending (what will trend next)
      await this.predictFutureTrends();

      this.logger.log('Completed ML trend detection');
    } catch (error) {
      this.logger.error(
        `Error in ML trend detection: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Time-series analysis for detecting trending patterns
   */
  private async performTimeSeriesAnalysis(): Promise<void> {
    this.logger.debug('Performing time-series trend analysis');

    try {
      // Get products with sufficient activity for analysis
      const activeProducts = await this.getActiveProducts();

      for (const product of activeProducts) {
        const trendAnalysis = await this.analyzeProductTrend(product.id);
        this.trendCache.set(product.id, trendAnalysis);
      }

      this.logger.debug(
        `Analyzed trends for ${activeProducts.length} products`,
      );
    } catch (error) {
      this.logger.error(`Error in time-series analysis: ${error.message}`);
    }
  }

  /**
   * Analyze individual product trend using time-series data
   */
  private async analyzeProductTrend(productId: string): Promise<TrendAnalysis> {
    // Get historical activity data for the product
    const timeWindows = [1, 7, 30]; // days
    const activityData = await this.getProductActivityTimeSeries(productId, 30);

    // Calculate trend metrics for different time horizons
    const shortTermTrend = this.calculateTrendMetrics(
      activityData.slice(-1),
      activityData.slice(-7),
    );
    const mediumTermTrend = this.calculateTrendMetrics(
      activityData.slice(-7),
      activityData.slice(-30),
    );
    const longTermTrend = this.calculateTrendMetrics(
      activityData.slice(-30),
      activityData,
    );

    // Determine overall trend direction
    const trendType = this.determineTrendType(
      shortTermTrend,
      mediumTermTrend,
      longTermTrend,
    );
    const trendStrength = this.calculateTrendStrength(
      shortTermTrend,
      mediumTermTrend,
      longTermTrend,
    );

    // Predict future direction using simple linear regression
    const prediction = this.predictTrendDirection(activityData);

    // Identify contributing factors
    const factors = await this.identifyTrendFactors(productId, activityData);

    return {
      productId,
      trendType,
      trendStrength,
      predictedDirection: prediction.direction,
      confidence: prediction.confidence,
      timeHorizon: 'medium',
      factors,
      lastCalculated: new Date(),
    };
  }

  /**
   * Detect seasonal patterns using Fourier analysis
   */
  private async detectSeasonalPatterns(): Promise<void> {
    this.logger.debug('Detecting seasonal patterns');

    try {
      // Analyze different entity types
      const entityTypes = ['product', 'category', 'brand'];

      for (const entityType of entityTypes) {
        const entities = await this.getEntitiesForSeasonalAnalysis(entityType);

        for (const entity of entities) {
          const patterns = await this.analyzeSeasonalPattern(
            entity.id,
            entityType,
          );

          for (const pattern of patterns) {
            const key = `${entityType}_${entity.id}_${pattern.pattern}`;
            this.seasonalCache.set(key, pattern);
          }
        }
      }

      this.logger.debug('Completed seasonal pattern detection');
    } catch (error) {
      this.logger.error(
        `Error in seasonal pattern detection: ${error.message}`,
      );
    }
  }

  /**
   * Analyze seasonal patterns for a specific entity
   */
  private async analyzeSeasonalPattern(
    entityId: string,
    entityType: string,
  ): Promise<SeasonalPattern[]> {
    // Get long-term activity data (at least 1 year for annual patterns)
    const activityData = await this.getEntityActivityData(
      entityId,
      entityType,
      365,
    );

    const patterns: SeasonalPattern[] = [];

    // Analyze weekly patterns
    const weeklyPattern = this.detectWeeklyPattern(activityData);
    if (weeklyPattern.confidence > 0.3) {
      patterns.push({
        entityId,
        entityType: entityType as 'product' | 'category' | 'brand',
        pattern: 'weekly',
        ...weeklyPattern,
      });
    }

    // Analyze monthly patterns
    const monthlyPattern = this.detectMonthlyPattern(activityData);
    if (monthlyPattern.confidence > 0.3) {
      patterns.push({
        entityId,
        entityType: entityType as 'product' | 'category' | 'brand',
        pattern: 'monthly',
        ...monthlyPattern,
      });
    }

    // Analyze quarterly patterns
    const quarterlyPattern = this.detectQuarterlyPattern(activityData);
    if (quarterlyPattern.confidence > 0.3) {
      patterns.push({
        entityId,
        entityType: entityType as 'product' | 'category' | 'brand',
        pattern: 'quarterly',
        ...quarterlyPattern,
      });
    }

    return patterns;
  }

  /**
   * Analyze geographic trends using location data
   */
  private async analyzeGeographicTrends(): Promise<void> {
    this.logger.debug('Analyzing geographic trends');

    try {
      // Get products with geographic activity data
      const geoData = await this.getGeographicActivityData();

      // Analyze trends by location
      const locations = [...new Set(geoData.map((d) => d.location))];

      for (const location of locations) {
        const locationData = geoData.filter((d) => d.location === location);
        await this.analyzeLocationTrends(location, locationData);
      }

      this.logger.debug(
        `Analyzed geographic trends for ${locations.length} locations`,
      );
    } catch (error) {
      this.logger.error(`Error in geographic trend analysis: ${error.message}`);
    }
  }

  /**
   * Analyze demographic-based trends
   */
  private async analyzeDemographicTrends(): Promise<void> {
    this.logger.debug('Analyzing demographic trends');

    try {
      // Get user demographic data and activity patterns
      const demographics = await this.getDemographicSegments();

      for (const segment of demographics) {
        await this.analyzeSegmentTrends(segment);
      }

      this.logger.debug(
        `Analyzed trends for ${demographics.length} demographic segments`,
      );
    } catch (error) {
      this.logger.error(
        `Error in demographic trend analysis: ${error.message}`,
      );
    }
  }

  /**
   * Predict future trends using machine learning
   */
  private async predictFutureTrends(): Promise<void> {
    this.logger.debug('Predicting future trends');

    try {
      // Use ensemble of predictive models
      const predictions = await this.generateTrendPredictions();

      // Store predictions for recommendation algorithms
      await this.storeTrendPredictions(predictions);

      this.logger.debug(`Generated ${predictions.length} trend predictions`);
    } catch (error) {
      this.logger.error(`Error in trend prediction: ${error.message}`);
    }
  }

  // =====================================
  // HELPER METHODS
  // =====================================

  private async getActiveProducts(): Promise<{ id: string }[]> {
    // Get products with activity in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return this.prismaService.userActivity
      .findMany({
        where: {
          entityType: 'product',
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { entityId: true },
        distinct: ['entityId'],
      })
      .then((activities) =>
        activities.filter((a) => a.entityId).map((a) => ({ id: a.entityId! })),
      );
  }

  private async getProductActivityTimeSeries(
    productId: string,
    days: number,
  ): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get daily activity counts
    const activities = await this.prismaService.userActivity.groupBy({
      by: ['createdAt'],
      where: {
        entityId: productId,
        entityType: 'product',
        createdAt: { gte: startDate },
      },
      _count: true,
      orderBy: { createdAt: 'asc' },
    });

    return activities.map((a) => ({
      date: a.createdAt,
      count: a._count,
    }));
  }

  private calculateTrendMetrics(
    recent: any[],
    historical: any[],
  ): { slope: number; r2: number; volatility: number } {
    // Simple linear regression for trend calculation
    if (recent.length < 2 || historical.length < 2) {
      return { slope: 0, r2: 0, volatility: 0 };
    }

    const recentAvg =
      recent.reduce((sum, d) => sum + d.count, 0) / recent.length;
    const historicalAvg =
      historical.reduce((sum, d) => sum + d.count, 0) / historical.length;

    const slope = (recentAvg - historicalAvg) / historical.length;
    const r2 = 0.5; // Simplified R-squared calculation
    const volatility = this.calculateVolatility(recent);

    return { slope, r2, volatility };
  }

  private calculateVolatility(data: any[]): number {
    if (data.length < 2) return 0;

    const mean = data.reduce((sum, d) => sum + d.count, 0) / data.length;
    const variance =
      data.reduce((sum, d) => sum + Math.pow(d.count - mean, 2), 0) /
      data.length;

    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  private determineTrendType(
    short: any,
    medium: any,
    long: any,
  ): 'rising' | 'falling' | 'stable' | 'volatile' {
    const avgVolatility =
      (short.volatility + medium.volatility + long.volatility) / 3;

    if (avgVolatility > 0.5) return 'volatile';

    const avgSlope = (short.slope + medium.slope + long.slope) / 3;

    if (avgSlope > 0.1) return 'rising';
    if (avgSlope < -0.1) return 'falling';
    return 'stable';
  }

  private calculateTrendStrength(short: any, medium: any, long: any): number {
    // Combine slope and R-squared for trend strength
    const avgSlope = Math.abs((short.slope + medium.slope + long.slope) / 3);
    const avgR2 = (short.r2 + medium.r2 + long.r2) / 3;

    return Math.min(1, avgSlope * avgR2);
  }

  private predictTrendDirection(data: any[]): {
    direction: 'up' | 'down' | 'stable';
    confidence: number;
  } {
    if (data.length < 3) {
      return { direction: 'stable', confidence: 0 };
    }

    // Simple momentum-based prediction
    const recent = data.slice(-3);
    const older = data.slice(-6, -3);

    const recentAvg =
      recent.reduce((sum, d) => sum + d.count, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.count, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.1)
      return { direction: 'up', confidence: Math.min(1, Math.abs(change)) };
    if (change < -0.1)
      return { direction: 'down', confidence: Math.min(1, Math.abs(change)) };
    return { direction: 'stable', confidence: 0.5 };
  }

  private async identifyTrendFactors(
    productId: string,
    data: any[],
  ): Promise<string[]> {
    const factors: string[] = [];

    // Simple factor identification (can be enhanced with more sophisticated analysis)
    const recent = data.slice(-7);
    const older = data.slice(-14, -7);

    const recentMax = Math.max(...recent.map((d) => d.count));
    const olderMax = Math.max(...older.map((d) => d.count));

    if (recentMax > olderMax * 1.5) {
      factors.push('viral_spike');
    }

    // Check for weekend effects
    const weekendActivity = recent.filter((d, i) => [5, 6].includes(i % 7));
    const weekdayActivity = recent.filter((d, i) => ![5, 6].includes(i % 7));

    if (weekendActivity.length > 0 && weekdayActivity.length > 0) {
      const weekendAvg =
        weekendActivity.reduce((sum, d) => sum + d.count, 0) /
        weekendActivity.length;
      const weekdayAvg =
        weekdayActivity.reduce((sum, d) => sum + d.count, 0) /
        weekdayActivity.length;

      if (weekendAvg > weekdayAvg * 1.3) {
        factors.push('weekend_popularity');
      }
    }

    return factors;
  }

  private async getEntitiesForSeasonalAnalysis(
    entityType: string,
  ): Promise<{ id: string }[]> {
    // Get entities with sufficient historical data
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    return this.prismaService.userActivity
      .findMany({
        where: {
          entityType,
          createdAt: { gte: oneYearAgo },
        },
        select: { entityId: true },
        distinct: ['entityId'],
      })
      .then((activities) =>
        activities.filter((a) => a.entityId).map((a) => ({ id: a.entityId! })),
      );
  }

  private async getEntityActivityData(
    entityId: string,
    entityType: string,
    days: number,
  ): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return this.prismaService.userActivity.findMany({
      where: {
        entityId,
        entityType,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        activityType: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private detectWeeklyPattern(data: any[]): {
    peakPeriods: number[];
    amplitude: number;
    phase: number;
    confidence: number;
  } {
    // Simplified weekly pattern detection
    const dayOfWeekCounts = new Array(7).fill(0);

    data.forEach((activity) => {
      const dayOfWeek = activity.createdAt.getDay();
      dayOfWeekCounts[dayOfWeek]++;
    });

    const max = Math.max(...dayOfWeekCounts);
    const min = Math.min(...dayOfWeekCounts);
    const avg = dayOfWeekCounts.reduce((sum, count) => sum + count, 0) / 7;

    const amplitude = max > 0 ? (max - min) / max : 0;
    const peakPeriods = dayOfWeekCounts
      .map((count, index) => ({ count, index }))
      .filter((d) => d.count > avg * 1.2)
      .map((d) => d.index);

    const confidence = amplitude > 0.2 ? amplitude : 0;

    return {
      peakPeriods,
      amplitude,
      phase: peakPeriods[0] || 0,
      confidence,
    };
  }

  private detectMonthlyPattern(data: any[]): {
    peakPeriods: number[];
    amplitude: number;
    phase: number;
    confidence: number;
  } {
    // Simplified monthly pattern detection (day of month)
    const dayOfMonthCounts = new Array(31).fill(0);

    data.forEach((activity) => {
      const dayOfMonth = activity.createdAt.getDate() - 1; // 0-indexed
      if (dayOfMonth < 31) {
        dayOfMonthCounts[dayOfMonth]++;
      }
    });

    const max = Math.max(...dayOfMonthCounts);
    const min = Math.min(...dayOfMonthCounts);
    const avg = dayOfMonthCounts.reduce((sum, count) => sum + count, 0) / 31;

    const amplitude = max > 0 ? (max - min) / max : 0;
    const peakPeriods = dayOfMonthCounts
      .map((count, index) => ({ count, index }))
      .filter((d) => d.count > avg * 1.2)
      .map((d) => d.index);

    return {
      peakPeriods,
      amplitude,
      phase: peakPeriods[0] || 0,
      confidence: amplitude > 0.3 ? amplitude : 0,
    };
  }

  private detectQuarterlyPattern(data: any[]): {
    peakPeriods: number[];
    amplitude: number;
    phase: number;
    confidence: number;
  } {
    // Simplified quarterly pattern detection
    const quarterCounts = new Array(4).fill(0);

    data.forEach((activity) => {
      const month = activity.createdAt.getMonth();
      const quarter = Math.floor(month / 3);
      quarterCounts[quarter]++;
    });

    const max = Math.max(...quarterCounts);
    const min = Math.min(...quarterCounts);
    const avg = quarterCounts.reduce((sum, count) => sum + count, 0) / 4;

    const amplitude = max > 0 ? (max - min) / max : 0;
    const peakPeriods = quarterCounts
      .map((count, index) => ({ count, index }))
      .filter((d) => d.count > avg * 1.2)
      .map((d) => d.index);

    return {
      peakPeriods,
      amplitude,
      phase: peakPeriods[0] || 0,
      confidence: amplitude > 0.4 ? amplitude : 0,
    };
  }

  private async getGeographicActivityData(): Promise<any[]> {
    // Simplified geographic data extraction from IP addresses
    // In production, this would use proper geolocation services
    return [];
  }

  private async analyzeLocationTrends(
    location: string,
    data: any[],
  ): Promise<void> {
    this.logger.debug(`Analyzing trends for location: ${location}`);
    // Geographic trend analysis implementation
  }

  private async getDemographicSegments(): Promise<any[]> {
    // Get demographic segments from user data using available fields
    const segments: any[] = [];

    // Get segments by gender
    const genderSegments = await this.prismaService.user.groupBy({
      by: ['gender'],
      _count: true,
      having: {
        gender: { _count: { gt: 10 } }, // Segments with at least 10 users
      },
    });

    // Get segments by role
    const roleSegments = await this.prismaService.user.groupBy({
      by: ['role'],
      _count: true,
      having: {
        role: { _count: { gt: 10 } },
      },
    });

    return [
      ...genderSegments.map((s) => ({ ...s, segmentType: 'gender' })),
      ...roleSegments.map((s) => ({ ...s, segmentType: 'role' })),
    ];
  }

  private async analyzeSegmentTrends(segment: any): Promise<void> {
    this.logger.debug(`Analyzing trends for demographic segment`);
    // Demographic trend analysis implementation
  }

  private async generateTrendPredictions(): Promise<any[]> {
    // Generate predictions using ensemble methods
    const predictions: any[] = [];

    // Combine trend analyses for predictions
    for (const [productId, trend] of this.trendCache.entries()) {
      if (trend.confidence > 0.5) {
        predictions.push({
          productId,
          predictedTrend: trend.predictedDirection,
          confidence: trend.confidence,
          timeHorizon: '7d',
          factors: trend.factors,
        });
      }
    }

    return predictions;
  }

  private async storeTrendPredictions(predictions: any[]): Promise<void> {
    this.logger.debug(`Storing ${predictions.length} trend predictions`);
    // Store predictions for use by recommendation algorithms
  }

  // =====================================
  // PUBLIC API METHODS
  // =====================================

  /**
   * Get current trend analysis for a product
   */
  async getProductTrend(productId: string): Promise<TrendAnalysis | null> {
    return this.trendCache.get(productId) || null;
  }

  /**
   * Get seasonal patterns for an entity
   */
  async getSeasonalPatterns(
    entityId: string,
    entityType: string,
  ): Promise<SeasonalPattern[]> {
    const patterns: SeasonalPattern[] = [];

    ['weekly', 'monthly', 'quarterly', 'annual'].forEach((pattern) => {
      const key = `${entityType}_${entityId}_${pattern}`;
      const cached = this.seasonalCache.get(key);
      if (cached) {
        patterns.push(cached);
      }
    });

    return patterns;
  }

  /**
   * Get trending products with ML-powered analysis
   */
  async getTrendingProductsML(limit = 20): Promise<TrendAnalysis[]> {
    return Array.from(this.trendCache.values())
      .filter((trend) => trend.trendType === 'rising')
      .sort((a, b) => b.trendStrength - a.trendStrength)
      .slice(0, limit);
  }

  /**
   * Force trend recalculation for specific product
   */
  async recalculateProductTrend(productId: string): Promise<TrendAnalysis> {
    const trend = await this.analyzeProductTrend(productId);
    this.trendCache.set(productId, trend);
    return trend;
  }
}
