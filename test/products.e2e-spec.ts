import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma.service';
import { TestUtils } from './setup';

describe('ProductsController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await TestUtils.cleanupDatabase(prismaService);
  });

  afterAll(async () => {
    await TestUtils.cleanupDatabase(prismaService);
    await app.close();
  });

  describe('/products (GET)', () => {
    it('should return empty products list when no products exist', () => {
      return request(app.getHttpServer())
        .get('/products')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toEqual([]);
          expect(res.body.total).toBe(0);
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(10);
        });
    });

    it('should return products with pagination', async () => {
      // Create test data
      const category = await prismaService.category.create({
        data: TestUtils.createMockCategory(),
      });

      const brand = await prismaService.brand.create({
        data: {
          id: 'test-brand-id',
          name: 'Test Brand',
          slug: 'test-brand',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const product = await prismaService.product.create({
        data: {
          ...TestUtils.createMockProduct(),
          categoryId: category.id,
          brandId: brand.id,
        },
      });

      return request(app.getHttpServer())
        .get('/products')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0].id).toBe(product.id);
          expect(res.body.data[0].title).toBe(product.title);
          expect(res.body.total).toBe(1);
        });
    });

    it('should filter products by category', async () => {
      // Create test data
      const category = await prismaService.category.create({
        data: TestUtils.createMockCategory(),
      });

      const brand = await prismaService.brand.create({
        data: {
          id: 'test-brand-id',
          name: 'Test Brand',
          slug: 'test-brand',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await prismaService.product.create({
        data: {
          ...TestUtils.createMockProduct(),
          categoryId: category.id,
          brandId: brand.id,
        },
      });

      return request(app.getHttpServer())
        .get(`/products?categoryId=${category.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0].categoryId).toBe(category.id);
        });
    });

    it('should search products by query', async () => {
      // Create test data
      const category = await prismaService.category.create({
        data: TestUtils.createMockCategory(),
      });

      const brand = await prismaService.brand.create({
        data: {
          id: 'test-brand-id',
          name: 'Test Brand',
          slug: 'test-brand',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await prismaService.product.create({
        data: {
          ...TestUtils.createMockProduct(),
          title: 'Special Test Product',
          categoryId: category.id,
          brandId: brand.id,
        },
      });

      return request(app.getHttpServer())
        .get('/products?search=Special')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0].title).toContain('Special');
        });
    });
  });

  describe('/products/:id (GET)', () => {
    it('should return a product by id', async () => {
      // Create test data
      const category = await prismaService.category.create({
        data: TestUtils.createMockCategory(),
      });

      const brand = await prismaService.brand.create({
        data: {
          id: 'test-brand-id',
          name: 'Test Brand',
          slug: 'test-brand',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const product = await prismaService.product.create({
        data: {
          ...TestUtils.createMockProduct(),
          categoryId: category.id,
          brandId: brand.id,
        },
      });

      return request(app.getHttpServer())
        .get(`/products/${product.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(product.id);
          expect(res.body.title).toBe(product.title);
          expect(res.body.category).toBeDefined();
          expect(res.body.brand).toBeDefined();
        });
    });

    it('should return 404 for non-existent product', () => {
      return request(app.getHttpServer())
        .get('/products/non-existent-id')
        .expect(404);
    });
  });

  describe('/products/slug/:slug (GET)', () => {
    it('should return a product by slug', async () => {
      // Create test data
      const category = await prismaService.category.create({
        data: TestUtils.createMockCategory(),
      });

      const brand = await prismaService.brand.create({
        data: {
          id: 'test-brand-id',
          name: 'Test Brand',
          slug: 'test-brand',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const product = await prismaService.product.create({
        data: {
          ...TestUtils.createMockProduct(),
          categoryId: category.id,
          brandId: brand.id,
        },
      });

      return request(app.getHttpServer())
        .get(`/products/slug/${product.slug}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(product.id);
          expect(res.body.slug).toBe(product.slug);
        });
    });

    it('should return 404 for non-existent product slug', () => {
      return request(app.getHttpServer())
        .get('/products/slug/non-existent-slug')
        .expect(404);
    });
  });

  describe('/products (POST)', () => {
    it('should create a new product', async () => {
      // Create test data
      const category = await prismaService.category.create({
        data: TestUtils.createMockCategory(),
      });

      const brand = await prismaService.brand.create({
        data: {
          id: 'test-brand-id',
          name: 'Test Brand',
          slug: 'test-brand',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const createProductDto = {
        title: 'New Test Product',
        description: 'A new test product',
        price: 199.99,
        stockQuantity: 50,
        sku: 'NEW-TEST-001',
        categoryId: category.id,
        brandId: brand.id,
      };

      return request(app.getHttpServer())
        .post('/products')
        .send(createProductDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.title).toBe(createProductDto.title);
          expect(res.body.price).toBe(createProductDto.price);
          expect(res.body.categoryId).toBe(category.id);
          expect(res.body.brandId).toBe(brand.id);
          expect(res.body.id).toBeDefined();
        });
    });

    it('should return 400 for invalid product data', () => {
      const invalidProductDto = {
        title: '', // Empty title
        price: -10, // Negative price
      };

      return request(app.getHttpServer())
        .post('/products')
        .send(invalidProductDto)
        .expect(400);
    });
  });

  describe('/products/:id (PUT)', () => {
    it('should update an existing product', async () => {
      // Create test data
      const category = await prismaService.category.create({
        data: TestUtils.createMockCategory(),
      });

      const brand = await prismaService.brand.create({
        data: {
          id: 'test-brand-id',
          name: 'Test Brand',
          slug: 'test-brand',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const product = await prismaService.product.create({
        data: {
          ...TestUtils.createMockProduct(),
          categoryId: category.id,
          brandId: brand.id,
        },
      });

      const updateProductDto = {
        title: 'Updated Product Title',
        price: 299.99,
      };

      return request(app.getHttpServer())
        .put(`/products/${product.id}`)
        .send(updateProductDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe(updateProductDto.title);
          expect(res.body.price).toBe(updateProductDto.price);
          expect(res.body.id).toBe(product.id);
        });
    });

    it('should return 404 for non-existent product', () => {
      const updateProductDto = {
        title: 'Updated Title',
      };

      return request(app.getHttpServer())
        .put('/products/non-existent-id')
        .send(updateProductDto)
        .expect(404);
    });
  });

  describe('/products/:id (DELETE)', () => {
    it('should delete an existing product', async () => {
      // Create test data
      const category = await prismaService.category.create({
        data: TestUtils.createMockCategory(),
      });

      const brand = await prismaService.brand.create({
        data: {
          id: 'test-brand-id',
          name: 'Test Brand',
          slug: 'test-brand',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const product = await prismaService.product.create({
        data: {
          ...TestUtils.createMockProduct(),
          categoryId: category.id,
          brandId: brand.id,
        },
      });

      return request(app.getHttpServer())
        .delete(`/products/${product.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.deleted).toBe(true);
          expect(res.body.id).toBe(product.id);
          expect(res.body.message).toBe('Product deleted successfully');
        });
    });

    it('should return 404 for non-existent product', () => {
      return request(app.getHttpServer())
        .delete('/products/non-existent-id')
        .expect(404);
    });
  });
});
