import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  CallToolRequest,
  ListToolsRequest
} from '@modelcontextprotocol/sdk/types.js';

import { MCPConfigService } from '../config/mcp-config';
import { MCPAuthService } from './services/auth.service';
import { APIClientService } from './services/api-client.service';
import { MCPCacheService } from './services/cache.service';
import { ProductTools } from './tools/product-tools';
import { MCPToolResult } from './types/api-types';
import { MCPRateLimiter } from './utils/rate-limiter';
import { MCPErrorHandler } from './utils/error-handler';

@Injectable()
export class ECommerceMCPServer implements OnModuleInit {
  private readonly logger = new Logger(ECommerceMCPServer.name);
  private server: Server;
  private readonly rateLimiter: MCPRateLimiter;
  private readonly errorHandler: MCPErrorHandler;

  constructor(
    private readonly configService: MCPConfigService,
    private readonly authService: MCPAuthService,
    private readonly apiClient: APIClientService,
    private readonly cacheService: MCPCacheService,
    private readonly productTools: ProductTools,
  ) {
    this.rateLimiter = new MCPRateLimiter(configService);
    this.errorHandler = new MCPErrorHandler();
  }

  async onModuleInit(): Promise<void> {
    await this.initializeMCPServer();
  }

  private async initializeMCPServer(): Promise<void> {
    try {
      // Validate configuration
      this.configService.validateConfig();
      
      const config = this.configService.getConfig();
      
      // Create MCP server instance
      this.server = new Server(
        {
          name: config.server.name,
          version: config.server.version,
        },
        {
          capabilities: {
            tools: {}
          }
        }
      );

      // Register tool handlers
      this.registerToolHandlers();

      // Start the server
      await this.startServer();
      
      this.logger.log(`E-Commerce MCP Server initialized successfully`);
      
    } catch (error) {
      this.logger.error('Failed to initialize MCP server', error);
      throw error;
    }
  }

