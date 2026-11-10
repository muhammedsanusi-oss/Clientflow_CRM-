import { isLocalOwnerSignupEnabled } from "../../../../packages/domain/src/index";
import { notFound } from "next/navigation";
import Link from "next/link";
import { OwnerSignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  if (!isLocalOwnerSignupEnabled()) notFound();

  return <main className="mx-auto max-w-3xl space-y-8 px-5 py-10">
    <header className="space-y-3">
      <Link href="/login" className="text-sm text-indigo-700 underline">Back to sign in</Link>
      <p className="text-sm font-semibold text-indigo-700">Local demo signup</p>
      <h1 className="text-3xl font-semibold">Create your business website</h1>
      <p className="text-sm leading-6 text-slate-600">Create your owner account, enter billing and business details, and choose a website design. You can edit and publish your site next.</p>
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Demo only: email ownership is not verified. Do not use real or sensitive billing details. Signup is unavailable in production.</p>
    </header>
    <OwnerSignupForm />
  </main>;
}
