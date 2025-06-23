import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SpecificationsService } from './specifications.service';
import {
  CreateSpecificationTemplateDto,
  CreateProductSpecificationDto,
  CreateProductSpecificationBulkDto,
  SpecificationTemplateResponseDto,
  ProductSpecificationResponseDto,
  GroupedProductSpecificationsResponseDto,
} from './dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('specifications')
@Controller('specifications')
export class SpecificationsController {
  constructor(private readonly specificationsService: SpecificationsService) {}

  // ===== Specification Template Endpoints =====

  @Post('templates')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a specification template for a category' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 201,
    description: 'Specification template created successfully',
    type: SpecificationTemplateResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async createSpecificationTemplate(
    @Body() dto: CreateSpecificationTemplateDto,
  ) {
    return this.specificationsService.createSpecificationTemplate(dto);
  }

  @Get('templates/category/:categoryId')
  @ApiOperation({ summary: 'Get all specification templates for a category' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Specification templates retrieved successfully',
    type: [SpecificationTemplateResponseDto],
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  async getSpecificationTemplatesByCategoryId(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ) {
    return this.specificationsService.getSpecificationTemplatesByCategoryId(
      categoryId,
    );
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a specification template' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'Specification template ID' })
  @ApiResponse({
    status: 200,
    description: 'Specification template deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'Specification template not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async deleteSpecificationTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.specificationsService.deleteSpecificationTemplate(id);
  }

  // ===== Product Specification Endpoints =====

  @Post('product')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SELLER')
  @ApiOperation({ summary: 'Create a specification for a product' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 201,
    description: 'Product specification created successfully',
    type: ProductSpecificationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async createProductSpecification(@Body() dto: CreateProductSpecificationDto) {
    return this.specificationsService.createProductSpecification(dto);
  }

  @Post('product/bulk')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SELLER')
  @ApiOperation({ summary: 'Create multiple specifications for products' })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: [CreateProductSpecificationDto] })
  @ApiResponse({
    status: 201,
    description: 'Product specifications created successfully',
    type: [ProductSpecificationResponseDto],
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async createProductSpecificationsBulk(
    @Body() specifications: CreateProductSpecificationDto[],
  ) {
    const bulkDto = { specifications };
    return this.specificationsService.createProductSpecificationsBulk(bulkDto);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get all specifications for a product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Product specifications retrieved successfully',
    type: [ProductSpecificationResponseDto],
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async getProductSpecifications(
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.specificationsService.getProductSpecifications(productId);
  }

  @Get('product/:productId/grouped')
  @ApiOperation({
    summary: 'Get specifications for a product grouped by specification group',
  })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Grouped product specifications retrieved successfully',
    type: [GroupedProductSpecificationsResponseDto],
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async getGroupedProductSpecifications(
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.specificationsService.getGroupedProductSpecifications(
      productId,
    );
  }

  @Patch('product/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SELLER')
  @ApiOperation({ summary: 'Update a product specification' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'Specification ID' })
  @ApiResponse({
    status: 200,
    description: 'Product specification updated successfully',
    type: ProductSpecificationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Specification not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async updateProductSpecification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateProductSpecificationDto>,
  ) {
    return this.specificationsService.updateProductSpecification(id, dto);
  }

  @Delete('product/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SELLER')
  @ApiOperation({ summary: 'Delete a product specification' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'Specification ID' })
  @ApiResponse({
    status: 200,
    description: 'Product specification deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'Specification not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async deleteProductSpecification(@Param('id', ParseUUIDPipe) id: string) {
    return this.specificationsService.deleteProductSpecification(id);
  }

  @Delete('product/:productId/all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SELLER')
  @ApiOperation({ summary: 'Delete all specifications for a product' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'All product specifications deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async deleteAllProductSpecifications(
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.specificationsService.deleteAllProductSpecifications(productId);
  }
}
