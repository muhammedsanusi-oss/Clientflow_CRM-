// Profile lookup for the session-derived user.
import { prisma } from "@project/db";

export function getUser(id: string) {
  return prisma.user.findUnique({ where: { id } , select: { username: true, name: true,}, });
}
