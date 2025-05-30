import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDate,
  IsUrl,
  MinLength,
  IsPhoneNumber,
} from 'class-validator';
import { Gender } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1234567890',
  })
  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'User gender',
    enum: Gender,
  })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({
    description: 'User profile image URL',
    example: 'https://example.com/profile.jpg',
  })
  @IsUrl()
  @IsOptional()
  profileImage?: string;

  @ApiPropertyOptional({
    description: 'User date of birth',
    example: '1990-01-01',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  dateOfBirth?: Date;

  @ApiPropertyOptional({
    description: 'User bio',
    example: 'A passionate shopper...',
  })
  @IsString()
  @IsOptional()
  @MinLength(5)
  bio?: string;
}
