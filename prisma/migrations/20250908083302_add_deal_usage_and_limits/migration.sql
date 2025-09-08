-- CreateTable
CREATE TABLE "deal_usages" (
    "id" TEXT NOT NULL,
    "product_deal_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_limits" (
    "id" TEXT NOT NULL,
    "product_deal_id" TEXT NOT NULL,
    "max_total_usage" INTEGER,
    "max_user_usage" INTEGER,
    "current_usage" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deal_usages_product_deal_id_user_id_key" ON "deal_usages"("product_deal_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "deal_limits_product_deal_id_key" ON "deal_limits"("product_deal_id");

-- AddForeignKey
ALTER TABLE "deal_usages" ADD CONSTRAINT "deal_usages_product_deal_id_fkey" FOREIGN KEY ("product_deal_id") REFERENCES "product_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_usages" ADD CONSTRAINT "deal_usages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_usages" ADD CONSTRAINT "deal_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_usages" ADD CONSTRAINT "deal_usages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_limits" ADD CONSTRAINT "deal_limits_product_deal_id_fkey" FOREIGN KEY ("product_deal_id") REFERENCES "product_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
