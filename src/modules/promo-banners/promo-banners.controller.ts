import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { PromoBannersService } from './promo-banners.service';
import { PromoBannerResponseDto } from './dto/response.dto';
import { CreatePromoBannerDto } from './dto/create-promo-banner.dto';
import { UpdatePromoBannerDto } from './dto/update-promo-banner.dto';
import { Public } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';

@ApiTags('promo-banners')
@Controller('promo-banners')
export class PromoBannersController {
  constructor(private service: PromoBannersService) {}

  // Public listing with caching
  @Get()
  @Public()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60 * 5)
  @ApiOperation({ summary: 'List active promo banners for a placement/device' })
  @ApiQuery({ name: 'placement', required: false })
  @ApiQuery({ name: 'device', required: false, description: 'ALL | DESKTOP | MOBILE' })
  @ApiResponse({ status: 200, type: [PromoBannerResponseDto] })
  async listPublic(
    @Query('placement') placement?: string,
    @Query('device') device?: string,
  ): Promise<PromoBannerResponseDto[]> {
    return (await this.service.listPublic({ placement, device })) as any;
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List promo banners (admin)' })
  @ApiQuery({ name: 'placement', required: false })
  @ApiQuery({ name: 'device', required: false })
  @ApiQuery({ name: 'isActive', required: false, description: 'true | false | all' })
  async listAdmin(
    @Query('placement') placement?: string,
    @Query('device') device?: string,
    @Query('isActive') isActive?: string,
  ): Promise<PromoBannerResponseDto[]> {
    return (await this.service.listAdmin({ placement, device, isActive })) as any;
  }

  // Admin endpoints
  @Post()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create promo banner (admin)' })
  async create(@Body() dto: CreatePromoBannerDto): Promise<PromoBannerResponseDto> {
    return (await this.service.create(dto)) as any;
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update promo banner (admin)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePromoBannerDto,
  ): Promise<PromoBannerResponseDto> {
    return (await this.service.update(id, dto)) as any;
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete promo banner (admin)' })
  async remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.service.remove(id);
  }
}


