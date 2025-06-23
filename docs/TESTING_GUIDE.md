# Testing Guide for E-commerce API

## 🎯 Overview

This guide covers how to test your NestJS e-commerce API effectively using Jest, Supertest, and other testing tools.

## 📋 Prerequisites

1. **Test Database Setup**
   ```bash
   # Create test database
   createdb ecommerce_test
   
   # Run migrations on test database
   DATABASE_URL=postgresql://test:test@localhost:5432/ecommerce_test npm run prisma:migrate
   ```

2. **Environment Variables**
   Create `.env.test` file:
   ```env
   NODE_ENV=test
   DATABASE_URL=postgresql://test:test@localhost:5432/ecommerce_test
   JWT_SECRET=test-jwt-secret-key
   ```

## 🚀 Running Tests

### Unit Tests
```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run specific test file
npm test -- products.service.spec.ts
```

### E2E Tests
```bash
# Run all e2e tests
npm run test:e2e

# Run specific e2e test file
npm run test:e2e -- products.e2e-spec.ts
```

### Debug Tests
```bash
# Debug unit tests
npm run test:debug

# Debug e2e tests
npm run test:e2e -- --detectOpenHandles
```

## 📝 Test Types

### 1. Unit Tests (`*.spec.ts`)
- Test individual functions and methods
- Mock external dependencies
- Fast execution
- Located in same directory as source files

**Example:**
```typescript
describe('ProductsService', () => {
  it('should return all products', async () => {
    // Test implementation
  });
});
```

### 2. E2E Tests (`*.e2e-spec.ts`)
- Test complete API endpoints
- Use real database (test database)
- Test full request/response cycle
- Located in `test/` directory

**Example:**
```typescript
describe('ProductsController (e2e)', () => {
  it('should create a product', () => {
    return request(app.getHttpServer())
      .post('/products')
      .send(productData)
      .expect(201);
  });
});
```

## 🛠️ Testing Patterns

### 1. Service Testing
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockDependency: jest.Mocked<DependencyType>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ServiceName,
        {
          provide: DependencyType,
          useValue: mockDependency,
        },
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
  });

  it('should do something', async () => {
    // Arrange
    const input = 'test';
    mockDependency.method.mockResolvedValue('result');

    // Act
    const result = await service.method(input);

    // Assert
    expect(result).toBe('result');
    expect(mockDependency.method).toHaveBeenCalledWith(input);
  });
});
```

### 2. Controller Testing
```typescript
describe('ControllerName', () => {
  let controller: ControllerName;
  let service: jest.Mocked<ServiceName>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ControllerName],
      providers: [
        {
          provide: ServiceName,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ControllerName>(ControllerName);
    service = module.get(ServiceName);
  });

  it('should return data', async () => {
    const mockData = { id: '1', name: 'test' };
    service.method.mockResolvedValue(mockData);

    const result = await controller.method();

    expect(result).toEqual(mockData);
  });
});
```

### 3. E2E Testing
```typescript
describe('API Endpoint (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should handle request', () => {
    return request(app.getHttpServer())
      .get('/endpoint')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('data');
      });
  });
});
```

## 🔧 Test Utilities

### TestUtils Class
Use the `TestUtils` class for common testing operations:

```typescript
import { TestUtils } from '../test/setup';

// Create mock data
const mockUser = TestUtils.createMockUser();
const mockProduct = TestUtils.createMockProduct();

// Clean up database
await TestUtils.cleanupDatabase(prismaService);
```

### Mock Data
```typescript
const mockProduct = {
  id: 'test-id',
  title: 'Test Product',
  price: 99.99,
  // ... other properties
};
```

## 🧪 Testing Best Practices

### 1. Test Structure (AAA Pattern)
```typescript
it('should do something', async () => {
  // Arrange - Set up test data and mocks
  const input = 'test';
  mockService.method.mockResolvedValue('result');

  // Act - Execute the method being tested
  const result = await service.method(input);

  // Assert - Verify the results
  expect(result).toBe('result');
  expect(mockService.method).toHaveBeenCalledWith(input);
});
```

### 2. Descriptive Test Names
```typescript
// Good
it('should return 404 when product not found', async () => {});

// Bad
it('should work', async () => {});
```

### 3. Test Isolation
```typescript
beforeEach(async () => {
  // Clean up before each test
  await TestUtils.cleanupDatabase(prismaService);
});

afterEach(() => {
  // Clear mocks after each test
  jest.clearAllMocks();
});
```

### 4. Mock External Dependencies
```typescript
const mockPrismaService = {
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};
```

## 📊 Coverage Reports

### Generate Coverage
```bash
npm run test:cov
```

### Coverage Targets
- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### View Coverage Report
After running `npm run test:cov`, open `coverage/index.html` in your browser.

## 🐛 Debugging Tests

### 1. Debug Unit Tests
```bash
npm run test:debug
```

### 2. Debug E2E Tests
```bash
npm run test:e2e -- --detectOpenHandles --verbose
```

### 3. Use Console Logs
```typescript
it('should work', async () => {
  console.log('Test data:', testData);
  const result = await service.method(testData);
  console.log('Result:', result);
  expect(result).toBeDefined();
});
```

## 🔍 Common Testing Scenarios

### 1. Authentication Testing
```typescript
it('should require authentication', () => {
  return request(app.getHttpServer())
    .get('/protected-endpoint')
    .expect(401);
});

it('should allow authenticated access', () => {
  return request(app.getHttpServer())
    .get('/protected-endpoint')
    .set('Authorization', `Bearer ${validToken}`)
    .expect(200);
});
```

### 2. Validation Testing
```typescript
it('should validate required fields', () => {
  return request(app.getHttpServer())
    .post('/products')
    .send({}) // Empty object
    .expect(400)
    .expect((res) => {
      expect(res.body.message).toContain('title');
    });
});
```

### 3. Database Testing
```typescript
it('should create record in database', async () => {
  const productData = { title: 'Test', price: 100 };
  
  await request(app.getHttpServer())
    .post('/products')
    .send(productData)
    .expect(201);

  // Verify in database
  const created = await prismaService.product.findFirst({
    where: { title: 'Test' }
  });
  expect(created).toBeDefined();
});
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection**
   ```bash
   # Ensure test database exists
   createdb ecommerce_test
   
   # Run migrations
   DATABASE_URL=postgresql://test:test@localhost:5432/ecommerce_test npx prisma migrate deploy
   ```

2. **Test Timeouts**
   ```typescript
   // Increase timeout for slow tests
   it('should work', async () => {
     // Test code
   }, 10000); // 10 seconds
   ```

3. **Mock Issues**
   ```typescript
   // Reset mocks between tests
   afterEach(() => {
     jest.clearAllMocks();
   });
   ```

4. **Environment Variables**
   ```bash
   # Ensure .env.test exists
   cp .env.example .env.test
   ```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing/unit-testing)

## 🎯 Next Steps

1. **Write tests for all services**
2. **Add E2E tests for all endpoints**
3. **Set up CI/CD pipeline with tests**
4. **Monitor test coverage**
5. **Add performance tests**
6. **Implement contract testing**

Remember: **Good tests are like documentation that never gets outdated!** 📖✨ 