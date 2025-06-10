<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# E-Commerce API

A scalable, maintainable, and secure backend API for an e-commerce platform built with NestJS, PostgreSQL, Prisma ORM, and Redis.

## Features

- User authentication with JWT
- Role-based authorization
- Product management
- Category management with hierarchical structure
- Shopping cart functionality
- Order management
- Address management
- Review system
- Redis caching for improved performance
- PostgreSQL database with Prisma ORM

## Tech Stack

- NestJS - A progressive Node.js framework
- PostgreSQL - Relational database
- Prisma - Next-generation ORM
- Redis - In-memory data store for caching
- JWT - JSON Web Tokens for authentication
- Helmet - Secure HTTP headers
- Class Validator & Class Transformer - Request validation and transformation

## Prerequisites

- Node.js (v16+)
- npm (v8+)
- PostgreSQL
- Redis

## Setup

1. Clone the repository

```bash
git clone https://github.com/yourusername/e-commerce-api.git
cd e-commerce-api
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

Create a `.env` file in the root directory and add the following variables:

```
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/ecommerce?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRATION="1d"

# App
PORT=3001
NODE_ENV=development

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

4. Run Prisma migrations

```bash
npx prisma migrate dev --name init
```

5. Start the application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Documentation

The API will be available at `http://localhost:3001/api`

### Authentication Endpoints

- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login a user
- POST `/api/auth/refresh` - Refresh JWT token
- POST `/api/auth/logout` - Logout a user
- GET `/api/auth/me` - Get current user information

### Product Endpoints

- GET `/api/products` - Get all products (with filtering, pagination, and sorting)
- GET `/api/products/:id` - Get product by ID
- POST `/api/products` - Create a new product (Admin only)
- PATCH `/api/products/:id` - Update a product (Admin only)
- DELETE `/api/products/:id` - Delete a product (Admin only)

### Category Endpoints

- GET `/api/categories` - Get all categories
- GET `/api/categories/:id` - Get category by ID
- POST `/api/categories` - Create a new category (Admin only)
- PATCH `/api/categories/:id` - Update a category (Admin only)
- DELETE `/api/categories/:id` - Delete a category (Admin only)

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

This project is licensed under the MIT License.

## Cart Merge Functionality Improvements

We've made several improvements to the cart functionality, particularly focusing on the anonymous cart merging feature:

### Backend Improvements

1. **Transaction-based Merging**: The `mergeAnonymousCart` method now uses a Prisma transaction for atomic operations, ensuring that all cart items are processed together or none at all.

2. **Pre-validation of All Items**: Before making any changes to the database, all items are validated to ensure they exist, are active, and have sufficient stock.

3. **Better Error Handling**: More detailed error messages are now provided when merging fails, with specific reasons for each item that couldn't be merged.

4. **Optimized Database Queries**: Reduced redundant database queries by validating all items first, then processing the valid ones.

5. **Improved Logging**: Enhanced logging for both successful operations and failures to help with debugging.

6. **Proper additionalInfo Handling**: We now correctly handle additionalInfo metadata for cart items.

### Frontend Improvements

1. **Standardized Field Names**: Consistently use `variantId` instead of mixing `variantId` and `productVariantId`.

2. **Enhanced Error Handling**: Better error extraction from API responses with specific error messages shown to users.

3. **Debounce Protection**: Added debouncing to prevent multiple rapid merge operations when users log in.

4. **Proper Type Safety**: Improved TypeScript types to match actual API response structures.

5. **Optimized API Calls**: Removed redundant backend calls and improved the cart sync logic flow.

6. **Extended Timeout for Merge Operations**: Doubled the timeout for merge operations since they might take longer than standard requests.

7. **Improved localStorage Management**: Better handling of localStorage to prevent unnecessary storage operations.

The cart system now provides a more reliable, consistent, and user-friendly experience when merging anonymous carts after user login.
