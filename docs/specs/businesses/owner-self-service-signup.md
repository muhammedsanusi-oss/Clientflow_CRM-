---
type: feature
---
# Business owners sign up and create their own website

## Why

Business owners create an account with their own email, set up their business
website, and manage it without needing a developer to create their credentials.
An owner's account accesses only businesses where that user has an active
OWNER membership.

The private owner workspace carries the visual identity of the website template
chosen at signup, so the public site and the tools used to manage it feel like
one business experience.

## Where it lives

- `apps/web/app/signup/` and owner onboarding routes: local registration,
  business details, and website selection.
- `apps/web/app/businesses/[id]/website/` and
  `apps/web/components/business-sites/`: existing website editor and preview.
- `apps/web/components/owner-workspace.*`: template-aware owner navigation and
  administrative color themes.
- `packages/auth/`: signup and session creation.
- `packages/domain/`: signup, business, billing-address, and ownership
  validation and queries.
- `packages/db/prisma/`: additive, private billing-address storage.
- `packages/services/`: email-delivery adapter if production signup is enabled
  later.
- `tests/integration/` and `tests/http/`: signup lifecycle and tenant isolation.

## Behavior

- Signup pages and endpoints are available only when the server runs in local
  development mode. Production and other non-development runtimes return 404;
  client-supplied values cannot enable signup.
- The local demo collects first name, last name, normalized email, password,
  billing street, optional apartment/suite, city, state, and ZIP code. The owner
  then enters business details, selects a supported business type and website
  template, and selects a website plan before creating the account.
- The signup form presents three plans:

  | Plan | Demo price | Website allowance |
  |---|---:|---|
  | Free | $0.00 | Edit the selected template's existing sections; up to 10 images total |
  | Plus | $19.99/month | Up to 20 images total, 24/7 support, custom sections, and up to five feature requests |
  | Premium | $59.99/month | Up to 50 images total, 24/7 support, custom sections, and unlimited feature requests |

- Plan prices and benefits are demonstrative only. Signup does not collect
  payment details or charge the owner. 24/7 support is a displayed benefit
  only; no live support service is connected. Feature requests can be submitted
  and stored for future review, but there is no request status, response, or
  feature implementation workflow, and submission is not a promise to build
  the requested feature.
- The selected plan is stored with the newly created business. Existing
  developer-provisioned businesses and accounts are not assigned a plan or
  changed by signup.
- Plan image allowances count distinct image references across the whole site,
  including template sections and custom sections; images already represented
  in more than one field count once. Upload and publication reject content that
  would exceed the selected plan's total. The existing per-section limit of 10
  images still applies. Existing businesses without a selected plan retain
  their current editor limits.
- Free-plan owners can edit the sections already available in their selected
  website template and upload up to 10 images, but cannot add custom website
  sections or submit feature requests. Plus and Premium owners can add up to
  six custom text-and-image sections, matching the editor's existing maximum.
  They can submit feature requests from their owner website editor: Plus permits
  up to five requests per business, while Premium has no request-count cap. Each
  request contains a title and description and is associated with its business
  and submitting owner.
- Local demo signup skips email verification and does not imply that the
  submitted email is verified. A completed signup creates an authenticated
  owner identity and binds the new business through an active OWNER membership.
- In local development, the login page shows a “Business owner? Don't have an
  account? Sign up here!” link directly below the sign-in button, regardless of
  the selected sign-in role. The link opens this signup flow and is not shown
  in other runtimes.
- Business, owner membership, website template, billing address, and explicit
  developer access grants are written atomically. Signup does not claim, merge,
  or reset an existing account based only on email equality.
- A self-service owner account creates at most one business through this
  onboarding flow. Existing developer-provisioned accounts and internal
  developer onboarding continue through their existing path.
- The owner uses the existing live website editor to choose text and images,
  preview changes, and publish. Existing editor image limits and retention
  behavior remain unchanged.
- The owner's appointments, customers, notes, hours/staff, services, inquiries,
  and website-management pages use the selected website template's admin palette:
  warm cream and brown for Bakery, charcoal and gold for Barbershop, light blush
  and taupe for Salon, and sage and green for Contact. A business without a
  configured template retains the neutral admin palette.
- The owner sign-in destination opens the shared calendar workspace for the
  newest business with an active OWNER membership. The `/owner` route redirects
  to that calendar rather than rendering a separate business-card dashboard.
