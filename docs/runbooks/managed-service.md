# Managed content-change fulfillment

Behavior contract: [managed service](../specs/businesses/managed-service.md).

## Disposable verification

Run from the repository root, without services or a cloud account:

```sh
pnpm exec vitest run tests/integration/managed-service.test.ts
```

The disposable PGlite drill creates an active Managed business and verifies
owner submission, retry deduplication, developer start, time recording,
completion, shared allowance exhaustion, denied overage, downgrade, recovery,
and a new UTC month. No local preview data is modified.

The same suite checks authorization, expired/inactive plans, UTC boundaries,
advance renewals, historical time corrections, stale/concurrent actions,
notification grant revocation, and injected history/notification failures.

Run `pnpm test`, `pnpm typecheck`, and `pnpm build` before declaring the change
verified. Migration tests compare replay against Prisma and preserve existing
website, subscription, and customer records.

## Interactive preview

1. Run `pnpm dev`; startup applies the additive migration.
2. Run `pnpm exec tsx scripts/preview-managed-service.ts` to populate The Corner
   Chair, provided it still has active Managed demo access. This explicitly
   scoped local fixture adds a completed 10-minute example and a submitted
   example. It does not publish website changes, change credentials or plans,
   reset subsequent actions, or replenish usage on later logins.
3. Sign in as the test developer. Open **Managed content changes** for The
   Corner Chair from the developer directory. Verify 20 of 30 minutes remain
   in the fixture's creation month, with both example requests visible.
4. An active Managed owner opens **Managed service** in their workspace, or
   **Open managed service** from their subscription. Submit a title and the
   exact existing content to change. A zero balance still permits submission,
   with an explanation that included work must wait or be quoted separately.
5. As a granted developer, start the request. Make and publish its actual edits
   using the existing website editor. Select **Record content-change time**,
   enter whole minutes and a work description, then save. Only content-change
   labor belongs here; platform bug fixes and owner edits consume no allowance.
6. Select **Complete request**, explain what was published, and save. Completion
   requires recorded time. Owners see the note, time, progress, and public link.

No step charges money. Additional work requires a separate quote outside this
workflow. Hosting deployment and staffed support are operational services and
are not provisioned by recording a request or completing this drill.

## Corrections and recovery

- Before completion, select **Correct an erroneous time entry**, choose the
  entry, and provide a reason. A void preserves the original record and returns
  minutes to its original UTC month. Record a corrected entry if appropriate.
- Completed requests cannot reopen or have their time corrected through this
  increment; do not edit the database to conceal previous work.
- Refresh on a version conflict. Failed time recording does not deduct minutes.
- For inactive service, retain and review history; recover through a successful
  simulated Managed subscription payment. Recovery in the same UTC month does
  not reset previously used minutes.
- If the allowance is exhausted, wait for the next eligible UTC month or discuss
  a separate quote. Never label billable extra work as included time.

## Keyboard and narrow-layout check

For an independent browser check without spending a preview customer's
allowance, run `pnpm exec tsx tests/http/managed-service-fixture.ts`. It creates
only the named **Disposable keyboard check** business and the synthetic owner
`managed-keyboard@example.test` with password `Managed-keyboard-demo-2026!`.
Sign in as that owner, then open `/managed-service?businessId=managed-keyboard-check`.
The existing test developer has an explicit grant to its queue. The helper
refuses to overwrite existing fixture IDs and requires the local database.
After checking, run
`pnpm exec tsx tests/http/managed-service-fixture.ts --cleanup`; it verifies
the fixture's ID, name, and owner before removing only these disposable records.

Using only Tab, Shift+Tab, arrows, Space, and Enter within the forms:

1. Reach the owner title, description, and submit controls in order; confirm an
   empty submission shows native required-field validation.
2. Submit a clearly labeled demo request and confirm it appears once.
3. As a granted developer, reach the action selector, start work, and select
   time recording. Reach minutes, work description, and save in order.
4. Check whole-minute limits, required completion/decline/correction reasons,
   disabled controls while saving, and visible retryable conflict messages.
5. At a narrow viewport, verify cards, labels, buttons, request descriptions,
   and history wrap without hiding the controls or requiring horizontal scroll.
