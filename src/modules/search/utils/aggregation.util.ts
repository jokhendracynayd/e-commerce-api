import {
  FacetConfig,
  PriceRangeConfig,
  CategoryFacetConfig,
  PriceRangeType,
  FacetType,
} from '../dto/facet.dto';

/**
 * Aggregation utility functions for building and managing Elasticsearch aggregations
 */
export class AggregationUtil {
  /**
   * Build a terms aggregation with advanced options
   */
  static buildTermsAggregation(
    field: string,
    options: {
      size?: number;
      minDocCount?: number;
      order?: string;
      include?: string;
      exclude?: string;
      missing?: string;
    } = {},
  ): any {
    const agg: any = {
      terms: {
        field,
        size: options.size || 10,
        min_doc_count: options.minDocCount || 1,
      },
    };

    if (options.order) {
      agg.terms.order = { [options.order]: 'desc' };
    }

    if (options.include) {
      agg.terms.include = options.include;
    }

    if (options.exclude) {
      agg.terms.exclude = options.exclude;
    }

    if (options.missing) {
      agg.terms.missing = options.missing;
    }

    return agg;
  }

  /**
   * Build a range aggregation with custom ranges
   */
  static buildRangeAggregation(
    field: string,
    ranges: Array<{
      key?: string;
      from?: number;
      to?: number;
    }>,
  ): any {
    return {
      range: {
        field,
        ranges: ranges.map((range) => ({
          key: range.key || `${range.from || 'min'}-${range.to || 'max'}`,
          from: range.from,
          to: range.to,
        })),
      },
    };
  }

  /**
   * Build a histogram aggregation for dynamic ranges
   */
  static buildHistogramAggregation(
    field: string,
    options: {
      interval: number;
      minDocCount?: number;
      extendedBounds?: { min: number; max: number };
      offset?: number;
    },
  ): any {
    const agg: any = {
      histogram: {
        field,
        interval: options.interval,
        min_doc_count: options.minDocCount || 1,
      },
    };

    if (options.extendedBounds) {
      agg.histogram.extended_bounds = options.extendedBounds;
    }

    if (options.offset !== undefined) {
      agg.histogram.offset = options.offset;
    }

    return agg;
  }

  /**
   * Build a date histogram aggregation
   */
  static buildDateHistogramAggregation(
    field: string,
    options: {
      calendarInterval?: string;
      fixedInterval?: string;
      timeZone?: string;
      minDocCount?: number;
      extendedBounds?: { min: string; max: string };
    },
  ): any {
    const agg: any = {
      date_histogram: {
        field,
        min_doc_count: options.minDocCount || 1,
      },
    };

    if (options.calendarInterval) {
      agg.date_histogram.calendar_interval = options.calendarInterval;
    } else if (options.fixedInterval) {
      agg.date_histogram.fixed_interval = options.fixedInterval;
    } else {
      agg.date_histogram.calendar_interval = '1d'; // default
    }

    if (options.timeZone) {
      agg.date_histogram.time_zone = options.timeZone;
    }

    if (options.extendedBounds) {
      agg.date_histogram.extended_bounds = options.extendedBounds;
    }

    return agg;
  }

  /**
   * Build a filters aggregation for named filters
   */
  static buildFiltersAggregation(filters: Record<string, any>): any {
    return {
      filters: {
        filters,
      },
    };
  }

  /**
   * Build a nested aggregation
   */
  static buildNestedAggregation(path: string, aggs: Record<string, any>): any {
    return {
      nested: {
        path,
      },
      aggs,
    };
  }

  /**
   * Build a reverse nested aggregation
   */
  static buildReverseNestedAggregation(aggs?: Record<string, any>): any {
    const agg: any = {
      reverse_nested: {},
    };

    if (aggs) {
      agg.aggs = aggs;
    }

    return agg;
  }

  /**
   * Build sub-aggregations for a facet
   */
  static buildFacetSubAggregations(config: FacetConfig): Record<string, any> {
    const subAggs: Record<string, any> = {};

    // Add statistics for numeric fields
    if (this.isNumericField(config.field)) {
      subAggs.stats = {
        stats: {
          field: config.field,
        },
      };
    }

    // Add top hits for detailed information
    subAggs.top_hits = {
      top_hits: {
        size: 1,
        _source: {
          includes: [config.field, 'id', 'title'],
        },
      },
    };

    return subAggs;
  }

