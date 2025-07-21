import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import {
  AddToWishlistDto,
  WishlistResponseDto,
  WishlistAddResponseDto,
  WishlistRemoveResponseDto,
} from './dto';

// Define interface for the authenticated request
interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
  };
}

@ApiTags('wishlist')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get('count')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get the count of items in the wishlist' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the number of items in the wishlist',
    schema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          example: 5,
          description: 'The number of items in the wishlist'
        }
      }
    }
  })
  @ApiBearerAuth('JWT-auth')
  async getWishlistCount(@Req() req: RequestWithUser): Promise<{ count: number }> {
    const userId = req.user.id;
    const count = await this.wishlistService.getWishlistCount(userId);
    return { count };
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: "Get the current user's wishlist" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the user's wishlist",
    type: WishlistResponseDto,
  })
  @ApiBearerAuth('JWT-auth')
  getWishlist(@Req() req: RequestWithUser): Promise<WishlistResponseDto> {
    const userId = req.user.id;
    return this.wishlistService.getWishlist(userId);
  }

  @Post('add')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Add an item to the wishlist' })
  @ApiBody({ type: AddToWishlistDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns success status and the added item',
    type: WishlistAddResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiBearerAuth('JWT-auth')
  addToWishlist(
    @Req() req: RequestWithUser,
    @Body() addToWishlistDto: AddToWishlistDto,
  ): Promise<WishlistAddResponseDto> {
    const userId = req.user.id;
    return this.wishlistService.addToWishlist(userId, addToWishlistDto);
  }

  @Delete(':productId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an item from the wishlist' })
  @ApiParam({ name: 'productId', description: 'Product ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns success status',
    type: WishlistRemoveResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Item not found in wishlist' })
  @ApiBearerAuth('JWT-auth')
  removeFromWishlist(
    @Req() req: RequestWithUser,
    @Param('productId') productId: string,
  ): Promise<WishlistRemoveResponseDto> {
    const userId = req.user.id;
    return this.wishlistService.removeFromWishlist(userId, productId);
  }

  @Get('check/:productId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Check if a product is in the wishlist' })
  @ApiParam({ name: 'productId', description: 'Product ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns boolean indicating if product is in wishlist',
    type: Boolean,
  })
  @ApiBearerAuth('JWT-auth')
  isProductInWishlist(
    @Req() req: RequestWithUser,
    @Param('productId') productId: string,
  ): Promise<boolean> {
    const userId = req.user.id;
    return this.wishlistService.isProductInWishlist(userId, productId);
  }
}
