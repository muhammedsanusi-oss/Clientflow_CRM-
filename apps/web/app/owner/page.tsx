import { currentUserId } from "@project/auth";
import { getUser, listOwnerDashboardBusinesses } from "@project/domain";
import { redirect } from "next/navigation";
import { ownerWorkspaceHref } from "../../../../packages/domain/src/subscription-access";

export const dynamic = "force-dynamic";

export default async function OwnerDashboardPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const user = await getUser(userId);
  if (!user) redirect("/login");
  if (user.isDeveloper) redirect("/");

  const businesses = await listOwnerDashboardBusinesses(userId);
  const latestBusiness = businesses[0];
  if (latestBusiness) {
    redirect(ownerWorkspaceHref(latestBusiness));
  }

  return <main className="mx-auto max-w-3xl space-y-5 px-5 py-10">
    <h1 className="text-2xl font-bold">No business workspace is linked to your account</h1>
    <p className="text-slate-600">Contact your Clientflow developer to get access to your business workspace.</p>
  </main>;
}
