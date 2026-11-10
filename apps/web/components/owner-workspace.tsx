import Link from "next/link";
import type { WebsiteTemplateKey } from "../../../packages/domain/src/website-templates";
import "./owner-workspace.css";

type OwnerWorkspaceBusiness = {
  id: string;
  name: string;
  websiteTemplate: WebsiteTemplateKey | null;
};

const workspaceLinks = [
  { key: "appointments", label: "Appointments", href: (id: string) => `/calendar?businessId=${encodeURIComponent(id)}` },
  { key: "customers", label: "Customers", href: (id: string) => `/customers?businessId=${encodeURIComponent(id)}` },
  { key: "edit", label: "Edit Website", href: (id: string) => `/businesses/${encodeURIComponent(id)}/website`, configured: true },
  { key: "preview", label: "Preview Website", href: (id: string) => `/website?businessId=${encodeURIComponent(id)}`, configured: true },
] as const;

export function OwnerWorkspace({
  business,
  active,
  description,
  children,
}: {
  business: OwnerWorkspaceBusiness;
  active?: (typeof workspaceLinks)[number]["key"];
  description?: string;
  children: React.ReactNode;
}) {
  const links = workspaceLinks.filter((link) => !("configured" in link) || business.websiteTemplate);
  return (
    <div className="owner-workspace" data-theme={business.websiteTemplate ?? "NEUTRAL"}>
      <header className="owner-workspace-header">
        <div>
          <p className="owner-workspace-business">{business.name}</p>
          {description ? <p className="owner-workspace-description">{description}</p> : null}
        </div>
        <nav className="owner-workspace-nav" aria-label={`${business.name} workspace`}>
          {links.map((link) => (
            <Link
              key={link.key}
              href={link.href(business.id)}
              aria-current={active === link.key ? "page" : undefined}
              className="owner-workspace-nav-link"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
