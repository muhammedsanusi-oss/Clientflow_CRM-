import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { currentUserId } from "../../../../packages/auth/src/index";
import { getManagedService, listManagedServiceBusinesses } from "../../../../packages/domain/src/managed-service";
import { DomainError } from "../../../../packages/domain/src/errors";
import { ManagedServiceView } from "../../components/managed-service-view";
import { OwnerWorkspace } from "../../components/owner-workspace";

export const dynamic = "force-dynamic";
export default async function ManagedServicePage({ searchParams }: { searchParams: Promise<{ businessId?: string }> }) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const businesses = await listManagedServiceBusinesses(userId);
  const { businessId } = await searchParams;
  const selected = businessId ?? businesses[0]?.id;
  if (!selected) return <main className="mx-auto max-w-3xl space-y-4 px-5 py-16"><h1 className="text-3xl font-bold">Managed content changes</h1><p>No Managed service workspace is linked to your account.</p><Link href="/subscription" className="text-indigo-700 underline">View demo subscriptions</Link></main>;
  const data = await getManagedService(userId, selected).catch(error => { if (error instanceof DomainError && error.code === "NOT_FOUND") notFound(); throw error; });
  return <OwnerWorkspace business={data.business} active="managed">
    <nav className="mx-auto flex max-w-4xl flex-wrap gap-3 px-5 pt-5" aria-label="Managed businesses">{businesses.map(business => <Link key={business.id} href={`/managed-service?businessId=${encodeURIComponent(business.id)}`} className="rounded-lg border border-slate-300 px-3 py-2" aria-current={business.id === selected ? "page" : undefined}>{business.name}</Link>)}</nav>
    <ManagedServiceView data={data} />
  </OwnerWorkspace>;
}
