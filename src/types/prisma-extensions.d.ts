import { Prisma, PrismaClient } from '@prisma/client';

/**
 * This declaration file extends the PrismaClient type to include
 * the Payment model that exists at runtime but might not be
 * properly exposed in TypeScript typing due to generation issues.
 */
declare module '@prisma/client' {
  export interface PrismaClient {
    payment: Prisma.PaymentDelegate<
      Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
    >;
  }
}
