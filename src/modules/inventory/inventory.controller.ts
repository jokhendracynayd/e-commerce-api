import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { InventoryService } from './inventory.service';
import {
  InventoryResponseDto,
  UpdateInventoryDto,
  CreateInventoryLogDto,
  InventoryLogResponseDto,
  AddStockDto,
} from './dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, InventoryChangeType } from '@prisma/client';
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
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60) // Cache for 1 minute
  @ApiOperation({ summary: 'Get all inventory items' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all inventory items',
    type: [InventoryResponseDto],
  })
  @ApiBearerAuth('JWT-auth')
  findAll(): Promise<InventoryResponseDto[]> {
    return this.inventoryService.findAll();
  }

  @Get('low-stock')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  @ApiOperation({ summary: 'Get all low stock inventory items' })
  @ApiResponse({
    status: 200,
    description:
      'Returns a list of all inventory items with stock below threshold',
    type: [InventoryResponseDto],
  })
  @ApiBearerAuth('JWT-auth')
  getLowStockItems(): Promise<InventoryResponseDto[]> {
    return this.inventoryService.getLowStockItems();
  }

  @Get('product/:productId')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60) // Cache for 1 minute
  @ApiOperation({ summary: 'Get inventory for a product' })
  @ApiParam({
    name: 'productId',
    required: true,
    description: 'The ID of the product to get inventory for',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the inventory for the specified product',
    type: InventoryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Inventory for product not found' })
  findByProduct(
    @Param('productId') productId: string,
  ): Promise<InventoryResponseDto> {
    return this.inventoryService.findByProduct(productId);
  }

  @Get('variant/:variantId')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60) // Cache for 1 minute
  @ApiOperation({ summary: 'Get inventory for a product variant' })
  @ApiParam({
    name: 'variantId',
    required: true,
    description: 'The ID of the variant to get inventory for',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the inventory for the specified variant',
    type: InventoryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Inventory for variant not found' })
  findByVariant(
    @Param('variantId') variantId: string,
  ): Promise<InventoryResponseDto> {
    return this.inventoryService.findByVariant(variantId);
  }

  @Patch('product/:productId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  @ApiOperation({ summary: 'Update inventory for a product' })
  @ApiParam({
    name: 'productId',
    required: true,
    description: 'The ID of the product to update inventory for',
    type: String,
  })
  @ApiBody({ type: UpdateInventoryDto })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated inventory for the product',
    type: InventoryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBearerAuth('JWT-auth')
  updateProduct(
    @Param('productId') productId: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ): Promise<InventoryResponseDto> {
    return this.inventoryService.update(productId, updateInventoryDto);
  }

  @Patch('variant/:variantId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  @ApiOperation({ summary: 'Update inventory for a product variant' })
  @ApiParam({
    name: 'variantId',
    required: true,
    description: 'The ID of the variant to update inventory for',
    type: String,
  })
  @ApiBody({ type: UpdateInventoryDto })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated inventory for the variant',
    type: InventoryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Variant not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBearerAuth('JWT-auth')
  updateVariant(
    @Param('variantId') variantId: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ): Promise<InventoryResponseDto> {
    return this.inventoryService.updateVariant(variantId, updateInventoryDto);
  }

  @Post('logs')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  @ApiOperation({ summary: 'Create an inventory log entry' })
  @ApiBody({ type: CreateInventoryLogDto })
  @ApiResponse({
    status: 201,
    description: 'Returns the created inventory log entry',
    type: InventoryLogResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product or variant not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBearerAuth('JWT-auth')
  createLog(
    @Body() createLogDto: CreateInventoryLogDto,
  ): Promise<InventoryLogResponseDto> {
    return this.inventoryService.createLog(createLogDto);
  }

  @Get('logs')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  @ApiOperation({ summary: 'Get inventory logs' })
  @ApiQuery({
    name: 'productId',
    required: false,
    description: 'Filter logs by product ID',
    type: String,
  })
  @ApiQuery({
    name: 'variantId',
    required: false,
    description: 'Filter logs by variant ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns inventory logs',
    type: [InventoryLogResponseDto],
  })
  @ApiBearerAuth('JWT-auth')
  getLogs(
    @Query('productId') productId?: string,
    @Query('variantId') variantId?: string,
  ): Promise<InventoryLogResponseDto[]> {
    return this.inventoryService.getLogs(productId, variantId);
  }

  @Post('restock/product/:productId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  @ApiOperation({ summary: 'Restock a product' })
  @ApiParam({
    name: 'productId',
    required: true,
    description: 'The ID of the product to restock',
    type: String,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantity: {
          type: 'number',
          description: 'Quantity to add to inventory',
          example: 50,
        },
        note: {
          type: 'string',
          description: 'Optional note about the restock',
          example: 'Restocked from Supplier XYZ',
        },
      },
      required: ['quantity'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated inventory for the product',
    type: InventoryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBearerAuth('JWT-auth')
  restockProduct(
    @Param('productId') productId: string,
    @Body('quantity') quantity: number,
    @Body('note') note?: string,
  ): Promise<InventoryResponseDto> {
    // Create a log entry for the restock
    return this.inventoryService
      .createLog({
        productId,
        changeType: InventoryChangeType.RESTOCK,
        quantityChanged: quantity,
        note: note || 'Product restock',
      })
      .then(() => {
        return this.inventoryService.findByProduct(productId);
      });
  }

  @Post('restock/variant/:variantId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  @ApiOperation({ summary: 'Restock a product variant' })
  @ApiParam({
    name: 'variantId',
    required: true,
    description: 'The ID of the variant to restock',
    type: String,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantity: {
          type: 'number',
          description: 'Quantity to add to inventory',
          example: 50,
        },
        productId: {
          type: 'string',
          description: 'Product ID (required)',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        note: {
          type: 'string',
          description: 'Optional note about the restock',
          example: 'Restocked from Supplier XYZ',
        },
      },
      required: ['quantity', 'productId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated inventory for the variant',
    type: InventoryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Variant not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBearerAuth('JWT-auth')
  restockVariant(
    @Param('variantId') variantId: string,
    @Body('quantity') quantity: number,
    @Body('productId') productId: string,
    @Body('note') note?: string,
  ): Promise<InventoryResponseDto> {
    // Create a log entry for the restock
    return this.inventoryService
      .createLog({
        productId,
        variantId,
        changeType: InventoryChangeType.RESTOCK,
        quantityChanged: quantity,
        note: note || 'Variant restock',
      })
      .then(() => {
        return this.inventoryService.findByVariant(variantId);
      });
  }

  @Get(':productId')
  @Public()
  @ApiOperation({ summary: 'Get inventory for a product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns inventory information for a product',
  })
  async getProductInventory(@Param('productId') productId: string) {
    return this.inventoryService.getProductInventory(productId);
  }

  @Get('variant/:variantId')
  @Public()
  @ApiOperation({ summary: 'Get inventory for a product variant' })
  @ApiParam({ name: 'variantId', description: 'Product Variant ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns inventory information for a product variant',
  })
  async getVariantInventory(@Param('variantId') variantId: string) {
    return this.inventoryService.getVariantInventory(variantId);
  }

  @Get('availability/product/:productId')
  @Public()
  @ApiOperation({ summary: 'Get real-time availability for a product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns real-time availability information for a product',
  })
  async getProductAvailability(@Param('productId') productId: string) {
    return this.inventoryService.getProductAvailability(productId);
  }

  @Get('availability/variant/:variantId')
  @Public()
  @ApiOperation({ summary: 'Get real-time availability for a product variant' })
  @ApiParam({ name: 'variantId', description: 'Product Variant ID' })
  @ApiResponse({
    status: 200,
    description:
      'Returns real-time availability information for a product variant',
  })
  async getVariantAvailability(@Param('variantId') variantId: string) {
    return this.inventoryService.getVariantAvailability(variantId);
  }

  @Get('availability/batch')
  @Public()
  @ApiOperation({
    summary:
      'Get real-time availability for multiple products or variants (GET method)',
  })
  @ApiQuery({
    name: 'productIds',
    description: 'Comma-separated list of product IDs',
    required: false,
  })
  @ApiQuery({
    name: 'variantIds',
    description: 'Comma-separated list of variant IDs',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns real-time availability information for multiple products/variants',
  })
  async getBatchAvailability(
    @Query('productIds') productIds?: string,
    @Query('variantIds') variantIds?: string,
  ) {
    const productIdArray = productIds ? productIds.split(',') : [];
    const variantIdArray = variantIds ? variantIds.split(',') : [];
    return this.inventoryService.getBatchAvailability(
      productIdArray,
      variantIdArray,
    );
  }

  @Post('availability/batch')
  @Public()
  @ApiOperation({
    summary:
      'Get real-time availability for multiple products or variants (POST method)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of product IDs',
        },
        variantIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of variant IDs',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns real-time availability information for multiple products/variants',
  })
  async postBatchAvailability(
    @Body('productIds') productIds?: string[],
    @Body('variantIds') variantIds?: string[],
  ) {
    return this.inventoryService.getBatchAvailability(
      productIds || [],
      variantIds || [],
    );
  }

  // Admin endpoints below (protected)
  @Post('update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update inventory levels (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Inventory updated successfully',
  })
  async updateInventory(@Body() updateInventoryDto: any) {
    return this.inventoryService.updateInventory(updateInventoryDto);
  }

  // Add this new endpoint for adding initial stock
  @Post('add')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add initial stock for a product or variant',
    description:
      'Creates or updates inventory for a product/variant with initial stock',
  })
  @ApiBody({ type: AddStockDto })
  @ApiCreatedResponse({
    description: 'Stock added successfully',
    type: InventoryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product or variant not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  async addStock(
    @Body() addStockDto: AddStockDto,
  ): Promise<InventoryResponseDto> {
    return this.inventoryService.addStock(addStockDto);
  }
}
