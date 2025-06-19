# Recommendation System Implementation Plan

This document outlines a comprehensive step-by-step implementation plan for adding a personalized recommendation system and user activity tracking to your e-commerce platform. Each task includes detailed instructions and can be marked as complete once finished.

## Phase 1: Database Schema & Backend Setup

### 1.1 Add User Activity Tracking Schema

- [x] **Create UserActivity Model in Prisma**
  ```prisma
  model UserActivity {
    id           String           @id @default(uuid())
    userId       String?          @map("user_id")
    sessionId    String           @map("session_id")
    activityType UserActivityType
    entityId     String?          @map("entity_id")
    entityType   String?          @map("entity_type")
    metadata     Json?
    ipAddress    String?          @map("ip_address")
    userAgent    String?          @map("user_agent")
    referrer     String?
    timestamp    DateTime         @default(now())
    user         User?            @relation(fields: [userId], references: [id])
  
    @@index([userId])
    @@index([sessionId])
    @@index([entityId, entityType])
    @@index([timestamp])
    @@map("user_activities")
  }
  
  enum UserActivityType {
    PAGE_VIEW
    PRODUCT_VIEW
    CATEGORY_VIEW
    SEARCH
    ADD_TO_CART
    REMOVE_FROM_CART
    ADD_TO_WISHLIST
    REMOVE_FROM_WISHLIST
    CHECKOUT_START
    CHECKOUT_COMPLETE
    PRODUCT_CLICK
  }
  ```
  **Enhancements:**
  - Added `deviceType`, `pageUrl`, and `duration` fields for better analytics
  - Added index on `activityType` for faster filtering
  - Added additional activity types: `FILTER_USE`, `SORT_USE`, `PAGINATION`

- [x] **Create BrowsingHistory Model in Prisma**
  ```prisma
  model BrowsingHistory {
    id         String   @id @default(uuid())
    userId     String?  @map("user_id")
    sessionId  String   @map("session_id")
    productId  String   @map("product_id")
    viewedAt   DateTime @default(now()) @map("viewed_at")
    timeSpent  Int?     @map("time_spent") // in seconds
    source     String?  // e.g., "search", "category", "recommendation"
    
    user       User?    @relation(fields: [userId], references: [id])
    product    Product  @relation(fields: [productId], references: [id])
  
    @@index([userId])
    @@index([sessionId])
    @@index([productId])
    @@index([viewedAt])
    @@map("browsing_history")
  }
  ```
  **Enhancements:**
  - Added `conversion` flag to track if browsing led to purchase
  - Added `lastViewedAt` and `viewCount` fields to track repeat views
  - Added index on `lastViewedAt` for time-based querying
  - Added `deviceType` field for multi-device tracking

- [x] **Create ProductRecommendation Model in Prisma**
  ```prisma
  model ProductRecommendation {
    id                  String             @id @default(uuid())
    userId              String?            @map("user_id")
    productId           String             @map("product_id")
    recommendedProductId String            @map("recommended_product_id")
    recommendationType  RecommendationType
    score               Float              @default(0)
    createdAt           DateTime           @default(now()) @map("created_at")
    updatedAt           DateTime           @updatedAt @map("updated_at")
    
    user                User?              @relation(fields: [userId], references: [id])
    product             Product            @relation("BaseProduct", fields: [productId], references: [id])
    recommendedProduct  Product            @relation("RecommendedProduct", fields: [recommendedProductId], references: [id])
  
    @@unique([userId, productId, recommendedProductId])
    @@index([userId])
    @@index([productId])
    @@map("product_recommendations")
  }
  
  enum RecommendationType {
    PERSONALIZED
    SIMILAR_PRODUCTS
    FREQUENTLY_BOUGHT_TOGETHER
    TRENDING
    RECENTLY_VIEWED
  }
  ```
  **Enhancements:**
  - Added tracking metrics: `viewed`, `clicked`, `converted`
  - Added `position` field to track recommendation placement
  - Added `batchId` relation to track recommendation generation
  - Added recommendation types: `TOP_RATED`, `BESTSELLERS`
  - Added index on `recommendationType` for faster filtering

- [x] **Added Additional Models for Scalability**
  - Created `RecommendationBatch` model to track algorithm versions and processing
  - Created `ProductSimilarity` model for efficient similar product lookups
  - Added proper database indexes for performance optimization
  - Set up cascade deletion to maintain data integrity
  - Added explicit relation naming for clarity

