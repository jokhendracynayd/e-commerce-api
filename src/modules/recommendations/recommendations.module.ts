import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { RecommendationsController } from './recommendations.controller';
import { QueueBoardController } from './queue-board.controller';
import { RecommendationsService } from './recommendations.service';
import { RecommendationJobService } from './services/recommendation-job.service';
import { RealTimeAnalyticsService } from './services/real-time-analytics.service';
import { MLTrendDetectionService } from './services/ml-trend-detection.service';
import { UserProfilingService } from './services/user-profiling.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    CommonModule,
    ScheduleModule.forRoot(),
    BullModule.registerQueue({
      name: 'recommendation-jobs',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
  ],
  controllers: [RecommendationsController, QueueBoardController],
  providers: [
    // Phase 1 Services
    RecommendationsService,

    // Phase 2.1: Enhanced Background Processing
    RecommendationJobService,

    // Phase 2.2: Advanced Analytics & ML Processing
    RealTimeAnalyticsService,
    MLTrendDetectionService,
    UserProfilingService,
  ],
  exports: [
    RecommendationsService,
    RecommendationJobService,
    RealTimeAnalyticsService,
    MLTrendDetectionService,
    UserProfilingService,
  ],
})
export class RecommendationsModule {}
