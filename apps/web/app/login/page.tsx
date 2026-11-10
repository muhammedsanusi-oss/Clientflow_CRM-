/*
 * Code guide: apps/web/app/login/page.tsx
 * Server entry for /login. Existing sessions go to activation, the developer dashboard, or the owner portal.
 * Development-only test credentials are passed to the browser form.
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
 * Import connection: ./login-form -> apps/web/app/login/login-form.tsx.
 * LoginForm: Browser form for choosing Developer or Business owner and entering credentials. Submits JSON to
 * /api/auth/login, displays errors, and navigates to the server-selected destination.
 */
import LoginForm from "./login-form";
/*
 * Import connection: ../../../../packages/auth/src/test-accounts -> packages/auth/src/test-accounts.ts.
 * LOCAL_TEST_ACCOUNTS: Fixed development-only developer/teammate/owner identifiers and display information.
 * LOCAL_TEST_PASSWORD: Intentionally public synthetic password for the local test identities; not a
 * production credential.
 */
import { LOCAL_TEST_ACCOUNTS, LOCAL_TEST_PASSWORD } from "../../../../packages/auth/src/test-accounts";
import { isLocalOwnerSignupEnabled } from "../../../../packages/domain/src/index";
/*
 * Server entry for /login. Existing sessions go to activation, the developer dashboard, or the owner portal.
 * Development-only test credentials are passed to the browser form.
 */
export default async function LoginPage() {
  // Read the current session, including restricted activation state where this screen needs it.
  const session = await currentSession();
  if (session) redirect(session.restricted || session.user.mustChangePassword ? "/change-password" : session.user.isDeveloper ? "/" : "/owner");
  const testAccounts = process.env.NODE_ENV === "development" ? {
    developer: { email: LOCAL_TEST_ACCOUNTS.developer.email, password: LOCAL_TEST_PASSWORD },
    owner: { email: LOCAL_TEST_ACCOUNTS.owner.email, password: LOCAL_TEST_PASSWORD },
  } : undefined;
  return <LoginForm testAccounts={testAccounts} allowDemoSignup={isLocalOwnerSignupEnabled()} />;
}
