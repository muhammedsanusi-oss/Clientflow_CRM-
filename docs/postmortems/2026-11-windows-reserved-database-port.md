# Windows reserved the local database port and blocked sign-in

**Reported:** 2026-11-04 · **Spec:** `docs/specs/seams.md`

## Report

The developer test account could not sign in after starting `pnpm dev`.
`GET /api/health` returned 503 with `db: "error"`; submitting the documented
credentials returned a generic 500 rather than an invalid-password response.

## Expected vs actual

The seams specification requires: "Every seam works out of the box with zero
cloud setup." Next.js was running, but PostgreSQL failed before accepting
connections, so login could not create or authenticate the development fixture.

## Root cause

Windows reserved TCP ports 55415 through 55514 for both IPv4 and IPv6. The
database's default port, 55432, and the runbook's alternative, 55433, were both
inside that range. PostgreSQL logged `could not bind` and `Permission denied`;
the process failed with `could not create any TCP/IP sockets`. The watcher and
web server stayed alive, making the failure appear to be a credential problem.
Restarting the database outside the command sandbox reproduced the same bind
failure, confirming that the reservation was the cause.

## The fix

The local database, shared client, migration CLI, and notification listener use
15432 by default. The existing database is reused; the web process reloads its
cached connection. Configured `DB_PORT` and `DATABASE_URL` overrides remain
supported and must agree. No credentials, Windows reservations, or stored data
are reset.

## Why our defenses missed it

Integration tests use in-memory PGlite and do not bind a Windows TCP port. The
website HTTP verification also used that embedded test door. Neither check
tested the real PostgreSQL startup path on this machine. The existing runbook
recommended a neighboring port in the same Windows reservation range.

## What changed beyond the fix

The seams specification records matching server/client defaults and restart
requirements. The Windows runbook now checks IPv4/IPv6 port exclusions before
choosing an override and distinguishes database health failures from invalid
credentials. The real local PostgreSQL connection, health endpoint, and test
developer and owner authentication are exercised directly for this fix; no constant-only
test is added as a substitute for that startup drill.
