// Root layout for the Next.js app. Wraps every page with the HTML shell and
// global styles and a session-aware sign-out control on every private page.
import type { Metadata } from "next";
import { currentUserId } from "../../../packages/auth/src/index";
import { SignOutButton } from "./sign-out-button";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clientflow CRM",
  description: "A clearer way to manage your client relationships.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // A layout alone is not an authorization gate: every page/action checks again.
  const userId = await currentUserId();
  return (
    <html lang="en">
      <body className="font-sans text-neutral-900 antialiased">
        {userId && <header className="fixed right-5 top-3 z-50 rounded-lg bg-white shadow-sm"><SignOutButton /></header>}
        {children}
      </body>
    </html>
  );
}
