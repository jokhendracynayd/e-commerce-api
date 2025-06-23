import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  WishlistResponseDto,
  WishlistAddResponseDto,
  WishlistRemoveResponseDto,
} from './dto';
import { AddToWishlistDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Get the current user's wishlist
   */
  async getWishlist(userId: string): Promise<WishlistResponseDto> {
    try {
      // Get wishlist items with product details
      const wishlistItems = await this.prismaService.wishlistItem.findMany({
        where: { userId },
        include: {
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
                },
                take: 1,
              },
            },
          },
        },
        orderBy: { addedAt: 'desc' },
      });

      // Map to the expected response format
      const items = wishlistItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        userId: item.userId,
        addedAt: item.addedAt,
        product: {
          id: item.product.id,
          title: item.product.title,
          slug: item.product.slug,
          price: item.product.price.toNumber(),
          discountPrice: item.product.discountPrice?.toNumber() || null,
          imageUrl: item.product.images[0]?.imageUrl || null,
        },
      }));

      return {
        items,
        total: items.length,
      };
    } catch (error) {
      this.logger.error(`Error getting wishlist for user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to get wishlist items');
    }
  }

  /**
   * Add a product to the wishlist
   */
  async addToWishlist(
    userId: string,
    addToWishlistDto: AddToWishlistDto,
  ): Promise<WishlistAddResponseDto> {
    const { productId } = addToWishlistDto;

    try {
      // Check if product exists
      const product = await this.prismaService.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Check if the item is already in the wishlist
      const existingItem = await this.prismaService.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });

      if (existingItem) {
        return {
          success: true,
          message: 'Item is already in your wishlist',
          item: await this.getWishlistItem(existingItem.id),
        };
      }

      // Add item to wishlist
      const wishlistItem = await this.prismaService.wishlistItem.create({
        data: {
          userId,
          productId,
        },
      });

      // Get full item details
      const newItem = await this.getWishlistItem(wishlistItem.id);

      return {
        success: true,
        message: 'Item added to wishlist successfully',
        item: newItem,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(`Product with ID ${productId} not found`);
      }

      this.logger.error(
        `Error adding product ${productId} to wishlist for user ${userId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to add item to wishlist');
    }
  }

  /**
   * Remove a product from the wishlist
   */
  async removeFromWishlist(
    userId: string,
    productId: string,
  ): Promise<WishlistRemoveResponseDto> {
    try {
      // Check if the item exists in the wishlist
      const wishlistItem = await this.prismaService.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });

      if (!wishlistItem) {
        throw new NotFoundException(
          `Item with product ID ${productId} not found in your wishlist`,
        );
      }

      // Remove item from wishlist
      await this.prismaService.wishlistItem.delete({
        where: {
          id: wishlistItem.id,
        },
      });

      return {
        success: true,
        message: 'Item removed from wishlist successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error removing product ${productId} from wishlist for user ${userId}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to remove item from wishlist',
      );
    }
  }

  /**
   * Check if a product is in the user's wishlist
   */
  async isProductInWishlist(
    userId: string,
    productId: string,
  ): Promise<boolean> {
    try {
      const count = await this.prismaService.wishlistItem.count({
        where: {
          userId,
          productId,
        },
      });

      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking if product ${productId} is in wishlist for user ${userId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to check wishlist status');
    }
  }

  /**
   * Helper method to get a single wishlist item with product details
   */
  private async getWishlistItem(id: string) {
    const item = await this.prismaService.wishlistItem.findUnique({
      where: { id },
      include: {
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
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Wishlist item with ID ${id} not found`);
    }

    return {
      id: item.id,
      productId: item.productId,
      userId: item.userId,
      addedAt: item.addedAt,
      product: {
        id: item.product.id,
        title: item.product.title,
        slug: item.product.slug,
        price: item.product.price.toNumber(),
        discountPrice: item.product.discountPrice?.toNumber() || null,
        imageUrl: item.product.images[0]?.imageUrl || null,
      },
    };
  }
}
