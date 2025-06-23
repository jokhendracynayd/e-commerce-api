-- CreateEnum
CREATE TYPE "UserActivityType" AS ENUM ('PAGE_VIEW', 'PRODUCT_VIEW', 'CATEGORY_VIEW', 'BRAND_VIEW', 'SEARCH', 'FILTER_USE', 'SORT_USE', 'PAGINATION', 'ADD_TO_CART', 'REMOVE_FROM_CART', 'ADD_TO_WISHLIST', 'REMOVE_FROM_WISHLIST', 'CHECKOUT_START', 'CHECKOUT_STEP', 'CHECKOUT_COMPLETE', 'PRODUCT_CLICK', 'PRODUCT_SHARE', 'REVIEW_SUBMITTED', 'COUPON_APPLIED');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('PERSONALIZED', 'SIMILAR_PRODUCTS', 'FREQUENTLY_BOUGHT_TOGETHER', 'TRENDING', 'RECENTLY_VIEWED', 'TOP_RATED', 'BESTSELLERS', 'SEASONAL', 'PRICE_DROP', 'NEW_ARRIVALS', 'CATEGORY_TRENDING');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT NOT NULL,
    "activity_type" "UserActivityType" NOT NULL,
    "entity_id" TEXT,
    "entity_type" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "referrer" TEXT,
    "page_url" TEXT,
    "device_type" TEXT,
    "duration" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "browsing_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_viewed_at" TIMESTAMP(3) NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 1,
    "time_spent" INTEGER,
    "source" TEXT,
    "device_type" TEXT,
    "conversion" BOOLEAN NOT NULL DEFAULT false,
    "conversion_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "browsing_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_recommendations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "product_id" TEXT,
    "recommended_product_id" TEXT NOT NULL,
    "recommendation_type" "RecommendationType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" INTEGER,
    "batch_id" TEXT,
    "viewed" BOOLEAN NOT NULL DEFAULT false,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "viewed_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "converted_at" TIMESTAMP(3),
    "algorithm_version" TEXT,
    "metadata" JSONB,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_batches" (
    "id" TEXT NOT NULL,
    "batch_type" "RecommendationType" NOT NULL,
    "algorithm_version" TEXT NOT NULL,
    "total_generated" INTEGER NOT NULL DEFAULT 0,
    "status" "BatchStatus" NOT NULL DEFAULT 'RUNNING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_similarities" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "similar_product_id" TEXT NOT NULL,
    "similarity_score" DOUBLE PRECISION NOT NULL,
    "similarityType" TEXT NOT NULL,
    "last_calculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_similarities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_activities_user_id_timestamp_idx" ON "user_activities"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "user_activities_session_id_timestamp_idx" ON "user_activities"("session_id", "timestamp");

-- CreateIndex
CREATE INDEX "user_activities_entity_id_entity_type_idx" ON "user_activities"("entity_id", "entity_type");

-- CreateIndex
CREATE INDEX "user_activities_activity_type_timestamp_idx" ON "user_activities"("activity_type", "timestamp");

-- CreateIndex
CREATE INDEX "user_activities_timestamp_idx" ON "user_activities"("timestamp");

-- CreateIndex
CREATE INDEX "user_activities_created_at_idx" ON "user_activities"("created_at");

-- CreateIndex
CREATE INDEX "browsing_history_user_id_last_viewed_at_idx" ON "browsing_history"("user_id", "last_viewed_at");

-- CreateIndex
CREATE INDEX "browsing_history_session_id_viewed_at_idx" ON "browsing_history"("session_id", "viewed_at");

-- CreateIndex
CREATE INDEX "browsing_history_product_id_viewed_at_idx" ON "browsing_history"("product_id", "viewed_at");

-- CreateIndex
CREATE INDEX "browsing_history_source_viewed_at_idx" ON "browsing_history"("source", "viewed_at");

-- CreateIndex
CREATE INDEX "browsing_history_conversion_conversion_at_idx" ON "browsing_history"("conversion", "conversion_at");

-- CreateIndex
CREATE INDEX "browsing_history_created_at_idx" ON "browsing_history"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "browsing_history_user_id_product_id_key" ON "browsing_history"("user_id", "product_id");

-- CreateIndex
CREATE INDEX "product_recommendations_user_id_recommendation_type_score_idx" ON "product_recommendations"("user_id", "recommendation_type", "score");

-- CreateIndex
CREATE INDEX "product_recommendations_session_id_recommendation_type_scor_idx" ON "product_recommendations"("session_id", "recommendation_type", "score");

-- CreateIndex
CREATE INDEX "product_recommendations_product_id_recommendation_type_scor_idx" ON "product_recommendations"("product_id", "recommendation_type", "score");

-- CreateIndex
CREATE INDEX "product_recommendations_recommendation_type_score_created_a_idx" ON "product_recommendations"("recommendation_type", "score", "created_at");

-- CreateIndex
CREATE INDEX "product_recommendations_expires_at_idx" ON "product_recommendations"("expires_at");

-- CreateIndex
CREATE INDEX "product_recommendations_batch_id_idx" ON "product_recommendations"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_recommendations_user_id_session_id_product_id_recom_key" ON "product_recommendations"("user_id", "session_id", "product_id", "recommended_product_id", "recommendation_type");

-- CreateIndex
CREATE INDEX "recommendation_batches_batch_type_status_idx" ON "recommendation_batches"("batch_type", "status");

-- CreateIndex
CREATE INDEX "recommendation_batches_started_at_idx" ON "recommendation_batches"("started_at");

-- CreateIndex
CREATE INDEX "recommendation_batches_created_at_idx" ON "recommendation_batches"("created_at");

-- CreateIndex
CREATE INDEX "product_similarities_product_id_similarity_score_idx" ON "product_similarities"("product_id", "similarity_score");

-- CreateIndex
CREATE INDEX "product_similarities_similarityType_similarity_score_idx" ON "product_similarities"("similarityType", "similarity_score");

-- CreateIndex
CREATE INDEX "product_similarities_created_at_idx" ON "product_similarities"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_similarities_product_id_similar_product_id_similari_key" ON "product_similarities"("product_id", "similar_product_id", "similarityType");

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browsing_history" ADD CONSTRAINT "browsing_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browsing_history" ADD CONSTRAINT "browsing_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recommendations" ADD CONSTRAINT "product_recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recommendations" ADD CONSTRAINT "product_recommendations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recommendations" ADD CONSTRAINT "product_recommendations_recommended_product_id_fkey" FOREIGN KEY ("recommended_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recommendations" ADD CONSTRAINT "product_recommendations_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "recommendation_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_similarities" ADD CONSTRAINT "product_similarities_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_similarities" ADD CONSTRAINT "product_similarities_similar_product_id_fkey" FOREIGN KEY ("similar_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
