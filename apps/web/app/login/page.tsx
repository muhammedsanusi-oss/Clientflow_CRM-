// Public GitHub sign-in; Next.js protects the form action's origin.
import { signIn, currentUserId } from "../../../../packages/auth/src/index";
import { redirect } from "next/navigation";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUserId()) redirect("/");
  const { error } = await searchParams;
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
              Use your GitHub account to securely access your workspace.
            </p>
          </header>

          {error && <p role="alert" className="mb-4 text-sm text-red-600">Sign-in failed. Please try again.</p>}
          <form action={async () => { "use server"; await signIn("github", { redirectTo: "/" }); }}>
            <button type="submit" className="w-full rounded-xl bg-[#263b68] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d3058] focus:outline-none focus:ring-4 focus:ring-indigo-200">Sign in with GitHub</button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Clientflow CRM <span className="mx-1.5">·</span> Built for better client relationships
          </p>
        </div>
      </section>
    </main>
  );
}
