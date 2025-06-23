import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma.service';
import { ConfigModule } from '@nestjs/config';

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ||
    'postgresql://test:test@localhost:5432/ecommerce_test';
});

// Global test teardown
afterAll(async () => {
  // Cleanup any global resources
});

// Test utilities
export class TestUtils {
  static async createTestingApp(): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();
    return app;
  }

  static async cleanupDatabase(prisma: PrismaService): Promise<void> {
    // Clean up test data in reverse order of dependencies
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.productReview.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.productTag.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.brand.deleteMany();
    await prisma.user.deleteMany();
  }

  static createMockUser() {
    return {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'hashedPassword',
      role: 'USER',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static createMockProduct() {
    return {
      id: 'test-product-id',
      title: 'Test Product',
      slug: 'test-product',
      description: 'Test product description',
      price: 99.99,
      stockQuantity: 10,
      sku: 'TEST-SKU-001',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    };
  }

  static createMockCategory() {
    return {
      id: 'test-category-id',
      name: 'Test Category',
      slug: 'test-category',
      description: 'Test category description',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

// Mock JWT token for testing
export const mockJwtToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiVVNFUiIsImlhdCI6MTYzNDU2Nzg5MCwiZXhwIjoxNjM0NjU0MjkwfQ.test-signature';

// Mock request object
export const mockRequest = {
  user: TestUtils.createMockUser(),
  headers: {
    authorization: `Bearer ${mockJwtToken}`,
  },
  body: {},
  query: {},
  params: {},
};

// Mock response object
export const mockResponse = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
};
