import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma, ProductVisibility } from '@prisma/client';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  ProductFilterDto,
  PaginatedProductResponseDto,
  CreateProductDealDto,
  FilterOptionsResponseDto,
  FilterOptionsQueryDto,
  FilterValueDto,
  AttributeFilterDto,
} from './dto';
import { SpecificationsService } from '../specifications/specifications.service';
import { GroupedProductSpecificationsResponseDto } from '../specifications/dto/spec-response.dto';
import {
  ProductImageDto,
  CreateProductVariantDto,
} from './dto/create-product.dto';
import { AppLogger } from '../../common/services/logger.service';
import slugify from '../../common/utils/slugify';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logger: AppLogger,
    private readonly specificationsService: SpecificationsService,
  ) {
    this.logger.setContext('ProductsService');
  }

  async findAll(
    filterDto: ProductFilterDto,
  ): Promise<PaginatedProductResponseDto> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        categoryId,
        categorySlug,
        recursive,
        subCategoryId,
        brandId,
        tagIds,
        minPrice,
        maxPrice,
        inStock,
        isFeatured,
        visibility,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filterDto;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.ProductWhereInput = {};

      // Active products only by default
      where.isActive = true;

      // Search by title or description
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { metaKeywords: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Handle category filtering
      if (categorySlug) {
        // Find the category by slug
        const category = await this.prismaService.category.findUnique({
          where: { slug: categorySlug },
        });

        if (!category) {
          throw new NotFoundException(
            `Category with slug "${categorySlug}" not found`,
          );
        }

        if (recursive) {
          // Get all category IDs in the hierarchy
          const categoryIds = await this.getCategoryAndDescendantsIds(
            category.id,
          );
          where.OR = [
            { categoryId: { in: categoryIds } },
            { subCategoryId: { in: categoryIds } },
          ];
        } else {
          // Just use the single category ID
          where.categoryId = category.id;
        }
      } else if (categoryId) {
        // Direct categoryId filter
        if (recursive) {
          // Get all category IDs in the hierarchy
          const categoryIds =
            await this.getCategoryAndDescendantsIds(categoryId);
          where.OR = [
            { categoryId: { in: categoryIds } },
            { subCategoryId: { in: categoryIds } },
          ];
        } else {
          // Just use the single category ID
          where.categoryId = categoryId;
        }
      }

      // Filter by subcategory
      if (subCategoryId && !recursive) {
        where.subCategoryId = subCategoryId;
      }

      // Filter by brand
      if (brandId) {
        where.brandId = brandId;
      }

      // Filter by tags
      if (tagIds && tagIds.length > 0) {
        where.tags = {
          some: {
            tagId: {
              in: tagIds,
            },
          },
        };
      }

      // Filter by price range
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) {
          where.price.gte = minPrice;
        }
        if (maxPrice !== undefined) {
          where.price.lte = maxPrice;
        }
      }

      // Filter by stock
      if (inStock !== undefined) {
        where.stockQuantity = inStock ? { gt: 0 } : { equals: 0 };
      }

      // Filter by featured status
      if (isFeatured !== undefined) {
        where.isFeatured = isFeatured;
      }

      // Filter by visibility
      if (visibility) {
        where.visibility = visibility;
      }

      // Build order by
      const orderBy: Prisma.ProductOrderByWithRelationInput = {};

      // Handle special sort fields that need mapping
      if (sortBy === 'popularity') {
        // Map 'popularity' to 'averageRating' as the most appropriate field
        orderBy['averageRating'] = sortOrder;
      } else {
        // Use the provided sort field
        orderBy[sortBy] = sortOrder;
      }

      // Execute query with count
      const [products, total] = await Promise.all([
        this.prismaService.product.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            brand: true,
            category: true,
            subCategory: true,
            images: {
              orderBy: {
                position: 'asc',
              },
            },
            variants: true,
            tags: {
              include: {
                tag: true,
              },
            },
            deals: true,
          },
        }),
        this.prismaService.product.count({ where }),
      ]);

      // Transform products to match ProductResponseDto
      const transformedProducts = products.map((product) =>
        this.transformProductToDto(product),
      );

      // Calculate pagination values
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        data: transformedProducts,
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error retrieving products: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to retrieve products');
    }
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    try {
      const product = await this.prismaService.product.findUnique({
        where: { id },
        include: {
          brand: true,
          category: true,
          subCategory: true,
          images: {
            orderBy: {
              position: 'asc',
            },
          },
          variants: true,
          reviews: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          deals: true,
        },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      // Transform product and include specification groups
      const dto = this.transformProductToDto(product);
      const specGroups = (await this.specificationsService.getGroupedProductSpecifications(id)) as GroupedProductSpecificationsResponseDto[];
      dto.specificationGroups = specGroups;
      return dto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error retrieving product ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve product with ID ${id}`,
      );
    }
  }

  async findBySlug(slug: string): Promise<ProductResponseDto> {
    try {
      const product = await this.prismaService.product.findUnique({
        where: { slug },
        include: {
          brand: true,
          category: true,
          subCategory: true,
          images: {
            orderBy: {
              position: 'asc',
            },
          },
          variants: true,
          reviews: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          deals: true,
        },
      });

      if (!product) {
        throw new NotFoundException(`Product with slug '${slug}' not found`);
      }
      // Transform product and include specification groups
      const dto = this.transformProductToDto(product);
      const specGroups = (await this.specificationsService.getGroupedProductSpecifications(product.id)) as GroupedProductSpecificationsResponseDto[];
      dto.specificationGroups = specGroups;
      return dto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error retrieving product by slug ${slug}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve product with slug '${slug}'`,
      );
    }
  }

  async create(
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    try {
      // Generate slug from title for SEO-friendly URLs
      const title = createProductDto.title.trim();
      const slug = slugify(title);

      // Check if product with this slug already exists
      const existingProduct = await this.prismaService.product.findUnique({
        where: { slug },
      });

      if (existingProduct) {
        throw new ConflictException(
          `Product with slug '${slug}' already exists`,
        );
      }

      // Generate SKU if not provided
      const sku = createProductDto.sku || this.generateSku(title);

      // Create base product data
      const productData: Prisma.ProductCreateInput = {
        title,
        slug,
        sku,
        description: createProductDto.description,
        shortDescription: createProductDto.shortDescription,
        subtitle: createProductDto.subtitle,
        price: createProductDto.price,
        discountPrice: createProductDto.discountPrice,
        stockQuantity: createProductDto.stockQuantity || 0,
        barcode: createProductDto.barcode,
        weight: createProductDto.weight,
        dimensions: createProductDto.dimensions as any,
        currency: createProductDto.currency || 'INR',
        isActive:
          createProductDto.isActive !== undefined
            ? createProductDto.isActive
            : true,
        isFeatured: createProductDto.isFeatured || false,
        isNew: createProductDto.isNew || false,
        isBestSeller: createProductDto.isBestSeller || false,
        isSponsored: createProductDto.isSponsored || false,
        bankOffer: createProductDto.bankOffer as any,
        exchangeOffer: createProductDto.exchangeOffer as any,
        visibility: createProductDto.visibility || 'PUBLIC',
        metaTitle: createProductDto.metaTitle,
        metaDescription: createProductDto.metaDescription,
        metaKeywords: createProductDto.metaKeywords,
      };

      // Add brand relation if provided
      if (createProductDto.brandId) {
        productData.brand = {
          connect: { id: createProductDto.brandId },
        };
      }

      // Add category relation if provided
      if (createProductDto.categoryId) {
        productData.category = {
          connect: { id: createProductDto.categoryId },
        };
      }

      // Add subcategory relation if provided
      if (createProductDto.subCategoryId) {
        productData.subCategory = {
          connect: { id: createProductDto.subCategoryId },
        };
      }

      // Create the product in a transaction to ensure all related entities are created together
      const product = await this.prismaService.$transaction(async (prisma) => {
        // Create the product
        const newProduct = await prisma.product.create({
          data: productData,
        });

        // Create product images if provided
        if (createProductDto.images && createProductDto.images.length > 0) {
          await Promise.all(
            createProductDto.images.map((image, index) =>
              prisma.productImage.create({
                data: {
                  productId: newProduct.id,
                  imageUrl: image.imageUrl,
                  altText:
                    image.altText || `${newProduct.title} - Image ${index + 1}`,
                  position:
                    image.position !== undefined ? image.position : index,
                },
              }),
            ),
          );
        }

        // Create product variants if provided
        if (createProductDto.variants && createProductDto.variants.length > 0) {
          await Promise.all(
            createProductDto.variants.map((variant) =>
              prisma.productVariant.create({
                data: {
                  productId: newProduct.id,
                  variantName: variant.variantName,
                  color: variant.color,
                  colorHex: variant.colorHex,
                  size: variant.size,
                  variantImage: variant.variantImage,
                  sku:
                    variant.sku ||
                    this.generateVariantSku(sku, variant.variantName),
                  price: variant.price,
                  stockQuantity: variant.stockQuantity,
                  additionalPrice: variant.additionalPrice || 0,
                },
              }),
            ),
          );
        }

        // Connect tags if provided
        if (createProductDto.tagIds && createProductDto.tagIds.length > 0) {
          await Promise.all(
            createProductDto.tagIds.map((tagId) =>
              prisma.productTag.create({
                data: {
                  productId: newProduct.id,
                  tagId,
                },
              }),
            ),
          );
        }

        // Create inventory record for main product if stock quantity is provided
        if (
          createProductDto.stockQuantity &&
          createProductDto.stockQuantity > 0
        ) {
          // Create inventory record
          await prisma.inventory.create({
            data: {
              productId: newProduct.id,
              stockQuantity: createProductDto.stockQuantity,
              reservedQuantity: 0,
              threshold: 5, // Default threshold
              lastRestockedAt: new Date(),
            },
          });

          // Create inventory log entry
          await prisma.inventoryLog.create({
            data: {
              productId: newProduct.id,
              changeType: 'RESTOCK',
              quantityChanged: createProductDto.stockQuantity,
              note: 'Initial inventory setup during product creation',
            },
          });
        }

        // Create inventory records for variants with stock
        if (createProductDto.variants && createProductDto.variants.length > 0) {
          // Get all created variants to get their IDs
          const createdVariants = await prisma.productVariant.findMany({
            where: { productId: newProduct.id },
          });

          // Create inventory records for variants with stock
          for (const variant of createdVariants) {
            const variantDto = createProductDto.variants.find(
              (v) => v.sku === variant.sku,
            );

            if (variantDto && variantDto.stockQuantity > 0) {
              // Create inventory record for variant
              await prisma.inventory.create({
                data: {
                  productId: newProduct.id,
                  variantId: variant.id,
                  stockQuantity: variantDto.stockQuantity,
                  reservedQuantity: 0,
                  threshold: variantDto.threshold || 5, // Use variant threshold if provided
                  lastRestockedAt: new Date(),
                },
              });

              // Create inventory log entry for variant
              await prisma.inventoryLog.create({
                data: {
                  productId: newProduct.id,
                  variantId: variant.id,
                  changeType: 'RESTOCK',
                  quantityChanged: variantDto.stockQuantity,
                  note: `Initial variant inventory setup for ${variant.variantName}`,
                },
              });
            }
          }
        }

        return newProduct;
      });

      this.logger.log(`Created product: ${product.id} - ${product.title}`);

      // Return the complete product with relations
      return this.findOne(product.id);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(
        `Error creating product: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to create product');
    }
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    try {
      // Verify product exists and get current state
      const existingProduct = await this.findOne(id);

      // Track stock quantity change for inventory sync
      const oldStockQuantity = existingProduct.stockQuantity || 0;
      const newStockQuantity = updateProductDto.stockQuantity;
      const stockQuantityChanged =
        updateProductDto.stockQuantity !== undefined &&
        updateProductDto.stockQuantity !== oldStockQuantity;

      const updateData: Prisma.ProductUpdateInput = {};

      // Update title and slug if provided
      if (updateProductDto.title) {
        updateData.title = updateProductDto.title;
        const slug = slugify(updateProductDto.title);

        // Check if new slug would conflict with existing product
        const existingProduct = await this.prismaService.product.findFirst({
          where: {
            slug,
            id: { not: id },
          },
        });

        if (existingProduct) {
          throw new ConflictException(
            `Another product with slug '${slug}' already exists`,
          );
        }

        updateData.slug = slug;
      }

      // Set other simple fields if provided
      if (updateProductDto.description !== undefined)
        updateData.description = updateProductDto.description;
      if (updateProductDto.shortDescription !== undefined)
        updateData.shortDescription = updateProductDto.shortDescription;
      if (updateProductDto.subtitle !== undefined)
        updateData.subtitle = updateProductDto.subtitle;
      if (updateProductDto.price !== undefined)
        updateData.price = updateProductDto.price;
      if (updateProductDto.discountPrice !== undefined)
        updateData.discountPrice = updateProductDto.discountPrice;
      if (updateProductDto.currency !== undefined)
        updateData.currency = updateProductDto.currency;
      if (updateProductDto.stockQuantity !== undefined)
        updateData.stockQuantity = updateProductDto.stockQuantity;
      if (updateProductDto.sku !== undefined)
        updateData.sku = updateProductDto.sku;
      if (updateProductDto.barcode !== undefined)
        updateData.barcode = updateProductDto.barcode;
      if (updateProductDto.weight !== undefined)
        updateData.weight = updateProductDto.weight;
      if (updateProductDto.dimensions !== undefined)
        updateData.dimensions = updateProductDto.dimensions as any;
      if (updateProductDto.isActive !== undefined)
        updateData.isActive = updateProductDto.isActive;
      if (updateProductDto.isFeatured !== undefined)
        updateData.isFeatured = updateProductDto.isFeatured;
      if (updateProductDto.isNew !== undefined)
        updateData.isNew = updateProductDto.isNew;
      if (updateProductDto.isBestSeller !== undefined)
        updateData.isBestSeller = updateProductDto.isBestSeller;
      if (updateProductDto.isSponsored !== undefined)
        updateData.isSponsored = updateProductDto.isSponsored;
      if (updateProductDto.bankOffer !== undefined)
        updateData.bankOffer = updateProductDto.bankOffer as any;
      if (updateProductDto.exchangeOffer !== undefined)
        updateData.exchangeOffer = updateProductDto.exchangeOffer as any;
      if (updateProductDto.visibility !== undefined)
        updateData.visibility = updateProductDto.visibility;
      if (updateProductDto.metaTitle !== undefined)
        updateData.metaTitle = updateProductDto.metaTitle;
      if (updateProductDto.metaDescription !== undefined)
        updateData.metaDescription = updateProductDto.metaDescription;
      if (updateProductDto.metaKeywords !== undefined)
        updateData.metaKeywords = updateProductDto.metaKeywords;

      // Add relations
      if (updateProductDto.brandId !== undefined) {
        if (updateProductDto.brandId === null) {
          updateData.brand = { disconnect: true };
        } else {
          updateData.brand = { connect: { id: updateProductDto.brandId } };
        }
      }

      if (updateProductDto.categoryId !== undefined) {
        if (updateProductDto.categoryId === null) {
          updateData.category = { disconnect: true };
        } else {
          updateData.category = {
            connect: { id: updateProductDto.categoryId },
          };
        }
      }

      if (updateProductDto.subCategoryId !== undefined) {
        if (updateProductDto.subCategoryId === null) {
          updateData.subCategory = { disconnect: true };
        } else {
          updateData.subCategory = {
            connect: { id: updateProductDto.subCategoryId },
          };
        }
      }

      // Track variant stock changes for inventory sync
      interface VariantStockChange {
        variantId: string;
        oldStock: number;
        newStock: number;
        change: number;
      }

      const variantStockChanges: VariantStockChange[] = [];
      if (updateProductDto.variants !== undefined) {
        // If variants are provided, check for stock changes
        const existingVariants = existingProduct.variants || [];

        if (updateProductDto.variants && updateProductDto.variants.length > 0) {
          for (const newVariant of updateProductDto.variants) {
            // Find matching existing variant by SKU
            const existingVariant = existingVariants.find(
              (v) => v.sku === newVariant.sku,
            );

            if (
              existingVariant &&
              existingVariant.stockQuantity !== newVariant.stockQuantity
            ) {
              // Track stock change for this variant
              variantStockChanges.push({
                variantId: existingVariant.id,
                oldStock: existingVariant.stockQuantity,
                newStock: newVariant.stockQuantity,
                change:
                  newVariant.stockQuantity - existingVariant.stockQuantity,
              });
            }
          }
        }
      }

      // Update the product in a transaction
      await this.prismaService.$transaction(async (prisma) => {
        // Update the product
        await prisma.product.update({
          where: { id },
          data: updateData,
        });

        // Update images if provided
        if (updateProductDto.images !== undefined) {
          // Delete existing images
          await prisma.productImage.deleteMany({
            where: { productId: id },
          });

          // Create new images if any
          if (updateProductDto.images && updateProductDto.images.length > 0) {
            await Promise.all(
              updateProductDto.images.map((image, index) =>
                prisma.productImage.create({
                  data: {
                    productId: id,
                    imageUrl: image.imageUrl,
                    altText: image.altText || `Image ${index + 1}`,
                    position:
                      image.position !== undefined ? image.position : index,
                  },
                }),
              ),
            );
          }
        }

        // Update variants if provided
        if (updateProductDto.variants !== undefined) {
          // Delete existing variants
          await prisma.productVariant.deleteMany({
            where: { productId: id },
          });

          // Create new variants if any
          if (
            updateProductDto.variants &&
            updateProductDto.variants.length > 0
          ) {
            await Promise.all(
              updateProductDto.variants.map((variant) =>
                prisma.productVariant.create({
                  data: {
                    productId: id,
                    variantName: variant.variantName,
                    color: variant.color,
                    colorHex: variant.colorHex,
                    size: variant.size,
                    variantImage: variant.variantImage,
                    sku:
                      variant.sku ||
                      this.generateVariantSku(
                        updateProductDto.sku || '',
                        variant.variantName,
                      ),
                    price: variant.price,
                    stockQuantity: variant.stockQuantity,
                    additionalPrice: variant.additionalPrice || 0,
                  },
                }),
              ),
            );
          }
        }

        // Update tags if provided
        if (updateProductDto.tagIds !== undefined) {
          // Remove existing tag connections
          await prisma.productTag.deleteMany({
            where: { productId: id },
          });

          // Create new tag connections if any
          if (updateProductDto.tagIds && updateProductDto.tagIds.length > 0) {
            await Promise.all(
              updateProductDto.tagIds.map((tagId) =>
                prisma.productTag.create({
                  data: {
                    productId: id,
                    tagId,
                  },
                }),
              ),
            );
          }
        }

        // Sync with inventory system if stock quantity changed
        if (stockQuantityChanged) {
          // Calculate the stock change
          const stockChange = newStockQuantity! - oldStockQuantity;

          // Check if inventory record exists
          const inventory = await prisma.inventory.findUnique({
            where: { productId: id },
          });

          if (inventory) {
            // Update existing inventory
            await prisma.inventory.update({
              where: { productId: id },
              data: {
                stockQuantity: newStockQuantity,
                // Update lastRestockedAt if stock increased
                ...(stockChange > 0 ? { lastRestockedAt: new Date() } : {}),
              },
            });

            // Create inventory log entry
            await prisma.inventoryLog.create({
              data: {
                productId: id,
                changeType: stockChange > 0 ? 'RESTOCK' : 'MANUAL',
                quantityChanged: stockChange,
                note: `Stock updated during product edit (${stockChange > 0 ? '+' : ''}${stockChange} units)`,
              },
            });
          } else {
            // Create new inventory record if it doesn't exist
            await prisma.inventory.create({
              data: {
                productId: id,
                stockQuantity: newStockQuantity!,
                reservedQuantity: 0,
                threshold: 5, // Default threshold
                lastRestockedAt: new Date(),
              },
            });

            // Create initial inventory log
            await prisma.inventoryLog.create({
              data: {
                productId: id,
                changeType: 'RESTOCK',
                quantityChanged: newStockQuantity!,
                note: 'Initial inventory setup during product edit',
              },
            });
          }
        }

        // Sync variant inventory changes
        for (const variantChange of variantStockChanges) {
          // Check if inventory record exists for this variant
          const variantInventory = await prisma.inventory.findUnique({
            where: { variantId: variantChange.variantId },
          });

          if (variantInventory) {
            // Update existing variant inventory
            await prisma.inventory.update({
              where: { variantId: variantChange.variantId },
              data: {
                stockQuantity: variantChange.newStock,
                // Update lastRestockedAt if stock increased
                ...(variantChange.change > 0
                  ? { lastRestockedAt: new Date() }
                  : {}),
              },
            });
          } else {
            // Create new inventory record for variant
            await prisma.inventory.create({
              data: {
                productId: id,
                variantId: variantChange.variantId,
                stockQuantity: variantChange.newStock,
                reservedQuantity: 0,
                threshold: 5, // Default threshold
                lastRestockedAt: new Date(),
              },
            });
          }

          // Create inventory log for variant
          await prisma.inventoryLog.create({
            data: {
              productId: id,
              variantId: variantChange.variantId,
              changeType: variantChange.change > 0 ? 'RESTOCK' : 'MANUAL',
              quantityChanged: variantChange.change,
              note: `Variant stock updated during product edit (${variantChange.change > 0 ? '+' : ''}${variantChange.change} units)`,
            },
          });
        }
      });

      this.logger.log(`Updated product: ${id}`);

      // Return the updated product with relations
      return this.findOne(id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Error updating product ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to update product with ID ${id}`,
      );
    }
  }

  async remove(
    id: string,
  ): Promise<{ id: string; deleted: boolean; message: string }> {
    try {
      // Verify product exists
      await this.findOne(id);

      // Check if there are any orders for this product
      const orderItemsCount = await this.prismaService.orderItem.count({
        where: { productId: id },
      });

      if (orderItemsCount > 0) {
        throw new BadRequestException(
          `Cannot delete product with ID ${id} because it has ${orderItemsCount} associated orders. Consider deactivating it instead.`,
        );
      }

      // Delete the product and all its related data in a transaction
      await this.prismaService.$transaction(async (prisma) => {
        // Delete related entities first
        await prisma.productImage.deleteMany({
          where: { productId: id },
        });

        await prisma.productVariant.deleteMany({
          where: { productId: id },
        });

        await prisma.productTag.deleteMany({
          where: { productId: id },
        });

        await prisma.productDeal.deleteMany({
          where: { productId: id },
        });

        await prisma.productReview.deleteMany({
          where: { productId: id },
        });

        await prisma.cartItem.deleteMany({
          where: { productId: id },
        });

        await prisma.wishlistItem.deleteMany({
          where: { productId: id },
        });

        // Delete the inventory logs and inventory
        await prisma.inventoryLog.deleteMany({
          where: { productId: id },
        });

        await prisma.inventory.deleteMany({
          where: { productId: id },
        });

        // Finally delete the product
        await prisma.product.delete({
          where: { id },
        });
      });

      this.logger.log(`Deleted product: ${id}`);
      return {
        id,
        deleted: true,
        message: `Product with ID ${id} successfully deleted`,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error deleting product ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to delete product with ID ${id}`,
      );
    }
  }

  // Product Images methods
  async addImages(
    productId: string,
    images: ProductImageDto[],
  ): Promise<ProductResponseDto> {
    try {
      // Verify product exists
      await this.findOne(productId);

      // Add images in a transaction
      await this.prismaService.$transaction(async (prisma) => {
        // Get current highest position
        const highestPosition = await prisma.productImage.findFirst({
          where: { productId },
          orderBy: { position: 'desc' },
          select: { position: true },
        });

        const startPosition = highestPosition
          ? highestPosition.position + 1
          : 0;

        // Create all images with proper positions
        await Promise.all(
          images.map((image, index) =>
            prisma.productImage.create({
              data: {
                productId,
                imageUrl: image.imageUrl,
                altText:
                  image.altText || `Product image ${startPosition + index}`,
                position:
                  image.position !== undefined
                    ? image.position
                    : startPosition + index,
              },
            }),
          ),
        );
      });

      this.logger.log(`Added ${images.length} images to product: ${productId}`);

      // Return the updated product
      return this.findOne(productId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error adding images to product ${productId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to add images to product with ID ${productId}`,
      );
    }
  }

  async removeImage(
    productId: string,
    imageId: string,
  ): Promise<ProductResponseDto> {
    try {
      // Verify product exists
      await this.findOne(productId);

      // Check if image exists and belongs to the product
      const image = await this.prismaService.productImage.findUnique({
        where: { id: imageId },
      });

      if (!image) {
        throw new NotFoundException(`Image with ID ${imageId} not found`);
      }

      if (image.productId !== productId) {
        throw new BadRequestException(
          `Image with ID ${imageId} does not belong to product with ID ${productId}`,
        );
      }

      // Delete the image
      await this.prismaService.productImage.delete({
        where: { id: imageId },
      });

      this.logger.log(`Removed image ${imageId} from product: ${productId}`);

      // Return the updated product
      return this.findOne(productId);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error removing image ${imageId} from product ${productId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to remove image from product`,
      );
    }
  }

  // Product Variants methods
  async addVariants(
    productId: string,
    variants: CreateProductVariantDto[],
  ): Promise<ProductResponseDto> {
    try {
      // Verify product exists
      const product = await this.findOne(productId);

      // Add variants in a transaction
      await this.prismaService.$transaction(async (prisma) => {
        // Create all variants
        await Promise.all(
          variants.map((variant) =>
            prisma.productVariant.create({
              data: {
                productId,
                variantName: variant.variantName,
                sku:
                  variant.sku ||
                  this.generateVariantSku(product.sku, variant.variantName),
                price: variant.price,
                stockQuantity: variant.stockQuantity,
                additionalPrice: variant.additionalPrice || 0,
              },
            }),
          ),
        );
      });

      this.logger.log(
        `Added ${variants.length} variants to product: ${productId}`,
      );

      // Return the updated product
      return this.findOne(productId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error adding variants to product ${productId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to add variants to product with ID ${productId}`,
      );
    }
  }

  async removeVariant(
    productId: string,
    variantId: string,
  ): Promise<ProductResponseDto> {
    try {
      // Verify product exists
      await this.findOne(productId);

      // Check if variant exists and belongs to the product
      const variant = await this.prismaService.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant) {
        throw new NotFoundException(`Variant with ID ${variantId} not found`);
      }

      if (variant.productId !== productId) {
        throw new BadRequestException(
          `Variant with ID ${variantId} does not belong to product with ID ${productId}`,
        );
      }

      // Check if there are any orders for this variant
      const orderItemsCount = await this.prismaService.orderItem.count({
        where: {
          productId,
          variantId,
        },
      });

      if (orderItemsCount > 0) {
        throw new BadRequestException(
          `Cannot delete variant with ID ${variantId} because it has ${orderItemsCount} associated orders. Consider updating the stock to 0 instead.`,
        );
      }

      // Delete the variant
      await this.prismaService.productVariant.delete({
        where: { id: variantId },
      });

      this.logger.log(
        `Removed variant ${variantId} from product: ${productId}`,
      );

      // Return the updated product
      return this.findOne(productId);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error removing variant ${variantId} from product ${productId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to remove variant from product`,
      );
    }
  }

  // Product Deals methods
  async addDeal(
    productId: string,
    dealDto: CreateProductDealDto,
  ): Promise<ProductResponseDto> {
    try {
      // Verify product exists
      await this.findOne(productId);

      // Validate deal dates
      const startTime = new Date(dealDto.startTime);
      const endTime = new Date(dealDto.endTime);

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        throw new BadRequestException('Invalid start or end time format');
      }

      if (startTime >= endTime) {
        throw new BadRequestException('End time must be after start time');
      }

      // Check for overlapping deals of the same type
      const overlappingDeals = await this.prismaService.productDeal.findMany({
        where: {
          productId,
          dealType: dealDto.dealType,
          OR: [
            {
              // Deal starts during an existing deal
              startTime: { lte: endTime },
              endTime: { gte: startTime },
            },
            {
              // Deal ends during an existing deal
              startTime: { lte: endTime },
              endTime: { gte: startTime },
            },
            {
              // Deal encompasses an existing deal
              startTime: { gte: startTime },
              endTime: { lte: endTime },
            },
          ],
        },
      });

      if (overlappingDeals.length > 0) {
        throw new ConflictException(
          `There is already a ${dealDto.dealType} deal in the specified time range`,
        );
      }

      // Create the deal
      await this.prismaService.productDeal.create({
        data: {
          productId,
          dealType: dealDto.dealType,
          discount: dealDto.discount,
          startTime,
          endTime,
        },
      });

      this.logger.log(
        `Added ${dealDto.dealType} deal to product: ${productId}`,
      );

      // Return the updated product
      return this.findOne(productId);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Error adding deal to product ${productId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to add deal to product with ID ${productId}`,
      );
    }
  }

  async removeDeal(
    productId: string,
    dealId: string,
  ): Promise<ProductResponseDto> {
    try {
      // Verify product exists
      await this.findOne(productId);

      // Check if deal exists and belongs to the product
      const deal = await this.prismaService.productDeal.findUnique({
        where: { id: dealId },
      });

      if (!deal) {
        throw new NotFoundException(`Deal with ID ${dealId} not found`);
      }

      if (deal.productId !== productId) {
        throw new BadRequestException(
          `Deal with ID ${dealId} does not belong to product with ID ${productId}`,
        );
      }

      // Delete the deal
      await this.prismaService.productDeal.delete({
        where: { id: dealId },
      });

      this.logger.log(`Removed deal ${dealId} from product: ${productId}`);

      // Return the updated product
      return this.findOne(productId);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error removing deal ${dealId} from product ${productId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to remove deal from product`,
      );
    }
  }

  // Update product tags
  async updateTags(id: string, tagIds: string[]): Promise<ProductResponseDto> {
    try {
      // Verify product exists
      await this.findOne(id);

      // Update tags in a transaction
      await this.prismaService.$transaction(async (prisma) => {
        // Remove existing tag connections
        await prisma.productTag.deleteMany({
          where: { productId: id },
        });

        // Create new tag connections if any
        if (tagIds && tagIds.length > 0) {
          await Promise.all(
            tagIds.map((tagId) =>
              prisma.productTag.create({
                data: {
                  productId: id,
                  tagId,
                },
              }),
            ),
          );
        }
      });

      this.logger.log(`Updated tags for product: ${id}`);

      // Return the updated product with relations
      return this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error updating tags for product ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to update tags for product with ID ${id}`,
      );
    }
  }

  // Filter generation methods
  async getAvailableFilters(
    filterOptionsDto: FilterOptionsQueryDto,
  ): Promise<FilterOptionsResponseDto> {
    try {
      // Build base where clause from query parameters
      const baseFilter: Prisma.ProductWhereInput = { isActive: true };

      // Apply category filter
      if (filterOptionsDto.categoryId || filterOptionsDto.categorySlug) {
        let categoryIds: string[] = [];

        if (filterOptionsDto.categoryId) {
          categoryIds.push(filterOptionsDto.categoryId);
        } else if (filterOptionsDto.categorySlug) {
          // Find category by slug
          const category = await this.prismaService.category.findUnique({
            where: { slug: filterOptionsDto.categorySlug },
          });

          if (category) {
            categoryIds.push(category.id);
          } else {
            throw new NotFoundException(
              `Category with slug ${filterOptionsDto.categorySlug} not found`,
            );
          }
        }

        // If recursive, include all child categories
        if (filterOptionsDto.recursive && categoryIds.length > 0) {
          const allCategoryIds = await this.getCategoryAndDescendantsIds(
            categoryIds[0],
          );
          categoryIds = allCategoryIds;
        }

        if (categoryIds.length > 0) {
          baseFilter.OR = [
            { categoryId: { in: categoryIds } },
            { subCategoryId: { in: categoryIds } },
          ];
        }
      }

      // Apply brand filter
      if (filterOptionsDto.brandId) {
        baseFilter.brandId = filterOptionsDto.brandId;
      }

      // Apply search filter
      if (filterOptionsDto.search) {
        baseFilter.OR = [
          { title: { contains: filterOptionsDto.search, mode: 'insensitive' } },
          {
            description: {
              contains: filterOptionsDto.search,
              mode: 'insensitive',
            },
          },
          {
            shortDescription: {
              contains: filterOptionsDto.search,
              mode: 'insensitive',
            },
          },
          { sku: { contains: filterOptionsDto.search, mode: 'insensitive' } },
        ];
      }

      // Apply price range if provided
      if (
        filterOptionsDto.minPrice !== undefined ||
        filterOptionsDto.maxPrice !== undefined
      ) {
        baseFilter.price = {};

        if (filterOptionsDto.minPrice !== undefined) {
          baseFilter.price.gte = filterOptionsDto.minPrice;
        }

        if (filterOptionsDto.maxPrice !== undefined) {
          baseFilter.price.lte = filterOptionsDto.maxPrice;
        }
      }

      // Fetch products with relevant relations for filter generation
      const products = await this.prismaService.product.findMany({
        where: baseFilter,
        select: {
          id: true,
          price: true,
          averageRating: true,
          brandId: true,
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
          tags: {
            select: {
              tag: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          specifications: {
            select: {
              id: true,
              specKey: true,
              specValue: true,
              specGroup: true,
              isFilterable: true,
            },
          },
          variants: {
            select: {
              id: true,
              variantName: true,
              price: true,
              stockQuantity: true,
            },
          },
        },
      });

      this.logger.log(
        `Found ${products.length} products for filter generation`,
      );

      // Generate price range
      const priceRange = this.generatePriceRange(products);

      // Generate brand filters
      const brands = this.generateBrandFilters(products);

      // Generate tag filters
      const tags = this.generateTagFilters(products);

      // Generate rating filters
      const ratings = this.generateRatingFilters(products);

      // Generate dynamic attribute filters based on product specifications
      const attributes = this.generateAttributeFilters(products);

      return {
        priceRange,
        brands,
        tags,
        ratings,
        attributes,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error getting available filters: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to get available filters');
    }
  }

  // Helper methods for filter generation
  private generatePriceRange(products: any[]): {
    min: number;
    max: number;
    step: number;
  } {
    if (products.length === 0) {
      return { min: 0, max: 1000, step: 50 };
    }

    // Consider both product base prices and variant prices
    const allPrices: number[] = [];

    // Add base product prices
    products.forEach((product) => {
      allPrices.push(Number(product.price));

      // Add variant prices
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach((variant) => {
          allPrices.push(Number(variant.price));
        });
      }
    });

    const min = Math.floor(Math.min(...allPrices));
    const max = Math.ceil(Math.max(...allPrices));

    // Calculate an appropriate step size based on the price range
    let step: number;
    const range = max - min;

    if (range <= 100) step = 5;
    else if (range <= 500) step = 25;
    else if (range <= 1000) step = 50;
    else if (range <= 5000) step = 250;
    else if (range <= 10000) step = 500;
    else step = 1000;

    return { min, max, step };
  }

  private generateBrandFilters(products: any[]): FilterValueDto[] {
    const brandMap = new Map<
      string,
      { id: string; name: string; count: number }
    >();

    products.forEach((product) => {
      if (product.brand) {
        const brandId = product.brand.id;

        if (brandMap.has(brandId)) {
          const brandData = brandMap.get(brandId);
          if (brandData) {
            brandData.count++;
          }
        } else {
          brandMap.set(brandId, {
            id: brandId,
            name: product.brand.name,
            count: 1,
          });
        }
      }
    });

    // Convert map to array and sort by count (descending)
    return Array.from(brandMap.values()).sort((a, b) => b.count - a.count);
  }

  private generateTagFilters(products: any[]): FilterValueDto[] {
    const tagMap = new Map<
      string,
      { id: string; name: string; count: number }
    >();

    products.forEach((product) => {
      if (product.tags && product.tags.length > 0) {
        product.tags.forEach((tagRelation) => {
          const tag = tagRelation.tag;
          const tagId = tag.id;

          if (tagMap.has(tagId)) {
            const tagData = tagMap.get(tagId);
            if (tagData) {
              tagData.count++;
            }
          } else {
            tagMap.set(tagId, {
              id: tagId,
              name: tag.name,
              count: 1,
            });
          }
        });
      }
    });

    // Convert map to array and sort by count (descending)
    return Array.from(tagMap.values()).sort((a, b) => b.count - a.count);
  }

  private generateRatingFilters(products: any[]): FilterValueDto[] {
    const ratingMap = new Map<
      number,
      { id: string; name: string; count: number }
    >();

    // Initialize ratings from 1-5
    for (let i = 1; i <= 5; i++) {
      ratingMap.set(i, {
        id: i.toString(),
        name: `${i} Stars & Above`,
        count: 0,
      });
    }

    // Count products for each rating level
    products.forEach((product) => {
      if (product.averageRating > 0) {
        // Round to nearest 0.5
        const rating = Math.floor(product.averageRating);

        // Increment count for this rating and all ratings below it
        for (let i = 1; i <= rating; i++) {
          if (ratingMap.has(i)) {
            const ratingData = ratingMap.get(i);
            if (ratingData) {
              ratingData.count++;
            }
          }
        }
      }
    });

    // Convert map to array and sort by rating (descending)
    return Array.from(ratingMap.values()).sort(
      (a, b) => parseInt(b.id) - parseInt(a.id),
    );
  }

  private generateAttributeFilters(products: any[]): AttributeFilterDto[] {
    // Create a map of filterable specification attributes
    // Key format: "{specGroup}:{specKey}"
    const specMap = new Map<string, Map<string, number>>();
    const specGroupNames = new Map<string, string>();

    // Process all product specifications
    products.forEach((product) => {
      if (product.specifications && product.specifications.length > 0) {
        product.specifications.forEach((spec) => {
          // Only consider filterable specifications
          if (spec.isFilterable) {
            const mapKey = `${spec.specGroup}:${spec.specKey}`;
            const valueKey = spec.specValue;

            // Store the spec group display name
            specGroupNames.set(spec.specGroup, spec.specGroup);

            // Initialize the map for this specification if needed
            if (!specMap.has(mapKey)) {
              specMap.set(mapKey, new Map<string, number>());
            }

            // Increment the count for this specification value
            const valueMap = specMap.get(mapKey);
            if (valueMap) {
              valueMap.set(valueKey, (valueMap.get(valueKey) || 0) + 1);
            }
          }
        });
      }
    });

    // Transform the map into AttributeFilterDto objects
    const attributes: AttributeFilterDto[] = [];
    let priority = 10; // Start with priority 10 and increment

    for (const [mapKey, valueMap] of specMap.entries()) {
      // Skip if the specification only has 1 value (not useful for filtering)
      if (valueMap.size <= 1) continue;

      const [specGroup, specKey] = mapKey.split(':');

      // Create an array of filter values from the value map
      const values: FilterValueDto[] = Array.from(valueMap.entries())
        .map(([value, count]) => ({
          id: value,
          name: value,
          count,
        }))
        .sort((a, b) => b.count - a.count);

      // Add the attribute filter
      attributes.push({
        name: this.formatSpecKey(specKey),
        key: specKey,
        type: 'checkbox', // Default to checkbox type
        priority: priority++,
        values,
      });
    }

    return attributes.sort((a, b) => a.priority - b.priority);
  }

  private formatSpecKey(key: string): string {
    // Convert camelCase or snake_case to readable format
    return key
      .replace(/([A-Z])/g, ' $1') // Insert space before capital letters
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter
  }

  // Helper method to transform a product to DTO format
  private transformProductToDto(product: any): ProductResponseDto {
    // Transform tags
    const tags = product.tags
      ? product.tags.map((productTag) => ({
          id: productTag.tag.id,
          name: productTag.tag.name,
          createdAt: productTag.createdAt,
        }))
      : [];

    // Return the transformed product
    return {
      ...product,
      tags,
      // Any other transformations needed...
    };
  }

  // Helper to generate SKU
  private generateSku(title: string): string {
    const prefix = title
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();

    return `${prefix}-${timestamp}-${random}`;
  }

  // Helper to generate variant SKU
  private generateVariantSku(baseSku: string, variantName: string): string {
    const variantSuffix = variantName
      .substring(0, 5)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .padEnd(5, 'X');

    return `${baseSku}-${variantSuffix}`;
  }

  // Helper method to get a category and all its descendants
  private async getCategoryAndDescendantsIds(
    categoryId: string,
  ): Promise<string[]> {
    try {
      const category = await this.prismaService.category.findUnique({
        where: { id: categoryId },
        include: {
          children: true,
        },
      });

      if (!category) {
        return [];
      }

      // Start with the current category ID
      const categoryIds = [category.id];

      // Recursively get all descendant IDs
      const getChildIds = async (parentId: string): Promise<string[]> => {
        const children = await this.prismaService.category.findMany({
          where: { parentId },
          select: { id: true },
        });

        const childIds = children.map((child) => child.id);

        // Recursively get descendants for each child
        const descendantPromises = children.map((child) =>
          getChildIds(child.id),
        );
        const descendantIds = await Promise.all(descendantPromises);

        // Flatten and return all IDs
        return [...childIds, ...descendantIds.flat()];
      };

      // Get all descendant category IDs
      const descendantIds = await getChildIds(category.id);
      return [...categoryIds, ...descendantIds];
    } catch (error) {
      this.logger.error(
        `Error getting category hierarchy: ${error.message}`,
        error.stack,
      );
      return [categoryId]; // Fallback to just the original ID
    }
  }
}
