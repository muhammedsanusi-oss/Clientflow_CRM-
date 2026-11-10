---
type: feature
---
# Developers create business websites from four reusable templates

## Why

The project team needs repeatable starting points for business websites instead of building each site from scratch. Selecting a template and supplying business details produces a working local site that developers can open immediately, while the owner account remains linked to the same business.

## Where it lives

- `apps/web/app/businesses/new/`: template selection, sample input, existing provisioning form, and creation confirmation.
- `apps/web/app/businesses/[id]/`: website link and template information in the existing developer business details.
- `apps/web/app/sites/[businessId]/`: public template website with the saved business information.
- `apps/web/app/api/sites/[businessId]/contact/`: public contact submission for that website.
- `apps/web/app/inquiries/`: the signed-in owner's contact inquiries.
- `apps/web/components/business-sites/`: shared site sections and the four template designs.
- `packages/domain/`: template definitions, business validation, explicit public projections, and inquiry queries.
- `packages/db/prisma/`: append-only website settings, bakery business type, and inquiry storage changes.
- `tests/integration/` and `tests/http/`: template creation, public rendering, contact delivery, and owner isolation verification.
- `docs/specs/auth.md`, `docs/specs/web.md`, `docs/specs/businesses/developer-provisioning.md`, `README.md`, and `MVP.md`: related contracts and entry points updated with implementation.

## Behavior

### Select a standard website

- The existing developer dashboard and business creation flow remain the entry point. `Create business` offers four selectable template cards: Bakery, Barbershop, Salon, and Contact.
- Each card identifies the sections included and provides a preview using clearly fictional sample business information. Selecting a card sets the website template; the server accepts only the four supported keys.
- Bakery uses a warm cream design, a bakery introduction, example offering cards, business information, and contact section. It does not provide ordering or checkout.
- Barbershop uses a dark design, a service introduction, example service cards, business information, and a contact section. Contact calls to action do not claim to reserve appointments.
- Salon uses a light design, a salon introduction, example treatment cards, business information, and a contact section. It does not fabricate staff, reviews, prices, or availability.
- Contact uses a simple introduction and prominent contact form, suitable for a general service business or individual.
- Shared sections render supplied business name, description, contact email, phone, and optional address and opening-hours text. Owner login email remains a separate private field.
- Preset offering labels are illustrative starting content, visibly identified as examples. No unsupported business claims, invented reviews, or real prices are generated.

### Supply information and create

- The browser form always supplies its selected template. For compatibility, older API callers that omit the template receive Contact; unknown template keys are rejected.
- The current form retains business name/type/description, contact email/phone, and owner name/login email. It adds the required template choice and optional public address (at most 300 characters) and opening-hours text (at most 500).
- Bakery is added to the supported business types through an additive migration; existing types and rows remain intact. The Contact template supports the existing general business type.
- `Use sample details` explicitly fills fictional information for the selected template, including a fresh test owner email so repeated tests do not claim an existing account. Filling sample information does not submit the form or create records.
- Saving transactionally creates the business, selected website settings, owner account and OWNER membership, and developer grants through the existing provisioning flow.
- A newly created template site is available at `/sites/<businessId>` on the same local app. The confirmation retains the one-time owner credential handoff and adds `Open website` and `Back to dashboard` actions.
- The business detail screen and dashboard card provide the saved website link. Different businesses using the same template render their own supplied details.
- A configured website includes a `Book online` link to that business's public booking page. The page exposes only that business's active booking choices and available times; owner-managed hours, services, staff display names, and appointment rules are described in [customer booking](../appointments/customer-booking.md).
- Existing businesses without website settings do not become public automatically. Their public site returns 404. This feature does not backfill or publish legacy business records.
- No cloud deployment, custom domain, or separate generated application is required. The website is an additional route in Clientflow backed by the saved business record.

### Receive contact requests

