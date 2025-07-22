import { Controller, Get, Query, ValidationPipe, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../../common/guards/jwt-auth.guard';
import { SuggestionService } from '../services/suggestion.service';
import {
  SuggestQueryDto,
  AutocompleteQueryDto,
  SuggestionType,
} from '../dto/suggest-query.dto';
import {
  SuggestResponseDto,
  AutocompleteResponseDto,
} from '../dto/suggest-response.dto';

@ApiTags('Search Suggestions')
@Controller('search')
export class SuggestionController {
  private readonly logger = new Logger(SuggestionController.name);

  constructor(private readonly suggestionService: SuggestionService) {}

  @Get('suggest')
  @Public()
  @ApiOperation({
    summary: 'Get search suggestions (Phase 3.1)',
    description:
      'Get comprehensive search suggestions including products, categories, brands, popular queries, and spell corrections',
  })
  @ApiResponse({
    status: 200,
    description: 'Search suggestions retrieved successfully',
    type: SuggestResponseDto,
  })
  @ApiQuery({
    name: 'q',
    description: 'Search query text',
    required: true,
    example: 'smartph',
  })
  @ApiQuery({
    name: 'types',
    description: 'Types of suggestions to return',
    required: false,
    enum: SuggestionType,
    isArray: true,
    example: [SuggestionType.PRODUCTS, SuggestionType.CATEGORIES],
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of suggestions per type',
    required: false,
    type: Number,
    example: 5,
  })
  @ApiQuery({
    name: 'fuzzy',
    description: 'Enable fuzzy matching',
    required: false,
    type: Boolean,
    example: true,
  })
  @ApiQuery({
    name: 'spell_check',
    description: 'Include spell corrections',
    required: false,
    type: Boolean,
    example: true,
  })
  async getSuggestions(
    @Query(new ValidationPipe({ transform: true }))
    query: SuggestQueryDto,
  ): Promise<SuggestResponseDto> {
    try {
      this.logger.log(`Getting suggestions for query: ${query.q}`);

      const startTime = Date.now();
      const response = await this.suggestionService.getSuggestions(query);

      this.logger.log(
        `Suggestions retrieved in ${Date.now() - startTime}ms for query: ${query.q}`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Error getting suggestions for query: ${query.q}`,
        error,
      );
      throw error;
    }
  }

  @Get('autocomplete')
  @Public()
  @ApiOperation({
    summary: 'Get autocomplete suggestions (Phase 3.1)',
    description:
      'Fast real-time search-as-you-type autocomplete suggestions optimized for quick response times',
  })
  @ApiResponse({
    status: 200,
    description: 'Autocomplete suggestions retrieved successfully',
    type: AutocompleteResponseDto,
  })
  @ApiQuery({
    name: 'text',
    description: 'Partial search text for autocomplete',
    required: true,
    example: 'smart',
  })
  @ApiQuery({
    name: 'size',
    description: 'Number of autocomplete suggestions',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'context_aware',
    description: 'Enable context-aware suggestions',
    required: false,
    type: Boolean,
    example: false,
  })
  @ApiQuery({
    name: 'category_context',
    description: 'Category context for suggestions',
    required: false,
    type: String,
  })
  async getAutocomplete(
    @Query(new ValidationPipe({ transform: true }))
    query: AutocompleteQueryDto,
  ): Promise<AutocompleteResponseDto> {
    try {
      this.logger.debug(`Getting autocomplete for text: ${query.text}`);

      const response = await this.suggestionService.getAutocomplete(query);

      this.logger.debug(
        `Autocomplete retrieved in ${response.took}ms for text: ${query.text}`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Error getting autocomplete for text: ${query.text}`,
        error,
      );
      throw error;
    }
  }

  @Get('suggest/products')
  @Public()
  @ApiOperation({
    summary: 'Get product suggestions only',
    description: 'Get product-specific suggestions for focused product search',
  })
  @ApiResponse({
    status: 200,
    description: 'Product suggestions retrieved successfully',
  })
  async getProductSuggestions(
    @Query('q') query: string,
    @Query('limit') limit: number = 5,
    @Query('fuzzy') fuzzy: boolean = true,
  ) {
    try {
      const suggestQuery: SuggestQueryDto = {
        q: query,
        types: [SuggestionType.PRODUCTS],
        limit,
        fuzzy,
        spell_check: false,
      };

      const response =
        await this.suggestionService.getSuggestions(suggestQuery);

      return {
        products: response.products || [],
        took: response.took,
        query: response.query,
        total: response.products?.length || 0,
        timestamp: response.timestamp,
      };
    } catch (error) {
      this.logger.error(
        `Error getting product suggestions for query: ${query}`,
        error,
      );
      throw error;
    }
  }

  @Get('suggest/categories')
  @Public()
  @ApiOperation({
    summary: 'Get category suggestions only',
    description: 'Get category-specific suggestions for navigation assistance',
  })
  @ApiResponse({
    status: 200,
    description: 'Category suggestions retrieved successfully',
  })
  async getCategorySuggestions(
    @Query('q') query: string,
    @Query('limit') limit: number = 5,
    @Query('fuzzy') fuzzy: boolean = true,
  ) {
    try {
      const suggestQuery: SuggestQueryDto = {
        q: query,
        types: [SuggestionType.CATEGORIES],
        limit,
        fuzzy,
        spell_check: false,
      };

      const response =
        await this.suggestionService.getSuggestions(suggestQuery);

      return {
        categories: response.categories || [],
        took: response.took,
        query: response.query,
        total: response.categories?.length || 0,
        timestamp: response.timestamp,
      };
    } catch (error) {
      this.logger.error(
        `Error getting category suggestions for query: ${query}`,
        error,
      );
      throw error;
    }
  }

  @Get('suggest/brands')
  @Public()
  @ApiOperation({
    summary: 'Get brand suggestions only',
    description: 'Get brand-specific suggestions for brand-focused search',
  })
  @ApiResponse({
    status: 200,
    description: 'Brand suggestions retrieved successfully',
  })
  async getBrandSuggestions(
    @Query('q') query: string,
    @Query('limit') limit: number = 5,
    @Query('fuzzy') fuzzy: boolean = true,
  ) {
    try {
      const suggestQuery: SuggestQueryDto = {
        q: query,
        types: [SuggestionType.BRANDS],
        limit,
        fuzzy,
        spell_check: false,
      };

      const response =
        await this.suggestionService.getSuggestions(suggestQuery);

      return {
        brands: response.brands || [],
        took: response.took,
        query: response.query,
        total: response.brands?.length || 0,
        timestamp: response.timestamp,
      };
    } catch (error) {
      this.logger.error(
        `Error getting brand suggestions for query: ${query}`,
        error,
      );
      throw error;
    }
  }

  @Get('suggest/popular')
  @Public()
  @ApiOperation({
    summary: 'Get popular query suggestions',
    description:
      'Get popular and trending search queries based on search analytics',
  })
  @ApiResponse({
    status: 200,
    description: 'Popular query suggestions retrieved successfully',
  })
  async getPopularQueries(
    @Query('q') query: string = '',
    @Query('limit') limit: number = 10,
  ) {
    try {
      const suggestQuery: SuggestQueryDto = {
        q: query,
        types: [SuggestionType.QUERIES],
        limit,
        fuzzy: false,
        spell_check: false,
      };

      const response =
        await this.suggestionService.getSuggestions(suggestQuery);

      return {
        queries: response.queries || [],
        took: response.took,
        query: response.query,
        total: response.queries?.length || 0,
        timestamp: response.timestamp,
      };
    } catch (error) {
      this.logger.error(
        `Error getting popular queries for query: ${query}`,
        error,
      );
      throw error;
    }
  }

  @Get('suggest/spell-check')
  @Public()
  @ApiOperation({
    summary: 'Get spell corrections',
    description:
      'Get spell corrections and "did you mean" suggestions for search queries',
  })
  @ApiResponse({
    status: 200,
    description: 'Spell corrections retrieved successfully',
  })
  async getSpellCorrections(
    @Query('q') query: string,
    @Query('limit') limit: number = 3,
  ) {
    try {
      const suggestQuery: SuggestQueryDto = {
        q: query,
        types: [], // No other types, just spell corrections
        limit,
        fuzzy: true,
        spell_check: true,
      };

      const response =
        await this.suggestionService.getSuggestions(suggestQuery);

      return {
        corrections: response.corrections || [],
        took: response.took,
        query: response.query,
        total: response.corrections?.length || 0,
        timestamp: response.timestamp,
        has_corrections: (response.corrections?.length || 0) > 0,
      };
    } catch (error) {
      this.logger.error(
        `Error getting spell corrections for query: ${query}`,
        error,
      );
      throw error;
    }
  }

  @Get('suggest/all')
  @Public()
  @ApiOperation({
    summary: 'Get all types of suggestions',
    description:
      'Get comprehensive suggestions including all types: products, categories, brands, queries, and spell corrections',
  })
  @ApiResponse({
    status: 200,
    description: 'All suggestions retrieved successfully',
    type: SuggestResponseDto,
  })
  async getAllSuggestions(
    @Query('q') query: string,
    @Query('limit') limit: number = 5,
    @Query('fuzzy') fuzzy: boolean = true,
    @Query('spell_check') spellCheck: boolean = true,
  ): Promise<SuggestResponseDto> {
    try {
      const suggestQuery: SuggestQueryDto = {
        q: query,
        types: [
          SuggestionType.PRODUCTS,
          SuggestionType.CATEGORIES,
          SuggestionType.BRANDS,
          SuggestionType.QUERIES,
        ],
        limit,
        fuzzy,
        spell_check: spellCheck,
      };

      return await this.suggestionService.getSuggestions(suggestQuery);
    } catch (error) {
      this.logger.error(
        `Error getting all suggestions for query: ${query}`,
        error,
      );
      throw error;
    }
  }
}
