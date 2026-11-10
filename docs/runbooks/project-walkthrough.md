# Walk through Clientflow with a teammate

## What this increment adds

Clientflow now has a developer side for creating businesses and a business-owner side for managing the assigned business. Developers choose a reusable website template, supply business and owner information, and hand the owner a temporary password. The owner changes that password before accessing private data. Public website visitors can send messages that appear in the correct owner's private inquiry inbox.

The existing dashboard and customer/calendar features are retained. The four standard website designs are Bakery, Barbershop, Salon, and Contact; each is rendered from shared components and saved business information rather than a separate copy of an application.

GitHub OAuth is replaced by email/password authentication. Ready-to-use synthetic accounts support local browser testing without account-creation commands. Those fixed test identities and their sessions are disabled outside development.

## Run the demo

1. Run `pnpm install`, `pnpm prisma:generate`, and `pnpm dev` from the repository. The app, database, worker, and storage emulator run locally. Windows users should follow [the Windows runbook](run-local-windows.md) if using the existing port configuration.
2. Open `/login`. Select **Developer**, choose **Use test developer**, and sign in. The test email is `developer@clientflow.test`; its intentionally public password is `Clientflow-test-2026!`. A teammate can also use `friend@clientflow.test` with that password.
3. Show the existing dashboard, then choose **Create business**. Select a template, open its preview, close it, and choose **Use sample details**. Explain that the owner login email is private while the business contact fields appear on the website.
4. Save with **Create business & website**. Copy the owner email and temporary password from the confirmation. Creation saves the business, website settings, owner account/membership, and developer access together.
5. Choose **Open website**. Check the saved name, description, phone, contact email, optional address, and hours. Submit a synthetic message through its contact form.
6. In a separate browser session, choose **Business owner** on `/login` and enter the newly supplied owner email and temporary password. The password works once, expires after 24 hours, and first opens password replacement. Choose a permanent password to enter that owner's workspace.
7. Open **Website inquiries** and show the submitted message. Show the existing customer records, notes, and calendar navigation as the business owner.
8. Sign out and confirm the old session no longer opens private data. Repeat with another business to demonstrate that owners cannot read each other's customer records or inquiries.

For a quick owner-only preview, the **Use test business owner** button signs in as `owner@clientflow.test` using the shared public test password and opens Sample business. This is separate from testing a newly created owner's activation flow.

## Explain the implementation

- **Accounts and access:** persisted roles control routing and permission checks; choosing Developer on the login page cannot promote an owner. Developers use explicit business-access grants, while owners use active employee memberships.
- **Credentials and sessions:** salted scrypt hashes replace plaintext passwords. Cookies hold random opaque tokens; their digests resolve database sessions. Activation tickets cannot access the CRM, and logout revokes its database ticket.
- **Business creation:** a transaction prevents partial businesses or orphan owner accounts. Existing emails are not silently claimed, reassigned, or reset.
- **Websites:** `/sites/<businessId>` renders one of four shared templates using an explicit projection of public business fields. Legacy businesses without website settings remain private.
- **Contact delivery:** validated, same-origin form submissions save business-bound inquiries with a body-size limit, honeypot, and persisted rate limit. A message is saved in Clientflow; it is not automatically emailed, converted into a customer, or booked as an appointment.
- **Database changes:** append-only migrations `0006_owner_provisioning.sql` and `0007_website_templates.sql` add credentials, access grants, activation/session state, website settings, bakery type, and inquiries. Existing data and earlier migrations are preserved.
- **Production session fix:** one shared database initialization promise/client now spans Next.js page/action and API runtimes. The [postmortem](../postmortems/2026-11-production-session-client-split.md) explains the built-app failure that exposed this.
- **Documentation and tests:** README/MVP, feature and infrastructure specs, ADRs, setup runbooks, and regression/HTTP drills accompany the code. No new third-party library is added; the GitHub OAuth dependencies are removed.

## Verification and current limits

The local checks cover 126 package/integration tests, TypeScript, production build, and HTTP drills for all four sites, activation, contact delivery, and tenant isolation. The unrelated untracked duplicate `0003_business_services.sql` is not part of the proposed commit; fresh-database tests were run with that file temporarily excluded and then restored unchanged.

Visual/mobile inspection and the keyboard-only preview/sample-fill drill still require a browser review. This increment does not include subscription billing, cloud deployment, custom domains, a drag-and-drop editor, ecommerce checkout, automatic email/SMS, or online appointment availability. Those remain separate features.

Start review with [website templates](../specs/businesses/website-templates.md), [developer provisioning](../specs/businesses/developer-provisioning.md), and [authentication](../specs/auth.md).
