import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// This extends the PrismaClient type to include our models
declare global {
  namespace PrismaJson {
    type JsonValue =
      | string
      | number
      | boolean
      | null
      | { [key: string]: JsonValue }
      | JsonValue[];
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private static instance: PrismaService;

  constructor() {
    // Return existing instance if it exists
    if (PrismaService.instance) {
      return PrismaService.instance;
    }

    super({
      log:
        process.env.NODE_ENV === 'development' //['query','info', 'warn', 'error']
          ? ['info', 'warn', 'error']
          : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL + '&connection_limit=1&pool_timeout=20&connect_timeout=60',
        },
      },
      // Optimize connection pooling
      transactionOptions: {
        maxWait: 10000, // 10 seconds
        timeout: 30000, // 30 seconds
      },
    });

    // Set the instance
    PrismaService.instance = this;
  }

  static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  async onModuleInit() {
    // Only connect if this is the main instance
    if (this === PrismaService.instance) {
      await this.$connect();
    }
  }

  async onModuleDestroy() {
    // Only disconnect if this is the main instance
    if (this === PrismaService.instance) {
      await this.$disconnect();
    }
  }

  async clearDatabase() {
    if (process.env.NODE_ENV !== 'production') {
      // Only available in non-production environments for safety
      const models = Reflect.ownKeys(this).filter((key) => {
        return (
          typeof key === 'string' &&
          !key.startsWith('_') &&
          !key.startsWith('$')
        );
      });

      return Promise.all(
        models.map(async (modelKey) => {
          return this[modelKey as string].deleteMany();
        }),
      );
    }
  }
}
