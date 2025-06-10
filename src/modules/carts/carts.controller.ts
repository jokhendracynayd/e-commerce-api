import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { AddToCartDto, UpdateCartItemDto, CartResponseDto, MergeAnonymousCartDto } from './dto';
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

// Define interface for the authenticated request
interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
  };
}

@ApiTags('carts')
@Controller('carts')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get('my-cart')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: "Get the current user's cart" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the user's cart",
    type: CartResponseDto,
  })
  @ApiBearerAuth('JWT-auth')
  getMyCart(@Req() req: RequestWithUser): Promise<CartResponseDto> {
    const userId = req.user.id;
    return this.cartsService.getCartByUserId(userId);
  }

  @Post('add-item')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Add an item to the cart' })
  @ApiBody({ type: AddToCartDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the updated cart',
    type: CartResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiBadRequestResponse({
    description: 'Invalid input data or product not available',
  })
  @ApiBearerAuth('JWT-auth')
  addToCart(
    @Req() req: RequestWithUser,
    @Body() addToCartDto: AddToCartDto,
  ): Promise<CartResponseDto> {
    const userId = req.user.id;
    return this.cartsService.addToCart(userId, addToCartDto);
  }

  @Patch('items/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update a cart item quantity' })
  @ApiParam({ name: 'id', description: 'Cart item ID', type: String })
  @ApiBody({ type: UpdateCartItemDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the updated cart',
    type: CartResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  @ApiBadRequestResponse({
    description: 'Invalid input data or not enough stock',
  })
  @ApiBearerAuth('JWT-auth')
  updateCartItem(
    @Req() req: RequestWithUser,
    @Param('id') cartItemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const userId = req.user.id;
    return this.cartsService.updateCartItem(
      userId,
      cartItemId,
      updateCartItemDto,
    );
  }

  @Delete('items/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Remove an item from the cart' })
  @ApiParam({ name: 'id', description: 'Cart item ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the updated cart',
    type: CartResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  @ApiBearerAuth('JWT-auth')
  removeCartItem(
    @Req() req: RequestWithUser,
    @Param('id') cartItemId: string,
  ): Promise<CartResponseDto> {
    const userId = req.user.id;
    return this.cartsService.removeCartItem(userId, cartItemId);
  }

  @Delete('clear')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the cart (remove all items)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the empty cart',
    type: CartResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Cart not found' })
  @ApiBearerAuth('JWT-auth')
  clearCart(@Req() req: RequestWithUser): Promise<CartResponseDto> {
    const userId = req.user.id;
    return this.cartsService.clearCart(userId);
  }

  @Post('merge-anonymous')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Merge anonymous cart with user cart' })
  @ApiBody({ type: MergeAnonymousCartDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the merged cart',
    type: CartResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or products not available',
  })
  @ApiBearerAuth('JWT-auth')
  mergeAnonymousCart(
    @Req() req: RequestWithUser,
    @Body() mergeAnonymousCartDto: MergeAnonymousCartDto,
  ): Promise<CartResponseDto> {
    const userId = req.user.id;
    return this.cartsService.mergeAnonymousCart(userId, mergeAnonymousCartDto.items);
  }
}
