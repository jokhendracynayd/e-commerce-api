-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "color" TEXT,
ADD COLUMN     "color_hex" TEXT,
ADD COLUMN     "size" TEXT,
ADD COLUMN     "variant_image" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "bank_offer" JSONB,
ADD COLUMN     "exchange_offer" JSONB,
ADD COLUMN     "is_best_seller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_new" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_sponsored" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subtitle" TEXT;
