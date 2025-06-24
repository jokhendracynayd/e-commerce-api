# 🔧 Environment Setup Guide

## Overview

This document provides a comprehensive guide for setting up environment variables for the e-commerce API, including the enhanced Elasticsearch configuration.

## Environment Variables

### Application Configuration

```bash
NODE_ENV=development                    # Environment: development, production, test, staging
PORT=3001                              # Application port
API_PREFIX=api/v1                      # API prefix for all routes
```

### Database Configuration

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecommerce_dev
DATABASE_URL_TEST=postgresql://test:test@localhost:5432/ecommerce_test
```

### Authentication Configuration

```bash
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
```

### Redis Configuration

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                        # Optional: Redis password
REDIS_DB=0                            # Redis database number
```

### AWS S3 Configuration

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket
AWS_S3_URL=                           # Optional: Custom S3 endpoint
```

## 🔍 Elasticsearch Configuration

### Core Elasticsearch Settings

```bash
# Connection Settings
ELASTICSEARCH_NODE=http://localhost:9200          # Elasticsearch cluster endpoint
ELASTICSEARCH_USERNAME=                           # Optional: ES username (empty for no auth)
ELASTICSEARCH_PASSWORD=                           # Optional: ES password (empty for no auth)

# Connection Pool Settings
ELASTICSEARCH_MAX_RETRIES=3                       # Max retry attempts for failed requests
ELASTICSEARCH_REQUEST_TIMEOUT=30000               # Request timeout in milliseconds
ELASTICSEARCH_PING_TIMEOUT=3000                   # Ping timeout in milliseconds
ELASTICSEARCH_SNIFF_INTERVAL=300000               # Cluster sniffing interval in milliseconds
```

### Search Configuration

```bash
# Cache Settings
SEARCH_CACHE_TTL=300                              # Search result cache TTL in seconds (5 minutes)
SEARCH_MAX_RESULTS=100                            # Maximum results per search query
SEARCH_DEFAULT_SIZE=20                            # Default page size for search results

# Feature Toggles
SEARCH_ENABLE_HIGHLIGHTING=true                   # Enable search result highlighting
SEARCH_ENABLE_SUGGESTIONS=true                    # Enable search suggestions/autocomplete
```

### Performance Configuration

```bash
# Bulk Operations
SEARCH_BULK_SIZE=1000                             # Bulk indexing batch size
SEARCH_BULK_TIMEOUT=30s                           # Bulk operation timeout
SEARCH_REFRESH_INTERVAL=30s                       # Index refresh interval
SEARCH_MAX_CONCURRENT_SEARCHES=100                # Max concurrent search requests
```

### Analytics Configuration

```bash
# Analytics Settings
ANALYTICS_ENABLED=true                            # Enable search analytics
ANALYTICS_SAMPLING_RATE=0.1                       # Analytics sampling rate (10%)
ANALYTICS_RETENTION_DAYS=90                       # Analytics data retention period
```

### Index Configuration

```bash
# Index Settings
INDEX_NUMBER_OF_SHARDS=3                          # Default number of shards per index
INDEX_NUMBER_OF_REPLICAS=1                        # Default number of replicas per index
INDEX_REFRESH_INTERVAL=30s                        # Index refresh interval
INDEX_MAX_RESULT_WINDOW=50000                     # Maximum result window size
```

### Synchronization Configuration

```bash
# Data Sync Settings
SYNC_BATCH_SIZE=1000                              # Batch size for data synchronization
SYNC_INTERVAL_SECONDS=300                         # Sync interval in seconds (5 minutes)
SYNC_RETRY_ATTEMPTS=3                             # Number of retry attempts for failed syncs
SYNC_RETRY_DELAY_MS=5000                          # Delay between retry attempts in milliseconds
```

### Health Check Configuration

```bash
# Health Monitoring
HEALTH_CHECK_INTERVAL_MS=30000                    # Health check interval in milliseconds
HEALTH_CHECK_TIMEOUT_MS=10000                     # Health check timeout in milliseconds
```

## 📋 Environment-Specific Settings

### Development Environment

```bash
# Development optimized settings
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
SEARCH_CACHE_TTL=60                               # Shorter cache for development
ANALYTICS_SAMPLING_RATE=1.0                      # Full analytics in development
INDEX_NUMBER_OF_REPLICAS=0                       # No replicas needed in development
```

### Staging Environment

```bash
# Staging environment settings
ELASTICSEARCH_NODE=http://elasticsearch-staging:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=staging-password
SEARCH_CACHE_TTL=300
ANALYTICS_SAMPLING_RATE=0.5                      # Higher sampling in staging
INDEX_NUMBER_OF_REPLICAS=1
```

### Production Environment

```bash
# Production optimized settings
ELASTICSEARCH_NODE=https://elasticsearch-production:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=production-secure-password
SEARCH_CACHE_TTL=600                              # Longer cache for production
ANALYTICS_SAMPLING_RATE=0.1                      # Lower sampling for performance
INDEX_NUMBER_OF_REPLICAS=2                       # Multiple replicas for redundancy
SEARCH_MAX_CONCURRENT_SEARCHES=1000              # Higher limits for production
```

## 🔒 Security Recommendations

### Development
- Security features disabled for ease of development
- No authentication required
- HTTP connections acceptable

### Production
- Enable Elasticsearch security (`xpack.security.enabled=true`)
- Use strong passwords and authentication
- Enable HTTPS/TLS for all connections
- Implement proper firewall rules
- Regular security updates

## 🚀 Quick Setup

### 1. Copy Environment Template

Create a `.env` file in the root directory with the variables above.

### 2. Docker Compose Setup

The enhanced `docker-compose.yml` will automatically use these environment variables:

```bash
# Start the enhanced stack
docker-compose up -d

