import { Injectable, Logger, Inject } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../../common/prisma.service';
import { CoreElasticsearchService } from './elasticsearch.service';
import {
  SuggestQueryDto,
  AutocompleteQueryDto,
  SuggestionType,
} from '../dto/suggest-query.dto';
import {
  SuggestResponseDto,
  AutocompleteResponseDto,
  ProductSuggestion,
  CategorySuggestion,
  BrandSuggestion,
  QuerySuggestion,
  SpellCorrection,
  AutocompleteSuggestion,
} from '../dto/suggest-response.dto';
// import { SUGGESTION_ANALYTICS_INDEX } from '../constants/indices.constants';

@Injectable()
export class SuggestionService {
  private readonly logger = new Logger(SuggestionService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly coreElasticsearchService: CoreElasticsearchService,
    private readonly prismaService: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Main suggestion method that handles all types of suggestions
   */
  async getSuggestions(query: SuggestQueryDto): Promise<SuggestResponseDto> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.generateSuggestCacheKey(query);
    const cached = await this.cacheManager.get<SuggestResponseDto>(cacheKey);

    if (cached) {
      this.logger.debug(`Returning cached suggestions for query: ${query.q}`);
      return cached;
    }

    const response: SuggestResponseDto = {
      query: query.q,
      took: 0,
      total_suggestions: 0,
      timestamp: new Date().toISOString(),
      from_cache: false,
    };

    try {
      // Execute parallel suggestions based on requested types
      const suggestionPromises: Promise<any>[] = [];
      const types = query.types || [SuggestionType.PRODUCTS];

      if (types.includes(SuggestionType.PRODUCTS)) {
        suggestionPromises.push(this.getProductSuggestions(query));
      }

      if (types.includes(SuggestionType.CATEGORIES)) {
        suggestionPromises.push(this.getCategorySuggestions(query));
      }

      if (types.includes(SuggestionType.BRANDS)) {
        suggestionPromises.push(this.getBrandSuggestions(query));
      }

      if (types.includes(SuggestionType.QUERIES)) {
        suggestionPromises.push(this.getQuerySuggestions(query));
      }

      // Get spell corrections if enabled
      if (query.spell_check) {
        suggestionPromises.push(this.getSpellCorrections(query));
      }

      const results = await Promise.allSettled(suggestionPromises);

      // Process results
      let resultIndex = 0;

      if (types.includes(SuggestionType.PRODUCTS)) {
        const productResult = results[resultIndex++];
        if (productResult.status === 'fulfilled') {
          response.products = productResult.value;
        }
      }

      if (types.includes(SuggestionType.CATEGORIES)) {
        const categoryResult = results[resultIndex++];
        if (categoryResult.status === 'fulfilled') {
          response.categories = categoryResult.value;
        }
      }

      if (types.includes(SuggestionType.BRANDS)) {
        const brandResult = results[resultIndex++];
        if (brandResult.status === 'fulfilled') {
          response.brands = brandResult.value;
        }
      }

      if (types.includes(SuggestionType.QUERIES)) {
        const queryResult = results[resultIndex++];
        if (queryResult.status === 'fulfilled') {
          response.queries = queryResult.value;
        }
      }

      if (query.spell_check) {
        const spellResult = results[resultIndex++];
        if (spellResult.status === 'fulfilled') {
          response.corrections = spellResult.value;
        }
      }

      // Calculate total suggestions
      response.total_suggestions =
        (response.products?.length || 0) +
        (response.categories?.length || 0) +
        (response.brands?.length || 0) +
        (response.queries?.length || 0);
    } catch (error) {
      this.logger.error(
        `Error getting suggestions for query: ${query.q}`,
        error,
      );
      throw error;
    }

    response.took = Date.now() - startTime;

    // Cache the response
    await this.cacheManager.set(cacheKey, response, 300); // 5 minutes cache

    // Track analytics
    await this.trackSuggestionUsage(query, response);

    return response;
  }

  /**
   * Get product suggestions using completion suggester
   */
  async getProductSuggestions(
    query: SuggestQueryDto,
  ): Promise<ProductSuggestion[]> {
    try {
      const searchParams = {
        index: 'products',
        suggest: {
          product_suggest: {
            prefix: query.q,
            completion: {
              field: 'suggest',
              size: query.limit,
              skip_duplicates: true,
              fuzzy: query.fuzzy
                ? {
                    fuzziness: query.fuzziness,
                    prefix_length: 1,
                    unicode_aware: true,
                  }
                : undefined,
            },
          },
        },
        _source: [
          'id',
          'title',
          'price',
          'discount_price',
          'in_stock',
          'images',
          'category',
          'brand',
        ],
      };

      const response = await this.elasticsearchService.search(searchParams);
      const suggestions = response.suggest?.product_suggest?.[0]?.options || [];

      // Type guard to ensure suggestions is an array
      const suggestionArray = Array.isArray(suggestions) ? suggestions : [];

      return suggestionArray.map(
        (suggestion: any): ProductSuggestion => ({
          text: suggestion.text,
          product_id: suggestion._source.id,
          score: suggestion._score || 0,
          title: suggestion._source.title,
          price: suggestion._source.discount_price || suggestion._source.price,
          image: suggestion._source.images?.[0],
          in_stock: suggestion._source.in_stock,
          category: suggestion._source.category
            ? {
                id: suggestion._source.category.id,
                name: suggestion._source.category.name,
              }
            : undefined,
          brand: suggestion._source.brand
            ? {
                id: suggestion._source.brand.id,
                name: suggestion._source.brand.name,
              }
            : undefined,
        }),
      );
    } catch (error) {
      this.logger.error('Error getting product suggestions', error);
      return [];
    }
  }

