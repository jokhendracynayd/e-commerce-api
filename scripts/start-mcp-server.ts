#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { MCPModule } from '../src/mcp-server/mcp.module';
import { ECommerceMCPServer } from '../src/mcp-server/server';

async function bootstrap() {
  const logger = new Logger('MCPBootstrap');
  
  try {
    logger.log('Starting E-Commerce MCP Server...');
    
    // Create NestJS application context for dependency injection
    const app = await NestFactory.createApplicationContext(MCPModule, {
      logger: ['log', 'error', 'warn', 'debug'],
    });
    
    // Get the MCP server instance
    const mcpServer = app.get(ECommerceMCPServer);
    
    // Setup graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.log(`Received ${signal}. Starting graceful shutdown...`);
      
      try {
        await mcpServer.shutdown();
        await app.close();
        logger.log('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error);
        process.exit(1);
      }
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
    
    logger.log('MCP Server is running and ready to accept connections');
    logger.log('Press Ctrl+C to stop the server');
    
    // Keep the process alive
    await new Promise(() => {});
    
  } catch (error) {
    logger.error('Failed to start MCP Server', error);
    process.exit(1);
  }
}

// Run the bootstrap function
if (require.main === module) {
  bootstrap();
}

export { bootstrap }; 