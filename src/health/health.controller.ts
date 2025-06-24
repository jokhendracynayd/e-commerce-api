import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../common/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CoreElasticsearchService } from '../modules/search/services/elasticsearch.service';

@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
  constructor(
    private prismaService: PrismaService,
    private configService: ConfigService,
    private coreElasticsearchService: CoreElasticsearchService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Complete health check' })
  @ApiResponse({
    status: 200,
    description: 'Health check successful',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: { type: 'object' },
        error: { type: 'object' },
        details: { type: 'object' },
      },
    },
  })
  async check() {
    try {
      // Check database connection
      await this.checkDatabase();

      // Check memory usage
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const rssUsedMB = Math.round(memoryUsage.rss / 1024 / 1024);

      // Check Elasticsearch health
      let elasticsearchHealth;
      try {
        const esHealth = await this.coreElasticsearchService.checkHealth();
        elasticsearchHealth = { status: esHealth.status };
      } catch (error) {
        elasticsearchHealth = { status: 'down', message: error.message };
      }

      return {
        status: 'ok',
        info: {
          database: { status: 'up' },
          elasticsearch: elasticsearchHealth,
          memory: {
            heapUsed: `${heapUsedMB}MB`,
            rss: `${rssUsedMB}MB`,
            status: heapUsedMB < 150 ? 'ok' : 'warning',
          },
        },
        details: {
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: this.configService.get('NODE_ENV'),
        },
      };
    } catch (error) {
      return {
        status: 'error',
        error: {
          database: { status: 'down', message: error.message },
        },
        details: {
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: this.configService.get('NODE_ENV'),
        },
      };
    }
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async getReadiness() {
    try {
      // Check if database is accessible
      await this.prismaService.$queryRaw`SELECT 1`;

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        database: 'connected',
        environment: this.configService.get('NODE_ENV'),
      };
    } catch (error) {
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message,
      };
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Application metrics' })
  @ApiResponse({ status: 200, description: 'Application metrics' })
  async getMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    try {
      // Get database statistics
      const userCount = await this.prismaService.user.count();
      const productCount = await this.prismaService.product.count();
      const orderCount = await this.prismaService.order.count();

      return {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: this.configService.get('NODE_ENV'),
        version: process.env.npm_package_version || '1.0.0',
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        database: {
          status: 'connected',
          users: userCount,
          products: productCount,
          orders: orderCount,
        },
        node: {
          version: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: this.configService.get('NODE_ENV'),
        version: process.env.npm_package_version || '1.0.0',
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        database: {
          status: 'error',
          error: error.message,
        },
        node: {
          version: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      };
    }
  }

  private async checkDatabase() {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return {
        database: {
          status: 'up',
          message: 'Database connection successful',
        },
      };
    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
  }
}
