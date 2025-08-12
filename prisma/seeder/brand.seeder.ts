import { PrismaClient, Prisma } from '@prisma/client';

type BrandSeed = {
  name: string;
  slug?: string;
  description?: string;
  logo?: string | null;
  website?: string | null;
  isFeatured?: boolean;
};

const generateLogoUrl = (slug: string): string =>
  `https://dummyimage.com/256x256/1f2937/ffffff&text=${encodeURIComponent(slug)}`;

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

const normalizeWebsite = (website?: string | null): string | null => {
  if (!website) return null;
  const trimmed = website.trim();
  const withProtocol = /^(https?:)?\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    return url.toString();
  } catch {
    return null;
  }
};

const ensureUniqueSlugs = (seeds: Array<Required<Pick<BrandSeed, 'name' | 'slug'>> & Omit<BrandSeed, 'slug'>>): Array<BrandSeed & { slug: string }> => {
  const seen: Record<string, number> = {};
  return seeds.map((seed) => {
    let base = slugify(seed.slug || seed.name);
    if (!base) base = slugify(seed.name);
    let candidate = base;
    if (seen[candidate] == null) {
      seen[candidate] = 1;
    } else {
      seen[candidate] += 1;
      candidate = `${base}-${seen[candidate]}`;
      seen[candidate] = 1;
    }
    return { ...seed, slug: candidate };
  });
};

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

