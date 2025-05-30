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
}
