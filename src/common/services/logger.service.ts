import {
  Injectable,
  LoggerService as NestLoggerService,
  Scope,
} from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements NestLoggerService {
  private context?: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  setContext(context: string) {
    this.context = context;
    return this;
  }

  /**
   * Write a debug level log.
   */
  debug(message: any, ...optionalParams: any[]) {
    const logObject = this.buildLogObject('debug', message, optionalParams);
    this.logger.debug(logObject);
  }

  /**
   * Write a verbose level log.
   */
  verbose(message: any, ...optionalParams: any[]) {
    const logObject = this.buildLogObject('verbose', message, optionalParams);
    this.logger.verbose(logObject);
  }

  /**
   * Write an info level log.
   */
  log(message: any, ...optionalParams: any[]) {
    const logObject = this.buildLogObject('info', message, optionalParams);
    this.logger.info(logObject);
  }

  /**
   * Write a warning level log.
   */
  warn(message: any, ...optionalParams: any[]) {
    const logObject = this.buildLogObject('warn', message, optionalParams);
    this.logger.warn(logObject);
  }

  /**
   * Write an error level log.
   */
  error(message: any, ...optionalParams: any[]) {
    const logObject = this.buildLogObject('error', message, optionalParams);
    this.logger.error(logObject);
  }

  /**
   * Build log object with context and metadata
   */
  private buildLogObject(
    level: string,
    message: any,
    optionalParams: any[],
  ): any {
    let logObject: any = {};

    // Handle different message types
    if (typeof message === 'object' && message !== null) {
      if (message instanceof Error) {
        logObject = {
          level,
          context: this.context,
          message: message.message,
          stack: message.stack,
          // Extract additional properties from error object, excluding message
          ...Object.getOwnPropertyNames(message)
            .filter((prop) => prop !== 'message' && prop !== 'stack')
            .reduce(
              (obj, prop) => {
                obj[prop] = message[prop];
                return obj;
              },
              {} as Record<string, any>,
            ),
        };
      } else {
        logObject = {
          level,
          context: this.context,
          ...message,
        };
      }
    } else {
      logObject = {
        level,
        context: this.context,
        message,
      };
    }

    // Add optional metadata
    if (optionalParams.length > 0) {
      const metadata = optionalParams[0];
      if (typeof metadata === 'object' && metadata !== null) {
        logObject.metadata = metadata;
      }
    }

    return logObject;
  }
}
