import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { CategoriesService } from './categories.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  CategoryDetailResponseDto,
  CategoryTreeResponseDto,
} from './dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  CategoryWithRelations,
  CategoryTreeNode,
} from './interfaces/category.interface';
import { Public } from '../../common/guards/jwt-auth.guard';
import { ProductsService } from '../products/products.service';
import { ProductFilterDto, PaginatedProductResponseDto } from '../products/dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly productsService: ProductsService,
  ) {}

  @Public()
  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60 * 15) // Cache for 15 minutes
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({
    status: 200,
    description: 'List of all categories',
    type: [CategoryResponseDto],
  })
  async findAll(): Promise<CategoryWithRelations[]> {
    return this.categoriesService.findAll();
  }

  @Public()
  @Get('tree')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60 * 15) // Cache for 15 minutes
  @ApiOperation({ summary: 'Get category hierarchy tree' })
  @ApiResponse({
    status: 200,
    description: 'Category hierarchy tree',
    type: [CategoryTreeResponseDto],
  })
  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    return this.categoriesService.getCategoryTree();
  }

  @Public()
  @Get(':id/products')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60 * 5) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get products in a category' })
  @ApiParam({ name: 'id', type: 'string', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'List of products in the category',
    type: PaginatedProductResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Field to sort by',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort direction',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Minimum price filter',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Maximum price filter',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  async getCategoryProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filterDto: ProductFilterDto,
  ): Promise<PaginatedProductResponseDto> {
    // First verify the category exists
    await this.categoriesService.findOne(id);

    // Pass the category ID to the product filter
    const categoryFilterDto = {
      ...filterDto,
      categoryId: id,
    };

    // Return paginated products
    return this.productsService.findAll(categoryFilterDto);
  }

  @Public()
  @Get(':id/recursive-products')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60 * 5) // Cache for 5 minutes
  @ApiOperation({
    summary:
      'Get products from a category and all its subcategories recursively',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Products grouped by category',
    type: 'object', // Custom response type
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of products to return',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['price', 'title', 'rating'],
    description: 'Field to sort by',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort direction',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Minimum price filter',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Maximum price filter',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for product title',
  })
  @ApiQuery({
    name: 'featured',
    required: false,
    type: Boolean,
    description: 'Filter by featured status',
  })
  async getCategoryProductsRecursive(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('sortBy') sortBy?: 'price' | 'title' | 'rating',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('search') search?: string,
    @Query('featured') featured?: boolean,
  ): Promise<any> {
    // Get the category with its products and child categories recursively
    return this.categoriesService.getCategoryProductsRecursive(id, {
      limit,
      page,
      sortBy,
      sortOrder,
      minPrice,
      maxPrice,
      search,
      featured,
    });
  }

  @Get('slug/:slug')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60 * 15) // Cache for 15 minutes
  @ApiOperation({ summary: 'Get a category by slug' })
  @ApiParam({ name: 'slug', type: 'string', description: 'Category slug' })
  @ApiResponse({
    status: 200,
    description: 'Category details',
    type: CategoryDetailResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  async findBySlug(
    @Param('slug') slug: string,
  ): Promise<CategoryWithRelations> {
    return this.categoriesService.findBySlug(slug);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60 * 15) // Cache for 15 minutes
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category details',
    type: CategoryDetailResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryWithRelations> {
    return this.categoriesService.findOne(id);
  }

  @Public()
  @Get(':id/breadcrumb')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60 * 15) // Cache for 15 minutes
  @ApiOperation({ summary: 'Get category breadcrumb trail' })
  @ApiParam({ name: 'id', type: 'string', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category breadcrumb trail',
    type: [CategoryResponseDto],
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  async getParentTree(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.getParentTree(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new category' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 201,
    description: 'Category successfully created',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryWithRelations> {
    return this.categoriesService.create(createCategoryDto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a category' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', type: 'string', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category successfully updated',
    type: CategoryDetailResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryWithRelations> {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', type: 'string', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category successfully deleted',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        deleted: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Category deleted successfully' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({
    description: 'Cannot delete category with products or subcategories',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string; deleted: boolean; message: string }> {
    return this.categoriesService.remove(id);
  }
}
