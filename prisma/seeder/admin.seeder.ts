import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type AdminSeedOptions = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  overwritePassword?: boolean; // if true, update password when user exists
};

const env = (key: string, fallback?: string): string | undefined => {
  const v = process.env[key];
  return typeof v === 'string' && v.length > 0 ? v : fallback;
};

function loadAdminSeedFromEnv(): Required<AdminSeedOptions> {
  // Provide sane defaults, but prefer explicit env in production
  const email = env('ADMIN_EMAIL', 'admin@example.com')!;
  const password = env('ADMIN_PASSWORD', 'StrongP@ssw0rd')!;
  const firstName = env('ADMIN_FIRST_NAME', 'Super')!;
  const lastName = env('ADMIN_LAST_NAME', 'Admin')!;
  const phone = env('ADMIN_PHONE');
  const overwritePassword = env('ADMIN_OVERWRITE_PASSWORD', 'false') === 'true';

  return {
    email,
    password,
    firstName,
    lastName,
    phone: phone ?? null,
    overwritePassword,
  };
}

export async function seedAdmin(
  prismaClient: PrismaClient = prisma,
  options?: AdminSeedOptions,
): Promise<void> {
  const cfg = { ...loadAdminSeedFromEnv(), ...(options || {}) } as Required<AdminSeedOptions>;

  const existing = await prismaClient.user.findUnique({ where: { email: cfg.email } });

  const hashedPassword = await bcrypt.hash(cfg.password, 12);

  if (!existing) {
    await prismaClient.user.create({
      data: {
        email: cfg.email,
        password: hashedPassword,
        firstName: cfg.firstName,
        lastName: cfg.lastName,
        phone: cfg.phone || undefined,
        isEmailVerified: true,
        isPhoneVerified: !!cfg.phone,
        status: UserStatus.ACTIVE,
        role: Role.ADMIN,
      },
    });
    // eslint-disable-next-line no-console
    console.log(`Admin user created: ${cfg.email}`);
    return;
  }

  // Update non-sensitive fields; update password only if explicitly allowed
  await prismaClient.user.update({
    where: { email: cfg.email },
    data: {
      firstName: cfg.firstName,
      lastName: cfg.lastName,
      phone: cfg.phone || undefined,
      status: UserStatus.ACTIVE,
      role: Role.ADMIN,
      isEmailVerified: true,
      isPhoneVerified: existing.phone ? existing.isPhoneVerified : !!cfg.phone,
      ...(cfg.overwritePassword ? { password: hashedPassword } : {}),
    },
  });
  // eslint-disable-next-line no-console
  console.log(
    `Admin user updated: ${cfg.email}${cfg.overwritePassword ? ' (password overwritten)' : ''}`,
  );
}

if (require.main === module) {
  seedAdmin()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('Admin seeding completed.');
      process.exitCode = 0;
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Admin seeding failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}


