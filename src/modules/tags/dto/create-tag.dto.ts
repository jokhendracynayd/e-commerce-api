import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTagDto {
  @ApiProperty({
    description: 'Tag name',
    example: 'Summer Sale',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tag name is required' })
  @MinLength(2, { message: 'Tag name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Tag name must be at most 50 characters long' })
  name: string;

  @ApiPropertyOptional({
    description: 'Tag description',
    example: 'Products included in the summer sale promotion',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Description must be at most 500 characters long',
  })
  description?: string;
}
