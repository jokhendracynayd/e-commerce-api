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
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
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
