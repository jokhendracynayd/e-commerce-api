import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import {
  SearchProductsQueryDto,
  QueryType,
  SearchMode,
} from '../dto/search-query.dto';
import { QueryBuilder } from '../utils/query-builder.util';
import { INDEX_CONFIGURATIONS } from '../constants/mappings.constants';

export interface AdvancedSearchResult {
  query: any;
  explanation?: string;
  performance_hints?: string[];
  query_type: QueryType;
  search_mode: SearchMode;
}

export interface QueryAnalysis {
  is_phrase: boolean;
  has_wildcards: boolean;
  has_boolean_operators: boolean;
  estimated_complexity: 'low' | 'medium' | 'high';
  recommended_query_type: QueryType;
  recommended_search_mode: SearchMode;
}

@Injectable()
export class AdvancedSearchService {
  private readonly logger = new Logger(AdvancedSearchService.name);
  private readonly queryBuilder = new QueryBuilder();

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Analyze query and suggest optimal search strategy
   */
  analyzeQuery(queryText: string): QueryAnalysis {
    const analysis: QueryAnalysis = {
      is_phrase: false,
      has_wildcards: false,
      has_boolean_operators: false,
      estimated_complexity: 'low',
      recommended_query_type: QueryType.MULTI_MATCH,
      recommended_search_mode: SearchMode.STANDARD,
    };

    if (!queryText) {
      return analysis;
    }

    // Check for phrase queries (quoted strings)
    analysis.is_phrase = /["'].*["']/.test(queryText);

    // Check for wildcards
    analysis.has_wildcards = /[*?]/.test(queryText);

    // Check for boolean operators
    analysis.has_boolean_operators = /[+\-]|\b(AND|OR|NOT)\b/i.test(queryText);

    // Estimate complexity
    const wordCount = queryText.trim().split(/\s+/).length;
    if (
      wordCount > 5 ||
      analysis.has_boolean_operators ||
      analysis.has_wildcards
    ) {
      analysis.estimated_complexity = 'high';
    } else if (wordCount > 2 || analysis.is_phrase) {
      analysis.estimated_complexity = 'medium';
    }

    // Recommend query type
    if (analysis.has_boolean_operators) {
      analysis.recommended_query_type = QueryType.BOOLEAN;
    } else if (analysis.has_wildcards) {
      analysis.recommended_query_type = QueryType.WILDCARD;
    } else if (analysis.is_phrase) {
      analysis.recommended_query_type = QueryType.PHRASE;
    } else if (wordCount === 1) {
      analysis.recommended_query_type = QueryType.PREFIX;
    }

    // Recommend search mode
    if (analysis.estimated_complexity === 'high') {
      analysis.recommended_search_mode = SearchMode.RELAXED;
    } else if (analysis.is_phrase) {
      analysis.recommended_search_mode = SearchMode.STRICT;
    }

    return analysis;
  }

  /**
   * Execute optimized search based on query analysis
   */
  async executeOptimizedSearch(
    query: SearchProductsQueryDto,
  ): Promise<AdvancedSearchResult> {
    const analysis = this.analyzeQuery(query.q || '');

    // Override query parameters based on analysis if not explicitly set
    const optimizedQuery = { ...query };

    if (!optimizedQuery.query_type) {
      optimizedQuery.query_type = analysis.recommended_query_type;
    }

    if (!optimizedQuery.search_mode) {
      optimizedQuery.search_mode = analysis.recommended_search_mode;
    }

    // Auto-enable fuzzy for simple queries
    if (
      optimizedQuery.fuzzy === undefined &&
      analysis.estimated_complexity === 'low'
    ) {
      optimizedQuery.fuzzy = true;
    }

    // Build the optimized query
    const esQuery = this.queryBuilder.buildSearchQuery(optimizedQuery, {
      enableFunctionScore: optimizedQuery.function_score !== false,
      enableBoosting: true,
      enableSynonyms: true,
    });

    const result: AdvancedSearchResult = {
      query: esQuery,
      query_type: optimizedQuery.query_type || QueryType.MULTI_MATCH,
      search_mode: optimizedQuery.search_mode || SearchMode.STANDARD,
    };

    // Add explanation
    result.explanation = this.generateQueryExplanation(
      analysis,
      optimizedQuery,
    );

    // Add performance hints
    result.performance_hints = this.generatePerformanceHints(
      analysis,
      optimizedQuery,
    );

    return result;
  }

  /**
   * Test different query strategies and compare results
   */
  async compareQueryStrategies(query: SearchProductsQueryDto): Promise<{
    strategies: Array<{
      name: string;
      query_type: QueryType;
      search_mode: SearchMode;
      took: number;
      hits: number;
      max_score: number;
    }>;
    recommended: string;
  }> {
    const strategies = [
      {
        name: 'Standard Multi-Match',
        query_type: QueryType.MULTI_MATCH,
        search_mode: SearchMode.STANDARD,
      },
      {
        name: 'Strict Multi-Match',
        query_type: QueryType.MULTI_MATCH,
        search_mode: SearchMode.STRICT,
      },
      {
        name: 'Relaxed Multi-Match',
        query_type: QueryType.MULTI_MATCH,
        search_mode: SearchMode.RELAXED,
      },
      {
        name: 'Phrase Search',
        query_type: QueryType.PHRASE,
        search_mode: SearchMode.STANDARD,
      },
      {
        name: 'Fuzzy Search',
        query_type: QueryType.FUZZY,
        search_mode: SearchMode.STANDARD,
      },
      {
        name: 'Boolean Search',
        query_type: QueryType.BOOLEAN,
        search_mode: SearchMode.STANDARD,
      },
    ];

    type StrategyResult = {
      name: string;
      query_type: QueryType;
      search_mode: SearchMode;
      took: number;
      hits: number;
      max_score: number;
    };

    const results: StrategyResult[] = [];
    const testQuery = { ...query, limit: 5, facets: false }; // Small limit for testing

    for (const strategy of strategies) {
      try {
        const strategyQuery = {
          ...testQuery,
          query_type: strategy.query_type,
          search_mode: strategy.search_mode,
        };

        const esQuery = this.queryBuilder.buildSearchQuery(strategyQuery);
        const startTime = Date.now();

        const response = await this.elasticsearchService.search({
          index: INDEX_CONFIGURATIONS.products.index,
          body: {
            query: esQuery,
            size: 5,
            _source: ['id', 'title'],
          },
          timeout: '5s',
        } as any);

        const took = Date.now() - startTime;
        const totalHits =
          typeof response.hits.total === 'number'
            ? response.hits.total
            : response.hits.total?.value || 0;

        results.push({
          name: strategy.name,
          query_type: strategy.query_type,
          search_mode: strategy.search_mode,
          took,
          hits: totalHits,
          max_score: response.hits.max_score || 0,
        });
      } catch (error: any) {
        this.logger.warn(`Strategy ${strategy.name} failed:`, error.message);
        results.push({
          name: strategy.name,
          query_type: strategy.query_type,
          search_mode: strategy.search_mode,
          took: -1,
          hits: 0,
          max_score: 0,
        });
      }
    }

    // Determine recommended strategy based on results
    const validResults = results.filter((r) => r.took > 0 && r.hits > 0);
    const recommended =
      validResults.length > 0
        ? validResults.reduce((best, current) =>
            current.max_score > best.max_score ||
            (current.max_score === best.max_score && current.took < best.took)
              ? current
              : best,
          ).name
        : 'Standard Multi-Match';

    return {
      strategies: results,
      recommended,
    };
  }

  /**
   * Get advanced query explanation
   */
  async explainQuery(
    query: SearchProductsQueryDto,
    productId: string,
  ): Promise<any> {
    try {
      const esQuery = this.queryBuilder.buildSearchQuery(query);

      const explanation = await this.elasticsearchService.explain({
        index: INDEX_CONFIGURATIONS.products.index,
        id: productId,
        body: {
          query: esQuery,
        },
      } as any);

      return explanation;
    } catch (error) {
      this.logger.error('Failed to explain query:', error.message);
      throw new Error(`Query explanation failed: ${error.message}`);
    }
  }

  /**
   * Validate and optimize query before execution
   */
  validateAndOptimizeQuery(query: SearchProductsQueryDto): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    optimizedQuery: SearchProductsQueryDto;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const optimizedQuery = { ...query };

    // Validate query parameters
    if (query.q && query.q.length > 1000) {
      errors.push('Query text too long (max 1000 characters)');
    }

    if (
      query.proximity !== undefined &&
      (query.proximity < 0 || query.proximity > 10)
    ) {
      errors.push('Proximity must be between 0 and 10');
    }

    if (
      query.minimum_should_match !== undefined &&
      (query.minimum_should_match < 10 || query.minimum_should_match > 100)
    ) {
      errors.push('Minimum should match must be between 10% and 100%');
    }

    // Optimization warnings
    if (query.fuzzy && query.query_type === QueryType.PHRASE) {
      warnings.push('Fuzzy matching is not effective with phrase queries');
      optimizedQuery.fuzzy = false;
    }

    if (query.proximity && query.query_type !== QueryType.PHRASE) {
      warnings.push('Proximity setting only applies to phrase queries');
    }

    if (!query.q && query.query_type !== QueryType.MULTI_MATCH) {
      warnings.push(
        'Empty query with specific query type will return no results',
      );
      optimizedQuery.query_type = QueryType.MULTI_MATCH;
    }

    // Performance optimizations
    if (query.limit && query.limit > 50) {
      warnings.push('Large result sets may impact performance');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      optimizedQuery,
    };
  }

