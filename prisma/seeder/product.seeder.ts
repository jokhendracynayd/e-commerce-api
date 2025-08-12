import { PrismaClient, Prisma, ProductVisibility, DealType, InventoryChangeType } from '@prisma/client';

type GeneratedProduct = {
  title: string;
  slug: string;
  subtitle?: string;
  description?: string;
  brandSlug?: string;
  categorySlug?: string;
  subCategorySlug?: string;
  price: string; // Decimal as string
  discountPrice?: string; // Decimal as string
  currency: string;
  sku: string;
  barcode?: string;
  weight?: number;
  dimensions?: Prisma.InputJsonValue;
  isActive?: boolean;
  isFeatured?: boolean;
  visibility?: ProductVisibility;
  isBestSeller?: boolean;
  isNew?: boolean;
  isSponsored?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  bankOffer?: Prisma.InputJsonValue | null;
  exchangeOffer?: Prisma.InputJsonValue | null;
  images: Array<{ url: string; alt?: string; position?: number }>;
  tags: string[]; // tag names
  specifications?: Array<{ key: string; value: string; group: string; sortOrder?: number; isFilterable?: boolean }>;
  deals?: Array<{ type: DealType; discount: string; startOffsetHours?: number; durationHours?: number }>;
  variants?: Array<{
    variantName: string;
    sku: string;
    price: string;
    stockQuantity: number;
    color?: string;
    colorHex?: string;
    size?: string;
    variantImage?: string | null;
  }>;
  stockQuantity: number;
};

const prisma = new PrismaClient();

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const withRetry = async <T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 200): Promise<T> => {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const delay = baseDelayMs * Math.pow(2, i);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw lastError;
};

const uniqueSlugAssigner = () => {
  const seen: Record<string, number> = {};
  return (base: string) => {
    let candidate = base;
    if (seen[candidate] == null) {
      seen[candidate] = 1;
      return candidate;
    }
    const next = seen[base] + 1;
    candidate = `${base}-${next}`;
    seen[base] = next;
    seen[candidate] = 1;
    return candidate;
  };
};

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const priceString = (amount: number): string => amount.toFixed(2);

const genSku = (brandCode: string, categoryCode: string): string =>
  `${brandCode}-${categoryCode}-${Date.now().toString().slice(-6)}-${randomInt(100, 999)}`.toUpperCase();

const imageFor = (slug: string, idx: number): string =>
  `https://dummyimage.com/800x600/111827/ffffff&text=${encodeURIComponent(slug)}+${idx + 1}`;

const TAGS = [
  'electronics', 'mobiles', 'laptops', 'audio', 'camera', 'wearables',
  'fashion', 'men', 'women', 'kids', 'footwear', 'accessories',
  'home', 'kitchen', 'furniture', 'decor', 'tools', 'storage',
  'beauty', 'skincare', 'haircare', 'fragrance', 'grooming',
  'sports', 'fitness', 'outdoor', 'grocery', 'appliances',
  'automotive', 'books', 'stationery', 'toys', 'baby', 'health'
];

const categoryAlias = (name: string): string => slugify(name).split('-')[0].slice(0, 4).toUpperCase();
const brandAlias = (name: string): string => slugify(name).split('-')[0].slice(0, 4).toUpperCase();

async function ensureTags(prismaClient: PrismaClient, names: string[]): Promise<void> {
  const ops = names.map((name) =>
    prismaClient.tag.upsert({ where: { name }, create: { name }, update: {} })
  );
  await prismaClient.$transaction(ops);
}

async function loadContext() {
  const [brands, categories] = await Promise.all([
    prisma.brand.findMany({ select: { id: true, name: true, slug: true } }),
    prisma.category.findMany({ select: { id: true, name: true, slug: true, parentId: true } }),
  ]);
  return { brands, categories };
}

function pickSubcategories(categories: Array<{ id: string; name: string; slug: string; parentId: string | null }>) {
  const byParent: Record<string, Array<{ id: string; name: string; slug: string; parentId: string | null }>> = {};
  for (const c of categories) {
    if (c.parentId) {
      if (!byParent[c.parentId]) byParent[c.parentId] = [];
      byParent[c.parentId].push(c);
    }
  }
  // Flatten some subcategories lists
  return Object.values(byParent).flat();
}

