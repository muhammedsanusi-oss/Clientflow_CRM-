# What & why

Owners can choose a standard website or request tailored onboarding, complete
simulated checkout, and use the software included in their selected service.
Managed subscribers can submit content changes; granted developers track work
against a shared 30-minute UTC monthly allowance with transactional history.

## Changes

- Standard ($39), Website + CRM ($79), and Managed ($149) demo subscriptions,
  renewal, failed payment, plan changes, cancellation, recovery, and expiry.
  Server-side checks protect website editing, CRM, and public booking.
- Managed owner requests, developer progress and completion notes, immutable
  time records and corrections, shared monthly limits, and concurrent-write
  protection. Platform bug fixes and owners' edits do not consume the allowance.
- Tailored signup collects contact details and callback date/time; developers
  provision the account and share a single-use password-setup link.
- Developer notifications for business requests, tailored leads, and external
  uptime events, with explicit grant checks for private business details.
- Website-backed developer directory, clearer owner activation labels, setup
  buttons, and owner navigation spacing below the fixed session bar.
- CRM active-membership regression fixes and atomic migration ledger writes.
  Migrations 0015–0018 are additive; existing applied migrations remain unchanged.
- Explicit local preview setup for the five subscription examples and Managed
  requests. Published websites and saved CRM data survive subscription changes.

No payment provider, real charges, hosting deployment, staffed support, or
automatic website editing is introduced. No dependencies are added.

## Docs rode along

- [x] Specs created or updated:
  - `docs/specs/businesses/demo-subscriptions.md`
  - `docs/specs/businesses/managed-service.md`
  - `docs/specs/businesses/custom-website-signup.md`
  - `docs/specs/businesses/website-backed-directory.md`
  - `docs/specs/notifications/developer-notifications.md`
  - Related auth, web, provisioning, website-editing, and CRM contracts.
- [x] Runbooks cover subscription and Managed lifecycle drills and notifications.
- [x] Postmortems document CRM/migration recovery, website-less cards, and the
  owner navigation overlap.
- Existing accepted ADRs and landed postmortems are unchanged.

## Verified

- [x] `pnpm test` — 209 tests (163 integration and 46 package tests).
- [x] `pnpm typecheck`.
- [x] `pnpm build`.
- [x] `git diff --check`.
- [x] Disposable lifecycle tests cover subscription recovery, plan enforcement,
  Managed allowance exhaustion, UTC month rollover, stale/concurrent updates,
  authorization, notification revocation, and injected-write rollback.
- [x] Migration replay matches Prisma and preserves existing records.
- [x] Live authenticated dashboard/subscription rendering and Managed desktop
  layout/owner-form accessibility inspection; local preview setup is idempotent.
- [ ] Complete browser keyboard and narrow-viewport verification. Computer use
  stopped because it could not confidently determine the browser URL. The
  disposable browser-check business and account were removed. The subsequent
  navigation-spacing fix passes automated checks but needs visual confirmation.

## For the reviewer

Base: `integrate/latest-local`, which contains the existing website platform.
Start with the subscription and Managed service specs, then review their domain
transaction boundaries and integration tests. All billing remains simulated;
Managed content changes still require a developer to edit and publish the site.

Agent-assisted implementation. Automated checks and live rendering were verified
as described above; this draft retains the outstanding manual browser checks.
