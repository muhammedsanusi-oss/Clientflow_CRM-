import { isLocalOwnerSignupEnabled } from "../../../../packages/domain/src/index";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SignupChoice } from "./signup-choice";

export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ option?: string }> }) {
  if (!isLocalOwnerSignupEnabled()) notFound();
  const { option } = await searchParams;

  return <main className="mx-auto max-w-3xl space-y-8 px-5 py-10">
    <header className="space-y-3">
      <Link href="/login" className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Back to sign in</Link>
      <p className="text-sm font-semibold text-indigo-700">Local demo signup</p>
      <h1 className="text-3xl font-semibold">Create your business website</h1>
      <p className="text-sm leading-6 text-slate-600">Start with a standard website template or request a website and CRM tailored to your business.</p>
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Demo only: email ownership is not verified. Do not use real or sensitive billing details. Signup is unavailable in production.</p>
    </header>
    <SignupChoice initialChoice={option === "tailored" ? "tailored" : option === "standard" ? "standard" : null} />
  </main>;
}
