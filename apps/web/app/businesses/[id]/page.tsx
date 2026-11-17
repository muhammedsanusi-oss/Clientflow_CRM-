/*
 * Code guide: apps/web/app/businesses/[id]/page.tsx
 * Developer business detail page. Shows public business information and owner activation status; configured
 * sites have Edit website and Open website actions. Pending credentials can be regenerated.
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
 * getProvisionedBusiness: Loads one business only when this developer has its explicit grant. Missing and
 * foreign IDs produce the same not-found domain error. Defined in packages/domain/src/provisioning.ts.
 */
import { getProvisionedBusiness } from "../../../../../packages/domain/src/index";
/*
 * Import connection: next/navigation.
 * Next.js navigation helpers: redirect/notFound end server rendering, while useRouter changes browser
 * navigation after form requests.
 * notFound: Ends rendering with the route not-found result; foreign and unknown resources use the same UI.
 * redirect: Ends this server response with navigation to the supplied application route.
 */
import { notFound, redirect } from "next/navigation";
/*
 * Import connection: next/link.
 * Next.js Link renders application navigation links; it does not itself authorize a destination or write
 * data.
 * Link: Client-side application navigation component; the destination still performs its own access checks.
 */
import Link from "../../../components/app-link";
/*
 * Import connection: ./regenerate-password -> apps/web/app/businesses/[id]/regenerate-password.tsx.
 * RegeneratePassword: Developer control that requests replacement credentials only for a pending owner
 * account. The server action rechecks developer access and refuses resets of active owners.
 */
import { RegeneratePassword } from "./regenerate-password";
import { WEBSITE_TEMPLATES } from "../../../../../packages/domain/src/website-templates";
import "./business-overview.css";
/*
 * Developer business detail page. Shows public business information and owner activation status; configured
 * sites have Edit website and Open website actions. Pending credentials can be regenerated.
 */
export default async function BusinessSetupPage({ params }: { params: Promise<{ id: string }> }) {
  // Resolve identity from the persisted session before accessing private business data; a form/URL user ID is
  // not trusted here.
  const userId = await currentUserId(); if (!userId) redirect("/login");
  const { id } = await params;
  const business = await getProvisionedBusiness(userId, id).catch(() => null);
  if (!business) notFound();
  const owner = business.employees[0];
  const status = !owner ? "Not assigned" : !owner.user.mustChangePassword ? "Active"
    : owner.user.temporaryExpiresAt && owner.user.temporaryExpiresAt <= new Date() ? "Setup expired" : "Pending setup";
  const statusKind = !owner ? "neutral" : !owner.user.mustChangePassword ? "active" : "pending";
  const path = `/businesses/${encodeURIComponent(business.id)}`;
  const email = business.email?.trim(), phone = business.phone_number?.trim();
  const phoneLink = phone?.replace(/[^+\d]/g, "");
  return <main className="business-overview">
    <div className="bo-container">
      <Link href="/" className="bo-back"><span aria-hidden="true">←</span> Back to dashboard</Link>
      <header className="bo-intro">
        <p className="bo-eyebrow">Business overview</p>
        <h1>{business.name}</h1>
        <p className="bo-description">{business.description || "Your business details and website tools, together in one place."}</p>
      </header>

      <section className="bo-card bo-website" aria-labelledby="bo-website-title">
        <div className="bo-website-copy">
          <span className="bo-icon" aria-hidden="true">▤</span>
          <div><h2 id="bo-website-title">Website</h2>
            <p>{business.websiteTemplate ? "Make it yours. Update your content, colors, and style." : "A website is not configured for this business yet."}</p>
            {business.websiteTemplate && <span className="bo-template">{WEBSITE_TEMPLATES[business.websiteTemplate].label} template</span>}
          </div>
        </div>
        {business.websiteTemplate && <div className="bo-actions">
          <Link href={`${path}/website`} className="bo-button bo-primary">Edit website <span aria-hidden="true">→</span></Link>
          <Link href={`/sites/${encodeURIComponent(business.id)}`} target="_blank" rel="noreferrer" className="bo-button bo-secondary" aria-label="Open website (opens in a new tab)">Open website <span aria-hidden="true">↗</span></Link>
          <span className="bo-action-note">Opens in a new tab</span>
        </div>}
      </section>

      <div className="bo-details">
        <section className="bo-card" aria-labelledby="bo-contact-title">
          <div className="bo-card-heading"><h2 id="bo-contact-title">Business contact</h2><span className="bo-label">Public details</span></div>
          <p className="bo-caption">How customers can reach this business.</p>
          <dl className="bo-fields">
            <div><dt>Business email</dt><dd>{email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? <a href={`mailto:${email}`}>{business.email}</a> : business.email || <span className="bo-empty">Not provided</span>}</dd></div>
            <div><dt>Business phone</dt><dd>{phoneLink && /^\+?\d{10,15}$/.test(phoneLink) ? <a href={`tel:${phoneLink}`}>{business.phone_number}</a> : business.phone_number || <span className="bo-empty">Not provided</span>}</dd></div>
          </dl>
        </section>
        <section className="bo-card" aria-labelledby="bo-owner-title">
          <div className="bo-card-heading"><h2 id="bo-owner-title">Owner access</h2><span className={`bo-status bo-status-${statusKind}`}><span aria-hidden="true" />{status}</span></div>
          <p className="bo-caption">Private login details for the business owner.</p>
          <dl className="bo-fields"><div><dt>Owner login email</dt><dd>{owner?.email || <span className="bo-empty">Not assigned</span>}</dd></div></dl>
          <p className="bo-owner-note">{!owner ? "No owner account is assigned to this business." : status === "Active" ? "The owner has completed account setup and can sign in." : status === "Setup expired" ? "The setup link has expired. Generate a replacement below." : "The owner needs to finish setting up their password."}</p>
          {owner?.user.mustChangePassword && <div className="bo-setup"><RegeneratePassword businessId={business.id} /></div>}
        </section>
      </div>

      <section aria-labelledby="bo-manage-title" className="bo-management">
        <h2 id="bo-manage-title">Manage this business</h2>
        <div className="bo-destinations">
          <Link href={`${path}/requests`} className="bo-destination"><span className="bo-icon" aria-hidden="true">✉</span><div><h3>Owner inquiries &amp; requests</h3><p>Review website messages and requested changes.</p></div><span className="bo-arrow" aria-hidden="true">→</span></Link>
          <Link href={`${path}/managed-service`} className="bo-destination"><span className="bo-icon" aria-hidden="true">≡</span><div><h3>Managed content changes</h3><p>Handle content updates and ongoing website care.</p></div><span className="bo-arrow" aria-hidden="true">→</span></Link>
        </div>
      </section>
    </div>
  </main>;
}
