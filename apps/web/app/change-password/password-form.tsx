/*
 * Code guide: apps/web/app/change-password/password-form.tsx
 * Collects the new password and confirmation, posts to /api/auth/change-password, and refreshes the
 * destination after the server issues a regular session.
 * Runs as an interactive client component; protected writes are delegated to server endpoints/actions.
 */
"use client";
/*
 * Import connection: react.
 * React provides browser component rendering and state/form hooks; database access remains in server/domain
 * functions.
 * useState: Keeps temporary component state in the browser, such as draft fields, pending status, and
 * messages.
 */
import { useState } from "react";
/*
 * Import connection: next/navigation.
 * Next.js navigation helpers: redirect/notFound end server rendering, while useRouter changes browser
 * navigation after form requests.
 * useRouter: Navigates or refreshes the browser after an API/action succeeds.
 */
import { useRouter } from "next/navigation";
/*
 * Collects the new password and confirmation, posts to /api/auth/change-password, and refreshes the
 * destination after the server issues a regular session.
 */
export function PasswordForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <form className="space-y-5" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: form.get("password"), confirmation: form.get("confirmation") }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error.message); return; }
      router.replace(data.redirectTo); router.refresh();
    } catch { setError("Could not change your password. Please try again."); }
    finally { setBusy(false); }
  }}>
    {[{ name: "password", label: "New password" }, { name: "confirmation", label: "Confirm password" }].map(field => <div key={field.name}>
      <label htmlFor={field.name} className="mb-2 block text-sm font-medium">{field.label}</label>
      <input id={field.name} name={field.name} type="password" autoComplete="new-password" minLength={15} maxLength={128} required className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-indigo-600" />
    </div>)}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Save password and continue"}</button>
  </form>;
}
