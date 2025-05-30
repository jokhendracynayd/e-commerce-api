import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { CreateBrandDto, UpdateBrandDto, BrandResponseDto } from './dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@ApiTags('brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get all brands' })
  @ApiResponse({
    status: 200,
    description: 'Returns all brands',
    type: [BrandResponseDto],
  })
  @ApiQuery({
    name: 'includeProductCount',
    required: false,
    type: Boolean,
    description: 'Include the count of products for each brand',
  })
  findAll(
    @Query('includeProductCount') includeProductCount?: boolean,
  ): Promise<BrandResponseDto[]> {
    return this.brandsService.findAll(includeProductCount === true);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get brand by ID' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the brand to retrieve',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the brand with the specified ID',
    type: BrandResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Brand not found' })
  @ApiQuery({
    name: 'includeProductCount',
    required: false,
    type: Boolean,
    description: 'Include the count of products for this brand',
  })
  findOne(
    @Param('id') id: string,
    @Query('includeProductCount') includeProductCount?: boolean,
  ): Promise<BrandResponseDto> {
    return this.brandsService.findOne(id, includeProductCount === true);
  }

  @Get('slug/:slug')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get brand by slug' })
  @ApiParam({
    name: 'slug',
    required: true,
    description: 'The slug of the brand to retrieve',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the brand with the specified slug',
    type: BrandResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Brand not found' })
  @ApiQuery({
    name: 'includeProductCount',
    required: false,
    type: Boolean,
    description: 'Include the count of products for this brand',
  })
  findBySlug(
    @Param('slug') slug: string,
    @Query('includeProductCount') includeProductCount?: boolean,
  ): Promise<BrandResponseDto> {
    return this.brandsService.findBySlug(slug, includeProductCount === true);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new brand' })
  @ApiResponse({
    status: 201,
    description: 'The brand has been successfully created',
    type: BrandResponseDto,
  })
  @ApiConflictResponse({
    description: 'Brand with this name/slug already exists',
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBearerAuth('JWT-auth')
  create(@Body() createBrandDto: CreateBrandDto): Promise<BrandResponseDto> {
    return this.brandsService.create(createBrandDto);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a brand' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the brand to update',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'The brand has been successfully updated',
    type: BrandResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Brand not found' })
  @ApiConflictResponse({
    description: 'Brand with this name/slug already exists',
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBearerAuth('JWT-auth')
  update(
    @Param('id') id: string,
    @Body() updateBrandDto: UpdateBrandDto,
  ): Promise<BrandResponseDto> {
    return this.brandsService.update(id, updateBrandDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a brand' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the brand to delete',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'The brand has been successfully deleted',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        deleted: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Brand not found' })
  @ApiBadRequestResponse({
    description: 'Cannot delete brand with associated products',
  })
  @ApiBearerAuth('JWT-auth')
  remove(
    @Param('id') id: string,
  ): Promise<{ id: string; deleted: boolean; message: string }> {
    return this.brandsService.remove(id);
  }
}
