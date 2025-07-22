import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Req,
  Headers,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import {
  CreateUserActivityDto,
  CreateBatchActivityDto,
  UserActivityResponseDto,
  BrowsingHistoryResponseDto,
} from './dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimited } from '../../common/decorators/rate-limit.decorator';
import { Request } from 'express';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('activity')
  @Public()
  @RateLimited() // Rate limited
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Track a single user activity',
    description:
      'Records a single user activity event for analytics and recommendation purposes',
  })
  @ApiResponse({
    status: 201,
    description: 'Activity successfully tracked',
    type: UserActivityResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid activity data' })
  @ApiInternalServerErrorResponse({ description: 'Failed to track activity' })
  @ApiHeader({
    name: 'X-Session-ID',
    description: 'Session ID for anonymous users',
    required: false,
  })
  @ApiHeader({
    name: 'X-User-ID',
    description: 'User ID when available',
    required: false,
  })
  async trackActivity(
    @Body() createActivityDto: CreateUserActivityDto,
    @Req() request: Request,
    @Headers('x-session-id') sessionIdHeader?: string,
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<UserActivityResponseDto> {
    // Try to get userId from multiple sources in order of preference:
    // 1. JWT authentication (most reliable)
    // 2. X-User-ID header (fallback)
    // 3. metadata userId (fallback)
    const userId =
      (request as any).user?.id ||
      userIdHeader ||
      createActivityDto.metadata?.userId;

    const ipAddress = request.ip || request.connection.remoteAddress;
    const userAgent = request.get('User-Agent');

    // Use session ID from header if provided, otherwise use from DTO
    const sessionId = sessionIdHeader || createActivityDto.sessionId;
    const activityDto = { ...createActivityDto, sessionId };

    // Enhanced logging for debugging
    console.log('Analytics Controller - trackActivity:', {
      authUserId: (request as any).user?.id || 'null',
      headerUserId: userIdHeader || 'null',
      metadataUserId: createActivityDto.metadata?.userId || 'null',
      finalUserId: userId || 'null',
      entityId: createActivityDto.entityId || 'null',
      entityType: createActivityDto.entityType || 'null',
      activityType: createActivityDto.activityType,
      hasAuthHeader: !!request.headers.authorization,
      sessionId: sessionId,
    });

    return this.analyticsService.trackActivity(
      activityDto,
      userId,
      ipAddress,
      userAgent,
    );
  }

  @Post('batch')
  @Public()
  @RateLimited() // Rate limited
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Track multiple user activities in batch',
    description:
      'Records multiple user activity events in a single request for better performance',
  })
  @ApiResponse({
    status: 201,
    description: 'Activities successfully tracked',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        count: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid batch activity data' })
  @ApiInternalServerErrorResponse({
    description: 'Failed to track batch activities',
  })
  @ApiHeader({
    name: 'X-Session-ID',
    description: 'Session ID for anonymous users',
    required: false,
  })
  @ApiHeader({
    name: 'X-User-ID',
    description: 'User ID when available',
    required: false,
  })
  async trackBatchActivities(
    @Body() createBatchDto: CreateBatchActivityDto,
    @Req() request: Request,
    @Headers('x-session-id') sessionIdHeader?: string,
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<{ success: boolean; count: number; message: string }> {
    // Try to get userId from multiple sources in order of preference:
    // 1. JWT authentication (most reliable)
    // 2. X-User-ID header (fallback)
    // 3. First activity's metadata userId (fallback)
    let userId = (request as any).user?.id || userIdHeader;

    if (!userId && createBatchDto.activities.length > 0) {
      const firstActivityUserId = createBatchDto.activities[0].metadata?.userId;
      if (firstActivityUserId) {
        userId = firstActivityUserId;
      }
    }

    const ipAddress = request.ip || request.connection.remoteAddress;
    const userAgent = request.get('User-Agent');

    // Enhanced logging for debugging
    console.log('Analytics Controller - trackBatchActivities:', {
      authUserId: (request as any).user?.id || 'null',
      headerUserId: userIdHeader || 'null',
      metadataUserId: createBatchDto.activities[0]?.metadata?.userId || 'null',
      finalUserId: userId || 'null',
      hasAuthHeader: !!request.headers.authorization,
      activitiesCount: createBatchDto.activities.length,
      sampleEntityId: createBatchDto.activities[0]?.entityId || 'null',
      sampleEntityType: createBatchDto.activities[0]?.entityType || 'null',
    });

    // Apply session ID to all activities if provided in header
    if (sessionIdHeader) {
      createBatchDto.activities = createBatchDto.activities.map((activity) => ({
        ...activity,
        sessionId: sessionIdHeader,
      }));
    }

    return this.analyticsService.trackBatchActivities(
      createBatchDto,
      userId,
      ipAddress,
      userAgent,
    );
  }

  @Get('history')
  @Public()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes
  @ApiOperation({
    summary: 'Get browsing history',
    description: 'Retrieves browsing history for a user or session',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns browsing history',
    type: [BrowsingHistoryResponseDto],
  })
  @ApiBadRequestResponse({
    description: 'Either userId or sessionId must be provided',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to retrieve browsing history',
  })
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
    description: 'Number of history items to return',
    example: 10,
  })
  @ApiQuery({
    name: 'includeProduct',
    required: false,
    type: Boolean,
    description: 'Include product details in response',
    example: true,
  })
  async getBrowsingHistory(
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('limit') limit?: number,
    @Query('includeProduct') includeProduct?: boolean,
  ): Promise<BrowsingHistoryResponseDto[]> {
    return this.analyticsService.getBrowsingHistory(
      userId,
      sessionId,
      limit ? parseInt(limit.toString()) : 10,
      includeProduct !== false,
    );
  }

  @Get('activities')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(180) // Cache for 3 minutes
  @ApiOperation({
    summary: 'Get user activities',
    description: 'Retrieves activity history for a user or session',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns user activities',
    type: [UserActivityResponseDto],
  })
  @ApiBadRequestResponse({
    description: 'Either userId or sessionId must be provided',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to retrieve user activities',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'User ID to get activities for',
  })
  @ApiQuery({
    name: 'sessionId',
    required: false,
    type: String,
    description: 'Session ID to get activities for',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of activities to return',
    example: 50,
  })
  @ApiQuery({
    name: 'activityType',
    required: false,
    type: String,
    description: 'Filter by activity type',
    example: 'PRODUCT_VIEW',
  })
  async getUserActivities(
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('limit') limit?: number,
    @Query('activityType') activityType?: string,
  ): Promise<UserActivityResponseDto[]> {
    return this.analyticsService.getUserActivities(
      userId,
      sessionId,
      limit ? parseInt(limit.toString()) : 50,
      activityType,
    );
  }

  @Post('conversion')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark conversion',
    description: 'Marks browsing history entries as converted (purchased)',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversion successfully marked',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'User ID for conversion tracking',
  })
  @ApiQuery({
    name: 'sessionId',
    required: false,
    type: String,
    description: 'Session ID for conversion tracking',
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: String,
    description: 'Specific product ID for conversion',
  })
  async markConversion(
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('productId') productId?: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.analyticsService.markConversion(userId, sessionId, productId);
    return {
      success: true,
      message: 'Conversion marked successfully',
    };
  }
}
