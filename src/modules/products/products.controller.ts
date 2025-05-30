import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  ProductFilterDto,
  PaginatedProductResponseDto,
  CreateProductDealDto,
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
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import {
  ProductImageDto,
  CreateProductVariantDto,
} from './dto/create-product.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get all products with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of products',
    type: PaginatedProductResponseDto,
  })
  findAll(
    @Query() filterDto: ProductFilterDto,
  ): Promise<PaginatedProductResponseDto> {
    return this.productsService.findAll(filterDto);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the product to retrieve',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the product with the specified ID',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    return this.productsService.findOne(id);
  }

  @Get('slug/:slug')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get product by slug' })
  @ApiParam({
    name: 'slug',
    required: true,
    description: 'The slug of the product to retrieve',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the product with the specified slug',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  findBySlug(@Param('slug') slug: string): Promise<ProductResponseDto> {
    return this.productsService.findBySlug(slug);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: 201,
    description: 'The product has been successfully created',
    type: ProductResponseDto,
  })
  @ApiConflictResponse({
    description: 'Product with this title/slug already exists',
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBearerAuth('JWT-auth')
  create(
    @Body() createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.create(createProductDto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the product to update',
    type: String,
  })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: 200,
    description: 'The product has been successfully updated',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiConflictResponse({
    description: 'Product with this title/slug already exists',
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBearerAuth('JWT-auth')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the product to delete',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'The product has been successfully deleted',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        deleted: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiBadRequestResponse({
    description: 'Cannot delete product with associated orders',
  })
  @ApiBearerAuth('JWT-auth')
  remove(
    @Param('id') id: string,
  ): Promise<{ id: string; deleted: boolean; message: string }> {
    return this.productsService.remove(id);
  }

  // Product Images Endpoints
  @Post(':id/images')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Add images to a product' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the product to add images to',
    type: String,
  })
  @ApiBody({
    type: [ProductImageDto],
    description: 'Array of images to add to the product',
  })
  @ApiResponse({
    status: 201,
    description: 'Images have been successfully added to the product',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBearerAuth('JWT-auth')
  addImages(
    @Param('id') id: string,
    @Body() images: ProductImageDto[],
  ): Promise<ProductResponseDto> {
    return this.productsService.addImages(id, images);
  }

  @Delete(':productId/images/:imageId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove an image from a product' })
  @ApiParam({
    name: 'productId',
    required: true,
    description: 'The ID of the product',
    type: String,
  })
  @ApiParam({
    name: 'imageId',
    required: true,
    description: 'The ID of the image to remove',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'The image has been successfully removed from the product',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product or image not found' })
  @ApiBearerAuth('JWT-auth')
  removeImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.removeImage(productId, imageId);
  }

  // Product Variants Endpoints
  @Post(':id/variants')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Add variants to a product' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the product to add variants to',
    type: String,
  })
  @ApiBody({
    type: [CreateProductVariantDto],
    description: 'Array of variants to add to the product',
  })
  @ApiResponse({
    status: 201,
    description: 'Variants have been successfully added to the product',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBearerAuth('JWT-auth')
  addVariants(
    @Param('id') id: string,
    @Body() variants: CreateProductVariantDto[],
  ): Promise<ProductResponseDto> {
    return this.productsService.addVariants(id, variants);
  }

  @Delete(':productId/variants/:variantId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove a variant from a product' })
  @ApiParam({
    name: 'productId',
    required: true,
    description: 'The ID of the product',
    type: String,
  })
  @ApiParam({
    name: 'variantId',
    required: true,
    description: 'The ID of the variant to remove',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'The variant has been successfully removed from the product',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product or variant not found' })
  @ApiBadRequestResponse({
    description: 'Cannot delete variant with associated orders',
  })
  @ApiBearerAuth('JWT-auth')
  removeVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.removeVariant(productId, variantId);
  }

  // Product Deals Endpoints
  @Post(':id/deals')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Add a deal to a product' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the product to add a deal to',
    type: String,
  })
  @ApiBody({
    type: CreateProductDealDto,
    description: 'Deal to add to the product',
  })
  @ApiResponse({
    status: 201,
    description: 'Deal has been successfully added to the product',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBearerAuth('JWT-auth')
  addDeal(
    @Param('id') id: string,
    @Body() deal: CreateProductDealDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.addDeal(id, deal);
  }

  @Delete(':productId/deals/:dealId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove a deal from a product' })
  @ApiParam({
    name: 'productId',
    required: true,
    description: 'The ID of the product',
    type: String,
  })
  @ApiParam({
    name: 'dealId',
    required: true,
    description: 'The ID of the deal to remove',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'The deal has been successfully removed from the product',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product or deal not found' })
  @ApiBearerAuth('JWT-auth')
  removeDeal(
    @Param('productId') productId: string,
    @Param('dealId') dealId: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.removeDeal(productId, dealId);
  }
}
