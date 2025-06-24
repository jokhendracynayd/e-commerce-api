import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import {
  ElasticsearchHealth,
  IndexHealth,
  SearchError,
} from '../interfaces/search.interface';
import {
  HEALTH_CHECK_CONFIG,
  RETRY_CONFIG,
  ERROR_CODES,
} from '../constants/indices.constants';

@Injectable()
export class CoreElasticsearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CoreElasticsearchService.name);
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private lastHealthCheck: Date | null = null;

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeConnection();
    this.startHealthMonitoring();
  }

  async onModuleDestroy() {
    this.stopHealthMonitoring();
    await this.closeConnection();
  }

  /**
   * Initialize Elasticsearch connection with retry logic
   */
  private async initializeConnection(): Promise<void> {
    const maxRetries = this.configService.get<number>(
      'ELASTICSEARCH_MAX_RETRIES',
      RETRY_CONFIG.MAX_RETRIES,
    );
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        await this.testConnection();
        this.isConnected = true;
        this.logger.log('Successfully connected to Elasticsearch');
        return;
      } catch (error) {
        retryCount++;
        this.logger.warn(
          `Elasticsearch connection attempt ${retryCount}/${maxRetries} failed:`,
          error.message,
        );

        if (retryCount < maxRetries) {
          const delay = Math.min(
            RETRY_CONFIG.INITIAL_DELAY *
              Math.pow(RETRY_CONFIG.BACKOFF_FACTOR, retryCount - 1),
            RETRY_CONFIG.MAX_DELAY,
          );
          await this.sleep(delay);
        }
      }
    }

    this.logger.error(
      'Failed to connect to Elasticsearch after maximum retries',
    );
    throw new Error('Elasticsearch connection failed');
  }

  /**
   * Test Elasticsearch connection
   */
  private async testConnection(): Promise<void> {
    try {
      const response = await this.elasticsearchService.ping(
        {},
        {
          requestTimeout: this.configService.get<number>(
            'ELASTICSEARCH_PING_TIMEOUT',
            3000,
          ),
        },
      );

      if (!response) {
        throw new Error('Elasticsearch ping failed');
      }
    } catch (error) {
      throw new Error(`Elasticsearch connection test failed: ${error.message}`);
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    const interval = this.configService.get<number>(
      'HEALTH_CHECK_INTERVAL_MS',
      HEALTH_CHECK_CONFIG.TIMEOUT,
    );

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        this.logger.warn('Health check failed:', error.message);
      }
    }, interval);

    this.logger.log(`Health monitoring started with ${interval}ms interval`);
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.logger.log('Health monitoring stopped');
    }
  }

  /**
   * Close Elasticsearch connection
   */
  private async closeConnection(): Promise<void> {
    try {
      await this.elasticsearchService.close();
      this.isConnected = false;
      this.logger.log('Elasticsearch connection closed');
    } catch (error) {
      this.logger.error(
        'Error closing Elasticsearch connection:',
        error.message,
      );
    }
  }

  /**
   * Get Elasticsearch cluster health
   */
  async getClusterHealth(): Promise<ElasticsearchHealth> {
    try {
      const response = await this.elasticsearchService.cluster.health({
        timeout: `${HEALTH_CHECK_CONFIG.TIMEOUT}ms`,
      });

      this.lastHealthCheck = new Date();

      return {
        cluster_name: response.cluster_name,
        status: response.status as 'green' | 'yellow' | 'red',
        timed_out: response.timed_out,
        number_of_nodes: response.number_of_nodes,
        number_of_data_nodes: response.number_of_data_nodes,
        active_primary_shards: response.active_primary_shards,
        active_shards: response.active_shards,
        relocating_shards: response.relocating_shards,
        initializing_shards: response.initializing_shards,
        unassigned_shards: response.unassigned_shards,
        delayed_unassigned_shards: response.delayed_unassigned_shards,
        number_of_pending_tasks: response.number_of_pending_tasks,
        number_of_in_flight_fetch: response.number_of_in_flight_fetch,
        task_max_waiting_in_queue_millis:
          response.task_max_waiting_in_queue_millis,
        active_shards_percent_as_number:
          response.active_shards_percent_as_number,
      };
    } catch (error) {
      this.logger.error('Failed to get cluster health:', error.message);
      throw this.handleElasticsearchError(error);
    }
  }

  /**
   * Get index health for specific index
   */
  async getIndexHealth(indexName: string): Promise<IndexHealth> {
    try {
      const response = await this.elasticsearchService.cluster.health({
        index: indexName,
        level: 'indices',
        timeout: `${HEALTH_CHECK_CONFIG.TIMEOUT}ms`,
      });

      const indexData = response.indices?.[indexName];
      if (!indexData) {
        throw new Error(`Index ${indexName} not found in health response`);
      }

      return {
        index: indexName,
        status: indexData.status as 'green' | 'yellow' | 'red',
        number_of_shards: indexData.number_of_shards,
        number_of_replicas: indexData.number_of_replicas,
        active_primary_shards: indexData.active_primary_shards,
        active_shards: indexData.active_shards,
        relocating_shards: indexData.relocating_shards,
        initializing_shards: indexData.initializing_shards,
        unassigned_shards: indexData.unassigned_shards,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get index health for ${indexName}:`,
        error.message,
      );
      throw this.handleElasticsearchError(error);
    }
  }

  /**
   * Check overall health status
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    cluster: ElasticsearchHealth;
    connection: boolean;
    lastCheck: Date | null;
  }> {
    try {
      const cluster = await this.getClusterHealth();

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (cluster.status === 'red') {
        status = 'unhealthy';
      } else if (cluster.status === 'yellow') {
        status = 'degraded';
      }

      return {
        status,
        cluster,
        connection: this.isConnected,
        lastCheck: this.lastHealthCheck,
      };
    } catch (error) {
      this.logger.error('Health check failed:', error.message);
      return {
        status: 'unhealthy',
        cluster: null as any,
        connection: false,
        lastCheck: this.lastHealthCheck,
      };
    }
  }

  /**
   * Check if index exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    try {
      const response = await this.elasticsearchService.indices.exists({
        index: indexName,
      });
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to check if index ${indexName} exists:`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(indexName?: string): Promise<any> {
    try {
      const params: any = {};
      if (indexName) {
        params.index = indexName;
      }

      const response = await this.elasticsearchService.indices.stats(params);
      return response;
    } catch (error) {
      this.logger.error('Failed to get index stats:', error.message);
      throw this.handleElasticsearchError(error);
    }
  }

  /**
   * Execute raw Elasticsearch query with error handling and retries
   */
  async executeQuery<T = any>(
    method: string,
    params: any,
    retries: number = RETRY_CONFIG.MAX_RETRIES,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Get the method from the elasticsearch service
        const methodPath = method.split('.');
        let service: any = this.elasticsearchService;

        for (const path of methodPath) {
          service = service[path];
          if (!service) {
            throw new Error(`Invalid Elasticsearch method: ${method}`);
          }
        }

        const result = await service(params);
        return result;
      } catch (error) {
        lastError = error as Error;

        if (attempt < retries && this.isRetryableError(error)) {
          const delay = Math.min(
            RETRY_CONFIG.INITIAL_DELAY *
              Math.pow(RETRY_CONFIG.BACKOFF_FACTOR, attempt),
            RETRY_CONFIG.MAX_DELAY,
          );

          this.logger.warn(
            `Query attempt ${attempt + 1}/${retries + 1} failed, retrying in ${delay}ms:`,
            lastError.message,
          );
          await this.sleep(delay);
        } else {
          break;
        }
      }
    }

    if (!lastError) {
      lastError = new Error('Unknown error occurred during query execution');
    }

    this.logger.error(
      `Query failed after ${retries + 1} attempts:`,
      lastError.message,
    );
    throw this.handleElasticsearchError(lastError);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      ERROR_CODES.TIMEOUT,
      ERROR_CODES.CONNECTION,
      'connect_timeout',
      'request_timeout',
      'socket_hang_up',
      'ECONNRESET',
      'ECONNREFUSED',
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const errorType = error.meta?.body?.error?.type || '';

    return retryableErrors.some(
      (retryableError) =>
        errorMessage.includes(retryableError.toLowerCase()) ||
        errorType.includes(retryableError),
    );
  }

  /**
   * Handle Elasticsearch errors and convert to application errors
   */
  private handleElasticsearchError(error: any): SearchError {
    const searchError: SearchError = {
      type: error.meta?.body?.error?.type || 'unknown_error',
      reason:
        error.meta?.body?.error?.reason || error.message || 'Unknown error',
      status: error.meta?.statusCode || 500,
    };

    if (error.meta?.body?.error?.caused_by) {
      searchError.caused_by = error.meta.body.error.caused_by;
    }

    if (error.meta?.body?.error?.root_cause) {
      searchError.root_cause = error.meta.body.error.root_cause;
    }

    return searchError;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    lastHealthCheck: Date | null;
    elasticsearchNode: string;
  } {
    return {
      isConnected: this.isConnected,
      lastHealthCheck: this.lastHealthCheck,
      elasticsearchNode: this.configService.get<string>(
        'ELASTICSEARCH_NODE',
        'http://localhost:9200',
      ),
    };
  }

  /**
   * Utility method to sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
