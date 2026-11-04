import { currentSession } from "../../../../packages/auth/src/index";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";
import { LOCAL_TEST_ACCOUNTS, LOCAL_TEST_PASSWORD } from "../../../../packages/auth/src/test-accounts";
export default async function LoginPage() {
  const session = await currentSession();
  if (session) redirect(session.restricted || session.user.mustChangePassword ? "/change-password" : session.user.isDeveloper ? "/" : "/customers");
  const testAccounts = process.env.NODE_ENV === "development" ? {
    developer: { email: LOCAL_TEST_ACCOUNTS.developer.email, password: LOCAL_TEST_PASSWORD },
    owner: { email: LOCAL_TEST_ACCOUNTS.owner.email, password: LOCAL_TEST_PASSWORD },
  } : undefined;
  return <LoginForm testAccounts={testAccounts} />;
}
