import { ApiProperty } from '@nestjs/swagger';
import { WishlistItemDto } from './wishlist-item.dto';

export class WishlistResponseDto {
  @ApiProperty({ type: [WishlistItemDto] })
  items: WishlistItemDto[];

  @ApiProperty({ example: 5 })
  total: number;
}

export class WishlistAddResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Item added to wishlist successfully' })
  message: string;

  @ApiProperty({ type: WishlistItemDto, required: false })
  item?: WishlistItemDto;
}

export class WishlistRemoveResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Item removed from wishlist successfully' })
  message: string;
} 