import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  CouponResponseDto,
  ApplyCouponDto,
  ValidateCouponDto,
} from './dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard, Public } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('coupons')
@Controller('coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new coupon' })
  @ApiResponse({
    status: 201,
    description: 'The coupon has been successfully created.',
    type: CouponResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() createCouponDto: CreateCouponDto): Promise<CouponResponseDto> {
    return this.couponsService.create(createCouponDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all coupons' })
  @ApiResponse({
    status: 200,
    description: 'Return all coupons.',
    type: [CouponResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAll(): Promise<CouponResponseDto[]> {
    return this.couponsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get coupon by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the coupon.',
    type: CouponResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Coupon not found.' })
  findOne(@Param('id') id: string): Promise<CouponResponseDto> {
    return this.couponsService.findOne(id);
  }

  @Get('code/:code')
  @Public()
  @ApiOperation({ summary: 'Get coupon by code' })
  @ApiResponse({
    status: 200,
    description: 'Return the coupon.',
    type: CouponResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Coupon not found.' })
  findByCode(@Param('code') code: string): Promise<CouponResponseDto> {
    return this.couponsService.findByCode(code);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a coupon' })
  @ApiResponse({
    status: 200,
    description: 'The coupon has been successfully updated.',
    type: CouponResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Coupon not found.' })
  update(
    @Param('id') id: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ): Promise<CouponResponseDto> {
    return this.couponsService.update(id, updateCouponDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a coupon' })
  @ApiResponse({
    status: 200,
    description: 'The coupon has been successfully deleted.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Coupon not found.' })
  remove(@Param('id') id: string): Promise<void> {
    return this.couponsService.remove(id);
  }

  @Post('validate')
  @Public()
  @ApiOperation({ summary: 'Validate a coupon' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  validate(
    @Body() validateCouponDto: ValidateCouponDto,
  ): Promise<{ valid: boolean; message?: string }> {
    return this.couponsService.validate(validateCouponDto);
  }

  @Post('apply')
  @Public()
  @ApiOperation({ summary: 'Apply a coupon to calculate discount' })
  @ApiResponse({ status: 200, description: 'Discount calculation result' })
  @ApiResponse({ status: 400, description: 'Invalid coupon or other error' })
  applyCoupon(
    @Body() applyCouponDto: ApplyCouponDto,
  ): Promise<{ discountAmount: string; couponCode: string }> {
    return this.couponsService.applyCoupon(applyCouponDto);
  }

  @Post('record-usage')
  @Roles(Role.ADMIN, Role.USER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Record coupon usage' })
  @ApiResponse({ status: 200, description: 'Coupon usage recorded' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  async recordUsage(
    @Body()
    payload: {
      orderId: string;
      userId: string;
      couponCode: string;
      discountAmount: string;
    },
  ): Promise<{ success: boolean }> {
    const { orderId, userId, couponCode, discountAmount } = payload;

    if (!orderId || !userId || !couponCode || !discountAmount) {
      throw new BadRequestException('Missing required fields');
    }

    await this.couponsService.recordCouponUsage(
      orderId,
      userId,
      couponCode,
      discountAmount,
    );
    return { success: true };
  }
}
