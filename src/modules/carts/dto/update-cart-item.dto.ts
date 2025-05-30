import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    description: 'New quantity for the cart item',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  @IsNotEmpty()
  quantity: number;
}
