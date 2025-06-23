import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateCouponDto {
  @ApiProperty({ description: 'Coupon code to validate' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'User ID for per-user validation' })
  @IsUUID('4')
  @IsOptional()
  userId?: string;
}