  /**
   * Generate default price ranges based on min/max values
   */
  static generateDefaultPriceRanges(
    minPrice: number = 0,
    maxPrice: number = 1000,
  ): Array<{
    key: string;
    from?: number;
    to?: number;
  }> {
    const ranges: Array<{
      key: string;
      from?: number;
      to?: number;
    }> = [];
    const interval = Math.max(Math.floor((maxPrice - minPrice) / 7), 10);

    let current = minPrice;
    let rangeIndex = 1;

    while (current < maxPrice) {
      const next = current + interval;
      const isLast = next >= maxPrice;

      ranges.push({
        key: isLast ? `${current}+` : `${current}-${next}`,
        from: current,
        to: isLast ? undefined : next,
      });

      current = next;
      rangeIndex++;

      // Prevent infinite loops
      if (rangeIndex > 10) break;
    }

    return ranges;
  }

  /**
   * Generate category hierarchy query
   */
  static buildCategoryHierarchyAggregation(
    options: {
      maxDepth?: number;
      showPath?: boolean;
      parentCategory?: string;
    } = {},
  ): any {
    const agg: any = {
      nested: {
        path: 'category',
        aggs: {
          category_terms: {
            terms: {
              field: 'category.id',
              size: 100,
            },
            aggs: {
              category_names: {
                terms: {
                  field: 'category.name.keyword',
                  size: 1,
                },
              },
            },
          },
          category_paths: {
            terms: {
              field: 'category.path',
              size: options.maxDepth || 5,
            },
          },
        },
      },
    };

    if (options.showPath) {
      agg.nested.aggs.category_paths = {
        terms: {
          field: 'category.path',
          size: 100,
        },
      };
    }

    return agg;
  }

  /**
   * Build multi-level aggregation for hierarchical data
   */
  static buildMultiLevelAggregation(
    levels: Array<{
      field: string;
      name: string;
      size?: number;
    }>,
  ): any {
    if (levels.length === 0) {
      return {};
    }

    const buildLevel = (index: number): any => {
      const level = levels[index];
      const agg = {
        terms: {
          field: level.field,
          size: level.size || 10,
        },
      };

      if (index < levels.length - 1) {
        agg['aggs'] = {
          [levels[index + 1].name]: buildLevel(index + 1),
        };
      }

      return agg;
    };

    return {
      [levels[0].name]: buildLevel(0),
    };
  }

  /**
   * Build a percentiles aggregation
   */
  static buildPercentilesAggregation(
    field: string,
    percents: number[] = [25, 50, 75, 95],
  ): any {
    return {
      percentiles: {
        field,
        percents,
      },
    };
  }

  /**
   * Build a significant terms aggregation
   */
  static buildSignificantTermsAggregation(
    field: string,
    options: {
      size?: number;
      minDocCount?: number;
      shardMinDocCount?: number;
    } = {},
  ): any {
    return {
      significant_terms: {
        field,
        size: options.size || 10,
        min_doc_count: options.minDocCount || 3,
        shard_min_doc_count: options.shardMinDocCount || 1,
      },
    };
  }

  /**
   * Build a composite aggregation for pagination
   */
  static buildCompositeAggregation(
    sources: Array<{
      name: string;
      field: string;
      order?: 'asc' | 'desc';
    }>,
    size: number = 10,
    after?: any,
  ): any {
    const agg: any = {
      composite: {
        size,
        sources: sources.map((source) => ({
          [source.name]: {
            terms: {
              field: source.field,
              order: source.order || 'asc',
            },
          },
        })),
      },
    };

    if (after) {
      agg.composite.after = after;
    }

    return agg;
  }

