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
} from './dto';
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

      // Filter by category
      if (categoryId) {
        where.categoryId = categoryId;
      }

      // Filter by subcategory
      if (subCategoryId) {
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
      orderBy[sortBy] = sortOrder;

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

      return this.transformProductToDto(product);
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

      return this.transformProductToDto(product);
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
      // Generate slug from title
      const slug = slugify(createProductDto.title);

      // Check if slug already exists
      const existingProduct = await this.prismaService.product.findUnique({
        where: { slug },
      });

      if (existingProduct) {
        throw new ConflictException(
          `Product with slug '${slug}' already exists`,
        );
      }

      // Generate SKU if not provided
      const sku =
        createProductDto.sku || this.generateSku(createProductDto.title);

      // Prepare base product data
      const productData: Prisma.ProductCreateInput = {
        title: createProductDto.title,
        slug,
        description: createProductDto.description,
        shortDescription:
          createProductDto.shortDescription ||
          (createProductDto.description
            ? createProductDto.description.substring(0, 150) + '...'
            : null),
        price: createProductDto.price,
        discountPrice: createProductDto.discountPrice,
        currency: createProductDto.currency || 'USD',
        stockQuantity: createProductDto.stockQuantity || 0,
        sku,
        barcode: createProductDto.barcode,
        weight: createProductDto.weight,
        dimensions: createProductDto.dimensions as any,
        isActive:
          createProductDto.isActive !== undefined
            ? createProductDto.isActive
            : true,
        isFeatured: createProductDto.isFeatured || false,
        visibility: createProductDto.visibility || ProductVisibility.PUBLIC,
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
      // Verify product exists
      await this.findOne(id);

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
  async updateTags(
    id: string,
    tagIds: string[],
  ): Promise<ProductResponseDto> {
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
}
