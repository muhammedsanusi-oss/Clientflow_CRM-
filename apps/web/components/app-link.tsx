"use client";

import NextLink, { useLinkStatus } from "next/link";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { createPortal } from "react-dom";
import "./page-loading.css";

function NavigationFeedback() {
  const { pending } = useLinkStatus();
  if (!pending || typeof document === "undefined") return null;
  return createPortal(<div className="cf-navigation-loading" role="status" aria-live="polite"><span className="cf-loading-spinner" aria-hidden="true" /><span>Loading page...</span></div>, document.body);
}

/** Preserve Next Link behavior and expose its real pending transition, including before the first byte. */
const AppLink = forwardRef<HTMLAnchorElement, ComponentPropsWithoutRef<typeof NextLink>>(function AppLink({ children, ...props }, ref) {
  return <NextLink {...props} ref={ref}>{children}<NavigationFeedback /></NextLink>;
});
export default AppLink;
