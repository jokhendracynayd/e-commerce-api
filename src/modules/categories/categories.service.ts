import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.category.findMany({
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prismaService.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        products: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async create(data: { name: string; description?: string; parentId?: string }) {
    // Generate a slug from name (simple implementation)
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
      
    return this.prismaService.category.create({
      data: {
        name: data.name,
        slug, // Add slug
        description: data.description,
        parent: data.parentId ? { connect: { id: data.parentId } } : undefined,
      },
      include: {
        parent: true,
      },
    });
  }

  async update(id: string, data: { name?: string; description?: string; parentId?: string }) {
    await this.findOne(id);
    
    // If name is provided, update slug as well
    const updateData: any = { ...data };
    if (data.name) {
      updateData.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    
    // Handle parent relationship correctly
    if (data.parentId !== undefined) {
      updateData.parent = data.parentId 
        ? { connect: { id: data.parentId } } 
        : { disconnect: true };
      delete updateData.parentId;
    }

    return this.prismaService.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    
    // First check if there are any products in this category
    const productsCount = await this.prismaService.product.count({
      where: { categoryId: id },
    });

    if (productsCount > 0) {
      throw new Error(`Cannot delete category with ${productsCount} products`);
    }

    // Check if there are any child categories
    const childrenCount = await this.prismaService.category.count({
      where: { parentId: id },
    });

    if (childrenCount > 0) {
      throw new Error(`Cannot delete category with ${childrenCount} child categories`);
    }

    await this.prismaService.category.delete({ where: { id } });
  }
} 