# Check service health
docker-compose ps

# View logs
docker-compose logs elasticsearch
docker-compose logs kibana
```

### 3. Access Points

- **Elasticsearch**: http://localhost:9200
- **Kibana**: http://localhost:5601
- **API**: http://localhost:3001
- **pgAdmin**: http://localhost:8080

### 4. Health Checks

```bash
# Check Elasticsearch health
curl http://localhost:9200/_cluster/health

# Check Kibana status
curl http://localhost:5601/api/status

# Check API health
curl http://localhost:3001/health
```

## 📊 Monitoring Setup

### Kibana Dashboards

Once Kibana is running, you can:

1. Create index patterns for your data
2. Set up monitoring dashboards
3. Configure alerting rules
4. Analyze search performance

### Key Metrics to Monitor

- **Search Response Times**: p95, p99 latencies
- **Index Size**: Growth rate and storage usage
- **Cache Hit Rates**: Search result cache effectiveness
- **Error Rates**: Failed searches and indexing errors
- **Resource Usage**: CPU, memory, disk usage

## 🔧 Troubleshooting

### Common Issues

1. **Elasticsearch Connection Failed**
   - Check if Elasticsearch is running
   - Verify ELASTICSEARCH_NODE URL
   - Check network connectivity

2. **Out of Memory Errors**
   - Increase ES_JAVA_OPTS memory allocation
   - Reduce SEARCH_BULK_SIZE
   - Monitor memory usage

3. **Slow Search Performance**
   - Check index mapping and settings
   - Optimize query structure
   - Increase cache TTL
   - Monitor resource usage

4. **Index Synchronization Issues**
   - Check SYNC_* configuration
   - Monitor sync job logs
   - Verify database connectivity

## 📝 Configuration Validation

The application automatically validates all environment variables on startup using Joi schema validation. Invalid configurations will prevent the application from starting and display helpful error messages.

### Validation Rules

- **Timeouts**: Must be reasonable values (1s to 120s)
- **Sizes**: Must be within acceptable ranges
- **URLs**: Must be valid URI format
- **Numbers**: Must be within specified min/max ranges
- **Booleans**: Must be true/false values

## 🔄 Configuration Updates

When updating configuration:

1. Update environment variables
2. Restart the application
3. Verify health checks pass
4. Monitor application behavior
5. Rollback if issues occur

## 📚 Additional Resources

- [Elasticsearch Configuration Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/settings.html)
- [Kibana Configuration Guide](https://www.elastic.co/guide/en/kibana/current/settings.html)
- [NestJS Configuration Module](https://docs.nestjs.com/techniques/configuration)
- [Docker Compose Documentation](https://docs.docker.com/compose/) 