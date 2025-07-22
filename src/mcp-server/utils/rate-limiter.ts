import { Injectable, Logger } from '@nestjs/common';
import { MCPConfigService } from '../../config/mcp-config';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class MCPRateLimiter {
  private readonly logger = new Logger(MCPRateLimiter.name);
  private readonly clientLimits = new Map<string, RateLimitEntry>();
  private readonly config: {
    windowMs: number;
    maxRequests: number;
  };

  constructor(private readonly mcpConfig: MCPConfigService) {
    const config = this.mcpConfig.getConfig();
    this.config = {
      windowMs: config.rateLimit.windowMs,
      maxRequests: config.rateLimit.maxRequests,
    };

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request is within rate limit
   */
  checkLimit(clientId: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = this.clientLimits.get(clientId);

    // Create new entry or reset if window expired
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
    }

    // Increment request count
    entry.count++;
    this.clientLimits.set(clientId, entry);

    const allowed = entry.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - entry.count);

    if (!allowed) {
      this.logger.warn(`Rate limit exceeded for client: ${clientId}`, {
        count: entry.count,
        limit: this.config.maxRequests,
        resetTime: entry.resetTime,
      });
    }

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Get current stats for a client
   */
  getClientStats(clientId: string): {
    count: number;
    remaining: number;
    resetTime: number;
  } {
    const entry = this.clientLimits.get(clientId);

    if (!entry || entry.resetTime < Date.now()) {
      return {
        count: 0,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs,
      };
    }

    return {
      count: entry.count,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
    };
  }

  /**
   * Reset rate limit for a specific client
   */
  resetClient(clientId: string): void {
    this.clientLimits.delete(clientId);
    this.logger.log(`Rate limit reset for client: ${clientId}`);
  }

  /**
   * Get overall rate limiting stats
   */
  getStats(): {
    totalClients: number;
    activeClients: number;
    config: typeof this.config;
  } {
    const now = Date.now();
    const activeClients = Array.from(this.clientLimits.values()).filter(
      (entry) => entry.resetTime > now,
    ).length;

    return {
      totalClients: this.clientLimits.size,
      activeClients,
      config: this.config,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [clientId, entry] of this.clientLimits.entries()) {
      if (entry.resetTime < now) {
        this.clientLimits.delete(clientId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(
        `Cleaned up ${cleanedCount} expired rate limit entries`,
      );
    }
  }
}
