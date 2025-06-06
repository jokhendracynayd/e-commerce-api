import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsDateString,
  IsPositive,
  Min,
  Max,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';
import { DealType } from '@prisma/client';

export class CreateDealDto {
  @ApiProperty({
    description: 'Name of the deal',
    example: 'Summer Sale',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Type of deal',
    enum: DealType,
    example: DealType.FLASH,
  })
  @IsEnum(DealType)
  dealType: DealType;

  @ApiProperty({
    description: 'Discount percentage (0-100)',
    example: 15,
  })
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  @Max(100)
  discount: number;

  @ApiProperty({
    description: 'Start time of the deal (ISO string)',
    example: '2023-07-21T00:00:00Z',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: 'End time of the deal (ISO string)',
    example: '2023-07-28T23:59:59Z',
  })
  @IsDateString()
  endTime: string;
} 