import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma.service';
import {
  FacetOptionsDto,
  FacetConfig,
  PriceRangeConfig,
  CategoryFacetConfig,
  PriceRangeType,
  FacetType,
  AdvancedSearchFacets,
  HierarchicalFacetBucket,
  ExtendedFacetBucket,
  RatingFacetBucket,
  PriceRangeFacet,
} from '../dto/facet.dto';
import { SearchProductsQueryDto } from '../dto/search-query.dto';

@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Build comprehensive aggregations for faceted search
   */
  buildAggregations(
    query: SearchProductsQueryDto,
    facetOptions?: FacetOptionsDto,
  ): Record<string, any> {
    const aggregations: Record<string, any> = {};

    // Use provided facet options or defaults from query
    const options = facetOptions || this.getDefaultFacetOptions(query);

    // Category facets with hierarchy - temporarily disabled due to aggregation issues
    // if (options.categories) {
    //   aggregations.categories = this.buildCategoryAggregation(
    //     options.category_config,
    //   );
    // }

    // Brand facets
    if (options.brands) {
      aggregations.brands = this.buildBrandAggregation(options.brand_size);
    }

    // Price range facets
    if (options.price_ranges) {
      aggregations.price_ranges = this.buildPriceRangeAggregation(
        options.price_config,
      );
    }

    // Rating facets
    if (options.ratings) {
      aggregations.ratings = this.buildRatingAggregation();
    }

    // Tag facets
    if (options.tags) {
      aggregations.tags = this.buildTagAggregation(options.tag_size);
    }

    // Availability facets
    if (options.availability) {
      aggregations.availability = this.buildAvailabilityAggregation();
    }

    // Custom facets
    if (options.custom_facets) {
      Object.entries(options.custom_facets).forEach(([name, config]) => {
        aggregations[`custom_${name}`] = this.buildCustomAggregation(config);
      });
    }

    // Add global aggregations for unfiltered counts if needed
    if (!options.filtered_facets) {
      aggregations.global_facets = {
        global: {},
        aggs: {
          // all_categories: this.buildCategoryAggregation(
          //   options.category_config,
          // ),
          all_brands: this.buildBrandAggregation(options.brand_size),
          all_ratings: this.buildRatingAggregation(),
        },
      };
    }

    this.logger.debug(
      `Built aggregations: ${JSON.stringify(aggregations, null, 2)}`,
    );
    return aggregations;
  }

  /**
   * Build category aggregation with hierarchy support
   */
  private buildCategoryAggregation(config?: CategoryFacetConfig): any {
    const categoryAgg: any = {
      nested: {
        path: 'category',
        aggs: {
          category_terms: {
            terms: {
              field: 'category.id',
              size: 50,
              order: { _count: 'desc' },
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
        },
      },
    };

    // Add hierarchy support if configured
    if (config?.include_hierarchy) {
      categoryAgg.nested.aggs.category_terms.aggs.hierarchy = {
        terms: {
          field: 'category.path',
          size: 100,
        },
      };

      // Add parent category filter if specified
      if (config.parent_category) {
        categoryAgg.nested.query = {
          prefix: {
            'category.path': config.parent_category,
          },
        };
      }
    }

    return categoryAgg;
  }

  /**
   * Build brand aggregation
   */
  private buildBrandAggregation(size = 20): any {
    return {
      terms: {
        field: 'brand.id',
        size,
        order: { _count: 'desc' },
      },
      aggs: {
        brand_names: {
          terms: {
            field: 'brand.name.keyword',
            size: 1,
          },
        },
        brand_popularity: {
          avg: {
            field: 'popularity_score',
          },
        },
      },
    };
  }

  /**
   * Build price range aggregation
   */
  private buildPriceRangeAggregation(config?: PriceRangeConfig): any {
    if (!config || config.type === PriceRangeType.FIXED) {
      const ranges = config?.ranges || this.getDefaultPriceRanges();
      return {
        range: {
          field: 'price',
          ranges: ranges.map((range) => ({
            key: range.key || `${range.from || 0}-${range.to || 'above'}`,
            from: range.from,
            to: range.to,
          })),
        },
      };
    } else if (config.type === PriceRangeType.DYNAMIC) {
      return {
        histogram: {
          field: 'price',
          interval: config.interval || 50,
          min_doc_count: 1,
          extended_bounds: config.extended_bounds,
        },
      };
    } else if (config.type === PriceRangeType.PERCENTILE) {
      return {
        percentiles: {
          field: 'price',
          percents: [25, 50, 75, 95],
        },
        aggs: {
          price_stats: {
            stats: {
              field: 'price',
            },
          },
        },
      };
    }

    return this.buildPriceRangeAggregation({ type: PriceRangeType.FIXED });
  }

  /**
   * Build rating aggregation
   */
  private buildRatingAggregation(): any {
    return {
      range: {
        field: 'rating.average',
        ranges: [
          { key: '5-stars', from: 4.5, to: 5.1 },
          { key: '4-stars', from: 4.0, to: 4.5 },
          { key: '3-stars', from: 3.0, to: 4.0 },
          { key: '2-stars', from: 2.0, to: 3.0 },
          { key: '1-star', from: 1.0, to: 2.0 },
        ],
      },
      aggs: {
        rating_stats: {
          stats: {
            field: 'rating.average',
          },
        },
      },
    };
  }

  /**
   * Build tag aggregation
   */
  private buildTagAggregation(size = 15): any {
    return {
      terms: {
        field: 'tags',
        size,
        order: { _count: 'desc' },
        min_doc_count: 2,
      },
    };
  }

  /**
   * Build availability aggregation
   */
  private buildAvailabilityAggregation(): any {
    return {
      filters: {
        filters: {
          in_stock: { term: { in_stock: true } },
          out_of_stock: { term: { in_stock: false } },
          low_stock: { range: { stock_quantity: { gte: 1, lte: 10 } } },
          high_stock: { range: { stock_quantity: { gt: 10 } } },
        },
      },
    };
  }

  /**
   * Build custom aggregation based on configuration
   */
  private buildCustomAggregation(config: FacetConfig): any {
    const baseAgg: any = {
      [config.type]: {
        field: config.field,
        size: config.size || 10,
        min_doc_count: config.min_doc_count || 1,
      },
    };

    if (config.order) {
      baseAgg[config.type].order = { [config.order]: 'desc' };
    }

    if (config.include) {
      baseAgg[config.type].include = config.include;
    }

    if (config.exclude) {
      baseAgg[config.type].exclude = config.exclude;
    }

    return baseAgg;
  }

  /**
   * Transform Elasticsearch aggregation response to structured facets
   */
  async transformAggregations(
    aggregations: any,
    query: SearchProductsQueryDto,
    facetOptions?: FacetOptionsDto,
  ): Promise<AdvancedSearchFacets> {
    if (!aggregations) {
      return {};
    }

    const result: AdvancedSearchFacets = {};
    const totalProducts = aggregations.global_facets?.doc_count || 0;

    // Transform category facets
    if (aggregations.categories) {
      result.categories = await this.transformCategoryFacets(
        aggregations.categories,
        query.category,
        facetOptions?.category_config,
      );
    }

    // Transform brand facets
    if (aggregations.brands) {
      result.brands = await this.transformBrandFacets(
        aggregations.brands,
        query.brand,
      );
    }

    // Transform price range facets
    if (aggregations.price_ranges) {
      result.price_ranges = this.transformPriceRangeFacets(
        aggregations.price_ranges,
        query.price_min,
        query.price_max,
      );
    }

    // Transform rating facets
    if (aggregations.ratings) {
      result.ratings = this.transformRatingFacets(
        aggregations.ratings,
        query.rating_min,
      );
    }

    // Transform tag facets
    if (aggregations.tags) {
      result.tags = this.transformTagFacets(aggregations.tags);
    }

    // Transform availability facets
    if (aggregations.availability) {
      result.availability = this.transformAvailabilityFacets(
        aggregations.availability,
        query.in_stock,
      );
    }

    // Transform custom facets
    result.custom = {};
    Object.keys(aggregations).forEach((key) => {
      if (key.startsWith('custom_')) {
        const facetName = key.replace('custom_', '');
        result.custom![facetName] = this.transformGenericFacets(
          aggregations[key],
        );
      }
    });

    // Add metadata
    result.total_products = totalProducts;
    result.applied_filters = this.buildAppliedFilters(query);

    return result;
  }

  /**
   * Transform category facets with hierarchy
   */
  private async transformCategoryFacets(
    categoryAgg: any,
    selectedCategories?: string[],
    config?: CategoryFacetConfig,
  ): Promise<HierarchicalFacetBucket[]> {
    const buckets: HierarchicalFacetBucket[] = [];

    if (!categoryAgg.buckets) {
      return buckets;
    }

    // Fetch category details from database for enrichment
    const categoryIds = categoryAgg.buckets.map((bucket: any) => bucket.key);
    const categories = await this.prismaService.category.findMany({
      where: { id: { in: categoryIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
      },
    });

    const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));

    for (const bucket of categoryAgg.buckets) {
      const category = categoryMap.get(bucket.key);
      const isSelected = selectedCategories?.includes(bucket.key) || false;

      const facetBucket: HierarchicalFacetBucket = {
        key: bucket.key,
        doc_count: bucket.doc_count,
        name: category?.name || bucket.key,
        selected: isSelected,
        level: 0, // Default level - would need to be calculated or stored in DB
        path: bucket.key, // Default path - would need proper hierarchy implementation
        parent: category?.parentId || undefined,
      };

      // Add hierarchy information if available
      if (config?.include_hierarchy && bucket.hierarchy) {
        facetBucket.children = await this.buildCategoryHierarchy(
          bucket.hierarchy,
          categoryMap,
          selectedCategories,
        );
      }

      buckets.push(facetBucket);
    }

    return buckets.sort((a, b) => b.doc_count - a.doc_count);
  }

  /**
   * Transform brand facets
   */
  private async transformBrandFacets(
    brandAgg: any,
    selectedBrands?: string[],
  ): Promise<ExtendedFacetBucket[]> {
    const buckets: ExtendedFacetBucket[] = [];

    if (!brandAgg.buckets) {
      return buckets;
    }

    // Fetch brand details from database
    const brandIds = brandAgg.buckets.map((bucket: any) => bucket.key);
    const brands = await this.prismaService.brand.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, name: true, logo: true },
    });

    const brandMap = new Map(brands.map((brand) => [brand.id, brand]));

    for (const bucket of brandAgg.buckets) {
      const brand = brandMap.get(bucket.key);
      const isSelected = selectedBrands?.includes(bucket.key) || false;

      buckets.push({
        key: bucket.key,
        doc_count: bucket.doc_count,
        name: brand?.name || bucket.key,
        selected: isSelected,
        data: {
          logo: brand?.logo,
          popularity: bucket.brand_popularity?.value,
        },
      });
    }

    return buckets;
  }

  /**
   * Transform price range facets
   */
  private transformPriceRangeFacets(
    priceAgg: any,
    minPrice?: number,
    maxPrice?: number,
  ): PriceRangeFacet[] {
    const buckets: PriceRangeFacet[] = [];

    if (!priceAgg.buckets) {
      return buckets;
    }

    for (const bucket of priceAgg.buckets) {
      const isSelected = this.isPriceRangeSelected(bucket, minPrice, maxPrice);

      buckets.push({
        key: bucket.key,
        from: bucket.from,
        to: bucket.to,
        doc_count: bucket.doc_count,
        selected: isSelected,
        label: this.generatePriceRangeLabel(bucket.from, bucket.to),
      });
    }

    return buckets;
  }

  /**
   * Transform rating facets
   */
  private transformRatingFacets(
    ratingAgg: any,
    selectedRating?: number,
  ): RatingFacetBucket[] {
    const buckets: RatingFacetBucket[] = [];

    if (!ratingAgg.buckets) {
      return buckets;
    }

    const ratingLabels = {
      '5-stars': '5 Stars',
      '4-stars': '4 Stars & Up',
      '3-stars': '3 Stars & Up',
      '2-stars': '2 Stars & Up',
      '1-star': '1 Star & Up',
    };

    for (const bucket of ratingAgg.buckets) {
      const ratingValue = this.extractRatingValue(bucket.key);
      const isSelected =
        selectedRating !== undefined && selectedRating >= ratingValue;

      buckets.push({
        key: ratingValue,
        doc_count: bucket.doc_count,
        label: ratingLabels[bucket.key] || `${ratingValue} Stars`,
        selected: isSelected,
      });
    }

    return buckets.sort((a, b) => b.key - a.key);
  }

  /**
   * Transform tag facets
   */
  private transformTagFacets(tagAgg: any): ExtendedFacetBucket[] {
    const buckets: ExtendedFacetBucket[] = [];

    if (!tagAgg.buckets) {
      return buckets;
    }

    for (const bucket of tagAgg.buckets) {
      buckets.push({
        key: bucket.key,
        doc_count: bucket.doc_count,
        name: bucket.key,
        selected: false, // Tags selection would need to be tracked separately
      });
    }

    return buckets;
  }

  /**
   * Transform availability facets
   */
  private transformAvailabilityFacets(
    availabilityAgg: any,
    selectedInStock?: boolean,
  ): ExtendedFacetBucket[] {
    const buckets: ExtendedFacetBucket[] = [];

    if (!availabilityAgg.buckets) {
      return buckets;
    }

    const availabilityLabels = {
      in_stock: 'In Stock',
      out_of_stock: 'Out of Stock',
      low_stock: 'Low Stock (1-10)',
      high_stock: 'High Stock (10+)',
    };

    Object.entries(availabilityAgg.buckets).forEach(
      ([key, bucket]: [string, any]) => {
        const isSelected = this.isAvailabilitySelected(key, selectedInStock);

        buckets.push({
          key,
          doc_count: bucket.doc_count,
          name: availabilityLabels[key] || key,
          selected: isSelected,
        });
      },
    );

    return buckets;
  }

  /**
   * Transform generic facets for custom aggregations
   */
  private transformGenericFacets(aggregation: any): ExtendedFacetBucket[] {
    const buckets: ExtendedFacetBucket[] = [];

    if (!aggregation.buckets) {
      return buckets;
    }

    for (const bucket of aggregation.buckets) {
      buckets.push({
        key: bucket.key,
        doc_count: bucket.doc_count,
        name: bucket.key,
        selected: false,
      });
    }

    return buckets;
  }

  // Helper methods

  private getDefaultFacetOptions(
    query: SearchProductsQueryDto,
  ): FacetOptionsDto {
    return {
      categories: true,
      brands: true,
      price_ranges: true,
      ratings: true,
      tags: false,
      availability: true,
      min_doc_count: 1,
      filtered_facets: false,
    };
  }

  private getDefaultPriceRanges() {
    return [
      { from: 0, to: 25, key: 'under-25' },
      { from: 25, to: 50, key: '25-50' },
      { from: 50, to: 100, key: '50-100' },
      { from: 100, to: 250, key: '100-250' },
      { from: 250, to: 500, key: '250-500' },
      { from: 500, to: 1000, key: '500-1000' },
      { from: 1000, key: 'over-1000' },
    ];
  }

  private async buildCategoryHierarchy(
    hierarchyAgg: any,
    categoryMap: Map<string, any>,
    selectedCategories?: string[],
  ): Promise<HierarchicalFacetBucket[]> {
    // Implementation for building category hierarchy
    // This would involve recursively building the tree structure
    return [];
  }

  private isPriceRangeSelected(
    bucket: any,
    minPrice?: number,
    maxPrice?: number,
  ): boolean {
    if (minPrice === undefined && maxPrice === undefined) {
      return false;
    }

    const bucketMin = bucket.from || 0;
    const bucketMax = bucket.to || Number.MAX_VALUE;

    return (
      (minPrice === undefined || minPrice <= bucketMax) &&
      (maxPrice === undefined || maxPrice >= bucketMin)
    );
  }

  private generatePriceRangeLabel(from: number, to?: number): string {
    if (to === undefined) {
      return `$${from}+`;
    }
    return `$${from} - $${to}`;
  }

  private extractRatingValue(key: string): number {
    const match = key.match(/(\d+)-star/);
    return match ? parseInt(match[1]) : 0;
  }

  private isAvailabilitySelected(
    key: string,
    selectedInStock?: boolean,
  ): boolean {
    if (selectedInStock === undefined) {
      return false;
    }

    if (
      selectedInStock &&
      (key === 'in_stock' || key === 'low_stock' || key === 'high_stock')
    ) {
      return true;
    }

    if (!selectedInStock && key === 'out_of_stock') {
      return true;
    }

    return false;
  }

  private buildAppliedFilters(query: SearchProductsQueryDto) {
    return {
      categories: query.category || [],
      brands: query.brand || [],
      price_range: {
        min: query.price_min,
        max: query.price_max,
      },
      rating: query.rating_min,
      tags: [], // Would need to be tracked separately
      custom: {},
    };
  }
}
