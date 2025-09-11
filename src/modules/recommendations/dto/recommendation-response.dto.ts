import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecommendationType } from '@prisma/client';

export class RecommendationResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the recommendation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'User ID (null for anonymous users)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId?: string;

  @ApiPropertyOptional({
    description: 'Session ID for anonymous users',
    example: 'sess_1234567890abcdef',
  })
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Base product ID (for related recommendations)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  productId?: string;

  @ApiProperty({
    description: 'Recommended product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  recommendedProductId: string;

  @ApiProperty({
    description: 'Type of recommendation',
    example: 'SIMILAR_PRODUCTS',
    enum: RecommendationType,
  })
  recommendationType: RecommendationType;

  @ApiProperty({
    description: 'Recommendation score (0-1)',
    example: 0.85,
  })
  score: number;

  @ApiPropertyOptional({
    description: 'Position in recommendation list',
    example: 1,
  })
  position?: number;

  @ApiPropertyOptional({
    description: 'Algorithm version used',
    example: 'v1.2.0',
  })
  algorithmVersion?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: {
      similarity_type: 'category',
      confidence: 0.92,
    },
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Whether recommendation has been viewed',
    example: false,
  })
  viewed: boolean;

  @ApiProperty({
    description: 'Whether recommendation has been clicked',
    example: false,
  })
  clicked: boolean;

  @ApiProperty({
    description: 'Whether recommendation led to conversion',
    example: false,
  })
  converted: boolean;

  @ApiPropertyOptional({
    description: 'Date when recommendation expires',
    example: '2023-06-24T12:00:00.000Z',
  })
  expiresAt?: Date;

  @ApiProperty({
    description: 'Date when the recommendation was created',
    example: '2023-06-23T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the recommendation was last updated',
    example: '2023-06-23T12:00:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Recommended product information',
  })
  recommendedProduct?: {
    id: string;
    title: string;
    slug: string;
    price: number;
    discountPrice?: number;
    currency: string;
    averageRating: number;
    reviewCount: number;
    images?: Array<{
      imageUrl: string;
      altText?: string;
    }>;
    brand?: {
      id: string;
      name: string;
      logo?: string;
    };
    category?: {
      id: string;
      name: string;
    };
  };
}
