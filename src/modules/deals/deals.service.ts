import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateDealDto, UpdateDealDto } from './dto';
import { Prisma, DealType } from '@prisma/client';
import { DealValidationService } from './deal-validation.service';

@Injectable()
export class DealsService {
  constructor(
    private prisma: PrismaService,
    private dealValidationService: DealValidationService,
  ) {}

  // Helper method to determine deal status based on start and end times
  private getDealStatus(
    startTime: Date,
    endTime: Date,
  ): 'Active' | 'Upcoming' | 'Ended' {
    const now = new Date();
    if (now < startTime) {
      return 'Upcoming';
    } else if (now > endTime) {
      return 'Ended';
    } else {
      return 'Active';
    }
  }

  // Helper method to group deals by type, discount, start time, and end time
  private async groupAndCountDeals() {
    // First get all deals from product_deals table
    const deals = await this.prisma.productDeal.findMany();

    // Define the type for our grouped deals
    interface GroupedDeal {
      id: string;
      dealType: DealType;
      discount: Prisma.Decimal;
      startTime: Date;
      endTime: Date;
      status: 'Active' | 'Upcoming' | 'Ended';
      products: string[];
      createdAt: Date;
      updatedAt: Date;
    }

    // Group by deal parameters
    const groupedDeals: Record<string, GroupedDeal> = deals.reduce(
      (acc, deal) => {
        // Create a unique key for each deal group
        const key = `${deal.dealType}-${deal.discount}-${deal.startTime.toISOString()}-${deal.endTime.toISOString()}`;

        if (!acc[key]) {
          acc[key] = {
            // Use first deal's ID as the group ID
            id: deal.id,
            dealType: deal.dealType,
            discount: deal.discount,
            startTime: deal.startTime,
            endTime: deal.endTime,
            status: this.getDealStatus(deal.startTime, deal.endTime),
            products: [],
            createdAt: deal.createdAt,
            updatedAt: deal.updatedAt,
          };
        }

        // Add product ID to this group's products array
        acc[key].products.push(deal.productId);

        return acc;
      },
      {} as Record<string, GroupedDeal>,
    );

    // Convert the grouped deals object into an array
    return Object.values(groupedDeals).map((group) => ({
      id: group.id,
      name: `${group.dealType} Deal (${group.discount}% off)`,
      dealType: group.dealType,
      discount: parseFloat(group.discount.toString()),
      startTime: group.startTime,
      endTime: group.endTime,
      status: group.status,
      productsCount: group.products.length,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));
  }

  // Get all deals with optional filtering and pagination
  async findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    status?: 'Active' | 'Upcoming' | 'Ended';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      skip = 0,
      take = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    // Get grouped deals
    let deals = await this.groupAndCountDeals();

    // Apply status filter if provided
    if (status) {
      deals = deals.filter((deal) => deal.status === status);
    }

    // Apply sorting
    deals.sort((a, b) => {
      if (sortBy === 'createdAt') {
        return sortOrder === 'asc'
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : b.createdAt.getTime() - a.createdAt.getTime();
      } else if (sortBy === 'startTime') {
        return sortOrder === 'asc'
          ? a.startTime.getTime() - b.startTime.getTime()
          : b.startTime.getTime() - a.startTime.getTime();
      } else if (sortBy === 'endTime') {
        return sortOrder === 'asc'
          ? a.endTime.getTime() - b.endTime.getTime()
          : b.endTime.getTime() - a.endTime.getTime();
      } else if (sortBy === 'discount') {
        return sortOrder === 'asc'
          ? a.discount - b.discount
          : b.discount - a.discount;
      } else if (sortBy === 'productsCount') {
        return sortOrder === 'asc'
          ? a.productsCount - b.productsCount
          : b.productsCount - a.productsCount;
      }
      // Default sort by createdAt
      return sortOrder === 'asc'
        ? a.createdAt.getTime() - b.createdAt.getTime()
        : b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Apply pagination
    const total = deals.length;
    deals = deals.slice(skip, skip + take);

    return {
      deals,
      total,
      totalPages: Math.ceil(total / take),
    };
  }

  // Get a specific deal by ID
  async findOne(id: string) {
    // Get the deal
    const deal = await this.prisma.productDeal.findUnique({
      where: { id },
    });

    if (!deal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    // Count products with this deal (same parameters)
    const dealsWithSameParams = await this.prisma.productDeal.findMany({
      where: {
        dealType: deal.dealType,
        discount: deal.discount,
        startTime: deal.startTime,
        endTime: deal.endTime,
      },
    });

    return {
      id: deal.id,
      name: `${deal.dealType} Deal (${parseFloat(deal.discount.toString())}% off)`,
      dealType: deal.dealType,
      discount: parseFloat(deal.discount.toString()),
      startTime: deal.startTime,
      endTime: deal.endTime,
      status: this.getDealStatus(deal.startTime, deal.endTime),
      productsCount: dealsWithSameParams.length,
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
    };
  }

  // Create a new deal
  async create(createDealDto: CreateDealDto) {
    const { name, dealType, discount, startTime, endTime } = createDealDto;

    // Validate dates
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (startDate >= endDate) {
      throw new BadRequestException('End time must be after start time');
    }

    try {
      // Create a deal template without forcing association with a real product
      // We'll create a placeholder deal entry that can be used as a template
      // for future product associations

      // Check if we already have a placeholder product for deals
      let placeholderProduct = await this.prisma.product.findFirst({
        where: {
          sku: 'DEAL-PLACEHOLDER',
        },
      });

      // If no placeholder exists, create one
      if (!placeholderProduct) {
        try {
          // Get any category to use for the placeholder
          const anyCategory = await this.prisma.category.findFirst();

          if (!anyCategory) {
            throw new BadRequestException(
              'Cannot create deal: No categories found in system',
            );
          }

          placeholderProduct = await this.prisma.product.create({
            data: {
              title: 'Deal Template - Do Not Delete',
              description:
                'This is a placeholder product used for deal creation. Do not delete.',
              slug: 'deal-placeholder-' + Date.now(),
              sku: 'DEAL-PLACEHOLDER',
              price: new Prisma.Decimal(0),
              categoryId: anyCategory.id,
              visibility: 'HIDDEN',
              isActive: false,
            },
          });
        } catch (error) {
          console.error('Error creating placeholder product:', error);
          throw new BadRequestException('Failed to initialize deal system');
        }
      }

      // Create the deal using our placeholder product
      const deal = await this.prisma.productDeal.create({
        data: {
          productId: placeholderProduct.id,
          dealType,
          discount: new Prisma.Decimal(discount),
          startTime: startDate,
          endTime: endDate,
        },
      });

      return {
        id: deal.id,
        name:
          name ||
          `${deal.dealType} Deal (${parseFloat(deal.discount.toString())}% off)`,
        dealType: deal.dealType,
        discount: parseFloat(deal.discount.toString()),
        startTime: deal.startTime,
        endTime: deal.endTime,
        status: this.getDealStatus(deal.startTime, deal.endTime),
        productsCount: 0, // No real products associated yet
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to create deal: ${error.message}`);
    }
  }

  // Update existing deals
  async update(id: string, updateDealDto: UpdateDealDto) {
    // Find the template deal
    const existingDeal = await this.prisma.productDeal.findUnique({
      where: { id },
    });

    if (!existingDeal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    // Validate dates if both are provided
    let startDate = existingDeal.startTime;
    let endDate = existingDeal.endTime;

    if (updateDealDto.startTime) {
      startDate = new Date(updateDealDto.startTime);
    }

    if (updateDealDto.endTime) {
      endDate = new Date(updateDealDto.endTime);
    }

    if (startDate >= endDate) {
      throw new BadRequestException('End time must be after start time');
    }

    // Find all deals with the same parameters as the template
    const dealsToUpdate = await this.prisma.productDeal.findMany({
      where: {
        dealType: existingDeal.dealType,
        discount: existingDeal.discount,
        startTime: existingDeal.startTime,
        endTime: existingDeal.endTime,
      },
    });

    // Prepare data for update
    const data: Prisma.ProductDealUpdateInput = {};

    if (updateDealDto.dealType !== undefined)
      data.dealType = updateDealDto.dealType;
    if (updateDealDto.discount !== undefined)
      data.discount = new Prisma.Decimal(updateDealDto.discount);
    if (updateDealDto.startTime !== undefined) data.startTime = startDate;
    if (updateDealDto.endTime !== undefined) data.endTime = endDate;

    // Update all deals with the same parameters
    await Promise.all(
      dealsToUpdate.map((deal) =>
        this.prisma.productDeal.update({
          where: { id: deal.id },
          data,
        }),
      ),
    );

    // Get the updated template deal
    const updatedDeal = await this.prisma.productDeal.findUnique({
      where: { id },
    });

    if (!updatedDeal) {
      throw new NotFoundException(
        `Deal with ID ${id} was not found after update`,
      );
    }

    return {
      id: updatedDeal.id,
      name:
        updateDealDto.name ||
        `${updatedDeal.dealType} Deal (${parseFloat(updatedDeal.discount.toString())}% off)`,
      dealType: updatedDeal.dealType,
      discount: parseFloat(updatedDeal.discount.toString()),
      startTime: updatedDeal.startTime,
      endTime: updatedDeal.endTime,
      status: this.getDealStatus(updatedDeal.startTime, updatedDeal.endTime),
      productsCount: dealsToUpdate.length,
      createdAt: updatedDeal.createdAt,
      updatedAt: updatedDeal.updatedAt,
    };
  }

  // Delete a deal and all related deals
  async remove(id: string) {
    // Find the template deal
    const existingDeal = await this.prisma.productDeal.findUnique({
      where: { id },
    });

    if (!existingDeal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    // Find all deals with the same parameters as the template
    const dealsToDelete = await this.prisma.productDeal.findMany({
      where: {
        dealType: existingDeal.dealType,
        discount: existingDeal.discount,
        startTime: existingDeal.startTime,
        endTime: existingDeal.endTime,
      },
    });

    // Delete all deals with the same parameters
    await Promise.all(
      dealsToDelete.map((deal) =>
        this.prisma.productDeal.delete({
          where: { id: deal.id },
        }),
      ),
    );

    return { success: true };
  }

  // Get products in a deal
  async getProducts(
    dealId: string,
    params: {
      skip?: number;
      take?: number;
    },
  ) {
    // Find the template deal
    const deal = await this.prisma.productDeal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      throw new NotFoundException(`Deal with ID ${dealId} not found`);
    }

    // Find all deals with the same parameters
    const dealsWithSameParams = await this.prisma.productDeal.findMany({
      where: {
        dealType: deal.dealType,
        discount: deal.discount,
        startTime: deal.startTime,
        endTime: deal.endTime,
      },
    });

    // Extract product IDs
    const productIds = dealsWithSameParams.map((d) => d.productId);

    // Get products with pagination
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      skip: params.skip,
      take: params.take,
      include: {
        category: true,
        brand: true,
        images: true,
      },
    });

    // Get total count
    const total = productIds.length;

    return {
      products,
      total,
      totalPages: params.take ? Math.ceil(total / params.take) : 1,
    };
  }

  // Add a product to a deal
  async addProduct(dealId: string, productId: string) {
    // Find the template deal
    let deal;
    try {
      deal = await this.prisma.productDeal.findUnique({
        where: { id: dealId },
      });
    } catch (error) {
      console.error(`Database error looking up deal ${dealId}:`, error);
      throw new InternalServerErrorException(
        `Error accessing deal database: ${error.message}`,
      );
    }

    if (!deal) {
      console.warn(
        `Deal with ID ${dealId} not found when trying to add product ${productId}`,
      );
      throw new NotFoundException(`Deal with ID ${dealId} not found`);
    }

    // Check if product exists
    let product;
    try {
      product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
    } catch (error) {
      console.error(`Database error looking up product ${productId}:`, error);
      throw new InternalServerErrorException(
        `Error accessing product database: ${error.message}`,
      );
    }

    if (!product) {
      console.warn(
        `Product with ID ${productId} not found when trying to add to deal ${dealId}`,
      );
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Check if product already has this deal
    let existingProductDeal;
    try {
      existingProductDeal = await this.prisma.productDeal.findFirst({
        where: {
          productId,
          dealType: deal.dealType,
          discount: deal.discount,
          startTime: deal.startTime,
          endTime: deal.endTime,
        },
      });
    } catch (error) {
      console.error(
        `Database error checking existing deal relationship:`,
        error,
      );
      throw new InternalServerErrorException(
        `Error checking existing deals: ${error.message}`,
      );
    }

    if (existingProductDeal) {
      throw new BadRequestException(`Product already has this deal`);
    }

    // Add product to the deal by creating a new ProductDeal entry
    try {
      await this.prisma.productDeal.create({
        data: {
          productId,
          dealType: deal.dealType,
          discount: deal.discount,
          startTime: deal.startTime,
          endTime: deal.endTime,
        },
      });

      return {
        success: true,
        message: `Product ${productId} successfully added to deal ${dealId}`,
      };
    } catch (error) {
      console.error(`Failed to create product deal relationship:`, error);
      throw new InternalServerErrorException(
        `Failed to add product to deal: ${error.message}`,
      );
    }
  }

  // Remove a product from a deal
  async removeProduct(dealId: string, productId: string) {
    // Find the template deal
    const deal = await this.prisma.productDeal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      throw new NotFoundException(`Deal with ID ${dealId} not found`);
    }

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Check if product has this deal
    const existingProductDeal = await this.prisma.productDeal.findFirst({
      where: {
        productId,
        dealType: deal.dealType,
        discount: deal.discount,
        startTime: deal.startTime,
        endTime: deal.endTime,
      },
    });

    if (!existingProductDeal) {
      throw new BadRequestException(`Product does not have this deal`);
    }

    // Remove product from the deal
    await this.prisma.productDeal.delete({
      where: { id: existingProductDeal.id },
    });

    return { success: true };
  }

  // Get products by deal type with filtering
  async getProductsByDealType(
    dealType: DealType,
    params: {
      skip?: number;
      take?: number;
      status?: 'Active' | 'Upcoming' | 'Ended';
    },
  ) {
    const { skip = 0, take = 10, status } = params;

    try {
      // Get current date for status filtering
      const now = new Date();

      // Build the where clause for deal status if needed
      let dealTimeFilter: Prisma.ProductDealWhereInput = {};

      if (status === 'Active') {
        dealTimeFilter = {
          startTime: { lte: now },
          endTime: { gte: now },
        };
      } else if (status === 'Upcoming') {
        dealTimeFilter = {
          startTime: { gt: now },
        };
      } else if (status === 'Ended') {
        dealTimeFilter = {
          endTime: { lt: now },
        };
      }

      // Find all product deals matching the type and status
      const productDeals = await this.prisma.productDeal.findMany({
        where: {
          dealType,
          ...dealTimeFilter,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Extract unique product IDs (avoiding duplicates)
      const productIds = [
        ...new Set(productDeals.map((deal) => deal.productId)),
      ];

      // Skip placeholder product used for deal templates
      const realProductIds = await Promise.all(
        productIds.map(async (id) => {
          const product = await this.prisma.product.findUnique({
            where: { id },
            select: { sku: true },
          });
          return product?.sku !== 'DEAL-PLACEHOLDER' ? id : null;
        }),
      ).then((ids) => ids.filter((id) => id !== null));

      // Get products with pagination
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: realProductIds },
          isActive: true,
          visibility: 'PUBLIC',
        },
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          category: true,
          brand: true,
          images: {
            orderBy: {
              position: 'asc',
            },
          },
          reviews: {
            take: 3,
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      // Get total count for pagination
      const total = realProductIds.length;

      // Transform products to ensure consistent format with other endpoints
      const transformedProducts = products.map((product) => {
        // Handle prices safely
        const price =
          typeof product.price === 'string'
            ? parseFloat(product.price)
            : Number(product.price);

        const discountPrice = product.discountPrice
          ? typeof product.discountPrice === 'string'
            ? parseFloat(product.discountPrice)
            : Number(product.discountPrice)
          : null;

        // Calculate badge from product data
        let badge: string | undefined = undefined;

        if (product.isFeatured === true) {
          badge = 'Featured';
        } else if (
          discountPrice &&
          price &&
          (price - discountPrice) / price > 0.05
        ) {
          badge = 'Sale';
        }

        // If we have both a price and a discountPrice, always set the originalPrice
        let originalPrice: number | undefined = undefined;

        if (discountPrice && price && discountPrice < price) {
          originalPrice = price;
        } else if (product.isFeatured === true && !discountPrice && price) {
          originalPrice = parseFloat((price * 1.1).toFixed(2));
        }

        // Only include rating and review count if they have meaningful values
        const rating =
          product.averageRating && product.averageRating > 0
            ? product.averageRating
            : undefined;
        const reviewCount =
          product.reviewCount && product.reviewCount > 0
            ? product.reviewCount
            : undefined;

        return {
          id: product.id,
          title: product.title,
          slug: product.slug,
          price: discountPrice || price,
          originalPrice,
          currency: product.currency || 'INR',
          images: product.images.map((img) => ({
            id: img.id,
            imageUrl: img.imageUrl,
            altText: img.altText,
          })),
          badge,
          rating,
          reviewCount,
          // Safely check for these properties
          isAssured: product['isAssured'] === true,
          hasFreeDel: product['freeShipping'] === true,
          isFeatured: product.isFeatured === true,
          dealType: dealType,
        };
      });

      return {
        products: transformedProducts,
        total,
        totalPages: Math.ceil(total / take),
        page: Math.floor(skip / take) + 1,
        limit: take,
        dealType,
      };
    } catch (error) {
      console.error(
        `Error fetching products by deal type: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to fetch products by deal type: ${error.message}`,
      );
    }
  }

  // Enhanced methods for deal validation and usage tracking

  /**
   * Apply a deal to a product with validation
   */
  async applyDealToProduct(
    productDealId: string,
    userId: string,
    productId: string,
    orderId?: string,
  ): Promise<{
    success: boolean;
    message: string;
    discountAmount?: number;
  }> {
    try {
      // 1. Validate deal application
      const validation = await this.dealValidationService.validateDealApplication(
        productDealId,
        userId,
        productId,
      );

      if (!validation.isValid) {
        return {
          success: false,
          message: validation.reason || 'Deal cannot be applied',
        };
      }

      // 2. Get deal details
      const deal = await this.prisma.productDeal.findUnique({
        where: { id: productDealId },
        include: { product: true },
      });

      if (!deal) {
        return { success: false, message: 'Deal not found' };
      }

      // 3. Calculate discount amount
      const productPrice = typeof deal.product.price === 'string' 
        ? parseFloat(deal.product.price) 
        : Number(deal.product.price);
      
      const discountAmount = (productPrice * Number(deal.discount)) / 100;

      // 4. Record deal usage
      await this.dealValidationService.recordDealUsage(
        productDealId,
        userId,
        orderId,
      );

      return {
        success: true,
        message: 'Deal applied successfully',
        discountAmount,
      };
    } catch (error) {
      console.error('Error applying deal to product:', error);
      return {
        success: false,
        message: 'Failed to apply deal',
      };
    }
  }

  /**
   * Set usage limits for a deal
   */
  async setDealLimits(
    productDealId: string,
    maxTotalUsage?: number,
    maxUserUsage?: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check if deal exists
      const deal = await this.prisma.productDeal.findUnique({
        where: { id: productDealId },
      });

      if (!deal) {
        return { success: false, message: 'Deal not found' };
      }

      await this.dealValidationService.setDealLimits(
        productDealId,
        maxTotalUsage,
        maxUserUsage,
      );

      return { success: true, message: 'Deal limits set successfully' };
    } catch (error) {
      console.error('Error setting deal limits:', error);
      return { success: false, message: 'Failed to set deal limits' };
    }
  }

  /**
   * Get deal usage statistics
   */
  async getDealStats(productDealId: string): Promise<{
    totalUsage: number;
    uniqueUsers: number;
    recentUsage: Date[];
    limits?: {
      maxTotalUsage?: number;
      maxUserUsage?: number;
      currentUsage: number;
    };
  }> {
    try {
      const [usageStats, limits] = await Promise.all([
        this.dealValidationService.getDealUsageStats(productDealId),
        this.prisma.dealLimits.findUnique({
          where: { productDealId },
        }),
      ]);

      return {
        ...usageStats,
        limits: limits ? {
          maxTotalUsage: limits.maxTotalUsage ?? undefined,
          maxUserUsage: limits.maxUserUsage ?? undefined,
          currentUsage: limits.currentUsage,
        } : undefined,
      };
    } catch (error) {
      console.error('Error getting deal stats:', error);
      throw new InternalServerErrorException('Failed to get deal statistics');
    }
  }

  /**
   * Validate product availability before adding to deal
   */
  async validateProductForDeal(productId: string): Promise<{
    isValid: boolean;
    reason?: string;
    product?: any;
  }> {
    try {
      const validation = await this.dealValidationService.validateProductAvailability(productId);
      
      if (!validation.isAvailable) {
        return {
          isValid: false,
          reason: validation.reason,
        };
      }

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          brand: true,
          images: true,
        },
      });

      return {
        isValid: true,
        product,
      };
    } catch (error) {
      console.error('Error validating product for deal:', error);
      return {
        isValid: false,
        reason: 'Internal error during validation',
      };
    }
  }

  /**
   * Enhanced add product method with validation
   */
  async addProductWithValidation(
    dealId: string,
    productId: string,
    maxUsage?: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Validate product availability
      const productValidation = await this.validateProductForDeal(productId);
      
      if (!productValidation.isValid) {
        return {
          success: false,
          message: productValidation.reason || 'Product cannot be added to deal',
        };
      }

      // 2. Check if product already has this deal
      const existingDeal = await this.prisma.productDeal.findFirst({
        where: {
          productId,
          dealType: (await this.prisma.productDeal.findUnique({
            where: { id: dealId },
          }))?.dealType,
        },
      });

      if (existingDeal) {
        return {
          success: false,
          message: 'Product already has a deal of this type',
        };
      }

      // 3. Add product to deal
      await this.addProduct(dealId, productId);

      // 4. Set usage limits if provided
      if (maxUsage) {
        await this.setDealLimits(dealId, undefined, maxUsage);
      }

      return {
        success: true,
        message: 'Product added to deal successfully',
      };
    } catch (error) {
      console.error('Error adding product with validation:', error);
      return {
        success: false,
        message: 'Failed to add product to deal',
      };
    }
  }
}
