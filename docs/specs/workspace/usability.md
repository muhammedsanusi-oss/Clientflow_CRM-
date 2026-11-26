---
type: feature
---
# Workspace pages keep navigation and actions consistent

## Why

Developers and owners move between business details, website editing, inquiries,
subscriptions, and managed service without losing context. Each screen presents
clear actions in a consistent layout and offers destinations the user can access.

## Where it lives

- `apps/web/app/layout.tsx`: shared authenticated account controls.
- `apps/web/components/`: shared workspace presentation and owner navigation.
- `workspace-surface.tsx` / `.css` select and style private routes;
  `managed-service-view.tsx` / `.css` render the shared care dashboard.
- `apps/web/app/businesses/[id]/website/`: developer/owner editor page chrome.
- `apps/web/app/businesses/[id]/requests/`: developer business inbox.
- `apps/web/app/website/`, `subscription/`, and `managed-service/`: owner preview
  and existing subscription/service screens.
- `apps/web/app/customers/page.tsx`: selected-business navigation.
- `apps/web/app/businesses/new/`, `notifications/`, and `custom-crm-requests/`:
  mobile header clearance.
- Existing domain entitlement helpers remain the access source of truth.

## Behavior

- Authenticated account controls have reserved layout space. They do not cover
  navigation, headings, or inputs at desktop, 390px, or 200 percent scaling.
  Public site and booking layouts keep their independent designs.
- Related private pages use consistent spacing, heading hierarchy, card
  surfaces, primary/secondary actions, and visible keyboard focus. Existing
  business data and destination routes remain intact.
- Private dashboards, business overviews, inboxes, managed service,
  subscriptions, customer/notes pages, bakery tools, and scheduling settings
  share soft surfaces, rounded cards, restrained accent colors, compact
  typography, and clear form controls. The website editor keeps its dedicated
  studio styling. Public websites, booking, shop, tracking, and sign-in retain
  their own layouts.
- Managed service presents the real monthly allowance with a visual meter,
  recorded minutes, UTC reset information, and explicit eligibility feedback.
  Empty request lists have a helpful illustrated state; existing request,
  history, and developer controls retain their behavior and labels. No progress
  or usage is fabricated for decorative purposes.
- Business-specific navigation carries the authorized selected business ID.
  Customer-to-calendar navigation retains its workspace and selected business.
- Owner preview uses the existing workspace destination helper for its return
  link. A website-only owner returns to an accessible website/subscription
  destination instead of a CRM-only screen.
- Edit website is offered on the dashboard and preview to every authorized
  owner of a configured site, regardless of subscription plan or state.
  Developer capabilities remain governed by existing developer grants. Image
  allowances and paid CRM/support restrictions remain separate.
- Owner navigation includes inquiries for eligible website owners and notes for
  eligible CRM owners, with the active destination identified. Hiding a link
  never substitutes for server authorization.
- The editor page has a concise introduction and a distinct publish action.
  Help text explains live preview versus publishing without repeating the same
  instruction in multiple surrounding cards. Section tools remain in normal
  document flow, as required by the website editing contract.
- Shared workspace styling respects the four existing owner themes and keeps
  readable text on nested cards, including the dark barbershop theme.
- Existing form fields, limits, pending/error handling, and protected mutations
  remain available. This presentation increment does not add business writes.
- Signed-out users still reach login. Foreign/unknown resources remain 404.
  Plan restrictions and existing atomic write/history behavior are unchanged.

## Examples

| State / input | Behavior |
|---|---|
| Developer opens Notifications at 390px | Back navigation is visible below the account controls |
| CRM owner views business A and opens Calendar | Calendar keeps business A in its query and navigation |
| Standard website owner opens the published preview | Return link points to an accessible workspace; no CRM-only destination is suggested |
| Inactive website owner opens preview | Edit website remains available for the owner's site; subscription management remains reachable |
| Owner opens inquiries or notes | Relevant owner navigation item identifies the active screen |
| Dark-template owner opens managed service | Heading and card text remain readable against their surfaces |
| Foreign business ID is supplied | Existing 404 behavior; no business data is disclosed |

## Verify

- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`; record existing unrelated
  failures separately and do not describe a blocked full suite as passing.
- Exercise developer and owner routes at 1440px, 390px, and 200 percent scaling.
  Check account-header clearance, content wrapping, keyboard focus, and primary
  action visibility. Repeat nested owner pages for all four template themes.
- Check selected-business links using two authorized businesses. Check Standard,
  CRM, inactive, legacy, and developer navigation without changing access rules.
- Run targeted rendering/navigation checks for link destinations and entitlement
  states, plus existing editor and overview drills to detect lost controls.
- Run `pnpm exec node tests/browser/workspace-polish.mjs` on an isolated local
  instance. Inspect overview, managed service, and owner screenshots; check
  real requests, allowance changes, all owner themes, and public-page isolation.

## Constraints & decisions

- This increment extends the approved overview's presentation to connected
  screens. It does not rebuild the application or change public website content.
- Reuse existing components, helpers, and routes. No new dependencies or schema
  changes are required. Shared styling stays separate from published site colors.
- Keep account/session controls accessible and preserve working sign-out and
  subscription actions. Preserve the user's non-following section toolbar.

## Out of scope

- Location setup, booking readiness, and unsaved-edit warnings are described in
  `showcase-completion.md` and the booking/website-editing specs.
- Additional color controls and mobile agenda behavior remain separate increments.
- Migration repair, data resets, authentication changes, or permission changes.
- Public templates and publishing semantics; see
  `../businesses/website-editing.md` and `../businesses/website-templates.md`.
