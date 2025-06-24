import {
  Controller,
  Get,
  Query,
  ValidationPipe,
  UsePipes,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from '../services/search.service';
import { AggregationService } from '../services/aggregation.service';
import { SearchProductsQueryDto } from '../dto/search-query.dto';
import {
  FacetOptionsDto,
  AdvancedSearchFacets,
  CategoryFacetConfig,
  PriceRangeConfig,
  PriceRangeType,
} from '../dto/facet.dto';
@ApiTags('Search Facets')
@Controller('search/facets')
export class FacetsController {
  private readonly logger = new Logger(FacetsController.name);

  constructor(
    private readonly searchService: SearchService,
    private readonly aggregationService: AggregationService,
  ) {}

  @Get('/')
  @ApiOperation({
    summary: 'Get search facets',
    description:
      'Retrieve facets for search filtering with advanced configuration options',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search facets retrieved successfully',
    type: AdvancedSearchFacets,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid search parameters',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search query to get facets for',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Category filter for facets',
  })
  @ApiQuery({
    name: 'brand',
    required: false,
    description: 'Brand filter for facets',
  })
  @ApiQuery({
    name: 'price_min',
    required: false,
    description: 'Minimum price for facets',
  })
  @ApiQuery({
    name: 'price_max',
    required: false,
    description: 'Maximum price for facets',
  })
  @ApiQuery({
    name: 'include_hierarchy',
    required: false,
    description: 'Include category hierarchy',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getFacets(
    @Query() searchQuery: SearchProductsQueryDto,
    @Query('include_hierarchy') includeHierarchy?: boolean,
    @Query('price_range_type') priceRangeType?: PriceRangeType,
    @Query('facet_size') facetSize?: number,
  ): Promise<AdvancedSearchFacets> {
    try {
      this.logger.debug(
        `Getting facets for query: ${JSON.stringify(searchQuery)}`,
      );

      // Build facet options
      const facetOptions: FacetOptionsDto = {
        categories: true,
        brands: true,
        price_ranges: true,
        ratings: true,
        tags: false,
        availability: true,
        brand_size: facetSize || 20,
        min_doc_count: 1,
        filtered_facets: false,
        category_config: {
          include_hierarchy: includeHierarchy || false,
          max_depth: 3,
          show_path: true,
        },
        price_config: {
          type: priceRangeType || PriceRangeType.FIXED,
        },
      };

      // Force facets to be enabled
      searchQuery.facets = true;
      searchQuery.facet_options = facetOptions;

      // Get search results with facets
      const searchResults =
        await this.searchService.searchProducts(searchQuery);

      // Extract and transform facets using aggregation service
      if (searchResults.facets) {
        // Since we already have SearchFacets, we need to get the raw aggregations
        // For now, return a placeholder - this would need access to raw aggregations
        return {
          categories: [],
          brands: [],
          price_ranges: [],
          ratings: [],
          tags: [],
          availability: [],
          custom: {},
          total_products: searchResults.hits.total.value,
          applied_filters: {
            categories: searchQuery.category || [],
            brands: searchQuery.brand || [],
            price_range: {
              min: searchQuery.price_min,
              max: searchQuery.price_max,
            },
            rating: searchQuery.rating_min,
            tags: [],
            custom: {},
          },
        };
      }

      return {
        categories: [],
        brands: [],
        price_ranges: [],
        ratings: [],
        tags: [],
        availability: [],
        custom: {},
        total_products: 0,
        applied_filters: {
          categories: [],
          brands: [],
          price_range: {},
          tags: [],
          custom: {},
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get facets: ${error.message}`, error.stack);
      throw new BadRequestException(
        `Failed to retrieve facets: ${error.message}`,
      );
    }
  }

  @Get('/categories')
  @ApiOperation({
    summary: 'Get category facets with hierarchy',
    description: 'Retrieve hierarchical category facets for navigation',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category facets retrieved successfully',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search query to filter categories',
  })
  @ApiQuery({
    name: 'parent_category',
    required: false,
    description: 'Parent category to filter by',
  })
  @ApiQuery({
    name: 'max_depth',
    required: false,
    description: 'Maximum hierarchy depth',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getCategoryFacets(
    @Query() searchQuery: SearchProductsQueryDto,
    @Query('parent_category') parentCategory?: string,
    @Query('max_depth') maxDepth?: number,
  ) {
    try {
      this.logger.debug(
        `Getting category facets for query: ${JSON.stringify(searchQuery)}`,
      );

      const categoryConfig: CategoryFacetConfig = {
        include_hierarchy: true,
        max_depth: maxDepth || 5,
        show_path: true,
        parent_category: parentCategory,
      };

      const facetOptions: FacetOptionsDto = {
        categories: true,
        brands: false,
        price_ranges: false,
        ratings: false,
        tags: false,
        availability: false,
        category_config: categoryConfig,
        min_doc_count: 1,
        filtered_facets: false,
      };

      searchQuery.facets = true;
      searchQuery.facet_options = facetOptions;

      const searchResults =
        await this.searchService.searchProducts(searchQuery);

      return {
        categories: searchResults.facets?.categories || [],
        total_products: searchResults.hits.total.value,
        hierarchy_depth: maxDepth || 5,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get category facets: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to retrieve category facets: ${error.message}`,
      );
    }
  }

  @Get('/price-ranges')
  @ApiOperation({
    summary: 'Get dynamic price range facets',
    description:
      'Retrieve price range facets with configurable ranges and statistics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Price range facets retrieved successfully',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search query to filter price ranges',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: PriceRangeType,
    description: 'Price range type',
  })
  @ApiQuery({
    name: 'interval',
    required: false,
    description: 'Interval for dynamic ranges',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getPriceRangeFacets(
    @Query() searchQuery: SearchProductsQueryDto,
    @Query('type') type?: PriceRangeType,
    @Query('interval') interval?: number,
  ) {
    try {
      this.logger.debug(
        `Getting price range facets for query: ${JSON.stringify(searchQuery)}`,
      );

      const priceConfig: PriceRangeConfig = {
        type: type || PriceRangeType.FIXED,
        interval: interval || 50,
        extended_bounds: {
          min: 0,
          max: 10000,
        },
      };

      const facetOptions: FacetOptionsDto = {
        categories: false,
        brands: false,
        price_ranges: true,
        ratings: false,
        tags: false,
        availability: false,
        price_config: priceConfig,
        min_doc_count: 1,
        filtered_facets: false,
      };

      searchQuery.facets = true;
      searchQuery.facet_options = facetOptions;

      const searchResults =
        await this.searchService.searchProducts(searchQuery);

      return {
        price_ranges: searchResults.facets?.price_ranges || [],
        total_products: searchResults.hits.total.value,
        price_stats: {
          type: type || PriceRangeType.FIXED,
          interval: interval || 50,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get price range facets: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to retrieve price range facets: ${error.message}`,
      );
    }
  }

  @Get('/brands')
  @ApiOperation({
    summary: 'Get brand facets with popularity',
    description: 'Retrieve brand facets sorted by popularity and product count',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Brand facets retrieved successfully',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search query to filter brands',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: 'Number of brand facets to return',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getBrandFacets(
    @Query() searchQuery: SearchProductsQueryDto,
    @Query('size') size?: number,
  ) {
    try {
      this.logger.debug(
        `Getting brand facets for query: ${JSON.stringify(searchQuery)}`,
      );

      const facetOptions: FacetOptionsDto = {
        categories: false,
        brands: true,
        price_ranges: false,
        ratings: false,
        tags: false,
        availability: false,
        brand_size: size || 50,
        min_doc_count: 1,
        filtered_facets: false,
      };

      searchQuery.facets = true;
      searchQuery.facet_options = facetOptions;

      const searchResults =
        await this.searchService.searchProducts(searchQuery);

      return {
        brands: searchResults.facets?.brands || [],
        total_products: searchResults.hits.total.value,
        total_brands: searchResults.facets?.brands?.length || 0,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get brand facets: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to retrieve brand facets: ${error.message}`,
      );
    }
  }

  @Get('/availability')
  @ApiOperation({
    summary: 'Get availability facets',
    description: 'Retrieve product availability and stock level facets',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Availability facets retrieved successfully',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search query to filter availability',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAvailabilityFacets(@Query() searchQuery: SearchProductsQueryDto) {
    try {
      this.logger.debug(
        `Getting availability facets for query: ${JSON.stringify(searchQuery)}`,
      );

      const facetOptions: FacetOptionsDto = {
        categories: false,
        brands: false,
        price_ranges: false,
        ratings: false,
        tags: false,
        availability: true,
        min_doc_count: 0,
        include_zero_counts: true,
        filtered_facets: false,
      };

      searchQuery.facets = true;
      searchQuery.facet_options = facetOptions;

      const searchResults =
        await this.searchService.searchProducts(searchQuery);

      return {
        availability: searchResults.facets?.availability || [],
        total_products: searchResults.hits.total.value,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get availability facets: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to retrieve availability facets: ${error.message}`,
      );
    }
  }
}
