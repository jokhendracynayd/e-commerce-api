import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto, TagResponseDto } from './dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get all tags' })
  @ApiResponse({
    status: 200,
    description: 'Returns all tags',
    type: [TagResponseDto],
  })
  @ApiQuery({
    name: 'includeProductCount',
    required: false,
    type: Boolean,
    description: 'Include the count of products for each tag',
  })
  findAll(
    @Query('includeProductCount') includeProductCount?: boolean,
  ): Promise<TagResponseDto[]> {
    return this.tagsService.findAll(includeProductCount === true);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get tag by ID' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the tag to retrieve',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the tag with the specified ID',
    type: TagResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  @ApiQuery({
    name: 'includeProductCount',
    required: false,
    type: Boolean,
    description: 'Include the count of products for this tag',
  })
  findOne(
    @Param('id') id: string,
    @Query('includeProductCount') includeProductCount?: boolean,
  ): Promise<TagResponseDto> {
    return this.tagsService.findOne(id, includeProductCount === true);
  }

  @Get('slug/:slug')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get tag by slug' })
  @ApiParam({
    name: 'slug',
    required: true,
    description: 'The slug of the tag to retrieve',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the tag with the specified slug',
    type: TagResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  @ApiQuery({
    name: 'includeProductCount',
    required: false,
    type: Boolean,
    description: 'Include the count of products for this tag',
  })
  findBySlug(
    @Param('slug') slug: string,
    @Query('includeProductCount') includeProductCount?: boolean,
  ): Promise<TagResponseDto> {
    return this.tagsService.findBySlug(slug, includeProductCount === true);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({
    status: 201,
    description: 'The tag has been successfully created',
    type: TagResponseDto,
  })
  @ApiConflictResponse({
    description: 'Tag with this name/slug already exists',
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBearerAuth('JWT-auth')
  create(@Body() createTagDto: CreateTagDto): Promise<TagResponseDto> {
    return this.tagsService.create(createTagDto);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a tag' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the tag to update',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'The tag has been successfully updated',
    type: TagResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  @ApiConflictResponse({
    description: 'Tag with this name/slug already exists',
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBearerAuth('JWT-auth')
  update(
    @Param('id') id: string,
    @Body() updateTagDto: UpdateTagDto,
  ): Promise<TagResponseDto> {
    return this.tagsService.update(id, updateTagDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'The ID of the tag to delete',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'The tag has been successfully deleted',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        deleted: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  @ApiBadRequestResponse({
    description: 'Cannot delete tag with associated products',
  })
  @ApiBearerAuth('JWT-auth')
  remove(
    @Param('id') id: string,
  ): Promise<{ id: string; deleted: boolean; message: string }> {
    return this.tagsService.remove(id);
  }
}