  /**
   * Get category suggestions
   */
  async getCategorySuggestions(
    query: SuggestQueryDto,
  ): Promise<CategorySuggestion[]> {
    try {
      const searchParams = {
        index: 'categories',
        suggest: {
          category_suggest: {
            prefix: query.q,
            completion: {
              field: 'suggest',
              size: query.limit,
              skip_duplicates: true,
              fuzzy: query.fuzzy
                ? {
                    fuzziness: query.fuzziness,
                    prefix_length: 1,
                  }
                : undefined,
            },
          },
        },
        _source: ['id', 'name', 'path', 'level', 'product_count', 'parent'],
      };

      const response = await this.elasticsearchService.search(searchParams);
      const suggestions =
        response.suggest?.category_suggest?.[0]?.options || [];

      // Type guard to ensure suggestions is an array
      const suggestionArray = Array.isArray(suggestions) ? suggestions : [];

      return suggestionArray.map(
        (suggestion: any): CategorySuggestion => ({
          text: suggestion.text,
          category_id: suggestion._source.id,
          name: suggestion._source.name,
          path: suggestion._source.path || '',
          product_count: suggestion._source.product_count || 0,
          level: suggestion._source.level || 0,
          parent: suggestion._source.parent
            ? {
                id: suggestion._source.parent.id,
                name: suggestion._source.parent.name,
              }
            : undefined,
        }),
      );
    } catch (error) {
      this.logger.error('Error getting category suggestions', error);
      return [];
    }
  }

  /**
   * Get brand suggestions
   */
  async getBrandSuggestions(
    query: SuggestQueryDto,
  ): Promise<BrandSuggestion[]> {
    try {
      const searchParams = {
        index: 'brands',
        suggest: {
          brand_suggest: {
            prefix: query.q,
            completion: {
              field: 'suggest',
              size: query.limit,
              skip_duplicates: true,
              fuzzy: query.fuzzy
                ? {
                    fuzziness: query.fuzziness,
                    prefix_length: 1,
                  }
                : undefined,
            },
          },
        },
        _source: ['id', 'name', 'logo', 'product_count', 'is_featured'],
      };

      const response = await this.elasticsearchService.search(searchParams);
      const suggestions = response.suggest?.brand_suggest?.[0]?.options || [];

      // Type guard to ensure suggestions is an array
      const suggestionArray = Array.isArray(suggestions) ? suggestions : [];

      return suggestionArray.map(
        (suggestion: any): BrandSuggestion => ({
          text: suggestion.text,
          brand_id: suggestion._source.id,
          name: suggestion._source.name,
          product_count: suggestion._source.product_count || 0,
          logo: suggestion._source.logo,
          is_featured: suggestion._source.is_featured || false,
        }),
      );
    } catch (error) {
      this.logger.error('Error getting brand suggestions', error);
      return [];
    }
  }

