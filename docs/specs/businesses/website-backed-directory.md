---
type: feature
---
# The developer directory lists only businesses with an attached website

## Why

Developers manage business owners with websites. Placeholder businesses without
a website clutter the directory and must not appear to be active clients.

## Where it lives

- `apps/web/app/page.tsx`: developer directory, counts, card labels, and empty state.
- `packages/domain/src/provisioning.ts`: website-filtered, developer-grant-scoped
  directory query.
- `tests/integration/`: directory eligibility, owner-state labels, and grant isolation.
- Related contracts: [developer provisioning](developer-provisioning.md) and
  [web standards](../web.md).

## Behavior

- The developer dashboard lists a business only when the current developer has
  its explicit access grant and the business has an attached website.
- A business has an attached website when it has a configured
  Clientflow website (`websiteTemplate` is not null), with its existing public
  `/sites/<businessId>` page. External websites are not currently modeled.
- A business without a website is excluded regardless of whether it is a
  sample, example, test record, or a real business, and regardless of whether
  its owner's login is activated.
- Dashboard business totals use the same filtered set as the displayed cards.
- Enrolled businesses show their simulated service, monthly price, and billing
  status separately from owner activation; see [demo subscriptions](demo-subscriptions.md).
- Every displayed business has its existing Open website link.
- The existing owner-activation label is explicit: Owner access: active,
  pending password setup, or password setup expired. It does not claim that a
  website is online or that its availability has been checked.
- A website-backed business without an active owner membership shows Owner
  access: not assigned, rather than treating a missing owner as active.
- When no authorized businesses have websites, the dashboard shows an empty
  directory with its existing create-business action.
- Removing a card from the dashboard does not delete the business, its owner,
  CRM records, or access grants, and does not change owner authentication.
- Developer-only detail and handoff routes retain their existing authorization;
  dashboard filtering does not grant access to any additional record.

## Examples

| State / input | Behavior |
|---|---|
| Example business has no website and an activated owner | No card, no active label, and no contribution to dashboard totals |
| Granted business has a configured website | Card includes Open website and an explicit owner-access state |
| Website belongs to a business without this developer's grant | No card or count; its details remain inaccessible |
| All granted businesses lack websites | Empty directory; stored records remain intact |

## Verify

- `pnpm exec vitest run tests/integration/website-directory.test.ts` exercises
  real signup, directory reads, rendered cards/totals, and the empty state.
- Integration tests include granted businesses with and without websites,
  activated and pending owners, samples, and a foreign website-backed business.
- Assert displayed cards and counts exclude all website-less businesses while
  their database records and related data remain unchanged.
- Assert owner activation is labeled separately from website availability.
- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- Open the developer dashboard and verify each displayed card opens its website.

## Constraints & decisions

- A website's existence and an owner's account activation are separate facts.
- Existing website configuration is the eligibility signal; checking
  uptime or requiring a publication revision would be separate behavior.
- Scope is the developer dashboard. Stored examples are not deleted and owner
  CRM membership queries are not filtered by website availability.
- No new dependencies or database migration are needed for configured websites.

## Out of scope

- Permanent data deletion, automatic website creation for placeholder businesses,
  external website onboarding, uptime monitoring, and owner access changes.
