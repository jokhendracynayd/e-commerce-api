import { Module } from '@nestjs/common';
import { PromoBannersService } from './promo-banners.service';
import { PromoBannersController } from './promo-banners.controller';
import { PrismaService } from '../../common/prisma.service';
import { AppLogger } from '../../common/services/logger.service';

@Module({
  imports: [],
  controllers: [PromoBannersController],
  providers: [PromoBannersService, PrismaService, AppLogger],
  exports: [PromoBannersService],
})
export class PromoBannersModule {}


