import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../../common/prisma.service';
import { TestUtils } from '../../../test/setup';
import { NotFoundException } from '@nestjs/common';
import { AppLogger } from '../../common/services/logger.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    brand: {
      findUnique: jest.fn(),
    },
    orderItem: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AppLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const mockProducts = [
        TestUtils.createMockProduct(),
        { ...TestUtils.createMockProduct(), id: 'test-product-2' },
      ];

      const filterDto = {
        page: 1,
        limit: 10,
      };

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(2);

      const result = await service.findAll(filterDto);

      expect(result.data).toEqual(mockProducts);
      expect(result.total).toBe(2);
      expect(mockPrismaService.product.findMany).toHaveBeenCalled();
      expect(mockPrismaService.product.count).toHaveBeenCalled();
    });

    it('should return empty array when no products exist', async () => {
      const filterDto = {
        page: 1,
        limit: 10,
      };

      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      const result = await service.findAll(filterDto);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      const mockProduct = {
        ...TestUtils.createMockProduct(),
        tags: [], // Service transforms tags to empty array
      };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findOne('test-product-id');

      expect(result).toEqual(mockProduct);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-product-id' },
        include: {
          brand: true,
          category: true,
          subCategory: true,
          images: {
            orderBy: {
              position: 'asc',
            },
          },
          variants: true,
          tags: {
            include: {
              tag: true,
            },
          },
          deals: true,
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
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const createProductDto = {
        title: 'New Product',
        description: 'New product description',
        price: 149.99,
        stockQuantity: 20,
        sku: 'NEW-SKU-001',
        categoryId: 'test-category-id',
        brandId: 'test-brand-id',
      };

      const mockCreatedProduct = {
        id: 'new-product-id',
        ...createProductDto,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
      };

      // Mock the slug check (first call returns null for slug check, second call returns product for findOne)
      mockPrismaService.product.findUnique
        .mockResolvedValueOnce(null) // For slug check
        .mockResolvedValueOnce(mockCreatedProduct); // For findOne after creation

      // Mock the transaction
      mockPrismaService.$transaction.mockResolvedValue(mockCreatedProduct);

      const result = await service.create(createProductDto);

      expect(result).toEqual(mockCreatedProduct);
    });

    it('should throw InternalServerErrorException when creation fails', async () => {
      const invalidDto = {
        title: '', // Empty title
        price: -10, // Negative price
      };

      mockPrismaService.product.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(invalidDto as any)).rejects.toThrow(
        'Failed to create product',
      );
    });
  });

  describe('update', () => {
    it('should update an existing product', async () => {
      const updateProductDto = {
        title: 'Updated Product',
        price: 199.99,
      };

      const mockUpdatedProduct = {
        ...TestUtils.createMockProduct(),
        ...updateProductDto,
        updatedAt: new Date(),
        tags: [],
      };

      // Mock the findOne call that happens before update
      mockPrismaService.product.findUnique.mockResolvedValue(
        mockUpdatedProduct,
      );

      // Mock the findFirst call for slug check
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      // Mock the transaction to execute the callback
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        // Create a mock prisma client for the transaction
        const mockPrisma = {
          product: {
            update: jest.fn().mockResolvedValue(mockUpdatedProduct),
          },
        };
        return await callback(mockPrisma);
      });

      const result = await service.update('test-product-id', updateProductDto);

      expect(result).toEqual(mockUpdatedProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { title: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a product', async () => {
      const mockDeletedProduct = TestUtils.createMockProduct();

      // Mock the findOne call that happens before delete
      mockPrismaService.product.findUnique.mockResolvedValue(
        mockDeletedProduct,
      );

      // Mock the orderItem.count call (no orders exist)
      mockPrismaService.orderItem.count.mockResolvedValue(0);

      // Mock the transaction to execute the callback
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        // Create a mock prisma client for the transaction
        const mockPrisma = {
          productImage: { deleteMany: jest.fn() },
          productVariant: { deleteMany: jest.fn() },
          productTag: { deleteMany: jest.fn() },
          productDeal: { deleteMany: jest.fn() },
          productReview: { deleteMany: jest.fn() },
          cartItem: { deleteMany: jest.fn() },
          wishlistItem: { deleteMany: jest.fn() },
          inventoryLog: { deleteMany: jest.fn() },
          inventory: { deleteMany: jest.fn() },
          product: {
            delete: jest.fn().mockResolvedValue(mockDeletedProduct),
          },
        };
        return await callback(mockPrisma);
      });

      const result = await service.remove('test-product-id');

      expect(result).toEqual({
        id: 'test-product-id',
        deleted: true,
        message: 'Product with ID test-product-id successfully deleted',
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySlug', () => {
    it('should return a product by slug', async () => {
      const mockProduct = {
        ...TestUtils.createMockProduct(),
        tags: [], // Service transforms tags to empty array
      };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findBySlug('test-product');

      expect(result).toEqual(mockProduct);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-product' },
        include: {
          brand: true,
          category: true,
          subCategory: true,
          images: {
            orderBy: {
              position: 'asc',
            },
          },
          variants: true,
          tags: {
            include: {
              tag: true,
            },
          },
          deals: true,
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
    });

    it('should throw NotFoundException when product not found by slug', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('non-existent-slug')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
