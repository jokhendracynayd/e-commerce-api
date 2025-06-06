import { Module } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { PrismaService } from '../../common/prisma.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [CouponsController],
  providers: [CouponsService, PrismaService],
  exports: [CouponsService]
})
export class CouponsModule {} 