"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
