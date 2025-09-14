import {
  SearchProductsQueryDto,
  QueryType,
  SearchMode,
} from '../dto/search-query.dto';
import { SEARCH_FIELDS } from '../constants/indices.constants';

export interface QueryBuilderOptions {
  enableFunctionScore?: boolean;
  enableBoosting?: boolean;
  enableSynonyms?: boolean;
}

export class QueryBuilder {
  private readonly defaultBoosts = {
    title: SEARCH_FIELDS.BOOST_VALUES.TITLE,
    description: SEARCH_FIELDS.BOOST_VALUES.DESCRIPTION,
    brand: SEARCH_FIELDS.BOOST_VALUES.BRAND,
    category: SEARCH_FIELDS.BOOST_VALUES.CATEGORY,
    keywords: SEARCH_FIELDS.BOOST_VALUES.KEYWORDS,
  };

  /**
   * Build the main search query based on query type and parameters
   */
  buildSearchQuery(
    query: SearchProductsQueryDto,
    options: QueryBuilderOptions = {},
  ): any {
    if (!query.q) {
      return { match_all: {} };
    }

    const queryType = query.query_type || QueryType.MULTI_MATCH;
    const searchMode = query.search_mode || SearchMode.STANDARD;

    let baseQuery: any;

    switch (queryType) {
      case QueryType.PHRASE:
        baseQuery = this.buildPhraseQuery(query);
        break;
      case QueryType.PREFIX:
        baseQuery = this.buildPrefixQuery(query);
        break;
      case QueryType.FUZZY:
        baseQuery = this.buildFuzzyQuery(query);
        break;
      case QueryType.WILDCARD:
        baseQuery = this.buildWildcardQuery(query);
        break;
      case QueryType.BOOLEAN:
        baseQuery = this.buildBooleanQuery(query);
        break;
      case QueryType.MULTI_MATCH:
      default:
        baseQuery = this.buildMultiMatchQuery(query, searchMode);
        break;
    }

    // Apply function score if enabled
    if (
      query.function_score !== false &&
      options.enableFunctionScore !== false
    ) {
      return this.buildFunctionScoreQuery(baseQuery, query);
    }

    return baseQuery;
  }

  /**
   * Build multi-match query with field boosting and advanced options
   */
  buildMultiMatchQuery(
    query: SearchProductsQueryDto,
    searchMode: SearchMode,
  ): any {
    const boosts = this.mergeBoosts(this.defaultBoosts, query.field_boosts);
    const fields = this.buildFieldsArray(boosts);

    const baseMultiMatch = {
      multi_match: {
        query: query.q,
        fields,
        type: this.getMultiMatchType(searchMode),
        operator: this.getOperator(searchMode),
        minimum_should_match: this.getMinimumShouldMatch(query, searchMode),
      } as any,
    };

    // Add fuzziness if enabled
    if (query.fuzzy !== false) {
      baseMultiMatch.multi_match.fuzziness = query.fuzziness || 'AUTO';
      baseMultiMatch.multi_match.prefix_length = 2;
      baseMultiMatch.multi_match.max_expansions = 50;
    }

    // For standard mode, combine multiple query types
    if (searchMode === SearchMode.STANDARD) {
      return {
        bool: {
          should: [
            // Main multi-match query
            baseMultiMatch,
            // Exact phrase match with higher boost
            {
              multi_match: {
                query: query.q,
                fields: [
                  `${SEARCH_FIELDS.PRODUCTS.TITLE}^${boosts.title * 2}`,
                  `${SEARCH_FIELDS.PRODUCTS.KEYWORDS}^${boosts.keywords * 1.5}`,
                ],
                type: 'phrase',
                boost: 2,
              },
            },
          ],
          minimum_should_match: 1,
        },
      };
    }

    return baseMultiMatch;
  }

  /**
   * Build phrase query for exact phrase matching
   */
  buildPhraseQuery(query: SearchProductsQueryDto): any {
    const boosts = this.mergeBoosts(this.defaultBoosts, query.field_boosts);
    const fields = this.buildFieldsArray(boosts);

    const phraseQuery = {
      multi_match: {
        query: query.q,
        fields,
        type: 'phrase',
      } as any,
    };

    // Add proximity for phrase slop
    if (query.proximity !== undefined && query.proximity > 0) {
      phraseQuery.multi_match.slop = query.proximity;
    }

    return phraseQuery;
  }

