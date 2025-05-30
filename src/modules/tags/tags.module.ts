import { Module } from '@nestjs/common';
import { TagsController } from 'src/modules/tags/tags.controller';
import { TagsService } from 'src/modules/tags/tags.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
