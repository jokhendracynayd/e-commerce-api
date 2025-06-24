import { Controller, Get, Query, ValidationPipe, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../../common/guards/jwt-auth.guard';
import { CoreElasticsearchService } from '../services/elasticsearch.service';
import { IndexService } from '../services/index.service';
import { SearchService } from '../services/search.service';
import {
  AdvancedSearchService,
  QueryAnalysis,
} from '../services/advanced-search.service';
import {
  SearchProductsQueryDto,
  QueryType,
  SearchMode,
} from '../dto/search-query.dto';
import { SearchResponseDto } from '../dto/search-response.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(
    private readonly coreElasticsearchService: CoreElasticsearchService,
    private readonly indexService: IndexService,
    private readonly searchService: SearchService,
    private readonly advancedSearchService: AdvancedSearchService,
  ) {}

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Elasticsearch health check' })
  @ApiResponse({
    status: 200,
    description: 'Elasticsearch health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        cluster: { type: 'object' },
        connection: { type: 'boolean' },
        lastCheck: { type: 'string' },
      },
    },
  })
  async getSearchHealth() {
    try {
      const health = await this.coreElasticsearchService.checkHealth();
      return {
        service: 'elasticsearch',
        ...health,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: 'elasticsearch',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('cluster/health')
  @Public()
  @ApiOperation({ summary: 'Elasticsearch cluster health' })
  @ApiResponse({
    status: 200,
    description: 'Elasticsearch cluster health details',
  })
  async getClusterHealth() {
    try {
      const clusterHealth =
        await this.coreElasticsearchService.getClusterHealth();
      return {
        cluster: clusterHealth,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('connection/status')
  @Public()
  @ApiOperation({ summary: 'Elasticsearch connection status' })
  @ApiResponse({
    status: 200,
    description: 'Elasticsearch connection status',
  })
  async getConnectionStatus() {
    const status = this.coreElasticsearchService.getConnectionStatus();
    return {
      ...status,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('indices/status')
  @Public()
  @ApiOperation({ summary: 'Check if all indices exist' })
  @ApiResponse({
    status: 200,
    description: 'Index existence status',
  })
  async getIndicesStatus() {
    try {
      const status = await this.indexService.checkIndicesExist();
      return {
        indices: status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('indices/info')
  @Public()
  @ApiOperation({ summary: 'Get all indices information' })
  @ApiResponse({
    status: 200,
    description: 'Indices information',
  })
  async getIndicesInfo() {
    try {
      const indices = await this.indexService.getAllIndicesInfo();
      return {
        indices,
        count: indices.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('indices/create-with-mappings')
  @Public()
  @ApiOperation({
    summary: 'Create Elasticsearch indices with advanced mappings (Phase 1.3)',
  })
  @ApiResponse({
    status: 200,
    description: 'Indices created successfully with advanced mappings',
  })
  async createIndicesWithMappings() {
    try {
      await this.indexService.createAllIndicesWithMappings();
      return {
        message: 'All indices created successfully with advanced mappings',
        phase: 'Phase 1.3 - Index Design & Mapping',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('products/bulk-index')
  @Public()
  @ApiOperation({ summary: 'Bulk index all products' })
  @ApiResponse({
    status: 200,
    description: 'Products indexed successfully',
  })
  async bulkIndexProducts() {
    try {
      await this.indexService.bulkIndexProducts();
      return {
        message: 'Products indexed successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('products')
  @Public()
  @ApiOperation({
    summary: 'Search products with advanced filtering and faceting (Phase 2.1)',
    description:
      'Advanced product search with multiple query types, filtering, sorting, pagination, and caching',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results with products, facets, and pagination',
    type: SearchResponseDto,
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search query text' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Category filter (comma-separated IDs)',
  })
  @ApiQuery({
    name: 'brand',
    required: false,
    description: 'Brand filter (comma-separated IDs)',
  })
  @ApiQuery({
    name: 'price_min',
    required: false,
    description: 'Minimum price filter',
  })
  @ApiQuery({
    name: 'price_max',
    required: false,
    description: 'Maximum price filter',
  })
  @ApiQuery({
    name: 'rating_min',
    required: false,
    description: 'Minimum rating filter (1-5)',
  })
  @ApiQuery({
    name: 'in_stock',
    required: false,
    description: 'Filter by stock availability',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Sort option',
    enum: [
      'relevance',
      'price_asc',
      'price_desc',
      'rating',
      'newest',
      'popularity',
    ],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-based)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Results per page (max 100)',
  })
  @ApiQuery({
    name: 'facets',
    required: false,
    description: 'Include facets in response',
  })
  async searchProducts(
    @Query(new ValidationPipe({ transform: true }))
    query: SearchProductsQueryDto,
  ): Promise<SearchResponseDto> {
    try {
      return await this.searchService.searchProducts(query);
    } catch (error) {
      this.logger.error('Search products failed:', error.message);
      throw error;
    }
  }

  @Get('products/facets')
  @Public()
  @ApiOperation({
    summary: 'Get search facets without results',
    description: 'Retrieve available facets for filtering products',
  })
  @ApiResponse({
    status: 200,
    description: 'Available facets for product filtering',
  })
  async getSearchFacets(
    @Query(new ValidationPipe({ transform: true }))
    query: SearchProductsQueryDto,
  ) {
    try {
      const facetsQuery = { ...query, limit: 0, facets: true };
      const response = await this.searchService.searchProducts(facetsQuery);

      return {
        facets: response.facets,
        took: response.took,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Search facets error:', error.message);
      throw error;
    }
  }

  // ============ PHASE 2.2: ADVANCED QUERY FEATURES ============

  @Get('products/advanced')
  @Public()
  @ApiOperation({
    summary: 'Advanced product search with query optimization (Phase 2.2)',
    description:
      'Intelligent search with automatic query analysis and optimization',
  })
  @ApiResponse({
    status: 200,
    description: 'Optimized search results with query analysis',
    schema: {
      type: 'object',
      properties: {
        results: { $ref: '#/components/schemas/SearchResponseDto' },
        analysis: {
          type: 'object',
          properties: {
            query_type: { type: 'string', enum: Object.values(QueryType) },
            search_mode: { type: 'string', enum: Object.values(SearchMode) },
            explanation: { type: 'string' },
            performance_hints: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search query text' })
  @ApiQuery({
    name: 'query_type',
    required: false,
    description: 'Query type',
    enum: QueryType,
  })
  @ApiQuery({
    name: 'search_mode',
    required: false,
    description: 'Search mode',
    enum: SearchMode,
  })
  @ApiQuery({
    name: 'fuzzy',
    required: false,
    description: 'Enable fuzzy matching',
  })
  @ApiQuery({
    name: 'fuzziness',
    required: false,
    description: 'Fuzziness level (0-2 or AUTO)',
  })
  @ApiQuery({
    name: 'phrase_match',
    required: false,
    description: 'Enable phrase matching',
  })
  @ApiQuery({
    name: 'proximity',
    required: false,
    description: 'Proximity distance for phrase matching',
  })
  @ApiQuery({
    name: 'minimum_should_match',
    required: false,
    description: 'Minimum should match percentage',
  })
  @ApiQuery({
    name: 'boolean_query',
    required: false,
    description: 'Boolean query with operators (+, -, AND, OR)',
  })
  @ApiQuery({
    name: 'function_score',
    required: false,
    description: 'Enable custom relevance scoring',
  })
  async advancedSearchProducts(
    @Query(new ValidationPipe({ transform: true }))
    query: SearchProductsQueryDto,
  ) {
    try {
      // Get optimized search with analysis
      const optimizedResult =
        await this.advancedSearchService.executeOptimizedSearch(query);

      // Execute the actual search with optimized query
      const searchResults = await this.searchService.searchProducts(query);

      return {
        results: searchResults,
        analysis: {
          query_type: optimizedResult.query_type,
          search_mode: optimizedResult.search_mode,
          explanation: optimizedResult.explanation,
          performance_hints: optimizedResult.performance_hints,
        },
        optimization: {
          query_was_optimized: true,
          original_query: query.q,
          optimized_query_type: optimizedResult.query_type,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Advanced search error:', error.message);
      throw error;
    }
  }

  @Get('query/analyze')
  @Public()
  @ApiOperation({
    summary: 'Analyze search query and get optimization suggestions',
    description:
      'Analyze query complexity and get recommendations for optimal search strategy',
  })
  @ApiResponse({
    status: 200,
    description: 'Query analysis with optimization recommendations',
    schema: {
      type: 'object',
      properties: {
        analysis: {
          type: 'object',
          properties: {
            is_phrase: { type: 'boolean' },
            has_wildcards: { type: 'boolean' },
            has_boolean_operators: { type: 'boolean' },
            estimated_complexity: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
            },
            recommended_query_type: {
              type: 'string',
              enum: Object.values(QueryType),
            },
            recommended_search_mode: {
              type: 'string',
              enum: Object.values(SearchMode),
            },
          },
        },
        recommendations: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiQuery({ name: 'q', required: true, description: 'Query text to analyze' })
  async analyzeQuery(@Query('q') queryText: string) {
    try {
      const analysis = this.advancedSearchService.analyzeQuery(queryText);

      const recommendations: string[] = [];

      if (analysis.estimated_complexity === 'high') {
        recommendations.push(
          'Consider breaking down the query into simpler terms',
        );
        recommendations.push('Use relaxed search mode for better results');
      }

      if (analysis.has_boolean_operators) {
        recommendations.push(
          'Boolean query type will provide more precise results',
        );
      }

      if (analysis.is_phrase) {
        recommendations.push('Phrase query type will match exact phrases');
        recommendations.push(
          'Consider using proximity settings for flexible phrase matching',
        );
      }

      if (analysis.has_wildcards) {
        recommendations.push(
          'Wildcard queries can be slower - consider alternatives',
        );
      }

      return {
        query: queryText,
        analysis,
        recommendations,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Query analysis error:', error.message);
      throw error;
    }
  }

  @Get('query/compare')
  @Public()
  @ApiOperation({
    summary: 'Compare different query strategies',
    description:
      'Test different search strategies and compare their performance',
  })
  @ApiResponse({
    status: 200,
    description: 'Comparison of different query strategies',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Query text to test' })
  async compareQueryStrategies(
    @Query(new ValidationPipe({ transform: true }))
    query: SearchProductsQueryDto,
  ) {
    try {
      if (!query.q) {
        throw new Error('Query text is required for comparison');
      }

      const comparison =
        await this.advancedSearchService.compareQueryStrategies(query);

      return {
        query: query.q,
        strategies: comparison.strategies,
        recommended: comparison.recommended,
        analysis: {
          best_performance: comparison.strategies
            .filter((s) => s.took > 0)
            .reduce(
              (best, current) => (current.took < best.took ? current : best),
              { took: Infinity } as any,
            ),
          best_relevance: comparison.strategies.reduce((best, current) =>
            current.max_score > best.max_score ? current : best,
          ),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Query comparison error:', error.message);
      throw error;
    }
  }

  @Get('query/explain/:productId')
  @Public()
  @ApiOperation({
    summary: 'Explain why a product matches a query',
    description:
      'Get detailed explanation of how a product scores for a given query',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed scoring explanation',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Query to explain' })
  async explainQuery(
    @Query(new ValidationPipe({ transform: true }))
    query: SearchProductsQueryDto,
    @Query('productId') productId: string,
  ) {
    try {
      if (!query.q) {
        throw new Error('Query text is required for explanation');
      }

      const explanation = await this.advancedSearchService.explainQuery(
        query,
        productId,
      );

      return {
        query: query.q,
        product_id: productId,
        explanation,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Query explanation error:', error.message);
      throw error;
    }
  }

  @Get('query/validate')
  @Public()
  @ApiOperation({
    summary: 'Validate and optimize query parameters',
    description: 'Check query validity and get optimization suggestions',
  })
  @ApiResponse({
    status: 200,
    description: 'Query validation results with optimization suggestions',
  })
  async validateQuery(
    @Query(new ValidationPipe({ transform: true }))
    query: SearchProductsQueryDto,
  ) {
    try {
      const validation =
        this.advancedSearchService.validateAndOptimizeQuery(query);

      return {
        original_query: query,
        validation: {
          is_valid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
        },
        optimized_query: validation.optimizedQuery,
        changes_made: this.getQueryChanges(query, validation.optimizedQuery),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Query validation error:', error.message);
      throw error;
    }
  }

  /**
   * Helper method to identify changes between original and optimized query
   */
  private getQueryChanges(
    original: SearchProductsQueryDto,
    optimized: SearchProductsQueryDto,
  ): string[] {
    const changes: string[] = [];

    if (original.query_type !== optimized.query_type) {
      changes.push(
        `Query type changed from ${original.query_type || 'default'} to ${optimized.query_type}`,
      );
    }

    if (original.search_mode !== optimized.search_mode) {
      changes.push(
        `Search mode changed from ${original.search_mode || 'default'} to ${optimized.search_mode}`,
      );
    }

    if (original.fuzzy !== optimized.fuzzy) {
      changes.push(
        `Fuzzy matching ${optimized.fuzzy ? 'enabled' : 'disabled'}`,
      );
    }

    if (original.minimum_should_match !== optimized.minimum_should_match) {
      changes.push(
        `Minimum should match changed to ${optimized.minimum_should_match}%`,
      );
    }

    return changes;
  }
}