- [x] **Run Prisma Migration**
  - Created migration file: `add_recommendation_models`
  - Updated schema with all new models and relations

### 1.2 Create API Modules for Activity Tracking

- [x] **Create UserActivity DTO**
  - Create `src/modules/analytics/dto/create-user-activity.dto.ts`
  - Define fields for activity type, entity ID, etc.

- [x] **Create UserActivity Controller**
  - Create `src/modules/analytics/analytics.controller.ts`
  - Add endpoint for logging user activities
  - Implement security and rate limiting

- [x] **Create UserActivity Service**
  - Create `src/modules/analytics/analytics.service.ts`
  - Implement methods to store and query user activities
  - Add batch processing capabilities

- [x] **Create Analytics Module**
  - Create `src/modules/analytics/analytics.module.ts`
  - Register controllers, services, and repositories

### 1.3 Create Recommendations API Module

- [x] **Create Recommendation DTOs**
  - Create DTO for recommendation requests
  - Create DTO for recommendation responses

- [x] **Create Recommendations Controller**
  - Create endpoints for different recommendation types
  - Implement caching headers

- [x] **Create Recommendations Service**
  - Implement basic recommendation algorithms
  - Add methods for each recommendation type

- [x] **Create Recommendations Module**
  - Register all components
  - Configure module dependencies

### 1.4 Implement Recommendation Algorithms

- [x] **Implement "Recently Viewed" Algorithm**
  - Query browsing history table
  - Sort by recency
  - Filter out duplicates

- [x] **Implement "Similar Products" Algorithm**
  - Calculate similarity based on product attributes
  - Use categories, tags, and specifications
  - Generate similarity scores

- [x] **Implement "Frequently Bought Together" Algorithm**
  - Analyze order items data
  - Calculate co-occurrence frequency
  - Sort by frequency score

- [x] **Implement "Personalized Recommendations" Algorithm**
  - Combine user browsing, purchase, and wishlist data
  - Apply collaborative filtering
  - Generate personalized scores

## Phase 2: Backend Scheduled Jobs

### 2.1 Create Background Processing System

- [x] **Set Up Job Scheduling**
  - Configured Nest.js scheduler module and Bull queue for recommendations
  - Created robust job registry and consumer for all recommendation types

- [x] **Implement Recommendation Generation Job**
  - Implemented daily/hourly jobs to generate recommendations for all types
  - Added batch processing, logging, and error handling
  - Ensured jobs are tracked and status is updated in batch table

- [x] **Implement Data Cleanup Job**
  - Added scheduled jobs to remove old activity data and anonymize as needed
  - Implemented weekly cleanup for old recommendations and monthly DB optimization

### 2.2 Create Analytics Processing

- [x] **Implement Activity Aggregation**
  - Created ActivityAggregationService with daily, weekly, and monthly jobs
  - Implemented reports for user behavior by activity type, product, category, and search
  - Store aggregated metrics with proper optimization and indexing

- [x] **Implement Trend Detection**
  - Created TrendDetectionService with a time-weighted scoring algorithm
  - Implemented multi-window analysis (6h, 24h, 72h, 1 week) with different weights
  - Added comprehensive trending product recommendations and API endpoints

## Phase 3: Frontend Integration

### 3.0 Available Backend API Endpoints

The following API endpoints have been implemented in the backend and are ready for frontend integration:

#### Activity Tracking API
- **POST `/analytics/activity`** - Record a single user activity
  - Public endpoint (no authentication required)
  - Rate limited
  - Body: `CreateUserActivityDto` with:
    - `activityType`: Type of activity (PAGE_VIEW, PRODUCT_VIEW, etc.)
    - `entityId`: Optional ID of the entity involved (product ID, category ID, etc.)
    - `entityType`: Optional type of entity (product, category, etc.)
    - `sessionId`: Required for anonymous users
    - `metadata`: Optional JSON data for additional information
  - Headers:
    - `X-Session-ID`: Session ID for anonymous users
  - Auto-captures: IP address, user agent, and referrer if not provided

- **POST `/analytics/batch`** - Record multiple activities in one request
  - Public endpoint (no authentication required)
  - Rate limited
  - Body: Array of activity objects
  - Reduces network requests for tracking multiple actions