  private registerToolHandlers(): void {
    try {
      // List tools handler
      this.server.setRequestHandler(ListToolsRequestSchema, async () => {
        const tools = [
          ...ProductTools.getToolDefinitions(),
          // Future tools will be added here
        ];
        
        this.logger.debug(`Listing ${tools.length} available tools`);
        return { tools };
      });

      // Call tool handler
      this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args = {} } = request.params;
        const startTime = Date.now();
        
        // Extract authentication headers
        const apiKey = this.extractApiKey(request);
        const userToken = this.extractUserToken(request);
        const clientId = apiKey || 'anonymous';
        
        this.logger.log(`Tool called: ${name} by client ${clientId.substring(0, 8)}...`);
        
        try {
          // Check rate limiting
          const rateLimitResult = this.rateLimiter.checkLimit(clientId);
          if (!rateLimitResult.allowed) {
            const errorResult = this.errorHandler.handleRateLimitError(rateLimitResult.resetTime);
            return {
              content: errorResult.content
            };
          }

          // Validate API key
          if (!await this.authService.validateMCPClient(apiKey)) {
            const errorResult = this.errorHandler.handleAuthError('Invalid API key');
            return {
              content: errorResult.content
            };
          }

          let result: MCPToolResult;
          
          // Route to appropriate tool handler
          switch (name) {
            // Product tools
            case 'search_products':
              result = await this.productTools.handleSearchProducts(args, apiKey, userToken);
              break;
              
            case 'get_product_details':
              result = await this.productTools.handleGetProductDetails(args, apiKey, userToken);
              break;
              
            case 'get_featured_products':
              result = await this.productTools.handleGetFeaturedProducts(args, apiKey, userToken);
              break;
              
            case 'get_products_by_category':
              result = await this.productTools.handleGetProductsByCategory(args, apiKey, userToken);
              break;
              
            case 'get_products_by_brand':
              result = await this.productTools.handleGetProductsByBrand(args, apiKey, userToken);
              break;

            default:
              const errorResult = this.errorHandler.handleToolNotFound(name);
              return {
                content: errorResult.content
              };
          }
          
          // Log execution metrics
          const executionTime = Date.now() - startTime;
          this.logger.log(`Tool ${name} completed in ${executionTime}ms`);
          
          return {
            content: result.content
          };
          
        } catch (error) {
          const executionTime = Date.now() - startTime;
          this.logger.error(`Tool ${name} execution failed after ${executionTime}ms`, error);
          
          const errorResult = this.errorHandler.handleUnexpectedError(error, name);
          return {
            content: errorResult.content
          };
        }
      });
      
      this.logger.log('MCP tool handlers registered successfully');
      
    } catch (error) {
      this.logger.error('Failed to register tool handlers', error);
      throw error;
    }
  }

  private async startServer(): Promise<void> {
    try {
      // Use stdio transport for MCP communication
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      this.logger.log('MCP Server started and listening on stdio');
      
      // Log server capabilities
      this.logServerCapabilities();
      
    } catch (error) {
      this.logger.error('Failed to start MCP server', error);
      throw error;
    }
  }

  private extractApiKey(request: any): string {
    // Extract API key from request headers or parameters
    // This will depend on how the MCP client sends authentication
    const headers = request.meta?.headers || {};
    return headers['x-api-key'] || headers['authorization']?.replace('Bearer ', '') || '';
  }

  private extractUserToken(request: any): string | undefined {
    // Extract user token if provided
    const headers = request.meta?.headers || {};
    return headers['x-user-token'];
  }

  private logServerCapabilities(): void {
    const config = this.configService.getConfig();
    
    this.logger.log('='.repeat(50));
    this.logger.log(`E-Commerce MCP Server - ${config.server.version}`);
    this.logger.log('='.repeat(50));
    this.logger.log('Available Tools:');
    
    const tools = ProductTools.getToolDefinitions();
    tools.forEach(tool => {
      this.logger.log(`  ✓ ${tool.name}: ${tool.description}`);
    });
    
    this.logger.log('='.repeat(50));
    this.logger.log('Configuration:');
    this.logger.log(`  Cache TTL: ${config.cache.ttl}ms`);
    this.logger.log(`  Max Cache Size: ${config.cache.maxSize}`);
    this.logger.log(`  API Timeout: ${config.backend.timeout}ms`);
    this.logger.log(`  Rate Limit: ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs}ms`);
    this.logger.log('='.repeat(50));
  }

  // Health check method
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    uptime: number;
    cache: any;
    api: boolean;
    rateLimit: any;
    server: {
      name: string;
      version: string;
    };
  }> {
    try {
      const apiHealthy = await this.apiClient.healthCheck();
      const cacheStats = this.cacheService.getStats();
      const rateLimitStats = this.rateLimiter.getStats();
      const config = this.configService.getConfig();
      
      return {
        status: apiHealthy ? 'healthy' : 'unhealthy',
        uptime: process.uptime(),
        cache: cacheStats,
        api: apiHealthy,
        rateLimit: rateLimitStats,
        server: {
          name: config.server.name,
          version: config.server.version,
        },
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        status: 'unhealthy',
        uptime: process.uptime(),
        cache: { error: error.message },
        api: false,
        rateLimit: { error: error.message },
        server: { name: 'unknown', version: 'unknown' },
      };
    }
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    try {
      this.logger.log('Shutting down MCP server...');
      
      if (this.server) {
        await this.server.close();
      }
      
      // Cleanup cache
      this.cacheService.clear();
      
      this.logger.log('MCP server shutdown complete');
      
    } catch (error) {
      this.logger.error('Error during shutdown', error);
    }
  }
}

// Export factory function for standalone usage
export async function createMCPServer(
  configService: MCPConfigService,
  authService: MCPAuthService,
  apiClient: APIClientService,
  cacheService: MCPCacheService,
  productTools: ProductTools,
): Promise<ECommerceMCPServer> {
  const server = new ECommerceMCPServer(
    configService,
    authService,
    apiClient,
    cacheService,
    productTools,
  );
  
  await server.onModuleInit();
  return server;
} 