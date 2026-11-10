/*
 * Code guide: apps/web/app/businesses/new/credential-receipt.tsx
 * Shows the newly provisioned owner email, one-time temporary password, expiry, and website link. Leaving the
 * screen hides the plaintext credential; it is not a permanent password viewer.
 * Runs as an interactive client component; protected writes are delegated to server endpoints/actions.
 */
"use client";
/*
 * Import connection: next/link.
 * Next.js Link renders application navigation links; it does not itself authorize a destination or write
 * data.
 * Link: Client-side application navigation component; the destination still performs its own access checks.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
/*
 * Import connection: ./actions -> apps/web/app/businesses/new/actions.ts.
 * Type BusinessActionState: Type for business-form errors and the one-time provisioning receipt returned by
 * its Server Action.
 */
import type { BusinessActionState } from "./actions";
/*
 * Shows the newly provisioned owner email, one-time temporary password, expiry, and website link. Leaving the
 * screen hides the plaintext credential; it is not a permanent password viewer.
 */
export function CredentialReceipt({ receipt }: { receipt: NonNullable<BusinessActionState["receipt"]> }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  return <section className="space-y-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-6" aria-live="polite">
    <h2 className="text-xl font-semibold">Owner login ready</h2>
    <p>{receipt.businessName} is ready for its owner. Send these details privately to their email; email is not sent automatically.</p>
    <dl className="space-y-3 text-sm">
      <div><dt className="font-semibold">Owner email</dt><dd>{receipt.ownerEmail}</dd></div>
      <div><dt className="font-semibold">Sign-in address</dt><dd>{typeof window === "undefined" ? "/login" : `${window.location.origin}/login`}</dd></div>
      {receipt.setupPath ? <div><dt className="font-semibold">Password-setup link — shown once</dt><dd className="mt-1 break-all rounded-lg bg-white p-3 font-mono select-all">{origin}{receipt.setupPath}</dd></div>
        : <div><dt className="font-semibold">Temporary password — shown once</dt><dd className="mt-1 break-all rounded-lg bg-white p-3 font-mono select-all">{receipt.temporaryPassword}</dd></div>}
      <div><dt className="font-semibold">Expires</dt><dd>{new Date(receipt.expiresAt).toLocaleString()}</dd></div>
    </dl>
    <p className="text-sm">The owner must set their own password before accessing their portal. Leaving this screen hides the setup details; you can generate a replacement while the account is pending.</p>
    <div className="flex flex-wrap gap-3">
      {receipt.websiteUrl && <Link href={receipt.websiteUrl} target="_blank" rel="noreferrer" className="inline-block rounded-xl bg-indigo-700 px-4 py-2 font-semibold text-white">Open website ↗</Link>}
      <Link href="/" className="inline-block rounded-xl border border-indigo-300 px-4 py-2 font-semibold text-indigo-800">Back to dashboard</Link>
    </div>
  </section>;
}
