import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { CommonModule } from '../common/common.module';
import { SearchModule } from '../modules/search/search.module';

@Module({
  imports: [CommonModule, SearchModule],
  controllers: [HealthController],
})
export class HealthModule {}