export const BRAND_SEEDS: BrandSeed[] = [
  {
    name: 'Samsung',
    description: 'Consumer electronics, smartphones, appliances.',
    website: 'https://www.samsung.com/in',
    logo: 'https://cdn-icons-png.flaticon.com/128/5969/5969116.png',
    isFeatured: true,
  },
  {
    name: 'Apple',
    description: 'iPhone, iPad, Mac, and accessories.',
    website: 'https://www.apple.com/in/',
    logo: 'https://cdn-icons-png.flaticon.com/128/731/731985.png',
    isFeatured: true,
  },
  {
    name: 'Xiaomi',
    description: 'Smartphones, smart home, and ecosystem products.',
    website: 'https://www.mi.com/in/',
    logo: 'https://cdn-icons-png.flaticon.com/128/882/882720.png',
    isFeatured: true,
  },
  {
    name: 'OnePlus',
    description: 'Smartphones, audio, TVs, and accessories.',
    website: 'https://www.oneplus.in/',
    logo: 'https://oasis.opstatics.com/content/dam/oasis/page/vi/04Image%20B_large.jpg',
  },
  {
    name: 'realme',
    description: 'Smartphones, AIoT, and lifestyle tech.',
    website: 'https://www.realme.com/in/',
    logo: 'https://image01.realme.net/general/20181116/1542370102069.jpg',
  },
  {
    name: 'boAt',
    description: 'Audio wearables and mobile accessories.',
    website: 'https://www.boat-lifestyle.com/',
    logo: 'https://www.boat-lifestyle.com/cdn/shop/files/boAt_logo_black_24889e30-925c-4185-a028-9fef497a8e44.svg?v=1732879339',
  },
  {
    name: 'Noise',
    description: 'Smartwatches, audio, and accessories.',
    website: 'https://www.gonoise.com/',
    logo:"https://images.seeklogo.com/logo-png/42/1/noise-logo-png_seeklogo-427911.png"
  },
//   {
//     name: 'JBL',
//     description: 'Speakers, headphones, and audio solutions.',
//     website: 'https://www.jbl.com/',
//   },
  {
    name: 'Sony',
    description: 'Electronics, audio, imaging, and gaming.',
    website: 'https://www.sony.co.in/',
    isFeatured: true,
  },
  {
    name: 'LG',
    description: 'Home appliances, TVs, and electronics.',
    website: 'https://www.lg.com/in',
  },
  {
    name: 'Whirlpool',
    description: 'Home and kitchen appliances.',
    website: 'https://www.whirlpoolindia.com/',
  },
  {
    name: 'Philips',
    description: 'Personal care, health, and home appliances.',
    website: 'https://www.philips.co.in/',
  },
  {
    name: 'Havells',
    description: 'Electricals, lighting, fans, kitchen appliances.',
    website: 'https://www.havells.com/',
  },
  {
    name: 'Prestige',
    description: 'Cookware and kitchen appliances.',
    website: 'https://www.ttkprestige.com/',
  },
  {
    name: 'Hawkins',
    description: 'Pressure cookers and kitchenware.',
    website: 'https://www.hawkinscookers.com/',
  },
  {
    name: 'Nike',
    description: 'Sportswear, footwear, and accessories.',
    website: 'https://www.nike.com/in/',
    isFeatured: true,
  },
  {
    name: 'Adidas',
    description: 'Sportswear, footwear, and accessories.',
    website: 'https://www.adidas.co.in/',
    isFeatured: true,
  },
  {
    name: 'Puma',
    description: 'Sportswear, footwear, and accessories.',
    website: 'https://in.puma.com/',
  },
  {
    name: 'Bata',
    description: 'Footwear and accessories.',
    website: 'https://www.bata.in/',
  },
  {
    name: 'Lakmé',
    description: 'Beauty and cosmetics brand.',
    website: 'https://www.lakmeindia.com/',
  },
  // Apparel and fashion (India)
  {
    name: 'Fabindia',
    description: 'Ethnic wear and lifestyle products.',
    website: 'https://www.fabindia.com/',
    isFeatured: true,
  },
  {
    name: 'Biba',
    description: 'Indian ethnic wear for women and girls.',
    website: 'https://www.biba.in/',
  },
  {
    name: 'Manyavar',
    description: 'Men’s ethnic wear and wedding collections.',
    website: 'https://www.manyavar.com/',
  },
  {
    name: 'Allen Solly',
    description: 'Casual and semi-formal apparel.',
    website: 'https://allensolly.abfrl.in/',
  },
  {
    name: 'Van Heusen',
    description: 'Formal wear and accessories.',
    website: 'https://www.vanheusenindia.com/',
  },
  {
    name: 'Peter England',
    description: 'Menswear brand known for formal and casual wear.',
    website: 'https://www.peterengland.com/',
  },
  {
    name: 'Louis Philippe',
    description: 'Premium menswear and accessories.',
    website: 'https://www.louisphilippe.com/',
  },
  {
    name: 'Raymond',
    description: 'Textiles and premium menswear.',
    website: 'https://www.raymond.in/',
  },
  {
    name: 'W for Woman',
    description: 'Contemporary ethnic wear for women.',
    website: 'https://wforwomen.com/',
  },
  {
    name: 'Roadster',
    description: 'Casual apparel brand popular on online marketplaces.',
    website: 'https://www.myntra.com/roadster',
  },
  {
    name: 'HRX',
    description: 'Activewear and athleisure brand.',
    website: 'https://www.myntra.com/hrx',
  },
  {
    name: 'Max Fashion',
    description: 'Family fashion and accessories.',
    website: 'https://www.maxfashion.in/',
  },
  {
    name: 'Westside',
    description: 'Fashion and lifestyle retail brand.',
    website: 'https://www.westside.com/',
  },
  // Footwear and outdoor
  {
    name: 'Woodland',
    description: 'Outdoor footwear and apparel.',
    website: 'https://www.woodlandworldwide.com/',
  },
  {
    name: 'Campus',
    description: 'Sports and casual footwear.',
    website: 'https://www.campusshoes.com/',
  },
  {
    name: 'Sparx',
    description: 'Athletic and casual footwear brand.',
    website: 'https://www.sparxfootwear.com/',
  },
  {
    name: 'Metro Shoes',
    description: 'Footwear and accessories retail brand.',
    website: 'https://www.metroshoes.com/',
  },
  // Personal care and beauty
  {
    name: 'Mamaearth',
    description: 'Natural personal care and baby care products.',
    website: 'https://mamaearth.in/',
  },
  {
    name: 'WOW Skin Science',
    description: 'Skin, hair, and wellness products.',
    website: 'https://www.buywow.in/',
  },
  {
    name: 'Himalaya',
    description: 'Ayurvedic personal care and wellness products.',
    website: 'https://www.himalayawellness.in/',
  },
  {
    name: 'Dabur',
    description: 'Ayurvedic and natural consumer products.',
    website: 'https://www.dabur.com/',
  },
  {
    name: 'Patanjali',
    description: 'Ayurvedic FMCG and personal care products.',
    website: 'https://www.patanjaliayurved.net/',
  },
  {
    name: 'Nykaa',
    description: 'Beauty, personal care, and fashion retailer brand.',
    website: 'https://www.nykaa.com/',
  },
  // Home, kitchen, and furniture
  {
    name: 'Milton',
    description: 'Kitchenware, bottles, and containers.',
    website: 'https://www.milton.in/',
  },
  {
    name: 'Cello',
    description: 'Household products and kitchenware.',
    website: 'https://www.celloworld.com/',
  },
  {
    name: 'Borosil',
    description: 'Glassware and kitchen appliances.',
    website: 'https://www.borosil.com/',
  },
  {
    name: 'Pigeon',
    description: 'Kitchen appliances and cookware.',
    website: 'https://www.pigeonappliances.com/',
  },
  {
    name: 'Usha',
    description: 'Home appliances, fans, and sewing machines.',
    website: 'https://www.usha.com/',
  },
  {
    name: 'Nilkamal',
    description: 'Furniture and home storage solutions.',
    website: 'https://www.nilkamal.com/',
  },
  {
    name: 'Sleepwell',
    description: 'Mattresses and sleep accessories.',
    website: 'https://www.mysleepwell.com/',
  },
  {
    name: 'Duroflex',
    description: 'Mattresses and sleep solutions.',
    website: 'https://www.duroflexworld.com/',
  },
  // Sports retail
  {
    name: 'Decathlon',
    description: 'Multisport retail brand for gear and apparel.',
    website: 'https://www.decathlon.in/',
    isFeatured: true,
  },
];

