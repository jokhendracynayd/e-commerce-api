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

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

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
