import { Injectable, Logger, Inject } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SearchProductsQueryDto, SortOption } from '../dto/search-query.dto';
import {
  SearchResponseDto,
  ProductSearchResult,
  SearchHits,
  SearchFacets,
  SearchPagination,
  FacetBucket,
  PriceRangeFacet,
} from '../dto/search-response.dto';
import { FacetOptionsDto, AdvancedSearchFacets } from '../dto/facet.dto';
import { INDEX_CONFIGURATIONS } from '../constants/mappings.constants';
import { SEARCH_FIELDS } from '../constants/indices.constants';
import { CoreElasticsearchService } from './elasticsearch.service';
import { AggregationService } from './aggregation.service';
import { QueryBuilder, QueryBuilderOptions } from '../utils/query-builder.util';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly queryBuilder = new QueryBuilder();

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly coreElasticsearchService: CoreElasticsearchService,
    private readonly configService: ConfigService,
    private readonly aggregationService: AggregationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Search products with advanced filtering and faceting
   */
  async searchProducts(
    query: SearchProductsQueryDto,
  ): Promise<SearchResponseDto> {
    const startTime = Date.now();

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(query);

      // Check cache first
      if (this.configService.get<boolean>('SEARCH_CACHE_ENABLED', true)) {
        const cached = await this.cacheManager.get<SearchResponseDto>(cacheKey);
        if (cached) {
          this.logger.debug(`Cache hit for query: ${JSON.stringify(query)}`);
          return {
            ...cached,
            from_cache: true,
            timestamp: new Date().toISOString(),
          };
        }
      }

      // Build Elasticsearch query
      const esQuery = this.buildElasticsearchQuery(query);

      this.logger.debug(
        `Executing Elasticsearch query: ${JSON.stringify(esQuery, null, 2)}`,
      );

      // Execute search
      const response = await this.elasticsearchService.search({
        index: INDEX_CONFIGURATIONS.products.index,
        body: esQuery,
        timeout: this.configService.get<string>(
          'ELASTICSEARCH_REQUEST_TIMEOUT',
          '30s',
        ),
      } as any);

      const took = Date.now() - startTime;

      // Transform response
      const searchResponse = await this.transformElasticsearchResponse(
        response,
        query,
        took,
      );

      // Cache results
      if (this.configService.get<boolean>('SEARCH_CACHE_ENABLED', true)) {
        const cacheTTL = this.configService.get<number>(
          'SEARCH_CACHE_TTL',
          300,
        ); // 5 minutes
        await this.cacheManager.set(cacheKey, searchResponse, cacheTTL);
      }

      // Track analytics (async - don't await)
      this.trackSearchAnalytics(query, searchResponse).catch((error) =>
        this.logger.warn('Failed to track search analytics:', error.message),
      );

      return {
        ...searchResponse,
        from_cache: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const took = Date.now() - startTime;
      this.logger.error(`Search failed after ${took}ms:`, error.message);
      throw new Error(`Search execution failed: ${error.message}`);
    }
  }

  /**
   * Build Elasticsearch query from search parameters
   */
  private buildElasticsearchQuery(query: SearchProductsQueryDto): any {
    const must: any[] = [];
    const filter: any[] = [];
    const should: any[] = [];

    // Calculate pagination first
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const from = (page - 1) * limit;

    // Text search with advanced query builder
    if (query.q) {
      const queryBuilderOptions: QueryBuilderOptions = {
        enableFunctionScore: query.function_score !== false,
        enableBoosting: true,
        enableSynonyms: true,
      };

      // Use the advanced query builder for text search
      const textQuery = this.queryBuilder.buildSearchQuery(
        query,
        queryBuilderOptions,
      );

      // If function score is already applied in queryBuilder, use it directly
      // Otherwise, add it to the must clause
      if (query.function_score !== false && textQuery.function_score) {
        // Complete query with function score
        return {
          query: textQuery,
          from,
          size: limit,
          _source: this.getSourceFields(),
          sort: query.sort ? this.buildSort(query.sort) : undefined,
          aggs: query.facets ? this.buildAggregations() : undefined,
          highlight: this.buildHighlight(),
        };
      } else {
        must.push(textQuery);
      }
    }

    // Filters
    if (query.category?.length) {
      filter.push({ terms: { 'category.id': query.category } });
    }

    if (query.brand?.length) {
      filter.push({ terms: { 'brand.id': query.brand } });
    }

    if (query.price_min !== undefined || query.price_max !== undefined) {
      const priceRange: any = {};
      if (query.price_min !== undefined) priceRange.gte = query.price_min;
      if (query.price_max !== undefined) priceRange.lte = query.price_max;
      filter.push({ range: { price: priceRange } });
    }

    if (query.rating_min !== undefined) {
      filter.push({ range: { 'rating.average': { gte: query.rating_min } } });
    }

    if (query.in_stock !== undefined) {
      filter.push({ term: { in_stock: query.in_stock } });
    }

    // Always filter out inactive products
    filter.push({ term: { is_active: true } });

    const esQuery: any = {
      query: {
        bool: {
          must,
          filter,
          should,
          minimum_should_match: should.length > 0 ? 1 : 0,
        },
      },
      from,
      size: limit,
      _source: this.getSourceFields(),
    };

    // Add sorting
    if (query.sort) {
      esQuery.sort = this.buildSort(query.sort);
    }

    // Add aggregations if facets are requested
    if (query.facets) {
      esQuery.aggs = this.aggregationService.buildAggregations(
        query,
        query.facet_options,
      );
    }

    // Add highlighting if there's a text query
    if (query.q) {
      esQuery.highlight = this.buildHighlight();
    }

    return esQuery;
  }

  /**
   * Build text search query with multi-match and boosting
   */
  private buildTextQuery(queryText: string): any {
    return {
      bool: {
        should: [
          // Multi-match query for general search
          {
            multi_match: {
              query: queryText,
              fields: [
                `${SEARCH_FIELDS.PRODUCTS.TITLE}^${SEARCH_FIELDS.BOOST_VALUES.TITLE}`,
                `${SEARCH_FIELDS.PRODUCTS.DESCRIPTION}^${SEARCH_FIELDS.BOOST_VALUES.DESCRIPTION}`,
                `${SEARCH_FIELDS.PRODUCTS.BRAND}^${SEARCH_FIELDS.BOOST_VALUES.BRAND}`,
                `${SEARCH_FIELDS.PRODUCTS.CATEGORY}^${SEARCH_FIELDS.BOOST_VALUES.CATEGORY}`,
                `${SEARCH_FIELDS.PRODUCTS.KEYWORDS}^${SEARCH_FIELDS.BOOST_VALUES.KEYWORDS}`,
              ],
              type: 'best_fields',
              fuzziness: 'AUTO',
              operator: 'and',
              minimum_should_match: '75%',
            },
          },
          // Exact phrase match with higher boost
          {
            multi_match: {
              query: queryText,
              fields: [
                `${SEARCH_FIELDS.PRODUCTS.TITLE}^5`,
                `${SEARCH_FIELDS.PRODUCTS.KEYWORDS}^3`,
              ],
              type: 'phrase',
              boost: 2,
            },
          },
          // Prefix search for partial matches
          {
            multi_match: {
              query: queryText,
              fields: [
                `${SEARCH_FIELDS.PRODUCTS.TITLE}.keyword`,
                `${SEARCH_FIELDS.PRODUCTS.BRAND}.keyword`,
              ],
              type: 'phrase_prefix',
              boost: 1.5,
            },
          },
        ],
        minimum_should_match: 1,
      },
    };
  }

  /**
   * Build sorting configuration
   */
  private buildSort(sortOption: SortOption): any[] {
    switch (sortOption) {
      case SortOption.PRICE_ASC:
        return [{ price: { order: 'asc' } }, { _score: { order: 'desc' } }];

      case SortOption.PRICE_DESC:
        return [{ price: { order: 'desc' } }, { _score: { order: 'desc' } }];

      case SortOption.RATING:
        return [
          { 'rating.average': { order: 'desc' } },
          { 'rating.count': { order: 'desc' } },
          { _score: { order: 'desc' } },
        ];

      case SortOption.NEWEST:
        return [
          { created_at: { order: 'desc' } },
          { _score: { order: 'desc' } },
        ];

      case SortOption.POPULARITY:
        return [
          { popularity_score: { order: 'desc' } },
          { 'rating.average': { order: 'desc' } },
          { _score: { order: 'desc' } },
        ];

      case SortOption.RELEVANCE:
      default:
        return [
          { _score: { order: 'desc' } },
          { popularity_score: { order: 'desc' } },
          { 'rating.average': { order: 'desc' } },
        ];
    }
  }

  /**
   * Build aggregations for facets
   */
  private buildAggregations(): any {
    return {
      categories: {
        nested: {
          path: 'category',
        },
        aggs: {
          category_terms: {
            terms: {
              field: 'category.id',
              size: 20,
            },
            aggs: {
              category_name: {
                terms: {
                  field: 'category.name.keyword',
                  size: 1,
                },
              },
            },
          },
        },
      },
      brands: {
        terms: {
          field: 'brand.id',
          size: 20,
        },
        aggs: {
          brand_name: {
            terms: {
              field: 'brand.name.keyword',
              size: 1,
            },
          },
        },
      },
      price_ranges: {
        range: {
          field: 'price',
          ranges: [
            { key: '0-25', from: 0, to: 25 },
            { key: '25-50', from: 25, to: 50 },
            { key: '50-100', from: 50, to: 100 },
            { key: '100-250', from: 100, to: 250 },
            { key: '250-500', from: 250, to: 500 },
            { key: '500+', from: 500 },
          ],
        },
      },
      ratings: {
        range: {
          field: 'rating.average',
          ranges: [
            { key: '4+', from: 4 },
            { key: '3+', from: 3, to: 4 },
            { key: '2+', from: 2, to: 3 },
            { key: '1+', from: 1, to: 2 },
          ],
        },
      },
      tags: {
        terms: {
          field: 'tags',
          size: 15,
        },
      },
    };
  }

  /**
   * Build highlighting configuration
   */
  private buildHighlight(): any {
    return {
      fields: {
        [SEARCH_FIELDS.PRODUCTS.TITLE]: {
          fragment_size: 100,
          number_of_fragments: 1,
        },
        [SEARCH_FIELDS.PRODUCTS.DESCRIPTION]: {
          fragment_size: 150,
          number_of_fragments: 2,
        },
      },
      pre_tags: ['<mark>'],
      post_tags: ['</mark>'],
    };
  }

  /**
   * Get source fields to return
   */
  private getSourceFields(): string[] {
    return [
      'id',
      'title',
      'description',
      'sku',
      'slug',
      'price',
      'discount_price',
      'in_stock',
      'stock_quantity',
      'is_active',
      'is_featured',
      'images',
      'tags',
      'category',
      'brand',
      'rating',
      'variants',
      'created_at',
      'updated_at',
    ];
  }

  /**
   * Transform Elasticsearch response to our DTO format
   */
  private async transformElasticsearchResponse(
    response: any,
    query: SearchProductsQueryDto,
    took: number,
  ): Promise<SearchResponseDto> {
    const hits = response.hits;
    const aggregations = response.aggregations;

    // Transform products
    const products: ProductSearchResult[] = hits.hits.map((hit: any) => ({
      ...hit._source,
      _score: hit._score,
      // Apply any highlights
      ...(hit.highlight && {
        highlight: hit.highlight,
      }),
    }));

    // Build pagination
    const totalResults = hits.total.value;
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const totalPages = Math.ceil(totalResults / limit);

    const pagination: SearchPagination = {
      current_page: page,
      total_pages: totalPages,
      per_page: limit,
      total_results: totalResults,
      has_next: page < totalPages,
      has_prev: page > 1,
      next_page: page < totalPages ? page + 1 : undefined,
      prev_page: page > 1 ? page - 1 : undefined,
    };

    // Transform facets if requested
    let facets: SearchFacets | undefined;
    if (query.facets && aggregations) {
      const advancedFacets =
        await this.aggregationService.transformAggregations(
          aggregations,
          query,
          query.facet_options,
        );
      facets = this.mapAdvancedFacetsToSearchFacets(advancedFacets);
    }

    // Build query info
    const filtersApplied: string[] = [];
    if (query.category?.length) filtersApplied.push('category');
    if (query.brand?.length) filtersApplied.push('brand');
    if (query.price_min !== undefined || query.price_max !== undefined)
      filtersApplied.push('price');
    if (query.rating_min !== undefined) filtersApplied.push('rating');
    if (query.in_stock !== undefined) filtersApplied.push('stock');

    return {
      hits: {
        total: {
          value: totalResults,
          relation: hits.total.relation || 'eq',
        },
        products,
        max_score: hits.max_score,
      },
      facets,
      took,
      pagination,
      from_cache: false,
      timestamp: new Date().toISOString(),
      query_info: {
        query: query.q,
        filters_applied: filtersApplied,
        sort_by: query.sort,
      },
    };
  }

  /**
   * Map advanced facets to search facets (backward compatibility)
   */
  private mapAdvancedFacetsToSearchFacets(
    advancedFacets: AdvancedSearchFacets,
  ): SearchFacets {
    const searchFacets: SearchFacets = {};

    // Map categories
    if (advancedFacets.categories) {
      searchFacets.categories = advancedFacets.categories.map((cat) => ({
        key: cat.key,
        doc_count: cat.doc_count,
        data: cat.name,
      }));
    }

    // Map brands
    if (advancedFacets.brands) {
      searchFacets.brands = advancedFacets.brands.map((brand) => ({
        key: brand.key,
        doc_count: brand.doc_count,
        data: brand.name,
      }));
    }

    // Map price ranges
    if (advancedFacets.price_ranges) {
      searchFacets.price_ranges = advancedFacets.price_ranges;
    }

    // Map ratings
    if (advancedFacets.ratings) {
      searchFacets.ratings = advancedFacets.ratings.map((rating) => ({
        key: rating.key.toString(),
        doc_count: rating.doc_count,
        data: rating.label,
      }));
    }

    // Map tags
    if (advancedFacets.tags) {
      searchFacets.tags = advancedFacets.tags.map((tag) => ({
        key: tag.key,
        doc_count: tag.doc_count,
        data: tag.name,
      }));
    }

    // Map availability
    if (advancedFacets.availability) {
      searchFacets.availability = advancedFacets.availability.map((avail) => ({
        key: avail.key,
        doc_count: avail.doc_count,
        data: avail.name,
      }));
    }

    // Map custom facets
    if (advancedFacets.custom) {
      searchFacets.custom = {};
      Object.entries(advancedFacets.custom).forEach(([key, buckets]) => {
        searchFacets.custom![key] = buckets.map((bucket) => ({
          key: bucket.key,
          doc_count: bucket.doc_count,
          data: bucket.name,
        }));
      });
    }

    return searchFacets;
  }

  /**
   * Transform Elasticsearch aggregations to facets
   */
  private transformAggregations(aggregations: any): SearchFacets {
    const facets: SearchFacets = {};

    // Transform categories
    if (aggregations.categories?.category_terms?.buckets) {
      facets.categories = aggregations.categories.category_terms.buckets.map(
        (bucket: any) => ({
          key: bucket.key,
          doc_count: bucket.doc_count,
          data: bucket.category_name?.buckets?.[0]?.key,
        }),
      );
    }

    // Transform brands
    if (aggregations.brands?.buckets) {
      facets.brands = aggregations.brands.buckets.map((bucket: any) => ({
        key: bucket.key,
        doc_count: bucket.doc_count,
        data: bucket.brand_name?.buckets?.[0]?.key,
      }));
    }

    // Transform price ranges
    if (aggregations.price_ranges?.buckets) {
      facets.price_ranges = aggregations.price_ranges.buckets.map(
        (bucket: any) => ({
          key: bucket.key,
          from: bucket.from,
          to: bucket.to,
          doc_count: bucket.doc_count,
        }),
      );
    }

    // Transform ratings
    if (aggregations.ratings?.buckets) {
      facets.ratings = aggregations.ratings.buckets.map((bucket: any) => ({
        key: bucket.key,
        doc_count: bucket.doc_count,
      }));
    }

    // Transform tags
    if (aggregations.tags?.buckets) {
      facets.tags = aggregations.tags.buckets.map((bucket: any) => ({
        key: bucket.key,
        doc_count: bucket.doc_count,
      }));
    }

    return facets;
  }

  /**
   * Generate cache key for search query
   */
  private generateCacheKey(query: SearchProductsQueryDto): string {
    const keyParts = [
      'search',
      query.q || 'no-query',
      query.category?.sort().join(',') || 'no-category',
      query.brand?.sort().join(',') || 'no-brand',
      query.price_min || 'no-min-price',
      query.price_max || 'no-max-price',
      query.rating_min || 'no-min-rating',
      query.in_stock !== undefined
        ? query.in_stock.toString()
        : 'no-stock-filter',
      query.sort || SortOption.RELEVANCE,
      query.page || 1,
      query.limit || 20,
      query.facets ? 'with-facets' : 'no-facets',
    ];

    return keyParts.join(':');
  }

  /**
   * Track search analytics (async)
   */
  private async trackSearchAnalytics(
    query: SearchProductsQueryDto,
    response: SearchResponseDto,
  ): Promise<void> {
    try {
      // Don't track if analytics are disabled
      if (!this.configService.get<boolean>('ANALYTICS_ENABLED', true)) {
        return;
      }

      const analyticsDocument = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        query_text: query.q || '',
        user_id: query.user_id,
        session_id: query.session_id,
        results_count: response.hits.total.value,
        response_time: response.took,
        filters_applied: response.query_info.filters_applied,
        sort_applied: query.sort || SortOption.RELEVANCE,
        page: query.page || 1,
        limit: query.limit || 20,
        timestamp: new Date(),
        index_name: INDEX_CONFIGURATIONS.products.index,
        from_cache: response.from_cache,
      };

      await this.elasticsearchService.index({
        index: INDEX_CONFIGURATIONS.analytics.index,
        body: analyticsDocument,
      } as any);

      this.logger.debug('Search analytics tracked successfully');
    } catch (error) {
      this.logger.warn('Failed to track search analytics:', error.message);
    }
  }
}
