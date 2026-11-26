"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Presentation boundary only. Pages and APIs keep enforcing their own access.
export function WorkspaceSurface({ children }: { children: ReactNode }) {
  const path = usePathname();
  const privatePage = path === "/" || /^\/(businesses|owner|subscription|managed-service|customers|calendar|notes|inquiries|notifications|custom-crm-requests|products|orders|website)(\/|$)/.test(path);
  return <div className={privatePage ? "app-workspace" : undefined}>{children}</div>;
}
