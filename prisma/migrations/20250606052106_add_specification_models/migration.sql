-- CreateTable
CREATE TABLE "product_specifications" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "spec_key" TEXT NOT NULL,
    "spec_value" TEXT NOT NULL,
    "spec_group" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_filterable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specification_templates" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "spec_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "spec_group" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_filterable" BOOLEAN NOT NULL DEFAULT false,
    "data_type" TEXT NOT NULL DEFAULT 'string',
    "options" JSONB,

    CONSTRAINT "specification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_specifications_product_id_idx" ON "product_specifications"("product_id");

-- CreateIndex
CREATE INDEX "product_specifications_spec_key_spec_value_idx" ON "product_specifications"("spec_key", "spec_value");

-- CreateIndex
CREATE UNIQUE INDEX "product_specifications_product_id_spec_key_key" ON "product_specifications"("product_id", "spec_key");

-- CreateIndex
CREATE UNIQUE INDEX "specification_templates_category_id_spec_key_key" ON "specification_templates"("category_id", "spec_key");

-- AddForeignKey
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specification_templates" ADD CONSTRAINT "specification_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
