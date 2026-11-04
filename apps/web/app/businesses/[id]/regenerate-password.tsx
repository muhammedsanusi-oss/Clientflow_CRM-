"use client";
import { useActionState } from "react";
import { regeneratePasswordAction, type BusinessActionState } from "../new/actions";
import { CredentialReceipt } from "../new/credential-receipt";
export function RegeneratePassword({ businessId }: { businessId: string }) {
  const [state, action, pending] = useActionState(regeneratePasswordAction, {} as BusinessActionState);
  if (state.receipt) return <CredentialReceipt receipt={state.receipt} />;
  return <form action={action} className="space-y-3">
    <input type="hidden" name="businessId" value={businessId} />
    <p className="text-sm text-slate-600">If the owner lost their temporary password, create a replacement. The previous password and any unfinished setup session will stop working.</p>
    {state.error && <p role="alert" className="text-sm text-red-700">{state.error.message}</p>}
    <button disabled={pending} className="rounded-xl bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{pending ? "Generating..." : "Generate new temporary password"}</button>
  </form>;
}
