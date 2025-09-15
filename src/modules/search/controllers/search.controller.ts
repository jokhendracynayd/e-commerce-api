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
  SortOption,
  QueryType,
  SearchMode,
} from '../dto/search-query.dto';
import { SearchResponseDto } from '../dto/search-response.dto';
import { SEARCH_FIELDS } from '../constants/indices.constants';

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

  @Get('api-docs')
  @Public()
  @ApiOperation({
    summary: 'Search API Documentation for LLM Integration',
    description: 'Complete documentation optimized for LLM tools and chatbot integration. Auto-updates when fields change.',
  })
  @ApiResponse({
    status: 200,
    description: 'LLM-friendly API documentation with dynamic examples',
  })
  getSearchApiDocs() {
    // Dynamic field mappings from constants
    const searchFields = SEARCH_FIELDS.PRODUCTS;
    const boostValues = SEARCH_FIELDS.BOOST_VALUES;
    
    // Build dynamic fields_searched array
    const fieldsSearched = Object.entries(searchFields).map(([key, field]) => {
      const boost = boostValues[key] || 1;
      return `${field} (boost: ${boost}x)`;
    });

    return {
      // LLM Integration Info
      llm_integration: {
        purpose: 'Product search API for e-commerce chatbot integration',
        version: '1.0.0',
        last_updated: new Date().toISOString(),
        auto_updates: true,
        note: 'This documentation automatically reflects current field mappings and search capabilities'
      },

      // Core Endpoint Info
      endpoint: {
        method: 'GET',
        url: '/api/v1/search/products',
        description: 'Search products with natural language queries, filters, and faceting',
        authentication: 'None required (public endpoint)',
        rate_limit: 'Standard API limits apply'
      },

      // Dynamic Field Mappings (Auto-updated from constants)
      field_mappings: {
        search_fields: searchFields,
        boost_values: boostValues,
        sort_options: Object.values(SortOption),
        query_types: [
          QueryType.MULTI_MATCH,
        ],
        search_modes: [
          SearchMode.STANDARD,
        ],
        last_updated: new Date().toISOString(),
        note: 'Advanced query types (phrase, prefix, fuzzy, wildcard, boolean) and search modes (strict, relaxed) are defined in the code but not yet implemented in the search service. Currently uses multi_match with best_fields type.'
      },

      // Query Parameters (Auto-generated from DTOs)
      query_parameters: {
        // Text Search
        q: {
          type: 'string',
          required: false,
          description: 'Natural language search query. Supports complex queries like "gaming laptop under 1000"',
          examples: [
            'Nike',
            'gaming laptop',
            'red shoes under 1000',
            'Apple iPhone',
            'wireless headphones',
            'laptop for programming',
            'shoes for running'
          ],
          search_behavior: {
            fields_searched: fieldsSearched,
            operator: 'AND (all terms must match)',
            fuzziness: 'AUTO (handles typos)',
            minimum_match: '75% of terms must match'
          }
        },

        // Filters
        category: {
          type: 'string[]',
          required: false,
          description: 'Filter by category IDs. Supports multiple categories',
          example: ['category-id-1', 'category-id-2'],
          note: 'Categories are nested objects, filtering uses nested queries'
        },

        brand: {
          type: 'string[]', 
          required: false,
          description: 'Filter by brand IDs. Supports multiple brands',
          example: ['brand-id-1', 'brand-id-2']
        },

        price_min: {
          type: 'number',
          required: false,
          description: 'Minimum price filter',
          example: 100,
          note: 'Price in your currency units'
        },

        price_max: {
          type: 'number',
          required: false,
          description: 'Maximum price filter', 
          example: 1000,
          note: 'Price in your currency units'
        },

        rating_min: {
          type: 'number',
          required: false,
          description: 'Minimum rating filter (1-5 scale)',
          example: 4,
          note: 'Filters products with rating >= this value'
        },

        in_stock: {
          type: 'boolean',
          required: false,
          description: 'Filter by stock availability',
          example: true,
          note: 'true = only in-stock products, false = only out-of-stock'
        },

        // Sorting
        sort: {
          type: 'string',
          required: false,
          description: 'Sort results by different criteria',
          options: Object.values(SortOption).reduce((acc: Record<string, string>, option) => {
            acc[option] = this.getSortDescription(option);
            return acc;
          }, {}),
          default: 'relevance'
        },

        // Pagination
        page: {
          type: 'number',
          required: false,
          description: 'Page number for pagination',
          example: 1,
          default: 1,
          min: 1
        },

        limit: {
          type: 'number',
          required: false,
          description: 'Number of results per page',
          example: 20,
          default: 20,
          min: 1,
          max: 100
        },

        // Facets
        facets: {
          type: 'boolean',
          required: false,
          description: 'Include facet aggregations in response',
          example: true,
          default: false,
          note: 'Facets provide filtering options like available categories, brands, price ranges'
        }
      },

      // Response Format (Critical for LLM Integration)
      response_format: {
        structure: {
          statusCode: 'number (HTTP status code)',
          message: 'string (success/error message)',
          data: {
            hits: {
              total: {
                value: 'number (total results found)',
                relation: 'string (eq = exact, gte = approximate)'
              },
              products: 'array of product objects',
              max_score: 'number (highest relevance score)'
            },
            took: 'number (search execution time in ms)',
            pagination: {
              current_page: 'number',
              total_pages: 'number', 
              per_page: 'number',
              total_results: 'number',
              has_next: 'boolean',
              has_prev: 'boolean'
            },
            facets: 'object (only if facets=true)',
            from_cache: 'boolean',
            timestamp: 'string (ISO date)',
            query_info: {
              query: 'string (search term used)',
              filters_applied: 'array of applied filters'
            }
          },
          timestamp: 'string (ISO date)',
          path: 'string (API endpoint path)'
        },

        product_object_structure: {
          id: 'string (UUID)',
          title: 'string',
          description: 'string',
          short_description: 'string',
          price: 'number',
          discount_price: 'number',
          in_stock: 'boolean',
          stock_quantity: 'number',
          is_active: 'boolean',
          is_featured: 'boolean',
          sku: 'string',
          slug: 'string',
          created_at: 'string (ISO date)',
          updated_at: 'string (ISO date)',
          category: {
            id: 'string (UUID)',
            name: 'string',
            path: 'string'
          },
          brand: {
            id: 'string (UUID)', 
            name: 'string'
          },
          rating: {
            average: 'number (0-5)',
            count: 'number'
          },
          tags: 'array of strings',
          images: 'array of image URLs',
          variants: 'array of variant objects',
          _score: 'number (relevance score)'
        },

        facets_structure: {
          categories: {
            buckets: [
              {
                key: 'string (category ID)',
                doc_count: 'number',
                category_names: {
                  buckets: [
                    {
                      key: 'string (category name)',
                      doc_count: 'number'
                    }
                  ]
                }
              }
            ]
          },
          brands: {
            buckets: [
              {
                key: 'string (brand ID)',
                doc_count: 'number',
                brand_names: {
                  buckets: [
                    {
                      key: 'string (brand name)',
                      doc_count: 'number'
                    }
                  ]
                }
              }
            ]
          },
          price_ranges: {
            buckets: [
              {
                key: 'string (price range)',
                doc_count: 'number',
                from: 'number',
                to: 'number'
              }
            ]
          },
          ratings: {
            buckets: [
              {
                key: 'string (rating range)',
                doc_count: 'number'
              }
            ]
          },
          stock_status: {
            buckets: [
              {
                key: 'boolean (true/false)',
                doc_count: 'number'
              }
            ]
          }
        },

        example_response: {
          statusCode: 200,
          message: 'Request processed successfully',
          data: {
            hits: {
              total: { value: 1, relation: 'eq' },
              products: [
                {
                  id: '989fc43d-6762-4fd2-9c4f-d8000afb5d62',
                  title: 'Apple iPhone 15',
                  description: 'Latest iPhone with advanced features',
                  short_description: 'iPhone 15 Pro Max',
                  price: 99999,
                  discount_price: 89999,
                  in_stock: true,
                  stock_quantity: 50,
                  is_active: true,
                  is_featured: true,
                  sku: 'IPH15-001',
                  slug: 'apple-iphone-15',
                  created_at: '2025-09-09T17:49:43.893Z',
                  updated_at: '2025-09-10T08:06:03.086Z',
                  category: {
                    id: '51c99528-c1d9-4b39-b4e1-7512d1088b8f',
                    name: 'Electronics',
                    path: 'electronics'
                  },
                  brand: {
                    id: 'ede309d7-6c32-4ec9-9e2a-cf61256aca1e',
                    name: 'Apple'
                  },
                  rating: { average: 4.5, count: 120 },
                  tags: ['smartphone', 'apple', '5g'],
                  images: ['https://example.com/iphone15.jpg'],
                  variants: [],
                  _score: 1.5249237
                }
              ],
              max_score: 1.5249237
            },
            took: 15,
            pagination: {
              current_page: 1,
              total_pages: 1,
              per_page: 20,
              total_results: 1,
              has_next: false,
              has_prev: false
            },
            facets: {
              categories: {
                buckets: [
                  {
                    key: '51c99528-c1d9-4b39-b4e1-7512d1088b8f',
                    doc_count: 1,
                    category_names: {
                      buckets: [
                        { key: 'Electronics', doc_count: 1 }
                      ]
                    }
                  }
                ]
              },
              brands: {
                buckets: [
                  {
                    key: 'ede309d7-6c32-4ec9-9e2a-cf61256aca1e',
                    doc_count: 1,
                    brand_names: {
                      buckets: [
                        { key: 'Apple', doc_count: 1 }
                      ]
                    }
                  }
                ]
              }
            },
            from_cache: false,
            timestamp: '2025-09-14T05:16:12.493Z',
            query_info: {
              query: 'Apple iPhone',
              filters_applied: []
            }
          },
          timestamp: '2025-09-14T05:16:12.494Z',
          path: '/api/v1/search/products'
        },

        llm_usage_notes: {
          parsing_guidelines: [
            'Always check statusCode first - 200 means success',
            'Use data.hits.total.value to know how many results found',
            'data.hits.products contains the actual product data',
            'data.pagination provides navigation info for large result sets',
            'data.facets provides filtering options (only when facets=true)',
            'data.query_info shows what search was actually performed'
          ],
          error_handling: [
            'statusCode 400 = Bad request (invalid parameters)',
            'statusCode 500 = Server error (check server logs)',
            'data.hits.total.value = 0 means no results found',
            'Use facets to suggest alternative searches when no results'
          ],
          performance_tips: [
            'data.took shows search time (lower is better)',
            'data.from_cache indicates if result was cached',
            'Use pagination for large result sets',
            'Limit results with filters to improve performance'
          ]
        }
      },

      // LLM Integration Examples
      llm_examples: {
        natural_language_queries: [
          {
            user_input: 'I want red shoes under 1000',
            llm_parsing: {
              search_term: 'red shoes',
              filters: { price_max: 1000 },
              expected_api_call: '/api/v1/search/products?q=red shoes&price_max=1000'
            }
          },
          {
            user_input: 'Show me gaming laptops from ASUS',
            llm_parsing: {
              search_term: 'gaming laptops',
              filters: { brand: ['asus-brand-id'] },
              expected_api_call: '/api/v1/search/products?q=gaming laptops&brand=asus-brand-id'
            }
          },
          {
            user_input: 'Find iPhone with good rating',
            llm_parsing: {
              search_term: 'iPhone',
              filters: { rating_min: 4 },
              expected_api_call: '/api/v1/search/products?q=iPhone&rating_min=4'
            }
          }
        ],

        chatbot_integration_patterns: [
          {
            scenario: 'User searches for products',
            steps: [
              '1. Parse user query to extract search terms and filters',
              '2. Call search API with parsed parameters',
              '3. Present results with highlights and filtering options',
              '4. Handle pagination for large result sets'
            ]
          },
          {
            scenario: 'User wants to filter results',
            steps: [
              '1. Use facets=true to get available filters',
              '2. Apply user-selected filters to search query',
              '3. Re-run search with updated parameters',
              '4. Show filtered results'
            ]
          },
          {
            scenario: 'No results found',
            steps: [
              '1. Try broader search terms',
              '2. Remove restrictive filters',
              '3. Suggest alternative searches',
              '4. Use search suggestions endpoint'
            ]
          }
        ]
      },

      // Testing Examples
      test_examples: [
        {
          name: 'Basic Text Search',
          url: '/api/v1/search/products?q=Nike',
          expected_result: 'Returns Nike products with relevance scoring'
        },
        {
          name: 'Natural Language Query',
          url: '/api/v1/search/products?q=gaming laptop under 1000',
          expected_result: 'Returns gaming laptops under $1000'
        },
        {
          name: 'Filtered Search',
          url: '/api/v1/search/products?q=shoes&category=fashion&brand=nike&price_max=500',
          expected_result: 'Returns Nike shoes in fashion category under $500'
        },
        {
          name: 'Search with Facets',
          url: '/api/v1/search/products?q=laptop&facets=true',
          expected_result: 'Returns laptops with available categories, brands, price ranges'
        },
        {
          name: 'Sorted Results',
          url: '/api/v1/search/products?q=phone&sort=price_asc',
          expected_result: 'Returns phones sorted by price (low to high)'
        }
      ]
    };
  }

  private getSortDescription(sortOption: SortOption): string {
    const descriptions = {
      [SortOption.RELEVANCE]: 'Sort by search relevance (default)',
      [SortOption.PRICE_ASC]: 'Sort by price (low to high)',
      [SortOption.PRICE_DESC]: 'Sort by price (high to low)',
      [SortOption.RATING]: 'Sort by rating (high to low)',
      [SortOption.NEWEST]: 'Sort by creation date (newest first)',
      [SortOption.POPULARITY]: 'Sort by popularity score'
    };
    return descriptions[sortOption] || 'Unknown sort option';
  }
}
