# MCP Server Setup and Configuration Guide

## Overview

Your E-Commerce MCP (Model Context Protocol) Server is properly implemented and ready for configuration. This guide provides step-by-step instructions for setup, configuration, and usage.

## ✅ What's Already Implemented

### Core Architecture
- **MCP SDK Integration**: Using `@modelcontextprotocol/sdk` v1.13.3
- **NestJS Module**: Proper dependency injection and service architecture
- **Authentication System**: JWT-based auth with API key validation
- **Rate Limiting**: Built-in rate limiting for security
- **Caching**: In-memory cache with TTL support
- **Error Handling**: Comprehensive error handling with structured responses
- **Health Monitoring**: Health check endpoints and monitoring

### Available Tools
1. **search_products** - Advanced product search with filtering
2. **get_product_details** - Get detailed product information
3. **get_featured_products** - Retrieve featured products
4. **get_products_by_category** - Products filtered by category
5. **get_products_by_brand** - Products filtered by brand

## 🔧 Setup Instructions

### 1. Environment Configuration

Copy the environment template:
```bash
cp .env.mcp.example .env
```

Edit the `.env` file with your configuration:

```bash
# Core Settings
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001

# MCP Configuration
MCP_SYSTEM_USER_EMAIL=mcp-system@yourdomain.com
MCP_SYSTEM_USER_PASSWORD=your-secure-password-here
MCP_API_KEYS=your-api-key-1,your-api-key-2,your-api-key-3
MCP_PORT=4000

# Required Backend Config
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce_dev

# Cache & Performance
MCP_CACHE_TTL=300000
MCP_CACHE_MAX_SIZE=1000
MCP_RATE_LIMIT_WINDOW_MS=60000
MCP_RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Install Dependencies

Dependencies are already included in your `package.json`:
```bash
npm install
```

### 3. Database Setup

Ensure your database is running and migrated:
```bash
npx prisma migrate dev
```

### 4. Start the MCP Server

#### Development Mode (with hot reload)
```bash
npm run mcp:dev
```

#### Production Mode
```bash
npm run mcp:build
npm run mcp:start
```

#### Standalone Mode
```bash
npm run mcp:start
```

## 🔐 Security Configuration

### API Keys
Generate secure API keys for your clients:
```javascript
// Example API key generation
const crypto = require('crypto');
const apiKey = crypto.randomBytes(32).toString('hex');
console.log(apiKey);
```

### Production Security Checklist
- [ ] Use strong, unique passwords
- [ ] Generate cryptographically secure API keys
- [ ] Set appropriate rate limits
- [ ] Enable HTTPS in production
- [ ] Use environment variables for secrets
- [ ] Configure proper logging levels

## 📊 Monitoring and Health Checks

### Health Check Endpoint
```bash
# Check MCP server health
curl http://localhost:3001/api/mcp/health
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "cache": {
    "size": 150,
    "maxSize": 1000,
    "hitRate": 0.85
  },
  "api": true,
  "rateLimit": {
    "totalClients": 5,
    "activeClients": 2
  },
  "server": {
    "name": "E-Commerce MCP Server",
    "version": "1.0.0"
  }
}
```

### Log Monitoring
Monitor logs for:
- Tool execution times
- Authentication attempts
- Rate limit violations
- API errors
- Cache performance

## 🛠 Usage Examples

### Using with MCP Client

```javascript
const client = new MCPClient({
  serverCommand: 'node',
  serverArgs: ['dist/scripts/start-mcp-server.js'],
  headers: {
    'X-API-Key': 'your-mcp-api-key'
  }
});

// Search for products
const result = await client.callTool('search_products', {
  query: 'laptop',
  category: 'electronics',
  minPrice: 500,
  maxPrice: 2000,
  limit: 10,
  sortBy: 'price',
  sortOrder: 'asc'
});

console.log(JSON.parse(result.content[0].text));
```

### Tool Parameters

#### search_products
```javascript
{
  query?: string,           // Search term
  category?: string,        // Category slug
  brand?: string,          // Brand ID/slug
  minPrice?: number,       // Minimum price
  maxPrice?: number,       // Maximum price
  inStock?: boolean,       // Only in-stock items
  featured?: boolean,      // Only featured items
  tags?: string[],         // Product tags
  sortBy?: string,         // Sort field
  sortOrder?: 'asc'|'desc', // Sort direction
  page?: number,           // Page number
  limit?: number           // Items per page (max 100)
}
```

#### get_product_details
```javascript
{
  productId?: string,      // Product ID
  slug?: string           // Product slug (alternative)
}
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Authentication Errors
```
Error: Invalid API key
```
**Solution**: Check your API keys in `.env` file and ensure they match client configuration.

#### 2. Rate Limit Exceeded
```
Error: Rate limit exceeded
```
**Solution**: Adjust rate limits in configuration or implement exponential backoff in client.

#### 3. Database Connection
```
Error: Database connection failed
```
**Solution**: Verify `DATABASE_URL` and ensure database is running.

#### 4. Tool Not Found
```
Error: Tool 'unknown_tool' is not available
```
**Solution**: Check available tools list and ensure correct tool names.

### Debug Mode
Enable debug logging:
```bash
NODE_ENV=development LOG_LEVEL=debug npm run mcp:dev
```

### Performance Optimization

#### Cache Configuration
```bash
# Increase cache size for high-traffic scenarios
MCP_CACHE_MAX_SIZE=5000
MCP_CACHE_TTL=600000  # 10 minutes
```

#### Rate Limiting
```bash
# Adjust for your traffic patterns
MCP_RATE_LIMIT_MAX_REQUESTS=200
MCP_RATE_LIMIT_WINDOW_MS=60000
```

## 📈 Production Deployment

### Environment Variables for Production
```bash
NODE_ENV=production
LOG_LEVEL=info
MCP_CACHE_TTL=600000
MCP_RATE_LIMIT_MAX_REQUESTS=500

# Use secure values
JWT_SECRET=production-secret-min-32-chars
MCP_API_KEYS=prod-key-1,prod-key-2
MCP_SYSTEM_USER_PASSWORD=secure-production-password
```

### Docker Deployment
```dockerfile
# Add to your existing Dockerfile
EXPOSE 4000
CMD ["npm", "run", "mcp:start"]
```

### Process Management
```bash
# Using PM2
pm2 start "npm run mcp:start" --name "mcp-server"

# Using systemd
sudo systemctl enable mcp-server
sudo systemctl start mcp-server
```

## 🔄 Integration with Main API

Add to your main `app.module.ts`:
```typescript
import { MCPModule } from './mcp-server/mcp.module';

@Module({
  imports: [
    // ... other modules
    MCPModule,
  ],
})
export class AppModule {}
```

Add health check endpoint:
```typescript
@Controller('api/mcp')
export class MCPHealthController {
  constructor(private readonly mcpModule: MCPModule) {}

  @Get('health')
  async getHealth() {
    return await this.mcpModule.getModuleHealth();
  }
}
```

## 📚 Additional Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io/specification)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [E-Commerce API Documentation](./API_DOCUMENTATION.md)

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the logs for error details
3. Ensure all environment variables are properly set
4. Verify your backend API is running and accessible

Your MCP server is properly implemented and ready for use! 