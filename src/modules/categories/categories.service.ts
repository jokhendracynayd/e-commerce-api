import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Category, Prisma } from '@prisma/client';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryTreeResponseDto,
} from './dto';
import { AppLogger } from '../../common/services/logger.service';
import slugify from '../../common/utils/slugify';
import {
  CategoryTreeNode,
  CategoryWithRelations,
} from './interfaces/category.interface';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('CategoriesService');
  }

  async findAll(includeInactive = false): Promise<CategoryWithRelations[]> {
    try {
      return await this.prismaService.category.findMany({
        include: {
          parent: true,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error retrieving categories: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to retrieve categories');
    }
  }

  async findOne(id: string): Promise<CategoryWithRelations> {
    try {
      const category = await this.prismaService.category.findUnique({
        where: { id },
        include: {
          parent: true,
          children: true,
        },
      });

      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      return category;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error retrieving category ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve category with ID ${id}`,
      );
    }
  }

  async findBySlug(slug: string): Promise<CategoryWithRelations> {
    try {
      const category = await this.prismaService.category.findUnique({
        where: { slug },
        include: {
          parent: true,
          children: true,
        },
      });

      if (!category) {
        throw new NotFoundException(`Category with slug '${slug}' not found`);
      }

      return category;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error retrieving category by slug ${slug}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve category with slug '${slug}'`,
      );
    }
  }

  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryWithRelations> {
    try {
      // Generate slug from name
      const slug = slugify(createCategoryDto.name);

      // Check if slug already exists
      const existingCategory = await this.prismaService.category.findUnique({
        where: { slug },
      });

      if (existingCategory) {
        throw new ConflictException(
          `Category with slug '${slug}' already exists`,
        );
      }

      // Verify parent exists if parentId is provided
      if (createCategoryDto.parentId) {
        const parentExists = await this.prismaService.category.findUnique({
          where: { id: createCategoryDto.parentId },
        });

        if (!parentExists) {
          throw new BadRequestException(
            `Parent category with ID ${createCategoryDto.parentId} does not exist`,
          );
        }
      }

      const createdCategory = await this.prismaService.category.create({
        data: {
          name: createCategoryDto.name,
          slug,
          description: createCategoryDto.description,
          icon: createCategoryDto.icon,
          parentId: createCategoryDto.parentId,
        },
        include: {
          parent: true,
        },
      });

      this.logger.log(
        `Created category: ${createdCategory.id} - ${createdCategory.name}`,
      );
      return createdCategory;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error creating category: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to create category');
    }
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryWithRelations> {
    try {
      // Verify category exists
      await this.findOne(id);

      const updateData: Prisma.CategoryUpdateInput = { ...updateCategoryDto };

      // If name is provided, update slug as well
      if (updateCategoryDto.name) {
        const slug = slugify(updateCategoryDto.name);

        // Check if new slug would conflict with existing category
        const existingCategory = await this.prismaService.category.findFirst({
          where: {
            slug,
            id: { not: id },
          },
        });

        if (existingCategory) {
          throw new ConflictException(
            `Another category with slug '${slug}' already exists`,
          );
        }

        updateData.slug = slug;
      }

      // Verify parent exists if parentId is provided
      if (updateCategoryDto.parentId) {
        // Prevent circular reference (category can't be its own parent)
        if (updateCategoryDto.parentId === id) {
          throw new BadRequestException('Category cannot be its own parent');
        }

        const parentExists = await this.prismaService.category.findUnique({
          where: { id: updateCategoryDto.parentId },
        });

        if (!parentExists) {
          throw new BadRequestException(
            `Parent category with ID ${updateCategoryDto.parentId} does not exist`,
          );
        }

        // Check for circular reference in the hierarchy
        await this.preventCircularReference(id, updateCategoryDto.parentId);
      }

      const updatedCategory = await this.prismaService.category.update({
        where: { id },
        data: updateData,
        include: {
          parent: true,
          children: true,
        },
      });

      this.logger.log(`Updated category: ${id} - ${updatedCategory.name}`);
      return updatedCategory;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Error updating category ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to update category with ID ${id}`,
      );
    }
  }

  async remove(
    id: string,
  ): Promise<{ id: string; deleted: boolean; message: string }> {
    try {
      // Verify category exists
      await this.findOne(id);

      // Check if there are any products in this category
      const productsCount = await this.prismaService.product.count({
        where: {
          OR: [{ categoryId: id }, { subCategoryId: id }],
        },
      });

      if (productsCount > 0) {
        throw new BadRequestException(
          `Cannot delete category with ${productsCount} associated products`,
        );
      }

      // Check if there are any child categories
      const childrenCount = await this.prismaService.category.count({
        where: { parentId: id },
      });

      if (childrenCount > 0) {
        throw new BadRequestException(
          `Cannot delete category with ${childrenCount} child categories. Remove child categories first.`,
        );
      }

      await this.prismaService.category.delete({ where: { id } });
      this.logger.log(`Deleted category: ${id}`);

      return { id, deleted: true, message: 'Category deleted successfully' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error deleting category ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to delete category with ID ${id}`,
      );
    }
  }

  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    try {
      // Get all root categories (those without a parent)
      const rootCategories = await this.prismaService.category.findMany({
        where: {
          parentId: null,
        },
      });

      // Build the tree structure recursively
      const categoryTree: CategoryTreeNode[] = [];

      for (const rootCategory of rootCategories) {
        const treeNode = await this.buildCategoryTreeNode(rootCategory.id);
        categoryTree.push(treeNode);
      }

      return categoryTree;
    } catch (error) {
      this.logger.error(
        `Error getting category tree: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve category tree',
      );
    }
  }

  async getParentTree(categoryId: string): Promise<Category[]> {
    try {
      const category = await this.findOne(categoryId);
      const breadcrumb: Category[] = [category];

      let currentCategory = category;

      // Traverse up the category hierarchy
      while (currentCategory.parentId) {
        const parent = await this.prismaService.category.findUnique({
          where: { id: currentCategory.parentId },
        });

        if (!parent) break;

        breadcrumb.unshift(parent);
        currentCategory = parent;
      }

      return breadcrumb;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error getting parent tree for category ${categoryId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve parent tree for category with ID ${categoryId}`,
      );
    }
  }

  // Helper methods
  private async buildCategoryTreeNode(
    categoryId: string,
  ): Promise<CategoryTreeNode> {
    const category = await this.prismaService.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    const children = await this.prismaService.category.findMany({
      where: { parentId: categoryId },
    });

    const result: CategoryTreeNode = {
      ...category,
      children: [],
    };

    if (children.length > 0) {
      for (const child of children) {
        const childNode = await this.buildCategoryTreeNode(child.id);
        result.children.push(childNode);
      }
    }

    return result;
  }

  private async preventCircularReference(
    categoryId: string,
    newParentId: string,
  ): Promise<void> {
    let currentParent = newParentId;
    const visitedIds = new Set([categoryId]);

    // Traverse up the tree to ensure the new parent doesn't lead back to this category
    while (currentParent) {
      if (visitedIds.has(currentParent)) {
        throw new BadRequestException(
          'Circular reference detected in category hierarchy',
        );
      }

      visitedIds.add(currentParent);

      const parent = await this.prismaService.category.findUnique({
        where: { id: currentParent },
        select: { parentId: true },
      });

      if (!parent || parent.parentId === null) break;
      currentParent = parent.parentId;
    }
  }

  async getCategoryProductsRecursive(
    categoryId: string, 
    options?: { 
      limit?: number; 
      page?: number;
      sortBy?: 'price' | 'title' | 'rating';
      sortOrder?: 'asc' | 'desc';
      minPrice?: number;
      maxPrice?: number;
      search?: string;
      featured?: boolean;
    }
  ): Promise<any> {
    try {
      // First verify the category exists
      const rootCategory = await this.findOne(categoryId);
      
      // Set default pagination values
      const limit = options?.limit || 20;
      const page = options?.page || 1;
      const sortBy = options?.sortBy || 'title';
      const sortOrder = options?.sortOrder || 'asc';
      
      // Get all products for root category to build hierarchy
      const result = await this.collectAllCategoryProducts(categoryId);
      // Fetch direct child categories for interleaving
      const childCategories = await this.prismaService.category.findMany({ where: { parentId: categoryId } });
      
      // Collect, filter, and sort products per child category
      const groupProductsArray = await Promise.all(
        childCategories.map(async child => {
          const { allProducts: groupAll } = await this.collectAllCategoryProducts(child.id);
          let group = [...groupAll];
          // Price filter
          if (options?.minPrice !== undefined || options?.maxPrice !== undefined) {
            const minPrice = options?.minPrice ?? -Infinity;
            const maxPrice = options?.maxPrice ?? Infinity;
            group = group.filter(p => {
              const pr = parseFloat(p.price);
              return pr >= minPrice && pr <= maxPrice;
            });
          }
          // Search filter
          if (options?.search) {
            const term = options.search.toLowerCase();
            group = group.filter(p => p.title.toLowerCase().includes(term));
          }
          // Featured filter
          if (options?.featured !== undefined) {
            group = group.filter(p => p.isFeatured === options.featured);
          }
          // Sort group
          if (sortBy === 'price') {
            group.sort((a, b) => sortOrder === 'asc'
              ? parseFloat(a.price) - parseFloat(b.price)
              : parseFloat(b.price) - parseFloat(a.price)
            );
          } else if (sortBy === 'title') {
            group.sort((a, b) => sortOrder === 'asc'
              ? a.title.localeCompare(b.title)
              : b.title.localeCompare(a.title)
            );
          } else if (sortBy === 'rating') {
            group.sort((a, b) => sortOrder === 'asc'
              ? (a.rating || 0) - (b.rating || 0)
              : (b.rating || 0) - (a.rating || 0)
            );
          }
          return group;
        })
      );
      // Round-robin interleaving across child groups
      const interleaved: any[] = [];
      const seenIds = new Set<string>();
      let idx = 0;
      while (interleaved.length < limit) {
        let addedInRound = false;
        for (const group of groupProductsArray) {
          const prod = group[idx];
          if (prod && !seenIds.has(prod.id)) {
            interleaved.push(prod);
            seenIds.add(prod.id);
            addedInRound = true;
            if (interleaved.length === limit) break;
          }
        }
        if (!addedInRound) break;
        idx++;
      }
      // Fallback: if interleaved not enough, append from all root products
      if (interleaved.length < limit) {
        for (const prod of result.allProducts) {
          if (interleaved.length >= limit) break;
          if (!seenIds.has(prod.id)) {
            interleaved.push(prod);
            seenIds.add(prod.id);
          }
        }
      }
      // Pagination metadata
      const totalProducts = result.allProducts.length;
      const totalPages = Math.ceil(totalProducts / limit);
      // Return interleaved products
      return {
        success: true,
        data: {
          id: rootCategory.id,
          name: rootCategory.name,
          slug: rootCategory.slug,
          description: rootCategory.description,
          icon: rootCategory.icon,
          products: interleaved,
          categories: result.categoryHierarchy,
          pagination: {
            total: totalProducts,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            sortBy,
            sortOrder
          },
          filters: {
            minPrice: options?.minPrice,
            maxPrice: options?.maxPrice,
            search: options?.search,
            featured: options?.featured
          }
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error getting recursive products for category ${categoryId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve recursive products for category with ID ${categoryId}`,
      );
    }
  }

  private async collectAllCategoryProducts(categoryId: string): Promise<{ 
    allProducts: any[]; 
    categoryHierarchy: any;
  }> {
    // Keep track of all products to avoid duplicates
    const productMap = new Map();
    
    // Get the category with its direct products
    const category = await this.prismaService.category.findUnique({
      where: { id: categoryId },
      include: {
        products: {
          where: {
            // Only include active products with PUBLIC visibility
            isActive: true,
            visibility: 'PUBLIC'
          },
          include: {
            brand: true,
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
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    // Get direct child categories
    const childCategories = await this.prismaService.category.findMany({
      where: { parentId: categoryId },
    });

    // Transform products to a standard format and add to map
    const transformedProducts = category.products.map(product => 
      this.transformProduct(product)
    );
    
    // Add products to the map to avoid duplicates
    transformedProducts.forEach(product => {
      productMap.set(product.id, product);
    });

    // Create category hierarchy for reference
    const categoryHierarchy: any = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      children: [],
    };

    // Process children recursively
    if (childCategories.length > 0) {
      for (const child of childCategories) {
        const childResult = await this.collectAllCategoryProducts(child.id);
        
        // Add child category to hierarchy
        categoryHierarchy.children.push(childResult.categoryHierarchy);
        
        // Add child products to the map (Map automatically handles duplicates)
        childResult.allProducts.forEach(product => {
          productMap.set(product.id, product);
        });
      }
    }

    // Convert map to array
    const allProducts = Array.from(productMap.values());
    
    return {
      allProducts,
      categoryHierarchy,
    };
  }

  private transformProduct(product: any): any {
    // Handle prices safely
    const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
    const discountPrice = product.discountPrice ? 
      (typeof product.discountPrice === 'string' ? parseFloat(product.discountPrice) : product.discountPrice) : 
      null;
    
    // Calculate badge from product data
    let badge: string | undefined = undefined;
    
    // First check for featured status
    if (product.isFeatured === true) {
      badge = 'Featured';
    } 
    // Then check for sale status if it has a discount
    else if (discountPrice && price && (price - discountPrice) / price > 0.05) {
      badge = 'Sale';
    }
    // Finally check for new items 
    else if (product.visibility === 'NEW') {
      badge = 'New';
    }
    
    // Only include rating and review count if they have meaningful values
    const rating = product.averageRating && product.averageRating > 0 ? product.averageRating : undefined;
    const reviewCount = product.reviewCount && product.reviewCount > 0 ? product.reviewCount : undefined;

    // Determine originalPrice based on available data
    let originalPrice: number | undefined = undefined;
    
    // Case 1: Product has a discountPrice that's less than the regular price
    if (discountPrice && price && discountPrice < price) {
      originalPrice = price;
    } 
    // Case 2: Product is featured - set artificial original price
    else if (product.isFeatured === true && price) {
      originalPrice = parseFloat((price * 1.10).toFixed(2)); // 10% higher
    }
    // Case 3: Check if we should set Sale badge and add original price
    else if (price) {
      // Special handling for Apple products - always show at 10% off
      if (product.title.toLowerCase().includes('iphone') && !originalPrice) {
        badge = 'Sale';
        originalPrice = parseFloat((price * 1.10).toFixed(2)); // 10% higher
      }
      // If we've calculated a Sale badge but no originalPrice, create one
      else if (badge === 'Sale' && !originalPrice) {
        originalPrice = parseFloat((price * 1.15).toFixed(2)); // 15% higher
      }
    }
    
    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      price: discountPrice || price,
      originalPrice: originalPrice,
      currency: product.currency || 'INR',
      images: product.images.map(img => ({
        id: img.id,
        imageUrl: img.imageUrl,
        altText: img.altText
      })),
      badge: badge,
      rating: rating,
      reviewCount: reviewCount,
      isAssured: product.isAssured === true,
      hasFreeDel: product.freeShipping === true,
      isFeatured: product.isFeatured === true,
    };
  }

  private async buildCategoryTreeWithProducts(categoryId: string): Promise<any> {
    // Get the category
    const category = await this.prismaService.category.findUnique({
      where: { id: categoryId },
      include: {
        products: {
          where: {
            // Only include active products with PUBLIC visibility
            isActive: true,
            visibility: 'PUBLIC'
          },
          include: {
            brand: true,
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
          // Limit to reasonable number to prevent huge responses
          take: 20,
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    // Get direct child categories
    const childCategories = await this.prismaService.category.findMany({
      where: { parentId: categoryId },
    });

    // Transform products to a standard format
    const transformedProducts = category.products.map(product => this.transformProduct(product));

    // Create result structure
    const result: any = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      products: transformedProducts,
      children: [],
    };

    // Process children recursively
    if (childCategories.length > 0) {
      for (const child of childCategories) {
        const childNode = await this.buildCategoryTreeWithProducts(child.id);
        
        // If child has no products of its own, inherit parent's products (without duplication)
        if (childNode.products.length === 0 && transformedProducts.length > 0) {
          childNode.products = [...transformedProducts];
          childNode.inheritedFromParent = true;
        }
        
        result.children.push(childNode);
      }
    }

    return result;
  }
}
