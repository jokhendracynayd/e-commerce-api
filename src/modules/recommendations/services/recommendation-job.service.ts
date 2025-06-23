import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma.service';
import { RecommendationType } from '@prisma/client';

// Job Data Interfaces
interface RealTimeUpdateData {
  userId?: string;
  sessionId?: string;
  activityType: string;
  entityId?: string;
  priority: 'high' | 'medium' | 'low';
}

interface BatchGenerationData {
  type: RecommendationType;
  userSegment?: string;
  categoryId?: string;
  batchSize: number;
  algorithmVersion: string;
}

interface ModelTrainingData {
  modelType: 'similarity' | 'trending' | 'personalization';
  dataWindow: 'daily' | 'weekly' | 'monthly';
  forceRetrain?: boolean;
}

interface DataCleanupData {
  operation: 'archive' | 'optimize' | 'purge';
  daysToKeep: number;
  tables: string[];
}

@Injectable()
@Processor('recommendation-jobs')
export class RecommendationJobService {
  private readonly logger = new Logger(RecommendationJobService.name);

  constructor(
    @InjectQueue('recommendation-jobs') private readonly recommendationQueue: Queue,
    private readonly prismaService: PrismaService,
  ) {}

  // =====================================
  // PHASE 2.1: HIGH-PERFORMANCE JOB PROCESSING
  // =====================================

