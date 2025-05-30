import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class UpdateBrandDto {
  @ApiPropertyOptional({
    description: 'Brand name',
    example: 'Apple Inc.',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Brand name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Brand name must be at most 50 characters long' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Brand description',
    example:
      'Innovative technology company known for iPhones, iPads, Macs, and more',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'Description must be at most 1000 characters long',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'URL to brand logo',
    example: 'https://example.com/images/apple-logo-updated.png',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Logo URL must be at most 500 characters long' })
  logo?: string;
}
