# Add demo subscriptions and enforce website/CRM plans

New owners now enter simulated checkout, and the active service controls website
editing and CRM access on the server. Failure, expiry, and cancellation stop paid
access while preserving published content and stored records. No money is charged.

## Scope

- Standard website, Website + standard CRM, and Managed demo offerings.
- Private simulated checkout, renewal, payment failure, plan change,
  cancellation, recovery, and transactional event history.
- Enforcement in website editing, CRM, and public booking alongside existing
  membership and developer-grant checks.
- Additive schema changes; no business, owner, or CRM data deletion.
- Existing businesses enroll explicitly rather than being silently converted.
- All five local preview websites are explicitly enrolled in active simulated
  plans across the three offerings. Cards show service, price, and billing status;
  later test logins preserve subscription changes.

The reviewed behavior contract is
`docs/specs/businesses/demo-subscriptions.md`.

## Not included

Managed-service time tracking, local email delivery, tailored-project tracking,
production billing, hosting changes, or changes to accepted ADRs.

## Verification

- [x] `pnpm test` — 196 tests across root and package suites
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] Disposable subscription lifecycle drill, including direct API access
- [x] Legacy-record preservation and migration replay
- [x] Stale/concurrent transitions and atomic history rollback
- [x] Applied additive migration locally and enrolled the five preview websites
- [x] Live authenticated rendering of dashboard and Standard/Managed subscriptions

## Review notes

This branch already contains earlier local website, authentication, notification,
and dashboard work. Review the actual combined diff before deciding how to
split or publish it. No open PR was found for `feat/developer-owner-websites`;
this draft must not replace a PR from an unrelated branch.
