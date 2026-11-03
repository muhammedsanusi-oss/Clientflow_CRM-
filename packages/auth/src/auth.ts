// GitHub proves identity; Prisma stores revocable database sessions.
import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@project/db";
declare module "next-auth" {
  interface Session { user: { id: string } & DefaultSession["user"]; }
}
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Keep provider account IDs authoritative; never auto-link legacy users by email.
  providers: [GitHub],
  // The cookie is an opaque ticket. Each request resolves its unexpired database row.
  session: { strategy: "database" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    session({ session, user }) {
      // Use the adapter user, not profile fields or browser-provided identifiers.
      session.user.id = user.id;
      return session;
    },
  },
});