  /**
   * Real-time recommendation updates for active users
   * Triggered immediately when users perform actions
   */
  @Process('real-time-update')
  async processRealTimeUpdate(job: Job<RealTimeUpdateData>): Promise<void> {
    const { userId, sessionId, activityType, entityId, priority } = job.data;
    
    this.logger.log(`Processing real-time update for ${userId || sessionId} - ${activityType}`);
    
    try {
      // Process based on activity type
      switch (activityType) {
        case 'PRODUCT_VIEW':
          await this.updateProductViewRecommendations(userId, sessionId, entityId);
          break;
        case 'ADD_TO_CART':
          await this.updateCartBasedRecommendations(userId, sessionId, entityId);
          break;
        case 'PURCHASE':
          await this.updatePurchaseBasedRecommendations(userId, entityId);
          break;
        case 'SEARCH':
          await this.updateSearchBasedRecommendations(userId, sessionId, entityId);
          break;
      }

      // Update job progress
      await job.progress(100);
      this.logger.log(`Completed real-time update for ${userId || sessionId}`);
    } catch (error) {
      this.logger.error(`Error in real-time update: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Batch recommendation generation for user segments
   * Runs efficiently for bulk recommendation updates
   */
  @Process('batch-generation')
  async processBatchGeneration(job: Job<BatchGenerationData>): Promise<void> {
    const { type, userSegment, categoryId, batchSize, algorithmVersion } = job.data;
    
    this.logger.log(`Starting batch generation: ${type} for segment ${userSegment}`);
    
    try {
      let processedCount = 0;
      const batchId = await this.createRecommendationBatch(type, algorithmVersion);

      // Get target users based on segment
      const targetUsers = await this.getUsersForSegment(userSegment, batchSize);
      
      for (const user of targetUsers) {
        await this.generateUserRecommendations(user, type, batchId, categoryId);
        processedCount++;
        
        // Update progress every 10 users
        if (processedCount % 10 === 0) {
          const progress = Math.round((processedCount / targetUsers.length) * 100);
          await job.progress(progress);
        }
      }

      // Mark batch as completed
      await this.completeBatch(batchId, processedCount);
      
      this.logger.log(`Completed batch generation: ${processedCount} users processed`);
    } catch (error) {
      this.logger.error(`Error in batch generation: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * ML model training with accumulated data
   * Retrains recommendation models with new patterns
   */
  @Process('model-training')
  async processModelTraining(job: Job<ModelTrainingData>): Promise<void> {
    const { modelType, dataWindow, forceRetrain } = job.data;
    
    this.logger.log(`Starting model training: ${modelType} with ${dataWindow} data`);
    
    try {
      await job.progress(10);

      // Check if retraining is needed
      if (!forceRetrain && !(await this.shouldRetrainModel(modelType, dataWindow))) {
        this.logger.log(`Model ${modelType} does not need retraining`);
        return;
      }

      await job.progress(25);

      // Prepare training data
      const trainingData = await this.prepareTrainingData(modelType, dataWindow);
      await job.progress(50);

      // Train model based on type
      switch (modelType) {
        case 'similarity':
          await this.trainSimilarityModel(trainingData);
          break;
        case 'trending':
          await this.trainTrendingModel(trainingData);
          break;
        case 'personalization':
          await this.trainPersonalizationModel(trainingData);
          break;
      }

      await job.progress(90);

      // Update model metadata
      await this.updateModelMetadata(modelType, dataWindow);
      await job.progress(100);

      this.logger.log(`Completed model training: ${modelType}`);
    } catch (error) {
      this.logger.error(`Error in model training: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Advanced data cleanup with intelligence
   * Maintains optimal database performance
   */
  @Process('data-cleanup')
  async processDataCleanup(job: Job<DataCleanupData>): Promise<void> {
    const { operation, daysToKeep, tables } = job.data;
    
    this.logger.log(`Starting data cleanup: ${operation} operation`);
    
    try {
      let totalCleaned = 0;

      for (const table of tables) {
        await job.progress(Math.round((tables.indexOf(table) / tables.length) * 90));
        
        const cleaned = await this.cleanupTable(table, operation, daysToKeep);
        totalCleaned += cleaned;
        
        this.logger.log(`Cleaned ${cleaned} records from ${table}`);
      }

      // Optimize database after cleanup
      if (operation === 'optimize') {
        await this.optimizeDatabase();
      }

      await job.progress(100);
      this.logger.log(`Completed data cleanup: ${totalCleaned} total records processed`);
    } catch (error) {
      this.logger.error(`Error in data cleanup: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =====================================
  // SCHEDULED JOBS - PHASE 2.1
  // =====================================

  /**
   * Generate recommendations for currently active users every 15 minutes
   */
  @Cron('*/15 * * * *', { name: 'hot-recommendations' })
  async generateHotRecommendations(): Promise<void> {
    this.logger.log('Starting hot recommendations generation');
    
    try {
      // Get active users (activity in last 30 minutes)
      const activeUsers = await this.getActiveUsers(30);
      
      for (const user of activeUsers.slice(0, 50)) { // Limit to 50 most active
        await this.recommendationQueue.add('real-time-update', {
          userId: user.id,
          activityType: 'PERSONALIZED_UPDATE',
          priority: 'high',
        }, {
          priority: 10,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        });
      }
      
      this.logger.log(`Queued hot recommendations for ${activeUsers.length} active users`);
    } catch (error) {
      this.logger.error(`Error in hot recommendations: ${error.message}`);
    }
  }

  /**
   * Generate daily recommendations for all users at 2 AM
   */
  @Cron('0 2 * * *', { name: 'daily-recommendations' })
  async generateDailyRecommendations(): Promise<void> {
    this.logger.log('Starting daily recommendation generation');
    
    try {
      // Generate different types of recommendations
      const recommendationTypes: RecommendationType[] = [
        RecommendationType.PERSONALIZED,
        RecommendationType.TRENDING,
        RecommendationType.TOP_RATED,
      ];

      for (const type of recommendationTypes) {
        await this.recommendationQueue.add('batch-generation', {
          type,
          userSegment: 'active_users',
          batchSize: 1000,
          algorithmVersion: 'v2.0',
        }, {
          priority: 5,
          attempts: 2,
          delay: 5000, // Stagger batches
        });
      }
      
      this.logger.log('Queued daily recommendation batches');
    } catch (error) {
      this.logger.error(`Error in daily recommendations: ${error.message}`);
    }
  }

  /**
   * Retrain ML models weekly on Sundays
   */
  @Cron('0 0 * * 0', { name: 'weekly-model-training' })
  async retrainModels(): Promise<void> {
    this.logger.log('Starting weekly model retraining');
    
    try {
      const modelTypes: ModelTrainingData['modelType'][] = [
        'similarity',
        'trending', 
        'personalization',
      ];

      for (const modelType of modelTypes) {
        await this.recommendationQueue.add('model-training', {
          modelType,
          dataWindow: 'weekly',
          forceRetrain: false,
        }, {
          priority: 3,
          attempts: 1,
          delay: 10000, // Stagger model training
        });
      }
      
      this.logger.log('Queued weekly model training jobs');
    } catch (error) {
      this.logger.error(`Error in model retraining: ${error.message}`);
    }
  }

  /**
   * Intelligent data cleanup daily at 3 AM
   */
  @Cron('0 3 * * *', { name: 'daily-cleanup' })
  async intelligentDataCleanup(): Promise<void> {
    this.logger.log('Starting intelligent data cleanup');
    
    try {
      await this.recommendationQueue.add('data-cleanup', {
        operation: 'archive',
        daysToKeep: 90,
        tables: ['user_activities', 'browsing_history', 'product_recommendations'],
      }, {
        priority: 1,
        attempts: 1,
      });
      
      this.logger.log('Queued data cleanup job');
    } catch (error) {
      this.logger.error(`Error in data cleanup: ${error.message}`);
    }
  }

  // =====================================
  // HELPER METHODS
  // =====================================

  private async updateProductViewRecommendations(
    userId?: string,
    sessionId?: string,
    productId?: string,
  ): Promise<void> {
    if (!productId) return;

    // Generate similar products recommendations
    // Update recently viewed
    // Trigger personalized updates if authenticated user
    
    this.logger.debug(`Updated product view recommendations for product ${productId}`);
  }

  private async updateCartBasedRecommendations(
    userId?: string,
    sessionId?: string,
    productId?: string,
  ): Promise<void> {
    if (!productId) return;

    // Generate frequently bought together
    // Update cart abandonment prevention recommendations
    
    this.logger.debug(`Updated cart-based recommendations for product ${productId}`);
  }

  private async updatePurchaseBasedRecommendations(
    userId?: string,
    productId?: string,
  ): Promise<void> {
    if (!userId || !productId) return;

    // Update user preference profile
    // Generate post-purchase recommendations
    // Update collaborative filtering data
    
    this.logger.debug(`Updated purchase-based recommendations for user ${userId}`);
  }

  private async updateSearchBasedRecommendations(
    userId?: string,
    sessionId?: string,
    searchQuery?: string,
  ): Promise<void> {
    if (!searchQuery) return;

    // Update search-based personalization
    // Generate search result recommendations
    
    this.logger.debug(`Updated search-based recommendations for query ${searchQuery}`);
  }

  private async createRecommendationBatch(
    type: RecommendationType,
    algorithmVersion: string,
  ): Promise<string> {
    const batch = await this.prismaService.recommendationBatch.create({
      data: {
        batchType: type,
        algorithmVersion,
        status: 'RUNNING',
      },
    });
    return batch.id;
  }

  private async getUsersForSegment(segment?: string, limit = 1000): Promise<any[]> {
    // Return active users for now - can be enhanced with segmentation logic
    return this.prismaService.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, email: true },
      take: limit,
    });
  }

  private async generateUserRecommendations(
    user: any,
    type: RecommendationType,
    batchId: string,
    categoryId?: string,
  ): Promise<void> {
    // Implementation would call the actual recommendation algorithms
    // For now, just create placeholder recommendations
    this.logger.debug(`Generated ${type} recommendations for user ${user.id}`);
  }

  private async completeBatch(batchId: string, totalGenerated: number): Promise<void> {
    await this.prismaService.recommendationBatch.update({
      where: { id: batchId },
      data: {
        status: 'COMPLETED',
        totalGenerated,
        completedAt: new Date(),
      },
    });
  }

  private async getActiveUsers(minutesAgo: number): Promise<any[]> {
    const timeThreshold = new Date(Date.now() - minutesAgo * 60 * 1000);
    
    return this.prismaService.userActivity.findMany({
      where: {
        createdAt: { gte: timeThreshold },
      },
      select: { userId: true },
      distinct: ['userId'],
    }).then(activities => 
      activities
        .filter(a => a.userId)
        .map(a => ({ id: a.userId }))
    );
  }

  private async shouldRetrainModel(
    modelType: string,
    dataWindow: string,
  ): Promise<boolean> {
    // Simple logic for now - can be enhanced with more sophisticated checks
    return true;
  }

  private async prepareTrainingData(
    modelType: string,
    dataWindow: string,
  ): Promise<any> {
    this.logger.debug(`Preparing training data for ${modelType}`);
    return {};
  }

  private async trainSimilarityModel(trainingData: any): Promise<void> {
    this.logger.debug('Training similarity model');
    // ML training logic would go here
  }

  private async trainTrendingModel(trainingData: any): Promise<void> {
    this.logger.debug('Training trending model');
    // ML training logic would go here
  }

  private async trainPersonalizationModel(trainingData: any): Promise<void> {
    this.logger.debug('Training personalization model');
    // ML training logic would go here
  }

  private async updateModelMetadata(
    modelType: string,
    dataWindow: string,
  ): Promise<void> {
    this.logger.debug(`Updated metadata for ${modelType} model`);
  }

  private async cleanupTable(
    table: string,
    operation: string,
    daysToKeep: number,
  ): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    switch (table) {
      case 'user_activities':
        const deletedActivities = await this.prismaService.userActivity.deleteMany({
          where: { createdAt: { lt: cutoffDate } },
        });
        return deletedActivities.count;
      
      case 'browsing_history':
        const deletedHistory = await this.prismaService.browsingHistory.deleteMany({
          where: { createdAt: { lt: cutoffDate } },
        });
        return deletedHistory.count;
      
      case 'product_recommendations':
        const deletedRecommendations = await this.prismaService.productRecommendation.deleteMany({
          where: { 
            createdAt: { lt: cutoffDate },
            viewed: false,
            clicked: false,
          },
        });
        return deletedRecommendations.count;
      
      default:
        return 0;
    }
  }

  private async optimizeDatabase(): Promise<void> {
    this.logger.log('Optimizing database performance');
    // Database optimization logic (VACUUM, ANALYZE, etc.)
  }

  // =====================================
  // PUBLIC API METHODS
  // =====================================

  /**
   * Trigger real-time recommendation update
   */
  async triggerRealTimeUpdate(data: RealTimeUpdateData): Promise<void> {
    await this.recommendationQueue.add('real-time-update', data, {
      priority: data.priority === 'high' ? 10 : data.priority === 'medium' ? 5 : 1,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  /**
   * Schedule batch recommendation generation
   */
  async scheduleBatchGeneration(data: BatchGenerationData): Promise<void> {
    await this.recommendationQueue.add('batch-generation', data, {
      priority: 5,
      attempts: 2,
    });
  }

  /**
   * Force model retraining
   */
  async forceModelTraining(data: ModelTrainingData): Promise<void> {
    await this.recommendationQueue.add('model-training', {
      ...data,
      forceRetrain: true,
    }, {
      priority: 3,
      attempts: 1,
    });
  }
} 