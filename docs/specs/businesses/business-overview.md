---
type: feature
---
# Developers review business details and find the next action

## Why

The business overview makes website management and owner access easy to scan.
Related details sit together, primary actions stand out, and missing information
has a useful explanation instead of an empty value or misleading status.

## Where it lives

- `apps/web/app/businesses/[id]/page.tsx`: developer business overview.
- `apps/web/app/businesses/[id]/business-overview.css`: scoped layout and
  responsive presentation.
- `apps/web/app/businesses/[id]/regenerate-password.tsx`: existing owner setup
  action, presented within the owner access section.
- `docs/specs/businesses/developer-provisioning.md`: existing authorization and
  credential handoff contracts, which continue to apply.

## Behavior

- A compact introduction contains Back to dashboard, the business name, and its
  description. Its spacing clears the existing session controls. Long names,
  descriptions, and emails wrap without horizontal scrolling.
- A Website card shows a human-readable template name, Edit website as its
  primary action, and Open website as a secondary action. The latter clearly
  indicates that it opens a new tab. A template badge describes configuration,
  not publication status.
- Business contact and Owner access are separate labeled cards. Public contact
  details and private owner login details are clearly distinguished.
- Owner access has a text badge for Active, Pending setup, Setup expired, or
  Not assigned. Missing owner data never appears as Active. Missing optional
  information uses an explicit placeholder such as Not provided.
- Valid public emails and phone numbers are usable mail and telephone links;
  visible labels retain the saved values. Private owner email remains clearly
  labeled as a login address.
- Pending owners retain the existing Generate new setup link action and its
  pending/error/receipt behavior. The explanation stays near that action.
- Owner inquiries and requests and Managed content changes appear as separate
  destination cards with short descriptions. Existing destination routes and
  authorization remain unchanged.
- Cards use consistent padding, restrained borders, subtle surface contrast,
  and visible keyboard focus. Color never provides the only status cue.
- The layout uses available desktop width and stacks naturally on narrow
  screens. Touch targets are at least 44 CSS pixels tall. At 390 CSS pixels and
  at 200 percent browser zoom, text and actions remain usable without clipping.
- The page remains a read-only overview. Credential regeneration remains an
  explicit form action. Opening the page performs no writes.
- Signed-out users go to login. Unknown or foreign business IDs return 404
  under the existing developer grant checks. No new data query is introduced.

## Examples

| State / input | Behavior |
|---|---|
| Configured barbershop with active owner | Website actions and a Barbershop template badge appear; Owner access reads Active |
| Owner is missing | Owner access reads Not assigned and no active-account claim appears |
| Pending owner with expired setup | Setup expired appears with the existing replacement-link action |
| No website template | Website card explains that a website is not configured; no broken editor/public link appears |
| Long email on a narrow screen | Address wraps inside its card and actions remain reachable |
| Developer requests another developer's business | 404; no business details are disclosed |

## Verify

- `pnpm exec vitest run tests/integration/business-overview.test.ts` covers
  grouped details, existing links, missing owners/websites, pending and expired
  setup, signed-out redirection, and not-found handling.
- With the local demo instance and an isolated Chromium browser on port 9391,
  run `pnpm exec node tests/browser/business-overview.mjs` for responsive layout,
  long content, 200 percent text scaling, touch targets, keyboard focus, and
  read-only navigation checks. Screenshots are written under
  `artifacts/business-overview/`.
- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`; document any unrelated
  existing failures separately from the overview checks.
- Check configured and unconfigured businesses and active, pending, expired,
  and missing-owner states against the existing read-only data contract.
- At desktop and 390 CSS pixel widths, check long content, all destination
  links, and keyboard navigation. Repeat at 200 percent browser zoom.
- Confirm credential regeneration still exposes pending, error, and one-time
  receipt states through the established protected action.
- Verify signed-out redirection and foreign/unknown business 404 responses.

## Constraints & decisions

- This is an incremental presentation change to the business overview. Existing
  content, workflows, domain authorization, and public website designs remain.
- No new dependencies, schema changes, credentials, or invented business data
  are needed. Icons, if used, are decorative alongside descriptive text.
- The shared fixed session header is accommodated locally; redesigning global
  navigation requires its own reviewed scope.

## Out of scope

- Rebuilding the dashboard, inquiries page, managed-service workflow, or editor.
- Public template redesign; see `website-templates.md` and `website-editing.md`.
- Changing provisioning or credential rules; see `developer-provisioning.md`.
- New business editing fields, analytics, billing, or account permissions.
