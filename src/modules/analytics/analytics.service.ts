import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateUserActivityDto,
  CreateBatchActivityDto,
  UserActivityResponseDto,
  BrowsingHistoryResponseDto,
} from './dto';
import { AppLogger } from '../../common/services/logger.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('AnalyticsService');
  }

  async trackActivity(
    createActivityDto: CreateUserActivityDto,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserActivityResponseDto> {
    try {
      const activityData: Prisma.UserActivityCreateInput = {
        activityType: createActivityDto.activityType,
        sessionId: createActivityDto.sessionId,
        entityId: createActivityDto.entityId,
        entityType: createActivityDto.entityType,
        metadata: createActivityDto.metadata,
        pageUrl: createActivityDto.pageUrl,
        deviceType: createActivityDto.deviceType,
        duration: createActivityDto.duration,
        referrer: createActivityDto.referrer,
        ipAddress,
        userAgent,
        user: userId ? { connect: { id: userId } } : undefined,
      };

      const activity = await this.prismaService.userActivity.create({
        data: activityData,
      });

      // If this is a product view, update browsing history
      if (
        createActivityDto.activityType === 'PRODUCT_VIEW' &&
        createActivityDto.entityId &&
        createActivityDto.entityType === 'product'
      ) {
        await this.updateBrowsingHistory({
          userId,
          sessionId: createActivityDto.sessionId,
          productId: createActivityDto.entityId,
          source: createActivityDto.metadata?.source as string,
          deviceType: createActivityDto.deviceType,
          timeSpent: createActivityDto.duration,
        });
      }

      this.logger.log(
        `Activity tracked: ${activity.activityType} for ${userId ? `user ${userId}` : `session ${createActivityDto.sessionId}`}`,
      );

      return {
        ...activity,
        userId: activity.userId || undefined,
        entityId: activity.entityId || undefined,
        entityType: activity.entityType || undefined,
        pageUrl: activity.pageUrl || undefined,
        deviceType: activity.deviceType || undefined,
        duration: activity.duration || undefined,
        referrer: activity.referrer || undefined,
        ipAddress: activity.ipAddress || undefined,
        userAgent: activity.userAgent || undefined,
        metadata: activity.metadata
          ? (activity.metadata as Record<string, any>)
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Error tracking activity: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to track activity');
    }
  }

  async trackBatchActivities(
    createBatchDto: CreateBatchActivityDto,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const activitiesData = createBatchDto.activities.map((activity) => ({
        activityType: activity.activityType,
        sessionId: activity.sessionId,
        entityId: activity.entityId,
        entityType: activity.entityType,
        metadata: activity.metadata,
        pageUrl: activity.pageUrl,
        deviceType: activity.deviceType,
        duration: activity.duration,
        referrer: activity.referrer,
        ipAddress,
        userAgent,
        userId,
      }));

      await this.prismaService.userActivity.createMany({
        data: activitiesData,
        skipDuplicates: true,
      });

      // Update browsing history for product views
      const productViews = createBatchDto.activities.filter(
        (activity) =>
          activity.activityType === 'PRODUCT_VIEW' &&
          activity.entityId &&
          activity.entityType === 'product',
      );

      if (productViews.length > 0) {
        for (const view of productViews) {
          await this.updateBrowsingHistory({
            userId,
            sessionId: view.sessionId,
            productId: view.entityId!,
            source: view.metadata?.source as string,
            deviceType: view.deviceType,
            timeSpent: view.duration,
          });
        }
      }

      this.logger.log(
        `Batch activities tracked: ${activitiesData.length} activities for ${userId ? `user ${userId}` : 'anonymous sessions'}`,
      );

      return {
        success: true,
        count: activitiesData.length,
        message: `Successfully tracked ${activitiesData.length} activities`,
      };
    } catch (error) {
      this.logger.error(
        `Error tracking batch activities: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to track batch activities',
      );
    }
  }

  async getBrowsingHistory(
    userId?: string,
    sessionId?: string,
    limit = 10,
    includeProduct = true,
  ): Promise<BrowsingHistoryResponseDto[]> {
    try {
      if (!userId && !sessionId) {
        throw new BadRequestException(
          'Either userId or sessionId must be provided',
        );
      }

      const whereClause: Prisma.BrowsingHistoryWhereInput = userId
        ? { userId }
        : { sessionId };

      const browsingHistory = await this.prismaService.browsingHistory.findMany(
        {
          where: whereClause,
          orderBy: { lastViewedAt: 'desc' },
          take: limit,
          include: includeProduct
            ? {
                product: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    price: true,
                    discountPrice: true,
                    images: {
                      select: {
                        imageUrl: true,
                        altText: true,
                      },
                      orderBy: { position: 'asc' },
                      take: 1,
                    },
                  },
                },
              }
            : undefined,
        },
      );

      return browsingHistory.map((item: any) => ({
        ...item,
        userId: item.userId || undefined,
        source: item.source || undefined,
        deviceType: item.deviceType || undefined,
        timeSpent: item.timeSpent || undefined,
        conversionAt: item.conversionAt || undefined,
        product:
          includeProduct && item.product
            ? {
                ...item.product,
                images: item.product.images,
              }
            : undefined,
      }));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error retrieving browsing history: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve browsing history',
      );
    }
  }

  async getUserActivities(
    userId?: string,
    sessionId?: string,
    limit = 50,
    activityType?: string,
  ): Promise<UserActivityResponseDto[]> {
    try {
      if (!userId && !sessionId) {
        throw new BadRequestException(
          'Either userId or sessionId must be provided',
        );
      }

      const whereClause: Prisma.UserActivityWhereInput = {
        ...(userId ? { userId } : { sessionId }),
        ...(activityType ? { activityType: activityType as any } : {}),
      };

      const activities = await this.prismaService.userActivity.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return activities.map((activity) => ({
        ...activity,
        userId: activity.userId || undefined,
        entityId: activity.entityId || undefined,
        entityType: activity.entityType || undefined,
        pageUrl: activity.pageUrl || undefined,
        deviceType: activity.deviceType || undefined,
        duration: activity.duration || undefined,
        referrer: activity.referrer || undefined,
        ipAddress: activity.ipAddress || undefined,
        userAgent: activity.userAgent || undefined,
        metadata:
          activity.metadata &&
          typeof activity.metadata === 'object' &&
          activity.metadata !== null
            ? (activity.metadata as Record<string, any>)
            : undefined,
      }));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error retrieving user activities: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve user activities',
      );
    }
  }

  private async updateBrowsingHistory({
    userId,
    sessionId,
    productId,
    source,
    deviceType,
    timeSpent,
  }: {
    userId?: string;
    sessionId: string;
    productId: string;
    source?: string;
    deviceType?: string;
    timeSpent?: number;
  }): Promise<void> {
    try {
      // Check if entry exists for this user and product
      const existingEntry = userId
        ? await this.prismaService.browsingHistory.findUnique({
            where: {
              userId_productId: { userId, productId },
            },
          })
        : null;

      if (existingEntry && userId) {
        // Update existing entry
        await this.prismaService.browsingHistory.update({
          where: { id: existingEntry.id },
          data: {
            viewCount: { increment: 1 },
            lastViewedAt: new Date(),
            timeSpent: timeSpent
              ? { increment: timeSpent }
              : existingEntry.timeSpent,
            source: source || existingEntry.source,
            deviceType: deviceType || existingEntry.deviceType,
          },
        });
      } else {
        // Create new entry
        await this.prismaService.browsingHistory.create({
          data: {
            userId,
            sessionId,
            productId,
            source,
            deviceType,
            timeSpent,
            viewCount: 1,
          },
        });
      }
    } catch (error) {
      // Log error but don't throw to avoid failing the main activity tracking
      this.logger.error(
        `Error updating browsing history: ${error.message}`,
        error.stack,
      );
    }
  }

  async markConversion(
    userId?: string,
    sessionId?: string,
    productId?: string,
  ): Promise<void> {
    try {
      const whereClause = userId
        ? { userId, ...(productId && { productId }) }
        : { sessionId, ...(productId && { productId }) };

      await this.prismaService.browsingHistory.updateMany({
        where: whereClause,
        data: {
          conversion: true,
          conversionAt: new Date(),
        },
      });

      this.logger.log(
        `Conversion marked for ${userId ? `user ${userId}` : `session ${sessionId}`}${productId ? ` on product ${productId}` : ''}`,
      );
    } catch (error) {
      this.logger.error(
        `Error marking conversion: ${error.message}`,
        error.stack,
      );
    }
  }

  async cleanupOldActivities(daysToKeep = 90): Promise<{ deleted: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deleteResult = await this.prismaService.userActivity.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(
        `Cleaned up ${deleteResult.count} old activities older than ${daysToKeep} days`,
      );

      return { deleted: deleteResult.count };
    } catch (error) {
      this.logger.error(
        `Error cleaning up old activities: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to cleanup old activities',
      );
    }
  }
}