function generateProducts(
  brands: Array<{ id: string; name: string; slug: string }>,
  categories: Array<{ id: string; name: string; slug: string; parentId: string | null }>,
  countPerSubcategory = 4
): GeneratedProduct[] {
  const subcategories = pickSubcategories(categories);
  const assignSlug = uniqueSlugAssigner();
  const products: GeneratedProduct[] = [];

  for (const sub of subcategories) {
    const parent = categories.find((c) => c.id === sub.parentId) || sub;
    for (let i = 0; i < countPerSubcategory; i += 1) {
      const brand = randomChoice(brands);
      const bCode = brandAlias(brand.name);
      const cCode = categoryAlias(sub.name || parent.name);
      const baseTitle = `${brand.name} ${sub.name}`;
      const baseSlug = slugify(`${baseTitle}-${i + 1}`);
      const slug = assignSlug(baseSlug);

      const basePrice = randomInt(499, 199999) / 1; // base in INR
      const hasDiscount = Math.random() < 0.6;
      const discount = hasDiscount ? Math.max(100, Math.floor(basePrice * randomInt(5, 25) / 100)) : 0;
      const price = basePrice;
      const discountPrice = hasDiscount ? price - discount : undefined;

      const stockQuantity = randomInt(0, 250);
      const images = Array.from({ length: randomInt(2, 4) }).map((_, idx) => ({
        url: imageFor(slug, idx),
        alt: `${baseTitle} image ${idx + 1}`,
        position: idx,
      }));

      const variants: GeneratedProduct['variants'] = Math.random() < 0.5
        ? [
            {
              variantName: 'Default',
              sku: genSku(bCode, cCode) + '-A',
              price: priceString(price),
              stockQuantity: Math.max(0, Math.floor(stockQuantity / 2)),
            },
            {
              variantName: 'Alternate',
              sku: genSku(bCode, cCode) + '-B',
              price: priceString(Math.max(99, price - randomInt(50, 500))),
              stockQuantity: Math.max(0, Math.floor(stockQuantity / 2)),
              color: Math.random() < 0.5 ? 'Black' : 'Blue',
              colorHex: Math.random() < 0.5 ? '#000000' : '#1E3A8A',
            },
          ]
        : undefined;

      const specs: GeneratedProduct['specifications'] = parent.name.toLowerCase().includes('electronics')
        ? [
            { key: 'Brand', value: brand.name, group: 'General' },
            { key: 'Model', value: `${bCode}-${cCode}-${randomInt(100, 999)}`, group: 'General' },
            { key: 'Warranty', value: `${randomInt(6, 24)} months`, group: 'General' },
          ]
        : parent.name.toLowerCase().includes('fashion')
        ? [
            { key: 'Brand', value: brand.name, group: 'General' },
            { key: 'Material', value: randomChoice(['Cotton', 'Polyester', 'Denim', 'Leather']), group: 'Details' },
            { key: 'Country of Origin', value: 'India', group: 'Details' },
          ]
        : [
            { key: 'Brand', value: brand.name, group: 'General' },
          ];

      const deals: GeneratedProduct['deals'] = Math.random() < 0.3
        ? [
            {
              type: randomChoice([DealType.FLASH, DealType.TRENDING, DealType.DEAL_OF_DAY]),
              discount: priceString(randomInt(5, 30)),
              startOffsetHours: 0,
              durationHours: randomInt(6, 48),
            },
          ]
        : undefined;

      const tags = [
        slugify(parent.name).split('-')[0],
        slugify(sub.name).split('-')[0],
        ...randomChoice([[brand.name], []]).map((t) => slugify(t)),
      ];

      const product: GeneratedProduct = {
        title: baseTitle,
        slug,
        subtitle: `${parent.name} by ${brand.name}`,
        description: `${baseTitle} available online in India. Great prices on ${parent.name.toLowerCase()}.`,
        brandSlug: brand.slug,
        categorySlug: parent.slug,
        subCategorySlug: sub.slug,
        price: priceString(price),
        discountPrice: discountPrice ? priceString(discountPrice) : undefined,
        currency: 'INR',
        sku: genSku(bCode, cCode),
        barcode: `890${randomInt(100000000, 999999999)}`,
        weight: Math.random() < 0.5 ? Number((Math.random() * 2 + 0.1).toFixed(2)) : undefined,
        dimensions: Math.random() < 0.5 ? ({ length: randomInt(5, 50), width: randomInt(5, 50), height: randomInt(5, 50) } as Prisma.InputJsonValue) : undefined,
        isActive: true,
        isFeatured: Math.random() < 0.15,
        visibility: ProductVisibility.PUBLIC,
        isBestSeller: Math.random() < 0.1,
        isNew: Math.random() < 0.3,
        isSponsored: Math.random() < 0.05,
        metaTitle: baseTitle,
        metaDescription: `${baseTitle} - Buy online at best prices in India`,
        metaKeywords: `${parent.name}, ${sub.name}, ${brand.name}`,
        bankOffer: Math.random() < 0.4 ? { provider: 'HDFC', cashbackPercent: 10 } : null,
        exchangeOffer: Math.random() < 0.2 ? { eligible: true, maxSavings: 2000 } : null,
        images,
        tags,
        specifications: specs,
        deals,
        variants,
        stockQuantity,
      };
      products.push(product);
    }
  }

  return products;
}

