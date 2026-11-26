# Owner dashboard verification

The owner home is `/owner?businessId=...`, independent of subscription status.
Portal return links from preview, editing, inquiries, customer lists, notes, and
subscription use the selected owner business. Developers keep their own role.

- All 140 domain tests pass, including the owner destination helper across
  plan/status combinations and encoded IDs.
- The dashboard/subscription/overview suites pass: 18 tests. Current dashboard
  and subscription navigation suites also pass after final icon/link cleanup.
- All 191 root integration tests pass in a temporary source copy excluding the
  existing duplicate `0003_business_services.sql` migration. The original file
  was not edited. Authentication and subscription lifecycle tests are included.
- Browser drills pass for preview/subscription return clicks, grouped dashboard
  tools, compact header, foreign-ID 404, 44px dashboard actions, all four themes,
  desktop/mobile layout, and 200 percent root text scaling. Screenshots were
  visually reviewed. Native browser zoom is not separately claimed.
- The live demo owner's subscription is canceled; it was not changed. Active
  CRM/Standard/Managed and legacy presentation is covered by rendering tests.
- Typecheck, production build, and whitespace review pass. The original checkout
  `pnpm test` still fails eight pre-existing migration-contract tests before its
  root integration stage, due to duplicate `Service.business_id`.
- No dependencies, schema changes, saved business changes, or access-rule changes.

Review: [desktop dashboard](dashboard-1440.png), [mobile dashboard](dashboard-390.png).
