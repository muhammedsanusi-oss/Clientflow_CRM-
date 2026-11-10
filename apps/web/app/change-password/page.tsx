/*
 * Code guide: apps/web/app/change-password/page.tsx
 * Activation page for a temporary-password session. Owners must replace the temporary password before opening
 * the CRM; regular sessions are sent to their portal.
 * This entry renders on the server and supplies data/props to interactive components.
 */
/*
 * Import connection: ../../../../packages/auth/src/index -> packages/auth/src/index.ts.
 * currentSession: Reads the opaque cookie, hashes its token, and loads its persisted session plus limited
 * user role data. Rejects expired tickets and fixed test identities outside development. Defined in
 * packages/auth/src/current-user.ts.
 */
import { currentSession } from "../../../../packages/auth/src/index";
/*
 * Import connection: next/navigation.
 * Next.js navigation helpers: redirect/notFound end server rendering, while useRouter changes browser
 * navigation after form requests.
 * redirect: Ends this server response with navigation to the supplied application route.
 */
import { redirect } from "next/navigation";
/*
 * Import connection: ./password-form -> apps/web/app/change-password/password-form.tsx.
 * PasswordForm: Collects the new password and confirmation, posts to /api/auth/change-password, and refreshes
 * the destination after the server issues a regular session.
 */
import { PasswordForm } from "./password-form";
/*
 * Activation page for a temporary-password session. Owners must replace the temporary password before opening
 * the CRM; regular sessions are sent to their portal.
 */
export default async function ChangePasswordPage() {
  // Read the current session, including restricted activation state where this screen needs it.
  const session = await currentSession();
  if (!session) redirect("/login");
  if (!session.restricted || !session.user.mustChangePassword) redirect(session.user.isDeveloper ? "/" : "/customers");
  return <main className="mx-auto max-w-md space-y-6 px-6 py-20">
    <h1 className="text-3xl font-semibold text-[#172b4d]">Choose your password</h1>
    <p className="text-sm text-slate-600">Replace your temporary password to open your business portal. Use at least 15 characters.</p>
    <PasswordForm />
  </main>;
}
