import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BrandResponseDto {
  @ApiProperty({
    description: 'Brand ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Brand name',
    example: 'Apple',
  })
  name: string;

  @ApiProperty({
    description: 'Brand slug (URL-friendly name)',
    example: 'apple',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Brand description',
    example: 'Innovative technology company known for iPhones, Macs, and more',
    nullable: true,
  })
  description: string | null;

  @ApiPropertyOptional({
    description: 'URL to brand logo',
    example: 'https://example.com/images/apple-logo.png',
    nullable: true,
  })
  logo: string | null;

  @ApiProperty({
    description: 'Brand creation date',
    example: '2023-07-21T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Brand last update date',
    example: '2023-07-21T12:00:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Product count for this brand',
    example: 42,
  })
  productCount?: number;
}
