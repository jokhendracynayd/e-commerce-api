import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        return {
          ttl: 60 * 60 * 24, // 24 hours
          max: 1000, // maximum number of items in cache
          isGlobal: true,
        };
      },
    }),
  ],
})
export class MemoryCacheModule {} 