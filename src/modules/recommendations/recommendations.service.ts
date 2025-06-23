import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma, RecommendationType } from '@prisma/client';
import {
  RecommendationQueryDto,
  RecommendationResponseDto,
} from './dto';
import { AppLogger } from '../../common/services/logger.service';

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
        const existingRecommendations = await this.prismaService.productRecommendation.findMany({
          where: {
            userId,
            recommendationType: RecommendationType.PERSONALIZED,
            OR: [
              { expiresAt: { gt: new Date() } },
              { expiresAt: null },
            ],
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
          return this.mapToRecommendationResponse(existingRecommendations, includeProduct);
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
      const existingRecommendations = await this.prismaService.productRecommendation.findMany({
        where: {
          productId,
          recommendationType: RecommendationType.SIMILAR_PRODUCTS,
          OR: [
            { expiresAt: { gt: new Date() } },
            { expiresAt: null },
          ],
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
        return this.mapToRecommendationResponse(existingRecommendations, includeProduct);
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
        orderBy: [
          { averageRating: 'desc' },
          { reviewCount: 'desc' },
        ],
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
        score: 0.8 - (index * 0.05), // Decreasing score based on position
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
        recommendedProduct: includeProduct ? {
          id: prod.id,
          title: prod.title,
          slug: prod.slug,
          price: Number(prod.price),
          discountPrice: prod.discountPrice ? Number(prod.discountPrice) : undefined,
          averageRating: prod.averageRating,
          reviewCount: prod.reviewCount,
          images: (prod as any).images || [],
          brand: (prod as any).brand || undefined,
          category: (prod as any).category || undefined,
        } : undefined,
      }));
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
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
      const existingRecommendations = await this.prismaService.productRecommendation.findMany({
        where: {
          productId,
          recommendationType: RecommendationType.FREQUENTLY_BOUGHT_TOGETHER,
          OR: [
            { expiresAt: { gt: new Date() } },
            { expiresAt: null },
          ],
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
        return this.mapToRecommendationResponse(existingRecommendations, includeProduct);
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
      ) as any[];

      if (frequentItems.length === 0) {
        // Fallback to similar products if no frequently bought together items found
        return this.getSimilarProducts(productId, limit, includeProduct);
      }

      // Get product details for frequently bought together items
      const productIds = frequentItems.map(item => item.recommended_product_id);
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
      return frequentItems.map((item, index) => {
        const prod = products.find(p => p.id === item.recommended_product_id);
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
          recommendedProduct: includeProduct ? {
            id: prod.id,
            title: prod.title,
            slug: prod.slug,
            price: Number(prod.price),
            discountPrice: prod.discountPrice ? Number(prod.discountPrice) : undefined,
            averageRating: prod.averageRating,
            reviewCount: prod.reviewCount,
            images: (prod as any).images || [],
            brand: (prod as any).brand || undefined,
            category: (prod as any).category || undefined,
          } : undefined,
        };
      }).filter(Boolean) as RecommendationResponseDto[];
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
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

      const trendingQuery = `
        SELECT 
          entity_id as product_id,
          COUNT(*) as activity_count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(*) * 1.0 / GREATEST(1, EXTRACT(days FROM NOW() - MIN(created_at))) as velocity
        FROM user_activities ua
        JOIN products p ON ua.entity_id = p.id
        WHERE ua.activity_type IN ('PRODUCT_VIEW', 'PRODUCT_CLICK', 'ADD_TO_CART')
          AND ua.entity_type = 'product'
          AND ua.created_at >= $1
          AND p.visibility = 'PUBLIC'
          AND p.is_active = true
          ${categoryId ? 'AND p.category_id = $3' : ''}
        GROUP BY entity_id
        HAVING COUNT(*) >= 5
        ORDER BY velocity DESC, activity_count DESC
        LIMIT $2
      `;

      const trendingItems = await this.prismaService.$queryRawUnsafe(
        trendingQuery,
        sevenDaysAgo,
        limit,
        ...(categoryId ? [categoryId] : []),
      ) as any[];

      if (trendingItems.length === 0) {
        // Fallback to best-selling products if no trending data
        return this.getBestsellerProducts(categoryId, limit, includeProduct);
      }

      // Get product details
      const productIds = trendingItems.map(item => item.product_id);
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

      // Create recommendation responses with trending scores
      return trendingItems.map((item, index) => {
        const prod = products.find(p => p.id === item.product_id);
        if (!prod) return null;

        return {
          id: `temp-${prod.id}`,
          userId: undefined,
          sessionId: undefined,
          productId: undefined,
          recommendedProductId: prod.id,
          recommendationType: RecommendationType.TRENDING,
          score: Math.min(Number(item.velocity) / 10, 1.0), // Normalize velocity
          position: index + 1,
          algorithmVersion: 'velocity-v1.0',
          metadata: {
            activity_count: Number(item.activity_count),
            unique_users: Number(item.unique_users),
            velocity: Number(item.velocity),
            algorithm: 'velocity_based_trending',
          },
          viewed: false,
          clicked: false,
          converted: false,
          expiresAt: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          recommendedProduct: includeProduct ? {
            id: prod.id,
            title: prod.title,
            slug: prod.slug,
            price: Number(prod.price),
            discountPrice: prod.discountPrice ? Number(prod.discountPrice) : undefined,
            averageRating: prod.averageRating,
            reviewCount: prod.reviewCount,
            images: (prod as any).images || [],
            brand: (prod as any).brand || undefined,
            category: (prod as any).category || undefined,
          } : undefined,
        };
      }).filter(Boolean) as RecommendationResponseDto[];
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

      const browsingHistory = await this.prismaService.browsingHistory.findMany({
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
      });

      // Filter out inactive/private products and convert to recommendation format
      return browsingHistory
        .filter(item => {
          if (!includeProduct) return true;
          const product = (item as any).product;
          return product && product.visibility === 'PUBLIC' && product.isActive === true;
        })
        .map((item, index) => ({
          id: `temp-${item.productId}`,
          userId: item.userId || undefined,
          sessionId: item.sessionId,
          productId: undefined,
          recommendedProductId: item.productId,
          recommendationType: RecommendationType.RECENTLY_VIEWED,
          score: 1.0 - (index * 0.05), // Decreasing score based on recency
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
          recommendedProduct: includeProduct ? {
            id: (item as any).product.id,
            title: (item as any).product.title,
            slug: (item as any).product.slug,
            price: Number((item as any).product.price),
            discountPrice: (item as any).product.discountPrice ? Number((item as any).product.discountPrice) : undefined,
            averageRating: (item as any).product.averageRating,
            reviewCount: (item as any).product.reviewCount,
            images: (item as any).product.images || [],
            brand: (item as any).product.brand || undefined,
            category: (item as any).product.category || undefined,
          } : undefined,
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
        orderBy: [
          { averageRating: 'desc' },
          { reviewCount: 'desc' },
        ],
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
        recommendedProduct: includeProduct ? {
          id: prod.id,
          title: prod.title,
          slug: prod.slug,
          price: Number(prod.price),
          discountPrice: prod.discountPrice ? Number(prod.discountPrice) : undefined,
          averageRating: prod.averageRating,
          reviewCount: prod.reviewCount,
          images: (prod as any).images || [],
          brand: (prod as any).brand || undefined,
          category: (prod as any).category || undefined,
        } : undefined,
      }));
    } catch (error) {
      this.logger.error(
        `Error getting top rated products: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to get top rated products');
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

      const bestsellerQuery = `
        SELECT 
          oi.product_id,
          SUM(oi.quantity) as total_sold,
          COUNT(DISTINCT oi.order_id) as order_count,
          SUM(oi.total_price) as total_revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE o.placed_at >= $1
          AND o.status NOT IN ('CANCELLED', 'REFUNDED')
          AND p.visibility = 'PUBLIC'
          AND p.is_active = true
          ${categoryId ? 'AND p.category_id = $3' : ''}
        GROUP BY oi.product_id
        HAVING SUM(oi.quantity) >= 2
        ORDER BY total_sold DESC, order_count DESC
        LIMIT $2
      `;

      const bestsellerItems = await this.prismaService.$queryRawUnsafe(
        bestsellerQuery,
        thirtyDaysAgo,
        limit,
        ...(categoryId ? [categoryId] : []),
      ) as any[];

      if (bestsellerItems.length === 0) {
        // Fallback to top-rated products if no sales data
        return this.getTopRatedProducts(categoryId, limit, includeProduct);
      }

      // Get product details
      const productIds = bestsellerItems.map(item => item.product_id);
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

      // Calculate max sales for normalization
      const maxSales = Math.max(...bestsellerItems.map(item => Number(item.total_sold)));

      return bestsellerItems.map((item, index) => {
        const prod = products.find(p => p.id === item.product_id);
        if (!prod) return null;

        return {
          id: `temp-${prod.id}`,
          userId: undefined,
          sessionId: undefined,
          productId: undefined,
          recommendedProductId: prod.id,
          recommendationType: RecommendationType.BESTSELLERS,
          score: Number(item.total_sold) / maxSales, // Normalize sales
          position: index + 1,
          algorithmVersion: 'sales-v1.0',
          metadata: {
            total_sold: Number(item.total_sold),
            order_count: Number(item.order_count),
            total_revenue: Number(item.total_revenue),
            algorithm: 'sales_based',
          },
          viewed: false,
          clicked: false,
          converted: false,
          expiresAt: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          recommendedProduct: includeProduct ? {
            id: prod.id,
            title: prod.title,
            slug: prod.slug,
            price: Number(prod.price),
            discountPrice: prod.discountPrice ? Number(prod.discountPrice) : undefined,
            averageRating: prod.averageRating,
            reviewCount: prod.reviewCount,
            images: (prod as any).images || [],
            brand: (prod as any).brand || undefined,
            category: (prod as any).category || undefined,
          } : undefined,
        };
      }).filter(Boolean) as RecommendationResponseDto[];
    } catch (error) {
      this.logger.error(
        `Error getting bestseller products: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to get bestseller products');
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
        score: 1.0 - (index * 0.05), // Decreasing score based on creation date
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
        recommendedProduct: includeProduct ? {
          id: prod.id,
          title: prod.title,
          slug: prod.slug,
          price: Number(prod.price),
          discountPrice: prod.discountPrice ? Number(prod.discountPrice) : undefined,
          averageRating: prod.averageRating,
          reviewCount: prod.reviewCount,
          images: (prod as any).images || [],
          brand: (prod as any).brand || undefined,
          category: (prod as any).category || undefined,
        } : undefined,
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
    return recommendations.map(rec => ({
      ...rec,
      userId: rec.userId || undefined,
      sessionId: rec.sessionId || undefined,
      productId: rec.productId || undefined,
      algorithmVersion: rec.algorithmVersion || undefined,
      metadata: rec.metadata && typeof rec.metadata === 'object' && rec.metadata !== null
        ? rec.metadata as Record<string, any>
        : undefined,
      expiresAt: rec.expiresAt || undefined,
      recommendedProduct: includeProduct && rec.recommendedProduct ? {
        id: rec.recommendedProduct.id,
        title: rec.recommendedProduct.title,
        slug: rec.recommendedProduct.slug,
        price: Number(rec.recommendedProduct.price),
        discountPrice: rec.recommendedProduct.discountPrice ? Number(rec.recommendedProduct.discountPrice) : undefined,
        averageRating: rec.recommendedProduct.averageRating,
        reviewCount: rec.recommendedProduct.reviewCount,
        images: rec.recommendedProduct.images || [],
        brand: rec.recommendedProduct.brand || undefined,
        category: rec.recommendedProduct.category || undefined,
      } : undefined,
    }));
  }
} 