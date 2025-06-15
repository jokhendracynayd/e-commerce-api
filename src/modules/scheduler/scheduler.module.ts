import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ReservationCleanupService } from './reservation-cleanup.service';
import { PrismaModule } from '../../common/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
  ],
  providers: [ReservationCleanupService],
  exports: [ReservationCleanupService],
})
export class SchedulerModule {} 