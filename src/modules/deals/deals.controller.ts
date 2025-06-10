import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Delete, 
  Query, 
  Patch, 
  UseGuards, 
  HttpCode, 
  HttpStatus,
  ParseUUIDPipe
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { DealsService } from './deals.service';
import { 
  CreateDealDto,
  UpdateDealDto,
  DealResponseDto,
  DealListResponseDto,
  AddProductToDealDto
} from './dto';
import { JwtAuthGuard, Public } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DealType } from '@prisma/client';

@ApiTags('Deals')
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all deals with pagination and filtering' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns a list of deals', 
    type: DealListResponseDto 
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['Active', 'Upcoming', 'Ended'] })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: 'Active' | 'Upcoming' | 'Ended',
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const pageNum = page !== undefined ? Number(page) : 1;
    const limitNum = limit !== undefined ? Number(limit) : 10;
    
    return this.dealsService.findAll({
      skip: pageNum > 0 ? (pageNum - 1) * limitNum : 0,
      take: limitNum > 0 ? limitNum : 10,
      search,
      status,
      sortBy,
      sortOrder,
    });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a deal by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the deal', 
    type: DealResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Deal not found' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.dealsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @ApiOperation({ summary: 'Create a new deal' })
  @ApiResponse({ 
    status: 201, 
    description: 'Deal created successfully', 
    type: DealResponseDto 
  })
  @ApiBearerAuth()
  @Roles('ADMIN', 'SELLER')
  async create(@Body() createDealDto: CreateDealDto) {
    return this.dealsService.create(createDealDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a deal' })
  @ApiResponse({ 
    status: 200, 
    description: 'Deal updated successfully', 
    type: DealResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Deal not found' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiBearerAuth()
  @Roles('ADMIN', 'SELLER')
  async update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateDealDto: UpdateDealDto
  ) {
    return this.dealsService.update(id, updateDealDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a deal' })
  @ApiResponse({ status: 204, description: 'Deal deleted successfully' })
  @ApiResponse({ status: 404, description: 'Deal not found' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'SELLER')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.dealsService.remove(id);
  }

  @Public()
  @Get(':id/products')
  @ApiOperation({ summary: 'Get products in a deal' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the products in the deal'
  })
  @ApiResponse({ status: 404, description: 'Deal not found' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pageNum = page !== undefined ? Number(page) : 1;
    const limitNum = limit !== undefined ? Number(limit) : 10;
    
    return this.dealsService.getProducts(id, {
      skip: pageNum > 0 ? (pageNum - 1) * limitNum : 0,
      take: limitNum > 0 ? limitNum : 10,
    });
  }

  @Public()
  @Post(':id/products')
  @ApiOperation({ summary: 'Add a product to a deal' })
  @ApiResponse({ status: 200, description: 'Product added to deal successfully' })
  @ApiResponse({ status: 404, description: 'Deal or product not found' })
  @ApiResponse({ status: 400, description: 'Product already in deal' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  async addProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addProductDto: AddProductToDealDto,
  ) {
    console.log(`Adding product ${addProductDto.productId} to deal ${id}`);
    try {
      const result = await this.dealsService.addProduct(id, addProductDto.productId);
      return result;
    } catch (error) {
      console.error(`Error adding product to deal: ${error.message}`, {
        dealId: id,
        productId: addProductDto.productId,
        stack: error.stack
      });
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id/products/:productId')
  @ApiOperation({ summary: 'Remove a product from a deal' })
  @ApiResponse({ status: 200, description: 'Product removed from deal successfully' })
  @ApiResponse({ status: 404, description: 'Deal or product not found' })
  @ApiResponse({ status: 400, description: 'Product not in deal' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiBearerAuth()
  @Roles('ADMIN', 'SELLER')
  async removeProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.dealsService.removeProduct(id, productId);
  }

  @Public()
  @Get('types/:dealType/products')
  @ApiOperation({ summary: 'Get products by deal type' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns products associated with the specified deal type'
  })
  @ApiResponse({ status: 400, description: 'Invalid deal type' })
  @ApiParam({ name: 'dealType', enum: DealType, description: 'Deal type (TRENDING, FLASH, DEAL_OF_DAY)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (starts at 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: ['Active', 'Upcoming', 'Ended'], description: 'Deal status filter' })
  async getProductsByDealType(
    @Param('dealType') dealType: DealType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: 'Active' | 'Upcoming' | 'Ended',
  ) {
    const pageNum = page !== undefined ? Number(page) : 1;
    const limitNum = limit !== undefined ? Number(limit) : 10;
    
    return this.dealsService.getProductsByDealType(dealType, {
      skip: pageNum > 0 ? (pageNum - 1) * limitNum : 0,
      take: limitNum > 0 ? limitNum : 10,
      status
    });
  }
} 