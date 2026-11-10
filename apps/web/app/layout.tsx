/*
 * Code guide: apps/web/app/layout.tsx
 * Shared HTML shell for every route. Adds global CSS, page metadata, and the session-aware sign-out button;
 * individual pages and actions still enforce authorization.
 * This entry renders on the server and supplies data/props to interactive components.
 */
// Root layout for the Next.js app. Wraps every page with the HTML shell and
// global styles and a session-aware sign-out control on every private page.
/*
 * Import connection: next.
 * Next.js TypeScript configuration/metadata interfaces; imported types are erased from runtime JavaScript.
 * Type Metadata: Type for browser title/description metadata, erased during compilation.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
/*
 * Import connection: ../../../packages/auth/src/index -> packages/auth/src/index.ts.
 * currentSession: Reads the opaque cookie, hashes its token, and loads its persisted session plus limited
 * user role data. Rejects expired tickets and fixed test identities outside development. Defined in
 * packages/auth/src/current-user.ts.
 */
import { currentSession } from "../../../packages/auth/src/index";
/*
 * Import connection: ./sign-out-button -> apps/web/app/sign-out-button.tsx.
 * SignOutButton: Posts to /api/auth/logout to revoke the database session, then returns to /login. Shows a
 * retryable error when the request fails.
 */
import { SignOutButton } from "./sign-out-button";
/*
 * Import connection: ./globals.css -> apps/web/app/globals.css.
 * Loads this stylesheet for the component/page; it supplies styles only.
 */
import "./globals.css";

// Browser/document metadata for the shared layout, not a business record.
export const metadata: Metadata = {
  title: "Clientflow CRM",
  description: "A clearer way to manage your client relationships.",
};

/*
 * Shared HTML shell for every route. Adds global CSS, page metadata, and the session-aware sign-out button;
 * individual pages and actions still enforce authorization.
 */
async function SessionHeader() {
  const userId = await currentSession();
  return userId ? <header className="fixed right-5 top-3 z-50 flex items-center gap-2 rounded-lg bg-white shadow-sm"><Link href="/subscription" className="px-3 py-2 text-sm font-medium text-indigo-700">Demo subscription</Link><SignOutButton /></header> : null;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans text-neutral-900 antialiased">
        <Suspense fallback={null}>
          <SessionHeader />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
