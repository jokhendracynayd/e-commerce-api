import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TagResponseDto {
  @ApiProperty({
    description: 'Tag ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Tag name',
    example: 'Summer Sale',
  })
  name: string;

  @ApiProperty({
    description: 'Tag slug (URL-friendly name)',
    example: 'summer-sale',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Tag description',
    example: 'Products included in the summer sale promotion',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Tag creation date',
    example: '2023-07-21T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Tag last update date',
    example: '2023-07-21T12:00:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Product count for this tag',
    example: 42,
  })
  productCount?: number;
}
