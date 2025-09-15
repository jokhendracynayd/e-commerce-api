import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { PrismaService } from '../../../common/prisma.service';
import {
  IndexCreationResult,
  IndexMapping,
  IndexSettings,
  IndexTemplate,
} from '../interfaces/index.interface';
import { INDEX_NAMES } from '../constants/indices.constants';
import {
  PRODUCT_MAPPING,
  PRODUCT_SETTINGS,
  CATEGORY_MAPPING,
  CATEGORY_SETTINGS,
  BRAND_MAPPING,
  BRAND_SETTINGS,
  ANALYTICS_MAPPING,
  ANALYTICS_SETTINGS,
  INDEX_CONFIGURATIONS,
} from '../constants/mappings.constants';
import { CoreElasticsearchService } from './elasticsearch.service';

@Injectable()
export class IndexService {
  private readonly logger = new Logger(IndexService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly coreElasticsearchService: CoreElasticsearchService,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create all indices with their advanced mappings and settings (Phase 1.3)
   */
  async createAllIndicesWithMappings(): Promise<void> {
    this.logger.log(
      'Creating all Elasticsearch indices with advanced mappings...',
    );

    try {
      // Delete existing indices first to avoid conflicts
      await this.deleteExistingIndices();

      // Create index templates first
      await this.createIndexTemplates();

      // Create indices with full mappings and settings
      await this.createIndexWithMapping(
        INDEX_CONFIGURATIONS.products.index,
        INDEX_CONFIGURATIONS.products.mapping,
        INDEX_CONFIGURATIONS.products.settings,
      );

      await this.createIndexWithMapping(
        INDEX_CONFIGURATIONS.categories.index,
        INDEX_CONFIGURATIONS.categories.mapping,
        INDEX_CONFIGURATIONS.categories.settings,
      );

      await this.createIndexWithMapping(
        INDEX_CONFIGURATIONS.brands.index,
        INDEX_CONFIGURATIONS.brands.mapping,
        INDEX_CONFIGURATIONS.brands.settings,
      );

      await this.createIndexWithMapping(
        INDEX_CONFIGURATIONS.analytics.index,
        INDEX_CONFIGURATIONS.analytics.mapping,
        INDEX_CONFIGURATIONS.analytics.settings,
      );

      // Create aliases for easier management
      await this.createIndexAliases();

      this.logger.log(
        'All indices with advanced mappings created successfully',
      );
    } catch (error) {
      this.logger.error(
        'Failed to create indices with mappings:',
        error.message,
      );
      throw error;
    }
  }

  /**
   * Create index with proper mapping and settings
   */
  async createIndexWithMapping(
    indexName: string,
    mapping: any,
    settings: any,
  ): Promise<IndexCreationResult> {
    try {
      // Check if index already exists
      const exists = await this.coreElasticsearchService.indexExists(indexName);
      if (exists) {
        this.logger.warn(
          `Index ${indexName} already exists, checking mapping compatibility...`,
        );
        await this.validateIndexMapping(indexName, mapping);
        return {
          acknowledged: true,
          shards_acknowledged: true,
          index: indexName,
        };
      }

      // Create index with advanced mapping and settings
      const response = await this.elasticsearchService.indices.create({
        index: indexName,
        body: {
          settings,
          mappings: mapping,
        },
      } as any);

      this.logger.log(
        `Successfully created index: ${indexName} with advanced mapping`,
      );

      return {
        acknowledged: response.acknowledged,
        shards_acknowledged: response.shards_acknowledged,
        index: indexName,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create index ${indexName} with mapping:`,
        error.message,
      );
      throw new Error(`Index creation with mapping failed: ${error.message}`);
    }
  }

  /**
   * Create index templates for lifecycle management
   */
  async createIndexTemplates(): Promise<void> {
    this.logger.log('Creating index templates...');

    // First, delete existing templates to avoid conflicts
    await this.deleteExistingTemplates();

    const templates: IndexTemplate[] = [
      {
        name: 'ecommerce_products_template',
        index_patterns: ['ecommerce_products*'],
        template: {
          settings: PRODUCT_SETTINGS,
          mappings: PRODUCT_MAPPING,
        },
        priority: 200,
        version: 1,
      },
      {
        name: 'ecommerce_categories_template',
        index_patterns: ['ecommerce_categories*'],
        template: {
          settings: CATEGORY_SETTINGS,
          mappings: CATEGORY_MAPPING,
        },
        priority: 200,
        version: 1,
      },
      {
        name: 'ecommerce_brands_template',
        index_patterns: ['ecommerce_brands*'],
        template: {
          settings: BRAND_SETTINGS,
          mappings: BRAND_MAPPING,
        },
        priority: 200,
        version: 1,
      },
      {
        name: 'ecommerce_analytics_template',
        index_patterns: ['ecommerce_search_analytics*'],
        template: {
          settings: ANALYTICS_SETTINGS,
          mappings: ANALYTICS_MAPPING,
        },
        priority: 200,
        version: 1,
      },
    ];

    for (const template of templates) {
      await this.createIndexTemplate(template);
    }
  }

  /**
   * Delete existing indices to avoid conflicts
   */
  async deleteExistingIndices(): Promise<void> {
    const indexNames = [
      INDEX_CONFIGURATIONS.products.index,
      INDEX_CONFIGURATIONS.categories.index,
      INDEX_CONFIGURATIONS.brands.index,
      INDEX_CONFIGURATIONS.analytics.index
    ];

    for (const indexName of indexNames) {
      try {
        const exists = await this.elasticsearchService.indices.exists({
          index: indexName,
        });
        
        if (exists) {
          await this.elasticsearchService.indices.delete({
            index: indexName,
          });
          this.logger.log(`Deleted existing index: ${indexName}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to delete index ${indexName}: ${error.message}`);
      }
    }
  }

  /**
   * Delete existing templates to avoid conflicts
   */
  async deleteExistingTemplates(): Promise<void> {
    const templateNames = [
      'ecommerce_products_template',
      'ecommerce_categories_template', 
      'ecommerce_brands_template',
      'ecommerce_analytics_template'
    ];

    for (const templateName of templateNames) {
      try {
        await this.elasticsearchService.indices.deleteIndexTemplate({
          name: templateName,
        });
        this.logger.log(`Deleted existing template: ${templateName}`);
      } catch (error) {
        // Template might not exist, which is fine
        if (error.statusCode !== 404) {
          this.logger.warn(`Failed to delete template ${templateName}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Create a single index template
   */
  async createIndexTemplate(template: IndexTemplate): Promise<void> {
    try {
      await this.elasticsearchService.indices.putIndexTemplate({
        name: template.name,
        body: {
          index_patterns: template.index_patterns,
          template: template.template,
          priority: template.priority,
          version: template.version,
        },
      } as any);

      this.logger.log(`Successfully created index template: ${template.name}`);
    } catch (error) {
      this.logger.error(
        `Failed to create index template ${template.name}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Create index aliases for easier management
   */
  async createIndexAliases(): Promise<void> {
    this.logger.log('Creating index aliases...');

    const aliases = [
      { index: INDEX_CONFIGURATIONS.products.index, alias: 'products' },
      { index: INDEX_CONFIGURATIONS.categories.index, alias: 'categories' },
      { index: INDEX_CONFIGURATIONS.brands.index, alias: 'brands' },
      {
        index: INDEX_CONFIGURATIONS.analytics.index,
        alias: 'search_analytics',
      },
    ];

    for (const { index, alias } of aliases) {
      await this.createAlias(index, alias);
    }
  }

  /**
   * Validate existing index mapping compatibility
   */
  async validateIndexMapping(
    indexName: string,
    expectedMapping: IndexMapping,
  ): Promise<boolean> {
    try {
      const response = await this.elasticsearchService.indices.getMapping({
        index: indexName,
      });

      const currentMapping = response[indexName]?.mappings;

      // Basic validation - in production, you might want more sophisticated comparison
      if (!currentMapping || !currentMapping.properties) {
        this.logger.warn(
          `Index ${indexName} has no mapping properties, might need reindexing`,
        );
        return false;
      }

      this.logger.log(`Index ${indexName} mapping validation passed`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to validate mapping for ${indexName}:`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Transform product data for Elasticsearch indexing
   */
  transformProductToDocument(product: any): any {
    const document = {
      id: product.id,
      title: product.title,
      description: product.description,
      price: parseFloat(product.price.toString()),
      discount_price: product.discountPrice
        ? parseFloat(product.discountPrice.toString())
        : null,
      currency: product.currency || 'USD', // Use product currency or default to USD
      in_stock: product.stockQuantity > 0,
      stock_quantity: product.stockQuantity,
      is_active: product.isActive,
      is_featured: product.isFeatured,
      sku: product.sku,
      slug: product.slug,
      short_description: product.shortDescription,
      meta_title: product.metaTitle,
      meta_description: product.metaDescription,
      meta_keywords: product.metaKeywords,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            path: product.category.slug || product.category.name,
          }
        : null,
      brand: product.brand
        ? {
            id: product.brand.id,
            name: product.brand.name,
          }
        : null,
      rating: {
        average: product.averageRating || 0,
        count: product.reviewCount || 0,
      },
      tags:
        product.tags
          ?.map((tag: any) => tag.tag?.name || tag.name)
          .filter(Boolean) || [],
      images:
        product.images?.map((img: any) => img.imageUrl).filter(Boolean) || [],
      search_keywords: [
        product.title,
        product.brand?.name,
        product.category?.name,
        product.short_description,
        product.description,
        product.meta_title,
        product.meta_description,
        product.meta_keywords,
        ...(product.tags?.map((tag: any) => tag.tag?.name || tag.name) || []),
      ]
        .filter(Boolean)
        .join(' '),
      popularity_score: 1.0, // Default value, can be calculated based on views/sales
      conversion_rate: 0.0, // Default value, can be calculated based on analytics
      specifications: this.transformSpecifications(product.specifications),
      variants:
        product.variants?.map((variant: any) => ({
          id: variant.id,
          sku: variant.sku,
          price: parseFloat(variant.price.toString()),
          stock_quantity: variant.stockQuantity,
          attributes: variant.attributes || {},
        })) || [],
    };

    return document;
  }

  /**
   * Transform specifications for indexing
   */
  private transformSpecifications(specifications: any[]): any {
    if (!specifications || !Array.isArray(specifications)) {
      return {};
    }

    const specs = {};
    specifications.forEach((spec) => {
      if (spec.specKey && spec.specValue) {
        specs[spec.specKey] = spec.specValue;
      }
    });

    return specs;
  }

  /**
   * Bulk index products with proper data transformation
   */
  async bulkIndexProducts(productIds?: string[]): Promise<void> {
    this.logger.log('Starting bulk product indexing...');

    try {
      const batchSize = this.configService.get<number>('SYNC_BATCH_SIZE', 1000);

      if (productIds && productIds.length > 0) {
        // Index specific products
        const batches = this.chunkArray(productIds, batchSize);
        for (const batch of batches) {
          await this.processBatch(batch);
        }
      } else {
        // Index all active products
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const products = await this.prismaService.product.findMany({
            where: { isActive: true },
            include: {
              category: true,
              brand: true,
              images: true,
              tags: { include: { tag: true } },
              specifications: true,
              variants: true,
            },
            skip: offset,
            take: batchSize,
          });

          if (products.length === 0) {
            hasMore = false;
            break;
          }

          await this.processBatch(products.map((p) => p.id));
          offset += batchSize;

          this.logger.log(`Processed ${offset} products...`);
        }
      }

      this.logger.log('Bulk product indexing completed successfully');
    } catch (error) {
      this.logger.error('Failed to bulk index products:', error.message);
      throw error;
    }
  }

  /**
   * Process a batch of products for indexing
   */
  private async processBatch(productIds: string[]): Promise<void> {
    try {
      const products = await this.prismaService.product.findMany({
        where: { id: { in: productIds } },
        include: {
          category: true,
          brand: true,
          images: true,
          tags: { include: { tag: true } },
          specifications: true,
          variants: true,
        },
      });

      const body: any[] = [];

      for (const product of products) {
        body.push({
          index: {
            _index: INDEX_CONFIGURATIONS.products.index,
            _id: product.id,
          },
        });
        body.push(this.transformProductToDocument(product));
      }

      if (body.length > 0) {
        const response = await this.elasticsearchService.bulk({ body });

        if (response.errors) {
          const errors = response.items.filter(
            (item: any) => item.index?.error,
          );
          this.logger.error('Bulk indexing errors:', errors);
        } else {
          this.logger.debug(`Successfully indexed ${products.length} products`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to process batch:', error.message);
      throw error;
    }
  }

  /**
   * Index a single product
   */
  async indexProduct(productId: string): Promise<void> {
    try {
      const product = await this.prismaService.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          brand: true,
          images: true,
          tags: { include: { tag: true } },
          specifications: true,
          variants: true,
        },
      });

      if (!product) {
        await this.deleteProduct(productId);
        return;
      }

      const document = this.transformProductToDocument(product);

      await this.elasticsearchService.index({
        index: INDEX_CONFIGURATIONS.products.index,
        id: productId,
        body: document,
      });

      this.logger.debug(`Indexed product: ${productId}`);
    } catch (error) {
      this.logger.error(`Failed to index product ${productId}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete a product from the index
   */
  async deleteProduct(productId: string): Promise<void> {
    try {
      await this.elasticsearchService.delete({
        index: INDEX_CONFIGURATIONS.products.index,
        id: productId,
      });

      this.logger.debug(`Deleted product from index: ${productId}`);
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        this.logger.debug(
          `Product ${productId} not found in index, skipping deletion`,
        );
        return;
      }
      this.logger.error(
        `Failed to delete product ${productId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Utility function to chunk arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Create all indices with their mappings and settings
   */
  async createAllIndices(): Promise<void> {
    this.logger.log('Creating all Elasticsearch indices...');

    // Create basic indices for now - will be enhanced in Phase 2
    await this.createBasicIndex(INDEX_NAMES.PRODUCTS);
    await this.createBasicIndex(INDEX_NAMES.CATEGORIES);
    await this.createBasicIndex(INDEX_NAMES.BRANDS);
    await this.createBasicIndex(INDEX_NAMES.ANALYTICS);

    this.logger.log('All indices created successfully');
  }

  /**
   * Create a basic index without complex mapping (for Phase 1.2)
   */
  async createBasicIndex(indexName: string): Promise<IndexCreationResult> {
    try {
      // Check if index already exists
      const exists = await this.coreElasticsearchService.indexExists(indexName);
      if (exists) {
        this.logger.warn(
          `Index ${indexName} already exists, skipping creation`,
        );
        return {
          acknowledged: true,
          shards_acknowledged: true,
          index: indexName,
        };
      }

      // Create index with basic settings
      const response = await this.elasticsearchService.indices.create({
        index: indexName,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
        },
      });

      this.logger.log(`Successfully created index: ${indexName}`);

      return {
        acknowledged: response.acknowledged,
        shards_acknowledged: response.shards_acknowledged,
        index: indexName,
      };
    } catch (error) {
      this.logger.error(`Failed to create index ${indexName}:`, error.message);
      throw new Error(`Index creation failed: ${error.message}`);
    }
  }

  /**
   * Create index alias
   */
  async createAlias(indexName: string, aliasName: string): Promise<void> {
    try {
      await this.elasticsearchService.indices.putAlias({
        index: indexName,
        name: aliasName,
      });

      this.logger.log(
        `Successfully created alias ${aliasName} for index ${indexName}`,
      );
    } catch (error) {
      this.logger.error(`Failed to create alias ${aliasName}:`, error.message);
      throw new Error(`Alias creation failed: ${error.message}`);
    }
  }

  /**
   * Delete an index
   */
  async deleteIndex(indexName: string): Promise<void> {
    try {
      const exists = await this.coreElasticsearchService.indexExists(indexName);
      if (!exists) {
        this.logger.warn(
          `Index ${indexName} does not exist, skipping deletion`,
        );
        return;
      }

      await this.elasticsearchService.indices.delete({
        index: indexName,
      });

      this.logger.log(`Successfully deleted index: ${indexName}`);
    } catch (error) {
      this.logger.error(`Failed to delete index ${indexName}:`, error.message);
      throw new Error(`Index deletion failed: ${error.message}`);
    }
  }

  /**
   * Check if all required indices exist
   */
  async checkIndicesExist(): Promise<{
    products: boolean;
    categories: boolean;
    brands: boolean;
    analytics: boolean;
    allExist: boolean;
  }> {
    const results = {
      products: await this.coreElasticsearchService.indexExists(
        INDEX_NAMES.PRODUCTS,
      ),
      categories: await this.coreElasticsearchService.indexExists(
        INDEX_NAMES.CATEGORIES,
      ),
      brands: await this.coreElasticsearchService.indexExists(
        INDEX_NAMES.BRANDS,
      ),
      analytics: await this.coreElasticsearchService.indexExists(
        INDEX_NAMES.ANALYTICS,
      ),
      allExist: false,
    };

    results.allExist =
      results.products &&
      results.categories &&
      results.brands &&
      results.analytics;

    return results;
  }

  /**
   * Get index health for a specific index
   */
  async getIndexHealth(indexName: string) {
    return this.coreElasticsearchService.getIndexHealth(indexName);
  }

  /**
   * Get index statistics
   */
  async getIndexStats(indexName?: string) {
    return this.coreElasticsearchService.getIndexStats(indexName);
  }

  /**
   * Refresh indices to make changes searchable
   */
  async refreshIndices(indexNames?: string[]): Promise<void> {
    try {
      const indices = indexNames || Object.values(INDEX_NAMES);

      for (const indexName of indices) {
        await this.elasticsearchService.indices.refresh({
          index: indexName,
        });
      }

      this.logger.log(`Refreshed indices: ${indices.join(', ')}`);
    } catch (error) {
      this.logger.error('Failed to refresh indices:', error.message);
      throw new Error(`Index refresh failed: ${error.message}`);
    }
  }

  /**
   * Get all index information
   */
  async getAllIndicesInfo(): Promise<any> {
    try {
      const response = await this.elasticsearchService.cat.indices({
        format: 'json',
        bytes: 'kb',
      });

      return response.filter((index: any) =>
        index.index.startsWith('ecommerce_'),
      );
    } catch (error) {
      this.logger.error('Failed to get indices info:', error.message);
      throw new Error(`Failed to get indices info: ${error.message}`);
    }
  }

  /**
   * Debug: Get total products count from database
   */
  async getTotalProductsCount(): Promise<number> {
    return await this.prismaService.product.count();
  }

  /**
   * Debug: Get active products count from database
   */
  async getActiveProductsCount(): Promise<number> {
    return await this.prismaService.product.count({
      where: { isActive: true }
    });
  }

  /**
   * Debug: Get sample products from database
   */
  async getSampleProducts(): Promise<any[]> {
    return await this.prismaService.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        brand: true,
        images: true,
        tags: { include: { tag: true } },
        specifications: true,
        variants: true,
      },
      take: 2,
    });
  }
}
