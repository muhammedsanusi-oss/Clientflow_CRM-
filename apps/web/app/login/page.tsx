// The sign-in page. A username is an account — no password, and the page
// says so out loud. Client Component: owns the form state, calls the API.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "Something went wrong");
      return;
    }
    router.push("/");
    router.refresh();
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
              Pick a username. If it doesn&rsquo;t exist yet, it&rsquo;s yours.
            </p>
          </header>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-700">
                Username
              </label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                autoComplete="username"
                autoFocus
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            {error && (
              <p id="login-error" role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || username.trim().length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#263b68] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3058] focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? "Signing in…" : "Continue"}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">Development sign-in</p>
            <p className="mt-1.5 text-xs leading-5 text-amber-900/80">
              No password is required in this demo. This identifies a user but
              does not authenticate them, so anyone can sign in as any username.
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            Clientflow CRM <span className="mx-1.5">·</span> Built for better client relationships
          </p>
        </div>
      </section>
    </main>
  );
}
