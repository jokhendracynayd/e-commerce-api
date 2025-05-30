import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateInventoryDto {
  @ApiPropertyOptional({
    description: 'Stock quantity',
    example: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stockQuantity?: number;

  @ApiPropertyOptional({
    description: 'Reserved quantity (committed to orders but not yet shipped)',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  reservedQuantity?: number;

  @ApiPropertyOptional({
    description: 'Low stock threshold for notifications',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  threshold?: number;
}
