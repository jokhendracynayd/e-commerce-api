import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        const host = configService.get('REDIS_HOST');
        const port = configService.get('REDIS_PORT');
        
        // For cache-manager-redis-store v2.0.0
        return {
          store: redisStore,
          host,
          port,
          ttl: 60 * 60 * 24, // 24 hours
          max: 1000, // maximum number of items in cache
        };
      },
    }),
  ],
})
export class CacheModule {} 