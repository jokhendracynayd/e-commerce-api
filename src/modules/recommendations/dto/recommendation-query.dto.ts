import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { RecommendationType } from '@prisma/client';

export class RecommendationQueryDto {
  @ApiProperty({
    description: 'Type of recommendations to retrieve',
    example: 'PERSONALIZED',
    enum: RecommendationType,
  })
  @IsEnum(RecommendationType, {
    message: 'Recommendation type must be a valid RecommendationType',
  })
  type: RecommendationType;

  @ApiPropertyOptional({
    description: 'User ID for personalized recommendations',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  userId?: string;

  @ApiPropertyOptional({
    description: 'Session ID for anonymous user recommendations',
    example: 'sess_1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Session ID must be at most 100 characters long' })
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Product ID for related product recommendations',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  @IsUUID(4, { message: 'Product ID must be a valid UUID' })
  productId?: string;

  @ApiPropertyOptional({
    description: 'Category ID to filter recommendations',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  @IsUUID(4, { message: 'Category ID must be a valid UUID' })
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Number of recommendations to return',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(50, { message: 'Limit must be at most 50' })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Whether to include product details in response',
    example: true,
  })
  @IsOptional()
  includeProduct?: boolean;
}
