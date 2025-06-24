import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';

// Services
import { CoreElasticsearchService } from './services/elasticsearch.service';
import { IndexService } from './services/index.service';
import { SearchService } from './services/search.service';
import { AdvancedSearchService } from './services/advanced-search.service';
import { AggregationService } from './services/aggregation.service';
import { SuggestionService } from './services/suggestion.service';

// Controllers
import { SearchController } from './controllers/search.controller';
import { FacetsController } from './controllers/facets.controller';
import { SuggestionController } from './controllers/suggestion.controller';

@Module({
  imports: [
    // Elasticsearch configuration
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        node: configService.get<string>(
          'ELASTICSEARCH_NODE',
          'http://localhost:9200',
        ),
        maxRetries: configService.get<number>('ELASTICSEARCH_MAX_RETRIES', 3),
        requestTimeout: configService.get<number>(
          'ELASTICSEARCH_REQUEST_TIMEOUT',
          30000,
        ),
        pingTimeout: configService.get<number>(
          'ELASTICSEARCH_PING_TIMEOUT',
          3000,
        ),
      }),
      inject: [ConfigService],
    }),

    // Cache configuration for search results
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get<number>('SEARCH_CACHE_TTL', 300), // 5 minutes
        max: configService.get<number>('SEARCH_CACHE_MAX_SIZE', 1000),
      }),
      inject: [ConfigService],
    }),

    // Other modules
    ConfigModule,
    PrismaModule,
    CommonModule,
  ],
  controllers: [SearchController, FacetsController, SuggestionController],
  providers: [
    CoreElasticsearchService,
    IndexService,
    SearchService,
    AdvancedSearchService,
    AggregationService,
    SuggestionService,
  ],
  exports: [
    CoreElasticsearchService,
    IndexService,
    SearchService,
    AdvancedSearchService,
    AggregationService,
    SuggestionService,
    ElasticsearchModule,
  ],
})
export class SearchModule {}
