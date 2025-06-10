import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@prisma/client';
import {
  AddToCartDto,
  UpdateCartItemDto,
  CartResponseDto,
  CartItemResponseDto,
} from './dto';
import { AppLogger } from '../../common/services/logger.service';

@Injectable()
export class CartsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('CartsService');
  }

  async getCartByUserId(userId: string): Promise<CartResponseDto> {
    try {
      // Find or create the cart for the user
      let cart = await this.prismaService.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  price: true,
                  discountPrice: true,
                  images: {
                    take: 1,
                    orderBy: {
                      position: 'asc',
                    },
                    select: {
                      imageUrl: true,
                    },
                  },
                },
              },
              variant: {
                select: {
                  id: true,
                  variantName: true,
                  price: true,
                  sku: true,
                },
              },
            },
          },
        },
      });

      // If cart doesn't exist, create a new one
      if (!cart) {
        cart = await this.prismaService.cart.create({
          data: {
            userId,
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    price: true,
                    discountPrice: true,
                    images: {
                      take: 1,
                      orderBy: {
                        position: 'asc',
                      },
                      select: {
                        imageUrl: true,
                      },
                    },
                  },
                },
                variant: {
                  select: {
                    id: true,
                    variantName: true,
                    price: true,
                    sku: true,
                  },
                },
              },
            },
          },
        });
      }

      return this.transformCartToDto(cart);
    } catch (error) {
      this.logger.error(
        `Error retrieving cart for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve cart for user ${userId}`,
      );
    }
  }

  async addToCart(
    userId: string,
    addToCartDto: AddToCartDto,
  ): Promise<CartResponseDto> {
    try {
      const { productId, variantId, quantity } = addToCartDto;

      // Validate product existence and active status
      const product = await this.prismaService.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          isActive: true,
          stockQuantity: true,
          price: true,
          discountPrice: true,
        },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      if (!product.isActive) {
        throw new BadRequestException(
          `Product with ID ${productId} is not available`,
        );
      }

      // Check variant if provided
      let selectedPrice = product.discountPrice || product.price;
      let availableStock = product.stockQuantity;

      if (variantId) {
        const variant = await this.prismaService.productVariant.findUnique({
          where: { id: variantId },
          select: {
            id: true,
            productId: true,
            price: true,
            stockQuantity: true,
          },
        });

        if (!variant) {
          throw new NotFoundException(`Variant with ID ${variantId} not found`);
        }

        if (variant.productId !== productId) {
          throw new BadRequestException(
            `Variant with ID ${variantId} does not belong to product with ID ${productId}`,
          );
        }

        selectedPrice = variant.price;
        availableStock = variant.stockQuantity;
      }

      // Check stock availability
      if (availableStock < quantity) {
        throw new BadRequestException(
          `Not enough stock available. Requested: ${quantity}, Available: ${availableStock}`,
        );
      }

      // Start transaction to handle cart and cart item operations
      return await this.prismaService.$transaction(async (prisma) => {
        // Find or create the cart
        let cart = await prisma.cart.findUnique({
          where: { userId },
        });

        if (!cart) {
          cart = await prisma.cart.create({
            data: {
              userId,
            },
          });
        }

        // Check if the item already exists in the cart
        const existingCartItem = await prisma.cartItem.findFirst({
          where: {
            cartId: cart.id,
            productId,
            variantId,
          },
        });

        let cartItem;

        if (existingCartItem) {
          // Update the existing cart item
          cartItem = await prisma.cartItem.update({
            where: { id: existingCartItem.id },
            data: {
              quantity: existingCartItem.quantity + quantity,
            },
          });
        } else {
          // Create a new cart item
          cartItem = await prisma.cartItem.create({
            data: {
              cartId: cart.id,
              productId,
              variantId,
              quantity,
            },
          });
        }

        // Return the updated cart
        const updatedCart = await prisma.cart.findUnique({
          where: { id: cart.id },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    price: true,
                    discountPrice: true,
                    images: {
                      take: 1,
                      orderBy: {
                        position: 'asc',
                      },
                      select: {
                        imageUrl: true,
                      },
                    },
                  },
                },
                variant: {
                  select: {
                    id: true,
                    variantName: true,
                    price: true,
                    sku: true,
                  },
                },
              },
            },
          },
        });

        return this.transformCartToDto(updatedCart);
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error adding item to cart for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to add item to cart');
    }
  }

  async updateCartItem(
    userId: string,
    cartItemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    try {
      const { quantity } = updateCartItemDto;

      // Find the cart
      const cart = await this.prismaService.cart.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!cart) {
        throw new NotFoundException(`Cart for user ${userId} not found`);
      }

      // Check if the cart item exists and belongs to the user's cart
      const cartItem = await this.prismaService.cartItem.findFirst({
        where: {
          id: cartItemId,
          cartId: cart.id,
        },
        include: {
          product: {
            select: {
              id: true,
              stockQuantity: true,
            },
          },
          variant: {
            select: {
              id: true,
              stockQuantity: true,
            },
          },
        },
      });

      if (!cartItem) {
        throw new NotFoundException(
          `Cart item with ID ${cartItemId} not found in user's cart`,
        );
      }

      // Check stock availability
      const availableStock = cartItem.variant
        ? cartItem.variant.stockQuantity
        : cartItem.product.stockQuantity;

      if (availableStock < quantity) {
        throw new BadRequestException(
          `Not enough stock available. Requested: ${quantity}, Available: ${availableStock}`,
        );
      }

      // Update the cart item
      await this.prismaService.cartItem.update({
        where: { id: cartItemId },
        data: { quantity },
      });

      // Return the updated cart
      const updatedCart = await this.prismaService.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  price: true,
                  discountPrice: true,
                  images: {
                    take: 1,
                    orderBy: {
                      position: 'asc',
                    },
                    select: {
                      imageUrl: true,
                    },
                  },
                },
              },
              variant: {
                select: {
                  id: true,
                  variantName: true,
                  price: true,
                  sku: true,
                },
              },
            },
          },
        },
      });

      return this.transformCartToDto(updatedCart);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error updating cart item ${cartItemId} for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to update cart item');
    }
  }

  async removeCartItem(
    userId: string,
    cartItemId: string,
  ): Promise<CartResponseDto> {
    try {
      // Find the cart
      const cart = await this.prismaService.cart.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!cart) {
        throw new NotFoundException(`Cart for user ${userId} not found`);
      }

      // Check if the cart item exists and belongs to the user's cart
      const cartItem = await this.prismaService.cartItem.findFirst({
        where: {
          id: cartItemId,
          cartId: cart.id,
        },
      });

      if (!cartItem) {
        throw new NotFoundException(
          `Cart item with ID ${cartItemId} not found in user's cart`,
        );
      }

      // Delete the cart item
      await this.prismaService.cartItem.delete({
        where: { id: cartItemId },
      });

      // Return the updated cart
      const updatedCart = await this.prismaService.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  price: true,
                  discountPrice: true,
                  images: {
                    take: 1,
                    orderBy: {
                      position: 'asc',
                    },
                    select: {
                      imageUrl: true,
                    },
                  },
                },
              },
              variant: {
                select: {
                  id: true,
                  variantName: true,
                  price: true,
                  sku: true,
                },
              },
            },
          },
        },
      });

      return this.transformCartToDto(updatedCart);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error removing cart item ${cartItemId} for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to remove cart item');
    }
  }

  async clearCart(userId: string): Promise<CartResponseDto> {
    try {
      // Find the cart
      const cart = await this.prismaService.cart.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!cart) {
        throw new NotFoundException(`Cart for user ${userId} not found`);
      }

      // Delete all cart items
      await this.prismaService.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // Return the empty cart
      const emptyCart = await this.prismaService.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  price: true,
                  discountPrice: true,
                  images: {
                    take: 1,
                    orderBy: {
                      position: 'asc',
                    },
                    select: {
                      imageUrl: true,
                    },
                  },
                },
              },
              variant: {
                select: {
                  id: true,
                  variantName: true,
                  price: true,
                  sku: true,
                },
              },
            },
          },
        },
      });

      return this.transformCartToDto(emptyCart);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error clearing cart for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to clear cart');
    }
  }

  async mergeAnonymousCart(
    userId: string,
    anonymousCartItems: { productId: string; variantId?: string; quantity: number; additionalInfo?: any }[],
  ): Promise<CartResponseDto> {
    try {
      this.logger.log(`Merging anonymous cart for user ${userId} with ${anonymousCartItems.length} items`);
      
      // Use a transaction for atomicity
      return await this.prismaService.$transaction(async (prisma) => {
        // Find or create the cart for the user
        let cart = await prisma.cart.findUnique({
          where: { userId },
        });

        if (!cart) {
          cart = await prisma.cart.create({
            data: {
              userId,
            },
          });
        }

        // Validate all products and variants first to avoid partial merges
        const validatedItems = await Promise.all(
          anonymousCartItems.map(async (item) => {
            try {
              // Validate that product exists and is active
              const product = await prisma.product.findUnique({
                where: { id: item.productId },
                select: {
                  id: true,
                  isActive: true,
                  stockQuantity: true,
                  price: true,
                  discountPrice: true,
                },
              });

              if (!product) {
                this.logger.warn(`Product with ID ${item.productId} not found during cart merge validation`);
                return { valid: false, message: `Product with ID ${item.productId} not found` };
              }

              if (!product.isActive) {
                this.logger.warn(`Product with ID ${item.productId} is not active during cart merge validation`);
                return { valid: false, message: `Product with ID ${item.productId} is not active` };
              }

              // Check variant if provided
              let availableStock = product.stockQuantity;

              if (item.variantId) {
                const variant = await prisma.productVariant.findUnique({
                  where: { id: item.variantId },
                  select: {
                    id: true,
                    productId: true,
                    stockQuantity: true,
                  },
                });

                if (!variant) {
                  this.logger.warn(`Variant with ID ${item.variantId} not found during cart merge validation`);
                  return { valid: false, message: `Variant with ID ${item.variantId} not found` };
                }

                if (variant.productId !== item.productId) {
                  this.logger.warn(`Variant with ID ${item.variantId} does not belong to product with ID ${item.productId} during validation`);
                  return { valid: false, message: `Variant with ID ${item.variantId} does not belong to product with ID ${item.productId}` };
                }

                availableStock = variant.stockQuantity;
              }

              // Adjust quantity based on available stock
              const adjustedQuantity = Math.min(item.quantity, availableStock);
              
              if (adjustedQuantity <= 0) {
                this.logger.warn(`Not enough stock for product ${item.productId} during cart merge validation`);
                return { valid: false, message: `Not enough stock for product ${item.productId}` };
              }

              return {
                valid: true,
                item: {
                  productId: item.productId,
                  variantId: item.variantId,
                  quantity: adjustedQuantity,
                  additionalInfo: item.additionalInfo,
                },
              };
            } catch (error) {
              this.logger.error(`Error validating item ${item.productId}: ${error.message}`);
              return { valid: false, message: `Error validating item: ${error.message}` };
            }
          })
        );

        // Log validation results
        const invalidItems = validatedItems.filter(result => !result.valid);
        if (invalidItems.length > 0) {
          this.logger.warn(`${invalidItems.length} items failed validation during cart merge: ${JSON.stringify(invalidItems)}`);
        }

        // Filter out invalid items and extract valid items
        const validItems = validatedItems
          .filter(result => result.valid && result.item)
          .map(result => {
            // Type assertion since we've already checked validity
            const validResult = result as { valid: true; item: { productId: string; variantId?: string; quantity: number; additionalInfo?: any } };
            return validResult.item;
          });
          
        if (validItems.length === 0) {
          this.logger.warn('No valid items to merge');
          // Just return current cart without modifications
          const currentCart = await prisma.cart.findUnique({
            where: { userId },
            include: {
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                      price: true,
                      discountPrice: true,
                      images: {
                        take: 1,
                        orderBy: { position: 'asc' },
                        select: { imageUrl: true },
                      },
                    },
                  },
                  variant: {
                    select: {
                      id: true,
                      variantName: true,
                      price: true,
                      sku: true,
                    },
                  },
                },
              },
            },
          });
          return this.transformCartToDto(currentCart);
        }

        // Process each validated cart item
        for (const item of validItems) {
          // Check if item already exists in cart
          const existingCartItem = await prisma.cartItem.findFirst({
            where: {
              cartId: cart.id,
              productId: item.productId,
              variantId: item.variantId || null,
            },
          });

          if (existingCartItem) {
            // Update existing cart item quantity (don't handle additionalInfo here as it's not in the schema)
            await prisma.cartItem.update({
              where: { id: existingCartItem.id },
              data: {
                quantity: existingCartItem.quantity + item.quantity,
              },
            });
          } else {
            // Create new cart item (don't include additionalInfo as it's not in the schema)
            await prisma.cartItem.create({
              data: {
                cartId: cart.id,
                productId: item.productId,
                variantId: item.variantId || null,
                quantity: item.quantity,
              },
            });
          }
        }

        // Return the updated cart
        const updatedCart = await prisma.cart.findUnique({
          where: { userId },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    price: true,
                    discountPrice: true,
                    images: {
                      take: 1,
                      orderBy: { position: 'asc' },
                      select: { imageUrl: true },
                    },
                  },
                },
                variant: {
                  select: {
                    id: true,
                    variantName: true,
                    price: true,
                    sku: true,
                  },
                },
              },
            },
          },
        });

        return this.transformCartToDto(updatedCart);
      }, {
        // Transaction options for longer timeout and better isolation
        timeout: 10000, // 10 seconds
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      });
    } catch (error) {
      this.logger.error(
        `Error merging anonymous cart for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to merge anonymous cart: ${error.message}`,
      );
    }
  }

  // Helper method to transform cart to DTO
  private transformCartToDto(cart: any): CartResponseDto {
    const items: CartItemResponseDto[] = cart.items.map((item) => {
      // Get price - use variant price if available, otherwise use product price (with discount if available)
      const unitPrice = item.variant
        ? parseFloat(item.variant.price.toString())
        : item.product.discountPrice
          ? parseFloat(item.product.discountPrice.toString())
          : parseFloat(item.product.price.toString());

      const totalPrice = unitPrice * item.quantity;

      // Extract image URL if available
      const imageUrl =
        item.product.images && item.product.images.length > 0
          ? item.product.images[0].imageUrl
          : null;

      return {
        id: item.id,
        product: {
          id: item.product.id,
          title: item.product.title,
          slug: item.product.slug,
          price: parseFloat(item.product.price.toString()),
          discountPrice: item.product.discountPrice
            ? parseFloat(item.product.discountPrice.toString())
            : null,
          imageUrl,
        },
        variant: item.variant
          ? {
              id: item.variant.id,
              variantName: item.variant.variantName,
              price: parseFloat(item.variant.price.toString()),
              sku: item.variant.sku,
            }
          : null,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    // Calculate subtotal and item count
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      id: cart.id,
      userId: cart.userId,
      items,
      itemCount,
      subtotal,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}
