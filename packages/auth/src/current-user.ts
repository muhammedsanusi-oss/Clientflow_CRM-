// Identity comes exclusively from a validated database session.
import { auth } from "./auth";
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
