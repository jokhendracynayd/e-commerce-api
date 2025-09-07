import { Module } from '@nestjs/common';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';
import { DealValidationService } from './deal-validation.service';
import { PrismaService } from '../../common/prisma.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [DealsController],
  providers: [DealsService, DealValidationService, PrismaService],
  exports: [DealsService, DealValidationService],
})
export class DealsModule {}
