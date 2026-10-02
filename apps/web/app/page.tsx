// The home page. Lists the signed-in user's todos and the create form.
// Server Component — queries the database and renders server-side; redirects
// to /login when there's no session.
import { currentUserId } from "@project/auth";
import { getUser} from "@project/domain";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const user = await getUser(userId);
  if (!user) redirect("/login"); // stale cookie (e.g. after db:reset)
}
