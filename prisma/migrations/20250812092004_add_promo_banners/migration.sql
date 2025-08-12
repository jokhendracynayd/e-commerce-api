-- CreateEnum
CREATE TYPE "BannerPlacement" AS ENUM ('HOME_TOP', 'HOME_MIDDLE', 'HOME_BOTTOM', 'CATEGORY', 'PRODUCT', 'CHECKOUT', 'GLOBAL');

-- CreateEnum
CREATE TYPE "BannerDevice" AS ENUM ('ALL', 'DESKTOP', 'MOBILE');

-- CreateTable
CREATE TABLE "promo_banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "image_url" TEXT NOT NULL,
    "link_url" TEXT,
    "cta_text" TEXT,
    "background_color" TEXT,
    "text_color" TEXT,
    "placement" "BannerPlacement" NOT NULL,
    "device" "BannerDevice" NOT NULL DEFAULT 'ALL',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "visible_from" TIMESTAMP(3),
    "visible_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promo_banners_placement_device_is_active_visible_from_visib_idx" ON "promo_banners"("placement", "device", "is_active", "visible_from", "visible_to");
