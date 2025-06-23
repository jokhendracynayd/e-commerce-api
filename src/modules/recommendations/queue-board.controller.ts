import { Controller, Get, Req, Res, Next } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Request, Response, NextFunction } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

@Controller('admin/queue')
export class QueueBoardController {
  private serverAdapter: ExpressAdapter;

  constructor(
    @InjectQueue('recommendation-jobs') private readonly recommendationQueue: Queue,
  ) {
    this.serverAdapter = new ExpressAdapter();
    this.serverAdapter.setBasePath('/admin/queue');

    createBullBoard({
      queues: [
        new BullAdapter(this.recommendationQueue),
      ],
      serverAdapter: this.serverAdapter,
    });
  }

  @Get('*')
  getBoard(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction): void {
    this.serverAdapter.getRouter()(req, res, next);
  }
} 