- **GET `/analytics/history`** - Get user browsing history
  - Public endpoint
  - Query params:
    - `userId`: For authenticated users
    - `sessionId`: For anonymous users
    - `limit`: Number of history items to return (default: 10)
  - Returns chronological list of previously viewed products

#### Recommendations API
- **GET `/recommendations`** - General recommendations endpoint
  - Accepts query parameters to determine type of recommendations
  - Query params:
    - `type`: One of PERSONALIZED, SIMILAR_PRODUCTS, FREQUENTLY_BOUGHT_TOGETHER, TRENDING, RECENTLY_VIEWED
    - Other params depending on type (userId, productId, etc.)
  - 15-minute cache for better performance

- **GET `/recommendations/similar/:productId`** - Get similar products
  - Public endpoint
  - Path param: `productId` - ID of the product to find similar items for
  - Query param: `limit` - Number of recommendations to return
  - 30-minute cache for better performance

- **GET `/recommendations/frequently-bought-together/:productId`** - Get frequently bought together products
  - Public endpoint
  - Path param: `productId` - ID of the product to find complementary items for
  - Query param: `limit` - Number of recommendations to return
  - 30-minute cache for better performance

- **GET `/recommendations/personalized`** - Get personalized recommendations for user
  - Requires authentication
  - Query params:
    - `userId`: User to get recommendations for
    - `limit`: Number of recommendations to return
  - 15-minute cache for better performance

- **GET `/recommendations/trending`** - Get trending products
  - Public endpoint
  - Query params:
    - `categoryId`: Optional category to filter trending products
    - `limit`: Number of trending products to return
  - 30-minute cache for better performance

- **GET `/recommendations/recently-viewed`** - Get recently viewed products
  - Query params:
    - `userId`: For authenticated users
    - `sessionId`: For anonymous users
    - `limit`: Number of products to return
  - 5-minute cache for better performance

### 3.1 Create Tracking Service

- [ ] **Create Activity Tracking Client**
  - Create `src/features/analytics/api/analytics-api.ts`
  - Implement methods for sending activity events:
    ```typescript
    // Track a single activity
    trackActivity(activity: CreateActivityDto): Promise<void>
    
    // Track multiple activities in batch
    trackBatchActivities(activities: CreateActivityDto[]): Promise<void>
    
    // Get user browsing history
    getUserHistory(userId?: string, sessionId?: string): Promise<Product[]>
    ```
  - Add retry mechanism for failed requests
  - Implement batching to reduce network requests

- [ ] **Create Activity Tracking Hook**
  - Create `src/features/analytics/hooks/useActivityTracking.ts`
  - Implement tracking methods for different events:
    ```typescript
    // Example hook interface
    const {
      trackPageView,
      trackProductView,
      trackAddToCart,
      trackSearch,
      trackCheckout,
      getBrowsingHistory
    } = useActivityTracking();
    ```
  - Handle session management for anonymous users
  - Implement debouncing for high-frequency events

- [ ] **Implement Global Tracking Context**
  - Create `src/features/analytics/context/AnalyticsContext.tsx`
  - Provide tracking methods to all components
  - Handle anonymous vs. authenticated tracking
  - Manage session ID persistence

### 3.2 Implement Event Tracking

- [ ] **Track Page Views**
  - Add to app layout component
  - Track route changes
  - Include referrer information

- [ ] **Track Product Interactions**
  - Track product clicks in listing pages
  - Track product detail views
  - Track time spent on product pages

- [ ] **Track Cart/Wishlist Interactions**
  - Track add to cart events
  - Track wishlist additions/removals
  - Track checkout steps

- [ ] **Track Search Interactions**
  - Track search queries
  - Track search result clicks
  - Track facet/filter usage

### 3.3 Create Recommendation Components

- [ ] **Create "Recently Viewed" Component**
  - Create `src/features/recommendations/components/RecentlyViewed.tsx`
  - Implement API integration with `/recommendations/recently-viewed` endpoint
  - Handle both authenticated and anonymous users
  - Add carousel for product display
  - Implement loading and error states

- [ ] **Create "Recommended for You" Component**
  - Create `src/features/recommendations/components/RecommendedForYou.tsx`
  - Implement API integration with `/recommendations/personalized` endpoint
  - Implement fallback using `/recommendations/trending` for new users
  - Add skeleton loading state

