/*
 * Code guide: apps/web/app/businesses/new/page.tsx
 * Developer-only /businesses/new page. Opens the reusable website selection and business/owner form;
 * successful creation displays a one-time credential receipt.
 * This entry renders on the server and supplies data/props to interactive components.
 */
/*
 * Import connection: ../../../../../packages/auth/src/index -> packages/auth/src/index.ts.
 * currentUserId: Resolves the current database session and returns its user ID only for a regular, unexpired
 * session. Activation-only tickets cannot authorize private CRM operations. Defined in
 * packages/auth/src/current-user.ts.
 */
import { currentUserId } from "../../../../../packages/auth/src/index";
/*
 * Import connection: ../../../../../packages/domain/src/index -> packages/domain/src/index.ts.
 * requireDeveloper: Checks the persisted developer role and completed password setup. Being a developer is
 * separate from holding a grant for a particular business. Defined in packages/domain/src/provisioning.ts.
 */
import { requireDeveloper } from "../../../../../packages/domain/src/index";
/*
 * Import connection: next/navigation.
 * Next.js navigation helpers: redirect/notFound end server rendering, while useRouter changes browser
 * navigation after form requests.
 * redirect: Ends this server response with navigation to the supplied application route.
 * notFound: Ends rendering with the route not-found result; foreign and unknown resources use the same UI.
 */
import { redirect, notFound } from "next/navigation";
/*
 * Import connection: next/link.
 * Next.js Link renders application navigation links; it does not itself authorize a destination or write
 * data.
 * Link: Client-side application navigation component; the destination still performs its own access checks.
 */
import Link from "next/link";
/*
 * Import connection: ./business-form -> apps/web/app/businesses/new/business-form.tsx.
 * BusinessForm: Helper/value provided by the connected module; its use in this file is shown below. Defined
 * in apps/web/app/businesses/new/website-business-form.tsx.
 */
import { BusinessForm } from "./business-form";

/*
 * Developer-only /businesses/new page. Opens the reusable website selection and business/owner form;
 * successful creation displays a one-time credential receipt.
 */
export default async function NewBusinessPage() {
  // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
  // not trusted here.
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  try { await requireDeveloper(userId); } catch { notFound(); }
  return <main className="mx-auto max-w-2xl space-y-8 px-5 py-10">
    <header className="space-y-3">
      <Link href="/" className="text-sm text-indigo-700 underline">Back to dashboard</Link>
      <h1 className="text-3xl font-semibold">Create business</h1>
      <p className="text-sm text-slate-600">Set up a business portal and create the owner's login. You can share their temporary password after saving.</p>
    </header>
    <BusinessForm />
  </main>;
}