  /**
   * Build prefix query for autocomplete-style searches
   */
  buildPrefixQuery(query: SearchProductsQueryDto): any {
    const boosts = this.mergeBoosts(this.defaultBoosts, query.field_boosts);

    return {
      bool: {
        should: [
          // Prefix on title
          {
            prefix: {
              [`${SEARCH_FIELDS.PRODUCTS.TITLE}.keyword`]: {
                value: query.q,
                boost: boosts.title,
              },
            },
          },
          // Prefix on brand
          {
            prefix: {
              [`${SEARCH_FIELDS.PRODUCTS.BRAND}.keyword`]: {
                value: query.q,
                boost: boosts.brand,
              },
            },
          },
          // Multi-match prefix for better coverage (text fields only)
          {
            multi_match: {
              query: query.q,
              fields: [
                `${SEARCH_FIELDS.PRODUCTS.TITLE}^${boosts.title}`,
                `${SEARCH_FIELDS.PRODUCTS.DESCRIPTION}^${boosts.description}`,
                `${SEARCH_FIELDS.PRODUCTS.KEYWORDS}^${boosts.keywords}`,
              ],
              type: 'phrase_prefix',
            },
          },
        ],
        minimum_should_match: 1,
      },
    };
  }

  /**
   * Build fuzzy query for typo tolerance
   */
  buildFuzzyQuery(query: SearchProductsQueryDto): any {
    const boosts = this.mergeBoosts(this.defaultBoosts, query.field_boosts);
    const fuzziness = query.fuzziness || 'AUTO';

    return {
      bool: {
        should: [
          // Fuzzy match on title
          {
            match: {
              [SEARCH_FIELDS.PRODUCTS.TITLE]: {
                query: query.q,
                fuzziness,
                boost: boosts.title,
                prefix_length: 1,
                max_expansions: 50,
              },
            },
          },
          // Fuzzy match on description
          {
            match: {
              [SEARCH_FIELDS.PRODUCTS.DESCRIPTION]: {
                query: query.q,
                fuzziness,
                boost: boosts.description,
                prefix_length: 1,
                max_expansions: 50,
              },
            },
          },
          // Fuzzy match on keywords
          {
            match: {
              [SEARCH_FIELDS.PRODUCTS.KEYWORDS]: {
                query: query.q,
                fuzziness,
                boost: boosts.keywords,
                prefix_length: 1,
                max_expansions: 50,
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    };
  }

  /**
   * Build wildcard query for pattern matching
   */
  buildWildcardQuery(query: SearchProductsQueryDto): any {
    const wildcardQuery =
      query.q?.includes('*') || query.q?.includes('?')
        ? query.q
        : `*${query.q}*`;

    const boosts = this.mergeBoosts(this.defaultBoosts, query.field_boosts);

    return {
      bool: {
        should: [
          {
            wildcard: {
              [`${SEARCH_FIELDS.PRODUCTS.TITLE}.keyword`]: {
                value: wildcardQuery,
                boost: boosts.title,
              },
            },
          },
          {
            wildcard: {
              [`${SEARCH_FIELDS.PRODUCTS.KEYWORDS}.keyword`]: {
                value: wildcardQuery,
                boost: boosts.keywords,
              },
            },
          },
          {
            wildcard: {
              [`${SEARCH_FIELDS.PRODUCTS.BRAND}.keyword`]: {
                value: wildcardQuery,
                boost: boosts.brand,
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    };
  }

  /**
   * Build boolean query for advanced operators
   */
  buildBooleanQuery(query: SearchProductsQueryDto): any {
    const booleanQuery = query.boolean_query || query.q || '';

    // Parse boolean operators
    const mustTerms: string[] = [];
    const mustNotTerms: string[] = [];
    const shouldTerms: string[] = [];

    // Simple parser for +term, -term, term
    const terms = booleanQuery.split(/\s+/);

    for (const term of terms) {
      if (term.startsWith('+')) {
        mustTerms.push(term.substring(1));
      } else if (term.startsWith('-')) {
        mustNotTerms.push(term.substring(1));
      } else if (term.trim()) {
        shouldTerms.push(term);
      }
    }

    const boosts = this.mergeBoosts(this.defaultBoosts, query.field_boosts);
    const fields = this.buildFieldsArray(boosts);

    const boolQuery: any = {
      bool: {
        must: [],
        must_not: [],
        should: [],
      },
    };

    // Add must terms
    mustTerms.forEach((term) => {
      boolQuery.bool.must.push({
        multi_match: {
          query: term,
          fields,
          operator: 'and',
        },
      });
    });

    // Add must not terms
    mustNotTerms.forEach((term) => {
      boolQuery.bool.must_not.push({
        multi_match: {
          query: term,
          fields,
        },
      });
    });

    // Add should terms
    shouldTerms.forEach((term) => {
      boolQuery.bool.should.push({
        multi_match: {
          query: term,
          fields,
          fuzziness: query.fuzzy !== false ? 'AUTO' : undefined,
        },
      });
    });

    // Set minimum should match
    if (boolQuery.bool.should.length > 0 && boolQuery.bool.must.length === 0) {
      boolQuery.bool.minimum_should_match = 1;
    }

    return boolQuery;
  }

  /**
   * Build function score query for custom relevance scoring
   */
  buildFunctionScoreQuery(baseQuery: any, query: SearchProductsQueryDto): any {
    const scoreFactors = query.score_factors || {};

    const defaultFactors = {
      popularity: 1.2,
      rating: 1.1,
      featured: 1.5,
      recency: 1.0,
      stock: 1.1,
    };

    const factors = { ...defaultFactors, ...scoreFactors };

    return {
      function_score: {
        query: baseQuery,
        functions: [
          // Featured products boost
          {
            filter: { term: { is_featured: true } },
            weight: factors.featured,
          },
          // Popularity score boost
          {
            field_value_factor: {
              field: 'popularity_score',
              factor: factors.popularity,
              modifier: 'log1p',
              missing: 1,
            },
          },
          // Rating boost
          {
            field_value_factor: {
              field: 'rating.average',
              factor: factors.rating,
              modifier: 'none',
              missing: 3,
            },
          },
          // Review count boost (social proof)
          {
            field_value_factor: {
              field: 'rating.count',
              factor: 0.1,
              modifier: 'log1p',
              missing: 0,
            },
          },
          // Recency boost for newer products
          {
            gauss: {
              created_at: {
                origin: 'now',
                scale: '30d',
                offset: '7d',
                decay: 0.5,
              },
            },
            weight: factors.recency,
          },
          // Stock availability boost
          {
            filter: { term: { in_stock: true } },
            weight: factors.stock,
          },
        ],
        score_mode: 'multiply',
        boost_mode: 'multiply',
        max_boost: 10,
        min_score: 0.1,
      },
    };
  }

  /**
   * Merge default boosts with custom field boosts
   */
  private mergeBoosts(
    defaultBoosts: Record<string, number>,
    customBoosts?: Record<string, number>,
  ): Record<string, number> {
    return { ...defaultBoosts, ...customBoosts };
  }

  /**
   * Build fields array with boost values
   */
  private buildFieldsArray(boosts: Record<string, number>): string[] {
    return [
      `${SEARCH_FIELDS.PRODUCTS.TITLE}^${boosts.title}`,
      `${SEARCH_FIELDS.PRODUCTS.DESCRIPTION}^${boosts.description}`,
      `${SEARCH_FIELDS.PRODUCTS.BRAND}^${boosts.brand}`,
      `${SEARCH_FIELDS.PRODUCTS.CATEGORY}^${boosts.category}`,
      `${SEARCH_FIELDS.PRODUCTS.KEYWORDS}^${boosts.keywords}`,
    ];
  }

  /**
   * Get multi-match type based on search mode
   */
  private getMultiMatchType(searchMode: SearchMode): string {
    switch (searchMode) {
      case SearchMode.STRICT:
        return 'most_fields';
      case SearchMode.RELAXED:
        return 'best_fields';
      case SearchMode.STANDARD:
      default:
        return 'best_fields';
    }
  }

  /**
   * Get operator based on search mode
   */
  private getOperator(searchMode: SearchMode): string {
    switch (searchMode) {
      case SearchMode.STRICT:
        return 'and';
      case SearchMode.RELAXED:
        return 'or';
      case SearchMode.STANDARD:
      default:
        return 'and';
    }
  }

  /**
   * Get minimum should match based on query and search mode
   */
  private getMinimumShouldMatch(
    query: SearchProductsQueryDto,
    searchMode: SearchMode,
  ): string {
    if (query.minimum_should_match !== undefined) {
      return `${query.minimum_should_match}%`;
    }

    switch (searchMode) {
      case SearchMode.STRICT:
        return '100%';
      case SearchMode.RELAXED:
        return '50%';
      case SearchMode.STANDARD:
      default:
        return '75%';
    }
  }
}
