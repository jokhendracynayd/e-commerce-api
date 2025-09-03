import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AppLogger } from '../../common/services/logger.service';
import { CreatePromoBannerDto } from './dto/create-promo-banner.dto';
import { UpdatePromoBannerDto } from './dto/update-promo-banner.dto';

@Injectable()
export class PromoBannersService {
  constructor(
    private prisma: PrismaService,
    private logger: AppLogger,
  ) {
    this.logger.setContext('PromoBannersService');
  }

  async listPublic(params: {
    placement?: string;
    device?: string;
    now?: Date;
  }) {
    const now = params.now || new Date();
    try {
      const where: any = {
        isActive: true,
        OR: [
          { visibleFrom: null, visibleTo: null },
          { visibleFrom: { lte: now }, visibleTo: null },
          { visibleFrom: null, visibleTo: { gte: now } },
          { visibleFrom: { lte: now }, visibleTo: { gte: now } },
        ],
      };
      if (params.placement) where.placement = params.placement;
      if (params.device && params.device !== 'ALL')
        where.device = params.device;

      const banners = await this.prisma.promoBanner.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });
      return banners;
    } catch (e) {
      this.logger.error('Failed to list public promo banners', e.stack);
      throw new InternalServerErrorException('Failed to list promo banners');
    }
  }

  async listAdmin(params: {
    placement?: string;
    device?: string;
    isActive?: string | boolean;
  }) {
    try {
      const where: any = {};
      if (params.placement) where.placement = params.placement;
      if (params.device) where.device = params.device;
      if (params.isActive !== undefined && params.isActive !== 'all') {
        // Accept 'true'/'false' strings or boolean
        const flag =
          typeof params.isActive === 'string'
            ? params.isActive === 'true'
            : params.isActive;
        where.isActive = flag;
      }

      return await this.prisma.promoBanner.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });
    } catch (e) {
      this.logger.error('Failed to list admin promo banners', e.stack);
      throw new InternalServerErrorException('Failed to list promo banners');
    }
  }

  async create(dto: CreatePromoBannerDto) {
    try {
      const data: any = { ...dto };
      // Normalize date strings from datetime-local inputs
      if (dto.visibleFrom !== undefined) {
        data.visibleFrom = dto.visibleFrom ? new Date(dto.visibleFrom) : null;
      }
      if (dto.visibleTo !== undefined) {
        data.visibleTo = dto.visibleTo ? new Date(dto.visibleTo) : null;
      }

      return await this.prisma.promoBanner.create({ data });
    } catch (e) {
      this.logger.error('Failed to create promo banner', e.stack);
      throw new InternalServerErrorException('Failed to create banner');
    }
  }

  async update(id: string, dto: UpdatePromoBannerDto) {
    try {
      const data: any = { ...dto };
      if ('visibleFrom' in dto) {
        data.visibleFrom = dto.visibleFrom
          ? new Date(dto.visibleFrom as any)
          : null;
      }
      if ('visibleTo' in dto) {
        data.visibleTo = dto.visibleTo ? new Date(dto.visibleTo as any) : null;
      }
      return await this.prisma.promoBanner.update({ where: { id }, data });
    } catch (e) {
      if (e.code === 'P2025') throw new NotFoundException('Banner not found');
      this.logger.error('Failed to update promo banner', e.stack);
      throw new InternalServerErrorException('Failed to update banner');
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.promoBanner.delete({ where: { id } });
      return { id };
    } catch (e) {
      if (e.code === 'P2025') throw new NotFoundException('Banner not found');
      this.logger.error('Failed to delete promo banner', e.stack);
      throw new InternalServerErrorException('Failed to delete banner');
    }
  }
}
