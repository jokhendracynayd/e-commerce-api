import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductVisibility, DealType } from '@prisma/client';
import { CategoryResponseDto } from '../../categories/dto/category-response.dto';
import { BrandResponseDto } from '../../brands/dto/brand-response.dto';
import { GroupedProductSpecificationsResponseDto } from '../../specifications/dto/spec-response.dto';

export class ProductImageResponseDto {
  @ApiProperty({
    description: 'Image ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'URL to the product image',
    example: 'https://example.com/images/product-1.jpg',
  })
  imageUrl: string;

  @ApiPropertyOptional({
    description: 'Alternative text for the image',
    example: 'Front view of iPhone 13 Pro',
    nullable: true,
  })
  altText: string | null;

  @ApiProperty({
    description: 'Display position/order of the image (0 is main image)',
    example: 0,
  })
  position: number;

  @ApiProperty({
    description: 'Creation date',
    example: '2023-07-21T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2023-07-21T12:00:00Z',
  })
  updatedAt: Date;
}

export class ProductVariantResponseDto {
  @ApiProperty({
    description: 'Variant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the variant (e.g. size, color)',
    example: 'Black, 256GB',
  })
  variantName: string;

  @ApiPropertyOptional({
    description: 'Color name',
    example: 'Blue',
    nullable: true,
  })
  color: string | null;

  @ApiPropertyOptional({
    description: 'Hex color code',
    example: '#0000FF',
    nullable: true,
  })
  colorHex: string | null;

  @ApiPropertyOptional({
    description: 'Size information',
    example: 'Large',
    nullable: true,
  })
  size: string | null;

  @ApiPropertyOptional({
    description: 'Variant-specific image URL',
    example: 'https://example.com/product-blue.jpg',
    nullable: true,
  })
  variantImage: string | null;

  @ApiProperty({
    description: 'SKU for this variant',
    example: 'IPHONE13-BLK-256',
  })
  sku: string;

  @ApiProperty({
    description: 'Price for this variant',
    example: 1099.99,
  })
  price: number;

  @ApiProperty({
    description: 'Stock quantity for this variant',
    example: 50,
  })
  stockQuantity: number;

  @ApiProperty({
    description: 'Additional price over the base product price',
    example: 200,
  })
  additionalPrice: number;

  @ApiProperty({
    description: 'Creation date',
    example: '2023-07-21T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2023-07-21T12:00:00Z',
  })
  updatedAt: Date;
}

export class ProductReviewResponseDto {
  @ApiProperty({
    description: 'Review ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Rating (1-5)',
    example: 4,
  })
  rating: number;

  @ApiPropertyOptional({
    description: 'Review comment',
    example: 'Great product, very satisfied with the purchase.',
    nullable: true,
  })
  comment: string | null;

  @ApiProperty({
    description: 'User who left the review',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      firstName: 'John',
      lastName: 'Doe',
    },
  })
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };

  @ApiProperty({
    description: 'Creation date',
    example: '2023-07-21T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2023-07-21T12:00:00Z',
  })
  updatedAt: Date;
}

export class ProductTagResponseDto {
  @ApiProperty({
    description: 'Tag ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Tag name',
    example: 'Electronics',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Created at date',
    example: '2023-07-21T12:00:00Z',
  })
  createdAt: Date;
}

export class ProductDealResponseDto {
  @ApiProperty({
    description: 'Deal ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Deal type',
    enum: DealType,
    example: DealType.FLASH,
  })
  dealType: DealType;

  @ApiProperty({
    description: 'Discount percentage or amount',
    example: 15.0,
  })
  discount: number;

  @ApiProperty({
    description: 'Start time of the deal',
    example: '2023-07-21T00:00:00Z',
  })
  startTime: Date;

  @ApiProperty({
    description: 'End time of the deal',
    example: '2023-07-28T23:59:59Z',
  })
  endTime: Date;

  @ApiProperty({
    description: 'Creation date',
    example: '2023-07-20T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2023-07-20T12:00:00Z',
  })
  updatedAt: Date;
}

