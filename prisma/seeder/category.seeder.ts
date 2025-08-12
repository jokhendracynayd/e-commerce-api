import { PrismaClient, Prisma } from '@prisma/client';

type CategoryTreeSeed = {
  name: string;
  slug?: string;
  description?: string;
  icon?: string | null;
  children?: CategoryTreeSeed[];
};

type FlattenedCategorySeed = {
  name: string;
  slug: string;
  description?: string;
  icon?: string | null;
  parentSlug?: string;
  depth: number;
};

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

const assignUniqueSlug = (base: string, seen: Record<string, number>): string => {
  let candidate = base;
  if (seen[candidate] == null) {
    seen[candidate] = 1;
    return candidate;
  }
  // suffix with incremental counter until unique
  // if base already used N times, next should be base-(N+1)
  const next = seen[base] + 1;
  candidate = `${base}-${next}`;
  seen[base] = next;
  seen[candidate] = 1;
  return candidate;
};

const flattenCategories = (trees: CategoryTreeSeed[]): FlattenedCategorySeed[] => {
  const results: FlattenedCategorySeed[] = [];
  const seen: Record<string, number> = {};

  const walk = (nodes: CategoryTreeSeed[], parentSlug: string | undefined, depth: number) => {
    for (const node of nodes) {
      const base = slugify(node.slug || node.name);
      const assigned = assignUniqueSlug(base, seen);
      results.push({
        name: node.name.trim(),
        slug: assigned,
        description: node.description?.trim() || undefined,
        icon: node.icon || undefined,
        parentSlug,
        depth,
      });
      if (node.children && node.children.length > 0) {
        walk(node.children, assigned, depth + 1);
      }
    }
  };

  walk(trees, undefined, 0);
  return results.sort((a, b) => a.depth - b.depth);
};