  /**
   * Build aggregation filters for faceted search
   */
  static buildFacetFilters(appliedFilters: {
    categories?: string[];
    brands?: string[];
    priceRange?: { min?: number; max?: number };
    rating?: number;
    tags?: string[];
    custom?: Record<string, string[]>;
  }): Record<string, any> {
    const filters: Record<string, any> = {};

    // Category filters
    if (appliedFilters.categories?.length) {
      filters.categories = {
        bool: {
          must_not: {
            nested: {
              path: 'category',
              query: {
                terms: { 'category.id': appliedFilters.categories },
              },
            },
          },
        },
      };
    }

    // Brand filters
    if (appliedFilters.brands?.length) {
      filters.brands = {
        bool: {
          must_not: {
            terms: { 'brand.id': appliedFilters.brands },
          },
        },
      };
    }

    // Price range filters
    if (
      appliedFilters.priceRange?.min !== undefined ||
      appliedFilters.priceRange?.max !== undefined
    ) {
      const priceFilter: any = {};
      if (appliedFilters.priceRange.min !== undefined) {
        priceFilter.gte = appliedFilters.priceRange.min;
      }
      if (appliedFilters.priceRange.max !== undefined) {
        priceFilter.lte = appliedFilters.priceRange.max;
      }

      filters.price_ranges = {
        bool: {
          must_not: {
            range: { price: priceFilter },
          },
        },
      };
    }

    // Rating filters
    if (appliedFilters.rating !== undefined) {
      filters.ratings = {
        bool: {
          must_not: {
            range: { 'rating.average': { gte: appliedFilters.rating } },
          },
        },
      };
    }

    // Tag filters
    if (appliedFilters.tags?.length) {
      filters.tags = {
        bool: {
          must_not: {
            terms: { tags: appliedFilters.tags },
          },
        },
      };
    }

    // Custom filters
    if (appliedFilters.custom) {
      Object.entries(appliedFilters.custom).forEach(([field, values]) => {
        if (values.length) {
          filters[`custom_${field}`] = {
            bool: {
              must_not: {
                terms: { [field]: values },
              },
            },
          };
        }
      });
    }

    return filters;
  }

  /**
   * Utility methods
   */

  private static isNumericField(field: string): boolean {
    const numericFields = [
      'price',
      'discount_price',
      'stock_quantity',
      'rating.average',
      'rating.count',
      'popularity_score',
      'conversion_rate',
      'views_count',
      'sales_count',
    ];
    return numericFields.some((numField) => field.includes(numField));
  }

  /**
   * Get field type for aggregation optimization
   */
  static getFieldType(
    field: string,
  ): 'keyword' | 'text' | 'numeric' | 'date' | 'boolean' {
    if (
      field.endsWith('.keyword') ||
      field.includes('id') ||
      field.includes('slug')
    ) {
      return 'keyword';
    }

    if (
      field.includes('date') ||
      field.includes('time') ||
      field.includes('created') ||
      field.includes('updated')
    ) {
      return 'date';
    }

    if (this.isNumericField(field)) {
      return 'numeric';
    }

    if (
      field.includes('active') ||
      field.includes('featured') ||
      field.includes('stock')
    ) {
      return 'boolean';
    }

    return 'text';
  }

  /**
   * Optimize aggregation based on field type and data volume
   */
  static optimizeAggregation(
    agg: any,
    field: string,
    expectedCardinality: number,
  ): any {
    const fieldType = this.getFieldType(field);
    const optimized = { ...agg };

    // Adjust size based on cardinality
    if (expectedCardinality > 1000 && optimized.terms) {
      optimized.terms.size = Math.min(optimized.terms.size || 10, 50);
      optimized.terms.shard_size = (optimized.terms.size || 10) * 2;
    }

    // Add execution hint for high cardinality fields
    if (fieldType === 'keyword' && expectedCardinality > 100) {
      optimized.terms.execution_hint = 'map';
    }

    // Add collect mode for large datasets
    if (expectedCardinality > 10000) {
      optimized.terms.collect_mode = 'breadth_first';
    }

    return optimized;
  }

  /**
   * Calculate aggregation memory usage estimate
   */
  static estimateMemoryUsage(
    agg: any,
    docCount: number,
  ): {
    estimatedBytes: number;
    warning?: string;
  } {
    let bytes = 0;
    let warning: string | undefined;

    if (agg.terms) {
      const size = agg.terms.size || 10;
      const shardSize = agg.terms.shard_size || size;

      // Rough estimate: 100 bytes per term * size * number of shards (assume 3)
      bytes = size * shardSize * 100 * 3;

      if (bytes > 10 * 1024 * 1024) {
        // 10MB
        warning =
          'High memory usage expected. Consider reducing aggregation size.';
      }
    }

    if (agg.date_histogram) {
      // Estimate based on time range and interval
      bytes = 1000 * 365; // Rough estimate for daily intervals over a year
    }

    return { estimatedBytes: bytes, warning };
  }
}
