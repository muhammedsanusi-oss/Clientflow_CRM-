import { currentUserId } from "../../../../../packages/auth/src/index";
import { getProvisionedBusiness } from "../../../../../packages/domain/src/index";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { RegeneratePassword } from "./regenerate-password";
export default async function BusinessSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId(); if (!userId) redirect("/login");
  const { id } = await params;
  const business = await getProvisionedBusiness(userId, id).catch(() => null);
  if (!business) notFound();
  const owner = business.employees[0];
  return <main className="mx-auto max-w-2xl space-y-6 px-5 py-12">
    <Link href="/" className="text-indigo-700 underline">Back to dashboard</Link>
    <h1 className="text-3xl font-semibold">{business.name}</h1>
    <p className="text-slate-600">{business.description}</p>
    {business.websiteTemplate && <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{business.websiteTemplate} template</span><Link href={`/sites/${business.id}`} target="_blank" rel="noreferrer" className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">Open website</Link></div>}
    <dl className="space-y-3 rounded-2xl border border-slate-200 p-6 text-sm">
      <div><dt className="font-semibold">Business email</dt><dd>{business.email}</dd></div>
      <div><dt className="font-semibold">Business phone</dt><dd>{business.phone_number}</dd></div>
      <div><dt className="font-semibold">Owner login email</dt><dd>{owner?.email}</dd></div>
      <div><dt className="font-semibold">Owner access</dt><dd>{!owner?.user.mustChangePassword ? "Active" : owner.user.temporaryExpiresAt && owner.user.temporaryExpiresAt <= new Date() ? "Temporary password expired" : "Pending password setup"}</dd></div>
    </dl>
    {owner?.user.mustChangePassword && <RegeneratePassword businessId={business.id} />}
  </main>;
}
