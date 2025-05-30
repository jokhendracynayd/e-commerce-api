import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateTagDto, UpdateTagDto, TagResponseDto } from './dto';
import { AppLogger } from '../../common/services/logger.service';
import slugify from '../../common/utils/slugify';

@Injectable()
export class TagsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('TagsService');
  }

  async findAll(includeProductCount = false): Promise<TagResponseDto[]> {
    try {
      const tags = await this.prismaService.tag.findMany({
        orderBy: {
          name: 'asc',
        },
      });

      // Transform tags to match TagResponseDto
      const tagsResponse = tags.map((tag) => ({
        ...tag,
        slug: slugify(tag.name), // Generate slug from name as it's not stored in DB
        description: null, // Set default null description as it's not in the schema
      }));

      if (includeProductCount) {
        // Get product count for each tag through product-tag relation
        const tagsWithProductCount = await Promise.all(
          tagsResponse.map(async (tag) => {
            const productCount = await this.prismaService.productTag.count({
              where: { tagId: tag.id },
            });
            return { ...tag, productCount };
          }),
        );
        return tagsWithProductCount;
      }

      return tagsResponse;
    } catch (error) {
      this.logger.error(`Error retrieving tags: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve tags');
    }
  }

  async findOne(
    id: string,
    includeProductCount = false,
  ): Promise<TagResponseDto> {
    try {
      const tag = await this.prismaService.tag.findUnique({
        where: { id },
      });

      if (!tag) {
        throw new NotFoundException(`Tag with ID ${id} not found`);
      }

      // Transform tag to match TagResponseDto
      const tagResponse = {
        ...tag,
        slug: slugify(tag.name), // Generate slug from name as it's not stored in DB
        description: null, // Set default null description as it's not in the schema
      };

      if (includeProductCount) {
        const productCount = await this.prismaService.productTag.count({
          where: { tagId: tag.id },
        });
        return { ...tagResponse, productCount };
      }

      return tagResponse;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error retrieving tag ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve tag with ID ${id}`,
      );
    }
  }

  async findBySlug(
    slug: string,
    includeProductCount = false,
  ): Promise<TagResponseDto> {
    try {
      // Since tag doesn't have a slug in the database, find by name
      // The slug is derived from the name
      const name = slug
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

      const tag = await this.prismaService.tag.findFirst({
        where: {
          name: {
            contains: name,
            mode: 'insensitive',
          },
        },
      });

      if (!tag) {
        throw new NotFoundException(`Tag with slug '${slug}' not found`);
      }

      // Transform tag to match TagResponseDto
      const tagResponse = {
        ...tag,
        slug: slugify(tag.name), // Generate slug from name as it's not stored in DB
        description: null, // Set default null description as it's not in the schema
      };

      if (includeProductCount) {
        const productCount = await this.prismaService.productTag.count({
          where: { tagId: tag.id },
        });
        return { ...tagResponse, productCount };
      }

      return tagResponse;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error retrieving tag by slug ${slug}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve tag with slug '${slug}'`,
      );
    }
  }

  async create(createTagDto: CreateTagDto): Promise<TagResponseDto> {
    try {
      // Check if name already exists
      const existingTag = await this.prismaService.tag.findFirst({
        where: { name: createTagDto.name },
      });

      if (existingTag) {
        throw new ConflictException(
          `Tag with name '${createTagDto.name}' already exists`,
        );
      }

      const createdTag = await this.prismaService.tag.create({
        data: {
          name: createTagDto.name,
          // Note: Description is not stored in the database based on the schema
        },
      });

      this.logger.log(`Created tag: ${createdTag.id} - ${createdTag.name}`);

      // Transform to match TagResponseDto
      return {
        ...createdTag,
        slug: slugify(createdTag.name),
        description: createTagDto.description || null,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error creating tag: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create tag');
    }
  }

  async update(
    id: string,
    updateTagDto: UpdateTagDto,
  ): Promise<TagResponseDto> {
    try {
      // Verify tag exists
      await this.findOne(id);

      const updateData: Prisma.TagUpdateInput = {};

      if (updateTagDto.name) {
        // Check if new name would conflict with existing tag
        const existingTag = await this.prismaService.tag.findFirst({
          where: {
            name: updateTagDto.name,
            id: { not: id },
          },
        });

        if (existingTag) {
          throw new ConflictException(
            `Another tag with name '${updateTagDto.name}' already exists`,
          );
        }

        updateData.name = updateTagDto.name;
      }

      const updatedTag = await this.prismaService.tag.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(`Updated tag: ${id} - ${updatedTag.name}`);

      // Transform to match TagResponseDto
      return {
        ...updatedTag,
        slug: slugify(updatedTag.name),
        description: updateTagDto.description || null,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Error updating tag ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to update tag with ID ${id}`,
      );
    }
  }

  async remove(
    id: string,
  ): Promise<{ id: string; deleted: boolean; message: string }> {
    try {
      // Verify tag exists
      await this.findOne(id);

      // Check if there are any products associated with this tag
      const productTagsCount = await this.prismaService.productTag.count({
        where: { tagId: id },
      });

      if (productTagsCount > 0) {
        throw new BadRequestException(
          `Cannot delete tag with ID ${id} because it has ${productTagsCount} associated products`,
        );
      }

      await this.prismaService.tag.delete({
        where: { id },
      });

      this.logger.log(`Deleted tag: ${id}`);
      return {
        id,
        deleted: true,
        message: `Tag with ID ${id} successfully deleted`,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error deleting tag ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to delete tag with ID ${id}`,
      );
    }
  }
}
