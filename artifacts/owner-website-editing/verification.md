# Owner website editing is independent of subscription

## Change

The owner dashboard and published preview always offer Edit website for an
authorized owner's configured site. The shared server editor check requires a
regular session and active OWNER membership, without a billing-state predicate.
This covers reading the editor, uploading within the existing allowance, and
publishing. No subscription is activated or renewed by editing.

Image allowances, section limits, CRM access, paid feature requests, and managed
service remain governed by their existing rules. Foreign users, staff members,
inactive memberships, and ungranted developers retain their access boundaries.

## Automated checks

- `pnpm test`: passed, 392 tests (167 package tests + 225 root tests).
- `pnpm typecheck`: passed across all workspaces.
- `pnpm build`: passed.
- `git diff --check`: passed with existing CRLF-policy notices only.
- The new editor-access suite covers Standard, CRM, and Managed with pending,
  active, overdue, canceled, and expired subscriptions: 15 combinations.
- Every combination verifies editor access, upload authorization within quota,
  transactional publication/history, unchanged billing state, and foreign/staff
  rejection. Paid CRM and feature-request restrictions remain asserted.
- Dashboard rendering tests cover the same states across all plans. Existing
  lifecycle and signup tests now expect pending/inactive owner editing rather
  than the superseded billing gate.

## Browser checks

`tests/browser/owner-website-editing.mjs` used an isolated development instance
on port 3100 with `CLIENTFLOW_DEV_INSTANCE=photos`, disposable in-memory PGlite,
local Azurite, and isolated Chromium on port 9392.

For each of Standard, CRM, and Managed it followed the actual dashboard editor
link, uploaded a real PNG before checkout, edited and published a headline, and
verified the published preview/public website. It repeated editing/publication
in active, overdue, and canceled states, checked the preview's Edit website
link, and asserted paid CRM HTTP restrictions remained correct. The browser
matrix contains 12 cases; expiry is covered by the integration matrix.

Canceled-dashboard screenshots at 390px show the Edit website action in the
same dark template as the reported problem. The Standard screenshot was
visually inspected for wrapping and action visibility. The normal port-3000
developer login browser drill passed after parallel verification and build.

No owner credentials, normal business records, or existing subscriptions were
reset. The ordinary development server and local storage remain available.
