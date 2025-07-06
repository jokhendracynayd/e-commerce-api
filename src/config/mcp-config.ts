import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MCPConfig {
  backend: {
    apiUrl: string;
    timeout: number;
    retryAttempts: number;
  };
  auth: {
    systemUser: {
      email: string;
      password: string;
    };
    apiKeys: string[];
    jwtSecret: string;
  };
  cache: {
    ttl: number;
    maxSize: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  server: {
    name: string;
    version: string;
    port: number;
  };
}

@Injectable()
export class MCPConfigService {
  constructor(private configService: ConfigService) {}

  getConfig(): MCPConfig {
    return {
      backend: {
        apiUrl: this.configService.get<string>('API_URL', 'http://localhost:3000'),
        timeout: this.configService.get<number>('MCP_API_TIMEOUT', 30000),
        retryAttempts: this.configService.get<number>('MCP_RETRY_ATTEMPTS', 3),
      },
      auth: {
        systemUser: {
          email: this.configService.get<string>('MCP_SYSTEM_USER_EMAIL', 'mcp-system@ecommerce.local'),
          password: this.configService.get<string>('MCP_SYSTEM_USER_PASSWORD', 'secure-system-password-123'),
        },
        apiKeys: this.getApiKeys(),
        jwtSecret: this.configService.get<string>('JWT_SECRET', 'development-jwt-secret-key-for-mcp'),
      },
      cache: {
        ttl: this.configService.get<number>('MCP_CACHE_TTL', 300000), // 5 minutes
        maxSize: this.configService.get<number>('MCP_CACHE_MAX_SIZE', 1000),
      },
      rateLimit: {
        windowMs: this.configService.get<number>('MCP_RATE_LIMIT_WINDOW_MS', 60000), // 1 minute
        maxRequests: this.configService.get<number>('MCP_RATE_LIMIT_MAX_REQUESTS', 100),
      },
      server: {
        name: 'E-Commerce MCP Server',
        version: '1.0.0',
        port: this.configService.get<number>('MCP_PORT', 4000),
      },
    };
  }

  private getApiKeys(): string[] {
    const apiKeysString = this.configService.get<string>('MCP_API_KEYS', 'dev-api-key-1,dev-api-key-2,dev-api-key-3');
    return apiKeysString ? apiKeysString.split(',').map(key => key.trim()) : [];
  }

  validateConfig(): void {
    const config = this.getConfig();
    
    if (!config.auth.systemUser.email || !config.auth.systemUser.password) {
      throw new Error('MCP system user credentials are required');
    }
    
    if (config.auth.apiKeys.length === 0) {
      console.warn('Warning: No MCP API keys configured, using development defaults');
    }
    
    if (!config.auth.jwtSecret) {
      throw new Error('JWT secret is required for MCP authentication');
    }
  }
} 