  /**
   * Get popular query suggestions
   */
  async getQuerySuggestions(
    query: SuggestQueryDto,
  ): Promise<QuerySuggestion[]> {
    try {
      const searchParams = {
        index: 'search_queries',
        query: {
          bool: {
            should: [
              {
                prefix: {
                  'query.keyword': {
                    value: query.q,
                    boost: 2.0,
                  },
                },
              },
              {
                match: {
                  query: query.q,
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        sort: [{ frequency: 'desc' }, { last_searched: 'desc' }],
        size: query.limit,
        _source: ['query', 'frequency', 'result_count', 'last_searched'],
      };

      const response = await this.elasticsearchService.search(
        searchParams as any,
      );
      const hits = response.hits?.hits || [];

      return hits.map(
        (hit: any): QuerySuggestion => ({
          text: hit._source.query,
          frequency: hit._source.frequency || 0,
          result_count: hit._source.result_count || 0,
          last_searched: hit._source.last_searched,
        }),
      );
    } catch (error) {
      this.logger.error('Error getting query suggestions', error);
      return [];
    }
  }

  /**
   * Get spell corrections using Elasticsearch's term suggester
   */
  async getSpellCorrections(
    query: SuggestQueryDto,
  ): Promise<SpellCorrection[]> {
    try {
      const searchParams = {
        index: 'products',
        suggest: {
          spell_suggest: {
            text: query.q,
            term: {
              field: 'title',
              size: 3,
              sort: 'frequency',
              suggest_mode: 'popular',
              min_word_length: 3,
              prefix_length: 1,
              min_doc_freq: 1,
            },
          },
        },
        size: 0, // We only want suggestions, not search results
      };

      const response = await this.elasticsearchService.search(
        searchParams as any,
      );
      const suggestions = response.suggest?.spell_suggest || [];

      const corrections: SpellCorrection[] = [];

      // Type guard to ensure suggestions is iterable
      const suggestionArray = Array.isArray(suggestions) ? suggestions : [];

      for (const suggestion of suggestionArray) {
        const originalWord = suggestion.text;
        const options = suggestion.options || [];

        // Type guard to ensure options is iterable
        const optionsArray = Array.isArray(options) ? options : [];

        for (const option of optionsArray) {
          corrections.push({
            original: originalWord,
            suggested: option.text,
            confidence: option.score || 0,
            result_count: (option as any).freq || 0,
          });
        }
      }

      return corrections.slice(0, query.limit);
    } catch (error) {
      this.logger.error('Error getting spell corrections', error);
      return [];
    }
  }

  /**
   * Get autocomplete suggestions (fast real-time search-as-you-type)
   */
  async getAutocomplete(
    query: AutocompleteQueryDto,
  ): Promise<AutocompleteResponseDto> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.generateAutocompleteCacheKey(query);
    const cached =
      await this.cacheManager.get<AutocompleteResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const searchParams = {
        index: 'products',
        suggest: {
          autocomplete: {
            prefix: query.text,
            completion: {
              field: 'autocomplete',
              size: query.size,
              skip_duplicates: true,
              fuzzy: {
                fuzziness: 'AUTO',
                prefix_length: 1,
              },
              contexts:
                query.context_aware && query.category_context
                  ? {
                      category: [query.category_context],
                    }
                  : undefined,
            },
          },
        },
        size: 0,
      };

      const response = await this.elasticsearchService.search(searchParams);
      const suggestions = response.suggest?.autocomplete?.[0]?.options || [];

      // Type guard to ensure suggestions is an array
      const suggestionArray = Array.isArray(suggestions) ? suggestions : [];

      const autocompleteResults: AutocompleteSuggestion[] = suggestionArray.map(
        (suggestion: any) => ({
          text: suggestion.text,
          score: suggestion._score || 0,
          type: this.determineSuggestionType(suggestion.text),
          data: suggestion.payload || {},
        }),
      );

      const result: AutocompleteResponseDto = {
        suggestions: autocompleteResults,
        took: Date.now() - startTime,
        query: query.text,
        total: autocompleteResults.length,
        timestamp: new Date().toISOString(),
        from_cache: false,
      };

      // Cache the response for 5 minutes
      await this.cacheManager.set(cacheKey, result, 300);

      return result;
    } catch (error) {
      this.logger.error(
        `Error getting autocomplete for query: ${query.text}`,
        error,
      );

      return {
        suggestions: [],
        took: Date.now() - startTime,
        query: query.text,
        total: 0,
        timestamp: new Date().toISOString(),
        from_cache: false,
      };
    }
  }

  /**
   * Track suggestion usage for analytics
   */
  private async trackSuggestionUsage(
    query: SuggestQueryDto,
    response: SuggestResponseDto,
  ): Promise<void> {
    try {
      const analyticsDoc = {
        query: query.q,
        timestamp: new Date(),
        user_id: query.user_id,
        session_id: query.session_id,
        suggestion_types: query.types || ['PRODUCTS'],
        total_suggestions: response.total_suggestions,
        product_count: response.products?.length || 0,
        category_count: response.categories?.length || 0,
        brand_count: response.brands?.length || 0,
        query_count: response.queries?.length || 0,
        spell_correction_count: response.corrections?.length || 0,
        source: 'suggestion_api',
      };

      await this.elasticsearchService.index({
        index: 'suggestion_analytics',
        body: analyticsDoc,
      });
    } catch (error) {
      this.logger.warn('Failed to track suggestion analytics:', error);
    }
  }

  /**
   * Determine the type of suggestion based on text analysis
   */
  private determineSuggestionType(
    text: string,
  ): 'product' | 'category' | 'brand' | 'query' {
    // Simple heuristic - in a real implementation, this could be more sophisticated
    if (text.toLowerCase().includes('category')) return 'category';
    if (text.toLowerCase().includes('brand')) return 'brand';
    if (text.length < 20) return 'query';
    return 'product';
  }

  /**
   * Generate cache key for suggestions
   */
  private generateSuggestCacheKey(query: SuggestQueryDto): string {
    const keyParts = [
      'suggest',
      query.q.toLowerCase().replace(/\s+/g, '_'),
      (query.types || []).sort().join(','),
      (query.limit || 10).toString(),
      query.fuzzy ? 'fuzzy' : 'exact',
      query.spell_check ? 'spell' : 'nospell',
    ];
    return keyParts.join(':');
  }

  /**
   * Generate cache key for autocomplete
   */
  private generateAutocompleteCacheKey(query: AutocompleteQueryDto): string {
    const keyParts = [
      'autocomplete',
      query.text.toLowerCase().replace(/\s+/g, '_'),
      (query.size || 10).toString(),
      query.context_aware ? 'context' : 'nocontext',
      query.category_context || 'all',
    ];
    return keyParts.join(':');
  }
}
