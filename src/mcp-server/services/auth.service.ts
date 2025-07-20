import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { MCPConfigService } from '../../config/mcp-config';
import { AuthToken, UserContext, UserRole } from '../types/api-types';

@Injectable()
export class MCPAuthService {
  private readonly logger = new Logger(MCPAuthService.name);
  private systemToken: string | null = null;
  private tokenExpiryTime: number = 0;

  constructor(
    private readonly mcpConfig: MCPConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Generate a system JWT token for backend API communication
   */
  async getSystemToken(): Promise<string> {
    const now = Date.now();
    
    // Return cached token if still valid (with 5 minute buffer)
    if (this.systemToken && this.tokenExpiryTime > now + 5 * 60 * 1000) {
      return this.systemToken;
    }

    try {
      const config = this.mcpConfig.getConfig();
      const payload = {
        email: config.auth.systemUser.email,
        sub: 'mcp-system',
        role: 'ADMIN' as UserRole,
        type: 'system',
        iat: Math.floor(now / 1000),
        exp: Math.floor((now + 3600000) / 1000), // 1 hour expiry
      };

      this.systemToken = this.jwtService.sign(payload, {
        secret: config.auth.jwtSecret,
      });
      
      this.tokenExpiryTime = now + 3600000; // 1 hour
      
      this.logger.log('Generated new system token for MCP operations');
      return this.systemToken;
    } catch (error) {
      this.logger.error('Failed to generate system token', error);
      throw new UnauthorizedException('Failed to generate system authentication token');
    }
  }

  /**
   * Validate MCP client API key
   */
  async validateMCPClient(apiKey: string): Promise<boolean> {
    if (!apiKey) {
      return false;
    }

    try {
      const config = this.mcpConfig.getConfig();
      const hashedApiKey = this.hashApiKey(apiKey);
      
      // Check against configured API keys (assuming they're stored hashed)
      const validKeys = config.auth.apiKeys.map(key => this.hashApiKey(key));
      const isValid = validKeys.includes(hashedApiKey);
      
      if (!isValid) {
        this.logger.warn(`Invalid MCP API key attempted: ${apiKey.substring(0, 8)}...`);
      }
      
      return isValid;
    } catch (error) {
      this.logger.error('Error validating MCP client API key', error);
      return false;
    }
  }

  /**
   * Create user context from JWT token or user ID
   */
  async createUserContext(userIdOrToken: string): Promise<UserContext> {
    try {
      // If it looks like a JWT token, decode it
      if (userIdOrToken.includes('.')) {
        return this.createUserContextFromToken(userIdOrToken);
      }
      
      // Otherwise, treat as user ID and create basic context
      return this.createBasicUserContext(userIdOrToken);
    } catch (error) {
      this.logger.error('Failed to create user context', error);
      throw new UnauthorizedException('Invalid user context');
    }
  }

  /**
   * Generate MCP client API key
   */
  generateApiKey(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    const combined = `${timestamp}-${random}`;
    
    return Buffer.from(combined).toString('base64').replace(/[+/=]/g, '').substring(0, 32);
  }

  /**
   * Refresh system token if needed
   */
  async refreshSystemTokenIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Refresh if token expires in less than 10 minutes
    if (!this.systemToken || this.tokenExpiryTime < now + 10 * 60 * 1000) {
      await this.getSystemToken();
    }
  }

  /**
   * Validate and decode any JWT token
   */
  async validateAndDecodeToken(token: string): Promise<any> {
    try {
      const config = this.mcpConfig.getConfig();
      return this.jwtService.verify(token, {
        secret: config.auth.jwtSecret,
      });
    } catch (error) {
      this.logger.warn('Invalid JWT token provided');
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  /**
   * Check if user has required permissions
   */
  async hasPermission(userContext: UserContext, requiredPermission: string): Promise<boolean> {
    // System context has all permissions
    if (userContext.role === 'ADMIN') {
      return true;
    }

    // Check specific permissions
    return userContext.permissions.includes(requiredPermission);
  }

  /**
   * Get authentication headers for API requests
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getSystemToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-MCP-Client': 'true',
    };
  }

  private hashApiKey(apiKey: string): string {
    console.log("👌👌👌👌👌👌👌👌👌👌👌👌👌👌",apiKey)
    return createHash('sha256').update(apiKey).digest('hex');
  }

  private async createUserContextFromToken(token: string): Promise<UserContext> {
    const decoded = await this.validateAndDecodeToken(token);
    
    return {
      userId: decoded.sub,
      email: decoded.email,
      role: decoded.role || 'USER',
      permissions: decoded.permissions || this.getDefaultPermissions(decoded.role),
    };
  }

  private async createBasicUserContext(userId: string): Promise<UserContext> {
    // For basic context, we'll need to fetch user details from the API
    // For now, creating a minimal context
    return {
      userId,
      email: '', // Will be populated by API call if needed
      role: 'USER',
      permissions: this.getDefaultPermissions('USER'),
    };
  }

  private getDefaultPermissions(role: UserRole): string[] {
    switch (role) {
      case 'ADMIN':
        return [
          'products:read',
          'products:write',
          'orders:read',
          'orders:write',
          'users:read',
          'users:write',
          'analytics:read',
          'inventory:read',
          'inventory:write',
        ];
      case 'SELLER':
        return [
          'products:read',
          'products:write',
          'orders:read',
          'inventory:read',
          'analytics:read',
        ];
      case 'USER':
      default:
        return [
          'products:read',
          'orders:read:own',
          'user:read:own',
        ];
    }
  }
}

// Auth middleware for MCP tools
export class MCPAuthGuard {
  constructor(private readonly authService: MCPAuthService) {}

  async validateRequest(apiKey: string, userToken?: string): Promise<UserContext | null> {
    // First validate MCP client
    const isValidClient = await this.authService.validateMCPClient(apiKey);
    if (!isValidClient) {
      throw new UnauthorizedException('Invalid MCP API key');
    }

    // If user token provided, create user context
    if (userToken) {
      return await this.authService.createUserContext(userToken);
    }

    // Return system context for client-only operations
    return {
      userId: 'system',
      email: 'system@mcp.local',
      role: 'ADMIN',
      permissions: ['*'],
    };
  }
} 