- [ ] **Create "Similar Products" Component**
  - Create `src/features/recommendations/components/SimilarProducts.tsx`
  - Implement API integration with `/recommendations/similar/:productId` endpoint
  - Add error handling and fallback options
  - Create responsive grid layout

- [ ] **Create "Frequently Bought Together" Component**
  - Create `src/features/recommendations/components/FrequentlyBoughtTogether.tsx`
  - Implement API integration with `/recommendations/frequently-bought-together/:productId` endpoint
  - Create bundled "Add all to cart" functionality
  - Calculate and display potential savings

### 3.4 Implement Page Integration

- [ ] **Add Recommendations to Home Page**
  - Add personalized section
  - Add trending products section
  - Implement skeleton loading

- [ ] **Add Recommendations to Product Detail Pages**
  - Add similar products
  - Add frequently bought together
  - Add recently viewed

- [ ] **Add Recommendations to Cart Page**
  - Add related to cart items section
  - Add "You might also like" section
  - Implement quick add buttons

- [ ] **Add Recommendations to Post-Purchase Page**
  - Add related to purchased items
  - Implement email opt-in for recommendations
  - Add special offers on recommended items

## Phase 4: Testing and Optimization

### 4.1 Test Recommendation Accuracy

- [ ] **Create Test Dataset**
  - Generate synthetic user data if needed
  - Create test user profiles
  - Set up test scenarios

- [ ] **Implement Accuracy Metrics**
  - Define click-through rate (CTR) tracking
  - Set up conversion tracking on recommendations
  - Create A/B test infrastructure

- [ ] **Run Recommendation Quality Tests**
  - Test with different user profiles
  - Compare algorithm performance
  - Document results and insights

### 4.2 Performance Optimization

- [ ] **Optimize Database Queries**
  - Add missing indexes
  - Optimize complex joins
  - Implement query caching

- [ ] **Implement API Caching**
  - Add Redis cache for recommendations
  - Configure appropriate TTLs
  - Implement cache invalidation

- [ ] **Optimize Frontend Loading**
  - Implement lazy loading for recommendation components
  - Add skeleton screens
  - Optimize images in recommendation carousels

### 4.3 A/B Testing Framework

- [ ] **Set Up A/B Testing Infrastructure**
  - Create experiment service
  - Implement user assignment to test groups
  - Set up tracking for test variants

- [ ] **Create Recommendation Algorithm Test**
  - Test different algorithm approaches
  - Measure engagement metrics
  - Document findings

- [ ] **Create UI Presentation Test**
  - Test different recommendation layouts
  - Test different call-to-action texts
  - Measure click-through rates

## Phase 5: Launch and Monitoring

### 5.1 Finalize Documentation

- [ ] **Create Technical Documentation**
  - Document database schema
  - Document API endpoints
  - Document recommendation algorithms

- [ ] **Create User Documentation**
  - Create admin guide for recommendation settings
  - Document privacy controls
  - Create FAQ for users

### 5.2 Set Up Monitoring

- [ ] **Implement Performance Monitoring**
  - Add metrics for API response times
  - Monitor database query performance
  - Set up alerts for performance issues

- [ ] **Implement Business Metrics Dashboard**
  - Track recommendation CTR
  - Track conversion from recommendations
  - Calculate recommendation ROI

### 5.3 Launch

- [ ] **Staged Rollout**
  - Launch to small percentage of users
  - Monitor performance and feedback
  - Gradually increase rollout

- [ ] **Full Launch**
  - Enable for all users
  - Announce new features
  - Monitor at scale

### 5.4 Continuous Improvement

- [ ] **Regular Algorithm Tuning**
  - Schedule regular algorithm reviews
  - Update weights based on performance
  - Add new data sources as available

- [ ] **Feature Expansion**
  - Add email recommendations
  - Implement push notification recommendations
  - Integrate with marketing campaigns

---

## Additional Resources

### Database Schema Diagrams
- User Activity & Browsing History Tables
- Recommendation Tables & Relationships

### API Endpoint Documentation
- Activity Tracking API
- Recommendations API

### Algorithm Documentation
- Similarity Calculation Methods
- Collaborative Filtering Implementation
- Hybrid Recommendation Approach

### Implementation Timeline
- Phase 1: 2-3 weeks
- Phase 2: 1-2 weeks
- Phase 3: 2-3 weeks
- Phase 4: 1-2 weeks
- Phase 5: 1 week

Total estimated implementation time: 7-11 weeks 