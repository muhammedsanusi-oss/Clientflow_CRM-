// A Server Action retains Origin protection and revokes the database session.
import { signOut } from "../../../packages/auth/src/index";
export function SignOutButton() {
  return <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
    <button type="submit" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-indigo-100">Sign out</button>
  </form>;
}
