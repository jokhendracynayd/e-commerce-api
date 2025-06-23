import {
  Controller,
  Get,
  Query,
  Param,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import {
  RecommendationQueryDto,
  RecommendationResponseDto,
} from './dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Public } from '../../common/decorators/public.decorator';
import { RecommendationType } from '@prisma/client';

@ApiTags('recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  @Public()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(900) // Cache for 15 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get recommendations',
    description:
      'Get recommendations based on type and other parameters. Supports multiple recommendation types.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns recommendations based on the specified criteria',
    type: [RecommendationResponseDto],
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  @ApiInternalServerErrorResponse({ description: 'Failed to get recommendations' })
  @ApiQuery({
    name: 'type',
    required: true,
    enum: RecommendationType,
    description: 'Type of recommendations to retrieve',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'User ID for personalized recommendations',
  })
  @ApiQuery({
    name: 'sessionId',
    required: false,
    type: String,
    description: 'Session ID for anonymous user recommendations',
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: String,
    description: 'Product ID for related product recommendations',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Category ID to filter recommendations',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recommendations to return (1-50)',
    example: 10,
  })
  @ApiQuery({
    name: 'includeProduct',
    required: false,
    type: Boolean,
    description: 'Whether to include product details in response',
    example: true,
  })
  async getRecommendations(
    @Query(new ValidationPipe({ transform: true })) queryDto: RecommendationQueryDto,
  ): Promise<RecommendationResponseDto[]> {
    return this.recommendationsService.getRecommendations(queryDto);
  }

  @Get('similar/:productId')
  @Public()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(1800) // Cache for 30 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get similar products',
    description: 'Get products similar to the specified product based on category, brand, and other attributes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns similar products',
    type: [RecommendationResponseDto],
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiBadRequestResponse({ description: 'Invalid product ID' })
  @ApiInternalServerErrorResponse({ description: 'Failed to get similar products' })
  @ApiParam({
    name: 'productId',
    type: String,
    description: 'Product ID to find similar items for',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of similar products to return (1-50)',
    example: 10,
  })
  @ApiQuery({
    name: 'includeProduct',
    required: false,
    type: Boolean,
    description: 'Whether to include product details in response',
    example: true,
  })
  async getSimilarProducts(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('limit') limit?: number,
    @Query('includeProduct') includeProduct?: boolean,
  ): Promise<RecommendationResponseDto[]> {
    return this.recommendationsService.getSimilarProducts(
      productId,
      limit ? parseInt(limit.toString()) : 10,
      includeProduct !== false,
    );
  }

  @Get('frequently-bought-together/:productId')
  @Public()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(1800) // Cache for 30 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get frequently bought together products',
    description: 'Get products frequently bought together with the specified product based on order history analysis.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns frequently bought together products',
    type: [RecommendationResponseDto],
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiBadRequestResponse({ description: 'Invalid product ID' })
  @ApiInternalServerErrorResponse({ description: 'Failed to get frequently bought together products' })
  @ApiParam({
    name: 'productId',
    type: String,
    description: 'Product ID to find complementary items for',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of products to return (1-50)',
    example: 10,
  })
  @ApiQuery({
    name: 'includeProduct',
    required: false,
    type: Boolean,
    description: 'Whether to include product details in response',
    example: true,
  })
  async getFrequentlyBoughtTogether(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('limit') limit?: number,
    @Query('includeProduct') includeProduct?: boolean,
  ): Promise<RecommendationResponseDto[]> {
    return this.recommendationsService.getFrequentlyBoughtTogether(
      productId,
      limit ? parseInt(limit.toString()) : 10,
      includeProduct !== false,
    );
  }

  @Get('personalized')
  @Public()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(900) // Cache for 15 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get personalized recommendations',
    description: 'Get personalized product recommendations based on user behavior and preferences.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns personalized recommendations',
    type: [RecommendationResponseDto],
  })
  @ApiBadRequestResponse({ description: 'User ID or session ID required' })
  @ApiInternalServerErrorResponse({ description: 'Failed to get personalized recommendations' })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'User ID to get recommendations for',
  })
  @ApiQuery({
    name: 'sessionId',
    required: false,
    type: String,
    description: 'Session ID for anonymous users',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recommendations to return (1-50)',
    example: 10,
  })
  @ApiQuery({
    name: 'includeProduct',
    required: false,
    type: Boolean,
    description: 'Whether to include product details in response',
    example: true,
  })
  async getPersonalizedRecommendations(
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('limit') limit?: number,
    @Query('includeProduct') includeProduct?: boolean,
  ): Promise<RecommendationResponseDto[]> {
    return this.recommendationsService.getPersonalizedRecommendations(
      userId,
      sessionId,
      limit ? parseInt(limit.toString()) : 10,
      includeProduct !== false,
    );
  }

  @Get('trending')
  @Public()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(1800) // Cache for 30 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get trending products',
    description: 'Get currently trending products based on recent user activity and velocity metrics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns trending products',
    type: [RecommendationResponseDto],
  })
  @ApiInternalServerErrorResponse({ description: 'Failed to get trending products' })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Category ID to filter trending products',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of trending products to return (1-50)',
    example: 10,
  })
  @ApiQuery({
    name: 'includeProduct',
    required: false,
    type: Boolean,
    description: 'Whether to include product details in response',
    example: true,
  })
  async getTrendingProducts(
    @Query('categoryId') categoryId?: string,
    @Query('limit') limit?: number,
    @Query('includeProduct') includeProduct?: boolean,
  ): Promise<RecommendationResponseDto[]> {
    return this.recommendationsService.getTrendingProducts(
      categoryId,
      limit ? parseInt(limit.toString()) : 10,
      includeProduct !== false,
    );
  }

  @Get('recently-viewed')
  @Public()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get recently viewed products',
    description: 'Get products recently viewed by the user or session, filtered by availability.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns recently viewed products',
    type: [RecommendationResponseDto],
  })
  @ApiBadRequestResponse({ description: 'User ID or session ID required' })
  @ApiInternalServerErrorResponse({ description: 'Failed to get recently viewed products' })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'User ID to get history for',
  })
  @ApiQuery({
    name: 'sessionId',
    required: false,
    type: String,
    description: 'Session ID to get history for',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of products to return (1-50)',
    example: 10,
  })
  @ApiQuery({
    name: 'includeProduct',
    required: false,
    type: Boolean,
    description: 'Whether to include product details in response',
    example: true,
  })
  async getRecentlyViewed(
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('limit') limit?: number,
    @Query('includeProduct') includeProduct?: boolean,
  ): Promise<RecommendationResponseDto[]> {
    return this.recommendationsService.getRecentlyViewed(
      userId,
      sessionId,
      limit ? parseInt(limit.toString()) : 10,
      includeProduct !== false,
    );
  }

  @Get('top-rated')
  @Public()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600) // Cache for 1 hour
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get top rated products',
    description: 'Get highest rated products with minimum rating and review thresholds.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns top rated products',
    type: [RecommendationResponseDto],
  })
  @ApiInternalServerErrorResponse({ description: 'Failed to get top rated products' })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Category ID to filter top rated products',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of products to return (1-50)',
    example: 10,
  })
  @ApiQuery({
    name: 'includeProduct',
    required: false,
    type: Boolean,
    description: 'Whether to include product details in response',
    example: true,
  })
  async getTopRatedProducts(
    @Query('categoryId') categoryId?: string,
    @Query('limit') limit?: number,
    @Query('includeProduct') includeProduct?: boolean,
  ): Promise<RecommendationResponseDto[]> {
    return this.recommendationsService.getTopRatedProducts(
      categoryId,
      limit ? parseInt(limit.toString()) : 10,
      includeProduct !== false,
    );
  }

  @Get('bestsellers')
  @Public()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(1800) // Cache for 30 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get bestseller products',
    description: 'Get bestselling products based on recent sales data and order history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns bestseller products',
    type: [RecommendationResponseDto],
  })
  @ApiInternalServerErrorResponse({ description: 'Failed to get bestseller products' })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Category ID to filter bestsellers',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of products to return (1-50)',
    example: 10,
  })
  @ApiQuery({
    name: 'includeProduct',
    required: false,
    type: Boolean,
    description: 'Whether to include product details in response',
    example: true,
  })
  async getBestsellerProducts(
    @Query('categoryId') categoryId?: string,
    @Query('limit') limit?: number,
    @Query('includeProduct') includeProduct?: boolean,
  ): Promise<RecommendationResponseDto[]> {
    return this.recommendationsService.getBestsellerProducts(
      categoryId,
      limit ? parseInt(limit.toString()) : 10,
      includeProduct !== false,
    );
  }

  @Get('new-arrivals')
  @Public()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600) // Cache for 1 hour
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get new arrival products',
    description: 'Get newly added products ordered by creation date.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns new arrival products',
    type: [RecommendationResponseDto],
  })
  @ApiInternalServerErrorResponse({ description: 'Failed to get new arrivals' })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Category ID to filter new arrivals',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of products to return (1-50)',
    example: 10,
  })
  @ApiQuery({
    name: 'includeProduct',
    required: false,
    type: Boolean,
    description: 'Whether to include product details in response',
    example: true,
  })
  async getNewArrivals(
    @Query('categoryId') categoryId?: string,
    @Query('limit') limit?: number,
    @Query('includeProduct') includeProduct?: boolean,
  ): Promise<RecommendationResponseDto[]> {
    return this.recommendationsService.getNewArrivals(
      categoryId,
      limit ? parseInt(limit.toString()) : 10,
      includeProduct !== false,
    );
  }
} 