async function upsertProducts(products: GeneratedProduct[]) {
  // Ensure tags exist
  await ensureTags(prisma, Array.from(new Set([...TAGS, ...products.flatMap((p) => p.tags)])));

  const ops: Prisma.PrismaPromise<unknown>[] = [];

  for (const p of products) {
    const createData: Prisma.ProductCreateInput = {
      title: p.title,
      slug: p.slug,
      description: p.description ?? null,
      shortDescription: p.subtitle ?? null,
      price: p.price,
      discountPrice: p.discountPrice ?? null,
      currency: p.currency,
      stockQuantity: p.stockQuantity,
      sku: p.sku,
      barcode: p.barcode ?? null,
      weight: p.weight ?? null,
      dimensions: p.dimensions ?? undefined,
      isActive: p.isActive ?? true,
      isFeatured: p.isFeatured ?? false,
      visibility: p.visibility ?? ProductVisibility.PUBLIC,
      metaTitle: p.metaTitle ?? null,
      metaDescription: p.metaDescription ?? null,
      metaKeywords: p.metaKeywords ?? null,
      bankOffer: p.bankOffer ?? undefined,
      exchangeOffer: p.exchangeOffer ?? undefined,
      brand: p.brandSlug ? { connect: { slug: p.brandSlug } } : undefined,
      category: p.categorySlug ? { connect: { slug: p.categorySlug } } : undefined,
      subCategory: p.subCategorySlug ? { connect: { slug: p.subCategorySlug } } : undefined,
      images: {
        create: p.images.map((img, idx) => ({
          imageUrl: img.url,
          altText: img.alt ?? null,
          position: img.position ?? idx,
        })),
      },
      tags: {
        create: Array.from(new Set(p.tags.map((t) => t.toLowerCase()))).map((name) => ({
          tag: { connect: { name } },
        })),
      },
      specifications: p.specifications
        ? {
            create: p.specifications.map((s, idx) => ({
              specKey: s.key,
              specValue: s.value,
              specGroup: s.group,
              sortOrder: s.sortOrder ?? idx,
              isFilterable: s.isFilterable ?? false,
            })),
          }
        : undefined,
      variants: p.variants
        ? {
            create: p.variants.map((v) => ({
              variantName: v.variantName,
              sku: v.sku,
              price: v.price,
              stockQuantity: v.stockQuantity,
              color: v.color ?? null,
              colorHex: v.colorHex ?? null,
              size: v.size ?? null,
              variantImage: v.variantImage ?? null,
            })),
          }
        : undefined,
    };

    const updateData: Prisma.ProductUpdateInput = {
      title: createData.title,
      description: createData.description,
      shortDescription: createData.shortDescription,
      price: createData.price,
      discountPrice: createData.discountPrice,
      currency: createData.currency,
      stockQuantity: createData.stockQuantity,
      barcode: createData.barcode,
      weight: createData.weight,
      dimensions: createData.dimensions as any,
      isActive: createData.isActive,
      isFeatured: createData.isFeatured,
      visibility: createData.visibility,
      metaTitle: createData.metaTitle,
      metaDescription: createData.metaDescription,
      metaKeywords: createData.metaKeywords,
      bankOffer: createData.bankOffer as any,
      exchangeOffer: createData.exchangeOffer as any,
      brand: createData.brand,
      category: createData.category,
      subCategory: createData.subCategory,
      // Replace images/specs/tags/variants for simplicity
      images: { deleteMany: {}, create: (createData.images as any).create },
      specifications: createData.specifications
        ? { deleteMany: {}, create: (createData.specifications as any).create }
        : { deleteMany: {} },
      tags: { deleteMany: {}, create: (createData.tags as any).create },
      variants: createData.variants ? { deleteMany: {}, create: (createData.variants as any).create } : { deleteMany: {} },
    };

    ops.push(
      prisma.product.upsert({
        where: { slug: p.slug },
        create: createData,
        update: updateData,
      })
    );
  }

  // Chunk transactions to avoid exceeding param limits
  const chunkSize = 20;
  for (let i = 0; i < ops.length; i += chunkSize) {
    const chunk = ops.slice(i, i + chunkSize) as Prisma.PrismaPromise<any>[];
    // eslint-disable-next-line no-await-in-loop
    await withRetry(() => prisma.$transaction(chunk));
  }
}