- Every template includes a functional form with name, email, optional phone, and message. It collects no payment details or passwords.
- Valid submissions persist an inquiry linked to the publicly configured business and show a success message. The server derives the destination from the site route; body-supplied owner IDs, recipient emails, and business IDs are rejected.
- Validation requires a name of 1-100 characters, a valid email up to 254, an optional phone up to 30 characters, and a message of 10-2000 characters. Request bodies are limited to 8 KiB.
- Contact POSTs require same-origin submission and an existing configured website. Unknown sites return 404; invalid submissions return the standard 400 error envelope. Unexpected failures return a safe generic error without logging contact bodies.
- A hidden honeypot prevents obvious automated submissions from being stored. Persisted per-business counters allow at most 10 submissions per 15-minute window, returning 429 after the limit. These limits support local project testing; a hosted public launch requires separate abuse-control review.
- The signed-in owner opens `Inquiries` from their business workspace and sees sender name/email/phone, message, and submission time, newest first.
- Inquiry reads require the current user's active OWNER membership in the selected business. Other owners and unknown resources return 404; signed-out and activation-only sessions have no private inquiry access.
- Saving an inquiry does not automatically create a CRM customer, send email, or schedule an appointment. Delivery means the inquiry is saved to the owner's inbox in Clientflow.

### Preserve developer and owner access

- Template selection does not change identity or ownership. A developer provisions the owner email; that owner activates the account and accesses the same business's private workspace and inquiries.
- Public pages query an explicit allowlist of website fields only. They expose no owner login email, user IDs, credentials, private CRM records, inquiry contents, or developer grants.
- The login choices, local test accounts, password activation, session revocation, private membership checks, and foreign-resource 404 behavior retain their existing contracts.
- Public website routes and the contact endpoint are deliberate exceptions to the current private-by-default web contract; see the proposed ADR below. Other routes remain private.

## Examples

| State / input | Behavior |
|---|---|
| Developer selects Bakery and saves valid information | Creates owner and business together; Open website shows the bakery layout with that business's details |
| Developer selects Barbershop or Salon | Creates the corresponding reusable layout with its own business details |
| Developer selects Contact and uses sample details | Fills a fictional business and fresh owner email; saving produces a testable contact site |
| Two businesses use Bakery | Shared layout; each site renders only its own public information |
| Visitor submits a valid message | Inquiry is stored for that site's business and success is shown |
| Owner signs in using the provisioned email | Opens the linked private workspace and can read its inquiries after activation |
| Owner A requests business B's inquiries | 404; no messages disclosed |
| Visitor supplies an unsupported template or invalid contact input | Validation failure; no relevant records created |
| Visitor opens a legacy business without website settings | 404; no accidental publication |
| Contact request names another recipient in its body | Rejected; destination cannot be reassigned |

## Verify

- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- From the website's Developer test login, choose each of the four templates, use its sample details, create the business, and open its saved website link.
- Confirm the saved site uses the supplied name, description, email, phone, address, and hours, and the selected template remains saved after reload.
- Submit a sample contact message, activate the associated owner with the provisioned email and temporary password, and confirm the message appears in that business's Inquiries section.
- Provision a second business and prove both public content separation and private inquiry isolation; verify private fields are absent from public page output and response projections.
- Exercise invalid input, honeypot, body size, same-origin protection, rate limits, missing sites, and transactional rollback.
- Test owner workspace, inquiry pages, and actions with no session, activation-only tickets, and foreign business selections.
- Check mobile layout, keyboard access, form labels, focus visibility, pending/error/success states, and template previews when browser tooling is available; report unavailable visual checks.

## Constraints & decisions

Use reusable Next.js/React components and the current pnpm monorepo; no new third-party dependencies are planned. Templates are saved configuration rendered by shared code, not copied source trees or separate hosted projects. Public business contact information is intentionally separate from private login and CRM information. See the decision in `docs/adr/0016-business-website-templates.md`.

The public-route and provisioning contracts explicitly include these website routes. This specification defines the new increment; it does not imply billing, email delivery, custom domains, or a production launch.

## Out of scope

Editing after creation is governed by [website editing](website-editing.md): authorized developers and active owners preview and publish supported content, visual styles, text sections, and image changes. Untouched sites continue to use the original template defaults.

Drag-and-drop builders, arbitrary code or CSS, custom domains, independent deployments, subscriptions, ecommerce, online payment, appointment availability or booking, automated email/SMS, customer auto-creation from inquiries, and changing existing CRM workflows remain out of scope. The current business and auth specifications continue to own provisioning and account activation.
