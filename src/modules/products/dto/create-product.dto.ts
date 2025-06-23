import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  IsArray,
  IsBoolean,
  IsUrl,
  ValidateNested,
  IsEnum,
  MaxLength,
  MinLength,
  Min,
  IsUUID,
  IsObject,
} from 'class-validator';
import { ProductVisibility } from '@prisma/client';

export class ProductDimensionsDto {
  @ApiProperty({
    description: 'Length of the product in cm',
    example: 10.5,
  })
  @IsNumber()
  @IsPositive()
  length: number;

  @ApiProperty({
    description: 'Width of the product in cm',
    example: 5.2,
  })
  @IsNumber()
  @IsPositive()
  width: number;

  @ApiProperty({
    description: 'Height of the product in cm',
    example: 2.0,
  })
  @IsNumber()
  @IsPositive()
  height: number;
}

export class ProductImageDto {
  @ApiProperty({
    description: 'URL to the product image',
    example: 'https://example.com/images/product-1.jpg',
  })
  @IsUrl({}, { message: 'Image URL must be a valid URL' })
  imageUrl: string;

  @ApiPropertyOptional({
    description: 'Alternative text for the image',
    example: 'Front view of iPhone 13 Pro',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  altText?: string;

  @ApiPropertyOptional({
    description: 'Display position/order of the image (0 is main image)',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}

export class CreateProductVariantDto {
  @ApiProperty({
    description: 'Name of the variant (e.g. size, color)',
    example: 'Black, 256GB',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  variantName: string;

  @ApiPropertyOptional({
    description:
      'SKU for this variant (will be auto-generated if not provided)',
    example: 'IPHONE13-BLK-256',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiProperty({
    description: 'Price for this variant',
    example: 1099.99,
  })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiPropertyOptional({
    description: 'Additional price over the base product price',
    example: 200,
  })
  @IsOptional()
  @IsNumber()
  additionalPrice?: number;

  @ApiProperty({
    description: 'Stock quantity for this variant',
    example: 50,
  })
  @IsNumber()
  @Min(0)
  stockQuantity: number;

  @ApiPropertyOptional({
    description:
      'Low stock threshold - when stock falls below this value, it will be marked as low stock',
    example: 5,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  threshold?: number;
}

export class CreateProductDto {
  @ApiProperty({
    description: 'Product title',
    example: 'iPhone 13 Pro',
  })
  @IsString()
  @IsNotEmpty({ message: 'Product title is required' })
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(100, { message: 'Title must be at most 100 characters long' })
  title: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example:
      'The latest iPhone with advanced camera system and A15 Bionic chip.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Short description for previews and listings',
    example: "Apple's latest flagship phone with pro-grade camera system.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  shortDescription?: string;

  @ApiProperty({
    description: 'Product price',
    example: 999.99,
  })
  @IsNumber()
  @IsPositive({ message: 'Price must be positive' })
  price: number;

  @ApiPropertyOptional({
    description: 'Discounted price',
    example: 899.99,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  discountPrice?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Stock quantity',
    example: 100,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({
    description: 'SKU (Stock Keeping Unit)',
    example: 'IPHONE13PRO-128GB',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional({
    description: 'Barcode (EAN, UPC, etc.)',
    example: '123456789012',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  barcode?: string;

  @ApiPropertyOptional({
    description: 'Weight in kg',
    example: 0.238,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  weight?: number;

  @ApiPropertyOptional({
    description: 'Product dimensions (length, width, height) in cm',
    example: { length: 14.7, width: 7.1, height: 0.7 },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ProductDimensionsDto)
  dimensions?: ProductDimensionsDto;

  @ApiPropertyOptional({
    description: 'Whether the product is active and purchasable',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Whether the product is featured on homepage or special sections',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Product visibility status',
    enum: ProductVisibility,
    default: ProductVisibility.PUBLIC,
    example: ProductVisibility.PUBLIC,
  })
  @IsOptional()
  @IsEnum(ProductVisibility)
  visibility?: ProductVisibility;

  @ApiPropertyOptional({
    description: 'Meta title for SEO',
    example: 'Buy iPhone 13 Pro - Best Smartphone of 2023',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'Meta description for SEO',
    example:
      'Purchase the iPhone 13 Pro with free shipping and 1-year warranty. Best deals on Apple products.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  metaDescription?: string;

  @ApiPropertyOptional({
    description: 'Meta keywords for SEO',
    example: 'iPhone, iPhone 13, Apple, smartphone, iOS',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  metaKeywords?: string;

  @ApiPropertyOptional({
    description: 'Brand ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4)
  brandId?: string;

  @ApiPropertyOptional({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4)
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Subcategory ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4)
  subCategoryId?: string;

  @ApiPropertyOptional({
    description: 'Array of tag IDs to associate with the product',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '223e4567-e89b-12d3-a456-426614174000',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({
    description: 'Product images',
    type: [ProductImageDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @ApiPropertyOptional({
    description: 'Product variants',
    type: [CreateProductVariantDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];
}
