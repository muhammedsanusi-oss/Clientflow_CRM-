// The signed-in home page. Business records are always scoped to the current user.
import { currentUserId } from "@project/auth";
import { getUser, listBusinesses } from "@project/domain";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

export const dynamic = "force-dynamic";

const businessTypes: Record<string, string> = {
  SPA: "Spa",
  SALON: "Salon",
  CLINIC: "Clinic",
  BARBERSHOP: "Barbershop",
  OTHER: "Other",
};

export default async function Home() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const [user, businesses] = await Promise.all([
    getUser(userId),
    listBusinesses(userId),
  ]);
  if (!user) redirect("/login");

  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <main className="fixed inset-0 overflow-y-auto bg-[#f5f7fb] text-slate-900">
      <div className="flex min-h-full">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white px-5 py-6 lg:flex">
          <a href="/" className="flex items-center gap-3" aria-label="Clientflow home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#172b4d] text-cyan-200">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                <path d="M5 7.5 12 4l7 3.5v9L12 20l-7-3.5v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="m5.5 7.8 6.5 3.4 6.5-3.4M12 11.5v7.8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-lg font-semibold tracking-tight text-[#172b4d]">clientflow</span>
          </a>

          <p className="mb-3 mt-10 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </p>
          <a
            href="#overview"
            className="flex items-center gap-3 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
            Overview
          </a>
          <a
            href="#businesses"
            className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M3.5 20h17M5 20V8l7-4 7 4v12M9 20v-6h6v6M8 9h.01M12 9h.01M16 9h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Businesses
          </a>

          <div className="mt-auto rounded-2xl bg-[#172b4d] p-4 text-white">
            <p className="text-sm font-semibold">Keep connections moving</p>
            <p className="mt-1.5 text-xs leading-5 text-slate-300">
              Your workspace keeps the businesses you manage close at hand.
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white px-5 sm:px-8 lg:px-10">
            <a href="#overview" className="flex items-center gap-2 lg:hidden" aria-label="Clientflow home">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#172b4d] text-cyan-200">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M5 7.5 12 4l7 3.5v9L12 20l-7-3.5v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="m5.5 7.8 6.5 3.4 6.5-3.4M12 11.5v7.8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="font-semibold tracking-tight text-[#172b4d]">clientflow</span>
            </a>
            <p className="hidden text-sm text-slate-500 lg:block">Workspace overview</p>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="max-w-48 truncate text-sm font-medium text-slate-800">{user.username}</p>
                <p className="text-xs text-slate-400">Workspace account</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700" aria-hidden="true">
                {initials}
              </span>
              <SignOutButton />
            </div>
          </header>

          <div id="overview" className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
            <section className="relative overflow-hidden rounded-3xl bg-[#172b4d] px-6 py-8 text-white sm:px-9 sm:py-10">
              <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full border border-white/10" />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 right-40 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
              <div className="relative max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  Your Clientflow workspace
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Welcome back, {user.username}.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                  A clear view of the businesses connected to your account, all in one place.
                </p>
              </div>
            </section>

            <section className="mt-8 grid gap-5 sm:grid-cols-2">
              <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Your businesses</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                      {businesses.length}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d="M3.5 20h17M5 20V8l7-4 7 4v12M9 20v-6h6v6M8 9h.01M12 9h.01M16 9h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {businesses.length === 1 ? "Business connected to your account" : "Businesses connected to your account"}
                </p>
              </article>

              <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-sm font-medium text-slate-500">Signed in as</p>
                <p className="mt-3 truncate text-lg font-semibold text-slate-900">{user.username}</p>
                <p className="mt-2 text-xs text-slate-400">Your personal Clientflow workspace</p>
              </article>
            </section>

            <section id="businesses" className="mt-10 scroll-mt-6">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                    Workspace directory
                  </p>
                  <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900">
                    Your businesses
                  </h2>
                </div>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                  {businesses.length} total
                </span>
              </div>

              {businesses.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {businesses.map((business) => (
                    <article
                      key={business.id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-sm font-semibold text-[#1d5970]">
                          {business.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-slate-900">{business.name}</h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {businessTypes[business.business_type] ?? "Business"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                        <p className="truncate">{business.email}</p>
                        <p>{business.phone_number}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                      <path d="M3.5 20h17M5 20V8l7-4 7 4v12M9 20v-6h6v6M8 9h.01M12 9h.01M16 9h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">Your workspace is ready</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    Businesses connected to your account will appear here when they&rsquo;re set up.
                  </p>
                </div>
              )}
            </section>

            <footer className="py-8 text-center text-xs text-slate-400">
              Clientflow CRM <span className="mx-1.5">·</span> Built for better client relationships
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
