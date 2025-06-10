import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PrismaService } from '../../common/prisma.service';
import { AppLogger } from '../../common/services/logger.service';
import { ProductsService } from '../products/products.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, PrismaService, AppLogger, ProductsService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
