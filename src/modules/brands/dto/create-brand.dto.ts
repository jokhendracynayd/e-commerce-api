import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
  IsBoolean,
  IsUrl,
} from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({
    description: 'Brand name',
    example: 'Apple',
  })
  @IsString()
  @IsNotEmpty({ message: 'Brand name is required' })
  @MinLength(2, { message: 'Brand name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Brand name must be at most 50 characters long' })
  name: string;

  @ApiPropertyOptional({
    description: 'Brand description',
    example: 'Innovative technology company known for iPhones, Macs, and more',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'Description must be at most 1000 characters long',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'URL to brand logo',
    example: 'https://example.com/images/apple-logo.png',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Logo URL must be at most 500 characters long' })
  logo?: string;

  @ApiPropertyOptional({
    description: 'Brand website URL',
    example: 'https://www.apple.com',
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  @MaxLength(500, {
    message: 'Website URL must be at most 500 characters long',
  })
  website?: string;

  @ApiPropertyOptional({
    description: 'Whether the brand is featured',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isFeatured must be a boolean value' })
  isFeatured?: boolean;
}
