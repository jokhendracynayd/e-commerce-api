# E-Commerce Product Management Guide

This guide provides a comprehensive overview of the product management flow in our e-commerce system, including all related entities and their relationships.

## Table of Contents
- [Creation Flow Overview](#creation-flow-overview)
- [1. Brands](#1-brands)
- [2. Categories](#2-categories)
- [3. Tags](#3-tags)
- [4. Products](#4-products)
- [5. Product Images](#5-product-images)
- [6. Product Variants](#6-product-variants)
- [7. Product Deals](#7-product-deals)
- [8. Inventory Management](#8-inventory-management)
- [9. Best Practices](#9-best-practices)

## Creation Flow Overview

The recommended sequence for creating product-related entities:

1. **Brands** - Create brands first
2. **Categories** - Create parent categories, then subcategories
3. **Tags** - Create tags for product filtering and search
4. **Products** - Create the main product with basic information
5. **Product Images** - Add images to the product
6. **Product Variants** - Create variations of the product (if applicable)
7. **Product Deals** - Set up promotional deals for products
8. **Inventory Management** - Configure inventory tracking

Each step builds on the previous ones, creating a complete product ecosystem.

## 1. Brands

Brands represent the manufacturers or companies behind the products.

### API Endpoint
```
POST /api/v1/brands
```

### Required Fields
| Field | Type | Description | Purpose |
|-------|------|-------------|---------|
| name | string | Brand name | Identifies the brand |
| slug | string | URL-friendly version of name | Used in URLs and search |

### Optional Fields
| Field | Type | Description | Purpose |
|-------|------|-------------|---------|
| logo | string | URL to brand logo | Visual brand representation |
| description | string | Brand description | Provides details about the brand |

### Creation Example
```json
{
  "name": "Apple",
  "description": "Innovative technology company known for iPhones, Macs, and more"
}
```

### Notes
- The system automatically generates a slug from the name
- Brand creation requires admin privileges
- Brands should be created before their products

## 2. Categories

Categories organize products into a hierarchical structure, allowing for logical navigation.

### API Endpoint
```
POST /api/v1/categories
```

### Required Fields
| Field | Type | Description | Purpose |
|-------|------|-------------|---------|
| name | string | Category name | Identifies the category |

### Optional Fields
| Field | Type | Description | Purpose |
|-------|------|-------------|---------|
| description | string | Category description | Provides details about the category |
| parentId | UUID | ID of parent category | Creates hierarchical structure |
| icon | string | URL or name of an icon | Visual representation of category |

### Creation Flow
1. **Create parent categories first**
```json
{
  "name": "Electronics",
  "description": "Electronic devices and accessories",
  "icon": "electronics-icon.svg"
}
```

2. **Then create subcategories**
```json
{
  "name": "Smartphones",
  "description": "Mobile phones and smartphones",
  "parentId": "parent-category-id",
  "icon": "smartphone-icon.svg"
}
```

### Notes
- The system automatically generates a slug from the name
- Categories can have multiple levels of nesting
- The system prevents circular references in the hierarchy
- Category creation requires admin privileges

## 3. Tags

Tags are keywords or labels that help with filtering and searching products.

### API Endpoint
```
POST /api/v1/tags
```

### Required Fields
| Field | Type | Description | Purpose |
|-------|------|-------------|---------|
| name | string | Tag name | Identifies the tag |

### Creation Example
```json
{
  "name": "Wireless"
}
```

### Notes
- Tags are created independently of products
- Tags can be associated with multiple products
- Tags help improve product discoverability
- Tag creation requires admin privileges

## 4. Products

Products are the core entities in the e-commerce system.

### API Endpoint
```
POST /api/v1/products
```

### Required Fields
| Field | Type | Description | Purpose |
|-------|------|-------------|---------|
| title | string | Product title/name | Main product identifier |
| price | decimal | Product price | Base pricing information |
| sku | string | Stock Keeping Unit | Unique product identifier |

### Optional Fields
| Field | Type | Description | Purpose |
|-------|------|-------------|---------|
| description | string | Detailed product description | Full product information |
| shortDescription | string | Brief product description | Quick overview for listings |
| brandId | UUID | Brand ID | Associates product with a brand |
| categoryId | UUID | Main category ID | Primary categorization |
| subCategoryId | UUID | Subcategory ID | Secondary categorization |
| discountPrice | decimal | Discounted price | Sales pricing |
| currency | string | Currency code | Price currency (default: USD) |
| stockQuantity | integer | Available stock | Inventory tracking |
| barcode | string | Product barcode | Inventory/POS integration |
| weight | float | Product weight | Shipping calculations |
| dimensions | JSON | Product dimensions | Shipping calculations |
| isActive | boolean | Product status | Controls visibility (default: true) |
| isFeatured | boolean | Featured status | Promotes products (default: false) |
| visibility | enum | Visibility setting | Controls who can see (PUBLIC, PRIVATE, HIDDEN) |
| metaTitle | string | SEO title | Search engine optimization |
| metaDescription | string | SEO description | Search engine optimization |
| metaKeywords | string | SEO keywords | Search engine optimization |

### Creation Example
```json
{
  "title": "iPhone 14 Pro",
  "description": "Apple's latest flagship smartphone with advanced features",
  "shortDescription": "Latest iPhone with advanced features",
  "price": 999.99,
  "discountPrice": 899.99,
  "stockQuantity": 100,
  "brandId": "apple-brand-id",
  "categoryId": "smartphones-category-id",
  "sku": "APPLE-IP14-PRO-128",
  "barcode": "123456789012",
  "weight": 0.24,
  "dimensions": {
    "length": 160.7,
    "width": 77.6,
    "height": 7.85,
    "unit": "mm"
  },
  "isFeatured": true,
  "metaTitle": "Buy iPhone 14 Pro - Latest Apple Smartphone",
  "metaDescription": "Purchase the new iPhone 14 Pro with advanced camera features, powerful processor, and stunning design."
}
```

### Notes
- The system automatically generates a slug from the title
- Products require associated categories for proper organization
- Product creation requires admin privileges
- The SKU should follow a consistent format for your inventory management

## 5. Product Images

Images provide visual representation of products.

### API Endpoint
```
POST /api/v1/products/{productId}/images
```

### Required Fields
| Field | Type | Description | Purpose |
|-------|------|-------------|---------|
| productId | UUID | Product ID | Associates image with product |
| imageUrl | string | Image URL | Location of the image |

### Optional Fields
| Field | Type | Description | Purpose |
|-------|------|-------------|---------|
| altText | string | Alternative text | Accessibility and SEO |
| position | integer | Display order | Controls image sequence |

### Creation Example
```json
{
  "imageUrl": "https://example.com/images/iphone-14-pro-front.jpg",
  "altText": "iPhone 14 Pro Front View",
  "position": 0
}
```

### Bulk Creation Example
```json
{
  "images": [
    {
      "imageUrl": "https://example.com/images/iphone-14-pro-front.jpg",
      "altText": "iPhone 14 Pro Front View",
      "position": 0
    },
    {
      "imageUrl": "https://example.com/images/iphone-14-pro-back.jpg",
      "altText": "iPhone 14 Pro Back View",
      "position": 1
    }
  ]
}
```

### Notes
- A product should have at least one image
- The first image (position 0) is typically used as the primary/thumbnail image
- High-quality images improve conversion rates
- Use consistent image dimensions and aspect ratios

## 6. Product Variants

Variants represent different versions of the same product (e.g., different colors, sizes, etc.).

### API Endpoint
```
POST /api/v1/products/{productId}/variants
```

### Required Fields
| Field | Type | Description | Purpose |
|-------|------|-------------|---------|
| productId | UUID | Parent product ID | Associates variant with main product |
| variantName | string | Variant name | Identifies the variant |
| sku | string | Stock Keeping Unit | Unique variant identifier |

### Optional Fields
| Field | Type | Description | Purpose |
|-------|------|-------------|---------|
| price | decimal | Variant price | Overrides main product price |
| stockQuantity | integer | Available stock | Variant-specific inventory |
| additionalPrice | decimal | Price difference | Added to base price |

### Creation Example
```json
{
  "variantName": "iPhone 14 Pro - 256GB - Black",
  "sku": "APPLE-IP14-PRO-256-BLK",
  "price": 1099.99,
  "stockQuantity": 50,
  "additionalPrice": 100.00
}
```

### Notes
- Variants must be associated with an existing product
- Each variant must have a unique SKU
- Variants can have their own inventory tracking
- Variant creation requires admin privileges

## 7. Product Deals

Deals are special promotions or discounts applied to products.

### API Endpoint
```
POST /api/v1/products/{productId}/deals
```

### Required Fields
| Field | Type | Description | Purpose |
|-------|------|-------------|---------|
| productId | UUID | Product ID | Associates deal with product |
| dealType | enum | Type of deal | Categorizes the deal (FLASH, TRENDING, DEAL_OF_DAY) |
| discount | decimal | Discount amount | Percentage or fixed amount |
| startTime | datetime | Deal start time | When the deal becomes active |
| endTime | datetime | Deal end time | When the deal expires |

### Creation Example
```json
{
  "dealType": "FLASH",
  "discount": 15.00,
  "startTime": "2023-08-01T00:00:00Z",
  "endTime": "2023-08-03T23:59:59Z"
}
```

### Notes
- Deals have a defined time period
- Multiple deals can be created for the same product
- Only one deal of each type can be active at once
- Deal creation requires admin privileges

## 8. Inventory Management

Inventory tracks product stock levels and changes.

### API Endpoint
```
POST /api/v1/inventory
```

### Required Fields
| Field | Type | Description | Purpose |
|-------|------|-------------|---------|
| productId | UUID | Product ID | Associates inventory with product |
| quantity | integer | Current stock level | Tracks available units |

### Optional Fields
| Field | Type | Description | Purpose |
|-------|------|-------------|---------|
| lowStockThreshold | integer | Low stock alert level | Triggers notifications |
| reserved | integer | Reserved units | Pre-ordered or in shopping carts |
| backorder | boolean | Backorder status | Can be ordered when out of stock |
| backorderLimit | integer | Backorder limit | Maximum backorder quantity |
| reorderPoint | integer | Reorder notification | When to restock |
| reorderQuantity | integer | Suggested reorder amount | How much to restock |

### Creation Example
```json
{
  "productId": "product-id",
  "quantity": 100,
  "lowStockThreshold": 10,
  "reserved": 0,
  "backorder": false,
  "reorderPoint": 20,
  "reorderQuantity": 50
}
```

### Inventory Log Example
```json
{
  "productId": "product-id",
  "changeType": "RESTOCK",
  "quantity": 50,
  "previousQuantity": 50,
  "newQuantity": 100,
  "note": "Regular monthly restock"
}
```

### Notes
- Inventory is automatically created when a product is created
- Inventory changes are logged for audit purposes
- Changes can be of different types: RESTOCK, SALE, RETURN, MANUAL
- Inventory management requires admin privileges

## 9. Best Practices

### General Guidelines
- Create brands and categories before creating products
- Use consistent naming conventions for products and SKUs
- Always provide high-quality images for products
- Include detailed descriptions for better SEO
- Set up proper inventory tracking to avoid overselling

### Product Organization
- Create a logical category hierarchy (not too deep, not too broad)
- Use tags for attributes that span across categories
- Group related products through proper categorization
- Feature seasonal or promotional products

### Pricing Strategy
- Set up product variants for different price points
- Use product deals for time-limited promotions
- Consider bundle products for higher average order value
- Regularly review and update pricing

### Inventory Management
- Set appropriate low-stock thresholds
- Regularly audit physical inventory against system records
- Use inventory logs to track changes and identify issues
- Set up reorder points to maintain optimal stock levels

### Performance Optimization
- Optimize images for web (compress without quality loss)
- Use pagination when retrieving large product lists
- Cache frequently accessed product information
- Index fields used for searching and filtering

Following these guidelines will help create a well-organized, efficient product management system that provides a great shopping experience for customers while making administration easier. 