import { ApiProperty } from '@nestjs/swagger';
import { DealType } from '@prisma/client';

export class DealResponseDto {
  @ApiProperty({
    description: 'Deal ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Deal name',
    example: 'Summer Sale',
  })
  name: string;

  @ApiProperty({
    description: 'Deal type',
    enum: DealType,
    example: DealType.FLASH,
  })
  dealType: DealType;

  @ApiProperty({
    description: 'Discount percentage',
    example: 15.0,
  })
  discount: number;

  @ApiProperty({
    description: 'Start time of the deal',
    example: '2023-07-21T00:00:00Z',
  })
  startTime: Date;

  @ApiProperty({
    description: 'End time of the deal',
    example: '2023-07-28T23:59:59Z',
  })
  endTime: Date;

  @ApiProperty({
    description: 'Current status of the deal',
    example: 'Active',
    enum: ['Active', 'Upcoming', 'Ended'],
  })
  status: string;

  @ApiProperty({
    description: 'Number of products in this deal',
    example: 5,
  })
  productsCount: number;

  @ApiProperty({
    description: 'Creation date',
    example: '2023-07-20T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2023-07-20T12:00:00Z',
  })
  updatedAt: Date;
}

export class DealListResponseDto {
  @ApiProperty({
    description: 'List of deals',
    type: [DealResponseDto],
  })
  deals: DealResponseDto[];

  @ApiProperty({
    description: 'Total number of deals',
    example: 10,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 2,
  })
  totalPages: number;
}
