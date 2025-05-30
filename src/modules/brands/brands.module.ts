import { Module } from '@nestjs/common';
import { BrandsController } from 'src/modules/brands/brands.controller';
import { BrandsService } from 'src/modules/brands/brands.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
