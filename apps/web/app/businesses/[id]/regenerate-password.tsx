/*
 * Code guide: apps/web/app/businesses/[id]/regenerate-password.tsx
 * Developer control that requests replacement credentials only for a pending owner account. The server action
 * rechecks developer access and refuses resets of active owners.
 * Runs as an interactive client component; protected writes are delegated to server endpoints/actions.
 */
"use client";
/*
 * Import connection: react.
 * React provides browser component rendering and state/form hooks; database access remains in server/domain
 * functions.
 * useActionState: Connects a form to a Server Action and exposes its returned errors/receipt plus pending
 * status.
 */
import { useActionState } from "react";
/*
 * Import connection: ../new/actions -> apps/web/app/businesses/new/actions.ts.
 * regeneratePasswordAction: Authenticates the developer and delegates pending-password regeneration to the
 * protected domain function, returning its new one-time receipt.
 * Type BusinessActionState: Type for business-form errors and the one-time provisioning receipt returned by
 * its Server Action.
 */
import { regeneratePasswordAction, type BusinessActionState } from "../new/actions";
/*
 * Import connection: ../new/credential-receipt -> apps/web/app/businesses/new/credential-receipt.tsx.
 * CredentialReceipt: Shows the newly provisioned owner email, one-time temporary password, expiry, and
 * website link. Leaving the screen hides the plaintext credential; it is not a permanent password viewer.
 */
import { CredentialReceipt } from "../new/credential-receipt";
/*
 * Developer control that requests replacement credentials only for a pending owner account. The server action
 * rechecks developer access and refuses resets of active owners.
 */
export function RegeneratePassword({ businessId }: { businessId: string }) {
  // Connect the form to its imported Server Action: state contains the returned values/errors, the action
  // submits, and pending disables duplicate clicks.
  const [state, action, pending] = useActionState(regeneratePasswordAction, {} as BusinessActionState);
  if (state.receipt) return <CredentialReceipt receipt={state.receipt} />;
  return <form action={action} className="space-y-3">
    <input type="hidden" name="businessId" value={businessId} />
    <p className="text-sm text-slate-600">If the owner needs a new setup link, generate a replacement and send it privately. Previous links, temporary passwords, and unfinished setup sessions will stop working.</p>
    {state.error && <p role="alert" className="text-sm text-red-700">{state.error.message}</p>}
    <button disabled={pending} className="rounded-xl bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{pending ? "Generating..." : "Generate new setup link"}</button>
  </form>;
}
