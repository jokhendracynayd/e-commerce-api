import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(
    page = 1,
    limit = 10,
    categoryId?: string,
    search?: string,
    minPrice?: number,
    maxPrice?: number,
    sortBy = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<{ products: any[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [products, total] = await Promise.all([
      this.prismaService.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: true,
          images: true,
        },
      }),
      this.prismaService.product.count({ where }),
    ]);

    return {
      products,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<any> {
    const product = await this.prismaService.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: true,
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
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async create(data: {
    name: string;
    description: string;
    price: number;
    stock: number;
    images: string[];
    categoryId: string;
  }): Promise<any> {
    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Generate SKU - simple implementation using timestamp and random chars
    const sku = `SKU-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    
    const productData = {
      title: data.name,
      slug,
      description: data.description,
      shortDescription: data.description.substring(0, 150) + '...',
      price: data.price,
      sku,
      stockQuantity: data.stock,
    };
    
    if (data.categoryId) {
      Object.assign(productData, {
        category: { connect: { id: data.categoryId } }
      });
    }
    
    // Create product first
    const product = await this.prismaService.product.create({
      data: productData,
    });
    
    // Then create images for the product
    if (data.images && data.images.length > 0) {
      await Promise.all(
        data.images.map((imageUrl, index) => 
          this.prismaService.productImage.create({
            data: {
              productId: product.id,
              imageUrl,
              position: index,
              altText: `${data.name} - Image ${index + 1}`
            }
          })
        )
      );
    }
    
    // Return the product with images
    return this.findOne(product.id);
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      price: number;
      stock: number;
      images: string[];
      categoryId: string;
    }>,
  ): Promise<any> {
    const existingProduct = await this.findOne(id);
    
    const updateData: any = {};
    
    // Handle title and slug
    if (data.name) {
      updateData.title = data.name;
      updateData.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    
    // Handle description
    if (data.description) {
      updateData.description = data.description;
      updateData.shortDescription = data.description.substring(0, 150) + '...';
    }
    
    // Handle price
    if (data.price !== undefined) {
      updateData.price = data.price;
    }
    
    // Handle stock
    if (data.stock !== undefined) {
      updateData.stockQuantity = data.stock;
    }
    
    // Handle category
    if (data.categoryId) {
      updateData.category = { connect: { id: data.categoryId } };
    }
    
    // Update the product
    const updatedProduct = await this.prismaService.product.update({
      where: { id },
      data: updateData,
    });
    
    // Handle images if provided
    if (data.images && data.images.length > 0) {
      // Delete existing images
      await this.prismaService.productImage.deleteMany({
        where: { productId: id }
      });
      
      // Create new images
      await Promise.all(
        data.images.map((imageUrl, index) => 
          this.prismaService.productImage.create({
            data: {
              productId: id,
              imageUrl,
              position: index,
              altText: `${updatedProduct.title} - Image ${index + 1}`
            }
          })
        )
      );
    }
    
    // Return the updated product with images
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    
    // Delete all images first
    await this.prismaService.productImage.deleteMany({
      where: { productId: id }
    });
    
    // Then delete the product
    await this.prismaService.product.delete({ where: { id } });
  }
} 