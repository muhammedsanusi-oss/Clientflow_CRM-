import Link from "./app-link";
import type { WebsiteTemplateKey } from "../../../packages/domain/src/website-templates";
import "./owner-workspace.css";
import { ownerWorkspaceHref, type DemoPlan } from "../../../packages/domain/src/subscription-access";

type OwnerWorkspaceBusiness = {
  id: string;
  name: string;
  websiteTemplate: WebsiteTemplateKey | null;
  demoSubscription?: { plan: DemoPlan; status: string; periodEnd: Date | null } | null;
};

const workspaceLabels = { home: "Business dashboard", appointments: "Appointments", customers: "Customers", edit: "Edit website", preview: "Website preview", subscription: "Demo subscription", managed: "Managed service", inquiries: "Website inquiries", notes: "Customer notes" } as const;

export function OwnerWorkspace({
  business,
  active,
  description,
  children,
}: {
  business: OwnerWorkspaceBusiness;
  active?: keyof typeof workspaceLabels;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="owner-workspace" data-theme={business.websiteTemplate ?? "NEUTRAL"}>
      <header className="owner-workspace-header">
        <div>
          <p className="owner-workspace-business">{business.name}</p>
          <p className="owner-workspace-description">{description ?? (active ? workspaceLabels[active] : "Business workspace")}</p>
        </div>
        <nav className="owner-workspace-nav" aria-label={`${business.name} workspace`}>
          <Link href={ownerWorkspaceHref(business)} aria-current={active === "home" ? "page" : undefined} className="owner-workspace-nav-link">{active === "home" ? "Dashboard" : "Back to dashboard"}</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
