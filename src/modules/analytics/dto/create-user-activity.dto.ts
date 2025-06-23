import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsInt,
  IsObject,
  Min,
  MaxLength,
} from 'class-validator';
import { UserActivityType } from '@prisma/client';

export class CreateUserActivityDto {
  @ApiProperty({
    description: 'Type of user activity',
    example: 'PRODUCT_VIEW',
    enum: UserActivityType,
  })
  @IsEnum(UserActivityType, {
    message: 'Activity type must be a valid UserActivityType',
  })
  @IsNotEmpty({ message: 'Activity type is required' })
  activityType: UserActivityType;

  @ApiProperty({
    description: 'Session ID for tracking anonymous users',
    example: 'sess_1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty({ message: 'Session ID is required' })
  @MaxLength(100, { message: 'Session ID must be at most 100 characters long' })
  sessionId: string;

  @ApiPropertyOptional({
    description:
      'ID of the entity involved in the activity (product, category, etc.)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  @IsUUID(4, { message: 'Entity ID must be a valid UUID' })
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Type of entity involved in the activity',
    example: 'product',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Entity type must be at most 50 characters long' })
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the activity',
    example: {
      source: 'recommendation',
      position: 1,
      searchQuery: 'laptop',
    },
  })
  @IsOptional()
  @IsObject({ message: 'Metadata must be a valid object' })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Page URL where the activity occurred',
    example: '/products/laptop-abc-123',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Page URL must be at most 500 characters long' })
  pageUrl?: string;

  @ApiPropertyOptional({
    description: 'Device type used for the activity',
    example: 'desktop',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Device type must be at most 50 characters long' })
  deviceType?: string;

  @ApiPropertyOptional({
    description: 'Duration of the activity in seconds',
    example: 45,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Duration must be an integer' })
  @Min(0, { message: 'Duration must be at least 0 seconds' })
  duration?: number;

  @ApiPropertyOptional({
    description: 'Referrer URL',
    example: 'https://google.com',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Referrer must be at most 500 characters long' })
  referrer?: string;
}
