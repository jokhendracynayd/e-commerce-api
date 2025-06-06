import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { 
  CreateCouponDto, 
  UpdateCouponDto, 
  CouponResponseDto,
  ApplyCouponDto,
  ValidateCouponDto
} from './dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async create(createCouponDto: CreateCouponDto): Promise<CouponResponseDto> {
    const { categoryIds, productIds, ...couponData } = createCouponDto;
    
    // Check if coupon code already exists
    const existingCoupon = await this.prisma.coupon.findUnique({
      where: { code: couponData.code },
    });
    
    if (existingCoupon) {
      throw new ConflictException(`Coupon with code ${couponData.code} already exists`);
    }

    // Create the coupon with transactions to ensure data consistency
    const coupon = await this.prisma.$transaction(async (tx) => {
      // Create the coupon
      const newCoupon = await tx.coupon.create({
        data: {
          ...couponData,
          value: new Decimal(couponData.value),
          minimumPurchase: couponData.minimumPurchase ? new Decimal(couponData.minimumPurchase) : null,
        },
      });

      // Add categories if provided
      if (categoryIds && categoryIds.length > 0) {
        const categoryConnections = categoryIds.map(categoryId => ({
          couponId: newCoupon.id,
          categoryId,
        }));
        
        await tx.couponCategory.createMany({
          data: categoryConnections,
          skipDuplicates: true,
        });
      }

      // Add products if provided
      if (productIds && productIds.length > 0) {
        const productConnections = productIds.map(productId => ({
          couponId: newCoupon.id,
          productId,
        }));
        
        await tx.couponProduct.createMany({
          data: productConnections,
          skipDuplicates: true,
        });
      }

      return newCoupon;
    });

    return this.mapCouponToResponseDto(coupon);
  }

  async findAll(): Promise<CouponResponseDto[]> {
    const coupons = await this.prisma.coupon.findMany({
      include: {
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        products: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    return coupons.map(coupon => this.mapCouponToResponseDto(coupon));
  }

  async findOne(id: string): Promise<CouponResponseDto> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        products: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }

    return this.mapCouponToResponseDto(coupon);
  }

  async findByCode(code: string): Promise<CouponResponseDto> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
      include: {
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        products: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon with code ${code} not found`);
    }

    return this.mapCouponToResponseDto(coupon);
  }

  async update(id: string, updateCouponDto: UpdateCouponDto): Promise<CouponResponseDto> {
    const { categoryIds, productIds, ...couponData } = updateCouponDto;
    
    // Check if coupon exists
    const existingCoupon = await this.prisma.coupon.findUnique({
      where: { id },
    });
    
    if (!existingCoupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }

    // If code is being changed, check if new code already exists
    if (couponData.code && couponData.code !== existingCoupon.code) {
      const codeExists = await this.prisma.coupon.findUnique({
        where: { code: couponData.code },
      });
      
      if (codeExists) {
        throw new ConflictException(`Coupon with code ${couponData.code} already exists`);
      }
    }

    // Update the coupon with transactions to ensure data consistency
    const updatedCoupon = await this.prisma.$transaction(async (tx) => {
      // Update the coupon
      const updated = await tx.coupon.update({
        where: { id },
        data: {
          ...couponData,
          value: couponData.value !== undefined ? new Decimal(couponData.value) : undefined,
          minimumPurchase: couponData.minimumPurchase !== undefined 
            ? couponData.minimumPurchase === null ? null : new Decimal(couponData.minimumPurchase)
            : undefined,
        },
      });

      // Update categories if provided
      if (categoryIds) {
        // Remove existing categories
        await tx.couponCategory.deleteMany({
          where: { couponId: id },
        });

        // Add new categories
        if (categoryIds.length > 0) {
          const categoryConnections = categoryIds.map(categoryId => ({
            couponId: id,
            categoryId,
          }));
          
          await tx.couponCategory.createMany({
            data: categoryConnections,
            skipDuplicates: true,
          });
        }
      }

      // Update products if provided
      if (productIds) {
        // Remove existing products
        await tx.couponProduct.deleteMany({
          where: { couponId: id },
        });

        // Add new products
        if (productIds.length > 0) {
          const productConnections = productIds.map(productId => ({
            couponId: id,
            productId,
          }));
          
          await tx.couponProduct.createMany({
            data: productConnections,
            skipDuplicates: true,
          });
        }
      }

      return updated;
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    // Check if coupon exists
    const existingCoupon = await this.prisma.coupon.findUnique({
      where: { id },
    });
    
    if (!existingCoupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }

    // Check if coupon has been used
    const usageCount = await this.prisma.couponUsage.count({
      where: { couponId: id },
    });

    if (usageCount > 0) {
      // If coupon has been used, just disable it instead of deleting
      await this.prisma.coupon.update({
        where: { id },
        data: { status: 'DISABLED' },
      });
    } else {
      // If coupon hasn't been used, delete it
      await this.prisma.coupon.delete({
        where: { id },
      });
    }
  }

  async validate(validateCouponDto: ValidateCouponDto): Promise<{ valid: boolean; message?: string }> {
    const { code, userId } = validateCouponDto;

    try {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code },
        include: {
          categories: true,
          products: true,
        },
      });

      if (!coupon) {
        return { valid: false, message: 'Coupon not found' };
      }

      // Check if coupon is active
      if (coupon.status !== 'ACTIVE') {
        return { valid: false, message: 'Coupon is not active' };
      }

      // Check if coupon is within valid date range
      const now = new Date();
      if (now < coupon.startDate) {
        return { valid: false, message: 'Coupon is not yet active' };
      }
      
      if (now > coupon.endDate) {
        return { valid: false, message: 'Coupon has expired' };
      }

      // Check if coupon has reached usage limit
      if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
        return { valid: false, message: 'Coupon usage limit reached' };
      }

      // Check if user has reached per-user limit
      if (userId && coupon.perUserLimit !== null) {
        const userUsageCount = await this.prisma.couponUsage.count({
          where: {
            couponId: coupon.id,
            userId,
          },
        });

        if (userUsageCount >= coupon.perUserLimit) {
          return { valid: false, message: 'You have reached the usage limit for this coupon' };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, message: 'Error validating coupon' };
    }
  }

  async applyCoupon(applyCouponDto: ApplyCouponDto): Promise<{ discountAmount: string; couponCode: string }> {
    const { code, userId, subtotal, cartItems } = applyCouponDto;

    // First validate the coupon
    const validation = await this.validate({ code, userId });
    if (!validation.valid) {
      throw new BadRequestException(validation.message);
    }

    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        products: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon with code ${code} not found`);
    }

    // Check minimum purchase requirement
    if (coupon.minimumPurchase && new Decimal(subtotal).lessThan(coupon.minimumPurchase)) {
      throw new BadRequestException(`Minimum purchase of ${coupon.minimumPurchase} required`);
    }

    // Calculate discount amount based on coupon type
    let discountAmount = new Decimal(0);
    
    if (coupon.type === 'PERCENTAGE') {
      // For percentage, calculate discount based on eligible items if there are product/category restrictions
      if (cartItems && (coupon.products.length > 0 || coupon.categories.length > 0)) {
        let eligibleSubtotal = new Decimal(0);
        
        // Fetch products for the cart items to get their categories
        const productIds = cartItems.map(item => item.productId);
        const products = await this.prisma.product.findMany({
          where: { id: { in: productIds } },
        });
        
        // Create a map for easy lookup
        const productMap = new Map(products.map(p => [p.id, p]));
        
        // Get sets of eligible product IDs and category IDs
        const eligibleProductIds = new Set(coupon.products.map(p => p.productId));
        const eligibleCategoryIds = new Set(coupon.categories.map(c => c.categoryId));
        
        // Calculate eligible subtotal
        for (const item of cartItems) {
          const product = productMap.get(item.productId);
          
          if (!product) continue;
          
          // Check if product is directly eligible
          if (eligibleProductIds.has(product.id)) {
            eligibleSubtotal = eligibleSubtotal.plus(
              new Decimal(product.price).times(item.quantity)
            );
            continue;
          }
          
          // Check if product belongs to an eligible category
          if (eligibleCategoryIds.size > 0) {
            // Check if product's category or subcategory is eligible
            if ((product.categoryId && eligibleCategoryIds.has(product.categoryId)) || 
                (product.subCategoryId && eligibleCategoryIds.has(product.subCategoryId))) {
              eligibleSubtotal = eligibleSubtotal.plus(
                new Decimal(product.price).times(item.quantity)
              );
            }
          }
        }
        
        // If no eligible items but there are restrictions, return zero discount
        if (eligibleSubtotal.equals(0) && (eligibleProductIds.size > 0 || eligibleCategoryIds.size > 0)) {
          return { discountAmount: '0', couponCode: code };
        }
        
        // Calculate percentage discount on eligible subtotal
        discountAmount = eligibleSubtotal.times(coupon.value).dividedBy(100);
      } else {
        // If no restrictions or no cart items provided, apply to entire subtotal
        discountAmount = new Decimal(subtotal).times(coupon.value).dividedBy(100);
      }
    } else if (coupon.type === 'FIXED_AMOUNT') {
      // For fixed amount, just use the value
      discountAmount = coupon.value;
      
      // Make sure discount doesn't exceed subtotal
      if (discountAmount.greaterThan(subtotal)) {
        discountAmount = new Decimal(subtotal);
      }
    } else if (coupon.type === 'FREE_SHIPPING') {
      // For free shipping, the value in the coupon represents the max shipping discount
      // In this implementation, we just return the value since the actual shipping
      // discount calculation would happen in the order service
      discountAmount = coupon.value;
    }

    return {
      discountAmount: discountAmount.toString(),
      couponCode: code,
    };
  }

  async recordCouponUsage(
    orderId: string, 
    userId: string, 
    couponCode: string, 
    discountAmount: string | number
  ): Promise<void> {
    try {
      // Find the coupon
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: couponCode },
      });
      
      if (!coupon) {
        throw new NotFoundException(`Coupon with code ${couponCode} not found`);
      }
      
      // Record usage
      await this.prisma.$transaction([
        // Create usage record
        this.prisma.couponUsage.create({
          data: {
            couponId: coupon.id,
            userId,
            orderId,
            discountAmount: new Decimal(discountAmount),
          },
        }),
        
        // Increment usage count
        this.prisma.coupon.update({
          where: { id: coupon.id },
          data: {
            usageCount: { increment: 1 },
          },
        }),
      ]);
    } catch (error) {
      console.error('Error recording coupon usage:', error);
      // Don't throw here to avoid disrupting the order process
      // but log the error for monitoring
    }
  }

  // Helper method to map Prisma coupon to response DTO
  private mapCouponToResponseDto(coupon: any): CouponResponseDto {
    return {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: typeof coupon.value === 'object' ? coupon.value.toString() : coupon.value,
      description: coupon.description,
      minimumPurchase: coupon.minimumPurchase ? coupon.minimumPurchase.toString() : null,
      usageLimit: coupon.usageLimit,
      usageCount: coupon.usageCount,
      perUserLimit: coupon.perUserLimit,
      startDate: coupon.startDate.toISOString(),
      endDate: coupon.endDate.toISOString(),
      status: coupon.status,
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
      categories: coupon.categories?.map(cat => ({
        id: cat.category.id,
        name: cat.category.name,
      })),
      products: coupon.products?.map(prod => ({
        id: prod.product.id,
        title: prod.product.title,
      })),
    };
  }
} 