  /**
   * Generate human-readable query explanation
   */
  private generateQueryExplanation(
    analysis: QueryAnalysis,
    query: SearchProductsQueryDto,
  ): string {
    const parts: string[] = [];

    parts.push(`Query complexity: ${analysis.estimated_complexity}`);
    parts.push(`Query type: ${query.query_type || QueryType.MULTI_MATCH}`);
    parts.push(`Search mode: ${query.search_mode || SearchMode.STANDARD}`);

    if (analysis.is_phrase) {
      parts.push('Detected phrase query - using exact phrase matching');
    }

    if (analysis.has_wildcards) {
      parts.push('Detected wildcards - using pattern matching');
    }

    if (analysis.has_boolean_operators) {
      parts.push('Detected boolean operators - using structured boolean logic');
    }

    if (query.fuzzy) {
      parts.push(
        `Fuzzy matching enabled with fuzziness: ${query.fuzziness || 'AUTO'}`,
      );
    }

    if (query.function_score) {
      parts.push('Custom relevance scoring enabled');
    }

    return parts.join('. ');
  }

  /**
   * Generate performance optimization hints
   */
  private generatePerformanceHints(
    analysis: QueryAnalysis,
    query: SearchProductsQueryDto,
  ): string[] {
    const hints: string[] = [];

    if (analysis.estimated_complexity === 'high') {
      hints.push('Consider breaking down complex queries into simpler terms');
    }

    if (query.fuzzy && analysis.estimated_complexity === 'high') {
      hints.push(
        'Disable fuzzy matching for complex queries to improve performance',
      );
    }

    if (query.limit && query.limit > 50) {
      hints.push('Use pagination for large result sets');
    }

    if (analysis.has_wildcards) {
      hints.push(
        'Wildcard queries can be slow - consider using prefix or fuzzy matching instead',
      );
    }

    if (!query.facets && query.limit && query.limit < 20) {
      hints.push(
        'Enable caching for small result sets to improve response times',
      );
    }

    return hints;
  }
}
