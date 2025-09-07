import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateBrandDto, UpdateBrandDto, BrandResponseDto } from './dto';
import { AppLogger } from '../../common/services/logger.service';
import slugify from '../../common/utils/slugify';

@Injectable()
export class BrandsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('BrandsService');
  }

  async findAll(includeProductCount = false): Promise<BrandResponseDto[]> {
    try {
      if (includeProductCount) {
        // Use a single query with aggregation to get product counts
        const brandsWithProductCount = await this.prismaService.brand.findMany({
          orderBy: {
            name: 'asc',
          },
          include: {
            _count: {
              select: {
                products: true,
              },
            },
          },
        });

        return brandsWithProductCount.map(brand => ({
          ...brand,
          productCount: brand._count.products,
        }));
      }

      const brands = await this.prismaService.brand.findMany({
        orderBy: {
          name: 'asc',
        },
      });

      return brands;
    } catch (error) {
      this.logger.error(
        `Error retrieving brands: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to retrieve brands');
    }
  }

  async findOne(
    id: string,
    includeProductCount = false,
  ): Promise<BrandResponseDto> {
    try {
      if (includeProductCount) {
        const brand = await this.prismaService.brand.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                products: true,
              },
            },
          },
        });

        if (!brand) {
          throw new NotFoundException(`Brand with ID ${id} not found`);
        }

        return {
          ...brand,
          productCount: brand._count.products,
        };
      }

      const brand = await this.prismaService.brand.findUnique({
        where: { id },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }

      return brand;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error retrieving brand ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve brand with ID ${id}`,
      );
    }
  }

  async findBySlug(
    slug: string,
    includeProductCount = false,
  ): Promise<BrandResponseDto> {
    try {
      if (includeProductCount) {
        const brand = await this.prismaService.brand.findUnique({
          where: { slug },
          include: {
            _count: {
              select: {
                products: true,
              },
            },
          },
        });

        if (!brand) {
          throw new NotFoundException(`Brand with slug '${slug}' not found`);
        }

        return {
          ...brand,
          productCount: brand._count.products,
        };
      }

      const brand = await this.prismaService.brand.findUnique({
        where: { slug },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with slug '${slug}' not found`);
      }

      return brand;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error retrieving brand by slug ${slug}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve brand with slug '${slug}'`,
      );
    }
  }

  async create(createBrandDto: CreateBrandDto): Promise<BrandResponseDto> {
    try {
      // Generate slug from name
      const slug = slugify(createBrandDto.name);

      // Check if slug already exists
      const existingBrand = await this.prismaService.brand.findUnique({
        where: { slug },
      });

      if (existingBrand) {
        throw new ConflictException(`Brand with slug '${slug}' already exists`);
      }

      const createdBrand = await this.prismaService.brand.create({
        data: {
          name: createBrandDto.name,
          slug,
          description: createBrandDto.description,
          logo: createBrandDto.logo,
          website: createBrandDto.website,
          isFeatured: createBrandDto.isFeatured,
        },
      });

      this.logger.log(
        `Created brand: ${createdBrand.id} - ${createdBrand.name}`,
      );
      return createdBrand;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error creating brand: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create brand');
    }
  }

  async update(
    id: string,
    updateBrandDto: UpdateBrandDto,
  ): Promise<BrandResponseDto> {
    try {
      // Verify brand exists
      await this.findOne(id);

      const updateData: Prisma.BrandUpdateInput = { ...updateBrandDto };

      // If name is provided, update slug as well
      if (updateBrandDto.name) {
        const slug = slugify(updateBrandDto.name);

        // Check if new slug would conflict with existing brand
        const existingBrand = await this.prismaService.brand.findFirst({
          where: {
            slug,
            id: { not: id },
          },
        });

        if (existingBrand) {
          throw new ConflictException(
            `Another brand with slug '${slug}' already exists`,
          );
        }

        updateData.slug = slug;
      }

      const updatedBrand = await this.prismaService.brand.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(`Updated brand: ${id} - ${updatedBrand.name}`);
      return updatedBrand;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Error updating brand ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to update brand with ID ${id}`,
      );
    }
  }

  async remove(
    id: string,
  ): Promise<{ id: string; deleted: boolean; message: string }> {
    try {
      // Verify brand exists
      await this.findOne(id);

      // Check if there are any products associated with this brand
      const productsCount = await this.prismaService.product.count({
        where: { brandId: id },
      });

      if (productsCount > 0) {
        throw new BadRequestException(
          `Cannot delete brand with ID ${id} because it has ${productsCount} associated products`,
        );
      }

      await this.prismaService.brand.delete({
        where: { id },
      });

      this.logger.log(`Deleted brand: ${id}`);
      return {
        id,
        deleted: true,
        message: `Brand with ID ${id} successfully deleted`,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error deleting brand ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to delete brand with ID ${id}`,
      );
    }
  }
}