async function seedInventoryForProducts() {
  const products = await prisma.product.findMany({ select: { id: true, stockQuantity: true } });
  const ops: Prisma.PrismaPromise<any>[] = [];
  for (const p of products) {
    ops.push(
      prisma.inventory.upsert({
        where: { productId: p.id },
        create: {
          product: { connect: { id: p.id } },
          stockQuantity: p.stockQuantity,
          reservedQuantity: 0,
          threshold: 5,
        },
        update: {
          stockQuantity: p.stockQuantity,
        },
      })
    );

    ops.push(
      prisma.inventoryLog.create({
        data: {
          product: { connect: { id: p.id } },
          changeType: InventoryChangeType.RESTOCK,
          quantityChanged: p.stockQuantity,
          note: 'Initial stock load',
        },
      })
    );
  }
  const chunkSize = 50;
  for (let i = 0; i < ops.length; i += chunkSize) {
    const chunk = ops.slice(i, i + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    await withRetry(() => prisma.$transaction(chunk));
  }
}

export async function seedProducts(prismaClient: PrismaClient = prisma): Promise<void> {
  const { brands, categories } = await loadContext();
  if (brands.length === 0 || categories.length === 0) {
    // eslint-disable-next-line no-console
    console.warn('Brands or categories missing. Seed brands and categories first.');
    return;
  }

  await ensureTags(prismaClient, TAGS);

  const products = generateProducts(brands, categories, 3); // adjust density here
  await upsertProducts(products);
  await seedInventoryForProducts();

  // Optionally add deals for some products
  const someProducts = await prisma.product.findMany({ select: { id: true } });
  const chosen = someProducts.slice(0, Math.min(50, Math.floor(someProducts.length / 3)));
  if (chosen.length > 0) {
    const chosenIds = chosen.map((p) => p.id);
    await withRetry(() =>
      prisma.$transaction([
        prisma.productDeal.deleteMany({ where: { productId: { in: chosenIds } } }),
        prisma.productDeal.createMany({
          data: chosenIds.map((id) => ({
            productId: id,
            dealType: randomChoice([DealType.FLASH, DealType.TRENDING, DealType.DEAL_OF_DAY]),
            discount: priceString(randomInt(5, 35)),
            startTime: new Date(),
            endTime: new Date(Date.now() + randomInt(6, 72) * 3600 * 1000),
          })),
        }),
      ])
    );
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded products successfully. Total generated: ${products.length}`);
}

if (require.main === module) {
  seedProducts()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('Product seeding completed.');
      process.exitCode = 0;
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Product seeding failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}


