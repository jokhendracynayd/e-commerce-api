import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma, InventoryChangeType } from '@prisma/client';
import {
  InventoryResponseDto,
  UpdateInventoryDto,
  CreateInventoryLogDto,
  InventoryLogResponseDto,
} from './dto';
import { AppLogger } from '../../common/services/logger.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('InventoryService');
  }

  async findAll(): Promise<InventoryResponseDto[]> {
    try {
      const inventories = await this.prismaService.inventory.findMany({
        include: {
          product: {
            select: {
              title: true,
              sku: true,
            },
          },
          variant: {
            select: {
              variantName: true,
              sku: true,
            },
          },
        },
      });

      return inventories.map((inventory) => this.transformToDto(inventory));
    } catch (error) {
      this.logger.error(
        `Error retrieving all inventories: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to retrieve inventories');
    }
  }

  async findByProduct(productId: string): Promise<InventoryResponseDto> {
    try {
      const inventory = await this.prismaService.inventory.findUnique({
        where: { productId },
        include: {
          product: {
            select: {
              title: true,
              sku: true,
            },
          },
        },
      });

      if (!inventory) {
        throw new NotFoundException(
          `Inventory for product ${productId} not found`,
        );
      }

      return this.transformToDto(inventory);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error retrieving inventory for product ${productId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve inventory for product ${productId}`,
      );
    }
  }

  async findByVariant(variantId: string): Promise<InventoryResponseDto> {
    try {
      const inventory = await this.prismaService.inventory.findUnique({
        where: { variantId },
        include: {
          variant: {
            select: {
              variantName: true,
              sku: true,
              product: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      });

      if (!inventory) {
        throw new NotFoundException(
          `Inventory for variant ${variantId} not found`,
        );
      }

      return this.transformToDto(inventory);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error retrieving inventory for variant ${variantId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve inventory for variant ${variantId}`,
      );
    }
  }

  async update(
    productId: string,
    updateInventoryDto: UpdateInventoryDto,
  ): Promise<InventoryResponseDto> {
    try {
      // Check if product exists
      const product = await this.prismaService.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Find or create inventory
      let inventory = await this.prismaService.inventory.findUnique({
        where: { productId },
      });

      if (!inventory) {
        // Create new inventory if it doesn't exist
        inventory = await this.prismaService.inventory.create({
          data: {
            productId,
            stockQuantity: updateInventoryDto.stockQuantity || 0,
            reservedQuantity: updateInventoryDto.reservedQuantity || 0,
            threshold: updateInventoryDto.threshold || 5,
          },
        });

        // Create an initial inventory log
        if (
          updateInventoryDto.stockQuantity &&
          updateInventoryDto.stockQuantity > 0
        ) {
          await this.createLog({
            productId,
            changeType: InventoryChangeType.RESTOCK,
            quantityChanged: updateInventoryDto.stockQuantity,
            note: 'Initial inventory setup',
          });
        }
      } else {
        // Update existing inventory
        const updateData: Prisma.InventoryUpdateInput = {};

        // Track if stock quantity is changing for log entry
        const oldStockQuantity = inventory.stockQuantity;
        let quantityChange = 0;

        if (updateInventoryDto.stockQuantity !== undefined) {
          updateData.stockQuantity = updateInventoryDto.stockQuantity;
          quantityChange = updateInventoryDto.stockQuantity - oldStockQuantity;
        }

        if (updateInventoryDto.reservedQuantity !== undefined) {
          updateData.reservedQuantity = updateInventoryDto.reservedQuantity;
        }

        if (updateInventoryDto.threshold !== undefined) {
          updateData.threshold = updateInventoryDto.threshold;
        }

        // Update the inventory
        inventory = await this.prismaService.inventory.update({
          where: { productId },
          data: updateData,
        });

        // Create log entry if stock quantity changed
        if (quantityChange !== 0) {
          await this.createLog({
            productId,
            changeType:
              quantityChange > 0
                ? InventoryChangeType.RESTOCK
                : InventoryChangeType.MANUAL,
            quantityChanged: quantityChange,
            note: 'Manual inventory update',
          });
        }
      }

      // Update product stock quantity to keep in sync
      await this.prismaService.product.update({
        where: { id: productId },
        data: { stockQuantity: inventory.stockQuantity },
      });

      this.logger.log(`Updated inventory for product ${productId}`);
      return this.transformToDto(inventory);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error updating inventory for product ${productId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to update inventory for product ${productId}`,
      );
    }
  }

  async updateVariant(
    variantId: string,
    updateInventoryDto: UpdateInventoryDto,
  ): Promise<InventoryResponseDto> {
    try {
      // Check if variant exists
      const variant = await this.prismaService.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant) {
        throw new NotFoundException(`Variant with ID ${variantId} not found`);
      }

      // Find or create inventory
      let inventory = await this.prismaService.inventory.findUnique({
        where: { variantId },
      });

      if (!inventory) {
        // Create new inventory if it doesn't exist
        inventory = await this.prismaService.inventory.create({
          data: {
            productId: variant.productId,
            variantId,
            stockQuantity: updateInventoryDto.stockQuantity || 0,
            reservedQuantity: updateInventoryDto.reservedQuantity || 0,
            threshold: updateInventoryDto.threshold || 5,
          },
        });

        // Create an initial inventory log
        if (
          updateInventoryDto.stockQuantity &&
          updateInventoryDto.stockQuantity > 0
        ) {
          await this.createLog({
            productId: variant.productId,
            variantId,
            changeType: InventoryChangeType.RESTOCK,
            quantityChanged: updateInventoryDto.stockQuantity,
            note: 'Initial variant inventory setup',
          });
        }
      } else {
        // Update existing inventory
        const updateData: Prisma.InventoryUpdateInput = {};

        // Track if stock quantity is changing for log entry
        const oldStockQuantity = inventory.stockQuantity;
        let quantityChange = 0;

        if (updateInventoryDto.stockQuantity !== undefined) {
          updateData.stockQuantity = updateInventoryDto.stockQuantity;
          quantityChange = updateInventoryDto.stockQuantity - oldStockQuantity;
        }

        if (updateInventoryDto.reservedQuantity !== undefined) {
          updateData.reservedQuantity = updateInventoryDto.reservedQuantity;
        }

        if (updateInventoryDto.threshold !== undefined) {
          updateData.threshold = updateInventoryDto.threshold;
        }

        // Update the inventory
        inventory = await this.prismaService.inventory.update({
          where: { variantId },
          data: updateData,
        });

        // Create log entry if stock quantity changed
        if (quantityChange !== 0) {
          await this.createLog({
            productId: variant.productId,
            variantId,
            changeType:
              quantityChange > 0
                ? InventoryChangeType.RESTOCK
                : InventoryChangeType.MANUAL,
            quantityChanged: quantityChange,
            note: 'Manual variant inventory update',
          });
        }
      }

      // Update variant stock quantity to keep in sync
      await this.prismaService.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity: inventory.stockQuantity },
      });

      this.logger.log(`Updated inventory for variant ${variantId}`);
      return this.transformToDto(inventory);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error updating inventory for variant ${variantId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to update inventory for variant ${variantId}`,
      );
    }
  }

  async createLog(
    createLogDto: CreateInventoryLogDto,
  ): Promise<InventoryLogResponseDto> {
    try {
      // Check if product exists
      const product = await this.prismaService.product.findUnique({
        where: { id: createLogDto.productId },
      });

      if (!product) {
        throw new NotFoundException(
          `Product with ID ${createLogDto.productId} not found`,
        );
      }

      // If variantId is provided, check if it exists and belongs to the product
      if (createLogDto.variantId) {
        const variant = await this.prismaService.productVariant.findUnique({
          where: { id: createLogDto.variantId },
        });

        if (!variant) {
          throw new NotFoundException(
            `Variant with ID ${createLogDto.variantId} not found`,
          );
        }

        if (variant.productId !== createLogDto.productId) {
          throw new BadRequestException(
            `Variant with ID ${createLogDto.variantId} does not belong to product with ID ${createLogDto.productId}`,
          );
        }
      }

      // Create the log entry
      const log = await this.prismaService.inventoryLog.create({
        data: {
          productId: createLogDto.productId,
          variantId: createLogDto.variantId,
          changeType: createLogDto.changeType,
          quantityChanged: createLogDto.quantityChanged,
          note: createLogDto.note,
        },
      });

      // Update inventory based on the log entry
      if (createLogDto.variantId) {
        // Update variant inventory
        await this.updateInventoryBasedOnLog(
          null,
          createLogDto.variantId,
          createLogDto.quantityChanged,
        );
      } else {
        // Update product inventory
        await this.updateInventoryBasedOnLog(
          createLogDto.productId,
          null,
          createLogDto.quantityChanged,
        );
      }

      this.logger.log(
        `Created inventory log for product ${createLogDto.productId}${createLogDto.variantId ? ` variant ${createLogDto.variantId}` : ''}`,
      );
      return this.transformLogToDto(log);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error creating inventory log: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to create inventory log');
    }
  }

  async getLogs(
    productId?: string,
    variantId?: string,
  ): Promise<InventoryLogResponseDto[]> {
    try {
      const where: Prisma.InventoryLogWhereInput = {};

      if (productId) {
        where.productId = productId;
      }

      if (variantId) {
        where.variantId = variantId;
      }

      const logs = await this.prismaService.inventoryLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          product: {
            select: {
              title: true,
              sku: true,
            },
          },
          variant: {
            select: {
              variantName: true,
              sku: true,
            },
          },
        },
      });

      return logs.map((log) => this.transformLogToDto(log));
    } catch (error) {
      this.logger.error(
        `Error retrieving inventory logs: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve inventory logs',
      );
    }
  }

  async getLowStockItems(): Promise<InventoryResponseDto[]> {
    try {
      // Get all inventories first, then filter in memory
      const inventories = await this.prismaService.inventory.findMany({
        include: {
          product: {
            select: {
              title: true,
              sku: true,
            },
          },
          variant: {
            select: {
              variantName: true,
              sku: true,
            },
          },
        },
      });

      // Filter for low stock items
      const lowStockInventories = inventories.filter(
        (inv) => inv.stockQuantity <= inv.threshold,
      );

      return lowStockInventories.map((inventory) =>
        this.transformToDto(inventory),
      );
    } catch (error) {
      this.logger.error(
        `Error retrieving low stock items: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve low stock items',
      );
    }
  }

  // Helper method to update inventory based on a log entry
  private async updateInventoryBasedOnLog(
    productId: string | null,
    variantId: string | null,
    quantityChanged: number,
  ): Promise<void> {
    try {
      const inventoryKey = variantId ? { variantId } : { productId };

      // Find the inventory
      let inventory = await this.prismaService.inventory.findUnique({
        where: inventoryKey as any,
      });

      if (!inventory) {
        // If inventory doesn't exist yet, create it
        const createData: any = {
          stockQuantity: Math.max(0, quantityChanged), // Don't allow negative stock
          reservedQuantity: 0,
          threshold: 5,
        };

        // Connect product or variant
        if (productId) {
          createData.product = { connect: { id: productId } };
        } else if (variantId) {
          const variant = await this.prismaService.productVariant.findUnique({
            where: { id: variantId },
            select: { productId: true },
          });

          if (!variant) {
            throw new NotFoundException(
              `Variant with ID ${variantId} not found`,
            );
          }

          createData.variant = { connect: { id: variantId } };
          createData.product = { connect: { id: variant.productId } };
        }

        inventory = await this.prismaService.inventory.create({
          data: createData,
        });
      } else {
        // Update existing inventory
        const newStock = Math.max(0, inventory.stockQuantity + quantityChanged);

        inventory = await this.prismaService.inventory.update({
          where: inventoryKey as any,
          data: {
            stockQuantity: newStock,
            lastRestockedAt: quantityChanged > 0 ? new Date() : undefined,
          },
        });
      }

      // Update product or variant stock quantity to keep in sync
      if (variantId) {
        await this.prismaService.productVariant.update({
          where: { id: variantId },
          data: { stockQuantity: inventory.stockQuantity },
        });
      } else if (productId) {
        await this.prismaService.product.update({
          where: { id: productId },
          data: { stockQuantity: inventory.stockQuantity },
        });
      }
    } catch (error) {
      this.logger.error(
        `Error updating inventory based on log: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Helper method to transform inventory to DTO
  private transformToDto(inventory: any): InventoryResponseDto {
    const availableQuantity = Math.max(
      0,
      inventory.stockQuantity - inventory.reservedQuantity,
    );
    const isLowStock = inventory.stockQuantity <= inventory.threshold;

    return {
      id: inventory.id,
      productId: inventory.productId,
      variantId: inventory.variantId,
      stockQuantity: inventory.stockQuantity,
      reservedQuantity: inventory.reservedQuantity,
      availableQuantity,
      threshold: inventory.threshold,
      lastRestockedAt: inventory.lastRestockedAt,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
      isLowStock,
    };
  }

  // Helper method to transform inventory log to DTO
  private transformLogToDto(log: any): InventoryLogResponseDto {
    return {
      id: log.id,
      productId: log.productId,
      variantId: log.variantId,
      changeType: log.changeType,
      quantityChanged: log.quantityChanged,
      note: log.note,
      createdAt: log.createdAt,
    };
  }
}
