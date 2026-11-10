/*
 * Code guide: apps/web/app/sign-out-button.tsx
 * Posts to /api/auth/logout to revoke the database session, then returns to /login. Shows a retryable error
 * when the request fails.
 * Runs as an interactive client component; protected writes are delegated to server endpoints/actions.
 */
"use client";

/*
 * Import connection: next/navigation.
 * Next.js navigation helpers: redirect/notFound end server rendering, while useRouter changes browser
 * navigation after form requests.
 * useRouter: Navigates or refreshes the browser after an API/action succeeds.
 */
import { useRouter } from "next/navigation";
/*
 * Import connection: react.
 * React provides browser component rendering and state/form hooks; database access remains in server/domain
 * functions.
 * useState: Keeps temporary component state in the browser, such as draft fields, pending status, and
 * messages.
 */
import { useState } from "react";

/*
 * Posts to /api/auth/logout to revoke the database session, then returns to /login. Shows a retryable error
 * when the request fails.
 */
export function SignOutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /*
   * Calls the logout endpoint and refreshes browser navigation after success, retaining a visible error if
   * revocation fails.
   */
  async function signOut() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError("Could not sign out. Please try again.");
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setError("Could not sign out. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error && (
        <p role="alert" className="absolute right-5 top-[68px] rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 shadow-sm sm:right-8 lg:right-10">
          {error}
        </p>
      )}
    </div>
  );
}
