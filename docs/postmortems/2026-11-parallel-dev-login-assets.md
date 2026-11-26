# A parallel verification server overwrote the demo login JavaScript

**Spec:** `docs/specs/web.md`. Local fix; no issue or pull request created.

## Report

The developer test-account button did nothing and browser sign-in failed.
The running login page returned HTTP 200, but its
`/_next/static/chunks/app/login/page.js` request returned 404.

## Expected vs actual

The development test-account button should fill credentials, and sign-in should
open the developer dashboard. The page rendered HTML without the JavaScript
needed to run its handlers. A direct API request using the documented test
credentials succeeded with HTTP 200 and a developer dashboard destination.

## Root cause

The separate disposable verification server used port 3100, while an existing
demo used port 3000. Both used the same `.next-dev` output directory. The second
server overwrote the first server's manifests and assets. Separating production
`.next` from development `.next-dev` did not isolate two development servers.

## The fix

Named development instances use `.next-dev-<instance>`. The disposable showcase
runbook specifies `CLIENTFLOW_DEV_INSTANCE=showcase`; ordinary development and
production retain their existing directories. Restart the normal web server to
rebuild its assets without resetting accounts or database files.

## Why our defenses missed it

The earlier drill verified its own isolated database and successful browser
workflow but did not revisit the already running server's login JavaScript.
An isolated database and a distinct TCP port do not isolate filesystem output.

## What changed beyond the fix

Configuration tests cover separate directories and invalid instance names.
The web spec requires checking the ordinary demo login after parallel
verification. The Windows troubleshooting and presenter runbooks explain the
asset failure and safe recovery.
