# Demo subscription drill

This drill uses disposable PGlite data, no running services, no payment provider,
and no real charges. It does not modify a developer's existing businesses.

## Automated drill

Run from the repository root:

```sh
pnpm exec vitest run tests/integration/demo-subscriptions.test.ts
```

The `disposable subscription lifecycle drill` suite creates an owner, staff,
granted and ungranted developers, a published website, and saved CRM records.
It verifies these transitions in order:

1. Legacy access works until explicit enrollment creates pending checkout.
2. Standard simulated payment enables editing and denies direct CRM/API and
   public-booking access.
3. Upgrade to CRM restores the saved records and public booking; renewal extends
   the paid-through date by a calendar month.
4. Simulated failure blocks paid access; successful recovery to Managed restores it.
5. Cancellation blocks paid access while the published website, customer, note,
   and appointment remain unchanged. A granted developer can still edit.
6. Recovery to Standard preserves the original website-content limits and denies CRM.
7. Expiry at the paid-through instant denies paid access; recovery starts a new
   period. Month-end arithmetic includes February and leap-year cases.

The second suite verifies stale/concurrent actions, rollback on an injected
history failure, membership isolation, unknown businesses, request validation,
cross-origin protection, and signed-out rejection. A failed assertion means the
drill failed; do not declare the feature verified.

Also run `pnpm test`, `pnpm typecheck`, and `pnpm build`. The signup suite injects
initial-history failure and proves the entire signup rolls back. Migration tests
prove existing businesses/customers survive and remain unenrolled.

## Interactive preview

To enroll the existing local preview websites explicitly, run
`pnpm exec tsx scripts/preview-demo-subscriptions.ts`. It requires the local
database on port 15432 and the fixed test developer's explicit business grants.
It skips already enrolled businesses, preserving subsequent plan/status changes.
Add `--list` to inspect the preview records without changing them. The fixed
Sample business uses CRM; the other preview records cycle through the three
services. No website content, credentials, or CRM records are rewritten.

1. Run `pnpm dev`. Local startup applies the additive migration. Sign in as an
   owner and open **Demo subscription** from the session header. An existing
   business shows **Legacy demo access**; leave it unenrolled to retain prior access.
2. For a fresh demo, sign up using a unique test email. Choose Standard and submit;
   checkout shows **PENDING**. Select **Simulate successful payment / renewal**.
3. Open the owner workspace. Editing works, while Customers/Appointments links
   are absent. A saved CRM URL is denied by the server.
4. Return to Demo subscription, select Website + standard CRM, and simulate a
   successful payment. Open the workspace to use CRM.
5. Simulate failed payment, successful recovery, and cancellation. Confirm each
   result in history and confirm a previously published public website still opens.

No recovery procedure edits billing tables manually: use a successful simulated
payment with the desired service. If an action returns a version conflict,
refresh before submitting another action. New signups remain development-only.

Behavior contract: [demo subscriptions](../specs/businesses/demo-subscriptions.md).
