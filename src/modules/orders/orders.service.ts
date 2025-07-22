import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  Prisma,
  OrderStatus,
  PaymentStatus,
  InventoryChangeType,
} from '@prisma/client';
import {
  CreateOrderDto,
  UpdateOrderDto,
  OrderResponseDto,
  OrderFilterDto,
  PaginatedOrderResponseDto,
  OrderTimelineDto,
} from './dto';
import { AppLogger } from '../../common/services/logger.service';
import { generateOrderNumber } from '../../common/utils/order-number';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('OrdersService');
  }

  async findAll(filterDto: OrderFilterDto): Promise<PaginatedOrderResponseDto> {
    try {
      const {
        page = 1,
        limit = 10,
        userId,
        orderNumber,
        status,
        paymentStatus,
        startDate,
        endDate,
        sortBy = 'placedAt',
        sortOrder = 'desc',
        currency,
      } = filterDto;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.OrderWhereInput = {};

      if (userId) {
        where.userId = userId;
      }

      if (orderNumber) {
        where.orderNumber = {
          contains: orderNumber,
          mode: 'insensitive',
        };
      }

      if (status) {
        where.status = status;
      }

      if (paymentStatus) {
        where.paymentStatus = paymentStatus;
      }

      if (startDate || endDate) {
        where.placedAt = {};

        if (startDate) {
          where.placedAt.gte = startDate;
        }

        if (endDate) {
          where.placedAt.lte = endDate;
        }
      }

      if (currency) {
        where.currency = currency;
      }

      // Build order by
      const orderBy: Prisma.OrderOrderByWithRelationInput = {};
      orderBy[sortBy] = sortOrder;

      // Execute query with count
      const [orders, total] = await Promise.all([
        this.prismaService.order.findMany({
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
                email: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
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
                    sku: true,
                  },
                },
              },
            },
          },
        }),
        this.prismaService.order.count({ where }),
      ]);

      // Transform orders to match OrderResponseDto
      const transformedOrders = orders.map((order) =>
        this.transformOrderToDto(order),
      );

      // Calculate pagination values
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        data: transformedOrders,
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    } catch (error) {
      this.logger.error(
        `Error retrieving orders: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to retrieve orders');
    }
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    try {
      const order = await this.prismaService.order.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
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
                  sku: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      return this.transformOrderToDto(order);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error retrieving order ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve order with ID ${id}`,
      );
    }
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderResponseDto> {
    try {
      const order = await this.prismaService.order.findUnique({
        where: { orderNumber },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
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
                  sku: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException(
          `Order with number ${orderNumber} not found`,
        );
      }

      return this.transformOrderToDto(order);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error retrieving order by number ${orderNumber}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve order with number ${orderNumber}`,
      );
    }
  }

  async create(createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
    try {
      // Validate items in order
      if (!createOrderDto.items || createOrderDto.items.length === 0) {
        throw new BadRequestException('Order must contain at least one item');
      }

      // Begin transaction with serializable isolation level to prevent race conditions
      const result = await this.prismaService.$transaction(
        async (prisma) => {
          // Generate order number
          const orderNumber = generateOrderNumber();

          // Calculate prices and check inventory against reservations
          const itemsWithPrices = await Promise.all(
            createOrderDto.items.map(async (item) => {
              // Get product
              const product = await prisma.product.findUnique({
                where: { id: item.productId },
                select: {
                  id: true,
                  title: true,
                  price: true,
                  discountPrice: true,
                  isActive: true,
                  currency: true,
                },
              });

              if (!product) {
                throw new BadRequestException(
                  `Product with ID ${item.productId} not found`,
                );
              }

              if (!product.isActive) {
                throw new BadRequestException(
                  `Product ${product.title} is not active`,
                );
              }

              // Check variant if provided
              let variantInfo: any = null;
              let price = product.discountPrice || product.price;

              if (item.variantId) {
                const variant = await prisma.productVariant.findUnique({
                  where: { id: item.variantId },
                  select: {
                    id: true,
                    variantName: true,
                    price: true,
                    productId: true,
                  },
                });

                if (!variant) {
                  throw new BadRequestException(
                    `Variant with ID ${item.variantId} not found`,
                  );
                }

                if (variant.productId !== product.id) {
                  throw new BadRequestException(
                    `Variant ${variant.id} does not belong to product ${product.id}`,
                  );
                }

                // Use variant price
                price = variant.price;
                variantInfo = variant;
              }

              // Get current inventory with accurate reservation counts
              let inventory;
              if (item.variantId) {
                inventory = await prisma.inventory.findUnique({
                  where: { variantId: item.variantId },
                });

                if (!inventory) {
                  throw new BadRequestException(
                    `Inventory record not found for variant ${item.variantId}`,
                  );
                }
              } else {
                inventory = await prisma.inventory.findUnique({
                  where: { productId: item.productId },
                });

                if (!inventory) {
                  throw new BadRequestException(
                    `Inventory record not found for product ${item.productId}`,
                  );
                }
              }

              // Check true availability (considering reservations)
              const availableStock =
                inventory.stockQuantity - inventory.reservedQuantity;

              if (availableStock < item.quantity) {
                throw new BadRequestException(
                  `Not enough stock for product ${product.title}${variantInfo ? ` (${variantInfo.variantName})` : ''}. 
                Requested: ${item.quantity}, Available: ${availableStock}`,
                );
              }

              const unitPrice = parseFloat(price.toString());
              const totalPrice = unitPrice * item.quantity;

              // Return item with calculated prices
              return {
                ...item,
                unitPrice,
                totalPrice,
                productCurrency: product.currency,
              };
            }),
          );

          // Calculate order totals
          const subtotal = itemsWithPrices.reduce(
            (sum, item) => sum + item.totalPrice,
            0,
          );

          // Apply tax rate (e.g., 10%)
          const taxRate = 0.1;
          const tax = subtotal * taxRate;

          // Shipping fee calculation (simplified, could be based on weight, distance, etc.)
          const shippingFee = subtotal > 100 ? 0 : 10; // Free shipping over $100

          // Apply discount (if applicable)
          const discount = 0;
          // Here you could add logic to apply discounts based on discount codes, etc.

          // Calculate total
          const total = subtotal + tax + shippingFee - discount;

          // Use shipping address as billing address if not provided
          const billingAddress =
            createOrderDto.billingAddress || createOrderDto.shippingAddress;

          // Get currency from request or from the first product
          let orderCurrency = createOrderDto.currency;
          
          if (!orderCurrency) {
            // Use currency from the first product
            orderCurrency = itemsWithPrices[0]?.productCurrency || 'USD';
            
            // Validate that all products have the same currency
            const allCurrencies = itemsWithPrices.map(item => item.productCurrency);
            const uniqueCurrencies = Array.from(new Set(allCurrencies));
            
            if (uniqueCurrencies.length > 1) {
              throw new BadRequestException(
                `Mixed currencies not supported. Found currencies: ${uniqueCurrencies.join(', ')}. Please ensure all products have the same currency.`
              );
            }
          }

          // Create order
          const order = await prisma.order.create({
            data: {
              orderNumber,
              userId: createOrderDto.userId,
              status: createOrderDto.status || OrderStatus.PENDING,
              paymentStatus:
                createOrderDto.paymentStatus || PaymentStatus.PENDING,
              paymentMethod: createOrderDto.paymentMethod,
              shippingAddress: createOrderDto.shippingAddress as any,
              billingAddress: billingAddress as any,
              subtotal,
              tax,
              shippingFee,
              discount,
              total,
              currency: orderCurrency,
              items: {
                create: itemsWithPrices.map((item) => ({
                  productId: item.productId,
                  variantId: item.variantId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                })),
              },
            },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      title: true,
                      slug: true,
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
                      sku: true,
                    },
                  },
                },
              },
            },
          });

          // Update inventory and manage reservations
          for (const item of createOrderDto.items) {
            if (item.variantId) {
              // Update variant inventory and release reservation
              await prisma.inventory.update({
                where: { variantId: item.variantId },
                data: {
                  stockQuantity: {
                    decrement: item.quantity,
                  },
                  // Also reduce reservedQuantity to release any existing reservation
                  reservedQuantity: {
                    decrement: item.quantity,
                  },
                },
              });

              // Create inventory log
              await prisma.inventoryLog.create({
                data: {
                  productId: item.productId,
                  variantId: item.variantId,
                  changeType: InventoryChangeType.SALE,
                  quantityChanged: -item.quantity,
                  note: `Order ${orderNumber}`,
                },
              });
            } else {
              // Update product inventory and release reservation
              await prisma.inventory.update({
                where: { productId: item.productId },
                data: {
                  stockQuantity: {
                    decrement: item.quantity,
                  },
                  // Also reduce reservedQuantity to release any existing reservation
                  reservedQuantity: {
                    decrement: item.quantity,
                  },
                },
              });

              // Create inventory log
              await prisma.inventoryLog.create({
                data: {
                  productId: item.productId,
                  changeType: InventoryChangeType.SALE,
                  quantityChanged: -item.quantity,
                  note: `Order ${orderNumber}`,
                },
              });
            }
          }

          // If user is provided, remove ordered items from their cart
          // and release any existing reservations
          if (createOrderDto.userId) {
            const cart = await prisma.cart.findUnique({
              where: { userId: createOrderDto.userId },
              include: { items: true },
            });

            if (cart) {
              // Match cart items with ordered items and remove them
              const orderProductIds = createOrderDto.items.map(
                (i) => i.productId,
              );
              const orderVariantIds = createOrderDto.items
                .filter((i) => i.variantId)
                .map((i) => i.variantId);

              // Find relevant cart items to delete
              const cartItemsToDelete = cart.items.filter(
                (item) =>
                  orderProductIds.includes(item.productId) &&
                  (item.variantId
                    ? orderVariantIds.includes(item.variantId)
                    : true),
              );

              // Delete matching cart items
              if (cartItemsToDelete.length > 0) {
                await prisma.cartItem.deleteMany({
                  where: {
                    id: { in: cartItemsToDelete.map((item) => item.id) },
                  },
                });
              }
            }
          }

          // Add timeline entry for order creation
          await this.addTimelineEntry(prisma, order.id, OrderStatus.PENDING);

          return order;
        },
        {
          // Use serializable isolation level to prevent race conditions
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 10000, // 10 second timeout
        },
      );

      this.logger.log(`Created order: ${result.id} - ${result.orderNumber}`);
      return this.transformOrderToDto(result);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error creating order: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create order');
    }
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    try {
      // Verify order exists
      const existingOrder = await this.prismaService.order.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!existingOrder) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      // Prevent updating completed or cancelled orders
      if (
        existingOrder.status === OrderStatus.DELIVERED ||
        existingOrder.status === OrderStatus.CANCELLED ||
        existingOrder.status === OrderStatus.REFUNDED
      ) {
        throw new BadRequestException(
          `Cannot update order with status ${existingOrder.status}`,
        );
      }

      // Prepare update data
      const updateData: Prisma.OrderUpdateInput = {};

      if (updateOrderDto.status !== undefined) {
        updateData.status = updateOrderDto.status;
      }

      if (updateOrderDto.paymentStatus !== undefined) {
        updateData.paymentStatus = updateOrderDto.paymentStatus;
      }

      if (updateOrderDto.paymentMethod !== undefined) {
        updateData.paymentMethod = updateOrderDto.paymentMethod;
      }

      if (updateOrderDto.shippingAddress !== undefined) {
        updateData.shippingAddress = updateOrderDto.shippingAddress as any;
      }

      if (updateOrderDto.billingAddress !== undefined) {
        updateData.billingAddress = updateOrderDto.billingAddress as any;
      }

      if (updateOrderDto.currency !== undefined) {
        updateData.currency = updateOrderDto.currency;
      }

      // Update the order
      const updatedOrder = await this.prismaService.order.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
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
                  sku: true,
                },
              },
            },
          },
        },
      });

      // Handle inventory adjustments for order status changes
      if (
        updateOrderDto.status &&
        updateOrderDto.status !== existingOrder.status
      ) {
        if (
          updateOrderDto.status === OrderStatus.CANCELLED ||
          updateOrderDto.status === OrderStatus.RETURNED
        ) {
          // Restore inventory when order is cancelled or returned
          await this.restoreInventoryForOrder(id);
        }
      }

      // Add timeline entry if order status changed
      if (
        updateOrderDto.status !== undefined &&
        updateOrderDto.status !== existingOrder.status
      ) {
        await this.addTimelineEntry(
          this.prismaService,
          id,
          updateOrderDto.status,
        );
      }

      this.logger.log(`Updated order: ${id}`);
      return this.transformOrderToDto(updatedOrder);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error updating order ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to update order with ID ${id}`,
      );
    }
  }

  async cancel(id: string): Promise<OrderResponseDto> {
    try {
      const order = await this.prismaService.order.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      if (
        order.status === OrderStatus.DELIVERED ||
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.REFUNDED
      ) {
        throw new BadRequestException(
          `Cannot cancel order with status ${order.status}`,
        );
      }

      // Update order status in a transaction
      const updatedOrder = await this.prismaService.$transaction(
        async (prisma) => {
          // Update order status
          const result = await prisma.order.update({
            where: { id },
            data: {
              status: OrderStatus.CANCELLED,
            },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      title: true,
                      slug: true,
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
                      sku: true,
                    },
                  },
                },
              },
            },
          });

          // Restore inventory
          await this.restoreInventoryForOrder(id, prisma);

          // Add timeline entry for order cancellation
          await this.addTimelineEntry(prisma, id, OrderStatus.CANCELLED);

          return result;
        },
      );

      this.logger.log(`Cancelled order: ${id}`);
      return this.transformOrderToDto(updatedOrder);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error cancelling order ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to cancel order with ID ${id}`,
      );
    }
  }

  private async restoreInventoryForOrder(
    orderId: string,
    prismaClient?: any,
  ): Promise<void> {
    const prisma = prismaClient || this.prismaService;

    // Get order items
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId },
      select: {
        productId: true,
        variantId: true,
        quantity: true,
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

    // Restore inventory for each item
    for (const item of orderItems) {
      if (item.variantId) {
        // Restore variant inventory
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: {
            stockQuantity: {
              increment: item.quantity,
            },
          },
        });

        // Create inventory log
        await prisma.inventoryLog.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            changeType: InventoryChangeType.RETURN,
            quantityChanged: item.quantity,
            note: `Order ${item.order.orderNumber} cancelled/returned`,
          },
        });
      } else if (item.productId) {
        // Restore product inventory
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              increment: item.quantity,
            },
          },
        });

        // Create inventory log
        await prisma.inventoryLog.create({
          data: {
            productId: item.productId,
            changeType: InventoryChangeType.RETURN,
            quantityChanged: item.quantity,
            note: `Order ${item.order.orderNumber} cancelled/returned`,
          },
        });
      }
    }
  }

  // Helper to create timeline entry
  private async addTimelineEntry(
    prisma: Prisma.TransactionClient | PrismaService,
    orderId: string,
    status: OrderStatus,
    note?: string,
  ): Promise<void> {
    // `prisma` could be either the injected PrismaService or a transaction client
    // @ts-ignore – orderTimeline will exist after prisma generate
    await (prisma as any).orderTimeline.create({
      data: {
        orderId,
        status,
        note,
      },
    });
  }

  // New method: fetch timeline
  async getTimeline(orderId: string): Promise<OrderTimelineDto[]> {
    // Verify order exists
    const orderExists = await this.prismaService.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!orderExists) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // @ts-ignore – orderTimeline will exist after prisma generate
    const events = await (this.prismaService as any).orderTimeline.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });

    return events.map((e: any) => ({
      id: e.id,
      orderId: e.orderId,
      status: e.status,
      note: e.note,
      createdAt: e.createdAt,
    }));
  }

  // Helper method to transform order to DTO
  private transformOrderToDto(order: any): OrderResponseDto {
    // Transform order items
    const items = order.items.map((item) => {
      const imageUrl = item.product?.images?.[0]?.imageUrl || null;

      return {
        id: item.id,
        product: item.product
          ? {
              id: item.product.id,
              title: item.product.title,
              slug: item.product.slug,
              imageUrl,
            }
          : null,
        variant: item.variant || null,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice.toString()),
        totalPrice: parseFloat(item.totalPrice.toString()),
        createdAt: item.createdAt,
      };
    });

    // Return transformed order
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      user: order.user,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      subtotal: parseFloat(order.subtotal.toString()),
      tax: parseFloat(order.tax.toString()),
      shippingFee: parseFloat(order.shippingFee.toString()),
      discount: parseFloat(order.discount.toString()),
      total: parseFloat(order.total.toString()),
      currency: order.currency,
      items,
      placedAt: order.placedAt,
      updatedAt: order.updatedAt,
    };
  }
}
