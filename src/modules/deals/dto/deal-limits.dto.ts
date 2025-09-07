import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsPositive, IsInt } from 'class-validator';

export class DealLimitsDto {
  @ApiProperty({
    description: 'Maximum total usage for this deal',
    example: 100,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  maxTotalUsage?: number;

  @ApiProperty({
    description: 'Maximum usage per user',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  maxUserUsage?: number;
}
