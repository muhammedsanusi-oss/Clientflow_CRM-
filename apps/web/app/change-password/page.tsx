import { currentSession } from "../../../../packages/auth/src/index";
import { redirect } from "next/navigation";
import { PasswordForm } from "./password-form";
export default async function ChangePasswordPage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  if (!session.restricted || !session.user.mustChangePassword) redirect(session.user.isDeveloper ? "/" : "/customers");
  return <main className="mx-auto max-w-md space-y-6 px-6 py-20">
    <h1 className="text-3xl font-semibold text-[#172b4d]">Choose your password</h1>
    <p className="text-sm text-slate-600">Replace your temporary password to open your business portal. Use at least 15 characters.</p>
    <PasswordForm />
  </main>;
}
