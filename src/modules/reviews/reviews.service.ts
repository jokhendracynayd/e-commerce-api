import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { OrderStatus, Prisma } from '@prisma/client';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReviewResponseDto,
  ReviewFilterDto,
  PaginatedReviewResponseDto,
  ReviewStatsResponseDto,
} from './dto';
import { AppLogger } from '../../common/services/logger.service';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('ReviewsService');
  }

  /**
   * Get all reviews with filtering and pagination
   */
  async findAll(
    filterDto: ReviewFilterDto,
  ): Promise<PaginatedReviewResponseDto> {
    try {
      const {
        productId,
        userId,
        orderId,
        minRating,
        maxRating,
        verifiedOnly,
        search,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filterDto;

      // Build where clause
      const where: Prisma.ProductReviewWhereInput = {};

      if (productId) where.productId = productId;
      if (userId) where.userId = userId;
      if (orderId) where.orderId = orderId;

      // Rating range filter
      if (minRating || maxRating) {
        where.rating = {};
        if (minRating) where.rating.gte = minRating;
        if (maxRating) where.rating.lte = maxRating;
      }

      // Verified purchase filter
      if (verifiedOnly !== undefined) {
        where.isVerifiedPurchase = verifiedOnly;
      }

      // Search in title and comment
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { comment: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Pagination
      const skip = (page - 1) * limit;

      // Build order by
      const orderBy: Prisma.ProductReviewOrderByWithRelationInput = {
        [sortBy]: sortOrder,
      };

      // Execute queries
      const [reviews, total] = await Promise.all([
        this.prismaService.productReview.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                images: {
                  take: 1,
                  orderBy: { position: 'asc' },
                  select: { imageUrl: true },
                },
              },
            },
          },
        }),
        this.prismaService.productReview.count({ where }),
      ]);

      // Transform results
      const transformedReviews = reviews.map((review) =>
        this.transformReviewToDto(review),
      );

      // Calculate pagination
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        data: transformedReviews,
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching reviews: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch reviews');
    }
  }

  /**
   * Get a single review by ID
   */
  async findOne(id: string): Promise<ReviewResponseDto> {
    try {
      const review = await this.prismaService.productReview.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              images: {
                take: 1,
                orderBy: { position: 'asc' },
                select: { imageUrl: true },
              },
            },
          },
        },
      });

      if (!review) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      return this.transformReviewToDto(review);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error fetching review ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to fetch review with ID ${id}`,
      );
    }
  }

  /**
   * Create a new review with purchase verification
   */
  async create(
    userId: string,
    createReviewDto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    try {
      const { productId, orderId, rating, title, comment } = createReviewDto;

      // Verify order belongs to user and contains the product
      await this.validateOrderForReview(userId, orderId, productId);

      // Check if user already reviewed this product from this order
      const existingReview = await this.prismaService.productReview.findUnique({
        where: {
          userId_productId_orderId: {
            userId,
            productId,
            orderId,
          },
        },
      });

      if (existingReview) {
        throw new ConflictException('You have already reviewed this product');
      }

      // Create the review
      const review = await this.prismaService.$transaction(async (prisma) => {
        // Create review
        const newReview = await prisma.productReview.create({
          data: {
            userId,
            productId,
            orderId,
            rating,
            title,
            comment,
            isVerifiedPurchase: true, // Since we verify the order, this is always true
            helpfulCount: 0, // Start with 0 helpful votes
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                images: {
                  take: 1,
                  orderBy: { position: 'asc' },
                  select: { imageUrl: true },
                },
              },
            },
          },
        });

        // Update product's average rating and review count
        await this.updateProductRatingStats(prisma, productId);

        return newReview;
      });

      this.logger.log(
        `Created review ${review.id} for product ${productId} by user ${userId}`,
      );
      return this.transformReviewToDto(review);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`Error creating review: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create review');
    }
  }

  /**
   * Update an existing review
   */
  async update(
    id: string,
    userId: string,
    updateReviewDto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    try {
      // Check if review exists and belongs to user
      const existingReview = await this.prismaService.productReview.findUnique({
        where: { id },
      });

      if (!existingReview) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      if (existingReview.userId !== userId) {
        throw new ForbiddenException('You can only update your own reviews');
      }

      // Update the review
      const review = await this.prismaService.$transaction(async (prisma) => {
        const updatedReview = await prisma.productReview.update({
          where: { id },
          data: updateReviewDto,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                images: {
                  take: 1,
                  orderBy: { position: 'asc' },
                  select: { imageUrl: true },
                },
              },
            },
          },
        });

        // Update product's average rating if rating changed
        if (updateReviewDto.rating !== undefined) {
          await this.updateProductRatingStats(prisma, existingReview.productId);
        }

        return updatedReview;
      });

      this.logger.log(`Updated review ${id} by user ${userId}`);
      return this.transformReviewToDto(review);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Error updating review ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to update review with ID ${id}`,
      );
    }
  }

  /**
   * Delete a review
   */
  async remove(
    id: string,
    userId: string,
  ): Promise<{ id: string; deleted: boolean; message: string }> {
    try {
      // Check if review exists and belongs to user
      const existingReview = await this.prismaService.productReview.findUnique({
        where: { id },
      });

      if (!existingReview) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      if (existingReview.userId !== userId && userId !== 'admin') {
        throw new ForbiddenException('You can only delete your own reviews');
      }

      // Delete the review and update product stats
      await this.prismaService.$transaction(async (prisma) => {
        await prisma.productReview.delete({
          where: { id },
        });

        // Update product's average rating
        await this.updateProductRatingStats(prisma, existingReview.productId);
      });

      this.logger.log(`Deleted review ${id} by user ${userId}`);
      return {
        id,
        deleted: true,
        message: 'Review deleted successfully',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Error deleting review ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to delete review with ID ${id}`,
      );
    }
  }

  /**
   * Get review statistics for a product
   */
  async getProductReviewStats(
    productId: string,
  ): Promise<ReviewStatsResponseDto> {
    try {
      const [reviewStats, ratingCounts] = await Promise.all([
        this.prismaService.productReview.aggregate({
          where: { productId },
          _avg: { rating: true },
          _count: { rating: true },
        }),
        this.prismaService.productReview.groupBy({
          by: ['rating'],
          where: { productId },
          _count: { rating: true },
        }),
      ]);

      const averageRating = reviewStats._avg.rating || 0;
      const totalReviews = reviewStats._count.rating || 0;

      // Build rating distribution
      const ratingDistribution: Record<string, number> = {
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0,
      };

      ratingCounts.forEach((item) => {
        ratingDistribution[item.rating.toString()] = item._count.rating;
      });

      return {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews,
        ratingDistribution,
      };
    } catch (error) {
      this.logger.error(
        `Error getting review stats for product ${productId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to get review statistics');
    }
  }

  /**
   * Get user's reviews
   */
  async getUserReviews(
    userId: string,
    filterDto: ReviewFilterDto,
  ): Promise<PaginatedReviewResponseDto> {
    const filter = { ...filterDto, userId };
    return this.findAll(filter);
  }

  /**
   * Check if user can review a specific product from an order
   */
  async canUserReviewProduct(
    userId: string,
    orderId: string,
    productId: string,
  ): Promise<boolean> {
    try {
      // Check if order exists, belongs to user, and is delivered
      const order = await this.prismaService.order.findFirst({
        where: {
          id: orderId,
          userId,
          status: OrderStatus.DELIVERED,
          items: {
            some: { productId },
          },
        },
      });

      if (!order) return false;

      // Check if user already reviewed this product from this order
      const existingReview = await this.prismaService.productReview.findFirst({
        where: {
          userId,
          productId,
          orderId,
        },
      });

      return !existingReview;
    } catch (error) {
      this.logger.error(
        `Error checking review eligibility: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Get products eligible for review from user's orders
   */
  async getReviewEligibleProducts(userId: string) {
    try {
      const deliveredOrders = await this.prismaService.order.findMany({
        where: {
          userId,
          status: OrderStatus.DELIVERED,
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  images: {
                    take: 1,
                    orderBy: { position: 'asc' },
                    select: { imageUrl: true },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          placedAt: 'desc',
        },
      });

      // Get user's existing reviews
      const userReviews = await this.prismaService.productReview.findMany({
        where: { userId },
        select: { productId: true },
      });
      const reviewedProductIds = userReviews.map((r) => r.productId);

      const eligibleProducts: any[] = [];

      for (const order of deliveredOrders) {
        for (const item of order.items) {
          if (!reviewedProductIds.includes(item.productId!) && item.product) {
            eligibleProducts.push({
              orderId: order.id,
              orderNumber: order.orderNumber,
              orderDate: order.placedAt,
              product: {
                ...item.product,
                imageUrl: item.product.images[0]?.imageUrl,
              },
              quantity: item.quantity,
            });
          }
        }
      }

      return eligibleProducts;
    } catch (error) {
      this.logger.error(
        `Error getting review eligible products for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to get eligible products for review',
      );
    }
  }

  /**
   * Private helper methods
   */
  private async validateOrderForReview(
    userId: string,
    orderId: string,
    productId: string,
  ): Promise<void> {
    // Check if order exists and belongs to user
    const order = await this.prismaService.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        items: {
          where: { productId },
        },
      },
    });

    if (!order) {
      throw new BadRequestException(
        'Order not found or does not belong to you',
      );
    }

    // Check if order is delivered (only delivered orders can be reviewed)
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'You can only review products from delivered orders',
      );
    }

    // Check if the order contains the product
    if (order.items.length === 0) {
      throw new BadRequestException(
        'This product was not part of the specified order',
      );
    }
  }

  private async updateProductRatingStats(
    prisma: any,
    productId: string,
  ): Promise<void> {
    // Calculate new average rating and review count
    const stats = await prisma.productReview.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const averageRating = stats._avg.rating || 0;
    const reviewCount = stats._count.rating || 0;

    // Update product
    await prisma.product.update({
      where: { id: productId },
      data: {
        averageRating,
        reviewCount,
      },
    });
  }

  private transformReviewToDto(review: any): ReviewResponseDto {
    return {
      id: review.id,
      productId: review.productId,
      userId: review.userId,
      orderId: review.orderId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isVerifiedPurchase: review.isVerifiedPurchase,
      helpfulCount: review.helpfulCount,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: review.user,
      product: review.product
        ? {
            ...review.product,
            imageUrl: review.product.images?.[0]?.imageUrl,
          }
        : undefined,
    };
  }
}
