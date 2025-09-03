import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  OrderResponseDto,
  OrderFilterDto,
  PaginatedOrderResponseDto,
  OrderTimelineDto,
} from './dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

// Define interface for the authenticated request
interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get all orders with pagination and filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns a paginated list of orders',
    type: PaginatedOrderResponseDto,
  })
  @ApiBearerAuth('JWT-auth')
  async findAll(
    @Query() filterDto: OrderFilterDto,
  ): Promise<PaginatedOrderResponseDto> {
    return this.ordersService.findAll(filterDto);
  }

  @Get('my-orders')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: "Get current user's orders" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns orders for the authenticated user',
    type: PaginatedOrderResponseDto,
  })
  @ApiBearerAuth('JWT-auth')
  async findMyOrders(
    @Req() req: RequestWithUser,
    @Query() filterDto: OrderFilterDto,
  ): Promise<PaginatedOrderResponseDto> {
    // Get user ID from request (provided by AuthGuard)
    const userId = req.user.id;

    // Override filterDto with user's ID
    const userFilterDto = { ...filterDto, userId };

    return this.ordersService.findAll(userFilterDto);
  }

  @Get('number/:orderNumber')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get an order by order number' })
  @ApiParam({ name: 'orderNumber', description: 'Order number', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the order',
    type: OrderResponseDto,
  })
  @ApiBearerAuth('JWT-auth')
  @ApiNotFoundResponse({ description: 'Order not found' })
  async findByOrderNumber(
    @Param('orderNumber') orderNumber: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.findByOrderNumber(orderNumber);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get an order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the order',
    type: OrderResponseDto,
  })
  @ApiBearerAuth('JWT-auth')
  @ApiNotFoundResponse({ description: 'Order not found' })
  async findOne(@Param('id') id: string): Promise<OrderResponseDto> {
    return this.ordersService.findOne(id);
  }

  @Get(':id/timeline')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get timeline events for an order' })
  @ApiParam({ name: 'id', description: 'Order ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns timeline events',
    type: [OrderTimelineDto],
  })
  @ApiBearerAuth('JWT-auth')
  async getTimeline(@Param('id') id: string): Promise<OrderTimelineDto[]> {
    return this.ordersService.getTimeline(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new order' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Returns the created order',
    type: OrderResponseDto,
  })
  @ApiBearerAuth('JWT-auth')
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  async create(
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.create(createOrderDto);
  }

  @Post('user-order')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new order for the authenticated user' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Returns the created order',
    type: OrderResponseDto,
  })
  @ApiBearerAuth('JWT-auth')
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  async createUserOrder(
    @Req() req: RequestWithUser,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    // Get user ID from request (provided by AuthGuard)
    const userId = req.user.id;

    // Set the user ID in the order
    createOrderDto.userId = userId;

    return this.ordersService.create(createOrderDto);
  }

  @Post('my-orders/:id/cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: "Cancel user's own order" })
  @ApiParam({ name: 'id', description: 'Order ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the cancelled order',
    type: OrderResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBearerAuth('JWT-auth')
  async cancelMyOrder(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<OrderResponseDto> {
    // Get user ID from request (provided by AuthGuard)
    const userId = req.user.id;

    // Verify the order belongs to the user (this check should be in the service)
    const order = await this.ordersService.findOne(id);

    if (order.user?.id !== userId) {
      throw new UnauthorizedException(
        'This order does not belong to the current user',
      );
    }

    return this.ordersService.cancel(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  @ApiOperation({ summary: 'Update an order' })
  @ApiParam({ name: 'id', description: 'Order ID', type: String })
  @ApiBody({ type: UpdateOrderDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the updated order',
    type: OrderResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBearerAuth('JWT-auth')
  async update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Post(':id/cancel')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'id', description: 'Order ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the cancelled order',
    type: OrderResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBearerAuth('JWT-auth')
  async cancel(@Param('id') id: string): Promise<OrderResponseDto> {
    return this.ordersService.cancel(id);
  }
}
