import { currentUserId } from "../../../../../packages/auth/src/index";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BusinessForm } from "./business-form";

export default async function NewBusinessPage() {
  if (!(await currentUserId())) redirect("/login");
  return <main className="mx-auto max-w-2xl space-y-8 px-5 py-10">
    <header className="space-y-3">
      <Link href="/" className="text-sm text-indigo-700 underline">Back to dashboard</Link>
      <h1 className="text-3xl font-semibold">Create business</h1>
      <p className="text-sm text-slate-600">Create your business, then add customers linked to it. You will be its owner.</p>
    </header>
    <BusinessForm />
  </main>;
}