export const CATEGORY_SEEDS: CategoryTreeSeed[] = [
  {
    name: 'Electronics',
    description: 'Smartphones, laptops, televisions, audio and smart devices.',
    icon: 'https://cdn-icons-png.flaticon.com/128/3522/3522982.png',
    children: [
      {
        name: 'Mobiles & Accessories',
        description: 'Smartphones, cases, screen guards, chargers and power banks.',
        icon: 'https://cdn-icons-png.flaticon.com/128/724/724664.png',
      },
      {
        name: 'Laptops & Computers',
        description: 'Laptops, desktops, components, monitors and peripherals.',
        icon: 'https://cdn-icons-png.flaticon.com/128/1997/1997928.png',
      },
      {
        name: 'Wearables',
        description: 'Smartwatches, fitness bands and wearables accessories.',
        icon: 'https://cdn-icons-png.flaticon.com/128/2965/2965567.png',
      },
      {
        name: 'Audio',
        description: 'Headphones, earphones, speakers, soundbars and DACs.',
        icon: 'https://cdn-icons-png.flaticon.com/128/709/709722.png',
      },
      {
        name: 'Cameras & Photography',
        description: 'DSLR, mirrorless, lenses, tripods and photography gear.',
        icon: 'https://cdn-icons-png.flaticon.com/128/2920/2920244.png',
      },
      {
        name: 'Tablets',
        description: 'Android and iPad tablets and tablet accessories.',
        icon: 'https://cdn-icons-png.flaticon.com/128/1828/1828945.png',
      },
      {
        name: 'Televisions',
        description: 'LED, QLED and OLED TVs and TV accessories.',
        icon: 'https://cdn-icons-png.flaticon.com/128/545/545245.png',
      },
      {
        name: 'Smart Home',
        description: 'Smart lights, plugs, security cameras and voice assistants.',
        icon: 'https://cdn-icons-png.flaticon.com/128/2933/2933941.png',
      },
    ],
  },
  {
    name: 'Fashion',
    description: 'Men, women and kids clothing, footwear and accessories.',
    icon: 'https://cdn-icons-png.flaticon.com/128/869/869636.png',
    children: [
      {
        name: 'Men',
        description: 'Apparel, footwear and accessories for men.',
        icon: 'https://cdn-icons-png.flaticon.com/128/921/921071.png',
        children: [
          {
            name: 'Clothing',
            description: 'T-shirts, shirts, jeans, trousers, ethnic wear and more.',
            icon: 'https://cdn-icons-png.flaticon.com/128/892/892458.png',
          },
          {
            name: 'Footwear',
            description: 'Casual, formal and sports shoes, sandals and slippers.',
            icon: 'https://cdn-icons-png.flaticon.com/128/3531/3531648.png',
          },
          {
            name: 'Accessories',
            description: 'Belts, wallets, caps, sunglasses and watches.',
            icon: 'https://cdn-icons-png.flaticon.com/128/1032/1032915.png',
          },
        ],
      },
      {
        name: 'Women',
        description: 'Apparel, footwear and accessories for women.',
        icon: 'https://cdn-icons-png.flaticon.com/128/921/921087.png',
        children: [
          {
            name: 'Ethnic Wear',
            description: 'Sarees, kurtas, lehengas and more.',
            icon: 'https://cdn-icons-png.flaticon.com/128/9943/9943203.png',
          },
          {
            name: 'Western Wear',
            description: 'Dresses, tops, jeans, skirts and more.',
            icon: 'https://cdn-icons-png.flaticon.com/128/3531/3531657.png',
          },
          {
            name: 'Footwear',
            description: 'Heels, flats, sneakers, sandals and more.',
            icon: 'https://cdn-icons-png.flaticon.com/128/3531/3531672.png',
          },
          {
            name: 'Accessories',
            description: 'Handbags, jewellery, scarves and sunglasses.',
            icon: 'https://cdn-icons-png.flaticon.com/128/3176/3176397.png',
          },
        ],
      },
      {
        name: 'Kids',
        description: 'Clothing, footwear and accessories for kids.',
        icon: 'https://cdn-icons-png.flaticon.com/128/2934/2934521.png',
      },
    ],
  },
  {
    name: 'Home & Kitchen',
    description: 'Cookware, dining, home improvement, decor and storage.',
    icon: 'https://cdn-icons-png.flaticon.com/128/1046/1046869.png',
    children: [
      {
        name: 'Kitchen & Dining',
        description: 'Cookware, dining sets, storage and serving.',
        icon: 'https://cdn-icons-png.flaticon.com/128/859/859270.png',
      },
      {
        name: 'Furniture',
        description: 'Sofas, beds, tables, chairs and wardrobes.',
        icon: 'https://cdn-icons-png.flaticon.com/128/706/706164.png',
      },
      {
        name: 'Home Decor',
        description: 'Clocks, wall art, lighting, vases and more.',
        icon: 'https://cdn-icons-png.flaticon.com/128/3581/3581957.png',
      },
      {
        name: 'Tools & Home Improvement',
        description: 'Electrical, plumbing tools and hardware.',
        icon: 'https://cdn-icons-png.flaticon.com/128/799/799634.png',
      },
      {
        name: 'Storage & Organization',
        description: 'Shelves, boxes, racks and organizers.',
        icon: 'https://cdn-icons-png.flaticon.com/128/1147/1147931.png',
      },
    ],
  },
  {
    name: 'Beauty & Personal Care',
    description: 'Makeup, skincare, haircare, fragrances and grooming.',
    icon: 'https://cdn-icons-png.flaticon.com/128/929/929430.png',
    children: [
      { name: 'Makeup', description: 'Face, eyes, lips and nails.', icon: 'https://cdn-icons-png.flaticon.com/128/189/189093.png' },
      { name: 'Skincare', description: 'Cleansers, moisturizers, serums and masks.', icon: 'https://cdn-icons-png.flaticon.com/128/1040/1040230.png' },
      { name: 'Haircare', description: 'Shampoo, conditioner, oils and styling.', icon: 'https://cdn-icons-png.flaticon.com/128/3927/3927504.png' },
      { name: 'Fragrances', description: 'Perfumes, deodorants and body mists.', icon: 'https://cdn-icons-png.flaticon.com/128/2965/2965820.png' },
      { name: 'Mens Grooming', description: 'Shaving, beard care and grooming kits.', icon: 'https://cdn-icons-png.flaticon.com/128/2965/2965675.png' },
    ],
  },
  {
    name: 'Sports & Outdoors',
    description: 'Fitness, outdoor recreation, team sports and footwear.',
    icon: 'https://cdn-icons-png.flaticon.com/128/2331/2331970.png',
    children: [
      { name: 'Fitness', description: 'Gym gear, yoga, strength and cardio.', icon: 'https://cdn-icons-png.flaticon.com/128/2964/2964514.png' },
      { name: 'Outdoor Recreation', description: 'Camping, hiking and adventure sports.', icon: 'https://cdn-icons-png.flaticon.com/128/854/854878.png' },
      { name: 'Team Sports', description: 'Cricket, football, badminton and more.', icon: 'https://cdn-icons-png.flaticon.com/128/1043/1043299.png' },
      { name: 'Footwear', description: 'Sports shoes, spikes and cleats.', icon: 'https://cdn-icons-png.flaticon.com/128/2331/2331989.png' },
    ],
  },
  {
    name: 'Grocery & Gourmet Foods',
    description: 'Beverages, snacks, staples and packaged foods.',
    icon: 'https://cdn-icons-png.flaticon.com/128/706/706164.png',
    children: [
      { name: 'Beverages', description: 'Tea, coffee, juices and soft drinks.', icon: 'https://cdn-icons-png.flaticon.com/128/135/135621.png' },
      { name: 'Snacks', description: 'Chips, biscuits, chocolates and more.', icon: 'https://cdn-icons-png.flaticon.com/128/3072/3072069.png' },
      { name: 'Cooking Essentials', description: 'Oil, ghee, masalas, grains and pulses.', icon: 'https://cdn-icons-png.flaticon.com/128/3081/3081648.png' },
      { name: 'Packaged Foods', description: 'Breakfast cereals, ready-to-eat and sauces.', icon: 'https://cdn-icons-png.flaticon.com/128/3075/3075929.png' },
    ],
  },
  {
    name: 'Appliances',
    description: 'Large, small and seasonal home appliances.',
    icon: 'https://cdn-icons-png.flaticon.com/128/3659/3659893.png',
    children: [
      { name: 'Kitchen Appliances', description: 'Mixers, microwaves, OTGs and more.', icon: 'https://cdn-icons-png.flaticon.com/128/1046/1046857.png' },
      { name: 'Large Appliances', description: 'Refrigerators, ACs, washing machines.', icon: 'https://cdn-icons-png.flaticon.com/128/1046/1046890.png' },
      { name: 'Seasonal Appliances', description: 'Air coolers, heaters and humidifiers.', icon: 'https://cdn-icons-png.flaticon.com/128/427/427735.png' },
    ],
  },
  {
    name: 'Furniture',
    description: 'Indoor and outdoor furniture for every space.',
    icon: 'https://cdn-icons-png.flaticon.com/128/3643/3643831.png',
    children: [
      { name: 'Living Room', description: 'Sofas, TV units, coffee tables and more.', icon: 'https://cdn-icons-png.flaticon.com/128/3068/3068875.png' },
      { name: 'Bedroom', description: 'Beds, wardrobes, bedside tables and more.', icon: 'https://cdn-icons-png.flaticon.com/128/1046/1046851.png' },
      { name: 'Office Furniture', description: 'Office desks, chairs and storage.', icon: 'https://cdn-icons-png.flaticon.com/128/1034/1034823.png' },
      { name: 'Outdoor Furniture', description: 'Patio sets, swings and garden furniture.', icon: 'https://cdn-icons-png.flaticon.com/128/2979/2979898.png' },
    ],
  },
  {
    name: 'Automotive',
    description: 'Car and bike accessories, tools and care.',
    icon: 'https://cdn-icons-png.flaticon.com/128/3600/3600923.png',
    children: [
      { name: 'Car Accessories', description: 'Covers, floor mats, seat covers and more.', icon: 'https://cdn-icons-png.flaticon.com/128/741/741407.png' },
      { name: 'Bike Accessories', description: 'Helmets, gloves, guards and more.', icon: 'https://cdn-icons-png.flaticon.com/128/3202/3202926.png' },
      { name: 'Oils & Fluids', description: 'Engine oil, coolants and additives.', icon: 'https://cdn-icons-png.flaticon.com/128/3050/3050276.png' },
      { name: 'Tools & Equipment', description: 'Tool kits, jacks and diagnostic tools.', icon: 'https://cdn-icons-png.flaticon.com/128/1829/1829586.png' },
    ],
  },
  {
    name: 'Books & Stationery',
    description: 'Books, academic materials and office supplies.',
    icon: 'https://cdn-icons-png.flaticon.com/128/2232/2232688.png',
    children: [
      { name: 'Fiction', description: 'Novels, short stories and literature.', icon: 'https://cdn-icons-png.flaticon.com/128/3145/3145757.png' },
      { name: 'Non-Fiction', description: 'Biographies, self-help and business.', icon: 'https://cdn-icons-png.flaticon.com/128/2232/2232719.png' },
      { name: 'Academic', description: 'Textbooks, guides and exam prep.', icon: 'https://cdn-icons-png.flaticon.com/128/2942/2942851.png' },
      { name: 'Office Supplies', description: 'Notebooks, pens, files and desk items.', icon: 'https://cdn-icons-png.flaticon.com/128/2738/2738730.png' },
    ],
  },
  {
    name: 'Toys & Baby Products',
    description: 'Toys, games, baby care and nursery items.',
    icon: 'https://cdn-icons-png.flaticon.com/128/2746/2746188.png',
    children: [
      { name: 'Toys & Games', description: 'Learning toys, puzzles and outdoor games.', icon: 'https://cdn-icons-png.flaticon.com/128/3063/3063095.png' },
      { name: 'Baby Care', description: 'Diapers, wipes, lotions and bath essentials.', icon: 'https://cdn-icons-png.flaticon.com/128/3170/3170733.png' },
      { name: 'Strollers & Car Seats', description: 'Strollers, prams and car seats.', icon: 'https://cdn-icons-png.flaticon.com/128/2961/2961306.png' },
      { name: 'Clothing', description: 'Clothing and footwear for babies and toddlers.', icon: 'https://cdn-icons-png.flaticon.com/128/1046/1046874.png' },
    ],
  },
  {
    name: 'Health & Wellness',
    description: 'Supplements, medical supplies, ayurveda and personal care.',
    icon: 'https://cdn-icons-png.flaticon.com/128/2966/2966486.png',
    children: [
      { name: 'Supplements', description: 'Vitamins, minerals and protein.', icon: 'https://cdn-icons-png.flaticon.com/128/2966/2966481.png' },
      { name: 'Medical Supplies', description: 'Thermometers, oximeters and supports.', icon: 'https://cdn-icons-png.flaticon.com/128/2966/2966467.png' },
      { name: 'Ayurveda', description: 'Ayurvedic medicines and wellness.', icon: 'https://cdn-icons-png.flaticon.com/128/3088/3088933.png' },
      { name: 'Personal Care', description: 'Hygiene, oral care and feminine care.', icon: 'https://cdn-icons-png.flaticon.com/128/3082/3082049.png' },
    ],
  },
];