- The shared owner navigation provides Appointments, Customers, Edit Website,
  and Preview Website in that order. Appointments opens the selected business
  calendar, which is the owner's main dashboard; there is no duplicate Business
  Dashboard navigation item. Preview Website opens within Clientflow and shows
  the last published website; the editor separately continues to show unsaved
  changes live. The website's public link shows published changes after they
  are saved and published.
- The owner calendar does not repeat an inline Business Dashboard link.
- Workspace theming and navigation are presentation only. The existing session,
  active OWNER membership, and website authorization checks remain authoritative.
- Owner pages and mutations authorize through the current session and active
  OWNER membership. An owner cannot read or edit another owner's business,
  website, billing address, or inquiries; foreign and unknown resources return
  404.
- Billing address, owner names, and login email are private
  and are excluded from public website data and contact-form responses.
- Developer access remains separate from owner access and requires an explicit
  developer grant. Signed-out requests cannot access private signup completion,
  editor, or business data.
- Existing developer-provisioned accounts, websites, and stored data remain
  intact; this feature does not delete or reassign them.

## Examples

| State / input | Behavior |
|---|---|
| Owner provides valid details and selects a plan in local development | One owner account and its business/site are created with the selected plan |
| Signup is requested in production | Signup page and endpoint return 404 |
| Owner A requests owner B's website or billing details | 404; no data is disclosed |
| Signup email already belongs to an account | Existing account is not claimed or reset |
| Owner selects Free, Plus, or Premium | The chosen plan and its 10, 20, or 50 image cap are stored and enforced; no payment is taken |
| Plus owner submits a sixth feature request | The request is rejected without creating a record |
| Premium owner submits a feature request | The request is stored for future review; no implementation or response is promised |
| Free owner tries to add a custom section or submit a request | The operation is unavailable in the UI and rejected by the server |
| Public website renders business content | Billing address, owner name, and login email are not included |
| Owner publishes an edited website | The selected business's published content changes; other sites are unchanged |
| Owner opens Edit Website and changes a heading without publishing | The editor preview shows the draft; the owner preview and public link remain on the previously published version |
| Owner publishes the heading change | The in-app owner preview and public website show the new published heading |

## Verify

- Integration tests cover signup validation, local-only environment gating,
  plan validation and persistence, atomic business/membership creation,
  duplicate emails, and cross-owner 404s.
- Website-editor tests verify the 10/20/50 distinct-image limits, the existing
  per-section limit, paid-plan custom-section access, and rejection of free-plan
  custom-section writes.
- Feature-request tests verify owner/business authorization, Plus's five-request
  cap, unlimited Premium submissions, Free-plan rejection, and that requests
  remain private from public websites.
- Verify that the plan cards do not trigger payment or imply a live support
  service or guaranteed feature implementation.
- Public projection tests verify that billing and identity fields never appear
  on published websites or contact responses.
- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- Manually register two local demo owners, complete different website
  templates, customize and publish each website, and confirm neither account
  can access the other's owner workspace.
- Verify Bakery, Barbershop, Salon, and Contact owners see their matching admin
  palette and the owner workspace navigation contains Appointments, Customers,
  Edit Website, and Preview Website in order, without a Business Dashboard item.
- Verify `/owner` redirects to the newest owned business's calendar; with no
  owned businesses it displays the access-help message.
- Verify an unpublished website edit appears in the editor's live preview but
  not in the owner Preview Website view or public link; publish it and verify
  both published views then show the edit.
- Verify that production signup remains unavailable. Email verification is not
  part of the local demo.

## Constraints & decisions

- Local demo signup does not verify control of the email address. It must remain
  unavailable outside local development.
- Production self-service signup requires email verification because the
  signup email becomes the login identity associated with website ownership.
  The delivery provider is undecided; do not enable production signup until a
  provider and verification flow are implemented.
- The email is an identity attribute, not an authorization key. The active
  OWNER membership is the tenant boundary.
- Billing address collection does not include payment cards, subscriptions,
  invoices, or payment processing.
- Developer provisioning remains available for existing/internal onboarding
  as described in [ADR-0017](../../adr/0017-owner-self-service-signup.md).
  Existing accounts are not automatically claimed or reset.
- See [ADR-0018](../../adr/0018-local-demo-owner-signup.md) for the accepted
  local-demo exception and [ADR-0017](../../adr/0017-owner-self-service-signup.md)
  for the production verification requirement.

## Out of scope

Production self-service signup, email verification/delivery, subscription
billing, payment-card storage, custom domains, staff invitations, account
recovery, and automatic migration or merging of existing accounts are not part
of the local demo.
