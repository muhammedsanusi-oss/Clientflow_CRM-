# Production server actions missed valid database sessions

**Spec:** `docs/specs/auth.md` and `docs/specs/businesses/management-api.md`

## Report

During the owner-provisioning verification drill, email/password login, owner activation, API access, and customer page reads succeeded. Posting the customer edit form redirected to `/login` despite carrying the same valid session cookie.

## Expected vs actual

The identity contract resolves an unexpired database session before private reads and writes. The database package describes a singleton client per process. The server-action runtime instead failed to find a session that API handlers had persisted.

## Root cause

The database client was cached on the process global only outside production. Next.js produced separate page/action and API module runtimes, each able to initialize a Prisma client. With embedded PGlite, those clients opened separate database instances and did not share live session state. The old unsigned identity cookie did not query session storage, so it concealed this failure path.

## The fix

Cache both the initialization promise and the resulting Prisma client globally in every environment. Separate runtimes and concurrent initialization now share one process client.

## Why our defenses missed it

Integration suites use one module graph per test environment and mocked request cookies. They did not exercise the distinct module runtimes produced by a production Next.js build.

## What changed beyond the fix

The database management contract documents the shared initialization boundary. The updated HTTP drills provision owners through real database-backed login, activate them, and submit the existing customer forms against the built app. After the fix, provisioning, business API, and customer search/edit drills all pass on an isolated disk-backed PGlite database.
