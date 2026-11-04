import { currentUserId } from "../../../../../packages/auth/src/index";
import { requireDeveloper } from "../../../../../packages/domain/src/index";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { BusinessForm } from "./business-form";

export default async function NewBusinessPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  try { await requireDeveloper(userId); } catch { notFound(); }
  return <main className="mx-auto max-w-2xl space-y-8 px-5 py-10">
    <header className="space-y-3">
      <Link href="/" className="text-sm text-indigo-700 underline">Back to dashboard</Link>
      <h1 className="text-3xl font-semibold">Create business</h1>
      <p className="text-sm text-slate-600">Set up a business portal and create the owner's login. You can share their temporary password after saving.</p>
    </header>
    <BusinessForm />
  </main>;
}