export async function seedCategories(prisma: PrismaClient): Promise<void> {
  if (!Array.isArray(CATEGORY_SEEDS) || CATEGORY_SEEDS.length === 0) return;

  const flattened = flattenCategories(CATEGORY_SEEDS);

  // Preload existing slugs
  const existing = await prisma.category.findMany({ select: { slug: true } });
  const existingSlugs = new Set(existing.map((c) => c.slug));

  const operations = flattened.map((c) => {
    const createData: Prisma.CategoryCreateInput = {
      name: c.name,
      slug: c.slug,
      description: c.description ?? null,
      icon: c.icon ?? null,
      ...(c.parentSlug
        ? { parent: { connect: { slug: c.parentSlug } } }
        : {}),
    };

    const updateData: Prisma.CategoryUpdateInput = {
      name: createData.name,
      description: createData.description,
      icon: createData.icon,
      ...(c.parentSlug
        ? { parent: { connect: { slug: c.parentSlug } } }
        : { parent: { disconnect: true } }),
    };

    return prisma.category.upsert({
      where: { slug: c.slug },
      create: createData,
      update: updateData,
    });
  });

  await withRetry(() => prisma.$transaction(operations));

  const createdCount = flattened.filter((f) => !existingSlugs.has(f.slug)).length;
  const updatedCount = flattened.length - createdCount;

  // eslint-disable-next-line no-console
  console.log(
    `Seeded categories successfully. Total: ${flattened.length}. Created: ${createdCount}, Updated: ${updatedCount}`
  );
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedCategories(prisma)
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('Category seeding completed.');
      process.exitCode = 0;
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Category seeding failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}


