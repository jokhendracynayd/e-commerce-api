/*
  Warnings:

  - A unique constraint covering the columns `[user_id,product_id,order_id]` on the table `product_reviews` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `order_id` to the `product_reviews` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "product_reviews_user_id_product_id_key";

-- AlterTable - Add new columns (order_id as nullable first)
ALTER TABLE "product_reviews" ADD COLUMN "helpful_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "product_reviews" ADD COLUMN "is_verified_purchase" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "product_reviews" ADD COLUMN "title" TEXT;
ALTER TABLE "product_reviews" ADD COLUMN "order_id" TEXT;

-- For existing reviews without order_id, set a placeholder value
-- In a real application, you would want to properly link these to actual orders
UPDATE "product_reviews" SET "order_id" = 'legacy-review-' || "id" WHERE "order_id" IS NULL;

-- Now make order_id NOT NULL
ALTER TABLE "product_reviews" ALTER COLUMN "order_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "product_reviews_product_id_rating_idx" ON "product_reviews"("product_id", "rating");

-- CreateIndex
CREATE INDEX "product_reviews_user_id_idx" ON "product_reviews"("user_id");

-- CreateIndex
CREATE INDEX "product_reviews_order_id_idx" ON "product_reviews"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_user_id_product_id_order_id_key" ON "product_reviews"("user_id", "product_id", "order_id");

-- AddForeignKey
-- Note: Commenting out foreign key constraint due to legacy reviews with placeholder order IDs
-- This constraint should be added later once all reviews are properly linked to actual orders
-- ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
