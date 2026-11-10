import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { currentUserId } from "../../../../../../packages/auth/src/index";
import { getManagedService } from "../../../../../../packages/domain/src/managed-service";
import { DomainError } from "../../../../../../packages/domain/src/errors";
import { ManagedServiceView } from "../../../../components/managed-service-view";

export const dynamic = "force-dynamic";
export default async function DeveloperManagedServicePage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const { id } = await params;
  const data = await getManagedService(userId, id).catch(error => { if (error instanceof DomainError && error.code === "NOT_FOUND") notFound(); throw error; });
  if (!data.business.isDeveloper) notFound();
  return <><div className="mx-auto max-w-4xl px-5 pt-16"><Link href={`/businesses/${encodeURIComponent(id)}`} className="inline-flex rounded-xl border border-slate-300 px-4 py-2 font-semibold text-indigo-700">Back to business details</Link></div><ManagedServiceView data={data} /></>;
}
