import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateSpecificationTemplateDto,
  CreateProductSpecificationDto,
  CreateProductSpecificationBulkDto,
} from './dto';

@Injectable()
export class SpecificationsService {
  constructor(private prisma: PrismaService) {}

  // ===== Specification Template Methods =====

  async createSpecificationTemplate(dto: CreateSpecificationTemplateDto) {
    // Check if the category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(
        `Category with ID ${dto.categoryId} not found`,
      );
    }

    // Check if a template with the same key already exists for this category
    // Use type assertion to work around TypeScript error
    const existingTemplate = await (
      this.prisma as any
    ).specificationTemplate.findUnique({
      where: {
        categoryId_specKey: {
          categoryId: dto.categoryId,
          specKey: dto.specKey,
        },
      },
    });

    if (existingTemplate) {
      throw new ConflictException(
        `A specification template with key '${dto.specKey}' already exists for this category`,
      );
    }

    // Create the new template
    return (this.prisma as any).specificationTemplate.create({
      data: {
        categoryId: dto.categoryId,
        specKey: dto.specKey,
        displayName: dto.displayName,
        specGroup: dto.specGroup,
        sortOrder: dto.sortOrder || 0,
        isRequired: dto.isRequired || false,
        isFilterable: dto.isFilterable || false,
        dataType: dto.dataType || 'string',
        options: dto.options || Prisma.JsonNull,
      },
    });
  }

  async getSpecificationTemplatesByCategoryId(categoryId: string) {
    // Check if the category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    // Get all templates for this category
    return (this.prisma as any).specificationTemplate.findMany({
      where: { categoryId },
      orderBy: [{ specGroup: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async deleteSpecificationTemplate(id: string) {
    // Check if the template exists
    const template = await (
      this.prisma as any
    ).specificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(
        `Specification template with ID ${id} not found`,
      );
    }

    // Delete the template
    return (this.prisma as any).specificationTemplate.delete({
      where: { id },
    });
  }

  // ===== Product Specification Methods =====

  async createProductSpecification(dto: CreateProductSpecificationDto) {
    // Check if the product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    // Check if a spec with the same key already exists for this product
    const existingSpec = await (
      this.prisma as any
    ).productSpecification.findUnique({
      where: {
        productId_specKey: {
          productId: dto.productId,
          specKey: dto.specKey,
        },
      },
    });

    if (existingSpec) {
      throw new ConflictException(
        `A specification with key '${dto.specKey}' already exists for this product`,
      );
    }

    // Create the specification
    return (this.prisma as any).productSpecification.create({
      data: {
        productId: dto.productId,
        specKey: dto.specKey,
        specValue: dto.specValue,
        specGroup: dto.specGroup,
        sortOrder: dto.sortOrder || 0,
        isFilterable: dto.isFilterable || false,
      },
    });
  }

  async createProductSpecificationsBulk(
    dto: CreateProductSpecificationBulkDto,
  ) {
    if (!dto.specifications || dto.specifications.length === 0) {
      throw new BadRequestException('No specifications provided');
    }

    // Group specifications by productId for better validation
    const specsByProductId = dto.specifications.reduce(
      (acc, spec) => {
        if (!acc[spec.productId]) {
          acc[spec.productId] = [];
        }
        acc[spec.productId].push(spec);
        return acc;
      },
      {} as Record<string, CreateProductSpecificationDto[]>,
    );

    // Validate each product exists
    const productIds = Object.keys(specsByProductId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });

    const foundProductIds = products.map((p) => p.id);
    const missingProductIds = productIds.filter(
      (id) => !foundProductIds.includes(id),
    );

    if (missingProductIds.length > 0) {
      throw new NotFoundException(
        `Products with IDs ${missingProductIds.join(', ')} not found`,
      );
    }

    // Execute as transaction
    return this.prisma.$transaction(
      productIds.flatMap((productId) => {
        const specs = specsByProductId[productId];
        return specs.map((spec) =>
          (this.prisma as any).productSpecification.upsert({
            where: {
              productId_specKey: {
                productId: spec.productId,
                specKey: spec.specKey,
              },
            },
            update: {
              specValue: spec.specValue,
              specGroup: spec.specGroup,
              sortOrder: spec.sortOrder || 0,
              isFilterable: spec.isFilterable || false,
            },
            create: {
              productId: spec.productId,
              specKey: spec.specKey,
              specValue: spec.specValue,
              specGroup: spec.specGroup,
              sortOrder: spec.sortOrder || 0,
              isFilterable: spec.isFilterable || false,
            },
          }),
        );
      }),
    );
  }

  async getProductSpecifications(productId: string) {
    // Check if the product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Get specifications for this product
    return (this.prisma as any).productSpecification.findMany({
      where: { productId },
      orderBy: [{ specGroup: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async getGroupedProductSpecifications(productId: string) {
    const specs = await this.getProductSpecifications(productId);

    // Group by specGroup
    const grouped = specs.reduce(
      (acc, spec) => {
        if (!acc[spec.specGroup]) {
          acc[spec.specGroup] = [];
        }
        acc[spec.specGroup].push(spec);
        return acc;
      },
      {} as Record<string, any[]>,
    );

    // Transform to response format
    return Object.entries(grouped).map(([groupName, specifications]) => ({
      groupName,
      specifications,
    }));
  }

  async updateProductSpecification(
    id: string,
    dto: Partial<CreateProductSpecificationDto>,
  ) {
    // Check if the specification exists
    const spec = await (this.prisma as any).productSpecification.findUnique({
      where: { id },
    });

    if (!spec) {
      throw new NotFoundException(`Specification with ID ${id} not found`);
    }

    // Update the specification
    return (this.prisma as any).productSpecification.update({
      where: { id },
      data: {
        specValue: dto.specValue !== undefined ? dto.specValue : undefined,
        specGroup: dto.specGroup !== undefined ? dto.specGroup : undefined,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : undefined,
        isFilterable:
          dto.isFilterable !== undefined ? dto.isFilterable : undefined,
      },
    });
  }

  async deleteProductSpecification(id: string) {
    // Check if the specification exists
    const spec = await (this.prisma as any).productSpecification.findUnique({
      where: { id },
    });

    if (!spec) {
      throw new NotFoundException(`Specification with ID ${id} not found`);
    }

    // Delete the specification
    return (this.prisma as any).productSpecification.delete({
      where: { id },
    });
  }

  async deleteAllProductSpecifications(productId: string) {
    // Check if the product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Delete all specifications for this product
    await (this.prisma as any).productSpecification.deleteMany({
      where: { productId },
    });

    return {
      deleted: true,
      message: `All specifications for product ${productId} deleted`,
    };
  }
}
