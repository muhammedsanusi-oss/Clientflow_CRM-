/*
 * Code guide: packages/domain/src/queries/users.ts
 * This module retains legacy username lookups/upserts. Current email/password login is implemented in
 * packages/auth/src/credentials.ts; the older sign-in header below describes a retired flow. getUser supplies
 * dashboard display fields.
 */
// Database queries for users. Sign-in is find-or-create: a username IS an
// account. The unique index on username makes the upsert race-safe.
/*
 * Import connection: @project/db -> packages/db/src/index.ts.
 * prisma: Shared database client from packages/db; queries reach PostgreSQL or the configured embedded test
 * database. Defined in packages/db/src/client.ts.
 */
import { prisma } from "@project/db";

/*
 * Reads the limited identity fields used by the developer dashboard, including developer status; this is not
 * a credential-authentication function.
 */
export function getUser(id: string) {
  return prisma.user.findUnique({ where: { id }, select: { username: true, name: true, email: true, isDeveloper: true } });
}

/*
 * Legacy username-based account helper retained for compatibility. The current login flow uses authenticate
 * in packages/auth/src/credentials.ts instead.
 */
export function findOrCreateUser(username: string) {
  return prisma.user.upsert({
    where: { username },
    update: {},
    create: { username },
  });
}
