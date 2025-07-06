# E-Commerce MCP Server Setup Guide

## Overview

The E-Commerce MCP (Model Context Protocol) Server provides external clients with secure access to your e-commerce backend data through a standardized interface. This guide will help you set up and configure the MCP server.

## Prerequisites

- Node.js 18+ installed
- E-commerce backend API running
- PostgreSQL database accessible
- Environment variables configured

## Installation

The MCP server is integrated into the existing e-commerce backend. No additional installation is required beyond the main project dependencies.

```bash
# Install dependencies (if not already done)
npm install

# Install the MCP SDK (added to package.json)
npm install @modelcontextprotocol/sdk
```

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# MCP Server Configuration
MCP_SYSTEM_USER_EMAIL="mcp-system@ecommerce.local"
MCP_SYSTEM_USER_PASSWORD="secure-system-password"
MCP_API_KEYS="mcp-key-1,mcp-key-2,mcp-key-3"
MCP_PORT=3001

# MCP API Configuration
MCP_API_TIMEOUT=30000
MCP_RETRY_ATTEMPTS=3

# MCP Cache Configuration
MCP_CACHE_TTL=300000
MCP_CACHE_MAX_SIZE=1000

# MCP Rate Limiting
MCP_RATE_LIMIT_WINDOW_MS=60000
MCP_RATE_LIMIT_MAX_REQUESTS=100

# Required existing variables
JWT_SECRET="your-jwt-secret"
API_URL="http://localhost:3000"
DATABASE_URL="postgresql://username:password@localhost:5432/ecommerce"
```

### Configuration Details

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MCP_SYSTEM_USER_EMAIL` | Email for system authentication | - | Yes |
| `MCP_SYSTEM_USER_PASSWORD` | Password for system authentication | - | Yes |
| `MCP_API_KEYS` | Comma-separated list of API keys | - | Yes |
| `MCP_PORT` | Port for MCP server | 3001 | No |
| `MCP_API_TIMEOUT` | API request timeout (ms) | 30000 | No |
| `MCP_RETRY_ATTEMPTS` | Number of retry attempts | 3 | No |
| `MCP_CACHE_TTL` | Cache time-to-live (ms) | 300000 | No |
| `MCP_CACHE_MAX_SIZE` | Maximum cache items | 1000 | No |
| `MCP_RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | 60000 | No |
| `MCP_RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 | No |

## Starting the MCP Server

### Development Mode

```bash
# Start MCP server in development mode with hot reload
npm run mcp:dev
```

### Production Mode

```bash
# Build and start MCP server
npm run mcp:build

# Or start directly
npm run mcp:start
```

### Integration with Main API

To integrate the MCP server with your main API, add the MCP module to your main application:

```typescript
// In your main app.module.ts
import { MCPModule } from './mcp-server/mcp.module';

@Module({
  imports: [
    // ... other modules
    MCPModule,
  ],
})
export class AppModule {}
```

## Available Tools

The MCP server currently provides the following tools:

### Product Tools

1. **search_products** - Search for products with filtering
   - Parameters: `query`, `category`, `brand`, `minPrice`, `maxPrice`, `inStock`, `featured`, `tags`, `sortBy`, `sortOrder`, `page`, `limit`

2. **get_product_details** - Get detailed product information
   - Parameters: `productId` OR `slug`

3. **get_featured_products** - Get featured products list
   - Parameters: `limit` (optional)

4. **get_products_by_category** - Get products in a category
   - Parameters: `categorySlug`, `page`, `limit`, `sortBy`

5. **get_products_by_brand** - Get products by brand
   - Parameters: `brandSlug`, `page`, `limit`, `sortBy`

## Authentication

### MCP Client Authentication

Clients must provide an API key in the request headers:

```
X-API-Key: your-mcp-api-key
```

### User Context (Optional)

For user-specific operations, provide a user token:

```
X-User-Token: user-jwt-token
```

## Example Usage

### Using with MCP Client

```javascript
// Example MCP client usage
const client = new MCPClient({
  serverUrl: 'stdio://path/to/mcp-server',
  headers: {
    'X-API-Key': 'your-mcp-api-key'
  }
});

// Search for products
const result = await client.callTool('search_products', {
  query: 'laptop',
  category: 'electronics',
  minPrice: 100,
  maxPrice: 2000,
  limit: 10
});

console.log(result.content[0].text);
```

## Security Considerations

1. **API Keys**: Store API keys securely and rotate them regularly
2. **System User**: Use a dedicated system user with minimal required permissions
3. **Network**: Run MCP server in a secure network environment
4. **Logging**: Monitor MCP server logs for suspicious activity
5. **Rate Limiting**: Configure appropriate rate limits for your use case

## Monitoring and Health Checks

### Health Check Endpoint

The MCP server provides health check functionality:

```typescript
import { MCPModule } from './mcp-server/mcp.module';

// In your controller
@Get('/mcp/health')
async getMCPHealth() {
  const mcpModule = this.moduleRef.get(MCPModule);
  return await mcpModule.getModuleHealth();
}
```

### Logging

The MCP server provides comprehensive logging:

- Tool execution logs
- Authentication attempts
- Error tracking
- Performance metrics

### Cache Monitoring

Monitor cache performance through the health check endpoint which returns:

```json
{
  "status": "healthy",
  "uptime": 3600,
  "cache": {
    "size": 150,
    "maxSize": 1000,
    "hitRate": 0.85,
    "itemsExpired": 5
  },
  "api": true
}
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify API keys are correctly configured
   - Check system user credentials
   - Ensure JWT secret is set

2. **Connection Issues**
   - Verify backend API is running
   - Check network connectivity
   - Review firewall settings

3. **Performance Issues**
   - Monitor cache hit rates
   - Adjust cache TTL settings
   - Review API timeout settings

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development npm run mcp:dev
```

## Next Steps

After completing Phase 1, you can:

1. Add more tool types (orders, users, analytics)
2. Implement advanced caching strategies
3. Add custom authentication providers
4. Configure monitoring and alerting
5. Set up production deployment

## Support

For issues and questions:

1. Check the logs for error details
2. Review the configuration
3. Consult the main API documentation
4. Raise an issue in the project repository 