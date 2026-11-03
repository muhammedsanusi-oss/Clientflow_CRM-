## Browser-trust finding: payment state

`packages/domain/src/schemas/payment.ts` accepts `status`, including `COMPLETED` and `REFUNDED`, and `transaction_reference` from the request body. `packages/domain/src/queries/payments.ts:createPayment()` saves them after checking appointment tenancy, without verifying settlement with a payment provider. A business member can therefore submit an arbitrary payment state/reference. If these fields are intended as proof of electronic settlement, the server must derive them from verified provider events; if they are manual bookkeeping, document that distinction and authorize/audit changes. This finding does not establish that any money moves. Payment behavior changes are outside this authentication PR.

## What changed

GitHub OAuth through Auth.js v5 and the Prisma adapter replaces the unsigned User-ID cookie. Database sessions are the only identity source. Legacy login endpoints, cookie setters, username sign-in schemas, and environment identity flags are removed. The login UI and shared header use Origin-protected Server Actions; every private page/action checks again, and all private API exports return the UNAUTHENTICATED 401 envelope. Existing tenant queries retain foreign-resource 404s.

The additive 0005 SQL migration preserves User IDs, usernames, employee memberships and CRM rows; the legacy username becomes optional for adapter-created users. No existing database was reset or migrated during verification. Existing demo/employee accounts are not automatically claimed by GitHub email/name; verified membership transfer and invitations remain separate work.

Spec: docs/specs/auth/github-sign-in.md. Infrastructure contract: docs/specs/auth.md. Setup: docs/runbooks/github-oauth-setup.md. Dependencies added: next-auth 5.0.0-beta.32 and @auth/prisma-adapter 2.11.3 plus the auth package's workspace DB dependency. Comments explain the identity boundary, migration preservation, and test assumptions.

## PR base

This branch starts at feat/customer-search-edit (266f1cb), which contains the current CRM features and is ahead of main. Target feat/customer-search-edit so the authentication diff is independently reviewable; retarget after that parent branch lands. Do not merge this draft.

## Validation executed

- pnpm prisma:generate: passed.
- pnpm test: passed, 111 tests total (31 package tests and 80 integration tests). Coverage includes adapter-created users/accounts, persisted/expired/fabricated/edited sessions, logout revocation, every private API export, private pages/actions, two-user session-backed isolation, and populated migration preservation/schema parity/rerun.
- pnpm typecheck: passed.
- pnpm build: passed with a fresh Next.js production compilation.
- git diff --check and node --check on all four HTTP drill modules: passed.
- git check-ignore apps/web/.env.local: confirms the file is ignored. Only placeholder examples are tracked; no OAuth secrets were supplied or written.
- Built-app HTTP smoke on a disposable in-memory database: public health/providers/login returned 200; GitHub button rendered; private API rejected absent, legacy and fabricated cookies with the exact 401 envelope; root redirected with 307; customers/calendar/business creation returned Next's streamed login redirects (HTTP 200 with redirect metadata); fabricated Auth.js session returned null. Temporary server was stopped.
- Initial full integration run hit concurrent WASM startup timeouts; limiting suites to two workers made the full suite pass. No test timeout was increased. An earlier baseline migration timeout also passed on rerun.
- Reviewed the original assignment at https://github.com/CUNYTechPrep/ctp-c12-fall-curriclum/blob/main/weeks/week-08-homework.md and adapted its reset/merge instructions to the user's data-preservation/draft-only requirements.

## Pending validation

Real GitHub OAuth round-trip, persistent browser login, Back-button behavior after logout, cookie editing in DevTools, and two real accounts on one running app are pending. Automated adapter/session tests do not replace those proofs. The authenticated HTTP form drills now consume real cookies from local files and remain pending until credentials/accounts are configured. A teammate must independently review the diff and personally execute proofs 3 and 4.

## Required teammate review and manual proof checklist

- [ ] Teammate reviews schema/migration, session boundary, entry-point guards, tenant scoping, and the complete diff; record reviewer and findings.
- [ ] Persistent login: sign in as GitHub A, create a business/customer, close and reopen the browser, reopen the workspace, and confirm the same user/data. Restart the app without resetting the database and repeat. Confirm the cookie persists and a corresponding unexpired Session row exists; never include its token in PR evidence.
- [ ] Logout protection: capture a private URL, sign out, press browser Back and confirm no private content renders; revisit the URL and confirm `/login`. The private API returns the documented 401. Replay the former cookie locally and confirm rejection. Use browser network tools to inspect the JSON response, not a cached page.
- [ ] Tampered-cookie rejection (reviewer performs personally): edit one character of `authjs.session-token` (or `__Secure-authjs.session-token` on HTTPS) and reload; authentication must fail. Also replace the token with A's User ID, then an arbitrary value; both must fail. Remove the Auth.js cookie and add the old `session=<A user ID>` cookie; it must also fail. Never copy a valid token to shared evidence.
- [ ] Two-account isolation (reviewer performs personally): both people use the same running app and database with GitHub A and B in separate browser profiles. Create separate businesses/customers through the app. Request A's customer page, GET API, and edit/note POST from B, then reverse. Expect 404, confirm neither account sees the other's list data, and recheck original rows are unchanged after rejected writes. Test a valid B write as a control. Use unrelated business memberships; intentionally shared membership permits shared business access. In Codespaces, temporarily make port 3000 public for the teammate and restore its visibility afterward.

Record browser/account labels, paths, status codes, expected/actual results, and redacted screenshots. Do not mark a checkbox complete based only on automated tests or a session mock.
