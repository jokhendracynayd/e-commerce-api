import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma, RecommendationType } from '@prisma/client';
import { RecommendationQueryDto, RecommendationResponseDto } from './dto';
import { AppLogger } from '../../common/services/logger.service';
import { UserActivityType } from '@prisma/client';
import { OrderStatus } from '@prisma/client';

interface FrequentItemsQueryResult {
  recommended_product_id: string;
  frequency: number;
  confidence: number;
}

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('RecommendationsService');
  }

  async getRecommendations(
    queryDto: RecommendationQueryDto,
  ): Promise<RecommendationResponseDto[]> {
    try {
      this.logger.log(
        `Getting recommendations of type: ${queryDto.type} for user: ${queryDto.userId || 'anonymous'}`,
      );

      switch (queryDto.type) {
        case RecommendationType.PERSONALIZED:
          return this.getPersonalizedRecommendations(
            queryDto.userId,
            queryDto.sessionId,
            queryDto.limit,
            queryDto.includeProduct,
          );
        case RecommendationType.SIMILAR_PRODUCTS:
          if (!queryDto.productId) {
            throw new BadRequestException(
              'Product ID is required for similar products recommendations',
            );
          }
          return this.getSimilarProducts(
            queryDto.productId,
            queryDto.limit,
            queryDto.includeProduct,
          );
        case RecommendationType.FREQUENTLY_BOUGHT_TOGETHER:
          if (!queryDto.productId) {
            throw new BadRequestException(
              'Product ID is required for frequently bought together recommendations',
            );
          }
          return this.getFrequentlyBoughtTogether(
            queryDto.productId,
            queryDto.limit,
            queryDto.includeProduct,
          );
        case RecommendationType.TRENDING:
          return this.getTrendingProducts(
            queryDto.categoryId,
            queryDto.limit,
            queryDto.includeProduct,
          );
        case RecommendationType.RECENTLY_VIEWED:
          return this.getRecentlyViewed(
            queryDto.userId,
            queryDto.sessionId,
            queryDto.limit,
            queryDto.includeProduct,
          );
        case RecommendationType.TOP_RATED:
          return this.getTopRatedProducts(
            queryDto.categoryId,
            queryDto.limit,
            queryDto.includeProduct,
          );
        case RecommendationType.BESTSELLERS:
          return this.getBestsellerProducts(
            queryDto.categoryId,
            queryDto.limit,
            queryDto.includeProduct,
          );
        case RecommendationType.NEW_ARRIVALS:
          return this.getNewArrivals(
            queryDto.categoryId,
            queryDto.limit,
            queryDto.includeProduct,
          );
        default:
          throw new BadRequestException(
            `Unsupported recommendation type: ${queryDto.type}`,
          );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error getting recommendations: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to get recommendations');
    }
  }

  async getPersonalizedRecommendations(
    userId?: string,
    sessionId?: string,
    limit = 10,
    includeProduct = true,
  ): Promise<RecommendationResponseDto[]> {
    try {
      if (!userId && !sessionId) {
        throw new BadRequestException(
          'Either userId or sessionId must be provided for personalized recommendations',
        );
      }

      // For authenticated users, get existing personalized recommendations
      if (userId) {
        const existingRecommendations =
          await this.prismaService.productRecommendation.findMany({
            where: {
              userId,
              recommendationType: RecommendationType.PERSONALIZED,
              OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
            },
            orderBy: { score: 'desc' },
            take: limit,
            include: includeProduct
              ? {
                  recommendedProduct: {
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                      price: true,
                      discountPrice: true,
                      averageRating: true,
                      reviewCount: true,
                      images: {
                        select: {
                          imageUrl: true,
                          altText: true,
                        },
                        orderBy: { position: 'asc' },
                        take: 1,
                      },
                      brand: {
                        select: {
                          id: true,
                          name: true,
                          logo: true,
                        },
                      },
                      category: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                }
              : undefined,
          });

        if (existingRecommendations.length > 0) {
          return this.mapToRecommendationResponse(
            existingRecommendations,
            includeProduct,
          );
        }
      }

      // Fallback to trending products for new users or when no personalized recommendations exist
      this.logger.log(
        `No personalized recommendations found for user ${userId || sessionId}, falling back to trending`,
      );
      return this.getTrendingProducts(undefined, limit, includeProduct);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error getting personalized recommendations: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to get personalized recommendations',
      );
    }
  }

  async getSimilarProducts(
    productId: string,
    limit = 10,
    includeProduct = true,
  ): Promise<RecommendationResponseDto[]> {
    try {
      // First check if product exists
      const product = await this.prismaService.product.findUnique({
        where: { id: productId },
        select: { id: true, categoryId: true, brandId: true },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Get existing similar product recommendations
      const existingRecommendations =
        await this.prismaService.productRecommendation.findMany({
          where: {
            productId,
            recommendationType: RecommendationType.SIMILAR_PRODUCTS,
            OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
          },
          orderBy: { score: 'desc' },
          take: limit,
          include: includeProduct
            ? {
                recommendedProduct: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    price: true,
                    discountPrice: true,
                    averageRating: true,
                    reviewCount: true,
                    images: {
                      select: {
                        imageUrl: true,
                        altText: true,
                      },
                      orderBy: { position: 'asc' },
                      take: 1,
                    },
                    brand: {
                      select: {
                        id: true,
                        name: true,
                        logo: true,
                      },
                    },
                    category: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              }
            : undefined,
        });

      if (existingRecommendations.length > 0) {
        return this.mapToRecommendationResponse(
          existingRecommendations,
          includeProduct,
        );
      }

      // Fallback: generate similar products based on category and brand
      const similarProducts = await this.prismaService.product.findMany({
        where: {
          AND: [
            { id: { not: productId } },
            { visibility: 'PUBLIC' },
            { isActive: true },
            {
              OR: [
                { categoryId: product.categoryId },
                { brandId: product.brandId },
              ],
            },
          ],
        },
        orderBy: [{ averageRating: 'desc' }, { reviewCount: 'desc' }],
        take: limit,
        include: includeProduct
          ? {
              images: {
                select: {
                  imageUrl: true,
                  altText: true,
                },
                orderBy: { position: 'asc' },
                take: 1,
              },
              brand: {
                select: {
                  id: true,
                  name: true,
                  logo: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            }
          : undefined,
      });

      // Convert to recommendation format
      return similarProducts.map((prod, index) => ({
        id: `temp-${prod.id}`,
        userId: undefined,
        sessionId: undefined,
        productId,
        recommendedProductId: prod.id,
        recommendationType: RecommendationType.SIMILAR_PRODUCTS,
        score: 0.8 - index * 0.05, // Decreasing score based on position
        position: index + 1,
        algorithmVersion: 'fallback-v1.0',
        metadata: {
          similarity_type: 'category_brand',
          fallback: true,
        },
        viewed: false,
        clicked: false,
        converted: false,
        expiresAt: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        recommendedProduct: includeProduct
          ? {
              id: prod.id,
              title: prod.title,
              slug: prod.slug,
              price: Number(prod.price),
              discountPrice: prod.discountPrice
                ? Number(prod.discountPrice)
                : undefined,
              averageRating: prod.averageRating,
              reviewCount: prod.reviewCount,
              images: (prod as any).images || [],
              brand: (prod as any).brand || undefined,
              category: (prod as any).category || undefined,
            }
          : undefined,
      }));
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error getting similar products: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to get similar products');
    }
  }

  async getFrequentlyBoughtTogether(
    productId: string,
    limit = 10,
    includeProduct = true,
  ): Promise<RecommendationResponseDto[]> {
    try {
      // First check if product exists
      const product = await this.prismaService.product.findUnique({
        where: { id: productId },
        select: { id: true },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Get existing frequently bought together recommendations
      const existingRecommendations =
        await this.prismaService.productRecommendation.findMany({
          where: {
            productId,
            recommendationType: RecommendationType.FREQUENTLY_BOUGHT_TOGETHER,
            OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
          },
          orderBy: { score: 'desc' },
          take: limit,
          include: includeProduct
            ? {
                recommendedProduct: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    price: true,
                    discountPrice: true,
                    averageRating: true,
                    reviewCount: true,
                    images: {
                      select: {
                        imageUrl: true,
                        altText: true,
                      },
                      orderBy: { position: 'asc' },
                      take: 1,
                    },
                    brand: {
                      select: {
                        id: true,
                        name: true,
                        logo: true,
                      },
                    },
                    category: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              }
            : undefined,
        });

      if (existingRecommendations.length > 0) {
        return this.mapToRecommendationResponse(
          existingRecommendations,
          includeProduct,
        );
      }

      // Fallback: analyze order history to find frequently bought together items
      const coOccurrenceQuery = `
        SELECT 
          oi2.product_id as recommended_product_id,
          COUNT(*) as frequency,
          COUNT(*) * 1.0 / (
            SELECT COUNT(DISTINCT order_id) 
            FROM order_items 
            WHERE product_id = $1
          ) as confidence
        FROM order_items oi1
        JOIN order_items oi2 ON oi1.order_id = oi2.order_id
        JOIN products p ON oi2.product_id = p.id
        WHERE oi1.product_id = $1 
          AND oi2.product_id != $1
          AND p.visibility = 'PUBLIC'
          AND p.is_active = true
        GROUP BY oi2.product_id
        HAVING COUNT(*) >= 2
        ORDER BY frequency DESC, confidence DESC
        LIMIT $2
      `;

      const frequentItems = await this.prismaService.$queryRawUnsafe(
        coOccurrenceQuery,
        productId,
        limit,
      );

      if (frequentItems.length === 0) {
        // Fallback to similar products if no frequently bought together items found
        return this.getSimilarProducts(productId, limit, includeProduct);
      }

      // Get product details for frequently bought together items
      const productIds = frequentItems.map(
        (item) => item.recommended_product_id,
      );
      const products = await this.prismaService.product.findMany({
        where: {
          id: { in: productIds },
          visibility: 'PUBLIC',
          isActive: true,
        },
        include: includeProduct
          ? {
              images: {
                select: {
                  imageUrl: true,
                  altText: true,
                },
                orderBy: { position: 'asc' },
                take: 1,
              },
              brand: {
                select: {
                  id: true,
                  name: true,
                  logo: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            }
          : undefined,
      });

      // Create recommendation responses with frequency-based scoring
      return frequentItems
        .map((item, index) => {
          const prod = products.find(
            (p) => p.id === item.recommended_product_id,
          );
          if (!prod) return null;

          return {
            id: `temp-${prod.id}`,
            userId: undefined,
            sessionId: undefined,
            productId,
            recommendedProductId: prod.id,
            recommendationType: RecommendationType.FREQUENTLY_BOUGHT_TOGETHER,
            score: Math.min(Number(item.confidence), 1.0),
            position: index + 1,
            algorithmVersion: 'market-basket-v1.0',
            metadata: {
              frequency: Number(item.frequency),
              confidence: Number(item.confidence),
              algorithm: 'market_basket_analysis',
            },
            viewed: false,
            clicked: false,
            converted: false,
            expiresAt: undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
            recommendedProduct: includeProduct
              ? {
                  id: prod.id,
                  title: prod.title,
                  slug: prod.slug,
                  price: Number(prod.price),
                  discountPrice: prod.discountPrice
                    ? Number(prod.discountPrice)
                    : undefined,
                  averageRating: prod.averageRating,
                  reviewCount: prod.reviewCount,
                  images: (prod as any).images || [],
                  brand: (prod as any).brand || undefined,
                  category: (prod as any).category || undefined,
                }
              : undefined,
          };
        })
        .filter(Boolean) as RecommendationResponseDto[];
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error getting frequently bought together: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to get frequently bought together recommendations',
      );
    }
  }

  async getTrendingProducts(
    categoryId?: string,
    limit = 10,
    includeProduct = true,
  ): Promise<RecommendationResponseDto[]> {
    try {
      // Get trending products based on recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Use Prisma groupBy to aggregate user activity for trending products
      const stats = await this.prismaService.userActivity.groupBy({
        by: ['entityId'],
        where: {
          activityType: {
            in: [
              UserActivityType.PRODUCT_VIEW,
              UserActivityType.PRODUCT_CLICK,
              UserActivityType.ADD_TO_CART,
            ],
          },
          entityType: 'product',
          createdAt: { gte: sevenDaysAgo },
        },
        _count: { entityId: true },
        _min: { createdAt: true },
      });
      if (stats.length === 0) {
        return this.getBestsellerProducts(categoryId, limit, includeProduct);
      }
      // Compute velocity and sort by velocity then count
      const trendingStats = stats.map((s) => {
        const first = s._min.createdAt!;
        const days = Math.floor(
          (Date.now() - first.getTime()) / (1000 * 60 * 60 * 24),
        );
        const interval = Math.max(1, days);
        return {
          productId: s.entityId!,
          activityCount: s._count.entityId,
          velocity: s._count.entityId / interval,
        };
      });
      trendingStats.sort(
        (a, b) => b.velocity - a.velocity || b.activityCount - a.activityCount,
      );
      const topStats = trendingStats.slice(0, limit);
      // Extract product IDs (force as string[])
      const productIds = topStats.map((s) => s.productId);
      const products = await this.prismaService.product.findMany({
        where: {
          id: { in: productIds },
          visibility: 'PUBLIC',
          isActive: true,
          ...(categoryId && { categoryId }),
        },
        include: includeProduct
          ? {
              images: {
                select: { imageUrl: true, altText: true },
                orderBy: { position: 'asc' },
                take: 1,
              },
              brand: { select: { id: true, name: true, logo: true } },
              category: { select: { id: true, name: true } },
            }
          : undefined,
      });
      return topStats
        .map((stat, index) => {
          const prod = products.find((p) => p.id === stat.productId);
          if (!prod) return null;
          return {
            id: `temp-${prod.id}`,
            userId: undefined,
            sessionId: undefined,
            productId: undefined,
            recommendedProductId: prod.id,
            recommendationType: RecommendationType.TRENDING,
            score: Math.min(stat.velocity, 1.0),
            position: index + 1,
            algorithmVersion: 'velocity-v1.0',
            metadata: {
              activity_count: stat.activityCount,
              velocity: stat.velocity,
              algorithm: 'velocity_based_trending',
            },
            viewed: false,
            clicked: false,
            converted: false,
            expiresAt: undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
            recommendedProduct: includeProduct
              ? {
                  id: prod.id,
                  title: prod.title,
                  slug: prod.slug,
                  price: Number(prod.price),
                  discountPrice: prod.discountPrice
                    ? Number(prod.discountPrice)
                    : undefined,
                  averageRating: prod.averageRating,
                  reviewCount: prod.reviewCount,
                  images: (prod as any).images || [],
                  brand: (prod as any).brand || undefined,
                  category: (prod as any).category || undefined,
                }
              : undefined,
          };
        })
        .filter(Boolean) as RecommendationResponseDto[];
    } catch (error) {
      this.logger.error(
        `Error getting trending products: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to get trending products');
    }
  }

  async getRecentlyViewed(
    userId?: string,
    sessionId?: string,
    limit = 10,
    includeProduct = true,
  ): Promise<RecommendationResponseDto[]> {
    try {
      if (!userId && !sessionId) {
        throw new BadRequestException(
          'Either userId or sessionId must be provided for recently viewed',
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
                    averageRating: true,
                    reviewCount: true,
                    visibility: true,
                    isActive: true,
                    images: {
                      select: {
                        imageUrl: true,
                        altText: true,
                      },
                      orderBy: { position: 'asc' },
                      take: 1,
                    },
                    brand: {
                      select: {
                        id: true,
                        name: true,
                        logo: true,
                      },
                    },
                    category: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              }
            : undefined,
        },
      );

      // Filter out inactive/private products
      const filtered = browsingHistory.filter((item) => {
        if (!includeProduct) return true;
        const product = (item as any).product;
        return (
          product &&
          product.visibility === 'PUBLIC' &&
          product.isActive === true
        );
      });
      // Deduplicate products by productId
      const uniqueHistory: typeof filtered = [];
      const seen = new Set<string>();
      for (const item of filtered) {
        const pid = item.productId.toString();
        if (!seen.has(pid)) {
          seen.add(pid);
          uniqueHistory.push(item);
        }
      }
      // Convert to recommendation format for unique products
      return uniqueHistory.map((item, index) => ({
        id: `temp-${item.productId}`,
        userId: item.userId || undefined,
        sessionId: item.sessionId,
        productId: undefined,
        recommendedProductId: item.productId,
        recommendationType: RecommendationType.RECENTLY_VIEWED,
        score: 1.0 - index * 0.05,
        position: index + 1,
        algorithmVersion: 'recency-v1.0',
        metadata: {
          last_viewed: item.lastViewedAt,
          view_count: item.viewCount,
          time_spent: item.timeSpent,
          source: item.source,
        },
        viewed: true,
        clicked: true,
        converted: item.conversion,
        expiresAt: undefined,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        recommendedProduct: includeProduct
          ? {
              id: (item as any).product.id,
              title: (item as any).product.title,
              slug: (item as any).product.slug,
              price: Number((item as any).product.price),
              discountPrice: (item as any).product.discountPrice
                ? Number((item as any).product.discountPrice)
                : undefined,
              averageRating: (item as any).product.averageRating,
              reviewCount: (item as any).product.reviewCount,
              images: (item as any).product.images || [],
              brand: (item as any).product.brand || undefined,
              category: (item as any).product.category || undefined,
            }
          : undefined,
      }));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error getting recently viewed: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to get recently viewed products',
      );
    }
  }

  async getTopRatedProducts(
    categoryId?: string,
    limit = 10,
    includeProduct = true,
  ): Promise<RecommendationResponseDto[]> {
    try {
      const products = await this.prismaService.product.findMany({
        where: {
          visibility: 'PUBLIC',
          isActive: true,
          averageRating: { gte: 4.0 },
          reviewCount: { gte: 5 },
          ...(categoryId && { categoryId }),
        },
        orderBy: [{ averageRating: 'desc' }, { reviewCount: 'desc' }],
        take: limit,
        include: includeProduct
          ? {
              images: {
                select: {
                  imageUrl: true,
                  altText: true,
                },
                orderBy: { position: 'asc' },
                take: 1,
              },
              brand: {
                select: {
                  id: true,
                  name: true,
                  logo: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            }
          : undefined,
      });

      return products.map((prod, index) => ({
        id: `temp-${prod.id}`,
        userId: undefined,
        sessionId: undefined,
        productId: undefined,
        recommendedProductId: prod.id,
        recommendationType: RecommendationType.TOP_RATED,
        score: prod.averageRating / 5.0, // Normalize to 0-1 scale
        position: index + 1,
        algorithmVersion: 'rating-v1.0',
        metadata: {
          average_rating: prod.averageRating,
          review_count: prod.reviewCount,
          algorithm: 'top_rated',
        },
        viewed: false,
        clicked: false,
        converted: false,
        expiresAt: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        recommendedProduct: includeProduct
          ? {
              id: prod.id,
              title: prod.title,
              slug: prod.slug,
              price: Number(prod.price),
              discountPrice: prod.discountPrice
                ? Number(prod.discountPrice)
                : undefined,
              averageRating: prod.averageRating,
              reviewCount: prod.reviewCount,
              images: (prod as any).images || [],
              brand: (prod as any).brand || undefined,
              category: (prod as any).category || undefined,
            }
          : undefined,
      }));
    } catch (error) {
      this.logger.error(
        `Error getting top rated products: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to get top rated products',
      );
    }
  }

  async getBestsellerProducts(
    categoryId?: string,
    limit = 10,
    includeProduct = true,
  ): Promise<RecommendationResponseDto[]> {
    try {
      // Calculate bestsellers based on order history (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Aggregate order items by product to compute sales
      const stats = await this.prismaService.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            placedAt: { gte: thirtyDaysAgo },
            status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
          },
          product: {
            visibility: 'PUBLIC',
            isActive: true,
            ...(categoryId && { categoryId }),
          },
        },
        _sum: { quantity: true, totalPrice: true },
        _count: { orderId: true },
      });
      const filteredStats = stats.filter((s) => (s._sum.quantity ?? 0) >= 2);
      if (!filteredStats.length) {
        return this.getTopRatedProducts(categoryId, limit, includeProduct);
      }
      // Sort by total sold desc, then order count desc
      filteredStats.sort(
        (a, b) =>
          b._sum.quantity! - a._sum.quantity! ||
          b._count.orderId - a._count.orderId,
      );
      const topStats = filteredStats.slice(0, limit);
      // Get product details
      // Extract and assert non-null product IDs for Prisma
      const productIds = topStats.map((s) => s.productId!).filter(Boolean);
      const products = await this.prismaService.product.findMany({
        where: {
          id: { in: productIds },
          visibility: 'PUBLIC',
          isActive: true,
          ...(categoryId && { categoryId }),
        },
        include: includeProduct
          ? {
              images: {
                select: {
                  imageUrl: true,
                  altText: true,
                },
                orderBy: { position: 'asc' },
                take: 1,
              },
              brand: {
                select: {
                  id: true,
                  name: true,
                  logo: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            }
          : undefined,
      });

      // Normalize sales scores and assemble recommendations
      const maxSales = Math.max(...topStats.map((s) => s._sum.quantity!));
      return topStats
        .map((stat, index) => {
          const prod = products.find((p) => p.id === stat.productId);
          if (!prod) return null;
          return {
            id: `temp-${prod.id}`,
            userId: undefined,
            sessionId: undefined,
            productId: undefined,
            recommendedProductId: prod.id,
            recommendationType: RecommendationType.BESTSELLERS,
            score: stat._sum.quantity! / maxSales,
            position: index + 1,
            algorithmVersion: 'sales-v1.0',
            metadata: {
              total_sold: stat._sum.quantity!,
              order_count: stat._count.orderId,
              total_revenue: Number(stat._sum.totalPrice!),
              algorithm: 'sales_based',
            },
            viewed: false,
            clicked: false,
            converted: false,
            expiresAt: undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
            recommendedProduct: includeProduct
              ? {
                  id: prod.id,
                  title: prod.title,
                  slug: prod.slug,
                  price: Number(prod.price),
                  discountPrice: prod.discountPrice
                    ? Number(prod.discountPrice)
                    : undefined,
                  averageRating: prod.averageRating,
                  reviewCount: prod.reviewCount,
                  images: (prod as any).images || [],
                  brand: (prod as any).brand || undefined,
                  category: (prod as any).category || undefined,
                }
              : undefined,
          };
        })
        .filter(Boolean) as RecommendationResponseDto[];
    } catch (error) {
      this.logger.error(
        `Error getting bestseller products: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to get bestseller products',
      );
    }
  }

  async getNewArrivals(
    categoryId?: string,
    limit = 10,
    includeProduct = true,
  ): Promise<RecommendationResponseDto[]> {
    try {
      const products = await this.prismaService.product.findMany({
        where: {
          visibility: 'PUBLIC',
          isActive: true,
          ...(categoryId && { categoryId }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: includeProduct
          ? {
              images: {
                select: {
                  imageUrl: true,
                  altText: true,
                },
                orderBy: { position: 'asc' },
                take: 1,
              },
              brand: {
                select: {
                  id: true,
                  name: true,
                  logo: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            }
          : undefined,
      });

      return products.map((prod, index) => ({
        id: `temp-${prod.id}`,
        userId: undefined,
        sessionId: undefined,
        productId: undefined,
        recommendedProductId: prod.id,
        recommendationType: RecommendationType.NEW_ARRIVALS,
        score: 1.0 - index * 0.05, // Decreasing score based on creation date
        position: index + 1,
        algorithmVersion: 'newness-v1.0',
        metadata: {
          created_at: prod.createdAt,
          algorithm: 'newest_first',
        },
        viewed: false,
        clicked: false,
        converted: false,
        expiresAt: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        recommendedProduct: includeProduct
          ? {
              id: prod.id,
              title: prod.title,
              slug: prod.slug,
              price: Number(prod.price),
              discountPrice: prod.discountPrice
                ? Number(prod.discountPrice)
                : undefined,
              averageRating: prod.averageRating,
              reviewCount: prod.reviewCount,
              images: (prod as any).images || [],
              brand: (prod as any).brand || undefined,
              category: (prod as any).category || undefined,
            }
          : undefined,
      }));
    } catch (error) {
      this.logger.error(
        `Error getting new arrivals: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to get new arrivals');
    }
  }

  private mapToRecommendationResponse(
    recommendations: any[],
    includeProduct: boolean,
  ): RecommendationResponseDto[] {
    return recommendations.map((rec) => ({
      ...rec,
      userId: rec.userId || undefined,
      sessionId: rec.sessionId || undefined,
      productId: rec.productId || undefined,
      algorithmVersion: rec.algorithmVersion || undefined,
      metadata:
        rec.metadata &&
        typeof rec.metadata === 'object' &&
        rec.metadata !== null
          ? (rec.metadata as Record<string, any>)
          : undefined,
      expiresAt: rec.expiresAt || undefined,
      recommendedProduct:
        includeProduct && rec.recommendedProduct
          ? {
              id: rec.recommendedProduct.id,
              title: rec.recommendedProduct.title,
              slug: rec.recommendedProduct.slug,
              price: Number(rec.recommendedProduct.price),
              discountPrice: rec.recommendedProduct.discountPrice
                ? Number(rec.recommendedProduct.discountPrice)
                : undefined,
              averageRating: rec.recommendedProduct.averageRating,
              reviewCount: rec.recommendedProduct.reviewCount,
              images: rec.recommendedProduct.images || [],
              brand: rec.recommendedProduct.brand || undefined,
              category: rec.recommendedProduct.category || undefined,
            }
          : undefined,
    }));
  }
}
