import { Module } from '@nestjs/common';
import { WinstonModule, utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';
import * as fs from 'fs';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get('NODE_ENV', 'development');
        const logsDir = path.join(process.cwd(), 'logs');
        
        // Ensure logs directory exists
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }

        // Define log format
        const logFormat = winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nodeEnv === 'development'
            ? nestWinstonModuleUtilities.format.nestLike('E-Commerce API', {
                colors: true,
                prettyPrint: true,
              })
            : winston.format.json(),
        );

        // Daily rotating file transport for error logs
        const errorFileTransport = new DailyRotateFile({
          filename: path.join(logsDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        });

        // Daily rotating file transport for combined logs
        const combinedFileTransport = new DailyRotateFile({
          filename: path.join(logsDir, 'combined-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        });

        // Daily rotating file transport for HTTP request logs
        const httpFileTransport = new DailyRotateFile({
          filename: path.join(logsDir, 'http-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        });

        // Define transports based on environment
        const transports: winston.transport[] = [
          // Always log errors to console
          new winston.transports.Console({
            format: logFormat,
            level: nodeEnv === 'production' ? 'info' : 'debug',
          }),
          // Always log errors to file
          errorFileTransport,
          combinedFileTransport,
        ];

        // Return Winston configuration
        return {
          format: logFormat,
          transports,
          // Add metadata to all logs
          defaultMeta: {
            service: 'e-commerce-api',
            environment: nodeEnv,
          },
        };
      },
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {} 