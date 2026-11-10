/*
 * Code guide: packages/db/src/index.ts
 * Database package entry point. Re-exports the shared client and generated Prisma types; migration code is
 * exposed separately through the package /migrate entry.
 */
// Re-exports the Prisma client and generated types.
// Apps and other packages import from @project/db, never from @prisma/client directly.
// The migration runner (applyMigrations) is available at @project/db/migrate.
// Re-export connection: { prisma, LOCAL_DEV_URL, PrismaClient } -> packages/db/src/client.ts. Importing this
// entry exposes definitions; it does not call them.
export { prisma, LOCAL_DEV_URL, PrismaClient } from "./client";
// Re-export connection: { User } -> packages/db/src/generated/prisma. Importing this entry exposes
// definitions; it does not call them.
export type { User } from "./generated/prisma";
// Re-export connection: { Prisma } -> packages/db/src/generated/prisma. Importing this entry exposes
// definitions; it does not call them.
export type { Prisma } from "./generated/prisma";
