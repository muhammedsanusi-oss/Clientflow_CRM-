# Clientflow CRM

Clientflow helps small service businesses keep customer details, relationship history, and appointments in one workspace.

The product direction is a subscription SaaS. This repository currently provides a local development MVP; subscription management and hosted operations remain planned work. Appointment-based service businesses are the provisional first audience.

See [MVP scope and SaaS roadmap](MVP.md) for the proposed pilot, launch requirements, and deferred features.

## Current features

- Create businesses and switch between accessible workspaces ([spec](docs/specs/businesses/create-business.md)).
- Add, search, and edit customers ([creation](docs/specs/customers/add-customer.md), [search and editing](docs/specs/customers/search-and-edit.md)).
- Keep shared customer notes ([spec](docs/specs/customers/customer-notes.md)).
- Schedule appointments and view a monthly calendar ([spec](docs/specs/appointments/customer-calendar.md)).
- Manage businesses, employees, and locations through business-scoped APIs ([spec](docs/specs/businesses/management-api.md)).

Owners access CRM records through their active business memberships. Developers access provisioning records through explicit developer grants.

## Local development

Use Node.js and pnpm. No Docker or cloud account is required. Windows users should enable Corepack before running the project and can follow the [local setup runbook](docs/runbooks/run-local-windows.md).

```bash
# macOS / Linux
pnpm install
pnpm prisma:generate
pnpm dev
```

```powershell
# Windows PowerShell
corepack.cmd pnpm install
corepack.cmd pnpm prisma:generate
corepack.cmd pnpm dev
```

If pnpm is not yet enabled in your shell, run `corepack enable` once first (or `corepack.cmd enable pnpm --install-directory node_modules/.bin` on Windows). This repo pins pnpm through the packageManager field in [package.json](package.json), so Corepack is the expected startup path on Windows.

Once the web app and database are ready, `pnpm dev` opens the sign-in page at http://localhost:3000/login in your browser. This displays the login form; it does not sign you in automatically. The health endpoint at /api/health returns {"status":"ok","db":"ok"} when the database is available.

The dev command starts Next.js, a background worker, local PostgreSQL, and Azurite. Local data lives in .pgdata/ and .azurite/; do not commit it.

### Sign in on the website

Open http://localhost:3000/login and choose Developer or Business owner. For local testing, click Use test account and then Sign in. Test accounts are created automatically; no developer account-creation command is required.

| Login type | Test email | Test password |
|---|---|---|
| Developer | developer@clientflow.test | Clientflow-test-2026! |
| Business owner | owner@clientflow.test | Clientflow-test-2026! |

The developer opens the existing dashboard, selects Create business, and enters the business details plus the owner's login email. The saved business is linked to that owner's account. Share the temporary password displayed after creation; the owner selects Business owner on the login page and must replace that password before opening their linked business portal.

The sample owner opens the business dashboard at `/owner`, then chooses Customers, Website, or Website inquiries for a linked business. During local development, `/login` also links to a demo owner signup at `/signup`; it creates one owner and business, skips email verification, and continues to the website editor. Use synthetic details only—billing details are not verified. This signup is unavailable outside local development. A second developer can use friend@clientflow.test with the same test password. Fixed test accounts are disabled outside local development. Individual developer credentials can optionally be provisioned using the maintenance command described in [setup](docs/runbooks/developer-owner-setup.md).

See the [feature spec](docs/specs/businesses/developer-provisioning.md). The selected public website is a route within Clientflow; no separate deployment, automated email, or subscription billing is created.

## Reusable business websites

From Developer sign-in, choose **Create business**, select **Bakery**, **Barbershop**, **Salon**, or **Contact**, and use **Preview template** or **Use sample details**. Saving creates the selected site and the linked owner account; select **Open website** on the confirmation or dashboard card.

Each site uses the saved business name, description, public email/phone, and optional address/hours. Its contact form delivers messages to the owner's **Website inquiries** inbox in Clientflow. Sign in using that owner's supplied email and complete first-password replacement to test the inbox. Existing businesses without template settings stay private.

See the [template specification](docs/specs/businesses/website-templates.md) and [testing runbook](docs/runbooks/business-website-templates.md). These are routes in the local app; no custom domain, separate deployment, email delivery, ordering, or payment setup is required.

### Customize an owner's website

Choose **Edit website** on a configured business in the developer dashboard or business details. Developers can update its template; owners and developers see the rendered site while editing and click a section to change its text or upload up to 10 images there. Hero and about text are independent. A design panel controls safe site-wide font/color/size choices. Changes appear in the preview immediately; **Save and publish** updates the live site and records a revision. A stale editor cannot overwrite a newer publication.

Owners select **Website** in their business portal to view the published result, edit the site, and open the public site. Removing text sections or image references requires confirmation. Image files remain stored when their website references are removed. See the [website editing specification](docs/specs/businesses/website-editing.md).

## SaaS direction

The proposed first release focuses on one workflow: the team provisions a business, its owner activates their account, and the owner records customers and schedules visits.

Before accepting real customer data, the hosted service needs verified authentication, revocable sessions, secure invitations, complete permission checks, tenant isolation, backups with tested recovery, and monitoring. A paid release additionally needs workspace subscriptions and reliable subscription lifecycle handling. These are proposed requirements, not shipped capabilities.

Pricing, the first customer segment, and the production sign-in method remain open decisions. GitHub OAuth is not required.

## Commands

| Command | Purpose |
|---|---|
| pnpm dev | Run web, worker, PostgreSQL, and Azurite |
| pnpm dev:web | Run the web app only |
| pnpm db:seed | Create demo data while local services run |
| pnpm prisma:generate | Generate the typed database client |
| pnpm test | Package and integration tests; no services required |
| pnpm typecheck | Check TypeScript across workspaces |
| pnpm build | Build the application |
| pnpm verify:api | Exercise business APIs on a disposable instance |

## Architecture

This pnpm/Turborepo monorepo uses Next.js and TypeScript, Prisma and PostgreSQL, and a separate background worker with Azure storage and queue adapters. Integration tests use in-memory PGlite.

Deployable processes live in apps/; shared database, domain, auth, logging, and service packages live in packages/. See the [monorepo contract](docs/specs/monorepo.md) and [documentation index](docs/README.md).

## Contributing

Follow [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md). Behavior changes require a reviewed feature spec and passing tests, typecheck, and build. MVP.md guides future specifications; it does not authorize implementation of unreviewed features.
