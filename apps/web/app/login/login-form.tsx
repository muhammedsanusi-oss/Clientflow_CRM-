/*
 * Code guide: apps/web/app/login/login-form.tsx
 * Browser form for choosing Developer or Business owner and entering credentials. Submits JSON to
 * /api/auth/login, displays errors, and navigates to the server-selected destination.
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
import Link from "next/link";

// Type contract: AccountType. Describes values accepted/returned by the code below; TypeScript removes this
// declaration from the runtime bundle.
type AccountType = "developer" | "owner";
// Type contract: TestAccount. Describes values accepted/returned by the code below; TypeScript removes this
// declaration from the runtime bundle.
type TestAccount = { email: string; password: string };
/*
 * Browser form for choosing Developer or Business owner and entering credentials. Submits JSON to
 * /api/auth/login, displays errors, and navigates to the server-selected destination.
 */
export default function LoginForm({ testAccounts, allowDemoSignup = false }: { testAccounts?: Record<AccountType, TestAccount>; allowDemoSignup?: boolean }) {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("developer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /*
   * Prevents the default login form submission, sends credentials to the login API, and navigates only after
   * a successful server response.
   */
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, accountType }) });
      const data = await res.json();
      if (!res.ok) { setError(data?.error?.message ?? "Could not sign in."); return; }
      router.push(data.redirectTo); router.refresh();
    } catch { setError("Could not sign in. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  return (
    <main className="fixed inset-0 grid min-h-screen overflow-y-auto bg-[#f5f7fb] text-slate-900 lg:grid-cols-2">
      <section className="relative flex min-h-[320px] flex-col justify-between overflow-hidden bg-[#172b4d] px-7 py-8 text-white sm:px-12 sm:py-10 lg:min-h-screen lg:px-16 lg:py-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-cyan-300/10 blur-3xl" />

        <a href="/" className="relative flex w-fit items-center gap-3" aria-label="Clientflow home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300 text-[#172b4d]">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
              <path d="M5 7.5 12 4l7 3.5v9L12 20l-7-3.5v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="m5.5 7.8 6.5 3.4 6.5-3.4M12 11.5v7.8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight">clientflow</span>
        </a>

        <div className="relative my-12 max-w-lg lg:my-auto lg:py-20">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
            Client relationships, made clearer
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Good work starts with a better connection.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
            Keep every conversation, client, and next step moving in the right direction.
          </p>

          <div className="mt-10 max-w-md rounded-2xl border border-white/10 bg-white/[0.07] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-medium">Recent connections</p>
              <span className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                All in sync
              </span>
            </div>
            <div className="space-y-4">
              {[
                { initials: "JM", name: "Jordan Miller", company: "Northstar Studio", color: "bg-violet-300/20 text-violet-100" },
                { initials: "AK", name: "Avery Kim", company: "Goodwell Partners", color: "bg-cyan-300/20 text-cyan-100" },
                { initials: "SR", name: "Sam Rivera", company: "Fieldwork Co.", color: "bg-amber-300/20 text-amber-100" },
              ].map((contact) => (
                <div key={contact.initials} className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${contact.color}`}>
                    {contact.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{contact.name}</p>
                    <p className="truncate text-xs text-slate-400">{contact.company}</p>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="relative text-xs text-slate-400">A little more clarity in every relationship.</p>
      </section>

      <section className="flex min-h-[520px] items-center justify-center px-6 py-12 sm:px-12 lg:min-h-screen lg:px-16">
        <div className="w-full max-w-md">
          <p className="mb-3 text-sm font-semibold text-indigo-600">Welcome back</p>
          <header className="mb-8">
            <h2 className="text-3xl font-semibold tracking-tight">Sign in to Clientflow</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {accountType === "developer" ? "Manage businesses and create owner accounts." : "Open the business portal linked to your email."}
            </p>
          </header>

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1" role="group" aria-label="Sign in as">
            {(["developer", "owner"] as const).map(type => <button key={type} type="button" disabled={busy} aria-pressed={accountType === type}
              onClick={() => { setAccountType(type); setEmail(""); setPassword(""); setError(null); }}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${accountType === type ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:bg-white/60"}`}>
              {type === "developer" ? "Developer" : "Business owner"}
            </button>)}
          </div>
          {testAccounts && <div className="mb-6 space-y-2 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm">
            <p className="font-semibold text-indigo-950">Try a test account</p>
            <p className="text-xs text-slate-600">{testAccounts[accountType].email}</p>
            <p className="font-mono text-xs text-slate-600">{testAccounts[accountType].password}</p>
            <button type="button" disabled={busy} onClick={() => { setEmail(testAccounts[accountType].email); setPassword(testAccounts[accountType].password); setError(null); }}
              className="font-semibold text-indigo-700 underline">Use test {accountType === "developer" ? "developer" : "business owner"}</button>
          </div>}
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="username"
                autoFocus
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <input id="password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
            </div>
            {error && (
              <p id="login-error" role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || email.trim().length === 0 || password.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#263b68] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3058] focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? "Signing in…" : accountType === "developer" ? "Sign in as developer" : "Sign in as business owner"}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>

          {allowDemoSignup ? <p className="mt-4 text-center text-sm text-slate-600">
            Business owner? Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-indigo-700 underline underline-offset-2">Sign up here!</Link>
          </p> : <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">Your first sign-in</p>
            <p className="mt-1.5 text-xs leading-5 text-amber-900/80">
              Business owners receive a temporary password from the Clientflow team.
              You will choose your own password before opening your business portal.
            </p>
          </div>}

          <p className="mt-8 text-center text-xs text-slate-400">
            Clientflow CRM <span className="mx-1.5">·</span> Built for better client relationships
          </p>
        </div>
      </section>
    </main>
  );
}
