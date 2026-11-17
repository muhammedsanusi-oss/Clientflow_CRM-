# Shared Next.js output broke local sign-in

**Spec:** `docs/specs/web.md`

## Report

The local test developer sign-in displayed a connection error. A request to
`/login` returned HTTP 500 with ENOENT for `.next/server/app/login/page.js`.
The health endpoint still reported a healthy database.

## Expected vs actual

Local test accounts should authenticate through the running development app.
Instead, missing compiled routes produced HTML error responses, which the login
form's JSON parser reported as a connection failure.

## Root cause

Two Next.js development servers for this checkout were listening on ports 3000
and 3001, both writing `.next`. Next.js automatically selected another port for
the second instance. Production builds also used that same output directory.
These independent processes could invalidate files expected by the live server.

## The fix

Bind development explicitly to port 3000 so duplicate starts fail, and use
`.next-dev` for development while retaining `.next` for production builds.
Restart the existing web servers to load the configuration.

## Why our defenses missed it

Database integration tests do not run competing Next.js processes. The web
spec did not define output isolation or duplicate-start behavior.

## What changed beyond the fix

The web spec defines both behaviors and a live verification drill covering
duplicate starts, production builds during development, and test-account login.
Development output is ignored by Git and included in type generation and cleanup.
