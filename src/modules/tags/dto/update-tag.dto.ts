import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class UpdateTagDto {
  @ApiPropertyOptional({
    description: 'Tag name',
    example: 'Summer Sale 2023',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Tag name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Tag name must be at most 50 characters long' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Tag description',
    example: 'Products included in the summer sale promotion for 2023',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Description must be at most 500 characters long',
  })
  description?: string;
}
