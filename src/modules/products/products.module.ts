import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CommonModule } from '../../common/common.module';
import { SpecificationsModule } from '../specifications/specifications.module';

@Module({
  imports: [CommonModule, SpecificationsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
