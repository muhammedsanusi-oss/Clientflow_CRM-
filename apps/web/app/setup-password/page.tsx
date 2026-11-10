import type { Metadata } from "next";
import Link from "next/link";
import { OwnerSetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up your portal password", referrer: "no-referrer", robots: { index: false, follow: false } };

// GET deliberately performs no token lookup or mutation (including email scanners).
export default function SetupPasswordPage() {
  return <main className="mx-auto max-w-md space-y-6 px-6 py-12">
    <h1 className="text-3xl font-semibold">Set your portal password</h1>
    <p className="text-sm leading-6 text-slate-600">Your developer created your business portal. Choose your own password before entering it. Setup links expire after 24 hours and work once.</p>
    <OwnerSetupForm />
    <Link href="/login" className="block text-sm text-indigo-700 underline">Back to sign in</Link>
  </main>;
}
