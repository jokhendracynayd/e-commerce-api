import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class UpdateProductTagsDto {
  @ApiProperty({
    description: 'Array of tag IDs to associate with the product',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '223e4567-e89b-12d3-a456-426614174000',
    ],
    type: [String],
    isArray: true,
    required: true,
  })
  @IsArray()
  @IsUUID(4, { each: true })
  tagIds: string[];
}
