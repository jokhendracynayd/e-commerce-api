import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserActivityType } from '@prisma/client';

export class UserActivityResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the activity',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'User ID (null for anonymous users)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId?: string;

  @ApiProperty({
    description: 'Session ID for tracking',
    example: 'sess_1234567890abcdef',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Type of user activity',
    example: 'PRODUCT_VIEW',
    enum: UserActivityType,
  })
  activityType: UserActivityType;

  @ApiPropertyOptional({
    description: 'ID of the entity involved in the activity',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Type of entity involved in the activity',
    example: 'product',
  })
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the activity',
    example: {
      source: 'recommendation',
      position: 1,
    },
  })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'IP address of the user',
    example: '192.168.1.1',
  })
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'User agent string',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Referrer URL',
    example: 'https://google.com',
  })
  referrer?: string;

  @ApiPropertyOptional({
    description: 'Page URL where the activity occurred',
    example: '/products/laptop-abc-123',
  })
  pageUrl?: string;

  @ApiPropertyOptional({
    description: 'Device type used for the activity',
    example: 'desktop',
  })
  deviceType?: string;

  @ApiPropertyOptional({
    description: 'Duration of the activity in seconds',
    example: 45,
  })
  duration?: number;

  @ApiProperty({
    description: 'Timestamp when the activity occurred',
    example: '2023-06-23T12:00:00.000Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Date when the activity was created',
    example: '2023-06-23T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the activity was last updated',
    example: '2023-06-23T12:00:00.000Z',
  })
  updatedAt: Date;
}