export async function seedBrands(prisma: PrismaClient): Promise<void> {
  if (!Array.isArray(BRAND_SEEDS) || BRAND_SEEDS.length === 0) {
    return;
  }

  // Normalize entries and ensure internal slug uniqueness (do not change slugs that are already valid and unique)
  const normalizedSeeds = ensureUniqueSlugs(
    BRAND_SEEDS.map((b) => ({
      name: b.name?.trim(),
      slug: b.slug ? slugify(b.slug) : slugify(b.name),
      description: b.description?.trim() || undefined,
      logo: (b.logo && b.logo.trim()) || undefined,
      website: normalizeWebsite(b.website),
      isFeatured: Boolean(b.isFeatured),
    }))
  );

  // Preload existing slugs to know which are updates vs creates
  const existing = await prisma.brand.findMany({ select: { slug: true } });
  const existingSlugs = new Set(existing.map((e) => e.slug));

  const upserts = normalizedSeeds.map((brand) => {
    const data: Prisma.BrandCreateInput = {
      name: brand.name,
      slug: brand.slug!,
      description: brand.description ?? null,
      logo:
        (brand.logo && brand.logo.length > 0
          ? brand.logo
          : generateLogoUrl(brand.slug!)) ?? null,
      website: brand.website ?? null,
      isFeatured: brand.isFeatured ?? false,
    };

    return prisma.brand.upsert({
      where: { slug: brand.slug! },
      create: data,
      update: {
        name: data.name,
        description: data.description,
        logo: data.logo,
        website: data.website,
        isFeatured: data.isFeatured,
      },
    });
  });

  // Run in a single transaction for atomicity
  await withRetry(() => prisma.$transaction(upserts));

  const createdCount = normalizedSeeds.filter((b) => !existingSlugs.has(b.slug!)).length;
  const updatedCount = normalizedSeeds.length - createdCount;

  // eslint-disable-next-line no-console
  console.log(
    `Seeded brands successfully. Created: ${createdCount}, Updated: ${updatedCount}`
  );
}

// Optional: allow running this seeder directly (ts-node prisma/seeder/brand.seeder.ts)
if (require.main === module) {
  const prisma = new PrismaClient();
  seedBrands(prisma)
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('Brand seeding completed.');
      process.exitCode = 0;
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Brand seeding failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}


