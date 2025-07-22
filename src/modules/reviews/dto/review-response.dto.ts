import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewUserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string | null;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string | null;
}

export class ReviewProductResponseDto {
  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Product title',
    example: 'Premium Wireless Headphones',
  })
  title: string;

  @ApiProperty({
    description: 'Product slug',
    example: 'premium-wireless-headphones',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Product main image',
    example: 'https://example.com/images/headphones.jpg',
  })
  imageUrl?: string;
}

export class ReviewResponseDto {
  @ApiProperty({
    description: 'Review ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  productId: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orderId: string;

  @ApiProperty({
    description: 'Rating (1-5 stars)',
    example: 4,
  })
  rating: number;

  @ApiPropertyOptional({
    description: 'Review title/headline',
    example: 'Great product, highly recommended!',
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'Review comment',
    example:
      'This product exceeded my expectations. Quality is excellent and delivery was fast.',
  })
  comment?: string;

  @ApiProperty({
    description: 'Whether this is a verified purchase',
    example: true,
  })
  isVerifiedPurchase: boolean;

  @ApiProperty({
    description: 'Number of helpful votes',
    example: 5,
  })
  helpfulCount: number;

  @ApiProperty({
    description: 'Review creation date',
    example: '2024-01-15T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Review last update date',
    example: '2024-01-15T10:00:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'User information',
    type: ReviewUserResponseDto,
  })
  user?: ReviewUserResponseDto;

  @ApiPropertyOptional({
    description: 'Product information',
    type: ReviewProductResponseDto,
  })
  product?: ReviewProductResponseDto;
}

export class PaginatedReviewResponseDto {
  @ApiProperty({
    description: 'List of reviews',
    type: [ReviewResponseDto],
  })
  data: ReviewResponseDto[];

  @ApiProperty({
    description: 'Total number of reviews',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 15,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPreviousPage: boolean;
}

export class ReviewStatsResponseDto {
  @ApiProperty({
    description: 'Average rating',
    example: 4.2,
  })
  averageRating: number;

  @ApiProperty({
    description: 'Total number of reviews',
    example: 150,
  })
  totalReviews: number;

  @ApiProperty({
    description: 'Rating distribution (1-5 stars)',
    example: { '1': 5, '2': 10, '3': 25, '4': 60, '5': 50 },
  })
  ratingDistribution: Record<string, number>;
}
