import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

import { MCPConfigService } from '../config/mcp-config';
import { MCPAuthService } from './services/auth.service';
import { APIClientService } from './services/api-client.service';
import { MCPCacheService } from './services/cache.service';
import { ProductTools } from './tools/product-tools';
import { ECommerceMCPServer } from './server';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({
      // JWT configuration will be handled by MCPAuthService
      global: true,
    }),
  ],
  providers: [
    MCPConfigService,
    MCPAuthService,
    APIClientService,
    MCPCacheService,
    ProductTools,
    ECommerceMCPServer,
  ],
  exports: [
    MCPConfigService,
    MCPAuthService,
    APIClientService,
    MCPCacheService,
    ProductTools,
    ECommerceMCPServer,
  ],
})
export class MCPModule {
  constructor(private readonly mcpServer: ECommerceMCPServer) {
    // Server initialization happens in onModuleInit of ECommerceMCPServer
  }

  // Health check endpoint for the module
  async getModuleHealth() {
    return await this.mcpServer.healthCheck();
  }
}
