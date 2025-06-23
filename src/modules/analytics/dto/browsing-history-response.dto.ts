import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BrowsingHistoryResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the browsing history entry',
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
    description: 'Product ID that was viewed',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  productId: string;

  @ApiProperty({
    description: 'Date when the product was first viewed',
    example: '2023-06-23T12:00:00.000Z',
  })
  viewedAt: Date;

  @ApiProperty({
    description: 'Date when the product was last viewed',
    example: '2023-06-23T12:05:00.000Z',
  })
  lastViewedAt: Date;

  @ApiProperty({
    description: 'Number of times the product was viewed',
    example: 3,
  })
  viewCount: number;

  @ApiPropertyOptional({
    description: 'Time spent viewing the product in seconds',
    example: 120,
  })
  timeSpent?: number;

  @ApiPropertyOptional({
    description: 'Source of the view (search, category, recommendation)',
    example: 'search',
  })
  source?: string;

  @ApiPropertyOptional({
    description: 'Device type used for viewing',
    example: 'desktop',
  })
  deviceType?: string;

  @ApiProperty({
    description: 'Whether this view led to a purchase',
    example: false,
  })
  conversion: boolean;

  @ApiPropertyOptional({
    description: 'Date when conversion occurred',
    example: '2023-06-23T14:30:00.000Z',
  })
  conversionAt?: Date;

  @ApiProperty({
    description: 'Date when the entry was created',
    example: '2023-06-23T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the entry was last updated',
    example: '2023-06-23T12:05:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Product information',
  })
  product?: {
    id: string;
    title: string;
    slug: string;
    price: number;
    discountPrice?: number;
    images?: Array<{
      imageUrl: string;
      altText?: string;
    }>;
  };
}
