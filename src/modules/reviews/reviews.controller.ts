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
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReviewResponseDto,
  ReviewFilterDto,
  PaginatedReviewResponseDto,
  ReviewStatsResponseDto,
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
  ApiConflictResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

// Define interface for the authenticated request
interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all reviews',
    description: 'Retrieve reviews with filtering and pagination support',
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
    type: PaginatedReviewResponseDto,
  })
  @ApiQuery({ type: ReviewFilterDto })
  async findAll(
    @Query() filterDto: ReviewFilterDto,
  ): Promise<PaginatedReviewResponseDto> {
    return this.reviewsService.findAll(filterDto);
  }

  @Get('my-reviews')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user reviews',
    description: 'Retrieve reviews written by the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User reviews retrieved successfully',
    type: PaginatedReviewResponseDto,
  })
  @ApiQuery({ type: ReviewFilterDto })
  async getMyReviews(
    @Req() req: RequestWithUser,
    @Query() filterDto: ReviewFilterDto,
  ): Promise<PaginatedReviewResponseDto> {
    return this.reviewsService.getUserReviews(req.user.id, filterDto);
  }

  @Get('products/:productId/stats')
  @ApiOperation({
    summary: 'Get product review statistics',
    description:
      'Get rating statistics and distribution for a specific product',
  })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Product review statistics retrieved successfully',
    type: ReviewStatsResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async getProductReviewStats(
    @Param('productId') productId: string,
  ): Promise<ReviewStatsResponseDto> {
    return this.reviewsService.getProductReviewStats(productId);
  }

  @Get('eligible-products')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get products eligible for review',
    description:
      'Get products from delivered orders that can be reviewed by the user',
  })
  @ApiResponse({
    status: 200,
    description: 'Eligible products retrieved successfully',
  })
  async getEligibleProducts(@Req() req: RequestWithUser) {
    return this.reviewsService.getReviewEligibleProducts(req.user.id);
  }

  @Get('can-review/:orderId/:productId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check if user can review product',
    description:
      'Check if the authenticated user can review a specific product from an order',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Review eligibility checked successfully',
    schema: {
      type: 'object',
      properties: {
        canReview: { type: 'boolean' },
      },
    },
  })
  async canReviewProduct(
    @Req() req: RequestWithUser,
    @Param('orderId') orderId: string,
    @Param('productId') productId: string,
  ) {
    const canReview = await this.reviewsService.canUserReviewProduct(
      req.user.id,
      orderId,
      productId,
    );
    return { canReview };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get review by ID',
    description: 'Retrieve a specific review by its ID',
  })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: 200,
    description: 'Review retrieved successfully',
    type: ReviewResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Review not found' })
  async findOne(@Param('id') id: string): Promise<ReviewResponseDto> {
    return this.reviewsService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new review',
    description: 'Create a review for a product from a delivered order',
  })
  @ApiBody({ type: CreateReviewDto })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully',
    type: ReviewResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or order not eligible for review',
  })
  @ApiConflictResponse({
    description: 'Review already exists for this product and order',
  })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: RequestWithUser,
    @Body() createReviewDto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.create(req.user.id, createReviewDto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a review',
    description: 'Update an existing review (only by the review author)',
  })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiBody({ type: UpdateReviewDto })
  @ApiResponse({
    status: 200,
    description: 'Review updated successfully',
    type: ReviewResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Review not found' })
  @ApiForbiddenResponse({ description: 'You can only update your own reviews' })
  async update(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() updateReviewDto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.update(id, req.user.id, updateReviewDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a review',
    description: 'Delete an existing review (only by the review author)',
  })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: 200,
    description: 'Review deleted successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        deleted: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Review not found' })
  @ApiForbiddenResponse({ description: 'You can only delete your own reviews' })
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.reviewsService.remove(id, req.user.id);
  }

  // Admin endpoints
  @Get('admin/all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[ADMIN] Get all reviews',
    description:
      'Admin endpoint to retrieve all reviews with advanced filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'All reviews retrieved successfully',
    type: PaginatedReviewResponseDto,
  })
  @ApiQuery({ type: ReviewFilterDto })
  async getAllReviewsAdmin(
    @Query() filterDto: ReviewFilterDto,
  ): Promise<PaginatedReviewResponseDto> {
    return this.reviewsService.findAll(filterDto);
  }

  @Delete('admin/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[ADMIN] Delete any review',
    description: 'Admin endpoint to delete any review regardless of ownership',
  })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: 200,
    description: 'Review deleted successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        deleted: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Review not found' })
  async removeAdmin(@Param('id') id: string) {
    // For admin deletion, we'll use a special admin user ID
    // This should be handled differently in the service for admin operations
    return this.reviewsService.remove(id, 'admin');
  }
}