export class ProductResponseDto {
  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Product title',
    example: 'iPhone 13 Pro',
  })
  title: string;

  @ApiProperty({
    description: 'Product slug (URL-friendly name)',
    example: 'iphone-13-pro',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example:
      'The latest iPhone with advanced camera system and A15 Bionic chip.',
    nullable: true,
  })
  description: string | null;

  @ApiPropertyOptional({
    description: 'Short description for previews and listings',
    example: "Apple's latest flagship phone with pro-grade camera system.",
    nullable: true,
  })
  shortDescription: string | null;

  @ApiPropertyOptional({
    description: 'Product subtitle with additional info (color, size, etc.)',
    example: 'Blue Strap, Free Size',
    nullable: true,
  })
  subtitle: string | null;

  @ApiProperty({
    description: 'Product price',
    example: 999.99,
  })
  price: number;

  @ApiPropertyOptional({
    description: 'Discounted price',
    example: 899.99,
    nullable: true,
  })
  discountPrice: number | null;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Stock quantity',
    example: 100,
  })
  stockQuantity: number;

  @ApiProperty({
    description: 'SKU (Stock Keeping Unit)',
    example: 'IPHONE13PRO-128GB',
  })
  sku: string;

  @ApiPropertyOptional({
    description: 'Barcode (EAN, UPC, etc.)',
    example: '123456789012',
    nullable: true,
  })
  barcode: string | null;

  @ApiPropertyOptional({
    description: 'Weight in kg',
    example: 0.238,
    nullable: true,
  })
  weight: number | null;

  @ApiPropertyOptional({
    description: 'Product dimensions as JSON',
    example: { length: 14.7, width: 7.1, height: 0.7 },
    nullable: true,
  })
  dimensions: Record<string, any> | null;

  @ApiProperty({
    description: 'Whether the product is active and purchasable',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description:
      'Whether the product is featured on homepage or special sections',
    example: false,
  })
  isFeatured: boolean;

  @ApiProperty({
    description: 'Whether the product is marked as new',
    example: false,
  })
  isNew: boolean;

  @ApiProperty({
    description: 'Whether the product is a best seller',
    example: false,
  })
  isBestSeller: boolean;

  @ApiProperty({
    description: 'Whether the product is sponsored',
    example: false,
  })
  isSponsored: boolean;

  @ApiPropertyOptional({
    description: 'Bank offer details',
    example: {
      available: true,
      discount: 10,
      bankName: 'HDFC Bank',
      terms: 'Valid on orders above ₹5000'
    },
    nullable: true,
  })
  bankOffer: Record<string, any> | null;

  @ApiPropertyOptional({
    description: 'Exchange offer details',
    example: {
      available: true,
      maxDiscount: 15000,
      terms: 'Exchange your old device'
    },
    nullable: true,
  })
  exchangeOffer: Record<string, any> | null;

  @ApiProperty({
    description: 'Product visibility status',
    enum: ProductVisibility,
    example: ProductVisibility.PUBLIC,
  })
  visibility: ProductVisibility;

  @ApiProperty({
    description: 'Average rating of the product',
    example: 4.5,
  })
  averageRating: number;

  @ApiProperty({
    description: 'Number of reviews',
    example: 120,
  })
  reviewCount: number;

  @ApiPropertyOptional({
    description: 'Meta title for SEO',
    example: 'Buy iPhone 13 Pro - Best Smartphone of 2023',
    nullable: true,
  })
  metaTitle: string | null;

  @ApiPropertyOptional({
    description: 'Meta description for SEO',
    example:
      'Purchase the iPhone 13 Pro with free shipping and 1-year warranty. Best deals on Apple products.',
    nullable: true,
  })
  metaDescription: string | null;

  @ApiPropertyOptional({
    description: 'Meta keywords for SEO',
    example: 'iPhone, iPhone 13, Apple, smartphone, iOS',
    nullable: true,
  })
  metaKeywords: string | null;

  @ApiProperty({
    description: 'Creation date',
    example: '2023-07-21T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2023-07-21T12:00:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Brand information',
    type: BrandResponseDto,
    nullable: true,
  })
  brand?: BrandResponseDto | null;

  @ApiPropertyOptional({
    description: 'Category information',
    type: CategoryResponseDto,
    nullable: true,
  })
  category?: CategoryResponseDto | null;

  @ApiPropertyOptional({
    description: 'Subcategory information',
    type: CategoryResponseDto,
    nullable: true,
  })
  subCategory?: CategoryResponseDto | null;

  @ApiPropertyOptional({
    description: 'Product images',
    type: [ProductImageResponseDto],
    nullable: true,
  })
  images?: ProductImageResponseDto[];

  @ApiPropertyOptional({
    description: 'Product variants',
    type: [ProductVariantResponseDto],
    nullable: true,
  })
  variants?: ProductVariantResponseDto[];

  @ApiPropertyOptional({
    description: 'Product reviews',
    type: [ProductReviewResponseDto],
    nullable: true,
  })
  reviews?: ProductReviewResponseDto[];

  @ApiPropertyOptional({
    description: 'Product tags',
    type: [ProductTagResponseDto],
    nullable: true,
  })
  tags?: ProductTagResponseDto[];

  @ApiPropertyOptional({
    description: 'Product deals',
    type: [ProductDealResponseDto],
    nullable: true,
  })
  deals?: ProductDealResponseDto[];

  @ApiPropertyOptional({
    description: 'Product specifications grouped by group name',
    type: [GroupedProductSpecificationsResponseDto],
    nullable: true,
  })
  specificationGroups?: GroupedProductSpecificationsResponseDto[];
}
