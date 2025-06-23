import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddProductToDealDto {
  @ApiProperty({
    description: 'Product ID to add to the deal',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4)
  productId: string;
}
