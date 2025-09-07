import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DealValidationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Validate if a deal can be applied to a product
   */
  async validateDealApplication(
    productDealId: string,
    userId: string,
    productId: string,
  ): Promise<{
    isValid: boolean;
    reason?: string;
    remainingUsage?: number;
  }> {
    try {
      // 1. Check if deal exists and is active
      const deal = await this.prisma.productDeal.findUnique({
        where: { id: productDealId },
        include: {
          product: true,
          limits: true,
          usages: {
            where: { userId },
          },
        },
      });

      if (!deal) {
        return { isValid: false, reason: 'Deal not found' };
      }

      // 2. Check if deal is currently active (within time range)
      const now = new Date();
      if (now < deal.startTime) {
        return { isValid: false, reason: 'Deal has not started yet' };
      }

      if (now > deal.endTime) {
        return { isValid: false, reason: 'Deal has expired' };
      }

      // 3. Check if product is available and has stock
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          inventory: true,
        },
      });

      if (!product) {
        return { isValid: false, reason: 'Product not found' };
      }

      if (!product.isActive) {
        return { isValid: false, reason: 'Product is not active' };
      }

      if (product.visibility !== 'PUBLIC') {
        return { isValid: false, reason: 'Product is not publicly available' };
      }

      // 4. Check stock availability
      const stockQuantity = product.inventory?.stockQuantity || product.stockQuantity;
      if (stockQuantity <= 0) {
        return { isValid: false, reason: 'Product is out of stock' };
      }

      // 5. Check deal limits if they exist
      if (deal.limits) {
        const limits = deal.limits;

        // Check total usage limit
        if (limits.maxTotalUsage && limits.currentUsage >= limits.maxTotalUsage) {
          return { 
            isValid: false, 
            reason: 'Deal usage limit exceeded',
            remainingUsage: 0
          };
        }

        // Check per-user usage limit
        if (limits.maxUserUsage) {
          const userUsageCount = deal.usages.length;
          if (userUsageCount >= limits.maxUserUsage) {
            return { 
              isValid: false, 
              reason: 'You have already used this deal the maximum number of times',
              remainingUsage: 0
            };
          }
        }

        // Calculate remaining usage
        const remainingUsage = limits.maxTotalUsage 
          ? limits.maxTotalUsage - limits.currentUsage 
          : null;
      }

      return { isValid: true };
    } catch (error) {
      console.error('Error validating deal application:', error);
      return { isValid: false, reason: 'Internal error during validation' };
    }
  }

  /**
   * Record deal usage when applied
   */
  async recordDealUsage(
    productDealId: string,
    userId: string,
    orderId?: string,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Get productId from the deal
        const deal = await tx.productDeal.findUnique({
          where: { id: productDealId },
          select: { productId: true },
        });

        if (!deal) {
          throw new Error('Deal not found');
        }

        // 2. Create usage record
        await tx.dealUsage.create({
          data: {
            productDealId,
            productId: deal.productId,
            userId,
            orderId,
          },
        });

        // 2. Update usage count in limits
        await tx.dealLimits.upsert({
          where: { productDealId },
          update: {
            currentUsage: {
              increment: 1,
            },
          },
          create: {
            productDealId,
            currentUsage: 1,
          },
        });
      });
    } catch (error) {
      console.error('Error recording deal usage:', error);
      throw new BadRequestException('Failed to record deal usage');
    }
  }

  /**
   * Check if user has already used this deal
   */
  async hasUserUsedDeal(
    productDealId: string,
    userId: string,
  ): Promise<boolean> {
    const usage = await this.prisma.dealUsage.findUnique({
      where: {
        productDealId_userId: {
          productDealId,
          userId,
        },
      },
    });

    return !!usage;
  }

  /**
   * Get deal usage statistics
   */
  async getDealUsageStats(productDealId: string): Promise<{
    totalUsage: number;
    uniqueUsers: number;
    recentUsage: Date[];
  }> {
    const [totalUsage, uniqueUsers, recentUsage] = await Promise.all([
      this.prisma.dealUsage.count({
        where: { productDealId },
      }),
      this.prisma.dealUsage.groupBy({
        by: ['userId'],
        where: { productDealId },
      }).then(result => result.length),
      this.prisma.dealUsage.findMany({
        where: { productDealId },
        select: { usedAt: true },
        orderBy: { usedAt: 'desc' },
        take: 10,
      }).then(usages => usages.map(u => u.usedAt)),
    ]);

    return {
      totalUsage,
      uniqueUsers,
      recentUsage,
    };
  }

  /**
   * Set deal limits
   */
  async setDealLimits(
    productDealId: string,
    maxTotalUsage?: number,
    maxUserUsage?: number,
  ): Promise<void> {
    try {
      await this.prisma.dealLimits.upsert({
        where: { productDealId },
        update: {
          maxTotalUsage,
          maxUserUsage,
        },
        create: {
          productDealId,
          maxTotalUsage,
          maxUserUsage,
          currentUsage: 0,
        },
      });
    } catch (error) {
      console.error('Error setting deal limits:', error);
      throw new BadRequestException('Failed to set deal limits');
    }
  }

  /**
   * Validate product availability for deal
   */
  async validateProductAvailability(productId: string): Promise<{
    isAvailable: boolean;
    reason?: string;
    stockQuantity: number;
  }> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          inventory: true,
        },
      });

      if (!product) {
        return { isAvailable: false, reason: 'Product not found', stockQuantity: 0 };
      }

      if (!product.isActive) {
        return { isAvailable: false, reason: 'Product is inactive', stockQuantity: 0 };
      }

      if (product.visibility !== 'PUBLIC') {
        return { isAvailable: false, reason: 'Product is not publicly available', stockQuantity: 0 };
      }

      const stockQuantity = product.inventory?.stockQuantity || product.stockQuantity;

      if (stockQuantity <= 0) {
        return { isAvailable: false, reason: 'Product is out of stock', stockQuantity };
      }

      return { isAvailable: true, stockQuantity };
    } catch (error) {
      console.error('Error validating product availability:', error);
      return { isAvailable: false, reason: 'Internal error', stockQuantity: 0 };
    }
  }
}
