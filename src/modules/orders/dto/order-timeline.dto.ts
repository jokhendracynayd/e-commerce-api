import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class OrderTimelineDto {
  @ApiProperty({ description: 'Timeline event ID' })
  id: string;

  @ApiProperty({ description: 'Order ID' })
  orderId: string;

  @ApiProperty({ enum: OrderStatus, description: 'Order status at this point in time' })
  status: OrderStatus;

  @ApiProperty({ description: 'Optional note describing the event', required: false })
  note?: string | null;

  @ApiProperty({ description: 'Timestamp of the event' })
  createdAt: Date;
} 