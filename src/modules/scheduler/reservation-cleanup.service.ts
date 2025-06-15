import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReservationCleanupService {
  private readonly logger = new Logger(ReservationCleanupService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Runs every 5 minutes to clean up expired cart item reservations
   * This ensures that inventory is not locked indefinitely by abandoned carts
   */
  @Cron('*/5 * * * *')
  async cleanupExpiredReservations(): Promise<void> {
    try {
      this.logger.log('Starting cleanup of expired reservations');
      const now = new Date();
      
      // Define the type for expired items
      interface ExpiredCartItem {
        id: string;
        productId: string;
        variantId: string | null;
        quantity: number;
      }

      // Find all cart items with expired reservations using raw SQL
      // We use raw SQL here because of typing issues with Prisma's reservationExpires field
      const expiredItems = await this.prismaService.$queryRaw<ExpiredCartItem[]>`
        SELECT id, product_id as "productId", variant_id as "variantId", quantity
        FROM cart_items
        WHERE reservation_expires < ${now}
        AND reservation_expires IS NOT NULL
      `;
      
      if (expiredItems.length === 0) {
        this.logger.log('No expired reservations found');
        return;
      }
      
      this.logger.log(`Found ${expiredItems.length} expired reservations to release`);
      
      let releasedCount = 0;
      
      // Process each expired item
      for (const item of expiredItems) {
        // Use transactions to ensure atomic operations
        await this.prismaService.$transaction(async (prisma) => {
          // Update the cart item to remove the reservation expiry
          // We use raw SQL here because of typing issues with Prisma's reservationExpires field
          await prisma.$executeRaw`
            UPDATE "cart_items" 
            SET "reservation_expires" = NULL,
                "updated_at" = NOW()
            WHERE "id" = ${item.id}
          `;
          
          // Release inventory based on whether it's a variant or main product
          // These operations work fine with Prisma client since they don't involve the problematic field
          if (item.variantId) {
            // Update variant inventory to release reservation
            await prisma.inventory.update({
              where: { variantId: item.variantId },
              data: {
                reservedQuantity: {
                  decrement: item.quantity,
                },
              },
            });
          } else {
            // Update product inventory to release reservation
            await prisma.inventory.update({
              where: { productId: item.productId },
              data: {
                reservedQuantity: {
                  decrement: item.quantity,
                },
              },
            });
          }
          
          releasedCount++;
        }, {
          // Use serializable isolation to prevent race conditions
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      }
      
      this.logger.log(`Successfully released ${releasedCount} expired reservations`);
    } catch (error) {
      this.logger.error(`Error cleaning up expired reservations: ${error.message}`, error.stack);
    }
  }
} 